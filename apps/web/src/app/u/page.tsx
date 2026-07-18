import type { Metadata, Viewport } from 'next';
import PhoneUpload from '@/components/PhoneUpload';

export const metadata: Metadata = {
  title: 'Raven — quick upload',
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#533afd',
};

/**
 * Phone-first capture page. Add to the iPhone home screen (Share →
 * Add to Home Screen) and it opens like an app: pick property, tap,
 * shoot or choose from the camera roll, done.
 */
export default function QuickUploadPage() {
  return <PhoneUpload />;
}
