import type { Metadata, Viewport } from 'next';
import { Inter, Montserrat } from 'next/font/google';
import { ThemeProvider } from '@/components/providers/theme-provider';
import { Toaster } from '@/components/ui/toaster';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
  weight: ['400', '500', '600'],
});

const montserrat = Montserrat({
  subsets: ['latin'],
  variable: '--font-montserrat',
  display: 'swap',
  weight: ['600', '700', '800'],
});

export const metadata: Metadata = {
  metadataBase: new URL('https://topshelfteaching.com'),
  title: {
    default: 'Top Shelf Teaching — The hardest part is done for you.',
    template: '%s | Top Shelf Teaching',
  },
  description:
    'Master IT skills the most effective way possible. AI-powered learning that adapts to you.',
  keywords: ['learning', 'IT certification', 'education', 'skills', 'training'],
  authors: [{ name: 'Top Shelf Service LLC' }],
  creator: 'Top Shelf Service LLC',
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
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${inter.variable} ${montserrat.variable}`}>
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
