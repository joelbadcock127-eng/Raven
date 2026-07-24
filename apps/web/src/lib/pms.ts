/**
 * Shared bits for the PMS tabs (Dashboard, Reservations, Inbox, Calendar).
 * All Lodgify data flows through lib/lodgify.ts server-side.
 */
import type { LodgifyBooking } from '@/lib/lodgify';

export const todayIso = () => new Date().toISOString().slice(0, 10);

export const isoPlusDays = (days: number, from = Date.now()) =>
  new Date(from + days * 86_400_000).toISOString().slice(0, 10);

export const fmtDate = (iso: string | null | undefined) =>
  iso
    ? new Date(iso.slice(0, 10) + 'T00:00:00').toLocaleDateString('en-AU', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : '—';

export const fmtShort = (iso: string | null | undefined) =>
  iso
    ? new Date(iso.slice(0, 10) + 'T00:00:00').toLocaleDateString('en-AU', {
        day: 'numeric',
        month: 'short',
      })
    : '—';

export const fmtMoney = (n: number | null, currency: string | null) =>
  n == null ? '—' : `${currency === 'AUD' || !currency ? 'A$' : currency + ' '}${n.toLocaleString('en-AU', { maximumFractionDigits: 0 })}`;

/** Lodgify-style status colours. */
export function statusStyle(status: string): { color: string; background: string } {
  switch (status.toLowerCase()) {
    case 'booked':
      return { color: '#b3261e', background: '#fdecea' };
    case 'open':
    case 'tentative':
      return { color: '#1e7d43', background: '#e7f5ec' };
    case 'declined':
    case 'closed':
      return { color: 'var(--ink-mute)', background: 'var(--canvas-soft)' };
    default:
      return { color: 'var(--ink-secondary)', background: 'var(--canvas-soft)' };
  }
}

/**
 * Confirmed stays only ("Booked") — enquiries and declined requests belong on
 * the Reservations list, not the operational dashboard. Arrivals/departures
 * are capped at the horizon so the tiles mean what they say.
 */
export function bucketStays(bookings: LodgifyBooking[], horizonDays = 30) {
  const today = todayIso();
  const horizon = isoPlusDays(horizonDays);
  const booked = bookings.filter((b) => b.status.toLowerCase() === 'booked');
  return {
    arrivals: booked
      .filter((b) => b.arrival >= today && b.arrival <= horizon)
      .sort((a, b) => a.arrival.localeCompare(b.arrival)),
    departures: booked
      .filter((b) => b.departure >= today && b.departure <= horizon && b.arrival < b.departure)
      .sort((a, b) => a.departure.localeCompare(b.departure)),
    staying: booked.filter((b) => b.arrival <= today && b.departure > today),
  };
}
