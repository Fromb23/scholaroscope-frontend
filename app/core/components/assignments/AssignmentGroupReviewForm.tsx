'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/app/components/ui/Button';
import { ErrorBanner } from '@/app/components/ui/ErrorBanner';
import { Input } from '@/app/components/ui/Input';
import { Select } from '@/app/components/ui/Select';
import {
    useBridgeAssignmentGroupEvaluation,
    useCreateAssignmentGroupEvaluation,
    useUpdateAssignmentGroupEvaluation,
} from '@/app/core/hooks/useAssignments';
import { hasCBCOutcome } from '@/app/core/components/assignments/assignmentUtils';
import type { RubricLevel } from '@/app/core/types/assessment';
import type {
    Assignment,
    AssignmentEvidenceProjectionMode,
    AssignmentEvaluationType,
    AssignmentGroup,
    AssignmentGroupEvaluation,
    AssignmentGroupEvaluationCreatePayload,
    AssignmentGroupEvaluationUpdatePayload,
    AssignmentGroupMember,
    AssignmentGroupMemberEvaluationOverridePayload,
    AssignmentGroupSubmission,
} from '@/app/core/types/assignments';

interface AssignmentGroupReviewFormProps {
    assignment: Assignment;
    group: AssignmentGroup;
    submission: AssignmentGroupSubmission;
    evaluation?: AssignmentGroupEvaluation | null;
    rubricLevels?: RubricLevel[];
}

interface OverrideDraft {
    enabled: boolean;
    numericScore: string;
    rubricLevel: string;
    narrative: string;
    competencyState: string;
}

const PROJECTION_MODE_OPTIONS: Array<{ value: AssignmentEvidenceProjectionMode; label: string }> = [
    { value: 'APPLY_TO_ALL_MEMBERS', label: 'Apply to all members' },
    { value: 'APPLY_WITH_OVERRIDES', label: 'Apply with individual overrides' },
    { value: 'RECORD_ONLY', label: 'Record only, no competency evidence' },
];

const textareaClassName = [
    'theme-focus-ring theme-input theme-surface-elevated w-full rounded-lg px-4 py-3',
    'placeholder:text-[color:var(--color-text-subtle)]',
].join(' ');

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

function isParticipatingMember(member: AssignmentGroupMember) {
    return member.participation_status === 'PARTICIPATED';
}

function buildInitialOverrideDrafts(
    members: AssignmentGroupMember[],
    evaluation?: AssignmentGroupEvaluation | null,
): Record<number, OverrideDraft> {
    const overridesByStudentId = new Map(
        (evaluation?.member_overrides ?? []).map((override) => [override.student, override])
    );

    return Object.fromEntries(members.map((member) => {
        const override = overridesByStudentId.get(member.student);

        return [
            member.student,
            {
                enabled: Boolean(override),
                numericScore: override?.numeric_score != null ? String(override.numeric_score) : '',
                rubricLevel: override?.rubric_level != null ? String(override.rubric_level) : '',
                narrative: override?.narrative ?? '',
                competencyState: override?.competency_state ?? '',
            },
        ];
    }));
}

