'use client';

import { useEffect, useMemo, useState } from 'react';
import Modal from '@/app/components/ui/Modal';
import { Button } from '@/app/components/ui/Button';
import { resolveAssignmentError, type AppError } from '@/app/core/errors';
import { AppErrorBanner, InlineActionError } from '@/app/components/ui/errors';
import { Input } from '@/app/components/ui/Input';
import { LoadingSpinner } from '@/app/components/ui/LoadingSpinner';
import { AssignmentOptionCards } from '@/app/core/components/assignments/AssignmentOptionCards';
import {
    getDefaultTeacherAssignmentAudienceChoice,
    getPublishAudienceOptions,
    toAssignmentRecipientMode,
    type TeacherPublishAudienceChoice,
} from '@/app/core/components/assignments/assignmentAudienceOptions';
import {
    getAssignmentParticipatingCohortCount,
    usesExpandedSessionScope,
} from '@/app/core/components/assignments/assignmentUtils';
import { useAssignmentEligibleLearners, usePublishAssignment } from '@/app/core/hooks/useAssignments';
import type { Assignment } from '@/app/core/types/assignments';


function makePublishValidationError(message: string): AppError {
    return {
        kind: 'validation',
        title: 'Assignment cannot be published yet.',
        message,
        retryable: false,
        severity: 'warning',
        actionLabel: 'Review learners',
    };
}

interface AssignmentPublishModalProps {
    assignment: Assignment;
    isOpen: boolean;
    onClose: () => void;
    onPublished?: () => void;
}

