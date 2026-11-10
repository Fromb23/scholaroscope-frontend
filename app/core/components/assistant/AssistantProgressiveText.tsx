'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

const MAX_REVEAL_DURATION_MS = 2500;

export function splitAssistantGraphemes(text: string): string[] {
  if (typeof Intl !== 'undefined' && 'Segmenter' in Intl) {
    const segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' });
    return Array.from(segmenter.segment(text), ({ segment }) => segment);
  }
  return Array.from(text);
}

export function assistantRevealDuration(graphemeCount: number): number {
  if (graphemeCount <= 0) return 0;
  return Math.min(MAX_REVEAL_DURATION_MS, Math.max(320, graphemeCount * 24));
}

export function isStructuredAssistantMarkdown(text: string): boolean {
  if (/```|~~~/.test(text)) return true;
  const lines = text.split(/\r?\n/);
  return lines.some((line, index) => (
    line.includes('|')
    && index + 1 < lines.length
    && /^\s*\|?(?:\s*:?-{3,}:?\s*\|)+\s*$/.test(lines[index + 1])
  ));
}

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (!window.matchMedia) return;
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(query.matches);
    update();
    query.addEventListener?.('change', update);
    return () => query.removeEventListener?.('change', update);
  }, []);
  return reduced;
}

interface AssistantProgressiveTextProps {
  text: string;
  active: boolean;
  revealKey?: string | number;
  onComplete?: () => void;
  onProgress?: () => void;
}

export function AssistantProgressiveText({
  text,
  active,
  revealKey,
  onComplete,
  onProgress,
}: AssistantProgressiveTextProps) {
  const reducedMotion = usePrefersReducedMotion();
  const graphemes = useMemo(() => splitAssistantGraphemes(text), [text]);
  const shouldAnimate = active
    && graphemes.length > 0
    && !reducedMotion
    && !isStructuredAssistantMarkdown(text);
  const [visibleCount, setVisibleCount] = useState(shouldAnimate ? 0 : graphemes.length);
  const visibleCountRef = useRef(visibleCount);
  const callbacksRef = useRef({ onComplete, onProgress });
  const revealIdentity = `${String(revealKey ?? '')}\u0000${text}`;
  const revealRef = useRef({
    identity: revealIdentity,
    settled: !active,
    completionNotified: false,
    skipped: !active,
  });

  useEffect(() => {
    callbacksRef.current = { onComplete, onProgress };
  }, [onComplete, onProgress]);

  const updateVisibleCount = (count: number) => {
    visibleCountRef.current = count;
    setVisibleCount(count);
  };

  useEffect(() => {
    const identityChanged = revealRef.current.identity !== revealIdentity;
    if (identityChanged) {
      revealRef.current = {
        identity: revealIdentity,
        settled: !active,
        completionNotified: false,
        skipped: !active,
      };
      updateVisibleCount(active && shouldAnimate ? 0 : graphemes.length);
    }

    if (!shouldAnimate) {
      updateVisibleCount(graphemes.length);
      revealRef.current.settled = true;
      if (active && !revealRef.current.completionNotified) {
        revealRef.current.completionNotified = true;
        callbacksRef.current.onComplete?.();
      }
      return;
    }

    if (revealRef.current.settled || revealRef.current.skipped) {
      updateVisibleCount(graphemes.length);
      return;
    }

    const startingCount = identityChanged ? 0 : Math.min(
      visibleCountRef.current,
      graphemes.length,
    );
    const duration = assistantRevealDuration(graphemes.length);
    const startedAt = performance.now() - (duration * startingCount / graphemes.length);
    let frame = 0;
    const reveal = (now: number) => {
      if (revealRef.current.identity !== revealIdentity || revealRef.current.skipped) return;
      const progress = Math.min(1, (now - startedAt) / duration);
      const nextCount = Math.min(graphemes.length, Math.max(1, Math.ceil(progress * graphemes.length)));
      updateVisibleCount(nextCount);
      callbacksRef.current.onProgress?.();
      if (progress < 1) {
        frame = requestAnimationFrame(reveal);
      } else if (!revealRef.current.settled) {
        revealRef.current.settled = true;
        if (!revealRef.current.completionNotified) {
          revealRef.current.completionNotified = true;
          callbacksRef.current.onComplete?.();
        }
      }
    };
    frame = requestAnimationFrame(reveal);
    return () => cancelAnimationFrame(frame);
  }, [active, graphemes, revealIdentity, shouldAnimate]);

  const revealAll = () => {
    revealRef.current.skipped = true;
    revealRef.current.settled = true;
    updateVisibleCount(graphemes.length);
    if (!revealRef.current.completionNotified) {
      revealRef.current.completionNotified = true;
      callbacksRef.current.onComplete?.();
    }
  };

  return (
    <div>
      <p className="whitespace-pre-wrap text-sm leading-6 theme-text">
        {graphemes.slice(0, visibleCount).join('')}
      </p>
      {shouldAnimate && visibleCount < graphemes.length ? (
        <button
          type="button"
          onClick={revealAll}
          className="theme-focus-ring mt-2 rounded text-xs font-medium text-[color:var(--brand-primary)] underline"
        >
          Show full response
        </button>
      ) : null}
    </div>
  );
}
