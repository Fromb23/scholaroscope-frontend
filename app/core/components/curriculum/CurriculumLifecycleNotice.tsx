'use client';

import { AlertCircle, Clock3, Info, ShieldAlert } from 'lucide-react';
import { Card } from '@/app/components/ui/Card';
import { CurriculumLifecycleBadge } from '@/app/core/components/curriculum/CurriculumLifecycleBadge';
import { getCurriculumStatusMessage } from '@/app/core/lib/curriculumLifecycle';
import type { CurriculumOfferingStatus } from '@/app/core/types/academic';

function renderNoticeIcon(status?: CurriculumOfferingStatus | null) {
  switch (status) {
    case 'DRAINING':
    case 'DISABLE_REQUESTED':
    case 'REACTIVATING':
      return <Clock3 className="mt-0.5 h-4 w-4 shrink-0" />;
    case 'FAILED':
      return <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />;
    case 'FINALIZING':
    case 'DISABLED':
      return <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />;
    default:
      return <Info className="mt-0.5 h-4 w-4 shrink-0" />;
  }
}

function getNoticeStyles(status?: CurriculumOfferingStatus | null): string {
  switch (status) {
    case 'ACTIVE':
      return 'border-green-200 bg-green-50 text-green-800';
    case 'DISABLE_REQUESTED':
    case 'DRAINING':
      return 'border-amber-200 bg-amber-50 text-amber-800';
    case 'FINALIZING':
      return 'border-blue-200 bg-blue-50 text-blue-800';
    case 'DISABLED':
      return 'border-gray-200 bg-gray-50 text-gray-800';
    case 'REACTIVATING':
      return 'border-sky-200 bg-sky-50 text-sky-800';
    case 'FAILED':
      return 'border-red-200 bg-red-50 text-red-800';
    default:
      return 'border-gray-200 bg-gray-50 text-gray-800';
  }
}

export function CurriculumLifecycleNotice({
  status,
  title,
  message,
  role = 'ADMIN',
}: {
  status?: CurriculumOfferingStatus | null;
  title?: string;
  message?: string | null;
  role?: 'ADMIN' | 'INSTRUCTOR' | 'SUPERADMIN';
}) {
  return (
    <Card className={`${getNoticeStyles(status)} p-4`}>
      <div className="flex items-start gap-3">
        {renderNoticeIcon(status)}
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold">
              {title ?? 'Curriculum status'}
            </p>
            <CurriculumLifecycleBadge status={status} />
          </div>
          <p className="text-sm">
            {message ?? getCurriculumStatusMessage(status, role)}
          </p>
        </div>
      </div>
    </Card>
  );
}
