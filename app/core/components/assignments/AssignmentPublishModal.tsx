'use client';

import { useEffect, useMemo, useState } from 'react';
import Modal from '@/app/components/ui/Modal';
import { Button } from '@/app/components/ui/Button';
import { ErrorBanner } from '@/app/components/ui/ErrorBanner';
import { Input } from '@/app/components/ui/Input';
import { LoadingSpinner } from '@/app/components/ui/LoadingSpinner';
import { Select } from '@/app/components/ui/Select';
import { useCohortEnrolledStudents } from '@/app/core/hooks/useCohortStudents';
import { useCreateAssignmentRecipients, usePublishAssignment } from '@/app/core/hooks/useAssignments';
import type { Assignment, AssignmentRecipientMode } from '@/app/core/types/assignments';

interface AssignmentPublishModalProps {
    assignment: Assignment;
    cohortId: number;
    isOpen: boolean;
    onClose: () => void;
    onPublished?: () => void;
}

const PUBLISH_RECIPIENT_OPTIONS: Array<{ value: AssignmentRecipientMode; label: string }> = [
    { value: 'none', label: 'Use current recipients' },
    { value: 'ALL_ACTIVE_COHORT_LEARNERS', label: 'All active cohort learners' },
    { value: 'EXPLICIT_STUDENTS', label: 'Explicit learner selection' },
];

export function AssignmentPublishModal({
    assignment,
    cohortId,
    isOpen,
    onClose,
    onPublished,
}: AssignmentPublishModalProps) {
    const learnersQuery = useCohortEnrolledStudents(cohortId);
    const createRecipientsMutation = useCreateAssignmentRecipients(assignment.id);
    const publishMutation = usePublishAssignment();
    const [recipientMode, setRecipientMode] = useState<AssignmentRecipientMode>('none');
    const [selectedStudentIds, setSelectedStudentIds] = useState<number[]>([]);
    const [learnerSearch, setLearnerSearch] = useState('');
    const [formError, setFormError] = useState<string | null>(null);

    useEffect(() => {
        if (!isOpen) return;

        setRecipientMode('none');
        setSelectedStudentIds([]);
        setLearnerSearch('');
        setFormError(null);
    }, [isOpen]);

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

    const saving = createRecipientsMutation.isPending || publishMutation.isPending;

    const toggleStudent = (studentId: number) => {
        setSelectedStudentIds((previous) => (
            previous.includes(studentId)
                ? previous.filter((id) => id !== studentId)
                : [...previous, studentId]
        ));
    };

    const handlePublish = async () => {
        setFormError(null);

        if (assignment.recipients_count === 0 && recipientMode === 'none') {
            setFormError('This draft has no recipients yet. Choose a recipient mode before publishing.');
            return;
        }

        if (recipientMode === 'EXPLICIT_STUDENTS' && selectedStudentIds.length === 0) {
            setFormError('Select at least one learner for explicit publication.');
            return;
        }

        try {
            if (recipientMode !== 'none') {
                await createRecipientsMutation.mutateAsync({
                    recipient_mode: recipientMode,
                    student_ids: recipientMode === 'EXPLICIT_STUDENTS' ? selectedStudentIds : undefined,
                });
            }

            await publishMutation.mutateAsync(assignment.id);
            onPublished?.();
            onClose();
        } catch (err) {
            setFormError(err instanceof Error ? err.message : 'Failed to publish assignment.');
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Publish Assignment" size="lg">
            <div className="space-y-5">
                {formError ? (
                    <ErrorBanner message={formError} onDismiss={() => setFormError(null)} />
                ) : null}

                <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">
                    Publishing this draft keeps the cohort as navigation context, but recipients are still assigned through the underlying cohort subject workflow.
                </div>

                <div className="space-y-2">
                    <h3 className="text-sm font-semibold text-gray-900">{assignment.title}</h3>
                    <p className="text-sm text-gray-500">
                        Current recipients: {assignment.recipients_count}
                    </p>
                </div>

                <Select
                    label="Recipient Mode"
                    value={recipientMode}
                    onChange={(event) => setRecipientMode(event.target.value as AssignmentRecipientMode)}
                    options={PUBLISH_RECIPIENT_OPTIONS}
                />

                {recipientMode === 'EXPLICIT_STUDENTS' ? (
                    <div className="space-y-3">
                        <Input
                            label="Find Learners"
                            value={learnerSearch}
                            onChange={(event) => setLearnerSearch(event.target.value)}
                            placeholder="Search learner name or admission number"
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
                            </div>
                        )}
                    </div>
                ) : null}

                <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                    <Button type="button" variant="ghost" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button type="button" onClick={handlePublish} disabled={saving}>
                        {saving ? 'Publishing...' : 'Publish Assignment'}
                    </Button>
                </div>
            </div>
        </Modal>
    );
}
