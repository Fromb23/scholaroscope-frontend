'use client';

import { ClipboardCheck } from 'lucide-react';
import type { CbcPerformance } from '@/app/core/types/reporting';
import {
  formatNumber,
  formatPercent,
} from '@/app/core/lib/reportingPresentation';
import { CbcCodeDistribution } from './CbcCodeDistribution';

interface CbcPerformanceSummaryProps {
  performance: CbcPerformance | null | undefined;
}

export function CbcPerformanceSummary({
  performance,
}: CbcPerformanceSummaryProps) {
  if (!performance) return null;

  const resultCounts = performance.result_counts ?? {
    FINAL: 0,
    NOT_IN_SCOPE: 0,
    NO_EVIDENCE: 0,
    LATE_ENTRY_BASELINE_PENDING: 0,
    PROVISIONAL_EVIDENCE: 0,
    PROVISIONAL: 0,
    INCOMPLETE: 0,
    stale_count: 0,
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <ClipboardCheck className="h-4 w-4 text-green-600" />
        <h3 className="text-sm font-medium text-gray-900">CBC Results Summary</h3>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Learners" value={formatNumber(performance.learner_count, 0)} />
        <Metric label="Final Results" value={formatNumber(resultCounts.FINAL, 0)} />
        <Metric label="Missing Results" value={formatNumber(performance.missing_result_count, 0)} />
        <Metric label="Stale Results" value={formatNumber(resultCounts.stale_count, 0)} />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Baseline pending" value={formatNumber(resultCounts.LATE_ENTRY_BASELINE_PENDING ?? 0, 0)} />
        <Metric label="Provisional evidence" value={formatNumber(resultCounts.PROVISIONAL_EVIDENCE ?? resultCounts.PROVISIONAL, 0)} />
        <Metric label="No evidence" value={formatNumber(resultCounts.NO_EVIDENCE ?? resultCounts.INCOMPLETE, 0)} />
      </div>

      <div>
        <h4 className="text-sm font-medium text-gray-900">CBC Code Distribution</h4>
        <div className="mt-2">
          <CbcCodeDistribution distribution={performance.distribution_by_code} />
        </div>
      </div>

      {performance.note && (
        <p className="text-xs text-gray-500">{performance.note}</p>
      )}

      <details className="rounded-md border border-gray-200 p-3">
        <summary className="cursor-pointer text-sm font-semibold text-gray-900">Assessment computation details</summary>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Metric label="Average Weighted Score" value={formatPercent(performance.average_weighted_score)} />
          <Metric label="Average Points" value={formatNumber(performance.average_points)} />
        </div>
      </details>
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
