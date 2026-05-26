import type { Metadata, Viewport } from 'next';
import './kitchen.css';

export const metadata: Metadata = {
  title: 'Kitchen Training | TopShelf',
  description: 'Line cook training platform — Solve First, Then Teach.',
};

export const viewport: Viewport = {
  themeColor: '#050507',
  width: 'device-width',
  initialScale: 1,
};

export default function KitchenLayout({ children }: { children: React.ReactNode }) {
  return (
    <main id="main-content" className="kitchen-ui min-h-screen">
      {children}
    </main>
  );
}
