import 'dotenv/config';
import dns from 'node:dns/promises';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import type { NextFunction, Request, Response } from 'express';
import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;

interface DecidePayload {
  relationship?: unknown;
  occasion?: unknown;
  ageGroup?: unknown;
  minInr?: unknown;
  maxInr?: unknown;
  traits?: unknown;
  giftFormat?: unknown;
  vibeStyle?: unknown;
  giftGoal?: unknown;
  urgency?: unknown;
  customNote?: unknown;
  searchQuery?: unknown;
}

interface RawAiGift {
  name?: unknown;
  maker?: unknown;
  category?: unknown;
  format?: unknown;
  vibeStyle?: unknown;
  primaryGoal?: unknown;
  priceInr?: unknown;
  searchQuery?: unknown;
  shortTag?: unknown;
  tagline?: unknown;
  description?: unknown;
  whyItFits?: unknown;
  reasons?: unknown;
  lovesIt?: unknown;
  skipIf?: unknown;
  presentationTip?: unknown;
  customCardNote?: unknown;
  leadTimeDays?: unknown;
  utilityScore?: unknown;
  keepsakeScore?: unknown;
  unwrapScore?: unknown;
  matchPercentage?: unknown;
}

interface ImageCandidatePair {
  primary: string;
  fallback?: string;
}

const BROWSER_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-IN,en;q=0.9',
};

function clampStr(val: unknown, fallback: string, maxLen: number): string {
  if (typeof val !== 'string') return fallback;
  const trimmed = val.trim();
  return trimmed ? trimmed.slice(0, maxLen) : fallback;
}

function clampNum(val: unknown, fallback: number, min: number, max: number): number {
  const num = Number(val);
  if (!Number.isFinite(num)) return fallback;
  return Math.max(min, Math.min(max, Math.round(num)));
}

function isPrivateOrReservedIp(ip: string): boolean {
  const normalized = ip.toLowerCase();
  if (normalized.startsWith('::ffff:')) {
    return isPrivateOrReservedIp(normalized.slice(7));
  }
  if (net.isIPv4(normalized)) {
    const parts = normalized.split('.').map(Number);
    const [a, b] = parts;
    if (a === 0 || a === 10 || a === 127) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 100 && b >= 64 && b <= 127) return true;
    if (a >= 224) return true;
    return false;
  }
  if (net.isIPv6(normalized)) {
    if (normalized === '::1' || normalized === '::') return true;
    if (normalized.startsWith('fc') || normalized.startsWith('fd')) return true;
    if (normalized.startsWith('fe80')) return true;
    if (normalized.startsWith('ff')) return true;
    return false;
  }
  return true;
}

