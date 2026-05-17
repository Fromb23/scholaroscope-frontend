'use client';

import { Download, Save } from 'lucide-react';
import { Button } from '@/app/components/ui/Button';
import { Card } from '@/app/components/ui/Card';
import { AssessmentScoreTable } from '@/app/core/components/assessments/AssessmentScoreTable';
import type { ScoreDraft } from '@/app/core/hooks/assessments/useAssessmentDetailPage';
import type { AssessmentDetail, AssessmentScore } from '@/app/core/types/assessment';

interface AssessmentScoreEntryCardProps {
    assessment: AssessmentDetail;
    scores: AssessmentScore[];
    draft: Record<number, ScoreDraft>;
    loading: boolean;
    readOnly: boolean;
    canSave: boolean;
    saving: boolean;
    onExport: () => void;
    onSave: () => void;
    onScoreChange: (studentId: number, field: keyof ScoreDraft, value: number | string | null) => void;
}

export function AssessmentScoreEntryCard({
    assessment,
    scores,
    draft,
    loading,
    readOnly,
    canSave,
    saving,
    onExport,
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
                        <Button
                            variant="secondary"
                            size="sm"
                            onClick={onExport}
                            disabled={scores.length === 0}
                        >
                            <Download className="h-4 w-4 sm:mr-1.5" />
                            <span className="hidden sm:inline">Export</span>
                        </Button>
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
