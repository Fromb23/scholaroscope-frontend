'use client';

import { useEffect, useMemo, useState } from 'react';
import Modal from '@/app/components/ui/Modal';
import { Button } from '@/app/components/ui/Button';
import { ErrorBanner } from '@/app/components/ui/ErrorBanner';
import { Input } from '@/app/components/ui/Input';
import { Select } from '@/app/components/ui/Select';
import { LoadingSpinner } from '@/app/components/ui/LoadingSpinner';
import { AssignmentOptionCards } from '@/app/core/components/assignments/AssignmentOptionCards';
import {
    getAssignmentAudienceOptions,
    getDefaultTeacherAssignmentAudienceChoice,
    toAssignmentRecipientMode,
    type TeacherAssignmentAudienceChoice,
} from '@/app/core/components/assignments/assignmentAudienceOptions';
import {
    getAssignmentParticipatingCohortCount,
    hasSessionParticipationMetadata,
} from '@/app/core/components/assignments/assignmentUtils';
import { useCohortEnrolledStudents } from '@/app/core/hooks/useCohortStudents';
import { useCreateAssignment, useUpdateAssignment } from '@/app/core/hooks/useAssignments';
import { useRubricScales } from '@/app/core/hooks/useAssessments';
import type { CohortSubject } from '@/app/core/types/academic';
import type {
    Assignment,
    AssignmentDeliveryMode,
    AssignmentCreatePayload,
    AssignmentEvaluationType,
    AssignmentOutcomeCreatePayload,
    AssignmentUpdatePayload,
} from '@/app/core/types/assignments';

interface AssignmentCreateModalProps {
    isOpen: boolean;
    onClose: () => void;
    cohortId: number;
    cohortCurriculumId?: number | null;
    cohortSubjects: CohortSubject[];
    assignment?: Assignment | null;
    linkedSessionId?: number | null;
    linkedSessionTitle?: string | null;
    onSaved?: (assignment: Assignment) => void;
}

interface OutcomeDraft {
    outcome_key: string;
    outcome_label: string;
    plugin: string;
    weight: string;
}

const EVALUATION_OPTIONS: Array<{ value: AssignmentEvaluationType; label: string }> = [
    { value: 'NUMERIC', label: 'Numeric' },
    { value: 'RUBRIC', label: 'Rubric' },
    { value: 'DESCRIPTIVE', label: 'Descriptive' },
    { value: 'COMPETENCY', label: 'Competency' },
];

const DELIVERY_MODE_OPTIONS: Array<{ value: AssignmentDeliveryMode; label: string }> = [
    { value: 'INDIVIDUAL', label: 'Individual learners' },
    { value: 'GROUP', label: 'Group work' },
];

function toDateTimeLocalValue(value: string | null | undefined): string {
    if (!value) return '';

    const parsedValue = new Date(value);
    if (Number.isNaN(parsedValue.getTime())) return '';

    const offset = parsedValue.getTimezoneOffset();
    return new Date(parsedValue.getTime() - offset * 60_000).toISOString().slice(0, 16);
}

function fromDateTimeLocalValue(value: string): string | null {
    if (!value) return null;
    return new Date(value).toISOString();
}

function buildInitialOutcomes(assignment?: Assignment | null): OutcomeDraft[] {
    if (!assignment || assignment.outcomes.length === 0) {
        return [];
    }

    return assignment.outcomes.map((outcome) => ({
        outcome_key: outcome.outcome_key,
        outcome_label: outcome.outcome_label,
        plugin: outcome.plugin ?? '',
        weight: String(outcome.weight),
    }));
}

