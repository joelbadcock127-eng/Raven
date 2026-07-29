import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Per-property social style guide — the single source of truth for a
 * property's feed personality (voice, vibe, look, music). Threaded into
 * caption prompts, reel grading defaults and music matching so posts keep
 * the account's established theme (see supabase/migrations/0015).
 */
export interface StyleGuide {
  property_id: string;
  voice: string;
  vibe: string;
  visual: string;
  music: string;
  hashtags: string[];
  cta: string;
  avoid: string;
  example_captions: string[];
  source_notes: string;
  updated_at?: string;
}

export function emptyGuide(propertyId: string): StyleGuide {
  return {
    property_id: propertyId,
    voice: '',
    vibe: '',
    visual: '',
    music: '',
    hashtags: [],
    cta: '',
    avoid: '',
    example_captions: [],
    source_notes: '',
  };
}

/** Null when no guide is saved OR the 0015 migration hasn't run yet. */
export async function loadStyleGuide(
  supabase: SupabaseClient,
  propertyId: string,
): Promise<StyleGuide | null> {
  try {
    const { data, error } = await supabase
      .from('style_guides')
      .select('*')
      .eq('property_id', propertyId)
      .maybeSingle();
    if (error) return null;
    return (data as StyleGuide) ?? null;
  } catch {
    return null;
  }
}

/** True when the guide has any content worth steering the AI with. */
export function guideHasContent(g: StyleGuide | null): g is StyleGuide {
  if (!g) return false;
  return Boolean(
    g.voice || g.vibe || g.visual || g.music || g.cta || g.avoid ||
    g.hashtags.length || g.example_captions.length,
  );
}

/** System-prompt block appended to caption generation for this property. */
export function guideSystemBlock(g: StyleGuide): string {
  const lines: string[] = ['', 'PROPERTY STYLE GUIDE — follow this over any generic guidance:'];
  if (g.voice) lines.push(`Voice: ${g.voice}`);
  if (g.vibe) lines.push(`Vibe of the feed: ${g.vibe}`);
  if (g.cta) lines.push(`Close captions with: ${g.cta}`);
  if (g.hashtags.length) lines.push(`Draw hashtags mostly from this pool: ${g.hashtags.join(' ')}`);
  if (g.avoid) lines.push(`Never: ${g.avoid}`);
  if (g.example_captions.length) {
    lines.push('Match the style, rhythm and length of these example captions:');
    g.example_captions.slice(0, 5).forEach((c, i) => lines.push(`Example ${i + 1}: ${c}`));
  }
  return lines.join('\n');
}

/** Map the guide's visual description to the closest renderer grade. */
export function guideFilterDefault(
  g: StyleGuide | null,
): 'none' | 'warm' | 'cool' | 'mono' | 'punchy' | null {
  const v = (g?.visual ?? '').toLowerCase();
  if (!v) return null;
  if (/black.?and.?white|monochrome|\bmono\b|b&w/.test(v)) return 'mono';
  if (/punchy|vivid|saturated|bold|high.?contrast/.test(v)) return 'punchy';
  if (/cool|blue|crisp|moody|misty|overcast/.test(v)) return 'cool';
  if (/warm|golden|sunset|amber|cosy|cozy|soft light/.test(v)) return 'warm';
  if (/natural|unfiltered|true.?to.?life|no filter/.test(v)) return 'none';
  return null;
}
