'use client';

import { useEffect, useState } from 'react';

/**
 * Per-device show/hide switches for optional side-menu sections.
 *
 * Stored in localStorage; the Sidebar listens for the change event so the
 * menu updates without a reload. Hidden pages stay reachable by URL either
 * way — this only controls what the menu advertises.
 */

export const PMS_MENU_KEY = 'decra-pms-menu';
export const PMS_MENU_EVENT = 'decra:pms-menu';

/** Booking codes is opt-in: hidden until switched on in Settings. */
export const PROMO_MENU_KEY = 'decra-promo-menu';
export const PROMO_MENU_EVENT = 'decra:promo-menu';

export function pmsMenuVisible(): boolean {
  if (typeof window === 'undefined') return true;
  return window.localStorage.getItem(PMS_MENU_KEY) !== 'hidden';
}

export function promoMenuVisible(): boolean {
  if (typeof window === 'undefined') return false;
  return window.localStorage.getItem(PROMO_MENU_KEY) === 'shown';
}

function Switch({
  storageKey,
  event,
  defaultVisible,
}: {
  storageKey: string;
  event: string;
  defaultVisible: boolean;
}) {
  const [visible, setVisible] = useState(defaultVisible);

  useEffect(() => {
    const stored = window.localStorage.getItem(storageKey);
    setVisible(stored == null ? defaultVisible : stored === 'shown');
  }, [storageKey, defaultVisible]);

  const toggle = () => {
    const next = !visible;
    setVisible(next);
    window.localStorage.setItem(storageKey, next ? 'shown' : 'hidden');
    window.dispatchEvent(new Event(event));
  };

  return (
    <button
      type="button"
      role="switch"
      aria-checked={visible}
      onClick={toggle}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 10,
        border: 'none',
        background: 'transparent',
        cursor: 'pointer',
        padding: 0,
        font: 'inherit',
      }}
    >
      <span
        aria-hidden
        style={{
          width: 38,
          height: 22,
          borderRadius: 999,
          background: visible ? 'var(--primary-deep)' : 'var(--hairline)',
          position: 'relative',
          transition: 'background 0.15s',
          flexShrink: 0,
        }}
      >
        <span
          style={{
            position: 'absolute',
            top: 2,
            left: visible ? 18 : 2,
            width: 18,
            height: 18,
            borderRadius: '50%',
            background: '#fff',
            boxShadow: '0 1px 2px rgba(0,0,0,0.25)',
            transition: 'left 0.15s',
          }}
        />
      </span>
      <span className="caption">{visible ? 'Shown' : 'Hidden'}</span>
    </button>
  );
}

/** PMS section (Dashboard, Reservations, Calendar) — shown by default. */
export default function PmsMenuToggle() {
  return <Switch storageKey={PMS_MENU_KEY} event={PMS_MENU_EVENT} defaultVisible />;
}

/** Booking codes tab — hidden by default. */
export function PromoMenuToggle() {
  return <Switch storageKey={PROMO_MENU_KEY} event={PROMO_MENU_EVENT} defaultVisible={false} />;
}
