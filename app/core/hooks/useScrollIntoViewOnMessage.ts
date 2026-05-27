'use client';

import { useEffect, useRef } from 'react';

export function useScrollIntoViewOnMessage(message?: string | null) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!message) {
      return;
    }

    const node = ref.current;
    if (!node) {
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      node.scrollIntoView({ behavior: 'smooth', block: 'center' });
      node.focus({ preventScroll: true });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [message]);

  return ref;
}
