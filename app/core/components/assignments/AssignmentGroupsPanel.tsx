'use client';

import { type ReactNode, useEffect, useMemo, useState } from 'react';
import {
    CheckSquare,
    ChevronDown,
    ChevronRight,
    Copy,
    PencilLine,
    Save,
    Square,
    Trash2,
    UserPlus,
    Users,
    Wand2,
} from 'lucide-react';
import { Badge } from '@/app/components/ui/Badge';
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
    formatDateTime,
    getAssignmentParticipatingCohortCount,
    getSubmissionStatusBadgeVariant,
    usesExpandedSessionScope,
} from '@/app/core/components/assignments/assignmentUtils';
import {
    useAssignmentEligibleLearners,
    useAssignmentGroupReuseSources,
    useAutoGenerateAssignmentGroups,
    useBulkAddAssignmentGroupMembers,
    useCopyAssignmentGroupsFromSource,
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
    AssignmentGroupReuseSource,
} from '@/app/core/types/assignments';

interface AssignmentGroupsPanelProps {
    assignment: Assignment;
    groups: AssignmentGroup[];
    loading: boolean;
    error?: string | null;
    refetch?: () => void;
}

type GroupWorkflowMode = 'CREATE' | 'GENERATE' | 'REUSE';
type GroupDraft = {
    name: string;
    notes: string;
};

const textareaClassName = [
    'theme-focus-ring theme-input theme-surface-elevated w-full rounded-lg px-4 py-3',
    'placeholder:text-[color:var(--color-text-subtle)]',
].join(' ');

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
        return 'theme-info-surface';
    }
    if (normalized === 'female') {
        return 'theme-warning-surface';
    }
    return 'theme-surface-muted theme-border theme-muted';
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

function formatDate(value?: string | null): string {
    return value ? new Date(value).toLocaleDateString() : '-';
}

interface CollapsibleSectionProps {
    title: string;
    description: string;
    open: boolean;
    onToggle: () => void;
    children: ReactNode;
    headerExtra?: ReactNode;
}

