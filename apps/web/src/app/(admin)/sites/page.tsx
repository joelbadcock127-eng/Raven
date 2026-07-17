import { SITES } from '@/lib/sites';
import SitesWorkspace from '@/components/SitesWorkspace';

export default function SitesPage() {
  return (
    <>

        <header style={{ marginBottom: 32 }}>
          <h1 className="display-lg" style={{ marginBottom: 12 }}>Property websites</h1>
          <p className="caption" style={{ maxWidth: 620 }}>
            Exact mirrors of each live site — the real pages, styles and animations. Browse them
            like a visitor, then flip on edit mode to click any text or image and change it in
            place. Edits save to Raven; the live sites stay untouched until publishing is wired up.
          </p>
        </header>

        <SitesWorkspace sites={SITES} />

        <footer className="caption" style={{ paddingTop: 64 }}>
          Raven · booking-generation platform for Ten Fifty Bakers, The Prescription Pad and Annie May.
        </footer>
    </>
  );
}
