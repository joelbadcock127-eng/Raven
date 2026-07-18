'use server';

import { revalidatePath } from 'next/cache';
import { supabaseAdmin } from '@/lib/supabase';
import { anthropic, MODELS } from '@/lib/ai';
import { defaultTheme, newSection, type Section, type SectionType } from '@/lib/siteBuilder';

export interface BuilderResult {
  ok: boolean;
  message: string;
  id?: string;
}

/** Create a new draft version — blank, or duplicating an existing version. */
export async function createVersion(
  propertyId: string,
  label: string,
  duplicateOf?: string,
): Promise<BuilderResult> {
  const supabase = supabaseAdmin();
  if (!supabase) return { ok: false, message: 'Supabase is not configured.' };

  let theme = defaultTheme(propertyId);
  if (duplicateOf) {
    const { data: src } = await supabase
      .from('site_versions')
      .select('theme')
      .eq('id', duplicateOf)
      .maybeSingle();
    if (src?.theme && Object.keys(src.theme).length) theme = src.theme;
  }

  const { data: version, error } = await supabase
    .from('site_versions')
    .insert({ property_id: propertyId, label: label || 'Draft', theme })
    .select('id')
    .single();
  if (error || !version) return { ok: false, message: error?.message ?? 'Could not create version' };

  if (duplicateOf) {
    const { data: pages } = await supabase
      .from('site_v2_pages')
      .select('slug, nav_label, title, sections, sort')
      .eq('version_id', duplicateOf);
    if (pages?.length)
      await supabase
        .from('site_v2_pages')
        .insert(pages.map((p) => ({ ...p, version_id: version.id })));
  } else {
    await supabase.from('site_v2_pages').insert({
      version_id: version.id,
      slug: 'home',
      nav_label: 'Home',
      title: '',
      sections: [newSection('hero'), newSection('text'), newSection('cta')],
      sort: 0,
    });
  }

  revalidatePath('/sites');
  return { ok: true, message: 'Draft created', id: version.id };
}

/** Publish a version: it becomes the live site on the property's domains. */
export async function publishVersion(propertyId: string, versionId: string): Promise<BuilderResult> {
  const supabase = supabaseAdmin();
  if (!supabase) return { ok: false, message: 'Supabase is not configured.' };
  const { error } = await supabase
    .from('site_versions')
    .update({ status: 'published', published_at: new Date().toISOString() })
    .eq('id', versionId);
  if (error) return { ok: false, message: error.message };
  const { error: e2 } = await supabase.from('site_settings').upsert({
    property_id: propertyId,
    live_version_id: versionId,
    updated_at: new Date().toISOString(),
  });
  if (e2) return { ok: false, message: e2.message };
  revalidatePath('/sites');
  return { ok: true, message: 'Published — this version is now live on the property domains' };
}

/** Point the domain back at the WordPress mirror (unset live v2). */
export async function unpublishSite(propertyId: string): Promise<BuilderResult> {
  const supabase = supabaseAdmin();
  if (!supabase) return { ok: false, message: 'Supabase is not configured.' };
  const { error } = await supabase
    .from('site_settings')
    .upsert({ property_id: propertyId, live_version_id: null, updated_at: new Date().toISOString() });
  if (error) return { ok: false, message: error.message };
  revalidatePath('/sites');
  return { ok: true, message: 'Domains now serve the mirror again' };
}

/** Save a page's sections (used by inline edits, AI edits and reorders). */
export async function savePageSections(pageId: string, sections: Section[]): Promise<BuilderResult> {
  const supabase = supabaseAdmin();
  if (!supabase) return { ok: false, message: 'Supabase is not configured.' };
  const { error } = await supabase.from('site_v2_pages').update({ sections }).eq('id', pageId);
  if (error) return { ok: false, message: error.message };
  return { ok: true, message: 'Saved' };
}

