/**
 * TopShelf Service LLC - TempGauge Component
 * Copyright (c) 2026 TopShelf Service LLC. All Rights Reserved.
 */
'use client';

import { clsx } from 'clsx';

interface TempGaugeProps {
  label: string;
  value: number;
  min: number;
  max: number;
  unit?: 'F' | 'C';
  onChange?: (v: number) => void;
  editable?: boolean;
}

/** FDA temperature danger zone in Fahrenheit */
const DANGER_LOW = 40;
const DANGER_HIGH = 140;

export function TempGauge({
  label,
  value,
  min,
  max,
  unit = 'F',
  onChange,
  editable,
}: TempGaugeProps) {
  const inRange = value >= min && value <= max;
  const inDanger = unit === 'F' ? value > DANGER_LOW && value < DANGER_HIGH : false;

  const state = inDanger ? 'danger' : inRange ? 'safe' : value < min ? 'cold' : 'hot';

  return (
    <div className={clsx('temp-gauge', state)}>
      <span className="temp-gauge__label">{label}</span>
      <div className="temp-gauge__readout">
        <span className="temp-gauge__value">{value}</span>
        <span className="temp-gauge__unit">°{unit}</span>
      </div>
      {editable && onChange && (
        <input
          type="range"
          min={-20}
          max={500}
          step={1}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="temp-gauge__slider"
          aria-label={`${label} temperature`}
        />
      )}
      <span className="temp-gauge__target">
        Target {min}–{max}°{unit}
      </span>
    </div>
  );
}
