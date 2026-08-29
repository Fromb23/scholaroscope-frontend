'use client';

import { useMemo, useState } from 'react';
import { BookOpen } from 'lucide-react';
import { Input } from '@/app/components/ui/Input';
import { LoadingSpinner } from '@/app/components/ui/LoadingSpinner';
import { useCbcLessonPlanOutcomes } from '@/app/plugins/cbc/hooks/useCbcLessonPlanOutcomes';
import {
  AssessmentObjectiveSource,
  type AssessmentObjectiveSelectorProps,
} from '@/app/core/types/assessment';
import type { CbcLessonPlanOutcomeOption } from '@/app/plugins/cbc/types/cbc';

function optionText(outcome: CbcLessonPlanOutcomeOption): string {
  return `${outcome.code} ${outcome.text} ${outcome.strand.name} ${outcome.sub_strand.name}`.toLowerCase();
}

export function CbcAssessmentObjectiveSelector({
  cohortSubjectId,
  value,
  onChange,
}: AssessmentObjectiveSelectorProps) {
  const [search, setSearch] = useState('');
  const { data: outcomes = [], isLoading, error } = useCbcLessonPlanOutcomes(cohortSubjectId);
  const searchQuery = search.trim().toLowerCase();

  const visibleOutcomes = useMemo(() => (
    searchQuery
      ? outcomes.filter((outcome) => optionText(outcome).includes(searchQuery))
      : outcomes
  ).slice(0, 30), [outcomes, searchQuery]);

  if (isLoading) {
    return <LoadingSpinner size="sm" fullScreen={false} message="Loading learning objectives" />;
  }

  if (error || outcomes.length === 0) {
    return (
      <p className="text-sm text-gray-500">
        No curriculum learning objectives are available for this class subject.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <Input
        label="Search curriculum learning outcomes"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder="Search by code, strand, or objective"
      />
      <div className="max-h-72 space-y-2 overflow-y-auto rounded-lg border border-gray-200 p-2">
        {visibleOutcomes.map((outcome) => {
          const selected = value.provider === 'cbc'
            && value.referenceId === String(outcome.outcome_id);
          return (
            <button
              type="button"
              key={outcome.outcome_id}
              onClick={() => onChange({
                source: AssessmentObjectiveSource.CURRICULUM_OUTCOME,
                provider: 'cbc',
                referenceId: String(outcome.outcome_id),
                text: outcome.text,
              })}
              className={[
                'w-full rounded-lg border px-3 py-2 text-left transition-colors',
                selected
                  ? 'border-blue-300 bg-blue-50'
                  : 'border-gray-200 bg-white hover:border-gray-300',
              ].join(' ')}
            >
              <span className="flex items-start gap-2">
                <BookOpen className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-gray-900">
                    {outcome.code}
                  </span>
                  <span className="block text-sm text-gray-700">{outcome.text}</span>
                  <span className="mt-1 block text-xs text-gray-500">
                    {outcome.strand.name} - {outcome.sub_strand.name}
                  </span>
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
