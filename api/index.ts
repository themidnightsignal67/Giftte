import type { VercelRequest, VercelResponse } from '@vercel/node';

/** Legacy catch-all. Prefer /api/health, /api/gifts/decide, /api/image-proxy. */
export default function handler(_req: VercelRequest, res: VercelResponse) {
  res.status(200).json({
    ok: true,
    service: 'giftte-intelligence',
    routes: ['/api/health', '/api/gifts/decide', '/api/image-proxy'],
  });
}
