import type { Metadata, Viewport } from 'next';
import { ThemeProvider } from '@/components/providers/theme-provider';
import { Toaster } from '@/components/ui/toaster';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL('https://topshelfteaching.com'),
  title: {
    default: 'TopShelf Teaching - Learn Faster, Learn Smarter',
    template: '%s | TopShelf Teaching',
  },
  description:
    'Master IT skills the most effective way possible. AI-powered learning that adapts to you.',
  keywords: ['learning', 'IT certification', 'education', 'skills', 'training'],
  authors: [{ name: 'TopShelf Service LLC' }],
  creator: 'TopShelf Service LLC',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://topshelfteaching.com',
    siteName: 'TopShelf Teaching',
    title: 'TopShelf Teaching - Learn Faster, Learn Smarter',
    description: 'Master IT skills the most effective way possible.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'TopShelf Teaching',
    description: 'Master IT skills the most effective way possible.',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0f172a' },
  ],
  width: 'device-width',
  initialScale: 1,
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
