'use client';

import { useRef, useState } from 'react';
import { createUploadUrl, registerAsset } from '@/app/(admin)/media/actions';

const PROPERTIES = [
  { id: 'ten-fifty-bakers', short: 'Ten Fifty', name: 'Ten Fifty Bakers' },
  { id: 'prescription-pad', short: 'Rx Pad', name: 'The Prescription Pad' },
  { id: 'annie-may', short: 'Annie May', name: 'Annie May' },
];

interface QueueItem {
  name: string;
  status: 'uploading' | 'done' | 'error';
  detail?: string;
}

export default function PhoneUpload() {
  const [property, setProperty] = useState('ten-fifty-bakers');
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [busy, setBusy] = useState(false);
  const cameraInput = useRef<HTMLInputElement>(null);
  const libraryInput = useRef<HTMLInputElement>(null);

  const setItem = (name: string, patch: Partial<QueueItem>) =>
    setQueue((q) => q.map((i) => (i.name === name ? { ...i, ...patch } : i)));

  async function handleFiles(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true);
    for (const file of [...files]) {
      setQueue((q) => [{ name: file.name, status: 'uploading' as const }, ...q]);
      try {
        const ticket = await createUploadUrl(file.name, file.type);
        if (!ticket.ok || !ticket.signedUrl) throw new Error(ticket.message ?? 'no upload URL');
        const put = await fetch(ticket.signedUrl, {
          method: 'PUT',
          headers: { 'content-type': file.type || 'application/octet-stream' },
          body: file,
        });
        if (!put.ok) throw new Error(`upload failed (${put.status})`);
        const reg = await registerAsset({
          propertyId: property,
          provider: ticket.provider,
          storagePath: ticket.storagePath!,
          publicUrl: ticket.publicUrl!,
          fileName: file.name,
          mimeType: file.type,
          sizeBytes: file.size,
        });
        if (!reg.ok) throw new Error(reg.message ?? 'could not register');
        setItem(file.name, { status: 'done' });
      } catch (err) {
        setItem(file.name, { status: 'error', detail: (err as Error).message });
      }
    }
    setBusy(false);
    if (cameraInput.current) cameraInput.current.value = '';
    if (libraryInput.current) libraryInput.current.value = '';
  }

  return (
    <main
      style={{
        minHeight: '100dvh',
        background: 'var(--canvas-soft)',
        display: 'flex',
        flexDirection: 'column',
        padding: '20px 16px calc(24px + env(safe-area-inset-bottom))',
        maxWidth: 480,
        margin: '0 auto',
      }}
    >
      <header style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 20 }}>
        <span className="heading-md" style={{ fontWeight: 500 }}>Raven</span>
        <span className="caption">quick upload</span>
        <a href="/" className="caption" style={{ marginLeft: 'auto' }}>Open app</a>
      </header>

      {/* property picker */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 20 }}>
        {PROPERTIES.map((p) => {
          const on = property === p.id;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => setProperty(p.id)}
              style={{
                padding: '14px 6px',
                borderRadius: 'var(--r-lg)',
                fontSize: 14,
                fontWeight: on ? 500 : 400,
                border: `2px solid ${on ? 'var(--primary)' : 'var(--hairline)'}`,
                background: on ? 'var(--primary)' : 'var(--canvas)',
                color: on ? '#fff' : 'var(--ink-secondary)',
              }}
            >
              {p.short}
            </button>
          );
        })}
      </div>

      {/* the two big actions */}
      <button
        type="button"
        onClick={() => cameraInput.current?.click()}
        style={{
          width: '100%',
          padding: '22px',
          fontSize: 17,
          fontWeight: 500,
          borderRadius: 18,
          border: 'none',
          color: '#fff',
          background: 'linear-gradient(140deg, var(--primary-soft), var(--primary) 55%, var(--primary-deep))',
          boxShadow: '0 8px 24px rgba(83, 58, 253, 0.35)',
          marginBottom: 12,
          cursor: 'pointer',
        }}
      >
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10, justifyContent: 'center' }}>
          <svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z" />
            <circle cx="12" cy="13.5" r="3.5" />
          </svg>
          Shoot now
        </span>
      </button>
      <button
        type="button"
        onClick={() => libraryInput.current?.click()}
        style={{
          width: '100%',
          padding: '22px',
          fontSize: 17,
          fontWeight: 500,
          borderRadius: 18,
          border: '1.5px solid var(--primary-subdued)',
          background: 'var(--canvas)',
          color: 'var(--primary-deep)',
          boxShadow: 'var(--shadow-1)',
          marginBottom: 20,
          cursor: 'pointer',
        }}
      >
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10, justifyContent: 'center' }}>
          <svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="5" width="18" height="14" rx="2.5" />
            <circle cx="8.5" cy="10" r="1.6" />
            <path d="M21 15.5l-4.8-4.8L6 21" />
          </svg>
          From camera roll
        </span>
      </button>

      <input
        ref={cameraInput}
        type="file"
        accept="image/*,video/*"
        capture="environment"
        hidden
        onChange={(e) => handleFiles(e.target.files)}
      />
      <input
        ref={libraryInput}
        type="file"
        accept="image/*,video/*"
        multiple
        hidden
        onChange={(e) => handleFiles(e.target.files)}
      />

      {/* upload queue */}
      <div style={{ display: 'grid', gap: 8, flex: 1 }}>
        {queue.map((i, idx) => (
          <div
            key={`${i.name}-${idx}`}
            className="card"
            style={{ padding: '12px 14px', display: 'flex', gap: 10, alignItems: 'center' }}
          >
            <span
              aria-hidden
              style={{
                width: 22,
                height: 22,
                flexShrink: 0,
                borderRadius: '50%',
                display: 'grid',
                placeItems: 'center',
                color: '#fff',
                background:
                  i.status === 'uploading'
                    ? 'var(--primary-soft)'
                    : i.status === 'done'
                      ? '#2f9e63'
                      : 'var(--ruby)',
              }}
            >
              {i.status === 'uploading' ? (
                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
                  <path d="M12 5v7l4 3" />
                </svg>
              ) : i.status === 'done' ? (
                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 13l4.5 4.5L19 8" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round">
                  <path d="M12 6v7M12 17.5v.1" />
                </svg>
              )}
            </span>
            <div style={{ minWidth: 0 }}>
              <div className="caption" style={{ color: 'var(--ink-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {i.name}
              </div>
              {i.detail && <div className="caption" style={{ color: 'var(--ruby)' }}>{i.detail}</div>}
            </div>
          </div>
        ))}
        {queue.length === 0 && (
          <p className="caption" style={{ textAlign: 'center', marginTop: 24 }}>
            Uploads go to the {PROPERTIES.find((p) => p.id === property)?.name} library.
            <br />
            Tip: Share → “Add to Home Screen” makes this an app.
            <br />
            Want “Send to Raven” in the iOS share sheet? <a href="/u/shortcut">Set up the shortcut →</a>
          </p>
        )}
      </div>

      {busy && <p className="caption" style={{ textAlign: 'center' }}>Keep this open until ticks appear…</p>}
    </main>
  );
}
