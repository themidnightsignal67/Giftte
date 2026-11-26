import type { VercelRequest, VercelResponse } from '@vercel/node';

/** Info route. Real endpoints: /api/health, /api/gifts/decide, /api/image-proxy */
export default function handler(_req: VercelRequest, res: VercelResponse) {
  res.status(200).json({
    ok: true,
    service: 'giftte-intelligence',
    routes: ['/api/health', '/api/gifts/decide', '/api/image-proxy'],
  });
}