async function assertPublicHttpUrl(rawUrl: string): Promise<URL | null> {
  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return null;
    const host = parsed.hostname.toLowerCase();
    if (
      !host ||
      host === 'localhost' ||
      host.endsWith('.local') ||
      host.endsWith('.internal') ||
      host.endsWith('.localhost')
    ) {
      return null;
    }
    if (net.isIP(host)) {
      return isPrivateOrReservedIp(host) ? null : parsed;
    }
    const resolved = await dns.lookup(host, { all: true });
    if (!resolved || resolved.length === 0) return null;
    for (const entry of resolved) {
      if (isPrivateOrReservedIp(entry.address)) return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

async function safeFetch(
  rawUrl: string,
  headers: Record<string, string>,
  timeoutMs: number
): Promise<globalThis.Response | null> {
  let currentUrl = rawUrl;
  for (let hop = 0; hop < 4; hop++) {
    const valid = await assertPublicHttpUrl(currentUrl);
    if (!valid) return null;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(valid.toString(), {
        headers,
        redirect: 'manual',
        signal: controller.signal,
      });
      clearTimeout(timer);

      if (res.status >= 300 && res.status < 400) {
        const location = res.headers.get('location');
        if (!location) return null;
        currentUrl = new URL(location, valid).toString();
        continue;
      }
      return res;
    } catch {
      clearTimeout(timer);
      return null;
    }
  }
  return null;
}

function isLikelyUsefulImageUrl(urlStr: string): boolean {
  const lower = urlStr.toLowerCase();
  if (
    lower.includes('favicon') ||
    lower.includes('logo') ||
    lower.includes('sprite') ||
    lower.includes('placeholder') ||
    lower.includes('1x1') ||
    lower.includes('pixel') ||
    lower.endsWith('.svg')
  ) {
    return false;
  }
  return true;
}

async function searchProductImagesFast(queryText: string): Promise<ImageCandidatePair | null> {
  const searchUrl = `https://www.bing.com/images/search?q=${encodeURIComponent(
    `${queryText} product`
  )}&form=HDRSC2&first=1`;
  const res = await safeFetch(searchUrl, BROWSER_HEADERS, 2400);
  if (!res || !res.ok) return null;

  const html = (await res.text()).slice(0, 750000);

  let primary: string | undefined;
  let fallback: string | undefined;

  const cleanHtmlUrl = (raw: string) =>
    raw
      .replace(/\\u002f/gi, '/')
      .replace(/\\\//g, '/')
      .replace(/&amp;/g, '&')
      .trim();

  // Extract Bing fast cached thumbnail URL (loads reliably without hotlink 403)
  const turlMatches = html.matchAll(/turl&quot;:&quot;(https?:\/\/(?:(?!&quot;).)+)&quot;/gi);
  for (const match of turlMatches) {
    const raw = match[1] ? cleanHtmlUrl(match[1]) : '';
    if (!raw) continue;
    const valid = await assertPublicHttpUrl(raw);
    if (valid && isLikelyUsefulImageUrl(valid.toString())) {
      fallback = valid.toString();
      break;
    }
  }

  // Extract direct product photo murl
  const murlMatches = html.matchAll(/murl&quot;:&quot;(https?:\/\/(?:(?!&quot;).)+)&quot;/gi);
  for (const match of murlMatches) {
    const raw = match[1] ? cleanHtmlUrl(match[1]) : '';
    if (!raw) continue;
    const valid = await assertPublicHttpUrl(raw);
    if (valid && isLikelyUsefulImageUrl(valid.toString())) {
      primary = valid.toString();
      break;
    }
  }

  if (!primary) {
    const altMatches = html.matchAll(/\"murl\":\"(https?:\/\/[^\"]+)\"/gi);
    for (const match of altMatches) {
      const raw = match[1] ? cleanHtmlUrl(match[1]) : '';
      if (!raw) continue;
      const valid = await assertPublicHttpUrl(raw);
      if (valid && isLikelyUsefulImageUrl(valid.toString())) {
        primary = valid.toString();
        break;
      }
    }
  }

  if (primary) return { primary, fallback };
  if (fallback) return { primary: fallback };
  return null;
}

function extractJsonArrayOrObject(rawText: string): {
  summaryVerdict?: string;
  gifts: RawAiGift[];
} {
  const cleaned = rawText
    .replace(/```json\s*/gi, '')
    .replace(/```\s*/g, '')
    .trim();

  const pickArray = (obj: unknown): { summaryVerdict?: string; gifts: RawAiGift[] } | null => {
    if (!obj || typeof obj !== 'object') return null;
    if (Array.isArray(obj)) return { gifts: obj as RawAiGift[] };
    const rec = obj as Record<string, unknown>;
    const summaryVerdict =
      typeof rec.summaryVerdict === 'string' ? rec.summaryVerdict : undefined;
    for (const key of ['gifts', 'recommendations', 'items', 'products', 'results']) {
      if (Array.isArray(rec[key])) {
        return { summaryVerdict, gifts: rec[key] as RawAiGift[] };
      }
    }
    for (const val of Object.values(rec)) {
      if (Array.isArray(val) && val.length > 0) {
        return { summaryVerdict, gifts: val as RawAiGift[] };
      }
    }
    return null;
  };

  try {
    const direct = JSON.parse(cleaned);
    const picked = pickArray(direct);
    if (picked) return picked;
  } catch {
    // Fall through to substring recovery
  }

  const firstObj = cleaned.indexOf('{');
  const lastObj = cleaned.lastIndexOf('}');
  if (firstObj !== -1 && lastObj > firstObj) {
    try {
      const parsed = JSON.parse(cleaned.slice(firstObj, lastObj + 1));
      const picked = pickArray(parsed);
      if (picked) return picked;
    } catch {
      // Fall through to array extraction
    }
  }

  const firstArr = cleaned.indexOf('[');
  const lastArr = cleaned.lastIndexOf(']');
  if (firstArr !== -1 && lastArr > firstArr) {
    try {
      const arr = JSON.parse(cleaned.slice(firstArr, lastArr + 1));
      if (Array.isArray(arr)) return { gifts: arr as RawAiGift[] };
    } catch {
      // Fall through to object-by-object recovery
    }
  }

  // Last-resort recovery for truncated JSON arrays: extract individual {...} gift blocks
  const recovered: RawAiGift[] = [];
  const objMatches = cleaned.matchAll(/\{[^{}]*\"name\"\s*:\s*\"[^\"]+\"[^{}]*\}/g);
  for (const m of objMatches) {
    try {
      const item = JSON.parse(m[0]) as RawAiGift;
      if (item && item.name) recovered.push(item);
    } catch {
      // Ignore malformed chunk
    }
  }

  return { gifts: recovered };
}

function buildShoppingSearchUrl(name: string, maker: string): string {
  const q = encodeURIComponent(`${maker} ${name} buy online India`.trim());
  return `https://www.google.com/search?tbm=shop&q=${q}`;
}

function isRetryableGeminiError(err: unknown): boolean {
  const errObj = err as { status?: number; message?: string };
  const msg = typeof errObj?.message === 'string' ? errObj.message : '';
  return (
    errObj?.status === 429 ||
    errObj?.status === 503 ||
    msg.includes('RESOURCE_EXHAUSTED') ||
    msg.includes('UNAVAILABLE') ||
    msg.includes('high demand')
  );
}

/** True when we should try the next API key (rate-limit, auth, invalid key). */
function isRotatableKeyError(err: unknown): boolean {
  const errObj = err as { status?: number; message?: string };
  const msg = typeof errObj?.message === 'string' ? errObj.message : '';
  return (
    errObj?.status === 401 ||
    errObj?.status === 403 ||
    errObj?.status === 429 ||
    msg.includes('RESOURCE_EXHAUSTED') ||
    msg.includes('API_KEY_INVALID') ||
    msg.includes('API key not valid') ||
    msg.includes('PERMISSION_DENIED') ||
    msg.includes('invalid api key') ||
    msg.toLowerCase().includes('api key')
  );
}

/**
 * Load Gemini keys from env.
 * Preferred: GEMINI_API_KEYS="key1,key2,key3"
 * Also accepts GEMINI_API_KEY / API_KEY / GEMINI_API_KEY_2 / GEMINI_API_KEY_3
 * Never commit real keys — only set them in .env or host secrets.
 */
function loadGeminiApiKeys(): string[] {
  const keys: string[] = [];
  const seen = new Set<string>();

  const add = (raw: string | undefined) => {
    if (!raw) return;
    for (const part of raw.split(/[,;\n]+/)) {
      const k = part.trim();
      if (k && !seen.has(k)) {
        seen.add(k);
        keys.push(k);
      }
    }
  };

  add(process.env.GEMINI_API_KEYS);
  add(process.env.GEMINI_API_KEY);
  add(process.env.API_KEY);
  add(process.env.GEMINI_API_KEY_2);
  add(process.env.GEMINI_API_KEY_3);
  add(process.env.GEMINI_API_KEY_4);

  return keys;
}

function sanitizeErrorMessage(rawMsg: string): string {
  return rawMsg
    .replace(/AQ\.[A-Za-z0-9_-]{10,}/g, '[redacted-key]')
    .replace(/AIza[A-Za-z0-9_-]{10,}/g, '[redacted-key]')
    .slice(0, 200);
}

const GIFT_RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    summaryVerdict: { type: Type.STRING },
    gifts: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          maker: { type: Type.STRING },
          category: { type: Type.STRING },
          priceInr: { type: Type.NUMBER },
          searchQuery: { type: Type.STRING },
          whyItFits: { type: Type.STRING },
          customCardNote: { type: Type.STRING },
          utilityScore: { type: Type.NUMBER },
          keepsakeScore: { type: Type.NUMBER },
          unwrapScore: { type: Type.NUMBER },
        },
        required: [
          'name',
          'maker',
          'priceInr',
          'searchQuery',
          'whyItFits',
          'customCardNote',
        ],
      },
    },
  },
  required: ['summaryVerdict', 'gifts'],
};

