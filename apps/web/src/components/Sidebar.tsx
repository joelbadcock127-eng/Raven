'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

/** Minimal stroke icons (24×24 viewBox, stroke = currentColor). */
const Icon = {
  feed: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12h4l3-8 4 16 3-8h4" />
    </svg>
  ),
  campaigns: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 11l17-7-7 17-2.5-7.5L3 11z" />
    </svg>
  ),
  sites: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3c2.5 2.6 3.8 5.7 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.7-3.8-9S9.5 5.6 12 3z" />
    </svg>
  ),
  media: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="5" width="18" height="14" rx="2.5" />
      <circle cx="8.5" cy="10" r="1.6" />
      <path d="M21 15.5l-4.8-4.8L6 21" />
    </svg>
  ),
  social: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.8 8.6a5 5 0 0 0-8.8-3.2A5 5 0 0 0 3.2 8.6c0 5 8.8 10.4 8.8 10.4s8.8-5.4 8.8-10.4z" />
    </svg>
  ),
  analytics: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
    </svg>
  ),
  upload: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 5v14M5 12h14" />
    </svg>
  ),
  outreach: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3.5 20c.7-3.4 2.8-5 5.5-5s4.8 1.6 5.5 5M16 4.5c1.7.6 2.8 2 2.8 3.9s-1.1 3.3-2.8 3.9M17.5 15.2c2 .7 3.2 2.3 3.6 4.8" />
    </svg>
  ),
  dashboard: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="8" height="8" rx="1.5" />
      <rect x="13" y="3" width="8" height="5" rx="1.5" />
      <rect x="13" y="10" width="8" height="11" rx="1.5" />
      <rect x="3" y="13" width="8" height="8" rx="1.5" />
    </svg>
  ),
  reservations: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="5" width="18" height="14" rx="2.5" />
      <path d="M3 10h18M8 15h5" />
    </svg>
  ),
  inbox: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12a8 8 0 0 1-8 8H4l2.2-2.6A8 8 0 1 1 21 12z" />
      <path d="M8.5 11h7M8.5 14h4.5" />
    </svg>
  ),
  calendar: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="5" width="18" height="16" rx="2.5" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </svg>
  ),
};

/** PMS tabs — the Lodgify features (dashboard, reservations, messaging, calendar). */
const PMS_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: Icon.dashboard },
  { href: '/reservations', label: 'Reservations', icon: Icon.reservations },
  { href: '/inbox', label: 'Inbox', icon: Icon.inbox },
  { href: '/calendar', label: 'Calendar', icon: Icon.calendar },
];

const ITEMS = [
  { href: '/', label: 'Feed', icon: Icon.feed },
  { href: '/campaigns', label: 'Campaigns', icon: Icon.campaigns },
  { href: '/outreach', label: 'Outreach', icon: Icon.outreach },
  { href: '/sites', label: 'Sites', icon: Icon.sites },
  { href: '/media', label: 'Media', icon: Icon.media },
  { href: '/social', label: 'Social', icon: Icon.social },
  { href: '/analytics', label: 'Analytics', icon: Icon.analytics },
];

function isActive(pathname: string, href: string): boolean {
  return href === '/' ? pathname === '/' : pathname.startsWith(href);
}

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <>
      {/* ── Desktop rail ── */}
      <aside
        className="sidebar-desktop"
        style={{
          width: 200,
          flexShrink: 0,
          position: 'sticky',
          top: 0,
          alignSelf: 'flex-start',
          height: '100vh',
          padding: '28px 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
          borderRight: '1px solid var(--hairline)',
          background: 'var(--canvas)',
        }}
      >
        <div className="heading-md" style={{ fontWeight: 400, letterSpacing: '-0.4px', padding: '0 12px 20px' }}>
          Raven
        </div>
        {PMS_ITEMS.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '9px 12px',
                borderRadius: 'var(--r-md)',
                fontSize: 14,
                color: active ? 'var(--primary-deep)' : 'var(--ink-secondary)',
                background: active ? 'var(--canvas-soft)' : 'transparent',
                fontWeight: active ? 500 : 400,
                border: active ? '1px solid var(--hairline)' : '1px solid transparent',
              }}
            >
              <span aria-hidden style={{ width: 18, height: 18, opacity: 0.8, display: 'inline-flex' }}>
                {item.icon}
              </span>
              {item.label}
            </Link>
          );
        })}
        <div aria-hidden style={{ height: 1, background: 'var(--hairline)', margin: '10px 12px' }} />
        {ITEMS.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '9px 12px',
                borderRadius: 'var(--r-md)',
                fontSize: 14,
                color: active ? 'var(--primary-deep)' : 'var(--ink-secondary)',
                background: active ? 'var(--canvas-soft)' : 'transparent',
                fontWeight: active ? 500 : 400,
                border: active ? '1px solid var(--hairline)' : '1px solid transparent',
              }}
            >
              <span aria-hidden style={{ width: 18, height: 18, opacity: 0.8, display: 'inline-flex' }}>
                {item.icon}
              </span>
              {item.label}
            </Link>
          );
        })}
        <div style={{ marginTop: 'auto', display: 'grid', gap: 4 }}>
          <Link
            href="/settings"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '9px 12px',
              borderRadius: 'var(--r-md)',
              fontSize: 14,
              color: pathname.startsWith('/settings') ? 'var(--primary-deep)' : 'var(--ink-secondary)',
              background: pathname.startsWith('/settings') ? 'var(--canvas-soft)' : 'transparent',
              border: pathname.startsWith('/settings') ? '1px solid var(--hairline)' : '1px solid transparent',
            }}
          >
            <span aria-hidden style={{ width: 18, height: 18, opacity: 0.8, display: 'inline-flex' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3.2" />
                <path d="M19.4 13.5a7.6 7.6 0 0 0 0-3l2-1.5-2-3.4-2.4 1a7.6 7.6 0 0 0-2.6-1.5L14 2.5h-4l-.4 2.6a7.6 7.6 0 0 0-2.6 1.5l-2.4-1-2 3.4 2 1.5a7.6 7.6 0 0 0 0 3l-2 1.5 2 3.4 2.4-1a7.6 7.6 0 0 0 2.6 1.5l.4 2.6h4l.4-2.6a7.6 7.6 0 0 0 2.6-1.5l2.4 1 2-3.4z" />
              </svg>
            </span>
            Settings
          </Link>
          <a
            href="/stay"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '9px 12px',
              borderRadius: 'var(--r-md)',
              fontSize: 14,
              color: 'var(--ink-secondary)',
            }}
          >
            <span aria-hidden style={{ width: 18, height: 18, opacity: 0.8, display: 'inline-flex' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 4h6v6M20 4l-9 9M19 13v6a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h6" />
              </svg>
            </span>
            Public landing
          </a>
        </div>
      </aside>

      {/* ── Mobile bottom tab bar (upload front and centre) ── */}
      <nav className="bottomnav" aria-label="Raven">
        {ITEMS.slice(0, 2).map((item) => (
          <Link key={item.href} href={item.href} className={isActive(pathname, item.href) ? 'active' : ''}>
            <span className="navicon" aria-hidden>{item.icon}</span>
            {item.label}
          </Link>
        ))}
        <Link href="/u" className="upload-cta">
          <span className="navicon" aria-hidden>{Icon.upload}</span>
          Upload
        </Link>
        {ITEMS.slice(2).map((item) => (
          <Link key={item.href} href={item.href} className={isActive(pathname, item.href) ? 'active' : ''}>
            <span className="navicon" aria-hidden>{item.icon}</span>
            {item.label}
          </Link>
        ))}
      </nav>
    </>
  );
}
