'use client';

import { Search, Save } from 'lucide-react';
import { Button } from '@/app/components/ui/Button';
import { Card } from '@/app/components/ui/Card';
import { AssessmentScoreTable } from '@/app/core/components/assessments/AssessmentScoreTable';
import type {
    AssessmentDetail,
    AssessmentScore,
    AssessmentScoreDraft,
} from '@/app/core/types/assessment';

interface AssessmentScoreEntryCardProps {
    assessment: AssessmentDetail;
    scores: AssessmentScore[];
    draft: Record<number, AssessmentScoreDraft>;
    loading: boolean;
    readOnly: boolean;
    canSave: boolean;
    saving: boolean;
    searchQuery: string;
    visibleLearnerCount: number;
    totalLearnerCount: number;
    onSearchQueryChange: (value: string) => void;
    onSave: () => void;
    onScoreChange: (studentId: number, field: keyof AssessmentScoreDraft, value: number | string | null) => void;
}

export function AssessmentScoreEntryCard({
    assessment,
    scores,
    draft,
    loading,
    readOnly,
    canSave,
    saving,
    searchQuery,
    visibleLearnerCount,
    totalLearnerCount,
    onSearchQueryChange,
    onSave,
    onScoreChange,
}: AssessmentScoreEntryCardProps) {
    return (
        <Card>
            <div className="p-4">
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <h2 className="text-base font-semibold text-gray-900">
                        {readOnly ? 'Scores' : 'Enter Scores'}
                    </h2>
                    <div className="flex shrink-0 flex-wrap gap-2">
                        {!readOnly && canSave && (
                            <Button size="sm" onClick={onSave} disabled={saving}>
                                <Save className="h-4 w-4 sm:mr-1.5" />
                                <span className="hidden sm:inline">
                                    {saving ? 'Saving…' : 'Save Scores'}
                                </span>
                            </Button>
                        )}
                    </div>
                </div>
                <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                    <div className="w-full lg:max-w-md">
                        <label
                            htmlFor="assessment-score-search"
                            className="mb-1.5 block text-sm font-medium text-gray-700"
                        >
                            Search learners
                        </label>
                        <div className="relative">
                            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                            <input
                                id="assessment-score-search"
                                type="search"
                                value={searchQuery}
                                onChange={(event) => onSearchQueryChange(event.target.value)}
                                placeholder="Search admission number or learner name..."
                                className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                    </div>
                    <p className="text-sm text-gray-500">
                        Showing {visibleLearnerCount} of {totalLearnerCount} learners
                    </p>
                </div>
                <AssessmentScoreTable
                    assessment={assessment}
                    scores={scores}
                    draft={draft}
                    loading={loading}
                    readOnly={readOnly}
                    onScoreChange={onScoreChange}
                />
            </div>
        </Card>
    );
}
