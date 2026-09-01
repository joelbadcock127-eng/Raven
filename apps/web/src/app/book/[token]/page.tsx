import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getBookingLink, resolveLinkedProperty } from '@/lib/privateBooking';
import BookingFlow from './BookingFlow';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Book your stay',
  robots: { index: false, follow: false },
};

/**
 * Private no-payment booking page. Reached only by its token — never
 * linked from the sites, never indexed. Look and feel mirror the Lodgify
 * checkout the owner's guests already know, minus the payment step.
 */
export default async function PrivateBookingPage(ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;
  const link = await getBookingLink(token);
  if (!link) notFound();
  const prop = await resolveLinkedProperty(link.property_id);
  if (!prop) notFound();

  return (
    <BookingFlow
      token={link.token}
      propertyName={prop.name}
      imageUrl={prop.imageUrl}
      requireApproval={link.require_approval}
      defaultRoomConfig={link.default_room_config ?? '3 twins, 1 king, 1 double'}
    />
  );
}
