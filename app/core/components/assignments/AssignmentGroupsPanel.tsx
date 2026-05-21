'use client';

import { useEffect, useMemo, useState } from 'react';
import {
    CheckSquare,
    Save,
    Square,
    Trash2,
    UserPlus,
    Users,
    Wand2,
} from 'lucide-react';
import { Button } from '@/app/components/ui/Button';
import { Card } from '@/app/components/ui/Card';
import { ErrorBanner } from '@/app/components/ui/ErrorBanner';
import { Input } from '@/app/components/ui/Input';
import { LoadingSpinner } from '@/app/components/ui/LoadingSpinner';
import { Select } from '@/app/components/ui/Select';
import { AssignmentOptionCards } from '@/app/core/components/assignments/AssignmentOptionCards';
import {
    getDefaultTeacherAssignmentAudienceChoice,
    getGroupingAudienceOptions,
    mapGroupingAudienceError,
    toAssignmentGroupStudentSource,
    type TeacherAssignmentAudienceChoice,
} from '@/app/core/components/assignments/assignmentAudienceOptions';
import {
    getAssignmentParticipatingCohortCount,
    usesExpandedSessionScope,
} from '@/app/core/components/assignments/assignmentUtils';
import {
    useAssignmentEligibleLearners,
    useAutoGenerateAssignmentGroups,
    useBulkAddAssignmentGroupMembers,
    useCreateAssignmentGroup,
    useDeleteAssignmentGroup,
    useRemoveAssignmentGroupMember,
    useUpdateAssignmentGroup,
} from '@/app/core/hooks/useAssignments';
import type {
    Assignment,
    AssignmentAutoGenerateMode,
    AssignmentEligibleLearner,
    AssignmentGroup,
} from '@/app/core/types/assignments';

interface AssignmentGroupsPanelProps {
    assignment: Assignment;
    groups: AssignmentGroup[];
    loading: boolean;
    error?: string | null;
    refetch?: () => void;
}

type GroupPanelMode = 'MANUAL' | 'AUTO';
type GroupDraft = {
    name: string;
    notes: string;
};

function normalizeGender(gender?: string | null): 'male' | 'female' | 'unknown' {
    const value = (gender ?? '').trim().toLowerCase();
    if (['m', 'male', 'boy', 'boys'].includes(value)) return 'male';
    if (['f', 'female', 'girl', 'girls'].includes(value)) return 'female';
    return 'unknown';
}

function getGenderLabel(gender?: string | null): string {
    const normalized = normalizeGender(gender);
    if (normalized === 'male') return 'Boy';
    if (normalized === 'female') return 'Girl';
    return 'Not set';
}

function getGenderBadgeClass(gender?: string | null): string {
    const normalized = normalizeGender(gender);
    if (normalized === 'male') {
        return 'bg-blue-50 text-blue-700 border-blue-200';
    }
    if (normalized === 'female') {
        return 'bg-rose-50 text-rose-700 border-rose-200';
    }
    return 'bg-gray-50 text-gray-600 border-gray-200';
}

function formatLearnerSummary(learners: AssignmentEligibleLearner[]): string {
    const counts = learners.reduce(
        (summary, learner) => {
            const normalized = normalizeGender(learner.gender);
            summary[normalized] += 1;
            return summary;
        },
        { male: 0, female: 0, unknown: 0 }
    );

    const parts = [`${learners.length} learner${learners.length === 1 ? '' : 's'}`];
    if (counts.female > 0) parts.push(`${counts.female} girl${counts.female === 1 ? '' : 's'}`);
    if (counts.male > 0) parts.push(`${counts.male} boy${counts.male === 1 ? '' : 's'}`);
    if (counts.unknown > 0) parts.push(`${counts.unknown} not set`);
    return parts.join(' · ');
}

function filterLearners(
    learners: AssignmentEligibleLearner[],
    search: string
): AssignmentEligibleLearner[] {
    const term = search.trim().toLowerCase();
    if (!term) return learners;

    return learners.filter((learner) => (
        learner.full_name.toLowerCase().includes(term)
        || learner.admission_number.toLowerCase().includes(term)
        || (learner.gender ?? '').toLowerCase().includes(term)
    ));
}

function toggleSelection(currentIds: number[], learnerId: number): number[] {
    return currentIds.includes(learnerId)
        ? currentIds.filter((id) => id !== learnerId)
        : [...currentIds, learnerId];
}

function mergeSelection(currentIds: number[], nextIds: number[]): number[] {
    return Array.from(new Set([...currentIds, ...nextIds]));
}

