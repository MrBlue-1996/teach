/**
 * TopShelf Service LLC
 * PROPRIETARY AND CONFIDENTIAL
 * Copyright (c) 2026 TopShelf Service LLC. All Rights Reserved.
 */

import type { Metadata, Viewport } from 'next';
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/montserrat/600.css';
import '@fontsource/montserrat/700.css';
import '@fontsource/montserrat/800.css';
import { ThemeProvider } from '@/components/providers/theme-provider';
import { PwaRegistrar } from '@/components/providers/pwa-registrar';
import { Toaster } from '@/components/ui/toaster';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL('https://topshelfteaching.com'),
  applicationName: 'Top Shelf Teaching',
  manifest: '/manifest.json',
  title: {
    default: 'Top Shelf Teaching — The hardest part is done for you.',
    template: '%s | Top Shelf Teaching',
  },
  description:
    'Master IT skills the most effective way possible. AI-powered learning that adapts to you.',
  keywords: ['learning', 'IT certification', 'education', 'skills', 'training'],
  authors: [{ name: 'Top Shelf Service LLC' }],
  creator: 'Top Shelf Service LLC',
  category: 'education',
  formatDetection: {
    telephone: false,
  },
  appleWebApp: {
    capable: true,
    title: 'TopShelf',
    statusBarStyle: 'black-translucent',
  },
  icons: {
    icon: [
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://topshelfteaching.com',
    siteName: 'Top Shelf Teaching',
    title: 'Top Shelf Teaching — The hardest part is done for you.',
    description: 'Master IT skills the most effective way possible.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Top Shelf Teaching',
    description: 'Master IT skills the most effective way possible.',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#F3F4F6' },
    { media: '(prefers-color-scheme: dark)', color: '#050507' },
  ],
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <PwaRegistrar />
          <a href="#main-content" className="skip-link">
            Skip to main content
          </a>
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
