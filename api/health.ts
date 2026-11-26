import type { VercelRequest, VercelResponse } from '@vercel/node';
import { loadGeminiApiKeys } from './lib/helpers';

export default function handler(_req: VercelRequest, res: VercelResponse) {
  const keys = loadGeminiApiKeys();
  res.status(200).json({
    ok: true,
    service: 'giftte-intelligence',
    hasApiKey: keys.length > 0,
    apiKeyCount: keys.length,
  });
}
