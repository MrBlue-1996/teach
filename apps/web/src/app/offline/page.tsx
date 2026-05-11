/**
 * TopShelf Service LLC
 * PROPRIETARY AND CONFIDENTIAL
 * Copyright (c) 2026 TopShelf Service LLC. All Rights Reserved.
 */

import Link from 'next/link';

export const metadata = {
  title: 'Offline | Top Shelf Teaching',
  description: 'Offline fallback page for the Top Shelf Teaching PWA.',
};

export default function OfflinePage() {
  return (
    <main id="main-content" className="min-h-screen bg-[#050507] px-6 py-10 text-[#F3F4F6]">
      <section className="mx-auto flex min-h-[70vh] max-w-2xl flex-col justify-center">
        <p className="mb-3 text-sm font-semibold uppercase tracking-[0.24em] text-[#22C55E]">
          Offline mode
        </p>

        <h1 className="font-heading text-4xl font-bold tracking-tight sm:text-5xl">
          Connection dropped. Training state is protected.
        </h1>

        <p className="mt-5 text-lg leading-8 text-slate-300">
          The app shell is available, but protected actions like saved progress, manager sign-off,
          and account updates require a network connection. Reconnect before assuming any new work
          has been saved.
        </p>

        <div className="mt-8 rounded-2xl border border-slate-700 bg-[#181A1F] p-5 shadow-lg">
          <h2 className="text-lg font-semibold text-white">Safe next steps</h2>
          <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-300">
            <li>Reconnect to Wi-Fi or mobile data.</li>
            <li>Return to the kitchen dashboard after the connection is restored.</li>
            <li>Do not treat offline actions as saved until the app confirms them online.</li>
          </ul>
        </div>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/kitchen"
            className="inline-flex items-center justify-center rounded-xl bg-[#22C55E] px-5 py-3 text-sm font-bold text-[#050507] transition hover:opacity-90"
          >
            Return to kitchen
          </Link>

          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-xl border border-slate-600 px-5 py-3 text-sm font-semibold text-[#F3F4F6] transition hover:bg-[#181A1F]"
          >
            Go home
          </Link>
        </div>
      </section>
    </main>
  );
}