function CollapsibleSection({
    title,
    description,
    open,
    onToggle,
    children,
    headerExtra = null,
}: CollapsibleSectionProps) {
    return (
        <Card className="overflow-hidden p-0">
            <button
                type="button"
                onClick={onToggle}
                className="theme-focus-ring theme-hover-surface flex w-full items-start justify-between gap-4 px-5 py-4 text-left transition-colors"
            >
                <div className="space-y-1">
                    <div className="flex items-center gap-2">
                        {open ? (
                            <ChevronDown className="h-4 w-4 shrink-0 theme-subtle" />
                        ) : (
                            <ChevronRight className="h-4 w-4 shrink-0 theme-subtle" />
                        )}
                        <h2 className="text-base font-semibold theme-text">{title}</h2>
                    </div>
                    <p className="text-sm theme-muted">{description}</p>
                </div>
                {headerExtra}
            </button>

            {open ? (
                <div className="border-t theme-border px-5 py-4">
                    {children}
                </div>
            ) : null}
        </Card>
    );
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
        <div className="space-y-3 rounded-lg border theme-border theme-surface-muted p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 space-y-1">
                    <div className="text-sm font-medium theme-text">{title}</div>
                    <p className="text-sm theme-muted">{description}</p>
                    <p className="text-xs theme-subtle">{formatLearnerSummary(learners)}</p>
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
                        <CheckSquare className="h-4 w-4" />
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
                        <Square className="h-4 w-4" />
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

            <div className="max-h-72 overflow-y-auto rounded-lg border theme-border theme-surface-elevated">
                {learners.length === 0 ? (
                    <div className="px-4 py-6 text-sm theme-muted">{emptyMessage}</div>
                ) : (
                    <div className="divide-y theme-border">
                        {learners.map((learner) => {
                            const isChecked = selectedIdSet.has(learner.id);

                            return (
                                <label
                                    key={learner.id}
                                    className="theme-hover-surface flex cursor-pointer items-start gap-3 px-4 py-3 transition-colors"
                                >
                                    <input
                                        type="checkbox"
                                        checked={isChecked}
                                        onChange={() => onToggleLearner(learner.id)}
                                        className="theme-checkbox mt-1 h-4 w-4 rounded theme-border"
                                    />
                                    <div className="min-w-0 flex-1">
                                        <div className="block truncate text-sm font-medium theme-text">
                                            {learner.full_name}
                                        </div>
                                        <div className="mt-1 flex flex-wrap gap-2 text-xs">
                                            <span className="theme-subtle">{learner.admission_number}</span>
                                            <span className={`rounded-full border px-2 py-0.5 ${getGenderBadgeClass(learner.gender)}`}>
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

function ReuseSourceCard({
    source,
    selected,
    onSelect,
}: {
    source: AssignmentGroupReuseSource;
    selected: boolean;
    onSelect: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onSelect}
            className={[
                'theme-focus-ring w-full rounded-lg border p-4 text-left transition-colors',
                selected
                    ? 'theme-info-surface border-[color:var(--color-primary)]'
                    : 'theme-surface-elevated theme-border theme-hover-surface theme-hover-border-strong',
            ].join(' ')}
        >
            <div className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="text-sm font-semibold theme-text">{source.title}</div>
                    <Badge variant="blue" size="sm">
                        {source.group_count} groups
                    </Badge>
                </div>

                <div className="flex flex-wrap gap-3 text-xs theme-subtle">
                    <span>Created {formatDate(source.created_at)}</span>
                    {source.due_at ? <span>Due {formatDate(source.due_at)}</span> : null}
                    {source.created_from_session_title ? (
                        <span>{source.created_from_session_title}</span>
                    ) : null}
                </div>

                <div className="flex flex-wrap gap-3 text-sm theme-muted">
                    <span>{source.group_submission_count} submissions</span>
                    <span>{source.group_evaluation_count} reviews</span>
                </div>
            </div>
        </button>
    );
}

function GroupSummaryRow({
    group,
    draft,
    expanded,
    saving,
    deleting,
    removing,
    onToggle,
    onDraftChange,
    onSave,
    onDelete,
    onRemoveMember,
}: {
    group: AssignmentGroup;
    draft: GroupDraft;
    expanded: boolean;
    saving: boolean;
    deleting: boolean;
    removing: boolean;
    onToggle: () => void;
    onDraftChange: (nextDraft: GroupDraft) => void;
    onSave: () => void;
    onDelete: () => void;
    onRemoveMember: (studentId: number, studentName: string) => void;
}) {
    const memberCount = group.member_count ?? group.members?.length ?? 0;
    const submissionCount = group.submission_count ?? 0;
    const evaluationCount = group.evaluation_count ?? 0;

    return (
        <div className="overflow-hidden rounded-lg border theme-border">
            <div className="flex items-start gap-3 px-4 py-4">
                <button
                    type="button"
                    onClick={onToggle}
                    className="theme-focus-ring flex min-w-0 flex-1 items-start gap-3 text-left"
                >
                    {expanded ? (
                        <ChevronDown className="mt-0.5 h-4 w-4 shrink-0 theme-subtle" />
                    ) : (
                        <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 theme-subtle" />
                    )}
                    <div className="min-w-0 space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                            <h3 className="truncate text-sm font-semibold theme-text">{group.name}</h3>
                            {group.latest_submission_status ? (
                                <Badge variant={getSubmissionStatusBadgeVariant(group.latest_submission_status)} size="sm">
                                    {group.latest_submission_status}
                                </Badge>
                            ) : null}
                        </div>

                        <div className="flex flex-wrap gap-3 text-sm">
                            <span className="theme-muted">{memberCount} learners</span>
                            <span className="theme-muted">{submissionCount} submissions</span>
                            <span className="theme-muted">{evaluationCount} reviews</span>
                            {group.latest_evaluated_at ? (
                                <span className="theme-subtle">
                                    Last review {formatDateTime(group.latest_evaluated_at)}
                                </span>
                            ) : null}
                        </div>
                    </div>
                </button>

                <div className="flex shrink-0 gap-2">
                    <Button type="button" variant="ghost" size="sm" onClick={onToggle}>
                        <PencilLine className="h-4 w-4" />
                        Edit
                    </Button>
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={onDelete}
                        disabled={deleting}
                    >
                        <Trash2 className="h-4 w-4" />
                        Delete
                    </Button>
                </div>
            </div>

            {expanded ? (
                <div className="border-t theme-border px-4 py-4">
                    <div className="space-y-4">
                        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                            <Input
                                label="Group name"
                                value={draft.name}
                                onChange={(event) => onDraftChange({
                                    ...draft,
                                    name: event.target.value,
                                })}
                                placeholder="Group 1"
                            />
                            <div className="space-y-2">
                                <label className="block text-sm font-medium theme-text">Teacher note</label>
                                <textarea
                                    value={draft.notes}
                                    onChange={(event) => onDraftChange({
                                        ...draft,
                                        notes: event.target.value,
                                    })}
                                    rows={3}
                                    className={textareaClassName}
                                    placeholder="Optional note for this group"
                                />
                            </div>
                        </div>

                        <div className="rounded-lg border theme-border theme-surface-muted p-4">
                            <div className="space-y-1">
                                <div className="text-sm font-medium theme-text">Learners</div>
                                <p className="text-sm theme-muted">
                                    Remove learners one at a time here. Bulk additions stay in the add-learners section.
                                </p>
                            </div>

                            {(group.members ?? []).length === 0 ? (
                                <p className="mt-3 text-sm theme-muted">No learners added yet.</p>
                            ) : (
                                <div className="mt-3 space-y-2">
                                    {(group.members ?? []).map((member) => (
                                        <div
                                            key={member.id}
                                            className="flex flex-col gap-3 rounded-lg border theme-border theme-surface-elevated px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                                        >
                                            <div className="min-w-0">
                                                <div className="truncate text-sm font-medium theme-text">
                                                    {member.student_name}
                                                </div>
                                                <div className="text-xs theme-subtle">{member.admission_number}</div>
                                            </div>

                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                className="w-full sm:w-auto"
                                                onClick={() => onRemoveMember(member.student, member.student_name)}
                                                disabled={removing}
                                            >
                                                Remove
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="flex justify-end">
                            <Button
                                type="button"
                                variant="secondary"
                                onClick={onSave}
                                disabled={saving}
                            >
                                <Save className="h-4 w-4" />
                                {saving ? 'Saving...' : 'Save'}
                            </Button>
                        </div>
                    </div>
                </div>
            ) : null}
        </div>
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
    const copyGroupsMutation = useCopyAssignmentGroupsFromSource(assignment.id);
    const removeMemberMutation = useRemoveAssignmentGroupMember();

    const [workflowMode, setWorkflowMode] = useState<GroupWorkflowMode>('CREATE');
    const [createSectionOpen, setCreateSectionOpen] = useState(false);
    const [addLearnersSectionOpen, setAddLearnersSectionOpen] = useState(false);
    const [existingGroupsSectionOpen, setExistingGroupsSectionOpen] = useState(true);
    const [expandedGroupId, setExpandedGroupId] = useState<number | null>(null);

    const [groupName, setGroupName] = useState('');
    const [groupNotes, setGroupNotes] = useState('');
    const [renameDrafts, setRenameDrafts] = useState<Record<number, GroupDraft>>({});

    const [manualGroupId, setManualGroupId] = useState<number | null>(null);
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

    const [selectedReuseSourceId, setSelectedReuseSourceId] = useState<number | null>(null);
    const [reuseReplaceExisting, setReuseReplaceExisting] = useState(false);

    const [actionError, setActionError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    const autoLearnerSource = autoAudienceChoice === 'present_in_lesson'
        ? 'present_in_lesson'
        : 'all';
    const autoLearnersQuery = useAssignmentEligibleLearners(assignment.id, {
        source: autoLearnerSource,
        exclude_grouped: false,
    });
    const reuseSourcesQuery = useAssignmentGroupReuseSources(assignment.id, {
        enabled: createSectionOpen && workflowMode === 'REUSE',
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
            setExpandedGroupId(null);
            return;
        }

        setManualGroupId((current) => (
            current && groups.some((group) => group.id === current)
                ? current
                : groups[0].id
        ));
        setExpandedGroupId((current) => (
            current && groups.some((group) => group.id === current)
                ? current
                : null
        ));
    }, [groups]);

    useEffect(() => {
        const sourceIds = new Set(reuseSourcesQuery.sources.map((source) => source.id));
        setSelectedReuseSourceId((current) => (
            current && sourceIds.has(current) ? current : reuseSourcesQuery.sources[0]?.id ?? null
        ));
    }, [reuseSourcesQuery.sources]);

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
    const visibleManualLearners = useMemo(
        () => filterLearners(ungroupedLearners, manualSearch),
        [manualSearch, ungroupedLearners]
    );
    const visibleAutoLearners = useMemo(
        () => filterLearners(autoEligibleLearners, autoSearch),
        [autoEligibleLearners, autoSearch]
    );
    const groupOptions = useMemo(
        () => groups.map((group) => ({ value: group.id, label: group.name })),
        [groups]
    );
    const selectedReuseSource = useMemo(
        () => reuseSourcesQuery.sources.find((source) => source.id === selectedReuseSourceId) ?? null,
        [reuseSourcesQuery.sources, selectedReuseSourceId]
    );
    const groupedLearnerCount = useMemo(
        () => groups.reduce((total, group) => total + (group.member_count ?? group.members?.length ?? 0), 0),
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
            setExistingGroupsSectionOpen(true);
            if (createdGroup) {
                setManualGroupId(createdGroup.id);
                setExpandedGroupId(createdGroup.id);
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
            setAddLearnersSectionOpen(false);
            setExistingGroupsSectionOpen(true);
            setExpandedGroupId(result.group.id);
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
                mode: autoMode,
                name_prefix: autoNamePrefix.trim() || 'Group',
                balance_gender: autoBalanceGender,
                replace_existing: autoReplaceExisting,
                shuffle: true,
                student_source: toAssignmentGroupStudentSource(autoAudienceChoice),
                ...(autoMode === 'BY_GROUP_COUNT'
                    ? { group_count: Number(autoGroupCount) }
                    : { members_per_group: Number(autoMembersPerGroup) }),
                ...(autoAudienceChoice === 'selected_learners'
                    ? { student_ids: autoSelectedLearnerIds }
                    : {}),
            });
            const firstGroup = result.groups[0] ?? null;
            setExistingGroupsSectionOpen(true);
            if (firstGroup) {
                setManualGroupId(firstGroup.id);
                setExpandedGroupId(firstGroup.id);
            }
            setSuccessMessage(
                `Created ${result.created_count} group${result.created_count === 1 ? '' : 's'} with ${result.member_created_count} learner${result.member_created_count === 1 ? '' : 's'}.`
            );
        } catch (err) {
            setActionError(err instanceof Error ? err.message : 'Failed to generate groups.');
        }
    };

    const handleReuseGroups = async () => {
        resetFeedback();

        if (!selectedReuseSourceId) {
            setActionError('Choose a source assignment to reuse.');
            return;
        }

        try {
            const result = await copyGroupsMutation.mutateAsync({
                source_assignment_id: selectedReuseSourceId,
                replace_existing: reuseReplaceExisting,
            });
            const firstGroup = result.groups[0] ?? null;
            setExistingGroupsSectionOpen(true);
            if (firstGroup) {
                setManualGroupId(firstGroup.id);
                setExpandedGroupId(firstGroup.id);
            }
            setSuccessMessage(
                `Reused ${result.created_count} group${result.created_count === 1 ? '' : 's'} with ${result.member_created_count} learner${result.member_created_count === 1 ? '' : 's'}.`
            );
        } catch (err) {
            setActionError(err instanceof Error ? err.message : 'Failed to reuse groups.');
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
                <div className="theme-success-surface rounded-lg px-4 py-3 text-sm">
                    {successMessage}
                </div>
            ) : null}

            <Card className="p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-1">
                        <h2 className="text-base font-semibold theme-text">Group tools</h2>
                        <p className="text-sm theme-muted">
                            Use one workflow at a time, keep add-learners separate, and expand only the group you want to edit.
                        </p>
                        <div className="flex flex-wrap gap-3 text-sm theme-subtle">
                            <span>{groups.length} groups</span>
                            <span>{groupedLearnerCount} grouped learners</span>
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        <Button
                            type="button"
                            variant={workflowMode === 'CREATE' ? 'primary' : 'secondary'}
                            size="sm"
                            onClick={() => {
                                setWorkflowMode('CREATE');
                                setCreateSectionOpen(true);
                            }}
                        >
                            <Users className="h-4 w-4" />
                            Create
                        </Button>
                        <Button
                            type="button"
                            variant={workflowMode === 'GENERATE' ? 'primary' : 'secondary'}
                            size="sm"
                            onClick={() => {
                                setWorkflowMode('GENERATE');
                                setCreateSectionOpen(true);
                            }}
                        >
                            <Wand2 className="h-4 w-4" />
                            Generate
                        </Button>
                        <Button
                            type="button"
                            variant={workflowMode === 'REUSE' ? 'primary' : 'secondary'}
                            size="sm"
                            onClick={() => {
                                setWorkflowMode('REUSE');
                                setCreateSectionOpen(true);
                            }}
                        >
                            <Copy className="h-4 w-4" />
                            Reuse
                        </Button>
                    </div>
                </div>
            </Card>

            <CollapsibleSection
                title="Create groups"
                description="Choose whether to create a group manually, generate a fresh set, or reuse a previous assignment's structure."
                open={createSectionOpen}
                onToggle={() => setCreateSectionOpen((current) => !current)}
            >
                <div className="space-y-4">
                    <AssignmentOptionCards
                        label="Grouping workflow"
                        value={workflowMode}
                        onChange={(value) => setWorkflowMode(value as GroupWorkflowMode)}
                        options={[
                            {
                                value: 'CREATE',
                                label: 'Create new groups',
                                helper: 'Add teacher-defined groups one by one.',
                            },
                            {
                                value: 'GENERATE',
                                label: 'Generate new groups',
                                helper: 'Build groups automatically from assignment-eligible learners.',
                            },
                            {
                                value: 'REUSE',
                                label: 'Reuse existing groups',
                                helper: 'Copy a compatible previous assignment group set into this assignment.',
                            },
                        ]}
                    />

                    {workflowMode === 'CREATE' ? (
                        <div className="space-y-4 rounded-lg border theme-border p-4">
                            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                                <Input
                                    label="Group name"
                                    value={groupName}
                                    onChange={(event) => setGroupName(event.target.value)}
                                    placeholder="Group 1"
                                />
                                <div className="space-y-2">
                                    <label className="block text-sm font-medium theme-text">Teacher note</label>
                                    <textarea
                                        value={groupNotes}
                                        onChange={(event) => setGroupNotes(event.target.value)}
                                        rows={3}
                                        placeholder="Optional note for this group"
                                        className={textareaClassName}
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end">
                                <Button
                                    type="button"
                                    onClick={handleCreateGroup}
                                    disabled={createMutation.isPending}
                                >
                                    <UserPlus className="h-4 w-4" />
                                    {createMutation.isPending ? 'Creating...' : 'Create group'}
                                </Button>
                            </div>
                        </div>
                    ) : null}

                    {workflowMode === 'GENERATE' ? (
                        <div className="space-y-4 rounded-lg border theme-border p-4">
                            {assignment.created_from_session_title ? (
                                <div className="theme-info-surface rounded-lg px-4 py-3 text-sm">
                                    <p className="font-medium theme-text">
                                        Linked lesson: {assignment.created_from_session_title}
                                    </p>
                                    {showSessionScopeNote ? (
                                        <p className="mt-1 theme-muted">
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

                            <div className="space-y-3 rounded-lg border theme-border theme-surface-muted p-4">
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
                                        description="Choose the learners to include in this grouping run."
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
                                        <p className="text-sm theme-muted">
                                            {autoAudienceChoice === 'present_in_lesson'
                                                ? 'Grouping will use learners marked present or late across the source session participation scope.'
                                                : assignment.created_from_session != null
                                                    ? 'Grouping will use all active learners in this assignment scope, including classes linked to the source session.'
                                                    : 'Grouping will use all active learners in this subject group.'}
                                        </p>
                                        <p className="text-sm font-medium theme-text">
                                            {formatLearnerSummary(autoEligibleLearners)}
                                        </p>
                                    </div>
                                )}
                            </div>

                            <div className="space-y-3 rounded-lg border theme-border theme-surface-muted p-4">
                                <label className="flex cursor-pointer items-start gap-3">
                                    <input
                                        type="checkbox"
                                        checked={autoBalanceGender}
                                        onChange={(event) => setAutoBalanceGender(event.target.checked)}
                                        className="theme-checkbox mt-1 h-4 w-4 rounded theme-border"
                                    />
                                    <div className="min-w-0">
                                        <div className="text-sm font-medium theme-text">
                                            Balance boys and girls where possible
                                        </div>
                                        <p className="text-sm theme-muted">
                                            This uses learner gender as a guide and still keeps group sizes as even as possible.
                                        </p>
                                    </div>
                                </label>

                                <label className="flex cursor-pointer items-start gap-3">
                                    <input
                                        type="checkbox"
                                        checked={autoReplaceExisting}
                                        onChange={(event) => setAutoReplaceExisting(event.target.checked)}
                                        className="theme-checkbox mt-1 h-4 w-4 rounded theme-border"
                                    />
                                    <div className="min-w-0">
                                        <div className="text-sm font-medium theme-text">
                                            Replace existing groups when allowed
                                        </div>
                                        <p className="text-sm theme-muted">
                                            Backend rules still block replacement after submissions or evaluations exist.
                                        </p>
                                    </div>
                                </label>
                            </div>

                            <div className="flex justify-end">
                                <Button
                                    type="button"
                                    onClick={handleGenerateGroups}
                                    disabled={
                                        autoGenerateMutation.isPending
                                        || autoLearnersQuery.isLoading
                                        || Boolean(autoLearnersQuery.error)
                                    }
                                >
                                    <Wand2 className="h-4 w-4" />
                                    {autoGenerateMutation.isPending ? 'Generating...' : 'Generate groups'}
                                </Button>
                            </div>
                        </div>
                    ) : null}

                    {workflowMode === 'REUSE' ? (
                        <div className="space-y-4 rounded-lg border theme-border p-4">
                            {reuseSourcesQuery.error ? (
                                <ErrorBanner
                                    message={reuseSourcesQuery.error}
                                    onDismiss={() => void reuseSourcesQuery.refetch()}
                                />
                            ) : null}

                            {reuseSourcesQuery.loading ? (
                                <LoadingSpinner fullScreen={false} message="Loading reusable group sets..." />
                            ) : reuseSourcesQuery.sources.length === 0 ? (
                                <div className="rounded-lg border border-dashed theme-border px-4 py-6 text-sm theme-muted">
                                    No compatible previous group assignments were found for this assignment scope.
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div className="grid gap-3">
                                        {reuseSourcesQuery.sources.map((source) => (
                                            <ReuseSourceCard
                                                key={source.id}
                                                source={source}
                                                selected={selectedReuseSourceId === source.id}
                                                onSelect={() => setSelectedReuseSourceId(source.id)}
                                            />
                                        ))}
                                    </div>

                                    {selectedReuseSource ? (
                                        <div className="rounded-lg border theme-border theme-surface-muted px-4 py-3 text-sm">
                                            <div className="font-medium theme-text">{selectedReuseSource.title}</div>
                                            <div className="mt-1 flex flex-wrap gap-3 theme-muted">
                                                <span>{selectedReuseSource.group_count} groups</span>
                                                <span>{selectedReuseSource.group_submission_count} submissions</span>
                                                <span>{selectedReuseSource.group_evaluation_count} reviews</span>
                                            </div>
                                        </div>
                                    ) : null}

                                    <label className="flex cursor-pointer items-start gap-3 rounded-lg border theme-border theme-surface-muted p-4">
                                        <input
                                            type="checkbox"
                                            checked={reuseReplaceExisting}
                                            onChange={(event) => setReuseReplaceExisting(event.target.checked)}
                                            className="theme-checkbox mt-1 h-4 w-4 rounded theme-border"
                                        />
                                        <div className="min-w-0">
                                            <div className="text-sm font-medium theme-text">
                                                Replace existing groups when backend allows it
                                            </div>
                                            <p className="text-sm theme-muted">
                                                Use this only if the target assignment already has groups and no submissions or evaluations have been recorded.
                                            </p>
                                        </div>
                                    </label>

                                    <div className="flex justify-end">
                                        <Button
                                            type="button"
                                            onClick={handleReuseGroups}
                                            disabled={copyGroupsMutation.isPending || !selectedReuseSourceId}
                                        >
                                            <Copy className="h-4 w-4" />
                                            {copyGroupsMutation.isPending ? 'Reusing...' : 'Reuse groups'}
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : null}
                </div>
            </CollapsibleSection>

            <CollapsibleSection
                title="Add learners to group"
                description="Choose a target group, search assignment-eligible learners, and add several in one step."
                open={addLearnersSectionOpen}
                onToggle={() => setAddLearnersSectionOpen((current) => !current)}
                headerExtra={(
                    <span className="rounded-full border theme-border px-3 py-1 text-xs font-medium theme-muted">
                        {manualSelectedLearnerIds.length} selected
                    </span>
                )}
            >
                <div className="space-y-4">
                    {manualLearnersErrorMessage ? (
                        <ErrorBanner
                            message={manualLearnersErrorMessage}
                            onDismiss={() => void manualLearnersQuery.refetch()}
                        />
                    ) : null}

                    {groups.length === 0 ? (
                        <div className="rounded-lg border border-dashed theme-border px-4 py-6 text-sm theme-muted">
                            Create or reuse a group first, then add learners into it.
                        </div>
                    ) : manualLearnersQuery.isLoading ? (
                        <LoadingSpinner fullScreen={false} message="Loading learners..." />
                    ) : (
                        <div className="space-y-4">
                            <Select
                                label="Target group"
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
                                <p className="text-sm theme-muted">
                                    {manualSelectedLearnerIds.length} learner
                                    {manualSelectedLearnerIds.length === 1 ? '' : 's'} selected
                                </p>
                                <Button
                                    type="button"
                                    onClick={handleBulkAddLearners}
                                    disabled={bulkAddMutation.isPending || !selectedManualGroup}
                                >
                                    <UserPlus className="h-4 w-4" />
                                    {bulkAddMutation.isPending ? 'Adding...' : 'Add learners to group'}
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </CollapsibleSection>

            <CollapsibleSection
                title="Existing groups"
                description="Review one group at a time. Each group stays collapsed until you choose to edit it."
                open={existingGroupsSectionOpen}
                onToggle={() => setExistingGroupsSectionOpen((current) => !current)}
                headerExtra={(
                    <span className="rounded-full border theme-border px-3 py-1 text-xs font-medium theme-muted">
                        {groups.length} total
                    </span>
                )}
            >
                {loading ? (
                    <LoadingSpinner fullScreen={false} message="Loading groups..." />
                ) : groups.length === 0 ? (
                    <div className="rounded-lg border border-dashed theme-border px-4 py-8 text-sm theme-muted">
                        No groups yet. Use the create, generate, or reuse workflow above to build the first set.
                    </div>
                ) : (
                    <div className="space-y-3">
                        {groups.map((group) => (
                            <GroupSummaryRow
                                key={group.id}
                                group={group}
                                draft={renameDrafts[group.id] ?? {
                                    name: group.name,
                                    notes: group.notes ?? '',
                                }}
                                expanded={expandedGroupId === group.id}
                                saving={updateMutation.isPending}
                                deleting={deleteMutation.isPending}
                                removing={removeMemberMutation.isPending}
                                onToggle={() => setExpandedGroupId((current) => current === group.id ? null : group.id)}
                                onDraftChange={(nextDraft) => setRenameDrafts((current) => ({
                                    ...current,
                                    [group.id]: nextDraft,
                                }))}
                                onSave={() => void handleSaveGroup(group)}
                                onDelete={() => void handleDeleteGroup(group)}
                                onRemoveMember={(studentId, studentName) => (
                                    void handleRemoveMember(group, studentId, studentName)
                                )}
                            />
                        ))}
                    </div>
                )}
            </CollapsibleSection>
        </div>
    );
}
