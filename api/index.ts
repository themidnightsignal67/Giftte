/**
 * Vercel serverless entry for giftte API routes.
 * Set GEMINI_API_KEYS in Vercel → Settings → Environment Variables.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';

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
  maxDuration: 60,
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const app = await getApp();
    return await new Promise<void>((resolve) => {
      const done = () => resolve();
      res.on('finish', done);
      res.on('close', done);
      app(req as unknown as import('express').Request, res as unknown as import('express').Response);
    });
  } catch (err) {
    console.error('[giftte] serverless handler error:', err);
    const message =
      err instanceof Error ? err.message : 'giftte Intelligence server failed to start.';
    if (!res.headersSent) {
      res.status(500).json({ error: message });
    }
  }
}
