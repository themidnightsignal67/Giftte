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

// NOTE: Full server restored in follow-up if truncated.
// This is a temporary minimal stub so deploy is not broken.

export async function createServer() {
  const app = express();
  app.use(express.json({ limit: '64kb' }));

  app.get('/api/health', (_req: Request, res: Response) => {
    const multi = process.env.GEMINI_API_KEYS || '';
    const single = process.env.GEMINI_API_KEY || process.env.API_KEY || '';
    const count = [multi, single].filter(Boolean).length;
    res.json({ ok: true, service: 'giftte-intelligence', hasApiKey: count > 0, note: 'server.ts restore in progress' });
  });

  app.post('/api/gifts/decide', (_req: Request, res: Response) => {
    res.status(503).json({ error: 'Server restore in progress. Redeploy after full server.ts is pushed.' });
  });

  app.get('/api/image-proxy', (_req: Request, res: Response) => {
    res.status(503).send('Server restore in progress');
  });

  app.use('/api', (_req: Request, res: Response) => {
    res.status(404).json({ error: 'API route not found.' });
  });

  return app;
}

async function startLocalServer() {
  const app = await createServer();
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`giftte server running on http://0.0.0.0:${PORT}`);
  });
}

if (!process.env.VERCEL) {
  void startLocalServer();
}

export { createServer };
