import type { VercelRequest, VercelResponse } from '@vercel/node';

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
  return keys;
}

export default function handler(_req: VercelRequest, res: VercelResponse) {
  const keys = loadGeminiApiKeys();
  res.status(200).json({
    ok: true,
    service: 'giftte-intelligence',
    hasApiKey: keys.length > 0,
    apiKeyCount: keys.length,
  });
}
