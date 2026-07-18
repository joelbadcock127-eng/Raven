'use client';

import { useEffect, useState } from 'react';

/**
 * Step-by-step guide to building the "Send to Raven" iOS Shortcut —
 * the only way a web app can appear in the iOS share sheet. URLs are
 * pre-filled with this deployment's origin; the owner pastes their
 * RAVEN_UPLOAD_TOKEN where marked.
 */

const PROPERTIES = [
  { id: 'ten-fifty-bakers', name: 'Ten Fifty Bakers' },
  { id: 'prescription-pad', name: 'The Prescription Pad' },
  { id: 'annie-may', name: 'Annie May' },
];

function CopyRow({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div style={{ display: 'grid', gap: 4, marginBottom: 10 }}>
      <span className="micro-cap" style={{ color: 'var(--ink-mute)' }}>{label}</span>
      <div style={{ display: 'flex', gap: 8, alignItems: 'stretch' }}>
        <code
          style={{
            flex: 1,
            minWidth: 0,
            fontSize: 11,
            lineHeight: 1.5,
            padding: '8px 10px',
            background: 'var(--canvas-soft)',
            border: '1px solid var(--hairline)',
            borderRadius: 8,
            wordBreak: 'break-all',
            whiteSpace: 'normal',
          }}
        >
          {value}
        </code>
        <button
          type="button"
          className="pill-primary"
          style={{ fontSize: 12, padding: '6px 12px', flexShrink: 0 }}
          onClick={async () => {
            await navigator.clipboard.writeText(value);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
        >
          {copied ? '✓' : 'copy'}
        </button>
      </div>
    </div>
  );
}

export default function ShortcutGuide() {
  const [origin, setOrigin] = useState('https://YOUR-APP.vercel.app');
  const [property, setProperty] = useState('ten-fifty-bakers');
  useEffect(() => setOrigin(window.location.origin), []);

  const step1Url = `${origin}/api/ingest?token=PASTE-TOKEN-HERE&name=[Name]&type=[Type]&property=${property}`;
  const registerUrl = `${origin}/api/ingest`;

  return (
    <main style={{ minHeight: '100dvh', background: 'var(--canvas-soft)', padding: '16px 16px 60px', maxWidth: 560, margin: '0 auto', overflowX: 'hidden' }}>
      <a
        href="/u"
        className="caption"
        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 0', marginBottom: 4 }}
      >
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M15 18l-6-6 6-6" />
        </svg>
        Back to upload
      </a>
      <header style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 8 }}>
        <span className="heading-md" style={{ fontWeight: 500 }}>Raven</span>
        <span className="caption">share-sheet shortcut</span>
      </header>
      <p className="caption" style={{ marginBottom: 20 }}>
        iOS only shows App Store apps and <strong>Shortcuts</strong> in the share sheet — a
        home-screen web app can&apos;t appear there. This one-time setup (~3 minutes) adds
        &quot;Send to Raven&quot; so you can share any photo or video straight from Photos or the
        Camera. You&apos;ll need the upload token (ask whoever set up Vercel for
        <code> RAVEN_UPLOAD_TOKEN</code>).
      </p>

      <div className="card" style={{ padding: 16, marginBottom: 16 }}>
        <span className="micro-cap" style={{ color: 'var(--ink-mute)' }}>Property for this shortcut</span>
        <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
          {PROPERTIES.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setProperty(p.id)}
              className="pill-primary"
              style={{
                fontSize: 12,
                padding: '6px 12px',
                background: property === p.id ? 'var(--primary)' : 'var(--canvas)',
                color: property === p.id ? '#fff' : 'var(--ink-secondary)',
                border: `1px solid ${property === p.id ? 'var(--primary)' : 'var(--hairline)'}`,
              }}
            >
              {p.name}
            </button>
          ))}
        </div>
        <p className="caption" style={{ marginTop: 8 }}>
          Repeat the steps per property so the share sheet offers &quot;Send to Ten Fifty&quot;,
          &quot;Send to Annie May&quot;, etc.
        </p>
      </div>

      <ol style={{ display: 'grid', gap: 14, margin: '0 0 24px 18px' }}>
        <li>
          Open the <strong>Shortcuts</strong> app → <strong>+</strong> to create a new shortcut.
          Tap the <strong>ⓘ</strong> (or the name at the top) → turn on{' '}
          <strong>Show in Share Sheet</strong> → under Share Sheet Types keep{' '}
          <strong>Images</strong> and <strong>Media</strong>.
        </li>
        <li>
          Add action <strong>Get Contents of URL</strong>. Paste this URL, replacing{' '}
          <code>PASTE-TOKEN-HERE</code> with the token, and — important — replace{' '}
          <code>[Name]</code> and <code>[Type]</code> by tapping the blue variable suggestions:
          select <strong>Shortcut Input → Name</strong> and <strong>Shortcut Input → Type</strong>.
          Method stays <strong>GET</strong>.
          <CopyRow label="Step 2 URL" value={step1Url} />
        </li>
        <li>
          Add <strong>Get Dictionary Value</strong> → key <code>uploadUrl</code> (from the previous
          result).
        </li>
        <li>
          Add another <strong>Get Contents of URL</strong> → URL = the{' '}
          <code>Dictionary Value</code> variable. Expand <strong>Show More</strong>: Method{' '}
          <strong>PUT</strong>, Request Body <strong>File</strong> → choose{' '}
          <strong>Shortcut Input</strong>.
        </li>
        <li>
          Add <strong>Get Dictionary Value</strong> twice more against the step-2 result: keys{' '}
          <code>storagePath</code> and <code>publicUrl</code>.
        </li>
        <li>
          Add a final <strong>Get Contents of URL</strong> → this URL, Method <strong>POST</strong>,
          Request Body <strong>JSON</strong>, with fields: <code>token</code> (the token),{' '}
          <code>provider</code> = <code>r2</code>, <code>storagePath</code> and{' '}
          <code>publicUrl</code> (the two dictionary values), <code>fileName</code> ={' '}
          <strong>Shortcut Input → Name</strong>, <code>mimeType</code> ={' '}
          <strong>Shortcut Input → Type</strong>, <code>property</code> ={' '}
          <code>{property}</code>.
          <CopyRow label="Step 6 URL" value={registerUrl} />
        </li>
        <li>
          Name it <strong>Send to Raven ({PROPERTIES.find((p) => p.id === property)?.name})</strong>{' '}
          and tap Done. Now: Photos → any photo/video → Share → scroll the actions list → Send to
          Raven.
        </li>
      </ol>

      <p className="caption">
        Prefer the simpler path? Open <a href="/u">the quick-upload page</a> and use{' '}
        <strong>From camera roll</strong> — same result, two taps more.
      </p>
    </main>
  );
}
