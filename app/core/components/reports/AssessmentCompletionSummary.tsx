'use client';

import { CheckCircle2 } from 'lucide-react';
import type { AssessmentCompletion } from '@/app/core/types/reporting';
import { formatNumber, getAssessmentCompletionRatio } from '@/app/core/lib/reportingPresentation';

interface AssessmentCompletionSummaryProps {
  completion: AssessmentCompletion | null | undefined;
}

export function AssessmentCompletionSummary({
  completion,
}: AssessmentCompletionSummaryProps) {
  if (!completion) return null;

  const ratio = getAssessmentCompletionRatio(completion);

  return (
    <div className="rounded-lg border border-gray-200 px-4 py-3">
      <div className="flex items-center gap-2">
        <CheckCircle2 className="h-4 w-4 text-blue-600" />
        <h3 className="text-sm font-medium text-gray-900">Assessment Completion</h3>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <Metric label="Total Assessments" value={formatNumber(completion.total_assessments, 0)} />
        <Metric label="Finalized" value={formatNumber(completion.finalized_assessments, 0)} />
        <Metric label="Draft" value={formatNumber(completion.draft_assessments, 0)} />
        <Metric label="Active" value={formatNumber(completion.active_assessments, 0)} />
        <Metric label="Missing Scores" value={formatNumber(completion.missing_scores_count, 0)} />
        <Metric
          label="Completed Scores"
          value={formatNumber(
            completion.completed_scores ?? completion.finalized_assessments,
            0,
          )}
        />
      </div>

      {ratio != null && (
        <div className="mt-4">
          <div className="mb-1 flex items-center justify-between text-xs text-gray-500">
            <span>Completion</span>
            <span>{ratio.toFixed(1)}%</span>
          </div>
          <div className="h-2 rounded-full bg-gray-100">
            <div
              className="h-2 rounded-full bg-blue-500"
              style={{ width: `${ratio}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-gray-500">{label}</p>
      <p className="mt-1 text-base font-semibold text-gray-900">{value}</p>
    </div>
  );
}
