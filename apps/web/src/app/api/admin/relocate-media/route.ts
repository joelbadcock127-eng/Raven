import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { createStorageUploadUrl, r2Configured } from '@/lib/storage';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

/**
 * Relocate media blobs from Supabase storage into R2, batch by batch.
 * Open in a browser: /api/admin/relocate-media?token=RAVEN_UPLOAD_TOKEN
 * The page auto-refreshes until every asset reports provider 'r2'.
 * Rows are updated in place — ids, folders, tags and usage stay intact.
 */
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token');
  if (!process.env.RAVEN_UPLOAD_TOKEN || token !== process.env.RAVEN_UPLOAD_TOKEN)
    return NextResponse.json({ ok: false, message: 'Bad token' }, { status: 401 });

  const supabase = supabaseAdmin();
  if (!supabase) return NextResponse.json({ ok: false, message: 'Supabase not configured' }, { status: 500 });
  if (!r2Configured())
    return NextResponse.json({ ok: false, message: 'R2 env vars not set' }, { status: 500 });

  const { data: rows } = await supabase
    .from('media_assets')
    .select('id, public_url, file_name, mime_type, storage_path')
    .eq('storage_provider', 'supabase')
    .limit(20);

  let moved = 0;
  const errors: string[] = [];
  for (const row of rows ?? []) {
    try {
      const dl = await fetch(row.public_url, { signal: AbortSignal.timeout(60_000) });
      if (!dl.ok) throw new Error(`download ${dl.status}`);
      const buf = Buffer.from(await dl.arrayBuffer());
      const mime = row.mime_type ?? dl.headers.get('content-type') ?? 'application/octet-stream';

      const ticket = await createStorageUploadUrl(row.file_name ?? 'asset', mime);
      if (!ticket.ok || !ticket.signedUrl || ticket.provider !== 'r2')
        throw new Error(ticket.message ?? 'no R2 upload URL');
      const put = await fetch(ticket.signedUrl, {
        method: 'PUT',
        headers: { 'content-type': mime },
        body: buf,
      });
      if (!put.ok) throw new Error(`R2 put ${put.status}`);

      const { error } = await supabase
        .from('media_assets')
        .update({
          storage_provider: 'r2',
          storage_path: ticket.storagePath,
          public_url: ticket.publicUrl,
        })
        .eq('id', row.id);
      if (error) throw new Error(error.message);

      // best-effort: free the old Supabase blob (same-project paths only)
      if (row.public_url.includes(process.env.SUPABASE_URL ?? '::')) {
        await supabase.storage.from('media').remove([row.storage_path]).catch(() => undefined);
      }
      moved++;
    } catch (err) {
      errors.push(`${row.file_name}: ${(err as Error).message}`);
    }
  }

  const { count: remaining } = await supabase
    .from('media_assets')
    .select('id', { count: 'exact', head: true })
    .eq('storage_provider', 'supabase');

  const done = (remaining ?? 0) === 0;
  const html = `<!doctype html><meta charset="utf-8">${done ? '' : '<meta http-equiv="refresh" content="2">'}
<body style="font-family:system-ui;padding:40px;max-width:560px;margin:auto">
<h2>${done ? 'All media is on R2' : 'Relocating media to R2…'}</h2>
<p>Moved this pass: <b>${moved}</b> · Remaining: <b>${remaining ?? '?'}</b></p>
${errors.length ? `<pre style="color:#b00">${errors.join('\n')}</pre>` : ''}
<p>${done ? 'You can close this tab.' : 'This page refreshes automatically until done.'}</p>
</body>`;
  return new NextResponse(html, { headers: { 'content-type': 'text/html' } });
}
