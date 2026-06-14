'use client';

import { useEffect, useState, type ReactNode } from 'react';

import { Badge } from '@/app/components/ui/Badge';
import { Button } from '@/app/components/ui/Button';
import { Card } from '@/app/components/ui/Card';
import { ErrorBanner } from '@/app/components/ui/ErrorBanner';
import { LoadingSpinner } from '@/app/components/ui/LoadingSpinner';
import { extractErrorMessage, type ApiError } from '@/app/core/types/errors';
import type { MusicPracticalContract } from '@/app/core/types/session';
import { PracticalLearnerEvidencePanel } from '@/app/plugins/cbc/components/practicals/PracticalLearnerEvidencePanel';
import {
    useResolveMusicPractical,
    useSessionMusicLearnerEvidence,
    useSessionMusicPractical,
} from '@/app/plugins/cbc/hooks/useMusicPracticals';

export function MusicPracticalRequirementsCard({
    sessionId,
    editable,
    actorCanRecord,
    readOnlyMessage,
    initialContract = null,
    onStateChange,
    footer,
}: {
    sessionId: number;
    editable: boolean;
    actorCanRecord: boolean;
    readOnlyMessage: string | null;
    initialContract?: MusicPracticalContract | null;
    onStateChange?: () => Promise<void> | void;
    footer?: ReactNode;
}) {
    const practicalQuery = useSessionMusicPractical(sessionId, true);
    const resolveMutation = useResolveMusicPractical(sessionId);
    const contract = practicalQuery.data ?? initialContract ?? null;
    const learnerMatrixQuery = useSessionMusicLearnerEvidence(
        sessionId,
        Boolean(contract?.resolved),
    );

    const [taskTitle, setTaskTitle] = useState(contract?.practical_task_title ?? '');
    const [taskContext, setTaskContext] = useState(contract?.practical_task_context ?? '');
    const [actionError, setActionError] = useState<string | null>(null);

    useEffect(() => {
        setTaskTitle(contract?.practical_task_title ?? '');
        setTaskContext(contract?.practical_task_context ?? '');
    }, [contract?.practical_task_context, contract?.practical_task_title]);

    const canRecord = editable && actorCanRecord;
    const summary = contract?.learner_evidence_summary;

    const handleResolve = async () => {
        setActionError(null);
        try {
            await resolveMutation.mutateAsync({
                task_title: taskTitle,
                task_context: taskContext,
            });
            if (onStateChange) {
                await onStateChange();
            }
        } catch (error) {
            setActionError(extractErrorMessage(error as ApiError, 'We could not save the Music practical task.'));
        }
    };

    if (practicalQuery.isLoading && !contract) {
        return <LoadingSpinner fullScreen={false} message="Loading Music practical..." />;
    }

    if (practicalQuery.error && !contract) {
        return (
            <ErrorBanner
                message={extractErrorMessage(practicalQuery.error as ApiError, 'We could not load the Music practical workflow.')}
                onDismiss={() => {}}
            />
        );
    }

    return (
        <div className="space-y-4">
            {actionError ? (
                <ErrorBanner
                    message={actionError}
                    onDismiss={() => setActionError(null)}
                />
            ) : null}

            <Card>
                <div className="space-y-5 p-5">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                        <div className="space-y-1">
                            <h2 className="text-lg font-semibold theme-text">Music practical contract</h2>
                            <p className="text-sm theme-muted">
                                Resolve the performance task or context first. The session only becomes closure-ready after present learners have Music evidence linked to confirmed outcomes.
                            </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <Badge variant={contract?.resolved ? 'green' : 'default'}>
                                {contract?.resolved ? 'Task resolved' : 'Task pending'}
                            </Badge>
                            <Badge variant={contract?.learner_evidence_ready ? 'green' : 'yellow'}>
                                {contract?.learner_evidence_ready ? 'Learner evidence ready' : 'Learner evidence in progress'}
                            </Badge>
                        </div>
                    </div>

                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                        <div className="rounded-xl border p-4 theme-border theme-surface-muted">
                            <p className="text-xs font-semibold uppercase tracking-wide theme-subtle">Present learners</p>
                            <p className="mt-2 text-lg font-semibold theme-text">
                                {summary?.present_learners_total ?? 0}
                            </p>
                        </div>
                        <div className="rounded-xl border p-4 theme-border theme-surface-muted">
                            <p className="text-xs font-semibold uppercase tracking-wide theme-subtle">Learners with evidence</p>
                            <p className="mt-2 text-lg font-semibold theme-text">
                                {summary?.present_learners_with_evidence ?? 0}
                            </p>
                        </div>
                        <div className="rounded-xl border p-4 theme-border theme-surface-muted">
                            <p className="text-xs font-semibold uppercase tracking-wide theme-subtle">Missing learners</p>
                            <p className="mt-2 text-lg font-semibold theme-text">
                                {summary?.missing_learners.length ?? 0}
                            </p>
                        </div>
                        <div className="rounded-xl border p-4 theme-border theme-surface-muted">
                            <p className="text-xs font-semibold uppercase tracking-wide theme-subtle">Outcome link gaps</p>
                            <p className="mt-2 text-lg font-semibold theme-text">
                                {summary?.entries_missing_outcome_links.length ?? 0}
                            </p>
                        </div>
                    </div>

                    {!canRecord && readOnlyMessage ? (
                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                            {readOnlyMessage}
                        </div>
                    ) : null}

                    <div className="grid gap-4 lg:grid-cols-2">
                        <label className="block space-y-2">
                            <span className="text-sm font-medium theme-text">Practical task title</span>
                            <input
                                value={taskTitle}
                                onChange={(event) => setTaskTitle(event.target.value)}
                                placeholder="Choir rehearsal, instrumental ensemble, rhythm drills"
                                className="theme-input theme-focus-ring w-full rounded-xl px-3 py-2 text-sm"
                                disabled={!canRecord}
                            />
                        </label>
                        <label className="block space-y-2">
                            <span className="text-sm font-medium theme-text">Practical task context</span>
                            <textarea
                                value={taskContext}
                                onChange={(event) => setTaskContext(event.target.value)}
                                rows={4}
                                placeholder="Describe the performance context, technique focus, or listening/composition task."
                                className="theme-input theme-focus-ring w-full rounded-xl px-3 py-2 text-sm"
                                disabled={!canRecord}
                            />
                        </label>
                    </div>

                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-sm theme-muted">
                            {contract?.message ?? 'Resolve the task, then record learner evidence in the matrix below.'}
                        </p>
                        {canRecord ? (
                            <Button
                                onClick={() => {
                                    void handleResolve();
                                }}
                                disabled={resolveMutation.isPending}
                            >
                                {resolveMutation.isPending ? 'Saving task...' : (contract?.resolved ? 'Update task context' : 'Resolve task / context')}
                            </Button>
                        ) : null}
                    </div>
                </div>
            </Card>

            <PracticalLearnerEvidencePanel
                sessionId={sessionId}
                contract={contract}
                matrix={learnerMatrixQuery.data ?? null}
                editable={editable}
                actorCanRecord={actorCanRecord}
                readOnlyMessage={readOnlyMessage}
                isLoading={learnerMatrixQuery.isLoading}
                loadError={(learnerMatrixQuery.error as ApiError | null) ?? null}
                onRetry={async () => {
                    await Promise.all([
                        practicalQuery.refetch(),
                        learnerMatrixQuery.refetch(),
                    ]);
                }}
                onStateChange={async () => {
                    await Promise.all([
                        practicalQuery.refetch(),
                        learnerMatrixQuery.refetch(),
                    ]);
                    if (onStateChange) {
                        await onStateChange();
                    }
                }}
            />

            {footer ?? null}
        </div>
    );
}
