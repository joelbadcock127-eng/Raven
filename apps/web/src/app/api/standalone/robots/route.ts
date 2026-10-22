import { NextRequest, NextResponse } from 'next/server';
import { publicHost } from '@/lib/sites';

export const dynamic = 'force-dynamic';

/** robots.txt for a property site served on its own domain. */
export async function GET(req: NextRequest) {
  const host = publicHost(req.headers);
  const body = [
    'User-agent: *',
    'Allow: /',
    'Disallow: /mirror/',
    'Disallow: /api/',
    'Disallow: /site/',
    'Disallow: /go/',
    'Disallow: /r/',
    'Disallow: /book/',
    `Sitemap: https://${host}/sitemap.xml`,
    '',
  ].join('\n');
  return new NextResponse(body, {
    headers: { 'content-type': 'text/plain; charset=utf-8' },
  });
}
