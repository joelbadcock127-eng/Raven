import seeds from '@/data/site-seeds.json';

export type SiteBlock =
  | { type: 'heading'; level: number; text: string }
  | { type: 'text'; text: string }
  | { type: 'image'; src: string; alt: string }
  | { type: 'button'; text: string; href: string };

export interface SitePage {
  slug: string;
  navLabel: string;
  title: string;
  blocks: SiteBlock[];
}

export interface SiteTheme {
  /** CSS font-family stacks (fonts loaded in the Sites page) */
  headingFont: string;
  bodyFont: string;
  bg: string;
  ink: string;
  accent: string;
  accentInk: string; // text on accent
  headerBg: string;
  headerInk: string;
}

export interface SiteDef {
  propertyId: string;
  name: string;
  domain: string;
  theme: SiteTheme;
}

/**
 * Visual approximation of each live site (fonts pulled from the real
 * WordPress themes; palettes matched by eye — easy to tweak later).
 */
export const SITES: SiteDef[] = [
  {
    propertyId: 'ten-fifty-bakers',
    name: 'Ten Fifty Bakers',
    domain: 'tenfiftybakers.com.au',
    theme: {
      headingFont: 'var(--font-didact), sans-serif',
      bodyFont: 'var(--font-didact), sans-serif',
      bg: '#f7f3ec',
      ink: '#26211a',
      accent: '#8a6d3b',
      accentInk: '#ffffff',
      headerBg: '#1f1b16',
      headerInk: '#f3ede2',
    },
  },
  {
    propertyId: 'prescription-pad',
    name: 'The Prescription Pad',
    domain: 'theprescriptionpad.com.au',
    theme: {
      headingFont: 'var(--font-comfortaa), sans-serif',
      bodyFont: 'var(--font-varela), sans-serif',
      bg: '#ffffff',
      ink: '#233642',
      accent: '#1d4e5f',
      accentInk: '#ffffff',
      headerBg: '#eef5f6',
      headerInk: '#1d4e5f',
    },
  },
  {
    propertyId: 'annie-may',
    name: 'Annie May',
    domain: 'anniemay.com.au',
    theme: {
      headingFont: 'var(--font-lora), Georgia, serif',
      bodyFont: 'var(--font-quicksand), sans-serif',
      bg: '#faf7f1',
      ink: '#2e2b26',
      accent: '#3e4a3d',
      accentInk: '#f5f1e8',
      headerBg: '#3e4a3d',
      headerInk: '#f5f1e8',
    },
  },
];

export function seedPages(propertyId: string): SitePage[] {
  const entry = (seeds as Record<string, { pages: SitePage[] }>)[propertyId];
  return entry?.pages ?? [];
}
