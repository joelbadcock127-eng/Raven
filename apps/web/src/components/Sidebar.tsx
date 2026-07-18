'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const ITEMS = [
  { href: '/', label: 'Feed', icon: '◈' },
  { href: '/campaigns', label: 'Campaigns', icon: '➤' },
  { href: '/sites', label: 'Sites', icon: '⌂' },
  { href: '/media', label: 'Media', icon: '▤' },
  { href: '/social', label: 'Social', icon: '✦' },
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
              <span aria-hidden style={{ width: 16, textAlign: 'center', opacity: 0.75 }}>{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
        <div style={{ marginTop: 'auto', padding: '0 12px', display: 'grid', gap: 8 }}>
          <Link href="/u" className="caption">Quick upload ↗</Link>
          <a href="/stay" target="_blank" rel="noopener noreferrer" className="caption">
            Public landing ↗
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
          <span className="navicon" aria-hidden>＋</span>
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
