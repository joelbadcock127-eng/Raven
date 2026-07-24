import { redirect } from 'next/navigation';

/** Inbox merged into Reservations — keep old links working. */
export default async function InboxRedirect({
  searchParams,
}: {
  searchParams: Promise<{ booking?: string }>;
}) {
  const { booking } = await searchParams;
  redirect(booking ? `/reservations?booking=${booking}` : '/reservations');
}