export async function addPage(versionId: string, slug: string, navLabel: string): Promise<BuilderResult> {
  const supabase = supabaseAdmin();
  if (!supabase) return { ok: false, message: 'Supabase is not configured.' };
  const clean = slug.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '');
  if (!clean) return { ok: false, message: 'Invalid slug' };
  const { count } = await supabase
    .from('site_v2_pages')
    .select('id', { count: 'exact', head: true })
    .eq('version_id', versionId);
  const { error } = await supabase.from('site_v2_pages').insert({
    version_id: versionId,
    slug: clean,
    nav_label: navLabel || clean,
    sections: [newSection('hero'), newSection('text')],
    sort: count ?? 0,
  });
  if (error) return { ok: false, message: error.message };
  revalidatePath('/sites');
  return { ok: true, message: 'Page added' };
}

export async function addSectionToPage(pageId: string, type: SectionType): Promise<BuilderResult> {
  const supabase = supabaseAdmin();
  if (!supabase) return { ok: false, message: 'Supabase is not configured.' };
  const { data: page } = await supabase.from('site_v2_pages').select('sections').eq('id', pageId).maybeSingle();
  if (!page) return { ok: false, message: 'Page not found' };
  const sections = [...(page.sections as Section[]), newSection(type)];
  return savePageSections(pageId, sections);
}

/** Update the domain list for a property (drives middleware routing). */
export async function saveDomains(propertyId: string, domains: string[]): Promise<BuilderResult> {
  const supabase = supabaseAdmin();
  if (!supabase) return { ok: false, message: 'Supabase is not configured.' };
  const clean = domains.map((d) => d.trim().toLowerCase()).filter(Boolean);
  const { error } = await supabase
    .from('site_settings')
    .upsert({ property_id: propertyId, domains: clean, updated_at: new Date().toISOString() });
  if (error) return { ok: false, message: error.message };
  revalidatePath('/sites');
  return { ok: true, message: 'Domains saved (live within a minute)' };
}

const SECTION_EDIT_SCHEMA = {
  type: 'object',
  properties: {
    section: { type: 'object', description: 'The edited section, same JSON shape as the input section', additionalProperties: true },
    note: { type: 'string', description: 'One short sentence telling the owner what you changed' },
  },
  required: ['section', 'note'],
  additionalProperties: false,
} as const;

/**
 * The AI side-chat: apply a natural-language instruction to one section.
 * Returns the patched section JSON; the caller previews and saves.
 */
export async function aiEditSection(
  propertyId: string,
  section: Section,
  instruction: string,
): Promise<BuilderResult & { section?: Section; note?: string }> {
  const client = anthropic();
  if (!client) return { ok: false, message: 'ANTHROPIC_API_KEY is not set' };

  const supabase = supabaseAdmin();
  // give the model the property's media library so it can swap imagery
  let mediaList = '';
  if (supabase) {
    const { data: media } = await supabase
      .from('media_assets')
      .select('public_url, caption, tags')
      .eq('property_id', propertyId)
      .eq('kind', 'image')
      .eq('retired', false)
      .limit(30);
    mediaList = (media ?? [])
      .map((m) => `${m.public_url} — ${[m.caption, ...(m.tags ?? [])].filter(Boolean).join(', ') || 'no notes'}`)
      .join('\n');
  }

  try {
    const res = await client.messages.create({
      model: MODELS.edit,
      max_tokens: 3000,
      system:
        'You edit one section of a boutique Tasmanian accommodation website. ' +
        'Return the section with the SAME id and type and the same JSON shape, changed only as instructed. ' +
        'Keep copy warm and understated, Australian English. When asked for imagery, only use URLs from the provided media library list.',
      messages: [
        {
          role: 'user',
          content: `Section:\n${JSON.stringify(section)}\n\nMedia library:\n${mediaList || '(empty)'}\n\nInstruction: ${instruction}`,
        },
      ],
      output_config: { format: { type: 'json_schema', schema: SECTION_EDIT_SCHEMA } },
    });
    const parsed = JSON.parse(res.content.find((b) => b.type === 'text')?.text ?? '{}') as {
      section: Section;
      note: string;
    };
    if (!parsed.section || parsed.section.id !== section.id || parsed.section.type !== section.type)
      return { ok: false, message: 'AI returned an invalid section — try rephrasing' };
    return { ok: true, message: parsed.note, section: parsed.section, note: parsed.note };
  } catch (err) {
    return { ok: false, message: (err as Error).message };
  }
}
