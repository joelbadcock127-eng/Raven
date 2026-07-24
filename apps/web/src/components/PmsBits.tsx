/**
 * Small presentational pieces shared by the PMS tabs (server-renderable).
 * SourceLogo mirrors Lodgify's channel icons: Airbnb bélo red, Booking.com
 * blue, Vrbo navy, everything else a neutral direct-booking globe.
 */

export function SourceLogo({ source, size = 16 }: { source: string | null; size?: number }) {
  const s = (source ?? '').toLowerCase();
  const box: React.CSSProperties = {
    width: size,
    height: size,
    borderRadius: size / 4,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  };

  if (s.includes('airbnb')) {
    return (
      <span title="Airbnb" aria-label="Airbnb" style={box}>
        <svg viewBox="0 0 24 24" width={size} height={size}>
          <path
            fill="#FF385C"
            d="M12 3.2c1.1 0 2 .6 2.6 1.8 1.7 3.3 3.3 6.6 4.8 10 .8 1.9-.5 4-2.5 4.2-1 .1-2-.4-3-1.3L12 16l-1.9 1.9c-1 .9-2 1.4-3 1.3-2-.2-3.3-2.3-2.5-4.2 1.5-3.4 3.1-6.7 4.8-10C10 3.8 10.9 3.2 12 3.2z"
          />
          <path
            fill="#fff"
            d="M12 8.9c1.3 0 2.3 1 2.3 2.3 0 1.5-1.1 3-2.3 4.3-1.2-1.3-2.3-2.8-2.3-4.3 0-1.3 1-2.3 2.3-2.3z"
          />
        </svg>
      </span>
    );
  }
  if (s.includes('booking')) {
    return (
      <span title="Booking.com" aria-label="Booking.com" style={{ ...box, background: '#003580', color: '#fff', fontSize: size * 0.62, fontWeight: 700, fontFamily: 'system-ui' }}>
        B.
      </span>
    );
  }
  if (s.includes('vrbo') || s.includes('homeaway') || s.includes('expedia')) {
    return (
      <span title="Vrbo" aria-label="Vrbo" style={{ ...box, background: '#245ABC', color: '#fff', fontSize: size * 0.66, fontWeight: 700, fontFamily: 'system-ui' }}>
        V
      </span>
    );
  }
  return (
    <span title={source ?? 'Direct'} aria-label={source ?? 'Direct'} style={{ ...box, color: 'var(--ink-mute)' }}>
      <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <circle cx="12" cy="12" r="9" />
        <path d="M3 12h18M12 3c2.5 2.6 3.8 5.7 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.7-3.8-9S9.5 5.6 12 3z" />
      </svg>
    </span>
  );
}

/** Property photo thumbnail with a soft placeholder when Lodgify has none. */
export function PropertyThumb({
  url,
  name,
  size = 44,
}: {
  url: string | null | undefined;
  name: string;
  size?: number;
}) {
  const style: React.CSSProperties = {
    width: size,
    height: size,
    borderRadius: 10,
    objectFit: 'cover',
    flexShrink: 0,
    background: 'var(--canvas-soft)',
    border: '1px solid var(--hairline)',
  };
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt={name} style={style} />;
  }
  return (
    <span
      aria-hidden
      style={{ ...style, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ink-mute)', fontSize: size * 0.4, fontWeight: 500 }}
    >
      {name.trim().charAt(0).toUpperCase() || '·'}
    </span>
  );
}
