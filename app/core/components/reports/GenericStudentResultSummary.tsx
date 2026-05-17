'use client';

import { FileDigit } from 'lucide-react';
import type { GenericStudentSection } from '@/app/core/types/reporting';
import {
  formatDateTime,
  formatPercent,
  resolveGenericStudentResult,
} from '@/app/core/lib/reportingPresentation';
import { GradeBadge } from './GradeBadge';

interface GenericStudentResultSummaryProps {
  generic: GenericStudentSection | null | undefined;
}

export function GenericStudentResultSummary({
  generic,
}: GenericStudentResultSummaryProps) {
  const resolved = resolveGenericStudentResult(generic);

  if (
    resolved.finalScore == null
    && resolved.averageScore == null
    && resolved.weightedAverage == null
    && !resolved.letterGrade
    && !resolved.note
    && !resolved.componentScores
  ) {
    return (
      <p className="text-sm text-gray-500">
        No generic numeric result is available yet.
      </p>
    );
  }

  const componentEntries = Object.entries(resolved.componentScores ?? {});

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <FileDigit className="h-4 w-4 text-blue-600" />
        <h3 className="text-sm font-medium text-gray-900">Generic Numeric Result</h3>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Final Score" value={formatPercent(resolved.finalScore)} />
        <Metric label="Generic Numeric Average" value={formatPercent(resolved.averageScore ?? resolved.weightedAverage)} />
        <Metric
          label="Position"
          value={
            resolved.position != null && resolved.totalInClass != null
              ? `${resolved.position}/${resolved.totalInClass}`
              : '—'
          }
        />
        <Metric label="Policy" value={resolved.policyName ?? '—'} />
      </div>

      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px]">
        <div>
          {componentEntries.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-900">Component Scores</h4>
              <div className="mt-2 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                {componentEntries.map(([key, value]) => (
                  <div key={key} className="rounded-lg border border-gray-200 px-3 py-2">
                    <p className="text-xs text-gray-500">{key.replace(/_/g, ' ')}</p>
                    <p className="mt-1 text-sm font-medium text-gray-900">
                      {typeof value === 'number' ? `${value.toFixed(1)}%` : String(value)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="rounded-lg border border-gray-200 px-4 py-3">
          <p className="text-xs text-gray-500">Grade</p>
          <div className="mt-2">
            <GradeBadge
              grade={resolved.letterGrade ?? ''}
              label={resolved.letterLabel ?? undefined}
              status={resolved.gradeStatus ?? undefined}
            />
          </div>
          <p className="mt-4 text-xs text-gray-500">Computed At</p>
          <p className="mt-1 text-sm text-gray-900">{formatDateTime(resolved.computedAt)}</p>
        </div>
      </div>

      {resolved.note && (
        <p className="text-xs text-gray-500">{resolved.note}</p>
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-gray-200 px-3 py-2">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="mt-1 text-base font-semibold text-gray-900">{value}</p>
    </div>
  );
}
