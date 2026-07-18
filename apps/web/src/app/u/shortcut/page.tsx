import type { Metadata } from 'next';
import ShortcutGuide from '@/components/ShortcutGuide';

export const metadata: Metadata = {
  title: 'Raven — set up the share-sheet shortcut',
  robots: { index: false, follow: false },
};

export default function ShortcutSetupPage() {
  return <ShortcutGuide />;
}