async function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          const err = new Error(`${label} timed out`) as Error & { status?: number };
          err.status = 503;
          reject(err);
        }, ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function generateFastAiGifts(
  ai: GoogleGenAI,
  prompt: string
): Promise<{ summaryVerdict?: string; gifts: RawAiGift[] }> {
  const modelsToTry = [
    { model: 'gemini-3.1-flash-lite', thinkingLevel: ThinkingLevel.MINIMAL, timeoutMs: 11500 },
    { model: 'gemini-4-hydrogen', thinkingLevel: ThinkingLevel.LOW, timeoutMs: 11500 },
    { model: 'gemini-3.1-flash-lite', thinkingLevel: ThinkingLevel.MINIMAL, timeoutMs: 9000 },
  ];

  let lastErr: unknown = null;

  for (const attempt of modelsToTry) {
    try {
      const response = await withTimeout(
        ai.models.generateContent({
          model: attempt.model,
          contents: prompt,
          config: {
            systemInstruction:
              'Return compact valid JSON matching the schema with 10 real gifts sold in India. Keep every string crisp and under 14 words.',
            responseMimeType: 'application/json',
            responseSchema: GIFT_RESPONSE_SCHEMA,
            thinkingConfig: { thinkingLevel: attempt.thinkingLevel },
          },
        }),
        attempt.timeoutMs,
        attempt.model
      );
      if (response.text) {
        const parsed = extractJsonArrayOrObject(response.text);
        if (parsed.gifts.length > 0) {
          return parsed;
        }
      }
    } catch (err) {
      lastErr = err;
      if (isRetryableGeminiError(err)) {
        await new Promise((r) => setTimeout(r, 250));
        continue;
      }
      throw err;
    }
  }

  if (lastErr) throw lastErr;
  return { gifts: [] };
}

