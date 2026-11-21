'use client';

import { track } from '@lab/analytics/client';
import { useState } from 'react';
import type { AppEvent } from '@/lib/events';

export function HelloButton() {
  const [clicks, setClicks] = useState(0);
  return (
    <button
      type="button"
      data-testid="hello-button"
      onClick={() => {
        setClicks((c) => c + 1);
        track<AppEvent>('hello_click', { n: clicks + 1 });
      }}
      style={{ fontSize: 18, padding: '12px 20px', borderRadius: 12, border: 0, background: '#4f8cff', color: '#fff' }}
    >
      {clicks ? `Нажато: ${clicks}` : 'Нажми меня'}
    </button>
  );
}
