'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { CheckCircle2, ClipboardList, FolderOpen, MessageSquareText, Palette } from 'lucide-react';

import { Badge } from '@/app/components/ui/Badge';
import { Button } from '@/app/components/ui/Button';
import { Card } from '@/app/components/ui/Card';
import { ErrorBanner } from '@/app/components/ui/ErrorBanner';
import { LoadingSpinner } from '@/app/components/ui/LoadingSpinner';
import { Select } from '@/app/components/ui/Select';
import { extractErrorMessage, type ApiError } from '@/app/core/types/errors';
import type { FineArtsPracticalEvidencePayload } from '@/app/core/types/session';
import { useFineArtsCourseworkTasks, useRecordFineArtsPracticalEvidence, useResolveFineArtsPractical, useSessionFineArtsPractical } from '@/app/plugins/cbc/hooks/useFineArtsPracticals';
import { hasResolvedFineArtsPracticalContract } from '@/app/plugins/cbc/lib/fineArtsPracticals';

interface FineArtsPracticalRequirementsCardProps {
    sessionId: number;
    editable?: boolean;
    title?: string;
    onStateChange?: () => Promise<void> | void;
    footer?: ReactNode;
}

function formatExhibitionLabel(exhibitionType?: 'MINI_EXHIBITION' | 'END_YEAR_EXHIBITION' | null) {
    return exhibitionType === 'END_YEAR_EXHIBITION'
        ? 'End Year Exhibition'
        : 'Mini Exhibition';
}

function formatEvidenceLabel(value: string) {
    return value
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (character) => character.toUpperCase());
}

