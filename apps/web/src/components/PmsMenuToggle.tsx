'use client';

import { useEffect, useState } from 'react';

/**
 * Show/hide the PMS section (Dashboard, Reservations, Inbox, Calendar) in the
 * side menu. Stored per device in localStorage; the Sidebar listens for the
 * change event so it updates without a reload. The pages themselves stay
 * reachable by URL either way.
 */
export const PMS_MENU_KEY = 'raven-pms-menu';
export const PMS_MENU_EVENT = 'raven:pms-menu';

export function pmsMenuVisible(): boolean {
  if (typeof window === 'undefined') return true;
  return window.localStorage.getItem(PMS_MENU_KEY) !== 'hidden';
}

export default function PmsMenuToggle() {
  const [visible, setVisible] = useState(true);
  useEffect(() => setVisible(pmsMenuVisible()), []);

  const toggle = () => {
    const next = !visible;
    setVisible(next);
    window.localStorage.setItem(PMS_MENU_KEY, next ? 'shown' : 'hidden');
    window.dispatchEvent(new Event(PMS_MENU_EVENT));
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
