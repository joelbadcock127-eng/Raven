import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Stay North West Tasmania — Ten Fifty Bakers, The Prescription Pad & Annie May',
  description:
    'Three distinctive places to stay on Tasmania\'s North West coast: an off-grid wilderness retreat at Bakers Beach, group accommodation in Shearwater, and a refined heritage guesthouse in Devonport.',
};

/**
 * Public combined landing page for all three properties.
 * No admin chrome — safe to share and index. Each card links to the
 * property's own website.
 */
const PROPERTIES = [
  {
    name: 'Ten Fifty Bakers',
    locality: 'Bakers Beach',
    tagline: 'Off-grid luxury wilderness retreat',
    blurb:
      'A hand-built timber sanctuary beside Narawntapu National Park. Silence, space, clean air — an outdoor bath under the stars and not another soul for miles. Sleeps 10.',
    href: 'https://tenfiftybakers.com.au/',
    image: 'https://tenfiftybakers.com.au/wp-content/uploads/2025/07/1050-Bakers-16-1.jpg',
    fits: ['couples', 'wellness escapes', 'walkers', 'milestones'],
  },
  {
    name: 'The Prescription Pad',
    locality: 'Shearwater',
    tagline: 'The prescription for a proper break',
    blurb:
      'Spacious, easy group accommodation minutes from the beach at Shearwater. Built for families, sports weekends and get-togethers — where every stay is a remedy. Sleeps 10.',
    href: 'https://theprescriptionpad.com.au/',
    image: 'https://theprescriptionpad.com.au/wp-content/uploads/2025/08/Prescription-Pad-Beach.png',
    fits: ['families', 'groups', 'sports weekends', 'reunions'],
  },
  {
    name: 'Annie May',
    locality: 'Devonport',
    tagline: 'Refined heritage guesthouse',
    blurb:
      'Seven ensuite rooms in a lovingly restored Devonport home. Adults-only, unhurried and memorable — perfect for business stays, cruise stopovers and quiet weekends.',
    href: 'https://anniemay.com.au/',
    image: 'https://anniemay.com.au/wp-content/uploads/2025/08/Annie-May-Bedroom.jpg',
    fits: ['couples', 'business', 'cruise stopovers', 'adults only'],
  },
];

export default function StayPage() {
  return (
    <main style={{ position: 'relative', minHeight: '100vh' }}>
      <div className="mesh" />
      <div style={{ position: 'relative', maxWidth: 1080, margin: '0 auto', padding: '0 24px 96px' }}>
        <header style={{ padding: '80px 0 56px', textAlign: 'center' }}>
          <p className="micro-cap" style={{ color: 'var(--primary-deep)', marginBottom: 16 }}>
            North West Tasmania
          </p>
          <h1 className="display-lg" style={{ marginBottom: 16, fontSize: 44 }}>
            Three places to stay.
            <br />
            One stretch of extraordinary coast.
          </h1>
          <p className="caption" style={{ maxWidth: 560, margin: '0 auto', fontSize: 15 }}>
            Wilderness, water and heritage within thirty minutes of each other — book direct with
            the people who look after each place.
          </p>
        </header>

        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
          {PROPERTIES.map((p) => (
            <a
              key={p.name}
              href={p.href}
              className="card"
              style={{ overflow: 'hidden', color: 'inherit', display: 'flex', flexDirection: 'column' }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={p.image}
                alt={`${p.name}, ${p.locality}`}
                loading="lazy"
                style={{ width: '100%', aspectRatio: '4 / 3', objectFit: 'cover', display: 'block' }}
              />
              <div style={{ padding: '20px 22px 24px', display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
                <div className="micro-cap" style={{ color: 'var(--primary-deep)' }}>{p.locality}</div>
                <h2 className="heading-md">{p.name}</h2>
                <p style={{ fontSize: 14, color: 'var(--ink-secondary)', fontStyle: 'italic' }}>{p.tagline}</p>
                <p className="caption" style={{ flex: 1 }}>{p.blurb}</p>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', margin: '4px 0 10px' }}>
                  {p.fits.map((f) => (
                    <span key={f} className="tag-soft" style={{ textTransform: 'none', letterSpacing: 0, fontSize: 11 }}>
                      {f}
                    </span>
                  ))}
                </div>
                <span className="pill-primary" style={{ textAlign: 'center' }}>
                  Visit {p.name} →
                </span>
              </div>
            </a>
          ))}
        </section>

        <footer className="caption" style={{ paddingTop: 72, textAlign: 'center' }}>
          Ten Fifty Bakers · The Prescription Pad · Annie May — independently owned, book direct.
        </footer>
      </div>
    </main>
  );
}
