import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { supabaseAdmin } from '@/lib/supabase';
import { defaultTheme, type SitePageV2, type SiteTheme } from '@/lib/siteBuilder';
import SiteRenderer from '@/components/SiteRenderer';

export const revalidate = 0;

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
}

async function load(propertyId: string, versionId?: string) {
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
  const data = await load(property, q.version);
  const page = data?.pages.find((p) => p.slug === (q.page ?? 'home')) ?? data?.pages[0];
  return {
    title: page?.title || NAMES[property] || 'Raven site',
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
  const data = await load(property, q.version);
  if (!data) notFound();

  const theme: SiteTheme = {
    ...defaultTheme(property),
    ...(data.version.theme as Partial<SiteTheme>),
  };

  return (
    <SiteRenderer
      propertyName={NAMES[property] ?? property}
      pages={data.pages}
      currentSlug={q.page ?? 'home'}
      theme={theme}
      editable={q.edit === '1'}
      selectedId={q.section ?? null}
      standalone={q.standalone === '1'}
    />
  );
}
