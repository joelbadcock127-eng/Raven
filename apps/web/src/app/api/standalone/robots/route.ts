import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/** robots.txt for a property site served on its own domain. */
export async function GET(req: NextRequest) {
  const host = (req.headers.get('host') ?? '').split(':')[0];
  const body = [
    'User-agent: *',
    'Allow: /',
    'Disallow: /mirror/',
    'Disallow: /api/',
    `Sitemap: https://${host}/sitemap.xml`,
    '',
  ].join('\n');
  return new NextResponse(body, {
    headers: { 'content-type': 'text/plain; charset=utf-8' },
  });
}
