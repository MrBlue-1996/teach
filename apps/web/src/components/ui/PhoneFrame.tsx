/**
 * TopShelf Service LLC
 * PROPRIETARY AND CONFIDENTIAL
 * Copyright (c) 2026 TopShelf Service LLC. All Rights Reserved.
 */

'use client';

import { clsx } from 'clsx';

export type PhoneModel = 'iphone-14' | 'pixel-7' | 'galaxy-s23';

interface PhoneSpec {
  label: string;
  /** CSS width of the phone frame in px */
  frameWidth: number;
  /** CSS height of the phone frame in px */
  frameHeight: number;
  /** Viewport width passed to iframe */
  viewportWidth: number;
  /** Viewport height of the content area */
  viewportHeight: number;
  /** Border radius of the frame */
  radius: number;
  /** Has a Dynamic Island / pill notch (true) or classic notch (false) */
  pill: boolean;
}

export const PHONE_SPECS: Record<PhoneModel, PhoneSpec> = {
  'iphone-14': {
    label: 'iPhone 14',
    frameWidth: 340,
    frameHeight: 690,
    viewportWidth: 390,
    viewportHeight: 844,
    radius: 54,
    pill: true,
  },
  'pixel-7': {
    label: 'Pixel 7',
    frameWidth: 320,
    frameHeight: 680,
    viewportWidth: 412,
    viewportHeight: 915,
    radius: 44,
    pill: false,
  },
  'galaxy-s23': {
    label: 'Galaxy S23',
    frameWidth: 320,
    frameHeight: 680,
    viewportWidth: 360,
    viewportHeight: 780,
    radius: 44,
    pill: false,
  },
};

interface PhoneFrameProps {
  model?: PhoneModel;
  src: string;
  className?: string;
}

export function PhoneFrame({ model = 'iphone-14', src, className }: PhoneFrameProps) {
  // eslint-disable-next-line security/detect-object-injection
  const spec = PHONE_SPECS[model];

  const scaleW = Math.min(1, (spec.frameWidth - 24) / spec.viewportWidth);
  const scaleH = Math.min(1, (spec.frameHeight - 80) / spec.viewportHeight);
  const scale = Math.min(scaleW, scaleH);

  return (
    <div
      className={clsx('phone-frame relative select-none', className)}
      style={{
        width: spec.frameWidth,
        height: spec.frameHeight,
        borderRadius: spec.radius,
        background: 'hsl(220 20% 8%)',
        border: '3px solid hsl(220 15% 28%)',
        boxShadow:
          '0 0 0 1px hsl(220 15% 16%), 0 32px 80px -12px hsl(220 20% 4% / 0.8), inset 0 2px 4px hsl(0 0% 100% / 0.06)',
        padding: '12px 10px',
        display: 'flex',
        flexDirection: 'column',
        gap: 0,
        overflow: 'hidden',
      }}
      aria-label={`${spec.label} phone preview`}
    >
      {/* Status bar */}
      <div
        style={{
          height: 36,
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
        }}
      >
        {spec.pill ? (
          /* Dynamic Island pill */
          <div
            style={{
              width: 110,
              height: 32,
              borderRadius: 20,
              background: 'hsl(0 0% 0%)',
              border: '2px solid hsl(220 20% 8%)',
            }}
          />
        ) : (
          /* Classic punch-hole camera */
          <div
            style={{
              width: 12,
              height: 12,
              borderRadius: '50%',
              background: 'hsl(220 18% 12%)',
              border: '2px solid hsl(220 20% 8%)',
            }}
          />
        )}
        {/* Signal / battery dots */}
        <div
          style={{
            position: 'absolute',
            right: 16,
            top: '50%',
            transform: 'translateY(-50%)',
            display: 'flex',
            gap: 4,
            alignItems: 'center',
          }}
        >
          <div
            style={{
              width: 22,
              height: 11,
              borderRadius: 3,
              border: '1.5px solid hsl(220 15% 40%)',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                position: 'absolute',
                inset: 2,
                background: 'hsl(142 71% 45%)',
                borderRadius: 1,
                width: '70%',
              }}
            />
          </div>
        </div>
      </div>

      {/* Screen / iframe area */}
      <div
        style={{
          flex: 1,
          borderRadius: spec.radius - 16,
          overflow: 'hidden',
          background: 'hsl(220 20% 6%)',
          position: 'relative',
        }}
      >
        <iframe
          src={src}
          title={`${spec.label} preview`}
          style={{
            width: spec.viewportWidth,
            height: spec.viewportHeight,
            border: 'none',
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
            display: 'block',
          }}
          sandbox="allow-scripts allow-same-origin allow-forms"
        />
      </div>

      {/* Home indicator */}
      <div
        style={{
          height: 24,
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            width: 100,
            height: 4,
            borderRadius: 2,
            background: 'hsl(220 15% 35%)',
          }}
        />
      </div>
    </div>
  );
}
