'use client';

import { useState, useTransition } from 'react';
import { approveOpportunityFor, setOpportunityStatus } from '@/app/(admin)/actions';

/**
 * The Campaigns page's opening move: one line per property — the strongest
 * open opportunity from the feed — with approve/deny inline. Approving
 * opens a campaign for THAT property; denying dismisses the opportunity.
 */
export interface BestBet {
  opportunityId: string;
  propertyId: string;
  propertyName: string;
  line: string;
}

const btn: React.CSSProperties = {
  padding: '5px 14px',
  borderRadius: 999,
  border: '1px solid var(--hairline)',
  background: 'transparent',
  cursor: 'pointer',
  font: 'inherit',
  fontSize: 12.5,
};

export default function BestBets({ bets }: { bets: BestBet[] }) {
  const [done, setDone] = useState<Record<string, string>>({});
  const [pending, start] = useTransition();
  if (bets.length === 0) return null;

  const act = (b: BestBet, approve: boolean) =>
    start(async () => {
      const res = approve
        ? await approveOpportunityFor(b.opportunityId, b.propertyId)
        : await setOpportunityStatus(b.opportunityId, 'dismissed');
      setDone((d) => ({ ...d, [`${b.opportunityId}:${b.propertyId}`]: res.message }));
    });

  return (
    <section className="card" style={{ padding: '18px 22px', marginBottom: 24 }}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'baseline', marginBottom: 6 }}>
        <h2 className="heading-md" style={{ fontSize: 16 }}>Best bets right now</h2>
        <span className="caption" style={{ color: 'var(--ink-mute)' }}>
          the strongest open opportunity for each property — approve to open a campaign
        </span>
      </div>
      {bets.map((b) => {
        const key = `${b.opportunityId}:${b.propertyId}`;
        const result = done[key];
        return (
          <div
            key={key}
            style={{
              display: 'flex',
              gap: 12,
              alignItems: 'center',
              padding: '10px 0',
              borderTop: '1px solid var(--hairline)',
            }}
          >
            <span className="micro-cap" style={{ minWidth: 150, color: 'var(--primary-deep)' }}>
              {b.propertyName}
            </span>
            <span
              className="caption"
              style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
              title={b.line}
            >
              {b.line}
            </span>
            {result ? (
              <span className="micro-cap" style={{ color: 'var(--ink-mute)' }}>{result}</span>
            ) : (
              <span style={{ display: 'flex', gap: 8 }}>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => act(b, true)}
                  style={{ ...btn, borderColor: 'var(--primary-subdued)', color: 'var(--primary-deep)' }}
                >
                  Approve
                </button>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => act(b, false)}
                  style={{ ...btn, color: 'var(--ink-mute)' }}
                >
                  Deny
                </button>
              </span>
            )}
          </div>
        );
      })}
    </section>
  );
}
