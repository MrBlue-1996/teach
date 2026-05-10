/**
 * TopShelf Service LLC
 * PROPRIETARY AND CONFIDENTIAL
 * Copyright (c) 2026 TopShelf Service LLC. All Rights Reserved.
 */

import type { PlainTextStimulus as PlainTextStimulusData } from './types';

interface PlainTextStimulusProps {
  stimulus: PlainTextStimulusData;
}

export function PlainTextStimulus({ stimulus }: PlainTextStimulusProps) {
  const text = stimulus.lines.join('\n');
  return (
    <section className="kitchen-card" aria-label="Plain text stimulus">
      {stimulus.monospace ? (
        <pre className="whitespace-pre-wrap rounded bg-black/20 p-3 font-mono text-sm">{text}</pre>
      ) : (
        <div className="space-y-2 text-sm">
          {stimulus.lines.map((line, index) => (
            <p key={`${index}-${line}`}>{line}</p>
          ))}
        </div>
      )}
    </section>
  );
}
