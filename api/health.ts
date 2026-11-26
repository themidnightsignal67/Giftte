import type { VercelRequest, VercelResponse } from '@vercel/node';
import { loadGeminiApiKeys } from './lib/server-lib';

export default function handler(_req: VercelRequest, res: VercelResponse) {
  try {
    const keys = loadGeminiApiKeys();
    res.status(200).json({
      ok: true,
      service: 'giftte-intelligence',
      hasApiKey: keys.length > 0,
      apiKeyCount: keys.length,
    });
  } catch (err) {
    console.error('[giftte] health error:', err);
    res.status(500).json({
      ok: false,
      error: err instanceof Error ? err.message : 'Health check failed',
    });
  }
}
