'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/app/components/ui/Button';
import { ErrorBanner } from '@/app/components/ui/ErrorBanner';
import { Input } from '@/app/components/ui/Input';
import { Select } from '@/app/components/ui/Select';
import { useCreateAssignmentEvaluation, useUpdateAssignmentEvaluation } from '@/app/core/hooks/useAssignments';
import type { RubricLevel } from '@/app/core/types/assessment';
import type {
    Assignment,
    AssignmentEvaluation,
    AssignmentEvaluationCreatePayload,
    AssignmentEvaluationType,
    AssignmentEvaluationUpdatePayload,
    AssignmentSubmission,
} from '@/app/core/types/assignments';

interface AssignmentReviewFormProps {
    assignment: Assignment;
    submission: AssignmentSubmission;
    evaluation?: AssignmentEvaluation | null;
    rubricLevels?: RubricLevel[];
}

function buildRubricOptions(rubricLevels: RubricLevel[]) {
    return [
        { value: '', label: 'Select rubric level' },
        ...rubricLevels.map((level) => ({
            value: String(level.id),
            label: `${level.label} (${level.code})`,
        })),
    ];
}

function buildCompetencyOptions() {
    return [
        { value: '', label: 'Select competency state' },
        { value: 'EMERGING', label: 'Emerging' },
        { value: 'MEETING', label: 'Meeting expectation' },
        { value: 'EXCEEDING', label: 'Exceeding expectation' },
        { value: 'NOT_EVIDENCED', label: 'Not evidenced' },
    ];
}

export function AssignmentReviewForm({
    assignment,
    submission,
    evaluation = null,
    rubricLevels = [],
}: AssignmentReviewFormProps) {
    const createMutation = useCreateAssignmentEvaluation();
    const updateMutation = useUpdateAssignmentEvaluation();
    const [numericScore, setNumericScore] = useState('');
    const [rubricLevel, setRubricLevel] = useState('');
    const [narrative, setNarrative] = useState('');
    const [competencyState, setCompetencyState] = useState('');
    const [formError, setFormError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    useEffect(() => {
        setNumericScore(evaluation?.numeric_score != null ? String(evaluation.numeric_score) : '');
        setRubricLevel(evaluation?.rubric_level != null ? String(evaluation.rubric_level) : '');
        setNarrative(evaluation?.narrative ?? '');
        setCompetencyState(evaluation?.competency_state ?? '');
        setFormError(null);
        setSuccessMessage(null);
    }, [evaluation]);

    const saving = createMutation.isPending || updateMutation.isPending;
    const evaluationType = assignment.evaluation_type;

    const validate = (): AssignmentEvaluationCreatePayload | AssignmentEvaluationUpdatePayload | null => {
        setFormError(null);

        if (evaluationType === 'NUMERIC') {
            if (!numericScore) {
                setFormError('Numeric score is required for this assignment.');
                return null;
            }

            return {
                submission: submission.id,
                evaluation_type: evaluationType,
                numeric_score: Number(numericScore),
                narrative: narrative.trim(),
            };
        }

        if (evaluationType === 'RUBRIC') {
            if (!rubricLevel) {
                setFormError('Select a rubric level before saving the review.');
                return null;
            }

            return {
                submission: submission.id,
                evaluation_type: evaluationType,
                rubric_level: Number(rubricLevel),
                narrative: narrative.trim(),
            };
        }

        if (evaluationType === 'DESCRIPTIVE') {
            if (!narrative.trim()) {
                setFormError('Narrative feedback is required for descriptive assignments.');
                return null;
            }

            return {
                submission: submission.id,
                evaluation_type: evaluationType,
                narrative: narrative.trim(),
            };
        }

        return {
            submission: submission.id,
            evaluation_type: evaluationType as AssignmentEvaluationType,
            competency_state: competencyState || null,
            narrative: narrative.trim(),
        };
    };

    const handleSave = async () => {
        const payload = validate();
        if (!payload) return;

        try {
            if (evaluation) {
                const updatePayload: AssignmentEvaluationUpdatePayload = {
                    ...('numeric_score' in payload ? { numeric_score: payload.numeric_score ?? null } : {}),
                    ...('rubric_level' in payload ? { rubric_level: payload.rubric_level ?? null } : {}),
                    ...('narrative' in payload ? { narrative: payload.narrative ?? '' } : {}),
                    ...('competency_state' in payload ? { competency_state: payload.competency_state ?? null } : {}),
                };
                await updateMutation.mutateAsync({ id: evaluation.id, data: updatePayload });
                setSuccessMessage('Review updated.');
            } else {
                await createMutation.mutateAsync(payload as AssignmentEvaluationCreatePayload);
                setSuccessMessage('Review saved.');
            }
        } catch (err) {
            setFormError(err instanceof Error ? err.message : 'Failed to save review.');
        }
    };

    return (
        <div className="space-y-4 rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between gap-3">
                <div>
                    <h3 className="text-sm font-semibold text-gray-900">Review</h3>
                    <p className="text-sm text-gray-500">
                        Save feedback using the assignment&apos;s evaluation mode.
                    </p>
                </div>
                {evaluation?.evaluated_at ? (
                    <span className="text-xs text-gray-500">
                        Reviewed {new Date(evaluation.evaluated_at).toLocaleString()}
                    </span>
                ) : null}
            </div>

            {formError ? (
                <ErrorBanner message={formError} onDismiss={() => setFormError(null)} />
            ) : null}

            {successMessage ? (
                <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                    {successMessage}
                </div>
            ) : null}

            {evaluationType === 'NUMERIC' ? (
                <Input
                    label="Numeric Score"
                    type="number"
                    min="0"
                    max={assignment.total_marks ?? undefined}
                    value={numericScore}
                    onChange={(event) => setNumericScore(event.target.value)}
                />
            ) : null}

            {evaluationType === 'RUBRIC' ? (
                <Select
                    label="Rubric Level"
                    value={rubricLevel}
                    onChange={(event) => setRubricLevel(event.target.value)}
                    options={buildRubricOptions(rubricLevels)}
                />
            ) : null}

            {evaluationType === 'COMPETENCY' ? (
                <Select
                    label="Competency State"
                    value={competencyState}
                    onChange={(event) => setCompetencyState(event.target.value)}
                    options={buildCompetencyOptions()}
                />
            ) : null}

            {(evaluationType === 'DESCRIPTIVE' || evaluationType === 'COMPETENCY' || evaluationType === 'RUBRIC' || evaluationType === 'NUMERIC') ? (
                <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                        {evaluationType === 'DESCRIPTIVE' ? 'Narrative Feedback' : 'Review Notes'}
                    </label>
                    <textarea
                        value={narrative}
                        onChange={(event) => setNarrative(event.target.value)}
                        rows={4}
                        placeholder="Add feedback for the learner."
                        className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>
            ) : null}

            <div className="flex flex-col sm:flex-row sm:justify-end">
                <Button
                    type="button"
                    onClick={handleSave}
                    disabled={saving}
                    className="w-full sm:w-auto"
                >
                    {saving ? 'Saving evaluation...' : 'Save evaluation'}
                </Button>
            </div>
        </div>
    );
}
