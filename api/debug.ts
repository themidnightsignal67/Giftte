import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI } from '@google/genai';
import { loadGeminiApiKeys, sanitizeErrorMessage } from './lib/server-lib';

export const config = { maxDuration: 30 };

function errDetail(err: unknown): string {
  if (!err) return 'unknown';
  if (err instanceof Error) {
    const any = err as Error & { status?: number; code?: string; error?: { message?: string } };
    const nested = any.error?.message;
    return sanitizeErrorMessage(
      [any.message, nested, any.status ? `status=${any.status}` : '', any.code || '']
        .filter(Boolean)
        .join(' | ')
    );
  }
  try {
    return sanitizeErrorMessage(JSON.stringify(err).slice(0, 300));
  } catch {
    return String(err);
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const keys = loadGeminiApiKeys();
  const models = [
    'gemini-3.5-flash-lite',
    'gemini-3.8-flash',
    'gemini-3.1-flash-lite',
    'gemini-4-hydrogen',
  ];

  const report: Record<string, unknown> = {
    ok: true,
    service: 'giftte-debug',
    hasApiKey: keys.length > 0,
    apiKeyCount: keys.length,
    keyPrefixes: keys.map((k) => `${k.slice(0, 6)}…${k.slice(-4)}`),
    modelsToTry: models,
    envPresent: {
      GEMINI_API_KEYS: Boolean(process.env.GEMINI_API_KEYS),
      GEMINI_API_KEY: Boolean(process.env.GEMINI_API_KEY),
      API_KEY: Boolean(process.env.API_KEY),
      VERCEL: Boolean(process.env.VERCEL),
      NODE_ENV: process.env.NODE_ENV || null,
    },
    modelTests: [] as unknown[],
  };

  if (keys.length === 0) {
    report.ok = false;
    report.error =
      'No API keys found. Set GEMINI_API_KEYS in Vercel → Settings → Environment Variables (Production + Preview), then Redeploy.';
    res.status(200).json(report);
    return;
  }

  // Probe: only run live Gemini test when ?probe=1 so normal health stays cheap
  if (req.query.probe === '1' || req.query.probe === 'true') {
    const apiKey = keys[0];
    const ai = new GoogleGenAI({ apiKey });
    const tests: unknown[] = [];

    for (const model of models) {
      const started = Date.now();
      try {
        const response = await ai.models.generateContent({
          model,
          contents: 'Reply with exactly this JSON: {"ok":true}',
          config: { responseMimeType: 'application/json' },
        });
        tests.push({
          model,
          ok: true,
          ms: Date.now() - started,
          sample: (response.text || '').slice(0, 80),
        });
        // First success is enough for probe
        break;
      } catch (err) {
        tests.push({
          model,
          ok: false,
          ms: Date.now() - started,
          error: errDetail(err),
        });
      }
    }

    report.modelTests = tests;
    report.ok = tests.some((t) => (t as { ok?: boolean }).ok === true);
    if (!report.ok) {
      report.error =
        'All probed models failed with the first API key. Check key validity and model access in Google AI Studio.';
    }
  } else {
    report.hint = 'Add ?probe=1 to live-test Gemini with your first key (uses a tiny request).';
  }

  res.status(200).json(report);
}
