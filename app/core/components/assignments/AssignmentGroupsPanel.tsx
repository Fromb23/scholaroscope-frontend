'use client';

import { useEffect, useMemo, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { Button } from '@/app/components/ui/Button';
import { Card } from '@/app/components/ui/Card';
import { ErrorBanner } from '@/app/components/ui/ErrorBanner';
import { Input } from '@/app/components/ui/Input';
import { LoadingSpinner } from '@/app/components/ui/LoadingSpinner';
import { useCohortEnrolledStudents } from '@/app/core/hooks/useCohortStudents';
import {
    useAddAssignmentGroupMember,
    useCreateAssignmentGroup,
    useDeleteAssignmentGroup,
    useRemoveAssignmentGroupMember,
    useUpdateAssignmentGroup,
} from '@/app/core/hooks/useAssignments';
import type { Assignment, AssignmentGroup } from '@/app/core/types/assignments';

interface AssignmentGroupsPanelProps {
    assignment: Assignment;
    cohortId: number;
    groups: AssignmentGroup[];
    loading: boolean;
    error?: string | null;
    refetch?: () => void;
}

export function AssignmentGroupsPanel({
    assignment,
    cohortId,
    groups,
    loading,
    error = null,
    refetch,
}: AssignmentGroupsPanelProps) {
    const learnersQuery = useCohortEnrolledStudents(cohortId);
    const createMutation = useCreateAssignmentGroup(assignment.id);
    const updateMutation = useUpdateAssignmentGroup();
    const deleteMutation = useDeleteAssignmentGroup();
    const addMemberMutation = useAddAssignmentGroupMember();
    const removeMemberMutation = useRemoveAssignmentGroupMember();
    const [groupName, setGroupName] = useState('');
    const [groupNotes, setGroupNotes] = useState('');
    const [renameDrafts, setRenameDrafts] = useState<Record<number, { name: string; notes: string }>>({});
    const [memberSelections, setMemberSelections] = useState<Record<number, string>>({});
    const [actionError, setActionError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    useEffect(() => {
        setRenameDrafts((previous) => {
            const next = { ...previous };

            groups.forEach((group) => {
                next[group.id] = next[group.id] ?? {
                    name: group.name,
                    notes: group.notes ?? '',
                };
            });

            return next;
        });
    }, [groups]);

    const assignedStudentIds = useMemo(() => (
        new Set(
            groups.flatMap((group) => (group.members ?? []).map((member) => member.student))
        )
    ), [groups]);

    const availableLearnersByGroup = useMemo(() => Object.fromEntries(
        groups.map((group) => [
            group.id,
            (learnersQuery.data?.students ?? []).filter((learner) => !assignedStudentIds.has(learner.id)),
        ])
    ), [assignedStudentIds, groups, learnersQuery.data?.students]);

    const handleCreateGroup = async () => {
        setActionError(null);
        setSuccessMessage(null);

        if (!groupName.trim()) {
            setActionError('Group name is required.');
            return;
        }

        try {
            await createMutation.mutateAsync({
                name: groupName.trim(),
                notes: groupNotes.trim() || undefined,
            });
            setGroupName('');
            setGroupNotes('');
            setSuccessMessage('Group created.');
        } catch (err) {
            setActionError(err instanceof Error ? err.message : 'Failed to create group.');
        }
    };

    const handleRenameGroup = async (group: AssignmentGroup) => {
        setActionError(null);
        setSuccessMessage(null);
        const draft = renameDrafts[group.id];

        if (!draft?.name.trim()) {
            setActionError('Group name is required.');
            return;
        }

        try {
            await updateMutation.mutateAsync({
                groupId: group.id,
                data: {
                    name: draft.name.trim(),
                    notes: draft.notes.trim() || undefined,
                },
            });
            setSuccessMessage(`Updated ${draft.name.trim()}.`);
        } catch (err) {
            setActionError(err instanceof Error ? err.message : 'Failed to update group.');
        }
    };

    const handleDeleteGroup = async (group: AssignmentGroup) => {
        if (!confirm(`Delete group "${group.name}"?`)) {
            return;
        }

        setActionError(null);
        setSuccessMessage(null);

        try {
            await deleteMutation.mutateAsync({
                assignmentId: assignment.id,
                groupId: group.id,
            });
            setSuccessMessage(`Deleted ${group.name}.`);
        } catch (err) {
            setActionError(err instanceof Error ? err.message : 'Failed to delete group.');
        }
    };

    const handleAddMember = async (group: AssignmentGroup) => {
        const selectedStudentId = Number(memberSelections[group.id]);
        if (!Number.isFinite(selectedStudentId) || selectedStudentId <= 0) {
            setActionError('Select a learner before adding them to the group.');
            return;
        }

        setActionError(null);
        setSuccessMessage(null);

        try {
            await addMemberMutation.mutateAsync({
                groupId: group.id,
                data: {
                    student_id: selectedStudentId,
                },
            });
            setMemberSelections((previous) => ({
                ...previous,
                [group.id]: '',
            }));
            setSuccessMessage('Learner added to group.');
        } catch (err) {
            setActionError(err instanceof Error ? err.message : 'Failed to add learner to group.');
        }
    };

    const handleRemoveMember = async (group: AssignmentGroup, studentId: number, studentName: string) => {
        if (!confirm(`Remove ${studentName} from ${group.name}?`)) {
            return;
        }

        setActionError(null);
        setSuccessMessage(null);

        try {
            await removeMemberMutation.mutateAsync({
                assignmentId: assignment.id,
                groupId: group.id,
                studentId,
            });
            setSuccessMessage('Learner removed from group.');
        } catch (err) {
            setActionError(err instanceof Error ? err.message : 'Failed to remove learner from group.');
        }
    };

    return (
        <div className="space-y-4">
            {error ? (
                <ErrorBanner message={error} onDismiss={() => void refetch?.()} />
            ) : null}

            {actionError ? (
                <ErrorBanner message={actionError} onDismiss={() => setActionError(null)} />
            ) : null}

            {learnersQuery.error ? (
                <ErrorBanner message={learnersQuery.error.message} onDismiss={() => void learnersQuery.refetch()} />
            ) : null}

            {successMessage ? (
                <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                    {successMessage}
                </div>
            ) : null}

            <Card>
                <div className="space-y-4">
                    <div className="space-y-1">
                        <h2 className="text-lg font-semibold text-gray-900">Create group</h2>
                        <p className="text-sm text-gray-500">
                            Build teacher-facing groups for classroom work, presentations, projects, or collected books.
                        </p>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                        <Input
                            label="Group Name"
                            value={groupName}
                            onChange={(event) => setGroupName(event.target.value)}
                            placeholder="e.g. Group 1"
                        />
                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700">Notes</label>
                            <textarea
                                value={groupNotes}
                                onChange={(event) => setGroupNotes(event.target.value)}
                                rows={3}
                                placeholder="Optional teacher note"
                                className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                    </div>

                    <div className="flex justify-end">
                        <Button type="button" onClick={handleCreateGroup} disabled={createMutation.isPending}>
                            {createMutation.isPending ? 'Creating...' : 'Create Group'}
                        </Button>
                    </div>
                </div>
            </Card>

            {loading ? (
                <Card>
                    <LoadingSpinner fullScreen={false} message="Loading groups..." />
                </Card>
            ) : groups.length === 0 ? (
                <Card>
                    <div className="py-12 text-center text-sm text-gray-500">
                        No groups yet. Create groups to organize this assignment.
                    </div>
                </Card>
            ) : (
                groups.map((group) => (
                    <Card key={group.id}>
                        <div className="space-y-4">
                            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                                <div>
                                    <h2 className="text-lg font-semibold text-gray-900">{group.name}</h2>
                                    <p className="text-sm text-gray-500">
                                        {(group.member_count ?? group.members?.length ?? 0)} members
                                        {' · '}
                                        {(group.submission_count ?? 0)} submissions
                                    </p>
                                </div>

                                <Button
                                    type="button"
                                    variant="danger"
                                    size="sm"
                                    onClick={() => handleDeleteGroup(group)}
                                    disabled={deleteMutation.isPending}
                                >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Delete
                                </Button>
                            </div>

                            <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto]">
                                <div className="grid gap-4 md:grid-cols-2">
                                    <Input
                                        label="Group Name"
                                        value={renameDrafts[group.id]?.name ?? group.name}
                                        onChange={(event) => setRenameDrafts((previous) => ({
                                            ...previous,
                                            [group.id]: {
                                                name: event.target.value,
                                                notes: previous[group.id]?.notes ?? group.notes ?? '',
                                            },
                                        }))}
                                    />
                                    <div className="space-y-2">
                                        <label className="block text-sm font-medium text-gray-700">Notes</label>
                                        <textarea
                                            value={renameDrafts[group.id]?.notes ?? group.notes ?? ''}
                                            onChange={(event) => setRenameDrafts((previous) => ({
                                                ...previous,
                                                [group.id]: {
                                                    name: previous[group.id]?.name ?? group.name,
                                                    notes: event.target.value,
                                                },
                                            }))}
                                            rows={3}
                                            className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>
                                </div>

                                <div className="flex items-end">
                                    <Button
                                        type="button"
                                        variant="secondary"
                                        onClick={() => handleRenameGroup(group)}
                                        disabled={updateMutation.isPending}
                                    >
                                        {updateMutation.isPending ? 'Saving...' : 'Save Group'}
                                    </Button>
                                </div>
                            </div>

                            <div className="space-y-3 rounded-lg border border-gray-200 bg-gray-50 p-4">
                                <div className="space-y-1">
                                    <div className="text-sm font-medium text-gray-900">Members</div>
                                    <p className="text-sm text-gray-500">
                                        Only learners enrolled in this cohort can be added. Each learner can belong to one group for this assignment.
                                    </p>
                                </div>

                                <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
                                    <div className="space-y-2">
                                        <label className="block text-sm font-medium text-gray-700">Add Learner</label>
                                        <select
                                            value={memberSelections[group.id] ?? ''}
                                            onChange={(event) => setMemberSelections((previous) => ({
                                                ...previous,
                                                [group.id]: event.target.value,
                                            }))}
                                            className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        >
                                            <option value="">
                                                {learnersQuery.isLoading ? 'Loading learners...' : 'Select learner'}
                                            </option>
                                            {(availableLearnersByGroup[group.id] ?? []).map((learner) => (
                                                <option key={learner.id} value={learner.id}>
                                                    {learner.full_name} ({learner.admission_number})
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="flex items-end">
                                        <Button
                                            type="button"
                                            onClick={() => void handleAddMember(group)}
                                            disabled={addMemberMutation.isPending || learnersQuery.isLoading}
                                        >
                                            {addMemberMutation.isPending ? 'Adding...' : 'Add Learner'}
                                        </Button>
                                    </div>
                                </div>

                                {(group.members ?? []).length === 0 ? (
                                    <p className="text-sm text-gray-500">No learners added yet.</p>
                                ) : (
                                    <div className="flex flex-wrap gap-2">
                                        {(group.members ?? []).map((member) => (
                                            <div
                                                key={member.id}
                                                className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
                                            >
                                                <div>
                                                    <div className="font-medium text-gray-900">{member.student_name}</div>
                                                    <div className="text-xs text-gray-500">{member.admission_number}</div>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => void handleRemoveMember(group, member.student, member.student_name)}
                                                    className="text-xs font-medium text-red-600 hover:text-red-700"
                                                    disabled={removeMemberMutation.isPending}
                                                >
                                                    Remove
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </Card>
                ))
            )}
        </div>
    );
}
