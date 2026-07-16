'use client';

import Link from 'next/link';

import { Badge } from '@/app/components/ui/Badge';
import { Button } from '@/app/components/ui/Button';
import { Card } from '@/app/components/ui/Card';
import { ErrorBanner } from '@/app/components/ui/ErrorBanner';
import { LoadingSpinner } from '@/app/components/ui/LoadingSpinner';
import type {
    FineArtsPracticalContract,
    MusicPracticalContract,
    SessionDetail,
} from '@/app/core/types/session';
import { resolveErrorMessage, type ApiError } from '@/app/core/types/errors';
import { useSessionCbcPracticalProfile } from '@/app/plugins/cbc/hooks/usePracticalProfiles';
import { buildPracticalWorkflowHref } from '@/app/plugins/cbc/lib/practicalProfiles';

function compactStatusVariant(complete: boolean) {
    return complete ? 'green' : 'default';
}

function FineArtsPracticalStatusCard({
    contract,
    workflowHref,
}: {
    contract: FineArtsPracticalContract | null;
    workflowHref: string;
}) {
    const presentWithEvidence = contract?.learner_evidence_summary?.present_learners_with_evidence ?? 0;
    const presentTotal = contract?.learner_evidence_summary?.present_learners_total ?? 0;
    const missingLearners = contract?.learner_evidence_summary?.missing_learners ?? [];
    const missingRequiredTypes = contract?.learner_evidence_summary?.missing_required_evidence_types ?? [];
    const learnerEvidenceComplete = Boolean(contract?.learner_evidence_ready);
    const sessionProofComplete = Boolean(contract?.session_proof_complete);
    const taskResolved = Boolean(contract?.resolved && contract?.coursework_task);
    const missingSummary = missingLearners.length > 0
        ? `${missingLearners.length} learner${missingLearners.length === 1 ? '' : 's'} still need worksheet evidence.`
        : missingRequiredTypes.length > 0
            ? `Required categories still missing: ${missingRequiredTypes.length}.`
            : null;
    const statusMessage = !taskResolved
        ? (contract?.message ?? 'Resolve the official coursework task before recording Fine Arts evidence.')
        : sessionProofComplete && !learnerEvidenceComplete
            ? 'Session proof is complete. Continue in the practical workflow to complete learner evidence.'
            : learnerEvidenceComplete
                ? 'Fine Arts practical evidence is up to date for this session.'
                : (contract?.message ?? 'Continue in the practical workflow to complete learner evidence.');

    return (
        <Card>
            <div className="space-y-5 p-6">
                <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-lg font-semibold theme-text">Fine Arts Practical</h2>
                        {contract?.coursework_task?.task_code ? (
                            <Badge variant="blue">{contract.coursework_task.task_code}</Badge>
                        ) : null}
                    </div>
                    <p className="text-sm theme-muted">{statusMessage}</p>
                </div>

                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    <div className="rounded-xl border p-4 theme-border theme-surface-muted">
                        <p className="text-xs font-semibold uppercase tracking-wide theme-subtle">Coursework task</p>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                            <Badge variant={compactStatusVariant(taskResolved)}>{taskResolved ? 'Resolved' : 'Pending'}</Badge>
                        </div>
                    </div>
                    <div className="rounded-xl border p-4 theme-border theme-surface-muted">
                        <p className="text-xs font-semibold uppercase tracking-wide theme-subtle">Session proof</p>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                            <Badge variant={compactStatusVariant(sessionProofComplete)}>{sessionProofComplete ? 'Complete' : 'Incomplete'}</Badge>
                        </div>
                    </div>
                    <div className="rounded-xl border p-4 theme-border theme-surface-muted">
                        <p className="text-xs font-semibold uppercase tracking-wide theme-subtle">Learner evidence</p>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                            <Badge variant={compactStatusVariant(learnerEvidenceComplete)}>
                                {learnerEvidenceComplete ? 'Complete' : 'In progress'}
                            </Badge>
                        </div>
                    </div>
                    <div className="rounded-xl border p-4 theme-border theme-surface-muted">
                        <p className="text-xs font-semibold uppercase tracking-wide theme-subtle">Present learners with evidence</p>
                        <p className="mt-2 text-lg font-semibold theme-text">
                            {presentWithEvidence}/{presentTotal}
                        </p>
                    </div>
                </div>

                {missingSummary ? (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                        {missingSummary}
                    </div>
                ) : null}

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="text-sm theme-muted">
                        {missingRequiredTypes.length > 0
                            ? `${missingRequiredTypes.length} required categor${missingRequiredTypes.length === 1 ? 'y is' : 'ies are'} still missing across the session.`
                            : 'Required categories are represented across the session.'}
                    </div>
                    <Link href={workflowHref}>
                        <Button>Open practical workflow</Button>
                    </Link>
                </div>
            </div>
        </Card>
    );
}

