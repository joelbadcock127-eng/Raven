import { SITES } from '@/lib/sites';
import { supabaseAdmin } from '@/lib/supabase';
import type { SitePageV2, SiteVersion } from '@/lib/siteBuilder';
import {
  ANNIE_MAY_STARTER_PAGES,
  ANNIE_MAY_THEME,
} from '@/lib/annieMaySite';
import SitesHub, { type BuilderData } from '@/components/SitesHub';

export const revalidate = 0;

const ANNIE_MAY_STARTER_VERSION_ID = 'a11e0000-0000-4000-8000-000000000001';

async function readBuilderRows(supabase: NonNullable<ReturnType<typeof supabaseAdmin>>) {
  return Promise.all([
    supabase
      .from('site_versions')
      .select('id, property_id, label, status, theme, created_at, published_at')
      .order('created_at', { ascending: false }),
    supabase.from('site_v2_pages').select('id, version_id, slug, nav_label, title, sections, sort').order('sort'),
    supabase.from('site_settings').select('property_id, live_version_id, domains'),
  ]);
}

/** Seed the commissioned Annie May redesign once, then leave it entirely owner-editable. */
async function ensureAnnieMayStarter(supabase: NonNullable<ReturnType<typeof supabaseAdmin>>): Promise<boolean> {
  const { error: versionError } = await supabase.from('site_versions').upsert(
    {
      id: ANNIE_MAY_STARTER_VERSION_ID,
      property_id: 'annie-may',
      label: 'Annie May · New website',
      status: 'draft',
      theme: ANNIE_MAY_THEME,
    },
    { onConflict: 'id', ignoreDuplicates: true },
  );
  if (versionError) return false;

  const { error: pagesError } = await supabase.from('site_v2_pages').upsert(
    ANNIE_MAY_STARTER_PAGES.map((page) => ({
      ...page,
      version_id: ANNIE_MAY_STARTER_VERSION_ID,
    })),
    { onConflict: 'version_id,slug', ignoreDuplicates: true },
  );
  return !pagesError;
}

async function loadBuilderData(): Promise<Record<string, BuilderData>> {
  const supabase = supabaseAdmin();
  const empty = Object.fromEntries(
    SITES.map((s) => [s.propertyId, { versions: [], pagesByVersion: {}, liveVersionId: null, domains: [] } as BuilderData]),
  );
  if (!supabase) return empty;

  let [versionResult, pageResult, settingsResult] = await readBuilderRows(supabase);
  if (!(versionResult.data ?? []).some((version) => version.property_id === 'annie-may')) {
    const created = await ensureAnnieMayStarter(supabase);
    if (created) [versionResult, pageResult, settingsResult] = await readBuilderRows(supabase);
  }
  const versions = versionResult.data;
  const pages = pageResult.data;
  const settings = settingsResult.data;

  const out = empty;
  for (const v of (versions as (SiteVersion & { property_id: string })[]) ?? []) {
    const bucket = out[v.property_id];
    if (bucket) bucket.versions.push(v);
  }
  for (const p of (pages as (SitePageV2 & { version_id: string })[]) ?? []) {
    for (const pid of Object.keys(out)) {
      if (out[pid].versions.some((v) => v.id === p.version_id)) {
        (out[pid].pagesByVersion[p.version_id] ??= []).push(p);
      }
    }
  }
  for (const s of settings ?? []) {
    const bucket = out[s.property_id];
    if (bucket) {
      bucket.liveVersionId = s.live_version_id;
      bucket.domains = s.domains ?? [];
    }
  }
  return out;
}

export default async function SitesPage() {
  const builder = await loadBuilderData();

  return (
    <>
      <header style={{ marginBottom: 32 }}>
        <h1 className="display-lg" style={{ marginBottom: 12 }}>Property websites</h1>
        <p className="caption" style={{ maxWidth: 620 }}>
          Current sites are exact mirrors of the live WordPress pages — browse and edit them in
          place. The builder holds the from-scratch redesigns: versioned, section-based, with the
          AI editor. Publish a builder version and the property&apos;s domain switches to it.
        </p>
      </header>
      <SitesHub sites={SITES} builder={builder} />
      <footer className="caption" style={{ paddingTop: 64 }}>
        Raven · booking-generation platform for Ten Fifty Bakers, The Prescription Pad and Annie May.
      </footer>
    </>
  );
}
