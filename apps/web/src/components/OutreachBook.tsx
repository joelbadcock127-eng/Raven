'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { saveContact, markContacted, recordContactRevenue, deleteContact, type ContactInput } from '@/app/(admin)/outreach/actions';

export interface OutreachContact {
  id: string;
  organisation: string;
  category: string;
  contact_name: string | null;
  contact_role: string | null;
  email: string | null;
  phone: string | null;
  demand_trigger: string | null;
  booking_type: string | null;
  property_fit: string[];
  last_contact: string | null;
  next_follow_up: string | null;
  active_dates: string | null;
  negotiated_rate: string | null;
  previous_revenue: number;
  notes: string | null;
}

const CATEGORIES = [
  ['construction', 'Construction / infrastructure'],
  ['corporate', 'Corporate / training'],
  ['medical', 'Medical / locum'],
  ['events', 'Event organiser'],
  ['sport', 'Sporting body'],
  ['wedding', 'Wedding / celebrant / venue'],
  ['travel', 'Travel trade / agency'],
  ['other', 'Other'],
] as const;

const PROPERTIES = [
  ['annie-may', 'Annie May'],
  ['prescription-pad', 'Prescription Pad'],
  ['ten-fifty-bakers', 'Ten Fifty'],
] as const;

export default function OutreachBook({ contacts }: { contacts: OutreachContact[] }) {
  const [category, setCategory] = useState('all');
  const [editing, setEditing] = useState<OutreachContact | null | 'new'>(null);
  const [notice, setNotice] = useState('');
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const today = new Date().toISOString().slice(0, 10);
  const due = useMemo(
    () => contacts.filter((c) => c.next_follow_up && c.next_follow_up <= today),
    [contacts, today],
  );
  const visible = contacts.filter((c) => category === 'all' || c.category === category);

  const run = (fn: () => Promise<{ ok: boolean; message: string }>) =>
    startTransition(async () => {
      const res = await fn();
      setNotice(res.message);
      if (res.ok) {
        setEditing(null);
        router.refresh();
      }
    });

  const contacted = (c: OutreachContact) => {
    const next = window.prompt('Contacted today. Next follow-up date? (yyyy-mm-dd, blank for none)', '');
    if (next === null) return;
    run(() => markContacted(c.id, next || undefined));
  };

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      {/* due follow-ups */}
      {due.length > 0 && (
        <section className="card" style={{ padding: '16px 20px', background: '#fff9ec', borderColor: '#e8d9a0' }}>
          <div className="micro-cap" style={{ color: '#8a6410', marginBottom: 8 }}>Follow-ups due</div>
          <div style={{ display: 'grid', gap: 6 }}>
            {due.map((c) => (
              <div key={c.id} style={{ display: 'flex', gap: 10, alignItems: 'baseline', flexWrap: 'wrap' }}>
                <strong style={{ fontSize: 14, fontWeight: 500 }}>{c.organisation}</strong>
                <span className="caption" style={{ color: 'var(--ink-mute)' }}>
                  {c.demand_trigger ?? c.booking_type ?? c.category} · due {c.next_follow_up}
                </span>
                <span style={{ flex: 1 }} />
                {c.email && <a className="caption" href={`mailto:${c.email}`}>email ↗</a>}
                <button type="button" disabled={pending} className="pill-primary" style={{ fontSize: 11, padding: '4px 12px' }} onClick={() => contacted(c)}>
                  Mark contacted
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* toolbar */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        {[['all', `All (${contacts.length})`], ...CATEGORIES.map(([id, label]) => [id, label] as const)].map(([id, label]) => {
          const on = category === id;
          const count = id === 'all' ? contacts.length : contacts.filter((c) => c.category === id).length;
          if (id !== 'all' && count === 0) return null;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setCategory(id)}
              className="caption"
              style={{
                padding: '6px 12px',
                borderRadius: 'var(--r-pill)',
                cursor: 'pointer',
                border: '1px solid',
                borderColor: on ? 'var(--primary)' : 'var(--hairline)',
                background: on ? 'var(--primary)' : 'var(--canvas)',
                color: on ? 'var(--on-primary)' : 'var(--ink-secondary)',
              }}
            >
              {label}
            </button>
          );
        })}
        <span style={{ flex: 1 }} />
        {notice && <span className="caption">{notice}</span>}
        <button type="button" className="pill-primary" style={{ fontSize: 12, padding: '7px 14px' }} onClick={() => setEditing('new')}>
          + Add organisation
        </button>
      </div>

      {/* editor */}
      {editing !== null && (
        <ContactForm
          contact={editing === 'new' ? null : editing}
          pending={pending}
          onCancel={() => setEditing(null)}
          onSave={(input) => run(() => saveContact(editing === 'new' ? null : editing.id, input))}
        />
      )}

      {/* list */}
      {visible.length === 0 ? (
        <section className="card" style={{ padding: 28, maxWidth: 560 }}>
          <p className="caption">
            Nothing here yet. Add the organisations from the Annie May research spreadsheet:
            construction firms, locum agencies, event organisers, sports associations.
          </p>
        </section>
      ) : (
        <div style={{ display: 'grid', gap: 8 }}>
          {visible.map((c) => {
            const overdue = c.next_follow_up && c.next_follow_up <= today;
            return (
              <article key={c.id} className="card" style={{ padding: '14px 18px' }}>
                <div style={{ display: 'flex', gap: 10, alignItems: 'baseline', flexWrap: 'wrap' }}>
                  <strong style={{ fontSize: 14.5, fontWeight: 500 }}>{c.organisation}</strong>
                  <span className="micro-cap" style={{ background: 'var(--canvas-soft)', border: '1px solid var(--hairline)', borderRadius: 'var(--r-pill)', padding: '2px 8px', color: 'var(--ink-mute)' }}>
                    {CATEGORIES.find(([id]) => id === c.category)?.[1] ?? c.category}
                  </span>
                  {c.property_fit.map((p) => (
                    <span key={p} className="micro-cap" style={{ color: 'var(--primary-deep)' }}>
                      {PROPERTIES.find(([id]) => id === p)?.[1] ?? p}
                    </span>
                  ))}
                  <span style={{ flex: 1 }} />
                  {Number(c.previous_revenue) > 0 && (
                    <span className="caption tnum">${Number(c.previous_revenue).toFixed(0)} to date</span>
                  )}
                  {c.next_follow_up && (
                    <span className="caption tnum" style={{ color: overdue ? '#8a6410' : 'var(--ink-mute)' }}>
                      follow up {c.next_follow_up}
                    </span>
                  )}
                </div>
                <div className="caption" style={{ color: 'var(--ink-secondary)', marginTop: 4 }}>
                  {[
                    c.contact_name && `${c.contact_name}${c.contact_role ? ` (${c.contact_role})` : ''}`,
                    c.demand_trigger,
                    c.booking_type,
                    c.active_dates && `active: ${c.active_dates}`,
                    c.negotiated_rate && `rate: ${c.negotiated_rate}`,
                    c.last_contact && `last contact ${c.last_contact}`,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </div>
                {c.notes && <div className="caption" style={{ color: 'var(--ink-mute)', marginTop: 2 }}>{c.notes}</div>}
                <div style={{ display: 'flex', gap: 12, marginTop: 8, alignItems: 'center' }}>
                  {c.email && <a className="caption" href={`mailto:${c.email}`}>email ↗</a>}
                  {c.phone && <span className="caption tnum">{c.phone}</span>}
                  <button type="button" disabled={pending} className="caption" style={linkBtn} onClick={() => contacted(c)}>
                    mark contacted
                  </button>
                  <button
                    type="button"
                    className="caption"
                    style={linkBtn}
                    onClick={() => {
                      const rev = window.prompt('Revenue from this organisation so far (AUD)', String(c.previous_revenue));
                      if (rev !== null) run(() => recordContactRevenue(c.id, Number(rev) || 0));
                    }}
                  >
                    revenue
                  </button>
                  <button type="button" className="caption" style={linkBtn} onClick={() => setEditing(c)}>
                    edit
                  </button>
                  <button
                    type="button"
                    className="caption"
                    style={{ ...linkBtn, color: 'var(--ruby)', marginLeft: 'auto' }}
                    onClick={() => {
                      if (window.confirm(`Delete ${c.organisation}?`)) run(() => deleteContact(c.id));
                    }}
                  >
                    delete
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ContactForm({
  contact,
  pending,
  onSave,
  onCancel,
}: {
  contact: OutreachContact | null;
  pending: boolean;
  onSave: (input: ContactInput) => void;
  onCancel: () => void;
}) {
  return (
    <form
      className="card"
      style={{ padding: 20, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}
      onSubmit={(e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        onSave({
          organisation: String(f.get('organisation') ?? ''),
          category: String(f.get('category') ?? 'other'),
          contact_name: String(f.get('contact_name') ?? ''),
          contact_role: String(f.get('contact_role') ?? ''),
          email: String(f.get('email') ?? ''),
          phone: String(f.get('phone') ?? ''),
          demand_trigger: String(f.get('demand_trigger') ?? ''),
          booking_type: String(f.get('booking_type') ?? ''),
          property_fit: f.getAll('property_fit').map(String),
          next_follow_up: String(f.get('next_follow_up') ?? '') || null,
          active_dates: String(f.get('active_dates') ?? ''),
          negotiated_rate: String(f.get('negotiated_rate') ?? ''),
          notes: String(f.get('notes') ?? ''),
        });
      }}
    >
      <Field label="Organisation" grow>
        <input name="organisation" required defaultValue={contact?.organisation ?? ''} style={fieldStyle} />
      </Field>
      <Field label="Category">
        <select name="category" defaultValue={contact?.category ?? 'construction'} style={fieldStyle}>
          {CATEGORIES.map(([id, label]) => (
            <option key={id} value={id}>{label}</option>
          ))}
        </select>
      </Field>
      <Field label="Contact person">
        <input name="contact_name" defaultValue={contact?.contact_name ?? ''} style={fieldStyle} />
      </Field>
      <Field label="Role">
        <input name="contact_role" defaultValue={contact?.contact_role ?? ''} style={fieldStyle} />
      </Field>
      <Field label="Email">
        <input name="email" type="email" defaultValue={contact?.email ?? ''} style={fieldStyle} />
      </Field>
      <Field label="Phone">
        <input name="phone" defaultValue={contact?.phone ?? ''} style={fieldStyle} />
      </Field>
      <Field label="Demand trigger" grow>
        <input name="demand_trigger" placeholder="e.g. transmission project mobilisation, annual tournament" defaultValue={contact?.demand_trigger ?? ''} style={fieldStyle} />
      </Field>
      <Field label="Typical booking">
        <input name="booking_type" placeholder="e.g. weekday singles, team block" defaultValue={contact?.booking_type ?? ''} style={fieldStyle} />
      </Field>
      <Field label="Property fit">
        <span style={{ display: 'flex', gap: 10 }}>
          {PROPERTIES.map(([id, label]) => (
            <label key={id} className="caption" style={{ display: 'flex', gap: 4, alignItems: 'center', cursor: 'pointer' }}>
              <input type="checkbox" name="property_fit" value={id} defaultChecked={contact?.property_fit?.includes(id)} style={{ accentColor: 'var(--primary)' }} />
              {label}
            </label>
          ))}
        </span>
      </Field>
      <Field label="Next follow-up">
        <input name="next_follow_up" type="date" defaultValue={contact?.next_follow_up ?? ''} style={fieldStyle} />
      </Field>
      <Field label="Active dates">
        <input name="active_dates" placeholder="e.g. Mar-Nov 2027" defaultValue={contact?.active_dates ?? ''} style={fieldStyle} />
      </Field>
      <Field label="Negotiated rate">
        <input name="negotiated_rate" placeholder="e.g. $145/night weekday" defaultValue={contact?.negotiated_rate ?? ''} style={fieldStyle} />
      </Field>
      <Field label="Notes" grow>
        <input name="notes" defaultValue={contact?.notes ?? ''} style={fieldStyle} />
      </Field>
      <div style={{ display: 'flex', gap: 8 }}>
        <button type="button" className="caption" style={{ ...linkBtn, color: 'var(--ink-mute)' }} onClick={onCancel}>
          cancel
        </button>
        <button type="submit" disabled={pending} className="pill-primary" style={{ fontSize: 12, padding: '8px 18px' }}>
          {contact ? 'Save' : 'Add'}
        </button>
      </div>
    </form>
  );
}

const fieldStyle: React.CSSProperties = {
  border: '1px solid var(--hairline)',
  borderRadius: 8,
  padding: '8px 10px',
  fontSize: 13,
  background: 'var(--canvas)',
  color: 'var(--ink)',
  width: '100%',
};

const linkBtn: React.CSSProperties = {
  background: 'none',
  border: 'none',
  padding: 0,
  cursor: 'pointer',
  color: 'var(--primary)',
};

function Field({ label, grow, children }: { label: string; grow?: boolean; children: React.ReactNode }) {
  return (
    <label style={{ display: 'grid', gap: 4, flex: grow ? '1 1 240px' : '0 1 auto', minWidth: grow ? 240 : 140 }}>
      <span className="micro-cap" style={{ color: 'var(--ink-mute)' }}>{label}</span>
      {children}
    </label>
  );
}