function MusicPracticalStatusCard({
    contract,
    workflowHref,
    actorCanRecord,
    readOnlyMessage,
}: {
    contract: MusicPracticalContract | null;
    workflowHref: string;
    actorCanRecord: boolean;
    readOnlyMessage: string | null;
}) {
    const summary = contract?.learner_evidence_summary;
    const taskResolved = Boolean(contract?.resolved);
    const sessionProofComplete = Boolean(contract?.session_proof_complete);
    const learnerEvidenceComplete = Boolean(contract?.learner_evidence_ready);
    const presentTotal = summary?.present_learners_total ?? 0;
    const presentWithEvidence = summary?.present_learners_with_evidence ?? 0;
    const missingLearners = summary?.missing_learners ?? [];
    const missingOutcomeLinks = summary?.entries_missing_outcome_links ?? [];
    const taskLabel = contract?.practical_task_title || 'Practical task / context pending';
    const statusMessage = !taskResolved
        ? (contract?.message ?? 'Resolve the Music practical task or context before recording learner evidence.')
        : learnerEvidenceComplete
            ? 'Music practical evidence is up to date for this session.'
            : (contract?.message ?? 'Continue in the practical workflow to complete learner performance evidence.');

    return (
        <Card>
            <div className="space-y-5 p-6">
                <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-lg font-semibold theme-text">Music Practical</h2>
                        <Badge variant="blue">{taskResolved ? 'Resolved' : 'Pending task'}</Badge>
                    </div>
                    <p className="text-sm theme-muted">{statusMessage}</p>
                    <p className="text-sm font-medium theme-text">{taskLabel}</p>
                    {contract?.practical_task_context ? (
                        <p className="text-sm theme-muted">{contract.practical_task_context}</p>
                    ) : null}
                </div>

                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    <div className="rounded-xl border p-4 theme-border theme-surface-muted">
                        <p className="text-xs font-semibold uppercase tracking-wide theme-subtle">Task / context</p>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                            <Badge variant={compactStatusVariant(taskResolved)}>{taskResolved ? 'Resolved' : 'Pending'}</Badge>
                        </div>
                    </div>
                    <div className="rounded-xl border p-4 theme-border theme-surface-muted">
                        <p className="text-xs font-semibold uppercase tracking-wide theme-subtle">Attendance and outcomes</p>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                            <Badge variant={compactStatusVariant(sessionProofComplete)}>
                                {sessionProofComplete ? 'Ready' : 'Needs action'}
                            </Badge>
                        </div>
                    </div>
                    <div className="rounded-xl border p-4 theme-border theme-surface-muted">
                        <p className="text-xs font-semibold uppercase tracking-wide theme-subtle">Learner evidence</p>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                            <Badge variant={compactStatusVariant(learnerEvidenceComplete)}>
                                {learnerEvidenceComplete ? 'Complete' : 'In progress'}
                            </Badge>
                        </div>
                    </div>
                    <div className="rounded-xl border p-4 theme-border theme-surface-muted">
                        <p className="text-xs font-semibold uppercase tracking-wide theme-subtle">Present learners with evidence</p>
                        <p className="mt-2 text-lg font-semibold theme-text">
                            {presentWithEvidence}/{presentTotal}
                        </p>
                    </div>
                </div>

                {missingLearners.length > 0 || missingOutcomeLinks.length > 0 ? (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                        {missingLearners.length > 0
                            ? `${missingLearners.length} present learner${missingLearners.length === 1 ? '' : 's'} still need Music practical evidence.`
                            : 'All present learners have evidence, but some entries still need confirmed outcome links.'}
                    </div>
                ) : null}

                {!actorCanRecord && readOnlyMessage ? (
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                        {readOnlyMessage}
                    </div>
                ) : null}

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="text-sm theme-muted">
                        Music practicals stay inside the normal session chain: attendance first, confirmed outcomes next, learner evidence before closure.
                    </div>
                    <Link href={workflowHref}>
                        <Button>{actorCanRecord ? 'Open practical workflow' : 'Review practical workflow'}</Button>
                    </Link>
                </div>
            </div>
        </Card>
    );
}

export function PracticalLessonPanel({
    session,
}: {
    session: SessionDetail;
}) {
    const practicalQuery = useSessionCbcPracticalProfile(session.id, true);
    const workflowHref = buildPracticalWorkflowHref(
        session.id,
        `/sessions/${session.id}?section=complete`,
    );

    if (practicalQuery.isLoading && !practicalQuery.data) {
        return (
            <Card>
                <LoadingSpinner message="Loading practical status..." fullScreen={false} />
            </Card>
        );
    }

    if (practicalQuery.error) {
        return (
            <Card>
                <ErrorBanner
                    message={resolveErrorMessage(practicalQuery.error as ApiError, 'We could not load the practical requirements.')}
                    onDismiss={() => {}}
                />
            </Card>
        );
    }

    if (!practicalQuery.data?.is_cbc_practical || !practicalQuery.data.profile) {
        return null;
    }

    if (practicalQuery.data.profile.key === 'FINE_ARTS') {
        return (
            <FineArtsPracticalStatusCard
                contract={(practicalQuery.data.contract as FineArtsPracticalContract | null) ?? null}
                workflowHref={workflowHref}
            />
        );
    }

    if (practicalQuery.data.profile.key === 'MUSIC') {
        return (
            <MusicPracticalStatusCard
                contract={(practicalQuery.data.contract as MusicPracticalContract | null) ?? null}
                workflowHref={workflowHref}
                actorCanRecord={practicalQuery.data.profile.actor_can_record}
                readOnlyMessage={practicalQuery.data.profile.read_only_message}
            />
        );
    }

    return null;
}
