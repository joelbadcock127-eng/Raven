'use client';

import { useState } from 'react';

export default function CopyButton({ text, label = 'copy' }: { text: string; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className="caption"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setDone(true);
          setTimeout(() => setDone(false), 1500);
        } catch {
          /* clipboard may be blocked */
        }
      }}
      style={{ background: 'none', border: '1px solid var(--hairline)', borderRadius: 6, padding: '3px 10px', cursor: 'pointer', color: done ? '#2f9e63' : 'var(--ink-secondary)' }}
    >
      {done ? 'copied' : label}
    </button>
  );
}
