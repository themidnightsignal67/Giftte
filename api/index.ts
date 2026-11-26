/**
 * Vercel serverless entry for giftte API routes.
 * Static import so Vercel file tracing bundles server.ts + server-lib.ts.
 *
 * Set GEMINI_API_KEYS in Vercel → Settings → Environment Variables.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createServer } from '../server';

export const config = {
  maxDuration: 60,
  // Ensure parent modules ship with the function
  includeFiles: '{server.ts,server-lib.ts}',
};

let appPromise: ReturnType<typeof createServer> | null = null;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (!appPromise) {
      appPromise = createServer();
    }
    const app = await appPromise;

    await new Promise<void>((resolve) => {
      const done = () => resolve();
      res.on('finish', done);
      res.on('close', done);
      app(
        req as unknown as import('express').Request,
        res as unknown as import('express').Response
      );
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
