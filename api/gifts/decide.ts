import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI } from '@google/genai';
import {
  clampStr,
  clampNum,
  loadGeminiApiKeys,
  generateFastAiGifts,
  searchProductImagesFast,
  buildShoppingSearchUrl,
  sanitizeErrorMessage,
  isRotatableKeyError,
  type DecidePayload,
  type RawAiGift,
} from '../lib/helpers';

export const config = { maxDuration: 60 };

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed. Use POST.' });
    return;
  }

  const apiKeys = loadGeminiApiKeys();
  if (apiKeys.length === 0) {
    res.status(503).json({
      error:
        'No Gemini API keys configured. Set GEMINI_API_KEYS (comma-separated) in Vercel Environment Variables.',
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

  for (let keyIdx = 0; keyIdx < apiKeys.length; keyIdx++) {
    const apiKey = apiKeys[keyIdx];
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
    });

    try {
      const result = await generateFastAiGifts(ai, prompt);
      summaryVerdict = result.summaryVerdict;
      parsedGifts = result.gifts;
      if (parsedGifts.length > 0) {
        if (keyIdx > 0) {
          console.log(`[giftte] Succeeded with API key #${keyIdx + 1} after rotating`);
        }
        break;
      }
      lastError = new Error('Empty gift list from model');
      if (keyIdx < apiKeys.length - 1) continue;
    } catch (err) {
      lastError = err;
      if (isRotatableKeyError(err) && keyIdx < apiKeys.length - 1) {
        console.warn(`[giftte] Key #${keyIdx + 1} failed (rotatable), trying next key...`);
        await new Promise((r) => setTimeout(r, 200));
        continue;
      }
      break;
    }
  }

  try {
    if (parsedGifts.length === 0 && lastError) throw lastError;
    const topTen = parsedGifts.slice(0, 10);
    if (topTen.length === 0) {
      res.status(502).json({
        error: 'giftte Intelligence returned an empty gift list. Please tap Retry.',
      });
      return;
    }

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
          primaryGoal: clampStr(
            raw.primaryGoal,
            giftGoal === 'Any Goal' ? 'Thoughtful Pick' : giftGoal,
            50
          ),
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

    res.status(200).json({
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
        error:
          'None of the configured Gemini API keys could be verified. Check GEMINI_API_KEYS in Vercel Environment Variables.',
      });
      return;
    }
    res.status(500).json({
      error: 'Unable to fetch giftte Intelligence picks right now. Please try again.',
    });
  }
}
