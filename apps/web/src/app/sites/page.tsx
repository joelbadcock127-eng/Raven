import Link from 'next/link';
import { Didact_Gothic, Comfortaa, Varela_Round, Quicksand, Lora } from 'next/font/google';
import { supabaseAdmin } from '@/lib/supabase';
import { SITES, seedPages, type SitePage } from '@/lib/sites';
import SitesWorkspace, { type WorkspaceSite } from '@/components/SitesWorkspace';

export const revalidate = 0; // always show latest edits

const didact = Didact_Gothic({ subsets: ['latin'], weight: '400', variable: '--font-didact' });
const comfortaa = Comfortaa({ subsets: ['latin'], variable: '--font-comfortaa' });
const varela = Varela_Round({ subsets: ['latin'], weight: '400', variable: '--font-varela' });
const quicksand = Quicksand({ subsets: ['latin'], variable: '--font-quicksand' });
const lora = Lora({ subsets: ['latin'], variable: '--font-lora' });

interface DbPageRow {
  property_id: string;
  slug: string;
  nav_label: string;
  title: string;
  blocks: SitePage['blocks'];
}

async function getSites(): Promise<WorkspaceSite[]> {
  const supabase = supabaseAdmin();
  let overrides: DbPageRow[] = [];
  if (supabase) {
    const { data } = await supabase
      .from('site_pages')
      .select('property_id, slug, nav_label, title, blocks');
    overrides = (data as DbPageRow[]) ?? [];
  }

  return SITES.map((def) => {
    const seeds = seedPages(def.propertyId);
    const pages = seeds.map((seed) => {
      const o = overrides.find((r) => r.property_id === def.propertyId && r.slug === seed.slug);
      return o
        ? { slug: o.slug, navLabel: o.nav_label, title: o.title, blocks: o.blocks }
        : seed;
    });
    return { def, pages, seedPages: seeds };
  });
}

export default async function SitesPage() {
  const sites = await getSites();
  const fontVars = [didact, comfortaa, varela, quicksand, lora]
    .map((f) => f.variable)
    .join(' ');

  return (
    <main className={fontVars} style={{ position: 'relative', minHeight: '100vh' }}>
      <div className="mesh" />
      <div style={{ position: 'relative', maxWidth: 1240, margin: '0 auto', padding: '0 24px 96px' }}>
        <nav style={{ display: 'flex', alignItems: 'center', gap: 24, padding: '24px 0 48px' }}>
          <span className="heading-md" style={{ fontWeight: 400, letterSpacing: '-0.4px' }}>
            Raven
          </span>
          <span style={{ flex: 1 }} />
          <Link href="/" className="caption">Feed</Link>
          <span className="caption" style={{ color: 'var(--ink)', fontWeight: 500 }}>Sites</span>
        </nav>

        <header style={{ marginBottom: 32 }}>
          <h1 className="display-lg" style={{ marginBottom: 12 }}>Property websites</h1>
          <p className="caption" style={{ maxWidth: 620 }}>
            A working clone of each property&apos;s live site, pulled from the current WordPress
            pages. Click through the pages exactly like a visitor would, then flip on edit mode to
            change any heading, paragraph, image or button. Edits save to Raven — the live sites
            stay untouched until we wire up publishing.
          </p>
        </header>

        <SitesWorkspace sites={sites} />

        <footer className="caption" style={{ paddingTop: 64 }}>
          Raven · booking-generation platform for Ten Fifty Bakers, The Prescription Pad and Annie May.
        </footer>
      </div>
    </main>
  );
}
