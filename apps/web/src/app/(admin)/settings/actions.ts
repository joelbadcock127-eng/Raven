'use server';

import { revalidatePath } from 'next/cache';
import { randomBytes } from 'crypto';
import { supabaseAdmin } from '@/lib/supabase';
import { resolveLinkedProperty } from '@/lib/privateBooking';
import { createBooking } from '@/lib/lodgify';

/** Toggle whether a private booking link holds requests for approval. */
export async function setLinkApproval(linkId: string, requireApproval: boolean) {
  const supabase = supabaseAdmin();
  if (!supabase) return { error: 'Supabase not connected' };
  const { error } = await supabase.from('booking_links').update({ require_approval: requireApproval }).eq('id', linkId);
  revalidatePath('/settings');
  return error ? { error: error.message } : { ok: true };
}

export async function setLinkActive(linkId: string, active: boolean) {
  const supabase = supabaseAdmin();
  if (!supabase) return { error: 'Supabase not connected' };
  const { error } = await supabase.from('booking_links').update({ active }).eq('id', linkId);
  revalidatePath('/settings');
  return error ? { error: error.message } : { ok: true };
}

export async function createLink(propertyId: string, label: string) {
  const supabase = supabaseAdmin();
  if (!supabase) return { error: 'Supabase not connected' };
  const prefix = propertyId.split('-').map((w) => w[0]).join('').slice(0, 4);
  const token = `${prefix}-${randomBytes(6).toString('hex')}`;
  const { error } = await supabase
    .from('booking_links')
    .insert({ token, property_id: propertyId, label: label.trim().slice(0, 120) || 'Private guest', require_approval: false, active: true });
  revalidatePath('/settings');
  return error ? { error: error.message } : { ok: true, token };
}

/** Approve a pending request: push it into Lodgify as a real no-payment booking. */
export async function approveRequest(requestId: string) {
  const supabase = supabaseAdmin();
  if (!supabase) return { error: 'Supabase not connected' };
  const { data: reqRow } = await supabase.from('booking_requests').select('*').eq('id', requestId).maybeSingle();
  if (!reqRow || reqRow.status !== 'pending') return { error: 'Request is no longer pending' };
  const prop = await resolveLinkedProperty(reqRow.property_id);
  if (!prop?.roomTypeId) return { error: 'Property not bookable' };
  try {
    const lodgifyId = await createBooking({
      propertyId: prop.lodgifyId,
      roomTypeId: prop.roomTypeId,
      arrival: reqRow.arrival,
      departure: reqRow.departure,
      adults: reqRow.adults,
      children: reqRow.children,
      infants: reqRow.infants,
      guestName: reqRow.guest_name,
      guestEmail: reqRow.guest_email,
      guestPhone: reqRow.guest_phone ?? undefined,
      status: 'Booked',
      sourceText: 'Decra private link — invoice directly (approved)',
      notes: reqRow.notes ?? undefined,
    });
    await supabase.from('booking_requests').update({ status: 'booked', lodgify_booking_id: lodgifyId }).eq('id', requestId);
    revalidatePath('/settings');
    return { ok: true };
  } catch (e) {
    await supabase.from('booking_requests').update({ status: 'failed', error: String(e).slice(0, 500) }).eq('id', requestId);
    revalidatePath('/settings');
    return { error: String(e).slice(0, 200) };
  }
}

export async function declineRequest(requestId: string) {
  const supabase = supabaseAdmin();
  if (!supabase) return { error: 'Supabase not connected' };
  const { error } = await supabase.from('booking_requests').update({ status: 'declined' }).eq('id', requestId).eq('status', 'pending');
  revalidatePath('/settings');
  return error ? { error: error.message } : { ok: true };
}
