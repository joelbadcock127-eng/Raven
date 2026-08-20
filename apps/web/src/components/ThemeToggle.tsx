'use client';

import { useEffect, useState } from 'react';

/**
 * Light/dark toggle for the Decra admin. Stored per device; applied as
 * data-decra-theme on <html> by the admin layout's inline script on load
 * and live by this toggle. The property websites render outside the admin
 * layout and never get the attribute — they keep their own designs.
 */
export const THEME_KEY = 'decra-theme';

export function applyTheme(dark: boolean) {
  if (dark) document.documentElement.setAttribute('data-decra-theme', 'dark');
  else document.documentElement.removeAttribute('data-decra-theme');
}

export default function ThemeToggle() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    setDark(window.localStorage.getItem(THEME_KEY) === 'dark');
  }, []);

  const toggle = () => {
    const next = !dark;
    setDark(next);
    window.localStorage.setItem(THEME_KEY, next ? 'dark' : 'light');
    applyTheme(next);
  };

  return (
    <button
      type="button"
      role="switch"
      aria-checked={dark}
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
          background: dark ? 'var(--primary-deep)' : 'var(--hairline)',
          position: 'relative',
          transition: 'background 0.15s',
          flexShrink: 0,
        }}
      >
        <span
          style={{
            position: 'absolute',
            top: 3,
            left: dark ? 19 : 3,
            width: 16,
            height: 16,
            borderRadius: '50%',
            background: '#fff',
            transition: 'left 0.15s',
            boxShadow: 'rgba(0,0,0,0.25) 0 1px 2px',
          }}
        />
      </span>
      <span className="caption">{dark ? 'Dark' : 'Light'}</span>
    </button>
  );
}
