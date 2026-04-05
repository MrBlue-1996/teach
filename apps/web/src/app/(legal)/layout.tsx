import Link from 'next/link';
import { Zap } from 'lucide-react';

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Simple header */}
      <header className="flex h-16 items-center justify-between border-b px-4 md:px-8">
        <Link href="/" className="flex items-center space-x-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <Zap className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="text-xl font-bold">TopShelf</span>
        </Link>
        <nav className="flex gap-4 text-sm text-muted-foreground">
          <Link href="/privacy" className="hover:text-foreground">
            Privacy
          </Link>
          <Link href="/terms" className="hover:text-foreground">
            Terms
          </Link>
        </nav>
      </header>

      {/* Content */}
      <main className="flex-1 px-4 py-12 md:px-8">
        <div className="mx-auto max-w-3xl">{children}</div>
      </main>

      {/* Footer */}
      <footer className="flex h-16 items-center justify-center border-t text-sm text-muted-foreground">
        <p>TopShelf Service LLC. All rights reserved.</p>
      </footer>
    </div>
  );
}
