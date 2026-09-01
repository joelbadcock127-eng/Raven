'use client';

import { useState, useTransition } from 'react';
import { setLinkApproval, setLinkActive, createLink, approveRequest, declineRequest, markRequestBooked } from '@/app/(admin)/settings/actions';

/**
 * Settings card for private no-payment booking links: the tokenized pages
 * a trusted guest uses to book dates straight into Lodgify, invoiced
 * outside it. Approval mode holds submissions here until acted on.
 */

export interface LinkRow {
  id: string;
  token: string;
  property_id: string;
  label: string;
  require_approval: boolean;
  active: boolean;
}

export interface RequestRow {
  id: string;
  property_id: string;
  arrival: string;
  departure: string;
  adults: number;
  children: number;
  infants: number;
  guest_name: string;
  guest_email: string;
  notes: string | null;
  status: string;
  lodgify_booking_id: number | null;
  error: string | null;
  created_at: string;
}

const PROPERTY_NAMES: Record<string, string> = {
  'ten-fifty-bakers': 'Ten Fifty Bakers',
  'prescription-pad': 'The Prescription Pad',
};

export default function PrivateBookingLinks({ links, requests, origin }: { links: LinkRow[]; requests: RequestRow[]; origin: string }) {
  const [pending, start] = useTransition();
  const [copied, setCopied] = useState('');
  const [msg, setMsg] = useState('');

  const linkUrl = (l: LinkRow) => {
    const domain = l.property_id === 'ten-fifty-bakers' ? 'https://tenfiftybakers.com.au' : origin;
    return `${domain}/book/${l.token}`;
  };

  const copy = (l: LinkRow) => {
    navigator.clipboard.writeText(linkUrl(l)).then(() => {
      setCopied(l.id);
      setTimeout(() => setCopied(''), 1600);
    });
  };

  const act = (fn: () => Promise<{ error?: string }>) =>
    start(async () => {
      const r = await fn();
      setMsg(r.error ?? '');
    });

  const pendingReqs = requests.filter((r) => r.status === 'pending');
  const recent = requests.filter((r) => r.status !== 'pending').slice(0, 6);

  return (
    <section className="card" style={{ padding: '22px 24px', maxWidth: 720, marginBottom: 24 }}>
      <h2 className="heading-md" style={{ marginBottom: 4 }}>Private booking links</h2>
      <p className="caption" style={{ color: 'var(--ink-mute)', marginBottom: 16 }}>
        A tokenized page where a trusted guest picks available dates and books them with no payment —
        the booking lands in Lodgify as confirmed (blocking the dates everywhere) and you invoice
        directly. Approval mode holds their requests here instead of booking straight through.
      </p>

      {links.map((l) => (
        <div key={l.id} style={{ borderTop: '1px solid var(--hairline)', padding: '14px 0', display: 'grid', gap: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: 600 }}>{PROPERTY_NAMES[l.property_id] ?? l.property_id}</div>
              <div className="caption" style={{ color: 'var(--ink-mute)' }}>{l.label}</div>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <button className="caption" disabled={pending} onClick={() => act(() => setLinkApproval(l.id, !l.require_approval))} style={btnStyle}>
                {l.require_approval ? 'Approval: required' : 'Approval: straight through'}
              </button>
              <button className="caption" disabled={pending} onClick={() => act(() => setLinkActive(l.id, !l.active))} style={btnStyle}>
                {l.active ? 'Active' : 'Disabled'}
              </button>
              <button className="caption" onClick={() => copy(l)} style={{ ...btnStyle, background: 'var(--primary-deep)', color: '#fff', borderColor: 'transparent' }}>
                {copied === l.id ? 'Copied ✓' : 'Copy link'}
              </button>
            </div>
          </div>
          <code className="caption" style={{ color: 'var(--ink-mute)', wordBreak: 'break-all' }}>{linkUrl(l)}</code>
        </div>
      ))}

      <div style={{ borderTop: '1px solid var(--hairline)', paddingTop: 14, display: 'flex', gap: 8 }}>
        <button className="caption" disabled={pending} onClick={() => act(() => createLink('ten-fifty-bakers', 'Private guest — invoice directly'))} style={btnStyle}>
          + New Ten Fifty link
        </button>
        <button className="caption" disabled={pending} onClick={() => act(() => createLink('prescription-pad', 'Private guest — invoice directly'))} style={btnStyle}>
          + New Prescription Pad link
        </button>
      </div>

      {pendingReqs.length > 0 && (
        <div style={{ marginTop: 18 }}>
          <h3 className="heading-sm" style={{ marginBottom: 8 }}>Needs your action</h3>
          {pendingReqs.map((r) => {
            const nights = Math.round((Date.parse(r.departure) - Date.parse(r.arrival)) / 86_400_000);
            const singleNight = nights === 1;
            return (
              <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', alignItems: 'center', padding: '10px 0', borderTop: '1px solid var(--hairline)' }}>
                <div className="caption">
                  <strong>{r.guest_name}</strong> · {r.arrival} → {r.departure} · {nights} night{nights === 1 ? '' : 's'} · {r.adults + r.children} guest{r.adults + r.children === 1 ? '' : 's'}
                  {singleNight && (
                    <div style={{ color: 'var(--ink-mute)', marginTop: 2 }}>
                      Single night — Lodgify&apos;s API refuses these (2-night minimum). Add it manually in the
                      Lodgify calendar, then mark it booked here.
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {singleNight ? (
                    <button className="caption" disabled={pending} onClick={() => act(() => markRequestBooked(r.id))} style={{ ...btnStyle, background: 'var(--primary-deep)', color: '#fff', borderColor: 'transparent' }}>
                      Added in Lodgify ✓
                    </button>
                  ) : (
                    <button className="caption" disabled={pending} onClick={() => act(() => approveRequest(r.id))} style={{ ...btnStyle, background: 'var(--primary-deep)', color: '#fff', borderColor: 'transparent' }}>
                      Approve → book
                    </button>
                  )}
                  <button className="caption" disabled={pending} onClick={() => act(() => declineRequest(r.id))} style={btnStyle}>Decline</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {recent.length > 0 && (
        <div style={{ marginTop: 18 }}>
          <h3 className="heading-sm" style={{ marginBottom: 8 }}>Recent private bookings</h3>
          {recent.map((r) => (
            <div key={r.id} className="caption" style={{ padding: '8px 0', borderTop: '1px solid var(--hairline)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                <span><strong>{r.guest_name}</strong> · {r.arrival} → {r.departure} · {PROPERTY_NAMES[r.property_id] ?? r.property_id}</span>
                <span style={{ color: r.status === 'booked' ? 'var(--primary-deep)' : r.status === 'failed' ? '#a33' : 'var(--ink-mute)' }}>
                  {r.status === 'booked' ? `booked${r.lodgify_booking_id ? ` #${r.lodgify_booking_id}` : ''} — invoice directly` : r.status}
                </span>
              </div>
              {r.notes && <div style={{ color: 'var(--ink-mute)', marginTop: 2 }}>{r.notes}</div>}
            </div>
          ))}
        </div>
      )}

      {msg && <p className="caption" style={{ color: '#a33', marginTop: 10 }}>{msg}</p>}
    </section>
  );
}

const btnStyle: React.CSSProperties = {
  border: '1px solid var(--hairline)',
  background: 'transparent',
  borderRadius: 8,
  padding: '6px 12px',
  cursor: 'pointer',
  font: 'inherit',
};
