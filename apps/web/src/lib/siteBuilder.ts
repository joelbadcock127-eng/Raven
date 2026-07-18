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
  | { id: string; type: 'hero'; headline: string; subheadline?: string; imageUrl?: string; ctaText?: string; ctaHref?: string }
  | { id: string; type: 'text'; heading?: string; body: string }
  | { id: string; type: 'gallery'; heading?: string; images: { url: string; alt?: string }[] }
  | { id: string; type: 'features'; heading?: string; items: { title: string; body: string; imageUrl?: string }[] }
  | { id: string; type: 'quote'; text: string; attribution?: string }
  | { id: string; type: 'faq'; heading?: string; items: { q: string; a: string }[] }
  | { id: string; type: 'cta'; heading: string; body?: string; buttonText: string; buttonHref: string };

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
  'ten-fifty-bakers': {
    headingFont: "Georgia, 'Times New Roman', serif",
    bodyFont: "system-ui, -apple-system, sans-serif",
    bg: '#faf7f2',
    ink: '#26211a',
    soft: '#f1ebe1',
    accent: '#8a6d3b',
    accentInk: '#ffffff',
    radius: 10,
  },
  'prescription-pad': {
    headingFont: "system-ui, -apple-system, sans-serif",
    bodyFont: "system-ui, -apple-system, sans-serif",
    bg: '#ffffff',
    ink: '#233642',
    soft: '#eef5f6',
    accent: '#1d4e5f',
    accentInk: '#ffffff',
    radius: 12,
  },
  'annie-may': {
    headingFont: "Georgia, 'Times New Roman', serif",
    bodyFont: "system-ui, -apple-system, sans-serif",
    bg: '#faf7f1',
    ink: '#2e2b26',
    soft: '#f2ede3',
    accent: '#3e4a3d',
    accentInk: '#f5f1e8',
    radius: 8,
  },
};

export function defaultTheme(propertyId: string): SiteTheme {
  return DEFAULT_THEMES[propertyId] ?? DEFAULT_THEMES['ten-fifty-bakers'];
}

export function newSection(type: SectionType): Section {
  const id = crypto.randomUUID().slice(0, 8);
  switch (type) {
    case 'hero':
      return { id, type, headline: 'Headline', subheadline: 'Subheadline', ctaText: 'Book now', ctaHref: '#' };
    case 'text':
      return { id, type, heading: 'Heading', body: 'Write something…' };
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
  }
}

export const SECTION_TYPES: SectionType[] = ['hero', 'text', 'gallery', 'features', 'quote', 'faq', 'cta'];
