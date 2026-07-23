'use client';

import { resolveErrorMessage } from '@/app/core/errors';

import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/app/components/ui/Button';
import { ErrorBanner } from '@/app/components/ui/ErrorBanner';
import { FormValidationSummary } from '@/app/components/ui/forms';
import { Input } from '@/app/components/ui/Input';
import { Select } from '@/app/components/ui/Select';
import {
    getFormFieldErrorMessage,
    hasFormFieldErrors,
    type FormFieldErrors,
    useFormValidationFeedback,
} from '@/app/core/forms';
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
    onSaved?: () => void | Promise<void>;
    onSaveAndNext?: () => void | Promise<void>;
    pending?: boolean;
    readOnly?: boolean;
    embedded?: boolean;
    onDirtyChange?: (dirty: boolean) => void;
}

type ReviewField = 'numericScore' | 'rubricLevel' | 'narrative' | 'competencyState';

const REVIEW_FIELD_LABELS: Record<ReviewField, string> = {
    numericScore: 'Numeric score',
    rubricLevel: 'Rubric level',
    narrative: 'Review notes',
    competencyState: 'Competency state',
};

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

export function validateNumericAssignmentScore(
    value: string,
    totalMarks: number | null | undefined
): string | null {
    const trimmedValue = value.trim();

    if (!trimmedValue) {
        return 'Numeric score is required for this assignment.';
    }

    const score = Number(trimmedValue);
    if (Number.isNaN(score)) {
        return 'Numeric score must be a number.';
    }

    if (score < 0) {
        return 'Numeric score cannot be negative.';
    }

    if (totalMarks != null && score > totalMarks) {
        return `Numeric score cannot exceed ${totalMarks}.`;
    }

    return null;
}

