/**
 * Per-property brand kits — the visual identity Raven applies automatically
 * to everything it creates for a property: reel/story text overlays (font,
 * colour, scrim, case), colour palette, watermark, grade/transition/aspect
 * defaults and clip pacing. Saved overrides live in style_guides.brand
 * (jsonb, migration 0016) and are merged over the built-in defaults here,
 * so every property is fully branded with zero setup and every field stays
 * customisable per property and per post.
 */

export type FontKey = 'marcellus' | 'cormorant' | 'playfair' | 'didact' | 'quicksand' | 'clean';

/**
 * Fonts available for burned-on text. `file` is the TTF committed under
 * apps/web/scripts/render/fonts/ (the render workflow checks out the repo);
 * `css` is the closest stack for on-screen previews in the admin;
 * `import` is the Google Fonts family for loading the preview face.
 */
export const FONTS: Record<FontKey, { label: string; file: string | null; css: string; import: string | null }> = {
  marcellus: {
    label: 'Marcellus — elegant heritage serif',
    file: 'Marcellus-Regular.ttf',
    css: "'Marcellus', Georgia, serif",
    import: 'Marcellus',
  },
  cormorant: {
    label: 'Cormorant Garamond — fine editorial serif',
    file: 'CormorantGaramond.ttf',
    css: "'Cormorant Garamond', Georgia, serif",
    import: 'Cormorant Garamond',
  },
  playfair: {
    label: 'Playfair Display — classic high-contrast serif',
    file: 'PlayfairDisplay.ttf',
    css: "'Playfair Display', Georgia, serif",
    import: 'Playfair Display',
  },
  didact: {
    label: 'Didact Gothic — light modern sans',
    file: 'DidactGothic-Regular.ttf',
    css: "'Didact Gothic', 'Helvetica Neue', sans-serif",
    import: 'Didact Gothic',
  },
  quicksand: {
    label: 'Quicksand — soft rounded sans',
    file: 'Quicksand.ttf',
    css: "'Quicksand', 'Helvetica Neue', sans-serif",
    import: 'Quicksand',
  },
  clean: {
    label: 'Clean bold (no brand font)',
    file: null, // renderer falls back to DejaVu Sans Bold
    css: "-apple-system, 'Segoe UI', sans-serif",
    import: null,
  },
};

export type ScrimStyle = 'none' | 'shadow' | 'band';
export type TextCase = 'as-typed' | 'uppercase';

export interface BrandKit {
  /** Palette — used for overlay text, scrim bands and admin previews. */
  colors: {
    text: string; // on-video text colour
    scrim: string; // band / shadow tint behind text
    accent: string; // brand accent (previews, future use)
    paper: string; // brand light tone (previews, future use)
  };
  /** On-video text styling for reels and stories. */
  overlay: {
    font: FontKey;
    scrim: ScrimStyle; // shadow = soft dark edge, band = tinted box behind text
    textCase: TextCase;
    position: 'top' | 'middle' | 'bottom';
    size: 'small' | 'medium' | 'large';
  };
  /** Reel assembly defaults (the builder starts from these). */
  reel: {
    grade: 'none' | 'warm' | 'cool' | 'mono' | 'punchy';
    transition: 'cut' | 'fade';
    aspect: '9:16' | '1:1' | '4:5';
    clipSeconds: number;
  };
  /** Small always-on wordmark burned into reels and stories. */
  watermark: {
    enabled: boolean;
    text: string;
    position: 'top' | 'bottom';
    opacity: number; // 0–1
  };
}

/** Deep-merge a partial saved kit over a base kit. */
export function mergeKit(base: BrandKit, saved: unknown): BrandKit {
  const s = (saved ?? {}) as Partial<Record<keyof BrandKit, object>>;
  return {
    colors: { ...base.colors, ...(s.colors ?? {}) },
    overlay: { ...base.overlay, ...(s.overlay ?? {}) },
    reel: { ...base.reel, ...(s.reel ?? {}) },
    watermark: { ...base.watermark, ...(s.watermark ?? {}) },
  };
}

const BASE_KIT: BrandKit = {
  colors: { text: '#ffffff', scrim: '#1c1a17', accent: '#533afd', paper: '#f5f2ec' },
  overlay: { font: 'clean', scrim: 'shadow', textCase: 'as-typed', position: 'bottom', size: 'medium' },
  reel: { grade: 'warm', transition: 'fade', aspect: '9:16', clipSeconds: 2.8 },
  watermark: { enabled: false, text: '', position: 'top', opacity: 0.85 },
};

/**
 * Built-in property kits. Annie May's is drawn from the anniemay.com.au
 * brand: elegant heritage serif, warm cream-and-tan palette, unhurried
 * pacing, understated uppercase wordmark.
 */
export const DEFAULT_BRAND_KITS: Record<string, BrandKit> = {
  'annie-may': {
    colors: { text: '#f6f1e8', scrim: '#332f2a', accent: '#5f7d71', paper: '#f6f1e8' },
    overlay: { font: 'marcellus', scrim: 'shadow', textCase: 'uppercase', position: 'bottom', size: 'medium' },
    reel: { grade: 'warm', transition: 'fade', aspect: '9:16', clipSeconds: 3.2 },
    watermark: { enabled: true, text: 'ANNIE MAY · DEVONPORT', position: 'top', opacity: 0.8 },
  },
  'ten-fifty-bakers': {
    colors: { text: '#f2efe9', scrim: '#14201c', accent: '#3f5d52', paper: '#eef0ec' },
    overlay: { font: 'didact', scrim: 'shadow', textCase: 'as-typed', position: 'bottom', size: 'medium' },
    reel: { grade: 'warm', transition: 'fade', aspect: '9:16', clipSeconds: 2.8 },
    watermark: { enabled: true, text: 'TEN FIFTY BAKERS', position: 'top', opacity: 0.75 },
  },
  'prescription-pad': {
    colors: { text: '#ffffff', scrim: '#1d2b3a', accent: '#2e6f8e', paper: '#f2f5f7' },
    overlay: { font: 'quicksand', scrim: 'shadow', textCase: 'as-typed', position: 'bottom', size: 'medium' },
    reel: { grade: 'none', transition: 'cut', aspect: '9:16', clipSeconds: 2.5 },
    watermark: { enabled: false, text: 'THE PRESCRIPTION PAD', position: 'top', opacity: 0.75 },
  },
};

/** The effective kit for a property: saved overrides merged over defaults. */
export function resolveBrandKit(propertyId: string | null | undefined, saved?: unknown): BrandKit {
  const base = (propertyId && DEFAULT_BRAND_KITS[propertyId]) || BASE_KIT;
  return mergeKit(base, saved);
}

/** Google Fonts stylesheet URL for previewing the kit's fonts in the admin. */
export function previewFontsHref(kit: BrandKit): string | null {
  const fam = FONTS[kit.overlay.font]?.import;
  if (!fam) return null;
  return `https://fonts.googleapis.com/css2?family=${fam.replace(/ /g, '+')}:wght@400;600&display=swap`;
}
