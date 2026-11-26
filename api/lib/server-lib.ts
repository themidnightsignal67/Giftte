import dns from 'node:dns/promises';
import net from 'node:net';
import { GoogleGenAI, Type } from '@google/genai';

export interface DecidePayload {
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

export interface RawAiGift {
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

export interface ImageCandidatePair {
  primary: string;
  fallback?: string;
}

export const BROWSER_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-IN,en;q=0.9',
};

export function clampStr(val: unknown, fallback: string, maxLen: number): string {
  if (typeof val !== 'string') return fallback;
  const trimmed = val.trim();
  return trimmed ? trimmed.slice(0, maxLen) : fallback;
}

export function clampNum(val: unknown, fallback: number, min: number, max: number): number {
  const num = Number(val);
  if (!Number.isFinite(num)) return fallback;
  return Math.max(min, Math.min(max, Math.round(num)));
}

export function isPrivateOrReservedIp(ip: string): boolean {
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

export async function assertPublicHttpUrl(rawUrl: string): Promise<URL | null> {
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

export async function safeFetch(
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

export function isLikelyUsefulImageUrl(urlStr: string): boolean {
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

export async function searchProductImagesFast(queryText: string): Promise<ImageCandidatePair | null> {
  const searchUrl = `https://www.bing.com/images/search?q=${encodeURIComponent(
    `${queryText} product`
  )}&form=HDRSC2&first=1`;
  const res = await safeFetch(searchUrl, BROWSER_HEADERS, 2400);
  if (!res || !res.ok) return null;

  const html = (await res.text()).slice(0, 750000);
  let primary: string | undefined;
  let fallback: string | undefined;

  const cleanHtmlUrl = (raw: string) =>
    raw.replace(/\\u002f/gi, '/').replace(/\\\//g, '/').replace(/&amp;/g, '&').trim();

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

  if (primary) return { primary, fallback };
  if (fallback) return { primary: fallback };
  return null;
}

export function extractJsonArrayOrObject(rawText: string): {
  summaryVerdict?: string;
  gifts: RawAiGift[];
} {
  const cleaned = rawText.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();

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
    // Fall through
  }

  const firstObj = cleaned.indexOf('{');
  const lastObj = cleaned.lastIndexOf('}');
  if (firstObj !== -1 && lastObj > firstObj) {
    try {
      const parsed = JSON.parse(cleaned.slice(firstObj, lastObj + 1));
      const picked = pickArray(parsed);
      if (picked) return picked;
    } catch {
      // Fall through
    }
  }

  const firstArr = cleaned.indexOf('[');
  const lastArr = cleaned.lastIndexOf(']');
  if (firstArr !== -1 && lastArr > firstArr) {
    try {
      const arr = JSON.parse(cleaned.slice(firstArr, lastArr + 1));
      if (Array.isArray(arr)) return { gifts: arr as RawAiGift[] };
    } catch {
      // Fall through
    }
  }

  return { gifts: [] };
}

export function buildShoppingSearchUrl(name: string, maker: string): string {
  const q = encodeURIComponent(`${maker} ${name} buy online India`.trim());
  return `https://www.google.com/search?tbm=shop&q=${q}`;
}

export function isRetryableGeminiError(err: unknown): boolean {
  const msg = extractErrorMessage(err).toLowerCase();
  const status = extractErrorStatus(err);
  return (
    status === 429 ||
    status === 503 ||
    msg.includes('resource_exhausted') ||
    msg.includes('unavailable') ||
    msg.includes('high demand') ||
    msg.includes('timed out')
  );
}

export function isRotatableKeyError(err: unknown): boolean {
  const msg = extractErrorMessage(err).toLowerCase();
  const status = extractErrorStatus(err);
  return (
    status === 401 ||
    status === 403 ||
    status === 429 ||
    msg.includes('resource_exhausted') ||
    msg.includes('api_key_invalid') ||
    msg.includes('api key not valid') ||
    msg.includes('permission_denied') ||
    msg.includes('invalid api key') ||
    msg.includes('api key')
  );
}

export function extractErrorStatus(err: unknown): number {
  if (!err || typeof err !== 'object') return 0;
  const e = err as { status?: number; code?: number; error?: { code?: number } };
  if (typeof e.status === 'number') return e.status;
  if (typeof e.code === 'number') return e.code;
  if (typeof e.error?.code === 'number') return e.error.code;
  return 0;
}

export function extractErrorMessage(err: unknown): string {
  if (!err) return 'unknown error';
  if (typeof err === 'string') return err;
  if (err instanceof Error) {
    const any = err as Error & { error?: { message?: string } };
    if (any.error?.message) return `${any.message} (${any.error.message})`;
    return any.message || 'Error';
  }
  if (typeof err === 'object') {
    const e = err as { message?: string; error?: { message?: string } };
    if (e.error?.message) return e.error.message;
    if (e.message) return e.message;
    try {
      return JSON.stringify(err).slice(0, 300);
    } catch {
      return 'object error';
    }
  }
  return String(err);
}

export function loadGeminiApiKeys(): string[] {
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

export function sanitizeErrorMessage(rawMsg: string): string {
  return rawMsg
    .replace(/AQ\.[A-Za-z0-9_-]{10,}/g, '[redacted-key]')
    .replace(/AIza[A-Za-z0-9_-]{10,}/g, '[redacted-key]')
    .slice(0, 280);
}

export const GIFT_RESPONSE_SCHEMA = {
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
        required: ['name', 'maker', 'priceInr', 'searchQuery', 'whyItFits', 'customCardNote'],
      },
    },
  },
  required: ['summaryVerdict', 'gifts'],
};

export async function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
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

export async function generateFastAiGifts(
  ai: GoogleGenAI,
  prompt: string
): Promise<{ summaryVerdict?: string; gifts: RawAiGift[] }> {
  const modelsToTry = [
    'gemini-3.5-flash-lite',
    'gemini-3.8-flash',
    'gemini-3.1-flash-lite',
    'gemini-4-hydrogen',
  ];

  let lastErr: unknown = null;
  const failures: string[] = [];

  for (const model of modelsToTry) {
    for (const useSchema of [true, false]) {
      try {
        const response = await withTimeout(
          ai.models.generateContent({
            model,
            contents: prompt,
            config: useSchema
              ? {
                  systemInstruction:
                    'Return compact valid JSON matching the schema with 10 real gifts sold in India. Keep every string crisp and under 14 words.',
                  responseMimeType: 'application/json',
                  responseSchema: GIFT_RESPONSE_SCHEMA,
                }
              : {
                  systemInstruction:
                    'Return ONLY valid JSON: {"summaryVerdict":"...","gifts":[{"name":"","maker":"","priceInr":0,"searchQuery":"","whyItFits":"","customCardNote":""}]} with exactly 10 gifts sold in India.',
                  responseMimeType: 'application/json',
                },
          }),
          15000,
          model
        );
        if (response.text) {
          const parsed = extractJsonArrayOrObject(response.text);
          if (parsed.gifts.length > 0) {
            return parsed;
          }
          failures.push(`${model}: empty gifts`);
        } else {
          failures.push(`${model}: no text`);
        }
      } catch (err) {
        lastErr = err;
        failures.push(`${model}: ${sanitizeErrorMessage(extractErrorMessage(err))}`);
        if (isRetryableGeminiError(err)) {
          await new Promise((r) => setTimeout(r, 200));
        }
        // if schema failed, try without schema before next model
        continue;
      }
      // got response but empty — try next model
      break;
    }
  }

  const detail = failures.slice(0, 6).join(' · ');
  if (lastErr) {
    const e = lastErr as Error & { message?: string };
    e.message = sanitizeErrorMessage(`${extractErrorMessage(lastErr)} | tried: ${detail}`);
    throw e;
  }
  throw new Error(`No gifts generated. tried: ${detail}`);
}

export async function fetchImageBytesSafe(
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
