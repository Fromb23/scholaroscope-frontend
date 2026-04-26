// ============================================================================
// app/plugins/cambridge/components/ProgressCard.tsx
//
// Card displaying a student's or cohort's Cambridge progress summary.
// ============================================================================

'use client';

import type { CambridgeSubjectProgress } from '../types';
import { Card } from '@/app/components/ui/Card';

interface ProgressCardProps {
  progress: CambridgeSubjectProgress;
}

export function ProgressCard({ progress }: ProgressCardProps) {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h3 className="font-semibold text-gray-900">{progress.title}</h3>
          <p className="text-sm text-gray-500">
            {progress.programme_code} · {progress.structure_mode}
          </p>
        </div>
        <p className="text-lg font-bold text-blue-700">{progress.progress_percentage.toFixed(1)}%</p>
      </div>
      <div className="mt-2 text-sm text-gray-600">
        {progress.covered_units}/{progress.total_units} units · {progress.status}
      </div>
    </Card>
  );
}