export function AssignmentGroupReviewForm({
    assignment,
    group,
    submission,
    evaluation = null,
    rubricLevels = [],
}: AssignmentGroupReviewFormProps) {
    const createMutation = useCreateAssignmentGroupEvaluation();
    const updateMutation = useUpdateAssignmentGroupEvaluation();
    const bridgeMutation = useBridgeAssignmentGroupEvaluation();
    const groupMembers = useMemo(() => group.members ?? [], [group.members]);
    const [localEvaluation, setLocalEvaluation] = useState<AssignmentGroupEvaluation | null>(evaluation);
    const [numericScore, setNumericScore] = useState('');
    const [rubricLevel, setRubricLevel] = useState('');
    const [narrative, setNarrative] = useState('');
    const [competencyState, setCompetencyState] = useState('');
    const [projectionMode, setProjectionMode] = useState<AssignmentEvidenceProjectionMode>('APPLY_TO_ALL_MEMBERS');
    const [overrideDrafts, setOverrideDrafts] = useState<Record<number, OverrideDraft>>({});
    const [formError, setFormError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    useEffect(() => {
        setLocalEvaluation((previous) => {
            if (!evaluation) {
                return null;
            }

            if (previous?.id === evaluation.id) {
                return {
                    ...evaluation,
                    evidence_created: previous.evidence_created ?? evaluation.evidence_created,
                    evidence_record_ids: previous.evidence_record_ids ?? evaluation.evidence_record_ids,
                };
            }

            return evaluation;
        });
    }, [evaluation]);

    useEffect(() => {
        const activeEvaluation = evaluation ?? localEvaluation;

        setNumericScore(activeEvaluation?.numeric_score != null ? String(activeEvaluation.numeric_score) : '');
        setRubricLevel(activeEvaluation?.rubric_level != null ? String(activeEvaluation.rubric_level) : '');
        setNarrative(activeEvaluation?.narrative ?? '');
        setCompetencyState(activeEvaluation?.competency_state ?? '');
        setProjectionMode(activeEvaluation?.projection_mode ?? 'APPLY_TO_ALL_MEMBERS');
        setOverrideDrafts(buildInitialOverrideDrafts(groupMembers, activeEvaluation));
        setFormError(null);
        setSuccessMessage(null);
    // Only reset form state when upstream data changes.
    // Local mutation updates keep the current form values in place.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [evaluation, groupMembers]);

    const activeEvaluation = localEvaluation ?? evaluation;
    const saving = createMutation.isPending || updateMutation.isPending;
    const evaluationType = assignment.evaluation_type;
    const cbcEnabled = hasCBCOutcome(assignment);
    const evidenceCreated = Boolean(activeEvaluation?.evidence_created);

    const validateBasePayload = (): Omit<AssignmentGroupEvaluationCreatePayload, 'group_submission'> | null => {
        setFormError(null);

        if (evaluationType === 'NUMERIC') {
            if (!numericScore) {
                setFormError('Numeric score is required for this assignment.');
                return null;
            }

            return {
                evaluation_type: evaluationType,
                numeric_score: Number(numericScore),
                narrative: narrative.trim(),
                projection_mode: projectionMode,
            };
        }

        if (evaluationType === 'RUBRIC') {
            if (!rubricLevel) {
                setFormError('Select a rubric level before saving the review.');
                return null;
            }

            return {
                evaluation_type: evaluationType,
                rubric_level: Number(rubricLevel),
                narrative: narrative.trim(),
                projection_mode: projectionMode,
            };
        }

        if (evaluationType === 'DESCRIPTIVE') {
            if (!narrative.trim()) {
                setFormError('Narrative feedback is required for descriptive assignments.');
                return null;
            }

            return {
                evaluation_type: evaluationType,
                narrative: narrative.trim(),
                projection_mode: projectionMode,
            };
        }

        if (!competencyState) {
            setFormError('Select a competency state before saving the review.');
            return null;
        }

        return {
            evaluation_type: evaluationType as AssignmentEvaluationType,
            competency_state: competencyState,
            narrative: narrative.trim(),
            projection_mode: projectionMode,
        };
    };

    const buildOverridePayloads = useMemo(() => {
        if (projectionMode !== 'APPLY_WITH_OVERRIDES') {
            return [] as AssignmentGroupMemberEvaluationOverridePayload[];
        }

        return groupMembers.flatMap((member) => {
            if (!isParticipatingMember(member)) {
                return [];
            }

            const draft = overrideDrafts[member.student];
            if (!draft?.enabled) {
                return [];
            }

            const payload: AssignmentGroupMemberEvaluationOverridePayload = {
                student_id: member.student,
            };

            if (draft.numericScore) {
                payload.numeric_score = Number(draft.numericScore);
            }
            if (draft.rubricLevel) {
                payload.rubric_level = Number(draft.rubricLevel);
            }
            if (draft.narrative.trim()) {
                payload.narrative = draft.narrative.trim();
            }
            if (draft.competencyState) {
                payload.competency_state = draft.competencyState;
            }

            return [payload];
        });
    }, [groupMembers, overrideDrafts, projectionMode]);

    const handleSave = async () => {
        const basePayload = validateBasePayload();
        if (!basePayload) return;

        const payload = {
            ...basePayload,
            ...(projectionMode === 'APPLY_WITH_OVERRIDES'
                ? { member_overrides: buildOverridePayloads }
                : {}),
        };

        try {
            if (activeEvaluation) {
                const updated = await updateMutation.mutateAsync({
                    id: activeEvaluation.id,
                    data: payload as AssignmentGroupEvaluationUpdatePayload,
                });
                setLocalEvaluation((previous) => ({
                    ...(previous ?? updated),
                    ...updated,
                    evidence_created: previous?.evidence_created ?? updated.evidence_created,
                    evidence_record_ids: previous?.evidence_record_ids ?? updated.evidence_record_ids,
                }));
                setSuccessMessage('Group review updated.');
                return;
            }

            const created = await createMutation.mutateAsync({
                group_submission: submission.id,
                ...payload,
            } as AssignmentGroupEvaluationCreatePayload);
            setLocalEvaluation(created);
            setSuccessMessage('Group review saved.');
        } catch (err) {
            setFormError(err instanceof Error ? err.message : 'Failed to save group review.');
        }
    };

    const handleBridge = async () => {
        if (!activeEvaluation) {
            return;
        }

        setFormError(null);
        setSuccessMessage(null);

        try {
            const result = await bridgeMutation.mutateAsync({
                assignmentId: assignment.id,
                groupId: group.id,
                evaluationId: activeEvaluation.id,
            });

            if (result.status === 'skipped') {
                setFormError(result.detail || 'The group evaluation could not be bridged to evidence.');
                return;
            }

            setLocalEvaluation((previous) => previous ? {
                ...previous,
                evidence_created: true,
                evidence_record_ids: result.evidence_record_ids,
            } : previous);
            setSuccessMessage(result.detail || 'Group evaluation bridged to CBC evidence.');
        } catch (err) {
            setFormError(err instanceof Error ? err.message : 'Failed to bridge group evaluation.');
        }
    };

    const updateOverrideDraft = (
        studentId: number,
        field: keyof OverrideDraft,
        value: string | boolean
    ) => {
        setOverrideDrafts((previous) => ({
            ...previous,
            [studentId]: {
                ...(previous[studentId] ?? {
                    enabled: false,
                    numericScore: '',
                    rubricLevel: '',
                    narrative: '',
                    competencyState: '',
                }),
                [field]: value,
            },
        }));
    };

    return (
        <div className="space-y-4 rounded-lg border theme-border p-4">
            <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
                <div>
                    <h3 className="text-sm font-semibold theme-text">Group Review</h3>
                    <p className="text-sm theme-muted">
                        Record teacher review for {submission.group_name} using the assignment&apos;s evaluation mode.
                    </p>
                </div>
                {activeEvaluation?.evaluated_at ? (
                    <span className="text-xs theme-subtle">
                        Reviewed {new Date(activeEvaluation.evaluated_at).toLocaleString()}
                    </span>
                ) : null}
            </div>

            {formError ? (
                <ErrorBanner message={formError} onDismiss={() => setFormError(null)} />
            ) : null}

            {successMessage ? (
                <div className="theme-success-surface rounded-lg px-4 py-3 text-sm">
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

            <div className="space-y-2">
                <label className="block text-sm font-medium theme-text">
                    {evaluationType === 'DESCRIPTIVE' ? 'Narrative Feedback' : 'Review Notes'}
                </label>
                <textarea
                    value={narrative}
                    onChange={(event) => setNarrative(event.target.value)}
                    rows={4}
                    placeholder="Add feedback for the group."
                    className={textareaClassName}
                />
            </div>

            <Select
                label="Evidence Projection"
                value={projectionMode}
                onChange={(event) => setProjectionMode(event.target.value as AssignmentEvidenceProjectionMode)}
                options={PROJECTION_MODE_OPTIONS}
            />

            <div className="space-y-3 rounded-lg border theme-border theme-surface-muted p-4">
                <div className="space-y-1">
                    <div className="text-sm font-medium theme-text">Group participation</div>
                    <p className="text-sm theme-muted">
                        This group score applies only to learners marked as participated.
                    </p>
                </div>

                {groupMembers.length === 0 ? (
                    <p className="text-sm theme-muted">Add group members before recording a group review.</p>
                ) : (
                    <div className="space-y-2">
                        {groupMembers.map((member) => (
                            <div
                                key={member.id}
                                className="flex flex-col gap-2 rounded-lg border theme-border theme-surface-elevated px-4 py-3 sm:flex-row sm:items-start sm:justify-between"
                            >
                                <div className="min-w-0">
                                    <div className="text-sm font-medium theme-text">{member.student_name}</div>
                                    <div className="text-xs theme-subtle">{member.admission_number}</div>
                                    {member.participation_note ? (
                                        <div className="mt-1 text-xs theme-muted">{member.participation_note}</div>
                                    ) : null}
                                </div>
                                <div className="text-left sm:text-right">
                                    <div className="text-xs font-medium theme-subtle">
                                        {member.participation_status_display}
                                    </div>
                                    <div className="text-xs theme-muted">
                                        {isParticipatingMember(member)
                                            ? 'Receives group evidence'
                                            : 'Does not receive group evidence'}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {projectionMode === 'APPLY_WITH_OVERRIDES' ? (
                <div className="space-y-3 rounded-lg border theme-border theme-surface-muted p-4">
                    <div className="space-y-1">
                        <div className="text-sm font-medium theme-text">Individual member overrides</div>
                        <p className="text-sm theme-muted">
                            Adjust scores or notes only for members who need a different record from the group result.
                        </p>
                    </div>

                    <div className="theme-info-surface rounded-lg px-4 py-3 text-sm">
                        This group score applies only to learners marked as participated.
                    </div>

                    {groupMembers.length === 0 ? (
                        <p className="text-sm theme-muted">
                            Add group members before using individual overrides.
                        </p>
                    ) : (
                        <div className="space-y-3">
                            {groupMembers.map((member) => {
                                const draft = overrideDrafts[member.student] ?? {
                                    enabled: false,
                                    numericScore: '',
                                    rubricLevel: '',
                                    narrative: '',
                                    competencyState: '',
                                };

                                return (
                                    <div key={member.id} className="rounded-lg border theme-border theme-surface-elevated p-4">
                                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                            <label className="flex items-start gap-3">
                                                {isParticipatingMember(member) ? (
                                                    <input
                                                        type="checkbox"
                                                        checked={draft.enabled}
                                                        onChange={(event) => updateOverrideDraft(member.student, 'enabled', event.target.checked)}
                                                        className="theme-checkbox mt-1 h-4 w-4 rounded theme-border"
                                                    />
                                                ) : (
                                                    <span className="mt-1 inline-flex rounded-full bg-slate-200 px-2 py-0.5 text-[11px] font-medium theme-subtle">
                                                        Skip
                                                    </span>
                                                )}
                                                <div className="flex-1">
                                                    <div className="text-sm font-medium theme-text">
                                                        {member.student_name}
                                                    </div>
                                                    <div className="text-xs theme-subtle">
                                                        {member.admission_number}
                                                    </div>
                                                </div>
                                            </label>

                                            <div className="space-y-1 text-left sm:text-right">
                                                <div className="text-xs font-medium theme-subtle">
                                                    {member.participation_status_display}
                                                </div>
                                                {!isParticipatingMember(member) ? (
                                                    <div className="text-xs theme-muted">
                                                        This learner will not receive group evidence.
                                                    </div>
                                                ) : null}
                                                {member.participation_note ? (
                                                    <div className="text-xs theme-subtle">
                                                        {member.participation_note}
                                                    </div>
                                                ) : null}
                                            </div>
                                        </div>

                                        {isParticipatingMember(member) && draft.enabled ? (
                                            <div className="mt-4 grid gap-3 md:grid-cols-2">
                                                {evaluationType === 'NUMERIC' ? (
                                                    <Input
                                                        label="Override Score"
                                                        type="number"
                                                        min="0"
                                                        max={assignment.total_marks ?? undefined}
                                                        value={draft.numericScore}
                                                        onChange={(event) => updateOverrideDraft(member.student, 'numericScore', event.target.value)}
                                                    />
                                                ) : null}

                                                {evaluationType === 'RUBRIC' ? (
                                                    <Select
                                                        label="Override Rubric Level"
                                                        value={draft.rubricLevel}
                                                        onChange={(event) => updateOverrideDraft(member.student, 'rubricLevel', event.target.value)}
                                                        options={buildRubricOptions(rubricLevels)}
                                                    />
                                                ) : null}

                                                {evaluationType === 'COMPETENCY' ? (
                                                    <Select
                                                        label="Override Competency State"
                                                        value={draft.competencyState}
                                                        onChange={(event) => updateOverrideDraft(member.student, 'competencyState', event.target.value)}
                                                        options={buildCompetencyOptions()}
                                                    />
                                                ) : null}

                                                <div className="space-y-2 md:col-span-2">
                                                    <label className="block text-sm font-medium theme-text">
                                                        Override Notes
                                                    </label>
                                                    <textarea
                                                        value={draft.narrative}
                                                        onChange={(event) => updateOverrideDraft(member.student, 'narrative', event.target.value)}
                                                        rows={3}
                                                        placeholder="Add learner-specific notes."
                                                        className={textareaClassName}
                                                    />
                                                </div>

                                                <label className="flex items-start gap-3 rounded-lg border theme-border px-4 py-3 text-sm theme-muted md:col-span-2">
                                                    <span>
                                                        Overrides adjust feedback and scores for participating learners only.
                                                    </span>
                                                </label>
                                            </div>
                                        ) : null}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            ) : null}

            <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                {cbcEnabled && activeEvaluation?.projection_mode === 'RECORD_ONLY' ? (
                    <div className="rounded-lg border theme-border theme-surface-muted px-4 py-3 text-sm theme-muted sm:mr-auto">
                        Evidence bridge disabled because this evaluation is record-only.
                    </div>
                ) : null}

                {cbcEnabled && activeEvaluation && !evidenceCreated && activeEvaluation.projection_mode !== 'RECORD_ONLY' ? (
                    <Button
                        type="button"
                        variant="secondary"
                        onClick={handleBridge}
                        disabled={bridgeMutation.isPending}
                    >
                        {bridgeMutation.isPending ? 'Bridging...' : 'Bridge to CBC evidence'}
                    </Button>
                ) : null}

                <Button
                    type="button"
                    onClick={handleSave}
                    disabled={saving}
                    className="w-full sm:w-auto"
                >
                    {saving
                        ? 'Saving evaluation...'
                        : 'Save evaluation'}
                </Button>
            </div>
        </div>
    );
}