interface LearnerPickerProps {
    title: string;
    description: string;
    learners: AssignmentEligibleLearner[];
    search: string;
    selectedIds: number[];
    emptyMessage: string;
    onSearchChange: (value: string) => void;
    onToggleLearner: (learnerId: number) => void;
    onSelectShown: () => void;
    onClearSelection: () => void;
}

function LearnerPicker({
    title,
    description,
    learners,
    search,
    selectedIds,
    emptyMessage,
    onSearchChange,
    onToggleLearner,
    onSelectShown,
    onClearSelection,
}: LearnerPickerProps) {
    const selectedIdSet = useMemo(() => new Set(selectedIds), [selectedIds]);

    return (
        <div className="space-y-3 rounded-lg border border-gray-200 bg-gray-50 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 space-y-1">
                    <div className="text-sm font-medium text-gray-900">{title}</div>
                    <p className="text-sm text-gray-500">{description}</p>
                    <p className="text-xs text-gray-500">{formatLearnerSummary(learners)}</p>
                </div>

                <div className="flex flex-wrap gap-2">
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="w-full sm:w-auto"
                        onClick={onSelectShown}
                        disabled={learners.length === 0}
                    >
                        <CheckSquare className="mr-2 h-4 w-4" />
                        Select shown
                    </Button>
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="w-full sm:w-auto"
                        onClick={onClearSelection}
                        disabled={selectedIds.length === 0}
                    >
                        <Square className="mr-2 h-4 w-4" />
                        Clear
                    </Button>
                </div>
            </div>

            <Input
                label="Find learner"
                value={search}
                onChange={(event) => onSearchChange(event.target.value)}
                placeholder="Search by name, admission number, or gender"
            />

            <div className="max-h-72 overflow-y-auto rounded-lg border border-gray-200 bg-white">
                {learners.length === 0 ? (
                    <div className="px-4 py-6 text-sm text-gray-500">{emptyMessage}</div>
                ) : (
                    <div className="divide-y divide-gray-100">
                        {learners.map((learner) => {
                            const isChecked = selectedIdSet.has(learner.id);

                            return (
                                <label
                                    key={learner.id}
                                    className="flex cursor-pointer items-start gap-3 px-4 py-3 hover:bg-gray-50"
                                >
                                    <input
                                        type="checkbox"
                                        checked={isChecked}
                                        onChange={() => onToggleLearner(learner.id)}
                                        className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                    />
                                    <div className="min-w-0 flex-1">
                                        <div className="min-w-0 text-sm font-medium text-gray-900">
                                            <span className="block truncate">{learner.full_name}</span>
                                        </div>
                                        <div className="mt-1 flex flex-wrap gap-2 text-xs text-gray-500">
                                            <span className="truncate">{learner.admission_number}</span>
                                            <span
                                                className={`rounded-full border px-2 py-0.5 ${getGenderBadgeClass(learner.gender)}`}
                                            >
                                                {getGenderLabel(learner.gender)}
                                            </span>
                                        </div>
                                    </div>
                                </label>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}

interface AssignmentGroupCardProps {
    group: AssignmentGroup;
    draft: GroupDraft;
    saving: boolean;
    deleting: boolean;
    removing: boolean;
    onDraftChange: (groupId: number, nextDraft: GroupDraft) => void;
    onSave: (group: AssignmentGroup) => void;
    onDelete: (group: AssignmentGroup) => void;
    onRemoveMember: (group: AssignmentGroup, studentId: number, studentName: string) => void;
}

function AssignmentGroupCard({
    group,
    draft,
    saving,
    deleting,
    removing,
    onDraftChange,
    onSave,
    onDelete,
    onRemoveMember,
}: AssignmentGroupCardProps) {
    return (
        <Card className="p-5">
            <div className="space-y-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                        <h2 className="truncate text-lg font-semibold text-gray-900">{group.name}</h2>
                        <p className="text-sm text-gray-500">
                            {(group.member_count ?? group.members?.length ?? 0)} learners
                            {' · '}
                            {(group.submission_count ?? 0)} submissions
                        </p>
                    </div>

                    <Button
                        type="button"
                        variant="danger"
                        size="sm"
                        className="w-full sm:w-auto"
                        onClick={() => onDelete(group)}
                        disabled={deleting}
                    >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                    </Button>
                </div>

                <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto]">
                    <div className="grid gap-4 md:grid-cols-2">
                        <Input
                            label="Group name"
                            value={draft.name}
                            onChange={(event) => onDraftChange(group.id, {
                                ...draft,
                                name: event.target.value,
                            })}
                            placeholder="Group 1"
                        />
                        <div className="min-w-0 space-y-2">
                            <label className="block text-sm font-medium text-gray-700">Teacher note</label>
                            <textarea
                                value={draft.notes}
                                onChange={(event) => onDraftChange(group.id, {
                                    ...draft,
                                    notes: event.target.value,
                                })}
                                rows={3}
                                className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Optional note for this group"
                            />
                        </div>
                    </div>

                    <div className="flex items-end">
                        <Button
                            type="button"
                            variant="secondary"
                            className="w-full sm:w-auto"
                            onClick={() => onSave(group)}
                            disabled={saving}
                        >
                            <Save className="mr-2 h-4 w-4" />
                            {saving ? 'Saving...' : 'Save'}
                        </Button>
                    </div>
                </div>

                <div className="space-y-3 rounded-lg border border-gray-200 bg-gray-50 p-4">
                    <div className="space-y-1">
                        <div className="text-sm font-medium text-gray-900">Learners</div>
                        <p className="text-sm text-gray-500">
                            Remove learners one at a time here. Add many learners from the group tools above.
                        </p>
                    </div>

                    {(group.members ?? []).length === 0 ? (
                        <p className="text-sm text-gray-500">No learners added yet.</p>
                    ) : (
                        <div className="space-y-2">
                            {(group.members ?? []).map((member) => (
                                <div
                                    key={member.id}
                                    className="flex flex-col gap-3 rounded-lg border border-gray-200 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                                >
                                    <div className="min-w-0">
                                        <div className="truncate text-sm font-medium text-gray-900">
                                            {member.student_name}
                                        </div>
                                        <div className="text-xs text-gray-500">{member.admission_number}</div>
                                    </div>

                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className="w-full sm:w-auto"
                                        onClick={() => onRemoveMember(group, member.student, member.student_name)}
                                        disabled={removing}
                                    >
                                        Remove
                                    </Button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </Card>
    );
}

export function AssignmentGroupsPanel({
    assignment,
    groups,
    loading,
    error = null,
    refetch,
}: AssignmentGroupsPanelProps) {
    const manualLearnersQuery = useAssignmentEligibleLearners(assignment.id, {
        source: 'all',
        exclude_grouped: false,
    });
    const createMutation = useCreateAssignmentGroup(assignment.id);
    const updateMutation = useUpdateAssignmentGroup();
    const deleteMutation = useDeleteAssignmentGroup();
    const bulkAddMutation = useBulkAddAssignmentGroupMembers();
    const autoGenerateMutation = useAutoGenerateAssignmentGroups(assignment.id);
    const removeMemberMutation = useRemoveAssignmentGroupMember();

    const [panelMode, setPanelMode] = useState<GroupPanelMode>('MANUAL');
    const [groupName, setGroupName] = useState('');
    const [groupNotes, setGroupNotes] = useState('');
    const [renameDrafts, setRenameDrafts] = useState<Record<number, GroupDraft>>({});
    const [manualGroupId, setManualGroupId] = useState<number | null>(null);
    const [mobileGroupId, setMobileGroupId] = useState<number | null>(null);
    const [manualSearch, setManualSearch] = useState('');
    const [manualSelectedLearnerIds, setManualSelectedLearnerIds] = useState<number[]>([]);
    const [autoMode, setAutoMode] = useState<AssignmentAutoGenerateMode>('BY_GROUP_COUNT');
    const [autoGroupCount, setAutoGroupCount] = useState('4');
    const [autoMembersPerGroup, setAutoMembersPerGroup] = useState('4');
    const [autoNamePrefix, setAutoNamePrefix] = useState('Group');
    const [autoAudienceChoice, setAutoAudienceChoice] = useState<TeacherAssignmentAudienceChoice>(
        getDefaultTeacherAssignmentAudienceChoice(assignment.created_from_session != null)
    );
    const [autoSearch, setAutoSearch] = useState('');
    const [autoSelectedLearnerIds, setAutoSelectedLearnerIds] = useState<number[]>([]);
    const [autoBalanceGender, setAutoBalanceGender] = useState(true);
    const [autoReplaceExisting, setAutoReplaceExisting] = useState(false);
    const [actionError, setActionError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const autoLearnerSource = autoAudienceChoice === 'present_in_lesson'
        ? 'present_in_lesson'
        : 'all';
    const autoLearnersQuery = useAssignmentEligibleLearners(assignment.id, {
        source: autoLearnerSource,
        exclude_grouped: false,
    });
    const autoAudienceOptions = useMemo(
        () => getGroupingAudienceOptions(assignment.created_from_session != null),
        [assignment.created_from_session]
    );
    const participatingCohortCount = useMemo(
        () => getAssignmentParticipatingCohortCount(assignment.curriculum_context),
        [assignment.curriculum_context]
    );
    const showSessionScopeNote = usesExpandedSessionScope(assignment);

    useEffect(() => {
        setRenameDrafts(() => Object.fromEntries(
            groups.map((group) => [
                group.id,
                {
                    name: group.name,
                    notes: group.notes ?? '',
                },
            ])
        ));
    }, [groups]);

    useEffect(() => {
        if (groups.length === 0) {
            setManualGroupId(null);
            setMobileGroupId(null);
            return;
        }

        setManualGroupId((current) => (
            current && groups.some((group) => group.id === current)
                ? current
                : groups[0].id
        ));
        setMobileGroupId((current) => (
            current && groups.some((group) => group.id === current)
                ? current
                : groups[0].id
        ));
    }, [groups]);

    const manualEligibleLearners = useMemo(
        () => manualLearnersQuery.data?.students ?? [],
        [manualLearnersQuery.data?.students]
    );
    const autoEligibleLearners = useMemo(
        () => autoLearnersQuery.data?.students ?? [],
        [autoLearnersQuery.data?.students]
    );
    const assignedStudentIds = useMemo(() => (
        new Set(
            groups.flatMap((group) => (group.members ?? []).map((member) => member.student))
        )
    ), [groups]);

    const ungroupedLearners = useMemo(
        () => manualEligibleLearners.filter((learner) => !assignedStudentIds.has(learner.id)),
        [assignedStudentIds, manualEligibleLearners]
    );

    useEffect(() => {
        const ungroupedIdSet = new Set(ungroupedLearners.map((learner) => learner.id));
        setManualSelectedLearnerIds((current) => current.filter((id) => ungroupedIdSet.has(id)));
    }, [ungroupedLearners]);

    useEffect(() => {
        const eligibleIdSet = new Set(autoEligibleLearners.map((learner) => learner.id));
        setAutoSelectedLearnerIds((current) => current.filter((id) => eligibleIdSet.has(id)));
    }, [autoEligibleLearners]);

    const selectedManualGroup = useMemo(
        () => groups.find((group) => group.id === manualGroupId) ?? null,
        [groups, manualGroupId]
    );

    const selectedMobileGroup = useMemo(
        () => groups.find((group) => group.id === mobileGroupId) ?? null,
        [groups, mobileGroupId]
    );

    const visibleManualLearners = useMemo(
        () => filterLearners(ungroupedLearners, manualSearch),
        [ungroupedLearners, manualSearch]
    );

    const visibleAutoLearners = useMemo(
        () => filterLearners(autoEligibleLearners, autoSearch),
        [autoEligibleLearners, autoSearch]
    );

    const groupOptions = useMemo(
        () => groups.map((group) => ({ value: group.id, label: group.name })),
        [groups]
    );

    const mobileGroupOptions = useMemo(
        () => groups.map((group) => ({
            value: group.id,
            label: `${group.name} (${group.member_count ?? group.members?.length ?? 0})`,
        })),
        [groups]
    );

    const resetFeedback = () => {
        setActionError(null);
        setSuccessMessage(null);
    };

    const manualLearnersErrorMessage = manualLearnersQuery.error?.message ?? null;
    const autoLearnersErrorMessage = autoLearnersQuery.error
        ? mapGroupingAudienceError(autoLearnersQuery.error.message, autoAudienceChoice)
        : null;

    const handleCreateGroup = async () => {
        resetFeedback();

        if (!groupName.trim()) {
            setActionError('Group name is required.');
            return;
        }

        try {
            const result = await createMutation.mutateAsync({
                name: groupName.trim(),
                notes: groupNotes.trim() || undefined,
            });
            const createdGroup = result.groups[0] ?? null;
            setGroupName('');
            setGroupNotes('');
            if (createdGroup) {
                setManualGroupId(createdGroup.id);
                setMobileGroupId(createdGroup.id);
            }
            setSuccessMessage('Group created.');
        } catch (err) {
            setActionError(err instanceof Error ? err.message : 'Failed to create group.');
        }
    };

    const handleSaveGroup = async (group: AssignmentGroup) => {
        resetFeedback();
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
            setSuccessMessage(`Saved ${draft.name.trim()}.`);
        } catch (err) {
            setActionError(err instanceof Error ? err.message : 'Failed to save group.');
        }
    };

    const handleDeleteGroup = async (group: AssignmentGroup) => {
        if (!confirm(`Delete group "${group.name}"?`)) {
            return;
        }

        resetFeedback();

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

    const handleBulkAddLearners = async () => {
        if (!selectedManualGroup) {
            setActionError('Choose a group before adding learners.');
            return;
        }
        if (manualSelectedLearnerIds.length === 0) {
            setActionError('Choose at least one learner to add.');
            return;
        }

        resetFeedback();

        try {
            const result = await bulkAddMutation.mutateAsync({
                groupId: selectedManualGroup.id,
                data: {
                    student_ids: manualSelectedLearnerIds,
                },
            });
            setManualSelectedLearnerIds([]);
            setManualSearch('');
            setSuccessMessage(
                `Added ${result.created_count} learner${result.created_count === 1 ? '' : 's'} to ${result.group.name}.`
            );
        } catch (err) {
            setActionError(err instanceof Error ? err.message : 'Failed to add learners to group.');
        }
    };

    const handleRemoveMember = async (
        group: AssignmentGroup,
        studentId: number,
        studentName: string
    ) => {
        if (!confirm(`Remove ${studentName} from ${group.name}?`)) {
            return;
        }

        resetFeedback();

        try {
            await removeMemberMutation.mutateAsync({
                assignmentId: assignment.id,
                groupId: group.id,
                studentId,
            });
            setSuccessMessage(`Removed ${studentName} from ${group.name}.`);
        } catch (err) {
            setActionError(err instanceof Error ? err.message : 'Failed to remove learner from group.');
        }
    };

    const handleGenerateGroups = async () => {
        resetFeedback();

        const trimmedPrefix = autoNamePrefix.trim() || 'Group';
        const payload = {
            mode: autoMode,
            name_prefix: trimmedPrefix,
            balance_gender: autoBalanceGender,
            replace_existing: autoReplaceExisting,
            shuffle: true,
        } as const;

        if (autoLearnersErrorMessage) {
            setActionError(autoLearnersErrorMessage);
            return;
        }

        if (autoAudienceChoice === 'selected_learners' && autoSelectedLearnerIds.length === 0) {
            setActionError('Choose at least one learner before generating groups.');
            return;
        }

        try {
            const result = await autoGenerateMutation.mutateAsync({
                ...payload,
                student_source: toAssignmentGroupStudentSource(autoAudienceChoice),
                ...(autoMode === 'BY_GROUP_COUNT'
                    ? { group_count: Number(autoGroupCount) }
                    : { members_per_group: Number(autoMembersPerGroup) }),
                ...(autoAudienceChoice === 'selected_learners'
                    ? { student_ids: autoSelectedLearnerIds }
                    : {}),
            });
            const firstGroup = result.groups[0] ?? null;
            if (firstGroup) {
                setManualGroupId(firstGroup.id);
                setMobileGroupId(firstGroup.id);
            }
            setSuccessMessage(
                `Created ${result.created_count} group${result.created_count === 1 ? '' : 's'} with ${result.member_created_count} learner${result.member_created_count === 1 ? '' : 's'}.`
            );
        } catch (err) {
            setActionError(err instanceof Error ? err.message : 'Failed to generate groups.');
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

            {successMessage ? (
                <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                    {successMessage}
                </div>
            ) : null}

            <Card className="p-5">
                <div className="space-y-4">
                    <div className="space-y-1">
                        <h2 className="text-lg font-semibold text-gray-900">Group tools</h2>
                        <p className="text-sm text-gray-500">
                            Organize classroom work with manual grouping or teacher-led group generation.
                        </p>
                    </div>

                    <div className="grid gap-2 sm:grid-cols-2">
                        <Button
                            type="button"
                            variant={panelMode === 'MANUAL' ? 'primary' : 'secondary'}
                            className="w-full"
                            onClick={() => setPanelMode('MANUAL')}
                        >
                            <Users className="mr-2 h-4 w-4" />
                            Create groups
                        </Button>
                        <Button
                            type="button"
                            variant={panelMode === 'AUTO' ? 'primary' : 'secondary'}
                            className="w-full"
                            onClick={() => setPanelMode('AUTO')}
                        >
                            <Wand2 className="mr-2 h-4 w-4" />
                            Generate groups
                        </Button>
                    </div>
                </div>
            </Card>

            {panelMode === 'MANUAL' ? (
                <>
                    <Card className="p-5">
                        <div className="space-y-4">
                            <div className="space-y-1">
                                <h2 className="text-lg font-semibold text-gray-900">Create groups</h2>
                                <p className="text-sm text-gray-500">
                                    Create teacher-facing groups for presentations, projects, discussions, or collected books.
                                </p>
                            </div>

                            <div className="grid gap-4 md:grid-cols-2">
                                <Input
                                    label="Group name"
                                    value={groupName}
                                    onChange={(event) => setGroupName(event.target.value)}
                                    placeholder="Group 1"
                                />
                                <div className="min-w-0 space-y-2">
                                    <label className="block text-sm font-medium text-gray-700">Teacher note</label>
                                    <textarea
                                        value={groupNotes}
                                        onChange={(event) => setGroupNotes(event.target.value)}
                                        rows={3}
                                        placeholder="Optional note for this group"
                                        className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                            </div>

                            <div className="flex flex-wrap justify-end gap-2">
                                <Button
                                    type="button"
                                    className="w-full sm:w-auto"
                                    onClick={handleCreateGroup}
                                    disabled={createMutation.isPending}
                                >
                                    <UserPlus className="mr-2 h-4 w-4" />
                                    {createMutation.isPending ? 'Creating...' : 'Create group'}
                                </Button>
                            </div>
                        </div>
                    </Card>

                    <Card className="p-5">
                        <div className="space-y-4">
                        <div className="space-y-1">
                            <h2 className="text-lg font-semibold text-gray-900">Add learners to a group</h2>
                            <p className="text-sm text-gray-500">
                                Choose a group, then add several learners in one step. Each learner can belong to one group for this assignment.
                            </p>
                        </div>

                        {manualLearnersErrorMessage ? (
                            <ErrorBanner
                                message={manualLearnersErrorMessage}
                                onDismiss={() => void manualLearnersQuery.refetch()}
                            />
                        ) : null}

                        {groups.length === 0 ? (
                            <div className="rounded-lg border border-dashed border-gray-300 px-4 py-8 text-sm text-gray-500">
                                Create a group first, then place learners into it.
                            </div>
                        ) : manualLearnersQuery.isLoading ? (
                            <LoadingSpinner fullScreen={false} message="Loading learners..." />
                        ) : (
                            <div className="space-y-4">
                                <Select
                                        label="Choose a group"
                                        value={manualGroupId ?? ''}
                                        onChange={(event) => setManualGroupId(Number(event.target.value))}
                                        options={groupOptions}
                                    />

                                    <LearnerPicker
                                        title="Available learners"
                                        description={selectedManualGroup
                                            ? `Add learners to ${selectedManualGroup.name}.`
                                            : 'Choose a group to begin.'}
                                        learners={visibleManualLearners}
                                        search={manualSearch}
                                        selectedIds={manualSelectedLearnerIds}
                                        emptyMessage={manualSearch.trim()
                                            ? 'No learners match this search.'
                                            : 'All eligible learners are already grouped.'}
                                        onSearchChange={setManualSearch}
                                        onToggleLearner={(learnerId) => setManualSelectedLearnerIds((current) => (
                                            toggleSelection(current, learnerId)
                                        ))}
                                        onSelectShown={() => setManualSelectedLearnerIds((current) => (
                                            mergeSelection(current, visibleManualLearners.map((learner) => learner.id))
                                        ))}
                                        onClearSelection={() => setManualSelectedLearnerIds([])}
                                    />

                                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                        <p className="text-sm text-gray-500">
                                            {manualSelectedLearnerIds.length} learner
                                            {manualSelectedLearnerIds.length === 1 ? '' : 's'} selected
                                        </p>
                                        <Button
                                            type="button"
                                            className="w-full sm:w-auto"
                                            onClick={handleBulkAddLearners}
                                            disabled={bulkAddMutation.isPending || !selectedManualGroup}
                                        >
                                            <UserPlus className="mr-2 h-4 w-4" />
                                            {bulkAddMutation.isPending ? 'Adding...' : 'Add selected learners'}
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </Card>
                </>
            ) : (
                <Card className="p-5">
                    <div className="space-y-4">
                        <div className="space-y-1">
                            <h2 className="text-lg font-semibold text-gray-900">Generate groups</h2>
                            <p className="text-sm text-gray-500">
                                Create classroom groups automatically while keeping group sizes even and balancing boys and girls where possible.
                            </p>
                        </div>

                        {assignment.created_from_session_title ? (
                            <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
                                <p className="font-medium text-blue-900">
                                    Linked lesson: {assignment.created_from_session_title}
                                </p>
                                {showSessionScopeNote ? (
                                    <p className="mt-1">
                                        This assignment can include learners from all active classes linked to the source session.
                                        {participatingCohortCount > 1 ? ` (${participatingCohortCount} active classes)` : ''}
                                    </p>
                                ) : null}
                            </div>
                        ) : null}

                        <div className="grid gap-4 md:grid-cols-2">
                            <Select
                                label="Create groups by"
                                value={autoMode}
                                onChange={(event) => setAutoMode(event.target.value as AssignmentAutoGenerateMode)}
                                options={[
                                    { value: 'BY_GROUP_COUNT', label: 'Number of groups' },
                                    { value: 'BY_MEMBERS_PER_GROUP', label: 'Learners per group' },
                                ]}
                            />
                            <Input
                                label={autoMode === 'BY_GROUP_COUNT' ? 'Number of groups' : 'Learners per group'}
                                type="number"
                                min={1}
                                value={autoMode === 'BY_GROUP_COUNT' ? autoGroupCount : autoMembersPerGroup}
                                onChange={(event) => (
                                    autoMode === 'BY_GROUP_COUNT'
                                        ? setAutoGroupCount(event.target.value)
                                        : setAutoMembersPerGroup(event.target.value)
                                )}
                            />
                            <Input
                                label="Group name prefix"
                                value={autoNamePrefix}
                                onChange={(event) => setAutoNamePrefix(event.target.value)}
                                placeholder="Group"
                            />
                        </div>

                        <div className="space-y-3 rounded-lg border border-gray-200 bg-gray-50 p-4">
                            <AssignmentOptionCards
                                label="Which learners should be grouped?"
                                value={autoAudienceChoice}
                                options={autoAudienceOptions}
                                onChange={setAutoAudienceChoice}
                            />

                            {autoLearnersErrorMessage ? (
                                <ErrorBanner
                                    message={autoLearnersErrorMessage}
                                    onDismiss={() => void autoLearnersQuery.refetch()}
                                />
                            ) : autoLearnersQuery.isLoading ? (
                                <LoadingSpinner fullScreen={false} message="Loading learners..." />
                            ) : autoAudienceChoice === 'selected_learners' ? (
                                <LearnerPicker
                                    title="Selected learners"
                                    description="Choose the learners to include in this round of grouping."
                                    learners={visibleAutoLearners}
                                    search={autoSearch}
                                    selectedIds={autoSelectedLearnerIds}
                                    emptyMessage={autoSearch.trim()
                                        ? 'No learners match this search.'
                                        : 'No eligible learners are available.'}
                                    onSearchChange={setAutoSearch}
                                    onToggleLearner={(learnerId) => setAutoSelectedLearnerIds((current) => (
                                        toggleSelection(current, learnerId)
                                    ))}
                                    onSelectShown={() => setAutoSelectedLearnerIds((current) => (
                                        mergeSelection(current, visibleAutoLearners.map((learner) => learner.id))
                                    ))}
                                    onClearSelection={() => setAutoSelectedLearnerIds([])}
                                />
                            ) : (
                                <div className="space-y-1">
                                    <p className="text-sm text-gray-500">
                                        {autoAudienceChoice === 'present_in_lesson'
                                            ? 'Grouping will use learners marked present or late across the source session participation scope.'
                                            : assignment.created_from_session != null
                                                ? 'Grouping will use all active learners in this assignment scope, including classes linked to the source session.'
                                                : 'Grouping will use all active learners in this subject group.'}
                                    </p>
                                    <p className="text-sm font-medium text-gray-900">
                                        {formatLearnerSummary(autoEligibleLearners)}
                                    </p>
                                </div>
                            )}
                        </div>

                        <div className="space-y-3 rounded-lg border border-gray-200 bg-gray-50 p-4">
                            <label className="flex cursor-pointer items-start gap-3">
                                <input
                                    type="checkbox"
                                    checked={autoBalanceGender}
                                    onChange={(event) => setAutoBalanceGender(event.target.checked)}
                                    className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                                <div className="min-w-0">
                                    <div className="text-sm font-medium text-gray-900">
                                        Balance boys and girls where possible
                                    </div>
                                    <p className="text-sm text-gray-500">
                                        This uses learner gender as a guide and still keeps group sizes as even as possible.
                                    </p>
                                </div>
                            </label>

                            <label className="flex cursor-pointer items-start gap-3">
                                <input
                                    type="checkbox"
                                    checked={autoReplaceExisting}
                                    onChange={(event) => setAutoReplaceExisting(event.target.checked)}
                                    className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                                <div className="min-w-0">
                                    <div className="text-sm font-medium text-gray-900">Regenerate existing groups</div>
                                    <p className="text-sm text-gray-500">
                                        Replace current learner groupings when no submissions or evaluations have been recorded yet.
                                    </p>
                                </div>
                            </label>
                        </div>

                        <div className="flex flex-wrap justify-end gap-2">
                            <Button
                                type="button"
                                className="w-full sm:w-auto"
                                onClick={handleGenerateGroups}
                                disabled={
                                    autoGenerateMutation.isPending
                                    || autoLearnersQuery.isLoading
                                    || Boolean(autoLearnersQuery.error)
                                }
                            >
                                <Wand2 className="mr-2 h-4 w-4" />
                                {autoGenerateMutation.isPending ? 'Generating...' : 'Generate Groups'}
                            </Button>
                        </div>
                    </div>
                </Card>
            )}

            {loading ? (
                <Card>
                    <LoadingSpinner fullScreen={false} message="Loading groups..." />
                </Card>
            ) : groups.length === 0 ? (
                <Card>
                    <div className="py-12 text-center text-sm text-gray-500">
                        No groups yet. Use the tools above to create or generate groups for this assignment.
                    </div>
                </Card>
            ) : (
                <div className="space-y-4">
                    <div className="md:hidden">
                        <Card className="p-5">
                            <div className="space-y-3">
                                <div className="space-y-1">
                                    <h2 className="text-lg font-semibold text-gray-900">Existing groups</h2>
                                    <p className="text-sm text-gray-500">
                                        Choose one group at a time on mobile.
                                    </p>
                                </div>

                                <Select
                                    label="Choose a group"
                                    value={mobileGroupId ?? ''}
                                    onChange={(event) => setMobileGroupId(Number(event.target.value))}
                                    options={mobileGroupOptions}
                                />
                            </div>
                        </Card>
                    </div>

                    <div className="space-y-4 md:hidden">
                        {selectedMobileGroup ? (
                            <AssignmentGroupCard
                                group={selectedMobileGroup}
                                draft={renameDrafts[selectedMobileGroup.id] ?? {
                                    name: selectedMobileGroup.name,
                                    notes: selectedMobileGroup.notes ?? '',
                                }}
                                saving={updateMutation.isPending}
                                deleting={deleteMutation.isPending}
                                removing={removeMemberMutation.isPending}
                                onDraftChange={(groupId, nextDraft) => setRenameDrafts((current) => ({
                                    ...current,
                                    [groupId]: nextDraft,
                                }))}
                                onSave={(group) => void handleSaveGroup(group)}
                                onDelete={(group) => void handleDeleteGroup(group)}
                                onRemoveMember={(group, studentId, studentName) => (
                                    void handleRemoveMember(group, studentId, studentName)
                                )}
                            />
                        ) : null}
                    </div>

                    <div className="hidden gap-4 xl:grid xl:grid-cols-2">
                        {groups.map((group) => (
                            <AssignmentGroupCard
                                key={group.id}
                                group={group}
                                draft={renameDrafts[group.id] ?? {
                                    name: group.name,
                                    notes: group.notes ?? '',
                                }}
                                saving={updateMutation.isPending}
                                deleting={deleteMutation.isPending}
                                removing={removeMemberMutation.isPending}
                                onDraftChange={(groupId, nextDraft) => setRenameDrafts((current) => ({
                                    ...current,
                                    [groupId]: nextDraft,
                                }))}
                                onSave={(nextGroup) => void handleSaveGroup(nextGroup)}
                                onDelete={(nextGroup) => void handleDeleteGroup(nextGroup)}
                                onRemoveMember={(nextGroup, studentId, studentName) => (
                                    void handleRemoveMember(nextGroup, studentId, studentName)
                                )}
                            />
                        ))}
                    </div>

                    <div className="hidden space-y-4 md:block xl:hidden">
                        {groups.map((group) => (
                            <AssignmentGroupCard
                                key={group.id}
                                group={group}
                                draft={renameDrafts[group.id] ?? {
                                    name: group.name,
                                    notes: group.notes ?? '',
                                }}
                                saving={updateMutation.isPending}
                                deleting={deleteMutation.isPending}
                                removing={removeMemberMutation.isPending}
                                onDraftChange={(groupId, nextDraft) => setRenameDrafts((current) => ({
                                    ...current,
                                    [groupId]: nextDraft,
                                }))}
                                onSave={(nextGroup) => void handleSaveGroup(nextGroup)}
                                onDelete={(nextGroup) => void handleDeleteGroup(nextGroup)}
                                onRemoveMember={(nextGroup, studentId, studentName) => (
                                    void handleRemoveMember(nextGroup, studentId, studentName)
                                )}
                            />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
