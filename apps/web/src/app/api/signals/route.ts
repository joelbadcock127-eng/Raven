import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { computeSignals } from '@/lib/signals';

export const maxDuration = 120;
export const dynamic = 'force-dynamic';

/**
 * Computed demand signals — pure logic, zero AI. Daily cron.
 * School holidays, ferry surges, seasonal wildlife windows, and live
 * weather windows (Open-Meteo) become events + scores + opportunities,
 * flowing through the same feed/campaign machinery as scraped events.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const header = req.headers.get('authorization');
  const q = req.nextUrl.searchParams;
  const cronOk = secret && (header === `Bearer ${secret}` || q.get('secret') === secret);
  // owner can also trigger a run manually with the upload token
  const tokenOk = process.env.RAVEN_UPLOAD_TOKEN && q.get('token') === process.env.RAVEN_UPLOAD_TOKEN;
  if (!cronOk && !tokenOk) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const supabase = supabaseAdmin();
  if (!supabase) return NextResponse.json({ error: 'supabase env missing' }, { status: 500 });

  try {
    const result = await computeSignals(supabase);
    await supabase.from('sync_runs').insert({
      kind: 'signals',
      status: 'ok',
      detail: result,
      finished_at: new Date().toISOString(),
    });
    return NextResponse.json(result);
  } catch (err) {
    await supabase.from('sync_runs').insert({
      kind: 'signals',
      status: 'error',
      detail: { error: (err as Error).message },
      finished_at: new Date().toISOString(),
    });
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
