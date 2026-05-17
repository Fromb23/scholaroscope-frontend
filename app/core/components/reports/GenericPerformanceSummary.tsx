'use client';

import { BarChart3 } from 'lucide-react';
import type { GenericPerformance } from '@/app/core/types/reporting';
import {
  countEntriesFromMap,
  formatNumber,
  formatPercent,
} from '@/app/core/lib/reportingPresentation';

interface GenericPerformanceSummaryProps {
  performance: GenericPerformance | null | undefined;
  averageGrade?: number | null;
  averageGradeNote?: string | null;
}

export function GenericPerformanceSummary({
  performance,
  averageGrade,
  averageGradeNote,
}: GenericPerformanceSummaryProps) {
  if (!performance && averageGrade == null) return null;

  const distribution = countEntriesFromMap(performance?.distribution_by_letter);
  const statusCounts = countEntriesFromMap(performance?.grade_status_counts);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <BarChart3 className="h-4 w-4 text-blue-600" />
        <h3 className="text-sm font-medium text-gray-900">Generic Numeric Performance</h3>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Generic Numeric Average" value={formatPercent(performance?.average_score ?? averageGrade)} />
        <Metric label="Highest Score" value={formatPercent(performance?.highest_score)} />
        <Metric label="Lowest Score" value={formatPercent(performance?.lowest_score)} />
        <Metric label="Computed Results" value={formatNumber(performance?.computed_count, 0)} />
      </div>

      {averageGradeNote && (
        <p className="text-xs text-gray-500">{averageGradeNote}</p>
      )}

      {(distribution.length > 0 || statusCounts.length > 0) && (
        <div className="grid gap-4 lg:grid-cols-2">
          <CountList title="Generic Numeric Distribution" items={distribution} />
          <CountList title="Result Status" items={statusCounts} />
        </div>
      )}

      {performance?.assessment_type_breakdown && performance.assessment_type_breakdown.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-900">Assessment Type Breakdown</h4>
          <div className="mt-2 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {performance.assessment_type_breakdown.map((item) => (
              <div key={item.assessment_type} className="rounded-lg border border-gray-200 px-3 py-2">
                <p className="text-sm font-medium text-gray-900">{item.assessment_type}</p>
                <p className="mt-1 text-xs text-gray-500">
                  {formatPercent(item.average_score)} average
                </p>
                <p className="text-xs text-gray-500">
                  {formatNumber(item.total_assessments, 0)} assessments
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-gray-200 px-3 py-2">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="mt-1 text-lg font-semibold text-gray-900">{value}</p>
    </div>
  );
}

function CountList({
  title,
  items,
}: {
  title: string;
  items: Array<{ label: string; count: number }>;
}) {
  if (items.length === 0) return null;

  return (
    <div>
      <h4 className="text-sm font-medium text-gray-900">{title}</h4>
      <div className="mt-2 space-y-2">
        {items.map((item) => (
          <div key={item.label} className="flex items-center justify-between rounded-lg border border-gray-200 px-3 py-2">
            <span className="text-sm text-gray-700">{item.label}</span>
            <span className="text-sm font-medium text-gray-900">{item.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