export function AssignmentReviewForm({
    assignment,
    submission,
    evaluation = null,
    rubricLevels = [],
    onSaved,
    onSaveAndNext,
    pending = false,
    readOnly = false,
    embedded = false,
    onDirtyChange,
}: AssignmentReviewFormProps) {
    const createMutation = useCreateAssignmentEvaluation();
    const updateMutation = useUpdateAssignmentEvaluation();
    const [numericScore, setNumericScore] = useState('');
    const [rubricLevel, setRubricLevel] = useState('');
    const [narrative, setNarrative] = useState('');
    const [competencyState, setCompetencyState] = useState('');
    const [formError, setFormError] = useState<string | null>(null);
    const [fieldErrors, setFieldErrors] = useState<FormFieldErrors<ReviewField>>({});
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const {
        summaryRef,
        setFieldRef,
        focusField,
        focusFirstError,
    } = useFormValidationFeedback<ReviewField>({
        fieldErrors,
        fieldOrder: ['numericScore', 'rubricLevel', 'competencyState', 'narrative'],
        fieldLabels: REVIEW_FIELD_LABELS,
        summaryId: 'assignment-review-validation-summary',
    });

    useEffect(() => {
        setNumericScore(evaluation?.numeric_score != null ? String(evaluation.numeric_score) : '');
        setRubricLevel(evaluation?.rubric_level != null ? String(evaluation.rubric_level) : '');
        setNarrative(evaluation?.narrative ?? '');
        setCompetencyState(evaluation?.competency_state ?? '');
        setFormError(null);
        setFieldErrors({});
        setSuccessMessage(null);
    }, [evaluation, submission.id]);

    const saving = pending || createMutation.isPending || updateMutation.isPending;
    const evaluationType = assignment.evaluation_type;
    const dirty = useMemo(() => (
        numericScore !== (evaluation?.numeric_score != null ? String(evaluation.numeric_score) : '')
        || rubricLevel !== (evaluation?.rubric_level != null ? String(evaluation.rubric_level) : '')
        || narrative !== (evaluation?.narrative ?? '')
        || competencyState !== (evaluation?.competency_state ?? '')
    ), [competencyState, evaluation, narrative, numericScore, rubricLevel]);

    useEffect(() => {
        onDirtyChange?.(dirty);
    }, [dirty, onDirtyChange]);

    const validate = (): AssignmentEvaluationCreatePayload | AssignmentEvaluationUpdatePayload | null => {
        setFormError(null);
        const nextFieldErrors: FormFieldErrors<ReviewField> = {};

        if (evaluationType === 'NUMERIC') {
            const numericError = validateNumericAssignmentScore(numericScore, assignment.total_marks);
            if (numericError) {
                nextFieldErrors.numericScore = numericError;
                setFieldErrors(nextFieldErrors);
                focusFirstError(nextFieldErrors);
                return null;
            }

            setFieldErrors({});
            return {
                submission: submission.id,
                evaluation_type: evaluationType,
                numeric_score: Number(numericScore),
                narrative: narrative.trim(),
            };
        }

        if (evaluationType === 'RUBRIC') {
            if (!rubricLevel) {
                nextFieldErrors.rubricLevel = 'Select a rubric level before saving the review.';
                setFieldErrors(nextFieldErrors);
                focusFirstError(nextFieldErrors);
                return null;
            }

            setFieldErrors({});
            return {
                submission: submission.id,
                evaluation_type: evaluationType,
                rubric_level: Number(rubricLevel),
                narrative: narrative.trim(),
            };
        }

        if (evaluationType === 'DESCRIPTIVE') {
            if (!narrative.trim()) {
                nextFieldErrors.narrative = 'Narrative feedback is required for descriptive assignments.';
                setFieldErrors(nextFieldErrors);
                focusFirstError(nextFieldErrors);
                return null;
            }

            setFieldErrors({});
            return {
                submission: submission.id,
                evaluation_type: evaluationType,
                narrative: narrative.trim(),
            };
        }

        if (!competencyState) {
            nextFieldErrors.competencyState = 'Select a competency state before saving the review.';
            setFieldErrors(nextFieldErrors);
            focusFirstError(nextFieldErrors);
            return null;
        }

        setFieldErrors({});
        return {
            submission: submission.id,
            evaluation_type: evaluationType as AssignmentEvaluationType,
            competency_state: competencyState,
            narrative: narrative.trim(),
        };
    };

    const handleSave = async (advance = false) => {
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
            await onSaved?.();
            if (advance) {
                await onSaveAndNext?.();
            }
        } catch (err) {
            setFormError(resolveErrorMessage(err, 'Failed to save review.'));
        }
    };
    const totalMarksLabel = assignment.total_marks != null
        ? ` out of ${assignment.total_marks}`
        : '';
    const numericHelperText = assignment.total_marks != null
        ? `Maximum score: ${assignment.total_marks}`
        : 'Enter a score of 0 or above.';

    return (
        <div className={embedded ? 'space-y-5' : 'space-y-5 rounded-lg border theme-border p-4'}>
            {!embedded ? (
            <div className="flex items-center justify-between gap-3">
                <div>
                    <h3 className="text-sm font-semibold theme-text">Review / mark response</h3>
                    <p className="text-sm theme-muted">
                        Save marks, rubric decisions, competency judgments, or feedback using the assignment&apos;s evaluation mode.
                    </p>
                </div>
                {evaluation?.evaluated_at ? (
                    <span className="text-xs theme-muted">
                        Reviewed {new Date(evaluation.evaluated_at).toLocaleString()}
                    </span>
                ) : null}
            </div>
            ) : null}

            {formError ? (
                <ErrorBanner message={formError} onDismiss={() => setFormError(null)} />
            ) : null}

            <div ref={summaryRef}>
                <FormValidationSummary
                    id="assignment-review-validation-summary"
                    title="Review fields need correction."
                    fieldErrors={fieldErrors}
                    fieldLabels={REVIEW_FIELD_LABELS}
                    onFieldClick={focusField}
                />
            </div>

            {successMessage ? (
                <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                    {successMessage}
                </div>
            ) : null}

            {evaluationType === 'NUMERIC' ? (
                <Input
                    ref={setFieldRef('numericScore')}
                    label={`Numeric score${totalMarksLabel}`}
                    type="number"
                    min="0"
                    max={assignment.total_marks ?? undefined}
                    value={numericScore}
                    disabled={readOnly || saving}
                    helperText={numericHelperText}
                    error={getFormFieldErrorMessage(fieldErrors.numericScore)}
                    onChange={(event) => {
                        setNumericScore(event.target.value);
                        if (hasFormFieldErrors(fieldErrors)) {
                            setFieldErrors((previous) => ({ ...previous, numericScore: undefined }));
                        }
                    }}
                />
            ) : null}

            {evaluationType === 'RUBRIC' ? (
                <Select
                    ref={setFieldRef('rubricLevel')}
                    label="Rubric Level"
                    value={rubricLevel}
                    disabled={readOnly || saving}
                    error={getFormFieldErrorMessage(fieldErrors.rubricLevel)}
                    onChange={(event) => {
                        setRubricLevel(event.target.value);
                        setFieldErrors((previous) => ({ ...previous, rubricLevel: undefined }));
                    }}
                    options={buildRubricOptions(rubricLevels)}
                />
            ) : null}

            {evaluationType === 'COMPETENCY' ? (
                <Select
                    ref={setFieldRef('competencyState')}
                    label="Competency State"
                    value={competencyState}
                    disabled={readOnly || saving}
                    onChange={(event) => setCompetencyState(event.target.value)}
                    options={buildCompetencyOptions()}
                />
            ) : null}

            {(evaluationType === 'DESCRIPTIVE' || evaluationType === 'COMPETENCY' || evaluationType === 'RUBRIC' || evaluationType === 'NUMERIC') ? (
                <div className="space-y-2 pt-2">
                    <label className="block text-sm font-medium theme-text">
                        {evaluationType === 'DESCRIPTIVE' ? 'Narrative Feedback' : 'Review Notes'}
                    </label>
                    <textarea
                        ref={setFieldRef('narrative')}
                        value={narrative}
                        disabled={readOnly || saving}
                        onChange={(event) => {
                            setNarrative(event.target.value);
                            setFieldErrors((previous) => ({ ...previous, narrative: undefined }));
                        }}
                        rows={5}
                        placeholder="Add feedback for the learner."
                        aria-invalid={fieldErrors.narrative ? true : undefined}
                        className={`theme-focus-ring theme-input theme-surface-elevated min-h-[140px] w-full rounded-lg px-4 py-3 ${
                            fieldErrors.narrative ? 'theme-input-error' : ''
                        }`}
                    />
                    {fieldErrors.narrative ? (
                        <p className="text-sm text-[color:var(--color-danger)]">
                            {getFormFieldErrorMessage(fieldErrors.narrative)}
                        </p>
                    ) : null}
                </div>
            ) : null}

            <div className="sticky bottom-0 -mx-4 flex flex-row gap-2 border-t theme-border bg-[color:var(--color-card)] px-4 py-3 sm:static sm:mx-0 sm:justify-end sm:border-0 sm:bg-transparent sm:px-0 sm:py-0">
                <Button
                    type="button"
                    onClick={() => void handleSave(false)}
                    disabled={readOnly || saving}
                    className="flex-1 sm:flex-none"
                >
                    {saving ? 'Saving review...' : 'Save'}
                </Button>
                <Button
                    type="button"
                    onClick={() => void handleSave(true)}
                    disabled={readOnly || saving || !onSaveAndNext}
                    className="flex-1 sm:flex-none"
                >
                    Save & Next
                </Button>
            </div>
        </div>
    );
}
