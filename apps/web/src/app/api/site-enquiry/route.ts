import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

/** Contact-form submissions from the public property sites. */
export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, message: 'Invalid request' }, { status: 400 });
  }

  // honeypot — real visitors never fill this
  if (typeof body.website === 'string' && body.website.trim() !== '') {
    return NextResponse.json({ ok: true });
  }

  const name = String(body.name ?? '').trim().slice(0, 200);
  const email = String(body.email ?? '').trim().slice(0, 200);
  const phone = String(body.phone ?? '').trim().slice(0, 60);
  const message = String(body.message ?? '').trim().slice(0, 2000);
  const propertyId = String(body.property_id ?? 'annie-may').trim();

  if (!name || !message || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json(
      { ok: false, message: 'Please include your name, a valid email and a message.' },
      { status: 400 },
    );
  }

  const supabase = supabaseAdmin();
  if (!supabase) {
    return NextResponse.json(
      { ok: false, message: 'The enquiry service is not available right now.' },
      { status: 503 },
    );
  }

  const { error } = await supabase.from('site_enquiries').insert({
    property_id: propertyId,
    name,
    email,
    phone: phone || null,
    message,
  });
  if (error) {
    return NextResponse.json(
      { ok: false, message: 'Something went wrong sending your enquiry. Please try again.' },
      { status: 500 },
    );
  }
  return NextResponse.json({ ok: true });
}
