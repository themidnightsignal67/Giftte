import type { VercelRequest, VercelResponse } from '@vercel/node';
import { assertPublicHttpUrl, fetchImageBytesSafe } from './lib/server-lib';

export const config = { maxDuration: 15 };

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const rawUrl = typeof req.query.url === 'string' ? req.query.url : '';
    const rawFallback = typeof req.query.fallback === 'string' ? req.query.fallback : '';

    if (!rawUrl || rawUrl.length > 1500) {
      res.status(400).send('Invalid image URL');
      return;
    }

    const validPrimary = await assertPublicHttpUrl(rawUrl);
    if (!validPrimary) {
      res.status(400).send('Disallowed or invalid URL');
      return;
    }

    let result = await fetchImageBytesSafe(validPrimary.toString());
    if (!result && rawFallback && rawFallback.length <= 1500) {
      result = await fetchImageBytesSafe(rawFallback);
    }

    if (!result) {
      res.status(404).send('Image unavailable');
      return;
    }

    res.setHeader('Content-Type', result.contentType);
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.send(result.buffer);
  } catch (err) {
    console.error('[giftte] image-proxy error:', err);
    if (!res.headersSent) {
      res.status(500).send('Image proxy error');
    }
  }
}
