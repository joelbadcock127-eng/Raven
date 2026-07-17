import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { enrichEvents } from '@/lib/ai';

export const maxDuration = 300;
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const header = req.headers.get('authorization');
  if (!secret || (header !== `Bearer ${secret}` && req.nextUrl.searchParams.get('secret') !== secret)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const supabase = supabaseAdmin();
  if (!supabase) return NextResponse.json({ error: 'supabase env missing' }, { status: 500 });

  try {
    let total = 0;
    // Up to 5 batches of 20 per invocation
    for (let i = 0; i < 5; i++) {
      const updated = await enrichEvents(supabase, 20);
      total += updated;
      if (updated < 20) break;
    }
    await supabase.from('sync_runs').insert({
      kind: 'enrich',
      status: 'ok',
      detail: { enriched: total },
      finished_at: new Date().toISOString(),
    });
    return NextResponse.json({ enriched: total });
  } catch (err) {
    await supabase.from('sync_runs').insert({
      kind: 'enrich',
      status: 'error',
      detail: { error: (err as Error).message },
      finished_at: new Date().toISOString(),
    });
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
