/**
 * TopShelf Service LLC - SafetyAlert Component
 * Copyright (c) 2026 TopShelf Service LLC. All Rights Reserved.
 *
 * Full-screen critical-violation overlay. Only used for the handful of
 * infractions that would actually stop a shift in a real kitchen.
 */
'use client';

import { AlertTriangle } from 'lucide-react';

interface SafetyAlertProps {
  open: boolean;
  headline: string;
  subtext?: string;
  onDismiss: () => void;
}

export function SafetyAlert({ open, headline, subtext, onDismiss }: SafetyAlertProps) {
  if (!open) return null;

  return (
    <div className="safety-alert-overlay" role="alertdialog" aria-modal="true">
      <div className="safety-alert-overlay__body">
        <AlertTriangle size={96} aria-hidden className="safety-alert-overlay__icon" />
        <h2 className="safety-alert-overlay__headline">{headline}</h2>
        {subtext && <p className="safety-alert-overlay__subtext">{subtext}</p>}
        <button
          type="button"
          onClick={onDismiss}
          className="btn-action btn-danger safety-alert-overlay__btn"
        >
          Acknowledge
        </button>
      </div>
    </div>
  );
}
