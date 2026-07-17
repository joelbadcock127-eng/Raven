import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { supabaseAdmin } from '@/lib/supabase';
import { generateCampaignKit } from '@/lib/kit';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // Sonnet page + Haiku bundle can take a while

/** POST /api/campaigns/prepare  { id } — generate the full campaign kit. */
export async function POST(req: NextRequest) {
  const supabase = supabaseAdmin();
  if (!supabase) return NextResponse.json({ ok: false, message: 'Supabase not configured' }, { status: 500 });

  const { id } = (await req.json().catch(() => ({}))) as { id?: string };
  if (!id) return NextResponse.json({ ok: false, message: 'Missing campaign id' }, { status: 400 });

  try {
    const result = await generateCampaignKit(supabase, id);
    revalidatePath('/campaigns');
    revalidatePath('/social');
    return NextResponse.json(result, { status: result.ok ? 200 : 422 });
  } catch (err) {
    return NextResponse.json({ ok: false, message: (err as Error).message }, { status: 500 });
  }
}
