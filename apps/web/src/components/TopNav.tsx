import Link from 'next/link';

const TABS = [
  { href: '/', label: 'Feed' },
  { href: '/sites', label: 'Sites' },
  { href: '/media', label: 'Media' },
  { href: '/social', label: 'Social' },
  { href: '/campaigns', label: 'Campaigns' },
];

export default function TopNav({ active }: { active: string }) {
  return (
    <nav style={{ display: 'flex', alignItems: 'center', gap: 20, padding: '24px 0 48px' }}>
      <span className="heading-md" style={{ fontWeight: 400, letterSpacing: '-0.4px' }}>
        Raven
      </span>
      <span style={{ flex: 1 }} />
      {TABS.map((t) =>
        t.label === active ? (
          <span key={t.href} className="caption" style={{ color: 'var(--ink)', fontWeight: 500 }}>
            {t.label}
          </span>
        ) : (
          <Link key={t.href} href={t.href} className="caption">
            {t.label}
          </Link>
        ),
      )}
    </nav>
  );
}
