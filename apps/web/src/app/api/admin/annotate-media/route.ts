import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { anthropic, MODELS } from '@/lib/ai';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const ANNOTATE_SCHEMA = {
  type: 'object',
  properties: {
    caption: { type: 'string', description: 'One factual sentence describing the photo (also usable as alt text)' },
    tags: {
      type: 'array',
      items: { type: 'string' },
      description: '3-6 lowercase tags: subject (exterior, bedroom, bath, sauna, aerial, food…), mood (golden-hour, moody, bright), season if evident',
    },
  },
  required: ['caption', 'tags'],
  additionalProperties: false,
} as const;

/**
 * Auto-caption + tag library images that have no caption yet (Haiku vision).
 * Open in a browser: /api/admin/annotate-media?token=RAVEN_UPLOAD_TOKEN
 * Auto-refreshes until every image is annotated. Costs ~a cent per pass.
 * Captions double as alt text wherever the image is placed.
 */
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token');
  if (!process.env.RAVEN_UPLOAD_TOKEN || token !== process.env.RAVEN_UPLOAD_TOKEN)
    return NextResponse.json({ ok: false, message: 'Bad token' }, { status: 401 });

  const supabase = supabaseAdmin();
  if (!supabase) return NextResponse.json({ ok: false, message: 'Supabase not configured' }, { status: 500 });
  const client = anthropic();
  if (!client) return NextResponse.json({ ok: false, message: 'ANTHROPIC_API_KEY not set' }, { status: 500 });

  const { data: rows } = await supabase
    .from('media_assets')
    .select('id, public_url, tags')
    .eq('kind', 'image')
    .or('caption.is.null,caption.eq.')
    .limit(8);

  let annotated = 0;
  const errors: string[] = [];
  for (const row of rows ?? []) {
    try {
      const res = await client.messages.create({
        model: MODELS.classify,
        max_tokens: 300,
        system: 'You annotate accommodation-property photos for a media library. Be factual and concrete.',
        messages: [
          {
            role: 'user',
            content: [
              { type: 'image', source: { type: 'url', url: row.public_url } },
              { type: 'text', text: 'Annotate this photo.' },
            ],
          },
        ],
        output_config: { format: { type: 'json_schema', schema: ANNOTATE_SCHEMA } },
      });
      const parsed = JSON.parse(res.content.find((b) => b.type === 'text')?.text ?? '{}') as {
        caption: string;
        tags: string[];
      };
      const mergedTags = [...new Set([...(row.tags ?? []), ...(parsed.tags ?? [])])].slice(0, 12);
      const { error } = await supabase
        .from('media_assets')
        .update({ caption: parsed.caption, tags: mergedTags })
        .eq('id', row.id);
      if (error) throw new Error(error.message);
      annotated++;
    } catch (err) {
      errors.push(`${row.id}: ${(err as Error).message}`);
    }
  }

  const { count: remaining } = await supabase
    .from('media_assets')
    .select('id', { count: 'exact', head: true })
    .eq('kind', 'image')
    .or('caption.is.null,caption.eq.');

  const done = (remaining ?? 0) === 0;
  const html = `<!doctype html><meta charset="utf-8">${done ? '' : '<meta http-equiv="refresh" content="2">'}
<body style="font-family:system-ui;padding:40px;max-width:560px;margin:auto">
<h2>${done ? 'Every image is captioned and tagged' : 'Annotating images with AI…'}</h2>
<p>Annotated this pass: <b>${annotated}</b> · Remaining: <b>${remaining ?? '?'}</b></p>
${errors.length ? `<pre style="color:#b00">${errors.slice(0, 5).join('\n')}</pre>` : ''}
<p>${done ? 'You can close this tab.' : 'This page refreshes automatically until done.'}</p>
</body>`;
  return new NextResponse(html, { headers: { 'content-type': 'text/html' } });
}