export function AssignmentPublishModal({
    assignment,
    isOpen,
    onClose,
    onPublished,
}: AssignmentPublishModalProps) {
    const learnersQuery = useAssignmentEligibleLearners(assignment.id, { source: 'all' });
    const publishMutation = usePublishAssignment();
    const isAlreadyIssued = assignment.status === 'PUBLISHED';
    const hasLinkedLesson = assignment.created_from_session != null;
    const hasExistingRecipients = assignment.recipients_count > 0;
    const audienceOptions = useMemo(
        () => getPublishAudienceOptions(hasLinkedLesson, hasExistingRecipients),
        [hasExistingRecipients, hasLinkedLesson]
    );
    const participatingCohortCount = useMemo(
        () => getAssignmentParticipatingCohortCount(assignment.curriculum_context),
        [assignment.curriculum_context]
    );
    const showSessionScopeNote = usesExpandedSessionScope(assignment);
    const [audienceChoice, setAudienceChoice] = useState<TeacherPublishAudienceChoice>(
        isAlreadyIssued
            ? 'selected_learners'
            : hasExistingRecipients
                ? 'keep_current'
                : getDefaultTeacherAssignmentAudienceChoice(hasLinkedLesson)
    );
    const [selectedStudentIds, setSelectedStudentIds] = useState<number[]>([]);
    const [learnerSearch, setLearnerSearch] = useState('');
    const [formError, setFormError] = useState<AppError | null>(null);

    useEffect(() => {
        if (!isOpen) return;

        setAudienceChoice(
            isAlreadyIssued
                ? 'selected_learners'
                : hasExistingRecipients
                    ? 'keep_current'
                    : getDefaultTeacherAssignmentAudienceChoice(hasLinkedLesson)
        );
        setSelectedStudentIds([]);
        setLearnerSearch('');
        setFormError(null);
    }, [hasExistingRecipients, hasLinkedLesson, isAlreadyIssued, isOpen]);

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

    const saving = publishMutation.isPending;

    const toggleStudent = (studentId: number) => {
        setSelectedStudentIds((previous) => (
            previous.includes(studentId)
                ? previous.filter((id) => id !== studentId)
                : [...previous, studentId]
        ));
    };

    const handlePublish = async () => {
        setFormError(null);
        const usingCurrentRecipients = audienceChoice === 'keep_current';

        if (
            assignment.delivery_mode === 'INDIVIDUAL'
            && assignment.recipients_count === 0
            && usingCurrentRecipients
        ) {
            setFormError(makePublishValidationError('This draft has no learners yet. Choose who should receive it before publishing.'));
            return;
        }

        if (
            assignment.delivery_mode === 'INDIVIDUAL'
            && audienceChoice === 'selected_learners'
            && selectedStudentIds.length === 0
        ) {
            setFormError(makePublishValidationError('Select at least one learner before publishing this assignment.'));
            return;
        }

        try {
            let publishData:
                | {
                    recipient_mode: ReturnType<typeof toAssignmentRecipientMode>;
                    student_ids?: number[];
                }
                | undefined;

            if (assignment.delivery_mode === 'GROUP' || audienceChoice === 'keep_current') {
                publishData = undefined;
            } else {
                publishData = {
                    recipient_mode: toAssignmentRecipientMode(audienceChoice),
                    student_ids: audienceChoice === 'selected_learners' ? selectedStudentIds : undefined,
                };
            }

            await publishMutation.mutateAsync({
                assignmentId: assignment.id,
                data: publishData,
            });
            onPublished?.();
            onClose();
        } catch (err) {
            setFormError(resolveAssignmentError(err, {
                action: 'publish',
                entityLabel: 'assignment',
                entityName: assignment.title,
                role: 'INSTRUCTOR',
            }));
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={isAlreadyIssued ? 'Add Learners' : 'Issue Assignment'}
            size="lg"
        >
            <div className="space-y-5">
                {formError ? (
                    <InlineActionError error={formError} onDismiss={() => setFormError(null)} />
                ) : null}

                <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">
                    {assignment.delivery_mode === 'GROUP'
                        ? 'This is a group assignment. Publishing opens the workspace, then you add or generate learner groups from the Groups tab.'
                        : isAlreadyIssued
                            ? 'This assignment is already issued. Add learners here without reopening learner work.'
                        : hasLinkedLesson
                            ? 'Publishing this draft uses the source session scope and sends it to the learners you choose below.'
                            : 'Publishing this draft sends it to the learners you choose below.'}
                </div>

                {showSessionScopeNote ? (
                    <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
                        This assignment can include learners from all active classes linked to the source session.
                        {participatingCohortCount > 1 ? ` (${participatingCohortCount} active classes)` : ''}
                    </div>
                ) : null}

                <div className="space-y-2">
                    <h3 className="text-sm font-semibold text-gray-900">{assignment.title}</h3>
                    {assignment.created_from_session_title ? (
                        <p className="text-sm text-gray-500">
                            Linked lesson: {assignment.created_from_session_title}
                        </p>
                    ) : null}
                    {assignment.delivery_mode === 'INDIVIDUAL' ? (
                        <p className="text-sm text-gray-500">
                            Current learners: {assignment.recipients_count}
                        </p>
                    ) : (
                        <p className="text-sm text-gray-500">
                            Delivery mode: Group work
                        </p>
                    )}
                </div>

                {assignment.delivery_mode === 'INDIVIDUAL' ? (
                    <AssignmentOptionCards
                        label="Who should receive this assignment?"
                        value={audienceChoice}
                        options={audienceOptions}
                        onChange={setAudienceChoice}
                    />
                ) : null}

                {assignment.delivery_mode === 'INDIVIDUAL' && audienceChoice === 'selected_learners' ? (
                    <div className="space-y-3">
                        {hasLinkedLesson ? (
                            <p className="text-sm text-gray-500">
                                Choose learners from the eligible session scope. The backend remains the authority for who can be published.
                            </p>
                        ) : null}

                        <Input
                            label="Find Learners"
                            value={learnerSearch}
                            onChange={(event) => setLearnerSearch(event.target.value)}
                            placeholder="Search learner name or admission number"
                        />

                        {learnersQuery.isLoading ? (
                            <LoadingSpinner fullScreen={false} message="Loading learners..." />
                        ) : learnersQuery.error ? (
                            <AppErrorBanner
                                error={resolveAssignmentError(learnersQuery.error, {
                                    action: 'load',
                                    entityLabel: 'eligible learners for this assignment',
                                    role: 'INSTRUCTOR',
                                })}
                                onAction={() => void learnersQuery.refetch()}
                                onDismiss={() => void learnersQuery.refetch()}
                            />
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
                                            onChange={() => toggleStudent(learner.id)}
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

                <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                    <Button type="button" variant="ghost" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button type="button" onClick={handlePublish} disabled={saving}>
                        {saving
                            ? (isAlreadyIssued ? 'Saving learners...' : 'Issuing assignment...')
                            : (isAlreadyIssued ? 'Save learners' : 'Issue assignment')}
                    </Button>
                </div>
            </div>
        </Modal>
    );
}
