'use client';

import Link from 'next/link';
import { Info } from 'lucide-react';
import { Button } from '@/app/components/ui/Button';
import type { AcademicLifecycleContext } from '@/app/core/types/academic';
import {
  resolveAcademicLifecyclePresentation,
  type LifecycleActorKind,
} from '@/app/core/lib/academicLifecyclePresentation';

export function AcademicTransitionPrompt({
  context,
  actor,
}: {
  context: AcademicLifecycleContext | null | undefined;
  actor: LifecycleActorKind;
}) {
  const presentation = resolveAcademicLifecyclePresentation(context, actor);
  if (!presentation.shouldRender) return null;

  return (
    <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-950">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <Info className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
          <div>
            <h2 className="text-sm font-semibold">{presentation.title}</h2>
            <p className="mt-1 text-sm">{presentation.message}</p>
          </div>
        </div>
        {presentation.actionHref && presentation.actionLabel ? (
          <Link href={presentation.actionHref}>
            <Button type="button" size="sm" variant="secondary">
              {presentation.actionLabel}
            </Button>
          </Link>
        ) : null}
      </div>
    </section>
  );
}

export function LifecycleDisabledActionInfo({
  context,
  actor,
}: {
  context: AcademicLifecycleContext | null | undefined;
  actor: LifecycleActorKind;
}) {
  const presentation = resolveAcademicLifecyclePresentation(context, actor);
  if (!presentation.disabledTeachingReason) return null;

  return (
    <span className="relative inline-flex group">
      <button
        type="button"
        className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-gray-200 text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
        aria-label="Why this action is disabled"
        aria-describedby="academic-lifecycle-disabled-reason"
      >
        <Info className="h-4 w-4" aria-hidden="true" />
      </button>
      <span
        id="academic-lifecycle-disabled-reason"
        role="tooltip"
        className="pointer-events-none absolute right-0 top-8 z-20 hidden w-72 rounded-lg border border-gray-200 bg-white p-3 text-left text-xs text-gray-700 shadow-lg group-focus-within:block group-hover:block"
      >
        {presentation.disabledTeachingReason}
      </span>
    </span>
  );
}
