'use client';

import Link from 'next/link';
import { ArrowLeft, AlertCircle } from 'lucide-react';
import { Card } from '@/app/components/ui/Card';
import { Button } from '@/app/components/ui/Button';
import { CurriculumLifecycleBadge } from '@/app/core/components/curriculum/CurriculumLifecycleBadge';
import type { CurriculumOfferingStatus } from '@/app/core/types/academic';

export function CurriculumLifecycleAccessState({
  title,
  status,
  message,
  backHref,
  backLabel = 'Back',
  primaryHref,
  primaryLabel,
}: {
  title: string;
  status?: CurriculumOfferingStatus | null;
  message: string;
  backHref?: string;
  backLabel?: string;
  primaryHref?: string;
  primaryLabel?: string;
}) {
  return (
    <div className="space-y-6">
      {backHref ? (
        <Link href={backHref}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {backLabel}
          </Button>
        </Link>
      ) : null}

      <Card>
        <div className="space-y-4 p-8 text-center">
          <AlertCircle className="mx-auto h-10 w-10 text-amber-500" />
          <div className="space-y-2">
            <h1 className="text-xl font-semibold text-gray-900">{title}</h1>
            {status ? (
              <div className="flex justify-center">
                <CurriculumLifecycleBadge status={status} />
              </div>
            ) : null}
            <p className="mx-auto max-w-xl text-sm text-gray-600">{message}</p>
          </div>
          {primaryHref && primaryLabel ? (
            <div className="flex justify-center">
              <Link href={primaryHref}>
                <Button>{primaryLabel}</Button>
              </Link>
            </div>
          ) : null}
        </div>
      </Card>
    </div>
  );
}
