/**
 * Vercel serverless entry for giftte API routes.
 * All /api/* traffic is rewritten here (see vercel.json).
 *
 * Set GEMINI_API_KEYS (comma-separated) in Vercel Project Settings → Environment Variables.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';

// Lazy-init so cold starts only pay once per isolate
let appPromise: Promise<import('express').Express> | null = null;

async function getApp() {
  if (!appPromise) {
    appPromise = (async () => {
      const { createServer } = await import('../server');
      return createServer();
    })();
  }
  return appPromise;
}

export const config = {
  // Gemini curation can take several seconds; raise on Pro if needed
  maxDuration: 60,
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const app = await getApp();
  // Express apps are request listeners — pass through
  return app(req as unknown as import('express').Request, res as unknown as import('express').Response);
}
