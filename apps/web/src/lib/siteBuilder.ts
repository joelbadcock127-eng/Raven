/**
 * Site builder v2 — section-based site model.
 * A site version = theme + pages; a page = ordered sections; a section =
 * typed data rendered by our own components. Sections are the selectable
 * entities the editor and AI chat operate on.
 */

export interface SiteTheme {
  headingFont: string; // CSS font-family stack
  bodyFont: string;
  bg: string;
  ink: string;
  soft: string; // subtle background
  accent: string;
  accentInk: string;
  radius: number;
}

export type Section =
  // videoUrl: ambient muted loop behind the hero; imageUrl doubles as its poster/fallback
  | { id: string; type: 'hero'; kicker?: string; headline: string; subheadline?: string; imageUrl?: string; videoUrl?: string; ctaText?: string; ctaHref?: string }
  | { id: string; type: 'text'; heading?: string; body: string }
  | { id: string; type: 'split'; kicker?: string; heading: string; body: string; imageUrl?: string; align?: 'left' | 'right'; imageAspect?: 'portrait' | 'square' | 'landscape'; ctaText?: string; ctaHref?: string }
  | { id: string; type: 'fullbleed'; imageUrl: string; kicker?: string; headline?: string; body?: string; ctaText?: string; ctaHref?: string; height?: 'tall' | 'full' }
  | { id: string; type: 'stats'; items: { value: string; label: string }[] }
  | { id: string; type: 'gallery'; heading?: string; layout?: 'grid' | 'masonry'; images: { url: string; alt?: string }[] }
  | { id: string; type: 'features'; heading?: string; items: { title: string; body: string; imageUrl?: string }[] }
  | { id: string; type: 'quote'; text: string; attribution?: string }
  | { id: string; type: 'faq'; heading?: string; items: { q: string; a: string }[] }
  | { id: string; type: 'cta'; heading: string; body?: string; buttonText: string; buttonHref: string; imageUrl?: string }
  // film strip: edge-to-edge horizontal scroll of large images at natural aspect
  | { id: string; type: 'strip'; kicker?: string; heading?: string; images: { url: string; alt?: string }[] }
  // editorial collage: 2-3 offset images, optional copy block and a giant drifting word behind
  | { id: string; type: 'mosaic'; kicker?: string; heading?: string; body?: string; word?: string; images: { url: string; alt?: string }[] }
  // oversized display statement band
  | { id: string; type: 'marquee'; text: string }
  // cinematic sequence: full-screen frames wiped in by scroll, alt = caption
  | { id: string; type: 'stack'; images: { url: string; alt?: string }[] }
  // room-by-room detail blocks: alternating media + numbered copy
  | { id: string; type: 'rooms'; heading?: string; items: { name: string; body: string; images: { url: string; alt?: string }[] }[] };

export type SectionType = Section['type'];

export interface SitePageV2 {
  id: string;
  slug: string;
  nav_label: string;
  title: string;
  sections: Section[];
  sort: number;
}

export interface SiteVersion {
  id: string;
  property_id: string;
  label: string;
  status: 'draft' | 'published' | 'archived';
  theme: SiteTheme;
  created_at: string;
  published_at: string | null;
}

export const DEFAULT_THEMES: Record<string, SiteTheme> = {
  // dark-sky cinematic — the Saffire model: sell the wilderness with stillness
  'ten-fifty-bakers': {
    headingFont: "var(--font-site-serif), 'Cormorant Garamond', Georgia, serif",
    bodyFont: "var(--font-site-sans), 'Jost', system-ui, sans-serif",
    bg: '#15120d',
    ink: '#ece5d8',
    soft: '#1e1a13',
    accent: '#b5915f',
    accentInk: '#15120d',
    radius: 0,
  },
  'prescription-pad': {
    headingFont: "var(--font-site-grotesk), 'Space Grotesk', system-ui, sans-serif",
    bodyFont: "var(--font-site-sans), 'Jost', system-ui, sans-serif",
    bg: '#fbfbf8',
    ink: '#1f3038',
    soft: '#e9f1f0',
    accent: '#0e7a83',
    accentInk: '#ffffff',
    radius: 14,
  },
  // Base for the designed blueprint (lib/siteSeeds). The hand-built Annie May
  // starter carries its own ANNIE_MAY_THEME in lib/annieMaySite.ts.
  'annie-may': {
    headingFont: "var(--font-site-display), 'Fraunces', Georgia, serif",
    bodyFont: "var(--font-site-sans), 'Jost', system-ui, sans-serif",
    bg: '#faf6ee',
    ink: '#332f27',
    soft: '#f1eadb',
    accent: '#5c6647',
    accentInk: '#f5f1e8',
    radius: 3,
  },
};

export function defaultTheme(propertyId: string): SiteTheme {
  return DEFAULT_THEMES[propertyId] ?? DEFAULT_THEMES['ten-fifty-bakers'];
}

export function newSection(type: SectionType): Section {
  const id = crypto.randomUUID().slice(0, 8);
  switch (type) {
    case 'hero':
      return { id, type, kicker: 'Somewhere, Tasmania', headline: 'Headline', subheadline: 'Subheadline', ctaText: 'Book now', ctaHref: '#' };
    case 'text':
      return { id, type, heading: 'Heading', body: 'Write something…' };
    case 'split':
      return { id, type, kicker: 'Kicker', heading: 'Heading', body: 'Write something…', align: 'right' };
    case 'fullbleed':
      return { id, type, imageUrl: '', kicker: '', headline: 'A wide moment' };
    case 'stats':
      return { id, type, items: [{ value: '10', label: 'guests' }] };
    case 'gallery':
      return { id, type, heading: 'Gallery', images: [] };
    case 'features':
      return { id, type, heading: 'Highlights', items: [{ title: 'Feature', body: 'Describe it…' }] };
    case 'quote':
      return { id, type, text: 'A guest said something lovely.', attribution: 'Guest review' };
    case 'faq':
      return { id, type, heading: 'Good to know', items: [{ q: 'Question?', a: 'Answer.' }] };
    case 'cta':
      return { id, type, heading: 'Ready to stay?', body: '', buttonText: 'Check availability', buttonHref: '#' };
    case 'strip':
      return { id, type, kicker: '', heading: '', images: [] };
    case 'mosaic':
      return { id, type, kicker: 'Kicker', heading: 'Heading', body: 'Write something…', images: [] };
    case 'marquee':
      return { id, type, text: 'A line worth saying loudly.' };
    case 'stack':
      return { id, type, images: [] };
    case 'rooms':
      return { id, type, heading: 'The rooms', items: [{ name: 'Room one', body: 'Describe it…', images: [] }] };
  }
}

export const SECTION_TYPES: SectionType[] = ['hero', 'fullbleed', 'stack', 'mosaic', 'split', 'rooms', 'text', 'marquee', 'gallery', 'features', 'stats', 'quote', 'faq', 'strip', 'cta'];