async function fetchImageBytesSafe(
  targetUrl: string
): Promise<{ contentType: string; buffer: Buffer } | null> {
  const valid = await assertPublicHttpUrl(targetUrl);
  if (!valid) return null;

  const upstream = await safeFetch(
    valid.toString(),
    {
      'User-Agent': BROWSER_HEADERS['User-Agent'],
      Accept: 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
      Referer: valid.origin,
    },
    2400
  );

  if (!upstream || !upstream.ok) return null;
  const ctype = (upstream.headers.get('content-type') || '').toLowerCase();
  if (!ctype.startsWith('image/')) return null;

  const arrayBuf = await upstream.arrayBuffer();
  if (arrayBuf.byteLength === 0 || arrayBuf.byteLength > 5 * 1024 * 1024) {
    return null;
  }

  return {
    contentType: ctype.split(';')[0] || 'image/jpeg',
    buffer: Buffer.from(arrayBuf),
  };
}

async function createServer() {
  const app = express();
  app.use(express.json({ limit: '64kb' }));

  const imageCache = new Map<string, { contentType: string; data: Buffer; expiresAt: number }>();

  // Hardened SSRF-safe fast image proxy with primary + cached fallback URL
  app.get('/api/image-proxy', async (req: Request, res: Response) => {
    const rawUrl = typeof req.query.url === 'string' ? req.query.url : '';
    const rawFallback = typeof req.query.fallback === 'string' ? req.query.fallback : '';

    if (!rawUrl || rawUrl.length > 1500) {
      res.status(400).send('Invalid image URL');
      return;
    }

    const cacheKey = `${rawUrl}|${rawFallback}`;
    const cached = imageCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      res.setHeader('Content-Type', cached.contentType);
      res.setHeader('Cache-Control', 'public, max-age=3600');
      res.send(cached.data);
      return;
    }

    const validPrimary = await assertPublicHttpUrl(rawUrl);
    if (!validPrimary) {
      res.status(400).send('Disallowed or invalid URL');
      return;
    }

    let result = await fetchImageBytesSafe(validPrimary.toString());
    if (!result && rawFallback && rawFallback.length <= 1500) {
      result = await fetchImageBytesSafe(rawFallback);
    }

    if (!result) {
      res.status(404).send('Image unavailable');
      return;
    }

    if (imageCache.size > 160) {
      const oldestKey = imageCache.keys().next().value;
      if (oldestKey) imageCache.delete(oldestKey);
    }
    imageCache.set(cacheKey, {
      contentType: result.contentType,
      data: result.buffer,
      expiresAt: Date.now() + 30 * 60 * 1000,
    });

    res.setHeader('Content-Type', result.contentType);
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.send(result.buffer);
  });

  app.get('/api/health', (_req: Request, res: Response) => {
    const keys = loadGeminiApiKeys();
    res.json({
      ok: true,
      service: 'giftte-intelligence',
      hasApiKey: keys.length > 0,
      apiKeyCount: keys.length,
    });
  });

  // Fast giftte Intelligence curation + parallel product image search endpoint
  app.post('/api/gifts/decide', async (req: Request, res: Response) => {
    const apiKeys = loadGeminiApiKeys();
    if (apiKeys.length === 0) {
      res.status(503).json({
        error:
          'No Gemini API keys configured. Set GEMINI_API_KEYS (comma-separated) or GEMINI_API_KEY in Settings > Secrets / .env.',
      });
      return;
    }

    const body = (req.body || {}) as DecidePayload;
    const relationship = clampStr(body.relationship, 'Best Friend', 60);
    const occasion = clampStr(body.occasion, 'Birthday', 60);
    const ageGroup = clampStr(body.ageGroup, 'Young Adult (20s)', 40);
    const minInr = clampNum(body.minInr, 1000, 100, 1000000);
    const maxInr = Math.max(minInr, clampNum(body.maxInr, 7500, 100, 2000000));
    const giftFormat = clampStr(body.giftFormat, 'Any Format', 60);
    const vibeStyle = clampStr(body.vibeStyle, 'Any Aesthetic', 60);
    const giftGoal = clampStr(body.giftGoal, 'Any Goal', 60);
    const urgency = clampStr(body.urgency, 'Within 2–3 Days', 60);
    const customNote = clampStr(body.customNote, '', 600);
    const freeSearch = clampStr(body.searchQuery, '', 140);

    const traitsList = Array.isArray(body.traits)
      ? body.traits
          .filter((t): t is string => typeof t === 'string')
          .map((t) => t.trim().slice(0, 40))
          .slice(0, 10)
      : [];

    const prompt = freeSearch
      ? `Suggest 10 distinct, real, popular consumer products sold in India matching "${freeSearch}" priced between ₹${minInr} and ₹${maxInr} INR. Use real brand and model names (like Sony, Bose, Marshall, Blue Tokai, Kinto, DailyObjects, Forest Essentials, Mokobara, Lego, Casio, Kindle, Bellroy, Faber-Castell, etc.) and keep "searchQuery" short and clean (3-5 exact words) so a product image search returns the right photo.`
      : `Suggest 10 distinct, REAL, specific brand-name gift products available in India tailored to:
- Relationship: ${relationship}
- Occasion: ${occasion}
- Age group: ${ageGroup}
- Budget range: ₹${minInr} to ₹${maxInr} INR (keep all priceInr realistically within this range)
- Preferred format: ${giftFormat}
- Aesthetic vibe: ${vibeStyle}
- Goal: ${giftGoal}
- Delivery speed: ${urgency}
- Personality & interests: ${traitsList.length > 0 ? traitsList.join(', ') : 'Thoughtful & balanced'}
${customNote ? `- Personal clues: "${customNote}"` : ''}

Keep each "searchQuery" crisp (3-5 words of exact brand + product name) so product image search finds the clean product photo.`;

    let lastError: unknown = null;
    let summaryVerdict: string | undefined;
    let parsedGifts: RawAiGift[] = [];

    // Rotate across keys on rate-limit / invalid-key / auth errors
    for (let keyIdx = 0; keyIdx < apiKeys.length; keyIdx++) {
      const apiKey = apiKeys[keyIdx];
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

      try {
        const result = await generateFastAiGifts(ai, prompt);
        summaryVerdict = result.summaryVerdict;
        parsedGifts = result.gifts;
        if (parsedGifts.length > 0) {
          if (keyIdx > 0) {
            console.log(`[giftte] Succeeded with API key #${keyIdx + 1} after rotating`);
          }
          break; // success
        }
        // empty list — treat as soft failure and try next key if any
        lastError = new Error('Empty gift list from model');
        if (keyIdx < apiKeys.length - 1) {
          console.warn(`[giftte] Key #${keyIdx + 1} returned empty list, rotating...`);
          continue;
        }
      } catch (err) {
        lastError = err;
        if (isRotatableKeyError(err) && keyIdx < apiKeys.length - 1) {
          console.warn(
            `[giftte] Key #${keyIdx + 1} failed (rotatable), trying next key...`
          );
          await new Promise((r) => setTimeout(r, 200));
          continue;
        }
        // Non-rotatable or last key — fall through to error handling below
        break;
      }
    }

    try {
      if (parsedGifts.length === 0 && lastError) {
        throw lastError;
      }
      // re-use the original success path variable names
      // (summaryVerdict and parsedGifts already set)
      const topTen = parsedGifts.slice(0, 10);

      if (topTen.length === 0) {
        res.status(502).json({
          error: 'giftte Intelligence returned an empty gift list. Please tap Retry.',
        });
        return;
      }

      // Fetch real product images in parallel (fast image search only, bounded by 2.4s timeout)
      const recommendations = await Promise.all(
        topTen.map(async (raw, idx) => {
          const name = clampStr(raw.name, `Curated Gift ${idx + 1}`, 120);
          const maker = clampStr(raw.maker, 'Featured Brand', 60);
          const searchQuery = clampStr(raw.searchQuery, `${maker} ${name}`, 90);

          const imgPair = await searchProductImagesFast(searchQuery);

          const proxiedImage = imgPair
            ? `/api/image-proxy?url=${encodeURIComponent(imgPair.primary)}${
                imgPair.fallback ? `&fallback=${encodeURIComponent(imgPair.fallback)}` : ''
              }`
            : '';

          const shoppingUrl = buildShoppingSearchUrl(name, maker);
          const priceInr = clampNum(
            raw.priceInr,
            Math.round((minInr + maxInr) / 2),
            99,
            2500000
          );
          const matchPercentage = clampNum(
            raw.matchPercentage,
            Math.max(72, 96 - idx * 2),
            50,
            99
          );
          const whyFits = clampStr(
            raw.whyItFits,
            `Strong match for ${relationship.toLowerCase()} on ${occasion.toLowerCase()}.`,
            280
          );
          const reasons = Array.isArray(raw.reasons)
            ? raw.reasons
                .filter((r): r is string => typeof r === 'string')
                .map((r) => r.trim().slice(0, 120))
                .filter(Boolean)
                .slice(0, 4)
            : [whyFits];
          const cardNote = clampStr(
            raw.customCardNote,
            `For you — because this felt right.`,
            200
          );

          const giftItem = {
            id: `ai_${Date.now().toString(36)}_${idx}_${name
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, '-')
              .slice(0, 26)}`,
            name,
            maker,
            category: clampStr(raw.category, 'Curated Gift', 50),
            format: clampStr(raw.format, giftFormat === 'Any Format' ? 'Physical Gift' : giftFormat, 50),
            vibeStyle: clampStr(
              raw.vibeStyle,
              vibeStyle === 'Any Aesthetic' ? 'Modern' : vibeStyle,
              50
            ),
            primaryGoal: clampStr(raw.primaryGoal, giftGoal === 'Any Goal' ? 'Thoughtful Pick' : giftGoal, 50),
            priceInr,
            image: proxiedImage,
            productUrl: shoppingUrl,
            buySearchUrl: shoppingUrl,
            shortTag: clampStr(raw.shortTag, `Top ${idx + 1}`, 32),
            tagline: clampStr(raw.tagline, whyFits, 140),
            description: clampStr(raw.description, whyFits, 360),
            lovesIt: clampStr(raw.lovesIt, `Great fit for ${relationship.toLowerCase()}.`, 180),
            skipIf: clampStr(raw.skipIf, 'Skip if they already own a similar piece.', 180),
            presentationTip: clampStr(
              raw.presentationTip,
              'Wrap in minimal kraft or linen paper with a handwritten note.',
              200
            ),
            leadTimeDays: clampNum(raw.leadTimeDays, 2, 1, 14),
            utilityScore: clampNum(raw.utilityScore, 8, 1, 10),
            keepsakeScore: clampNum(raw.keepsakeScore, 8, 1, 10),
            unwrapScore: clampNum(raw.unwrapScore, 9, 1, 10),
            cardTemplates: [cardNote],
            isLiveAi: true,
          };

          return {
            gift: giftItem,
            matchPercentage,
            whyItFits: whyFits,
            reasons,
            customCardNote: cardNote,
          };
        })
      );

      res.json({
        summaryVerdict:
          summaryVerdict ||
          (freeSearch
            ? `giftte Intelligence picked ${recommendations.length} gifts matching "${freeSearch}".`
            : `giftte Intelligence picked ${recommendations.length} gifts for ${relationship} (${occasion}) within ₹${minInr.toLocaleString(
                'en-IN'
              )}–₹${maxInr.toLocaleString('en-IN')}.`),
        recommendations,
        groundingSources: [],
      });
    } catch (error) {
      const errObj = error as { status?: number; message?: string };
      const msg = sanitizeErrorMessage(
        typeof errObj?.message === 'string'
          ? errObj.message
          : 'giftte Intelligence search failed.'
      );
      const status = typeof errObj?.status === 'number' ? errObj.status : 0;
      console.error('[giftte] Intelligence error:', status || 'unknown', msg);

      if (status === 429 || msg.includes('RESOURCE_EXHAUSTED')) {
        res.status(429).json({
          error:
            'All configured Gemini API keys hit rate limits. Wait a moment and retry, or add more keys via GEMINI_API_KEYS.',
        });
        return;
      }
      if (status === 503 || msg.includes('UNAVAILABLE') || msg.includes('high demand')) {
        res.status(503).json({
          error: 'giftte Intelligence is momentarily busy. Please tap Retry in a few seconds.',
        });
        return;
      }
      if (
        status === 401 ||
        status === 403 ||
        msg.includes('API_KEY_INVALID') ||
        msg.includes('API key not valid')
      ) {
        res.status(502).json({
          error: 'None of the configured Gemini API keys could be verified. Check GEMINI_API_KEYS in Settings > Secrets or .env.',
        });
        return;
      }
      res.status(500).json({ error: 'Unable to fetch giftte Intelligence picks right now. Please try again.' });
    }
  });

  // Always return JSON for unknown /api/* routes instead of HTML fallback
  app.use('/api', (_req: Request, res: Response) => {
    res.status(404).json({ error: 'API route not found.' });
  });

  // Global JSON error handler for malformed request bodies or middleware exceptions
  app.use((err: unknown, req: Request, res: Response, _next: NextFunction) => {
    console.error('[giftte] Server error:', err instanceof Error ? err.message : 'Unknown error');
    if (req.path.startsWith('/api')) {
      res.status(400).json({ error: 'Invalid request payload.' });
      return;
    }
    res.status(500).send('Internal Server Error');
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`giftte server running on http://0.0.0.0:${PORT}`);
  });
}

void createServer();
