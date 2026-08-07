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
  /** Saved brand-kit overrides (jsonb, migration 0016) — see lib/brandKit.ts. */
  brand?: unknown;
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

/**
 * Built-in starter guides, used whenever no guide is saved for a property so
 * captions and music match the brand from the first draft. Annie May's is
 * distilled from the anniemay.com.au brand voice ("She knows how to hold a
 * moment") pending real captions pasted from @anniemaybnb.
 */
const DEFAULT_GUIDES: Record<string, Omit<StyleGuide, 'property_id'>> = {
  'annie-may': {
    voice:
      'Quiet, poetic and unhurried. Annie May is spoken of as "she" — a graceful heritage host. Short lines, understated warmth, refinement without theatre. Never salesy, never loud.',
    vibe:
      'Slow heritage mornings in Devonport: soft window light, crisp linen, coffee going cold because the conversation was better. Adults-only calm — privacy with warmth.',
    visual:
      'Warm, softly graded film-like tones — creams, tans and muted sage against dark heritage timber. Golden window light, gentle contrast, nothing oversaturated.',
    music: 'gentle acoustic guitar, soft warm piano, slow and unhurried, quiet coastal calm',
    hashtags: [
      '#anniemay', '#devonport', '#tasmania', '#discovertasmania', '#boutiqueaccommodation',
      '#heritagehotel', '#bnbtasmania', '#northwesttasmania', '#spiritoftasmania', '#tassiestyle',
    ],
    cta: 'A soft invitation to stay with her — book direct at anniemay.com.au.',
    avoid:
      'Hype words (stunning, amazing, unreal), urgency (book now!!, don\'t miss out), emoji spam, exclamation marks, anything aimed at families with children.',
    example_captions: [
      'She keeps the morning slow. Coffee in the bay window, the Mersey easing past, nowhere you need to be.\n\nStay with her — anniemay.com.au\n\n#anniemay #devonport #tasmania #boutiqueaccommodation #heritagehotel',
      'Heritage kept, comforts modernised. Seven rooms, each with its own quiet corner of a grand old Devonport home.\n\nBook direct at anniemay.com.au\n\n#anniemay #devonport #discovertasmania #bnbtasmania #tassiestyle',
      'Off the Spirit and five minutes to her door. She knows how to hold a moment before the road tomorrow.\n\nanniemay.com.au\n\n#anniemay #spiritoftasmania #devonport #tasmania #boutiqueaccommodation',
    ],
    source_notes: 'Built-in starter distilled from the anniemay.com.au brand — replace by saving a guide.',
  },
};

/** A property's built-in starter guide, or null if none is defined. */
export function defaultGuide(propertyId: string): StyleGuide | null {
  const d = DEFAULT_GUIDES[propertyId];
  return d ? { property_id: propertyId, ...d } : null;
}

/** The guide to actually steer with: the saved one, else the built-in starter. */
export function effectiveGuide(saved: StyleGuide | null, propertyId: string): StyleGuide | null {
  if (saved && guideHasContent(saved)) return saved;
  return defaultGuide(propertyId);
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