export function AssignmentCreateModal({
    isOpen,
    onClose,
    cohortId,
    cohortCurriculumId,
    cohortSubjects,
    assignment = null,
    linkedSessionId = null,
    linkedSessionTitle = null,
    onSaved,
}: AssignmentCreateModalProps) {
    const createMutation = useCreateAssignment();
    const updateMutation = useUpdateAssignment(assignment?.cohort_subject ?? null);
    const { rubricScales, loading: rubricScalesLoading } = useRubricScales(
        cohortCurriculumId ?? undefined
    );
    const learnersQuery = useCohortEnrolledStudents(cohortId);
    const isEditMode = Boolean(assignment);
    const resolvedLinkedSessionId = isEditMode
        ? assignment?.created_from_session ?? null
        : linkedSessionId;
    const resolvedLinkedSessionTitle = isEditMode
        ? assignment?.created_from_session_title ?? null
        : linkedSessionTitle;
    const hasLinkedLesson = resolvedLinkedSessionId != null;
    const audienceOptions = useMemo(
        () => getAssignmentAudienceOptions(hasLinkedLesson),
        [hasLinkedLesson]
    );
    const participatingCohortCount = useMemo(
        () => getAssignmentParticipatingCohortCount(assignment?.curriculum_context),
        [assignment?.curriculum_context]
    );
    const showSessionScopeNote = hasLinkedLesson && hasSessionParticipationMetadata(assignment?.curriculum_context);

    const sortedSubjects = useMemo(() => (
        [...cohortSubjects].sort((left, right) => left.subject_name.localeCompare(right.subject_name))
    ), [cohortSubjects]);
    const [cohortSubjectId, setCohortSubjectId] = useState('');
    const [title, setTitle] = useState('');
    const [instructions, setInstructions] = useState('');
    const [startsAt, setStartsAt] = useState('');
    const [dueAt, setDueAt] = useState('');
    const [deliveryMode, setDeliveryMode] = useState<AssignmentDeliveryMode>('INDIVIDUAL');
    const [evaluationType, setEvaluationType] = useState<AssignmentEvaluationType>('NUMERIC');
    const [totalMarks, setTotalMarks] = useState('');
    const [rubricScaleId, setRubricScaleId] = useState('');
    const [audienceChoice, setAudienceChoice] = useState<TeacherAssignmentAudienceChoice>(
        getDefaultTeacherAssignmentAudienceChoice(hasLinkedLesson)
    );
    const [publishNow, setPublishNow] = useState(false);
    const [selectedStudentIds, setSelectedStudentIds] = useState<number[]>([]);
    const [learnerSearch, setLearnerSearch] = useState('');
    const [outcomes, setOutcomes] = useState<OutcomeDraft[]>([]);
    const [formError, setFormError] = useState<string | null>(null);

    useEffect(() => {
        if (!isOpen) return;

        setCohortSubjectId(assignment ? String(assignment.cohort_subject) : '');
        setTitle(assignment?.title ?? '');
        setInstructions(assignment?.instructions ?? '');
        setStartsAt(toDateTimeLocalValue(assignment?.starts_at));
        setDueAt(toDateTimeLocalValue(assignment?.due_at));
        setDeliveryMode(assignment?.delivery_mode ?? 'INDIVIDUAL');
        setEvaluationType(assignment?.evaluation_type ?? 'NUMERIC');
        setTotalMarks(assignment?.total_marks != null ? String(assignment.total_marks) : '');
        setRubricScaleId(assignment?.rubric_scale != null ? String(assignment.rubric_scale) : '');
        setAudienceChoice(getDefaultTeacherAssignmentAudienceChoice(hasLinkedLesson));
        setPublishNow(false);
        setSelectedStudentIds([]);
        setLearnerSearch('');
        setOutcomes(buildInitialOutcomes(assignment));
        setFormError(null);
    }, [assignment, hasLinkedLesson, isOpen]);

    const filteredLearners = useMemo(() => {
        const normalizedSearch = learnerSearch.trim().toLowerCase();

        return (learnersQuery.data?.students ?? []).filter((learner) => {
            if (!normalizedSearch) return true;

            return (
                learner.full_name.toLowerCase().includes(normalizedSearch)
                || learner.admission_number.toLowerCase().includes(normalizedSearch)
            );
        });
    }, [learnerSearch, learnersQuery.data?.students]);

    const saving = createMutation.isPending || updateMutation.isPending;

    const selectedSubject = useMemo(() => (
        sortedSubjects.find((subject) => String(subject.id) === cohortSubjectId) ?? null
    ), [cohortSubjectId, sortedSubjects]);

    const handleToggleStudent = (studentId: number) => {
        setSelectedStudentIds((previous) => (
            previous.includes(studentId)
                ? previous.filter((id) => id !== studentId)
                : [...previous, studentId]
        ));
    };

    const addOutcome = () => {
        setOutcomes((previous) => [
            ...previous,
            {
                outcome_key: '',
                outcome_label: '',
                plugin: '',
                weight: '',
            },
        ]);
    };

    const updateOutcome = (index: number, field: keyof OutcomeDraft, value: string) => {
        setOutcomes((previous) => previous.map((outcome, outcomeIndex) => (
            outcomeIndex === index
                ? { ...outcome, [field]: value }
                : outcome
        )));
    };

    const removeOutcome = (index: number) => {
        setOutcomes((previous) => previous.filter((_, outcomeIndex) => outcomeIndex !== index));
    };

    const validateAndBuildOutcomes = (): AssignmentOutcomeCreatePayload[] | null => {
        const normalizedOutcomes = outcomes
            .map((outcome) => ({
                outcome_key: outcome.outcome_key.trim(),
                outcome_label: outcome.outcome_label.trim(),
                plugin: outcome.plugin.trim(),
                weight: outcome.weight.trim(),
            }))
            .filter((outcome) => (
                outcome.outcome_key
                || outcome.outcome_label
                || outcome.plugin
                || outcome.weight
            ));

        for (const outcome of normalizedOutcomes) {
            if (!outcome.outcome_key || !outcome.outcome_label) {
                setFormError('Each outcome needs both an outcome key and an outcome label.');
                return null;
            }

            if (outcome.weight && Number.isNaN(Number(outcome.weight))) {
                setFormError('Outcome weight must be a valid number.');
                return null;
            }
        }

        return normalizedOutcomes.map((outcome) => ({
            outcome_key: outcome.outcome_key,
            outcome_label: outcome.outcome_label,
            plugin: outcome.plugin || null,
            weight: outcome.weight ? Number(outcome.weight) : 1,
        }));
    };

    const handleSubmit = async () => {
        setFormError(null);

        if (!cohortSubjectId) {
            setFormError('Select a subject group before saving the assignment.');
            return;
        }

        if (!title.trim()) {
            setFormError('Assignment title is required.');
            return;
        }

        if (startsAt && dueAt && new Date(dueAt).getTime() < new Date(startsAt).getTime()) {
            setFormError('Due date must be after the start date.');
            return;
        }

        if (evaluationType === 'NUMERIC' && !totalMarks) {
            setFormError('Total marks are required for numeric assignments.');
            return;
        }

        if (evaluationType === 'RUBRIC' && !rubricScaleId) {
            setFormError('Select a rubric scale for rubric assignments.');
            return;
        }

        if (publishNow && deliveryMode === 'INDIVIDUAL' && audienceChoice === 'selected_learners' && selectedStudentIds.length === 0) {
            setFormError('Select at least one learner before publishing this assignment.');
            return;
        }

        const normalizedOutcomes = validateAndBuildOutcomes();
        if (normalizedOutcomes === null) {
            return;
        }

        const basePayload = {
            cohort_subject: Number(cohortSubjectId),
            title: title.trim(),
            instructions: instructions.trim(),
            starts_at: fromDateTimeLocalValue(startsAt),
            due_at: fromDateTimeLocalValue(dueAt),
            delivery_mode: deliveryMode,
            evaluation_type: evaluationType,
            total_marks: evaluationType === 'NUMERIC' && totalMarks ? Number(totalMarks) : null,
            rubric_scale: evaluationType === 'RUBRIC' && rubricScaleId ? Number(rubricScaleId) : null,
            outcomes: normalizedOutcomes,
            ...(assignment?.curriculum_context ? { curriculum_context: assignment.curriculum_context } : {}),
        };

        try {
            let savedAssignment: Assignment;

            if (isEditMode && assignment) {
                const payload: AssignmentUpdatePayload = basePayload;
                savedAssignment = await updateMutation.mutateAsync({
                    id: assignment.id,
                    data: payload,
                });
            } else {
                const payload: AssignmentCreatePayload = {
                    ...basePayload,
                    created_from_session: resolvedLinkedSessionId,
                    recipient_mode: deliveryMode === 'INDIVIDUAL' && publishNow
                        ? toAssignmentRecipientMode(audienceChoice)
                        : undefined,
                    student_ids: deliveryMode === 'INDIVIDUAL'
                        && publishNow
                        && audienceChoice === 'selected_learners'
                        ? selectedStudentIds
                        : undefined,
                    publish_now: publishNow,
                };
                savedAssignment = await createMutation.mutateAsync(payload);
            }

            onSaved?.(savedAssignment);
            onClose();
        } catch (err) {
            setFormError(err instanceof Error ? err.message : 'Failed to save assignment.');
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={isEditMode ? 'Edit Assignment' : 'Create Assignment'}
            size="xl"
        >
            <div className="space-y-6">
                {formError ? (
                    <ErrorBanner message={formError} onDismiss={() => setFormError(null)} />
                ) : null}

                {sortedSubjects.length === 0 ? (
                    <div className="rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
                        You do not have an assigned subject group in this cohort.
                    </div>
                ) : null}

                <div className="grid gap-4 md:grid-cols-2">
                    <Select
                        label="Subject Group"
                        value={cohortSubjectId}
                        onChange={(event) => setCohortSubjectId(event.target.value)}
                        options={[
                            { value: '', label: 'Select subject group' },
                            ...sortedSubjects.map((subject) => ({
                                value: String(subject.id),
                                label: subject.current_instructor_name
                                    ? `${subject.subject_name} (${subject.current_instructor_name})`
                                    : subject.subject_name,
                            })),
                        ]}
                    />
                    <Input
                        label="Title"
                        value={title}
                        onChange={(event) => setTitle(event.target.value)}
                        placeholder="Assignment title"
                    />
                </div>

                <Select
                    label="Delivery Mode"
                    value={deliveryMode}
                    onChange={(event) => setDeliveryMode(event.target.value as AssignmentDeliveryMode)}
                    options={DELIVERY_MODE_OPTIONS}
                />

                <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">Instructions</label>
                    <textarea
                        value={instructions}
                        onChange={(event) => setInstructions(event.target.value)}
                        placeholder="Explain what learners should complete."
                        rows={5}
                        className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                    <Input
                        label="Starts At"
                        type="datetime-local"
                        value={startsAt}
                        onChange={(event) => setStartsAt(event.target.value)}
                    />
                    <Input
                        label="Due At"
                        type="datetime-local"
                        value={dueAt}
                        onChange={(event) => setDueAt(event.target.value)}
                    />
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                    <Select
                        label="Evaluation Type"
                        value={evaluationType}
                        onChange={(event) => setEvaluationType(event.target.value as AssignmentEvaluationType)}
                        options={EVALUATION_OPTIONS}
                    />

                    {evaluationType === 'NUMERIC' ? (
                        <Input
                            label="Total Marks"
                            type="number"
                            min="1"
                            value={totalMarks}
                            onChange={(event) => setTotalMarks(event.target.value)}
                        />
                    ) : null}

                    {evaluationType === 'RUBRIC' ? (
                        <Select
                            label="Rubric Scale"
                            value={rubricScaleId}
                            onChange={(event) => setRubricScaleId(event.target.value)}
                            options={[
                                { value: '', label: rubricScalesLoading ? 'Loading rubric scales...' : 'Select rubric scale' },
                                ...rubricScales.map((scale) => ({
                                    value: String(scale.id),
                                    label: scale.name,
                                })),
                            ]}
                        />
                    ) : null}
                </div>

                {selectedSubject ? (
                    <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">
                        This assignment belongs to the <span className="font-medium text-gray-900">{selectedSubject.subject_name}</span>
                        {' '}subject group for this cohort.
                        {resolvedLinkedSessionTitle ? (
                            <>
                                {' '}It is linked to <span className="font-medium text-gray-900">{resolvedLinkedSessionTitle}</span>.
                            </>
                        ) : null}
                    </div>
                ) : null}

                {showSessionScopeNote ? (
                    <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
                        This assignment uses the source session&apos;s active participation scope.
                        {participatingCohortCount > 1 ? (
                            <>
                                {' '}It can include learners from all active classes linked to that session.
                            </>
                        ) : null}
                    </div>
                ) : null}

                {deliveryMode === 'GROUP' ? (
                    <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
                        Group assignments create a shared assignment workspace. Create or generate learner groups after saving the assignment.
                    </div>
                ) : null}

                {!isEditMode ? (
                    <div className="space-y-4 rounded-lg border border-gray-200 p-4">
                        <div className="space-y-1">
                            <h3 className="text-sm font-semibold text-gray-900">
                                Publishing
                            </h3>
                            <p className="text-sm text-gray-500">
                                {deliveryMode === 'GROUP'
                                    ? 'Create a draft or publish the assignment workspace now. Learner groups are added from the assignment detail page.'
                                    : 'Create a draft or publish now using a learner audience chosen in teacher language.'}
                            </p>
                        </div>

                        <label className="flex items-start gap-3 rounded-lg border border-gray-200 px-4 py-3">
                            <input
                                type="checkbox"
                                checked={publishNow}
                                onChange={(event) => setPublishNow(event.target.checked)}
                                className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <div>
                                <div className="text-sm font-medium text-gray-900">Publish immediately</div>
                                <p className="text-sm text-gray-500">
                                    {deliveryMode === 'GROUP'
                                        ? 'Publish after creation so the group assignment is ready for learner grouping.'
                                        : 'Publish after creation using the learner audience you choose below.'}
                                </p>
                            </div>
                        </label>

                        {deliveryMode === 'INDIVIDUAL' ? (
                            publishNow ? (
                                <div className="space-y-4">
                                    <AssignmentOptionCards
                                        label="Who should receive this assignment?"
                                        value={audienceChoice}
                                        options={audienceOptions}
                                        onChange={setAudienceChoice}
                                    />

                                    {audienceChoice === 'selected_learners' ? (
                                        <div className="space-y-3">
                                            <p className="text-sm text-gray-500">
                                                {hasLinkedLesson
                                                    ? 'Choose learners from the assignment scope. The backend still decides which learners are eligible for this session-linked assignment.'
                                                    : 'Choose learners from this cohort. Only learners in the selected subject group can receive the assignment.'}
                                            </p>

                                            <Input
                                                label="Find Learners"
                                                value={learnerSearch}
                                                onChange={(event) => setLearnerSearch(event.target.value)}
                                                placeholder="Search by learner name or admission number"
                                            />

                                            {learnersQuery.isLoading ? (
                                                <LoadingSpinner fullScreen={false} message="Loading learners..." />
                                            ) : (
                                                <div className="max-h-64 space-y-2 overflow-y-auto rounded-lg border border-gray-200 p-3">
                                                    {filteredLearners.map((learner) => (
                                                        <label
                                                            key={learner.id}
                                                            className="flex items-start gap-3 rounded-lg border border-gray-100 px-3 py-2"
                                                        >
                                                            <input
                                                                type="checkbox"
                                                                checked={selectedStudentIds.includes(learner.id)}
                                                                onChange={() => handleToggleStudent(learner.id)}
                                                                className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                                            />
                                                            <div>
                                                                <div className="text-sm font-medium text-gray-900">
                                                                    {learner.full_name}
                                                                </div>
                                                                <div className="text-xs text-gray-500">
                                                                    {learner.admission_number}
                                                                </div>
                                                            </div>
                                                        </label>
                                                    ))}

                                                    {filteredLearners.length === 0 ? (
                                                        <p className="text-sm text-gray-500">No learners match this search.</p>
                                                    ) : null}
                                                </div>
                                            )}
                                        </div>
                                    ) : null}
                                </div>
                            ) : (
                                <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">
                                    This assignment will stay as a draft. Choose the learner audience when you publish it.
                                </div>
                            )
                        ) : (
                            <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">
                                Group assignments do not create individual learner recipients.
                            </div>
                        )}
                    </div>
                ) : null}

                <div className="space-y-4 rounded-lg border border-gray-200 p-4">
                    <div className="flex items-center justify-between gap-3">
                        <div>
                            <h3 className="text-sm font-semibold text-gray-900">Outcomes</h3>
                            <p className="text-sm text-gray-500">
                                Add generic outcome metadata when the assignment should later bridge to evidence.
                            </p>
                        </div>
                        <Button type="button" variant="secondary" size="sm" onClick={addOutcome}>
                            Add Outcome
                        </Button>
                    </div>

                    {outcomes.length === 0 ? (
                        <p className="text-sm text-gray-500">No outcomes added yet.</p>
                    ) : (
                        <div className="space-y-3">
                            {outcomes.map((outcome, index) => (
                                <div key={`${index}-${outcome.outcome_key}`} className="rounded-lg border border-gray-200 p-3">
                                    <div className="grid gap-3 md:grid-cols-2">
                                        <Input
                                            label="Outcome Key"
                                            value={outcome.outcome_key}
                                            onChange={(event) => updateOutcome(index, 'outcome_key', event.target.value)}
                                            placeholder="e.g. CBC-LO-1"
                                        />
                                        <Input
                                            label="Outcome Label"
                                            value={outcome.outcome_label}
                                            onChange={(event) => updateOutcome(index, 'outcome_label', event.target.value)}
                                            placeholder="Outcome label"
                                        />
                                        <Input
                                            label="Plugin"
                                            value={outcome.plugin}
                                            onChange={(event) => updateOutcome(index, 'plugin', event.target.value)}
                                            placeholder='Use "cbc" when applicable'
                                        />
                                        <Input
                                            label="Weight"
                                            type="number"
                                            min="0"
                                            step="0.1"
                                            value={outcome.weight}
                                            onChange={(event) => updateOutcome(index, 'weight', event.target.value)}
                                        />
                                    </div>
                                    <div className="mt-3 flex justify-end">
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => removeOutcome(index)}
                                        >
                                            Remove
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                    <Button type="button" variant="ghost" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button
                        type="button"
                        onClick={handleSubmit}
                        disabled={saving || sortedSubjects.length === 0}
                    >
                        {saving
                            ? (isEditMode ? 'Saving...' : 'Creating...')
                            : (isEditMode ? 'Save Changes' : 'Create Assignment')}
                    </Button>
                </div>
            </div>
        </Modal>
    );
}
