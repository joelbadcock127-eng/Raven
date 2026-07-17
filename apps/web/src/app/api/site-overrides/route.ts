import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

/** Read the saved edit overrides for one mirrored site page. */
export async function GET(req: NextRequest) {
  const property = req.nextUrl.searchParams.get('property') ?? '';
  const slug = req.nextUrl.searchParams.get('slug') ?? '';
  if (!property || !slug) return NextResponse.json({ overrides: [] });

  const supabase = supabaseAdmin();
  if (!supabase) return NextResponse.json({ overrides: [] });

  const { data } = await supabase
    .from('site_pages')
    .select('blocks')
    .eq('property_id', property)
    .eq('slug', slug)
    .maybeSingle();

  return NextResponse.json({ overrides: data?.blocks ?? [] });
}