export function FineArtsPracticalRequirementsCard({
    sessionId,
    editable = false,
    title = 'Fine Arts Practical Requirements',
    onStateChange,
    footer,
}: FineArtsPracticalRequirementsCardProps) {
    const practicalQuery = useSessionFineArtsPractical(sessionId, true);
    const tasksQuery = useFineArtsCourseworkTasks();
    const resolveMutation = useResolveFineArtsPractical(sessionId);
    const evidenceMutation = useRecordFineArtsPracticalEvidence(sessionId);
    const contract = practicalQuery.data ?? null;
    const tasks = tasksQuery.data ?? [];
    const [selectedTaskId, setSelectedTaskId] = useState<string>('');
    const [teacherFeedbackDraft, setTeacherFeedbackDraft] = useState('');
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        setTeacherFeedbackDraft(contract?.teacher_feedback ?? '');
    }, [contract?.teacher_feedback]);

    useEffect(() => {
        if (!contract?.coursework_task?.id) {
            setSelectedTaskId('');
            return;
        }

        setSelectedTaskId(String(contract.coursework_task.id));
    }, [contract?.coursework_task?.id]);

    const canSaveTeacherFeedback = useMemo(() => (
        editable && teacherFeedbackDraft.trim() !== (contract?.teacher_feedback ?? '').trim()
    ), [contract?.teacher_feedback, editable, teacherFeedbackDraft]);

    const handleStateChange = async () => {
        await practicalQuery.refetch();
        await onStateChange?.();
    };

    const handleResolve = async () => {
        const taskId = Number(selectedTaskId);
        if (!Number.isFinite(taskId) || taskId <= 0) {
            setError('Select the official Fine Arts coursework task for this practical session.');
            return;
        }

        try {
            setError(null);
            await resolveMutation.mutateAsync({ coursework_task_id: taskId });
            await handleStateChange();
        } catch (mutationError) {
            setError(extractErrorMessage(mutationError as ApiError));
        }
    };

    const handleToggleRequirement = async (
        evidenceType: FineArtsPracticalEvidencePayload['evidence_type'],
        recorded: boolean,
    ) => {
        try {
            setError(null);
            await evidenceMutation.mutateAsync({
                evidence_type: evidenceType,
                recorded: !recorded,
            });
            await handleStateChange();
        } catch (mutationError) {
            setError(extractErrorMessage(mutationError as ApiError));
        }
    };

    const handleSaveTeacherFeedback = async () => {
        try {
            setError(null);
            await evidenceMutation.mutateAsync({
                evidence_type: 'TEACHER_FEEDBACK',
                recorded: teacherFeedbackDraft.trim().length > 0,
                notes: teacherFeedbackDraft,
            });
            await handleStateChange();
        } catch (mutationError) {
            setError(extractErrorMessage(mutationError as ApiError));
        }
    };

    if (practicalQuery.isLoading && !contract) {
        return (
            <Card>
                <LoadingSpinner message="Loading Fine Arts practical requirements..." fullScreen={false} />
            </Card>
        );
    }

    if (practicalQuery.error) {
        return (
            <Card>
                <ErrorBanner
                    message={extractErrorMessage(practicalQuery.error as ApiError, 'We could not load the Fine Arts practical requirements.')}
                    onDismiss={() => {}}
                />
            </Card>
        );
    }

    const resolved = hasResolvedFineArtsPracticalContract(contract);

    return (
        <Card>
            <div className="space-y-5 p-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-1">
                        <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
                        <p className="text-sm text-gray-600">
                            {contract?.message
                                ?? 'Resolve the official coursework task, then record the required practical evidence before closing the lesson.'}
                        </p>
                    </div>
                    {resolved && contract?.coursework_task ? (
                        <div className="flex flex-wrap gap-2">
                            <Badge variant="blue">{contract.coursework_task.task_code}</Badge>
                            <Badge variant="default">Term {contract.coursework_task.term_number}</Badge>
                            <Badge variant="default">{formatExhibitionLabel(contract.coursework_task.exhibition_type)}</Badge>
                        </div>
                    ) : null}
                </div>

                {error ? (
                    <ErrorBanner
                        message={error}
                        compact
                        onDismiss={() => setError(null)}
                    />
                ) : null}

                {!resolved ? (
                    <div className="space-y-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
                        <div className="space-y-1">
                            <p className="text-sm font-medium text-amber-900">Official coursework task required</p>
                            <p className="text-sm text-amber-800">
                                Fine Arts practical evidence stays locked until this session resolves to exactly one official coursework task.
                            </p>
                        </div>

                        {editable ? (
                            <div className="space-y-3">
                                <Select
                                    label="Fine Arts coursework task"
                                    value={selectedTaskId}
                                    onChange={(event) => setSelectedTaskId(event.target.value)}
                                    disabled={tasksQuery.isLoading || resolveMutation.isPending}
                                    options={[
                                        { value: '', label: 'Select the official Fine Arts task' },
                                        ...tasks.map((task) => ({
                                            value: task.id,
                                            label: `${task.task_code} · ${task.name} (Term ${task.term_number})`,
                                        })),
                                    ]}
                                />
                                <div className="flex justify-end">
                                    <Button
                                        type="button"
                                        onClick={() => {
                                            void handleResolve();
                                        }}
                                        disabled={resolveMutation.isPending || !selectedTaskId}
                                    >
                                        {resolveMutation.isPending ? 'Resolving...' : 'Resolve coursework task'}
                                    </Button>
                                </div>
                            </div>
                        ) : null}
                    </div>
                ) : null}

                {resolved && contract?.coursework_task ? (
                    <>
                        <div className="grid gap-4 lg:grid-cols-2">
                            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                                <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                                    <Palette className="h-4 w-4 text-orange-700" />
                                    Coursework guidance
                                </div>
                                <dl className="mt-3 space-y-3 text-sm">
                                    <div>
                                        <dt className="text-gray-500">Annual theme</dt>
                                        <dd className="font-medium text-gray-900">{contract.coursework_task.annual_theme}</dd>
                                    </div>
                                    <div>
                                        <dt className="text-gray-500">Term sub-theme</dt>
                                        <dd className="font-medium text-gray-900">{contract.coursework_task.term_sub_theme}</dd>
                                    </div>
                                    <div>
                                        <dt className="text-gray-500">Strand</dt>
                                        <dd className="font-medium text-gray-900">{contract.coursework_task.strand}</dd>
                                    </div>
                                    <div>
                                        <dt className="text-gray-500">Sub-strand</dt>
                                        <dd className="font-medium text-gray-900">{contract.coursework_task.sub_strand}</dd>
                                    </div>
                                </dl>
                            </div>

                            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                                <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                                    <ClipboardList className="h-4 w-4 text-blue-700" />
                                    Scoring criteria
                                </div>
                                <div className="mt-3 space-y-2">
                                    {contract.assessment_criteria.map((criterion) => (
                                        <div
                                            key={criterion.key}
                                            className="flex items-center justify-between rounded-lg bg-white px-3 py-2 text-sm"
                                        >
                                            <span className="text-gray-800">{criterion.label}</span>
                                            <span className="font-semibold text-gray-900">{criterion.max_marks} marks</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                            <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                                <FolderOpen className="h-4 w-4 text-green-700" />
                                Required evidence
                            </div>
                            <div className="mt-3 space-y-3">
                                {contract.requirements.map((requirement) => (
                                    <div
                                        key={requirement.key}
                                        className="flex flex-col gap-3 rounded-lg bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                                    >
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                                <p className="text-sm font-medium text-gray-900">{requirement.label}</p>
                                                <Badge variant={requirement.recorded ? 'green' : 'default'}>
                                                    {requirement.recorded ? 'Recorded' : 'Required'}
                                                </Badge>
                                            </div>
                                            <p className="text-xs text-gray-500">{formatEvidenceLabel(requirement.evidence_type)}</p>
                                        </div>
                                        {editable ? (
                                            <Button
                                                type="button"
                                                variant={requirement.recorded ? 'secondary' : 'primary'}
                                                onClick={() => {
                                                    void handleToggleRequirement(requirement.evidence_type, requirement.recorded);
                                                }}
                                                disabled={evidenceMutation.isPending}
                                            >
                                                {requirement.recorded ? 'Undo' : 'Mark recorded'}
                                            </Button>
                                        ) : null}
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                            <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                                <CheckCircle2 className="h-4 w-4 text-purple-700" />
                                Additional practical records
                            </div>
                            <div className="mt-3 space-y-3">
                                {contract.additional_requirements.map((requirement) => (
                                    <div
                                        key={requirement.key}
                                        className="flex flex-col gap-3 rounded-lg bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                                    >
                                        <div className="flex items-center gap-2">
                                            <p className="text-sm font-medium text-gray-900">{requirement.label}</p>
                                            <Badge variant={requirement.recorded ? 'green' : 'default'}>
                                                {requirement.recorded ? 'Recorded' : 'Optional'}
                                            </Badge>
                                        </div>
                                        {editable ? (
                                            <Button
                                                type="button"
                                                variant={requirement.recorded ? 'secondary' : 'primary'}
                                                onClick={() => {
                                                    void handleToggleRequirement(requirement.evidence_type, requirement.recorded);
                                                }}
                                                disabled={evidenceMutation.isPending}
                                            >
                                                {requirement.recorded ? 'Undo' : 'Mark recorded'}
                                            </Button>
                                        ) : null}
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                            <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                                <MessageSquareText className="h-4 w-4 text-slate-700" />
                                Teacher feedback
                            </div>
                            <div className="mt-3 space-y-3">
                                <textarea
                                    value={teacherFeedbackDraft}
                                    onChange={(event) => setTeacherFeedbackDraft(event.target.value)}
                                    rows={4}
                                    disabled={!editable || evidenceMutation.isPending}
                                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="Add practical-session feedback for the coursework task..."
                                />
                                {editable ? (
                                    <div className="flex justify-end">
                                        <Button
                                            type="button"
                                            variant="secondary"
                                            disabled={!canSaveTeacherFeedback || evidenceMutation.isPending}
                                            onClick={() => {
                                                void handleSaveTeacherFeedback();
                                            }}
                                        >
                                            Save feedback
                                        </Button>
                                    </div>
                                ) : null}
                            </div>
                        </div>
                    </>
                ) : null}

                {footer}
            </div>
        </Card>
    );
}
