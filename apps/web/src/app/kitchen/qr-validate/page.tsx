/**
 * TopShelf Service LLC - QR Validation Page
 * PROPRIETARY AND CONFIDENTIAL
 * Copyright (c) 2026 TopShelf Service LLC. All Rights Reserved.
 *
 * Real-world bridge: scan a QR code stuck on a cooler or prep station
 * to prove the physical task was completed. Works with the back-of-house
 * QR validation service.
 */
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, QrCode, CheckCircle2, XCircle } from 'lucide-react';

type ValidationState =
  | { kind: 'idle' }
  | { kind: 'pending'; code: string }
  | { kind: 'approved'; code: string }
  | { kind: 'rejected'; code: string; reason: string };

export default function QRValidatePage() {
  const [code, setCode] = useState('');
  const [state, setState] = useState<ValidationState>({ kind: 'idle' });

  const submit = async () => {
    if (!code.trim()) return;
    setState({ kind: 'pending', code });

    try {
      const res = await fetch('/api/kitchen/qr/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code.trim() }),
      });
      const data = (await res.json()) as { status: string; reason?: string };

      if (data.status === 'approved') {
        setState({ kind: 'approved', code });
      } else {
        const reason = data.reason ?? 'Code was not recognized or is expired.';
        setState({
          kind: 'rejected',
          code,
          reason,
        });
      }
    } catch {
      setState({
        kind: 'rejected',
        code,
        reason: 'Could not reach the validation service.',
      });
    }
  };

  return (
    <main className="kitchen-page qr-page">
      <header className="kitchen-nav">
        <Link href="/kitchen" className="kitchen-nav__back">
          <ArrowLeft size={20} aria-hidden /> Kitchen
        </Link>
      </header>

      <section className="kitchen-card qr-card">
        <QrCode size={64} aria-hidden />
        <h1>Prove the task</h1>
        <p>
          Scan or enter the code posted on the station you just cleaned, temped, or stocked. This
          confirms the physical work happened.
        </p>

        <label className="qr-card__input">
          <span>Validation code</span>
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="e.g. WALK-IN-TMP-042"
            autoFocus
            inputMode="text"
            autoComplete="off"
          />
        </label>

        <button
          type="button"
          onClick={submit}
          className="btn-action btn-primary"
          disabled={state.kind === 'pending' || !code.trim()}
        >
          {state.kind === 'pending' ? 'Validating…' : 'Validate'}
        </button>

        {state.kind === 'approved' && (
          <div className="qr-card__result qr-card__result--approved">
            <CheckCircle2 size={48} aria-hidden />
            <strong>Approved</strong>
            <p>Task logged. Mastery credit applied.</p>
          </div>
        )}
        {state.kind === 'rejected' && (
          <div className="qr-card__result qr-card__result--rejected">
            <XCircle size={48} aria-hidden />
            <strong>Rejected</strong>
            <p>{state.reason}</p>
          </div>
        )}
      </section>
    </main>
  );
}
