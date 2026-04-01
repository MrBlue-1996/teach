import Link from 'next/link';
import { Zap } from 'lucide-react';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Simple header */}
      <header className="flex h-16 items-center justify-center border-b">
        <Link href="/" className="flex items-center space-x-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <Zap className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="text-xl font-bold">TopShelf</span>
        </Link>
      </header>

      {/* Auth content */}
      <main className="flex flex-1 items-center justify-center p-4">
        <div className="w-full max-w-md">{children}</div>
      </main>

      {/* Minimal footer */}
      <footer className="flex h-16 items-center justify-center text-sm text-muted-foreground">
        © 2026 TopShelf Service LLC
      </footer>
    </div>
  );
}
