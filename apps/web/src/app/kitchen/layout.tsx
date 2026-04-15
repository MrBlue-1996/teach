import type { Metadata, Viewport } from 'next';
import './kitchen.css';

export const metadata: Metadata = {
  title: 'Kitchen Training | TopShelf',
  description: 'Line cook training platform — Solve First, Then Teach.',
};

export const viewport: Viewport = {
  themeColor: '#111318',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function KitchenLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="kitchen-ui min-h-screen">
      {children}
    </div>
  );
}
