'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { sendGuestMessage } from '@/lib/lodgify';

export async function replyToGuest(formData: FormData) {
  const bookingId = Number(formData.get('bookingId'));
  const threadUid = String(formData.get('threadUid') ?? '') || null;
  const message = String(formData.get('message') ?? '').trim();
  if (!bookingId || !message) return;

  let error: string | null = null;
  try {
    await sendGuestMessage(bookingId, threadUid, message);
  } catch (err) {
    error = (err as Error).message;
  }
  revalidatePath('/inbox');
  const params = new URLSearchParams({ booking: String(bookingId) });
  if (error) params.set('sendError', error.slice(0, 200));
  else params.set('sent', '1');
  redirect(`/inbox?${params}`);
}
