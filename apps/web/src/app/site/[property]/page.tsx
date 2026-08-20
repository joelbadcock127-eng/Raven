import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Cormorant_Garamond, Jost, Fraunces, Space_Grotesk, Quicksand } from 'next/font/google';
import localFont from 'next/font/local';
import { supabaseAdmin } from '@/lib/supabase';
import { defaultTheme, type SitePageV2, type SiteTheme } from '@/lib/siteBuilder';
import { SITE_SEEDS } from '@/lib/siteSeeds';
import SiteRenderer from '@/components/SiteRenderer';
import AnnieMaySite from '@/components/anniemay/AnnieMaySite';
import AnnieMaySiteV2 from '@/components/anniemay/AnnieMaySiteV2';

export const revalidate = 0;

// Annie May uses the live site's own faces: Ginger (self-hosted, from
// anniemay.com.au) for display and Quicksand for body.
const amDisplay = localFont({
  src: '../../../fonts/Ginger.woff',
  weight: '400',
  display: 'swap',
  variable: '--font-am-display',
});
const amBody = Quicksand({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-am-body',
});

const siteSerif = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600'],
  style: ['normal', 'italic'],
  variable: '--font-site-serif',
});
const siteSans = Jost({
  subsets: ['latin'],
  weight: ['300', '400', '500'],
  variable: '--font-site-sans',
});
const siteDisplay = Fraunces({
  subsets: ['latin'],
  weight: ['300', '400', '500'],
  style: ['normal', 'italic'],
  variable: '--font-site-display',
});
const siteGrotesk = Space_Grotesk({
  subsets: ['latin'],
  weight: ['300', '400', '500'],
  variable: '--font-site-grotesk',
});

const NAMES: Record<string, string> = {
  'ten-fifty-bakers': 'Ten Fifty Bakers',
  'prescription-pad': 'The Prescription Pad',
  'annie-may': 'Annie May',
};

interface Query {
  page?: string;
  version?: string;
  edit?: string;
  section?: string;
  standalone?: string;
  v?: string; // annie-may only: '2' renders the V2 draft clone
}

/** '?version=seed' renders the designed blueprint straight from the repo —
 *  no database version needed, so the redesigns are viewable immediately. */
function loadSeed(propertyId: string) {
  const seed = SITE_SEEDS[propertyId];
  if (!seed) return null;
  return {
    version: { id: 'seed', property_id: propertyId, label: seed.label, status: 'draft', theme: seed.theme },
    pages: seed.pages.map((p, i) => ({
      id: `seed-${i}`,
      slug: p.slug,
      nav_label: p.nav_label,
      title: p.title,
      sort: i,
      sections: p.sections.map((s, j) => ({ ...s, id: `sd${i}x${j}` })),
    })) as SitePageV2[],
  };
}

async function load(propertyId: string, versionId?: string) {
  if (versionId === 'seed') return loadSeed(propertyId);
  const supabase = supabaseAdmin();
  if (!supabase) return null;

  let vid = versionId;
  if (!vid) {
    const { data: settings } = await supabase
      .from('site_settings')
      .select('live_version_id')
      .eq('property_id', propertyId)
      .maybeSingle();
    vid = settings?.live_version_id ?? undefined;
  }
  if (!vid) return null;

  const [{ data: version }, { data: pages }] = await Promise.all([
    supabase.from('site_versions').select('id, property_id, label, status, theme').eq('id', vid).maybeSingle(),
    supabase
      .from('site_v2_pages')
      .select('id, slug, nav_label, title, sections, sort')
      .eq('version_id', vid)
      .order('sort'),
  ]);
  if (!version || version.property_id !== propertyId) return null;
  return { version, pages: (pages as SitePageV2[]) ?? [] };
}

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ property: string }>;
  searchParams: Promise<Query>;
}): Promise<Metadata> {
  const { property } = await params;
  const q = await searchParams;

  // Annie May serves the bespoke site (legacy builder versions via ?version=)
  if (property === 'annie-may' && (!q.version || q.version === 'seed') && !q.edit) {
    const titles: Record<string, string> = {
      home: 'Annie May · Refined Devonport heritage guesthouse',
      accommodation: 'Accommodation in Devonport · Rooms & amenities · Annie May',
      story: 'The Annie May story · Heritage with modern ease',
      explore: 'Explore Devonport & North West Tasmania · Annie May',
      contact: 'Contact Annie May · Devonport heritage guesthouse',
    };
    return {
      title: titles[q.page ?? 'home'] ?? titles.home,
      description:
        'Annie May is a heritage boutique guesthouse in central Devonport, Tasmania. Seven ensuite king rooms, adults only, breakfast included, lift access, minutes from the Spirit of Tasmania.',
    };
  }

  const data = await load(property, q.version);
  const page = data?.pages.find((p) => p.slug === (q.page ?? 'home')) ?? data?.pages[0];
  return {
    title: page?.title || NAMES[property] || 'Decra site',
    // only the live version on its real domain should ever be indexed
    robots: q.version || q.edit ? { index: false, follow: false } : undefined,
  };
}

export default async function SiteV2Page({
  params,
  searchParams,
}: {
  params: Promise<{ property: string }>;
  searchParams: Promise<Query>;
}) {
  const { property } = await params;
  const q = await searchParams;

  // Annie May: the bespoke redesign is the site — it also answers
  // ?version=seed since no builder seed exists for her. The old builder
  // flow stays reachable only for a real stored version (?version=<id>).
  if (property === 'annie-may' && (!q.version || q.version === 'seed') && !q.edit) {
    // V2 is the site; ?v=1 keeps the previous bespoke version reachable.
    const Site = q.v === '1' ? AnnieMaySite : AnnieMaySiteV2;
    return (
      <div className={`${amDisplay.variable} ${amBody.variable}`}>
        <Site page={q.page ?? 'home'} standalone={q.standalone === '1'} />
      </div>
    );
  }

  const data = await load(property, q.version);
  if (!data) notFound();

  const theme: SiteTheme = {
    ...defaultTheme(property),
    ...(data.version.theme as Partial<SiteTheme>),
  };

  return (
    <div className={`${siteSerif.variable} ${siteSans.variable} ${siteDisplay.variable} ${siteGrotesk.variable}`}>
      <SiteRenderer
        propertyName={NAMES[property] ?? property}
        pages={data.pages}
        currentSlug={q.page ?? 'home'}
        theme={theme}
        editable={q.edit === '1'}
        selectedId={q.section ?? null}
        standalone={q.standalone === '1'}
        versionParam={q.version ?? null}
      />
    </div>
  );
}
