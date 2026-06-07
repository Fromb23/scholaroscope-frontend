'use client';

import Link from 'next/link';

import { Badge } from '@/app/components/ui/Badge';
import { Button } from '@/app/components/ui/Button';
import { Card } from '@/app/components/ui/Card';
import { ErrorBanner } from '@/app/components/ui/ErrorBanner';
import { LoadingSpinner } from '@/app/components/ui/LoadingSpinner';
import {
    registerLessonPlanScheduleExtension,
    type LessonPlanScheduleExtensionComponentProps,
} from '@/app/core/registry/lessonPlanScheduleExtensions';
import {
    registerSessionDetailExtension,
    type SessionDetailExtensionComponentProps,
} from '@/app/core/registry/sessionDetailExtensions';
import {
    registerSessionFormExtension,
    type SessionFormExtensionComponentProps,
} from '@/app/core/registry/sessionFormExtensions';
import { FineArtsPracticalFieldset } from '@/app/plugins/cbc/components/fineArts/FineArtsPracticalFieldset';
import { useSessionFineArtsPractical } from '@/app/plugins/cbc/hooks/useFineArtsPracticals';
import {
    buildFineArtsPracticalContext,
    buildFineArtsPracticalWorkflowHref,
    hasResolvedFineArtsPracticalContract,
    isCbcFineArtsLessonPlanPractical,
    isCbcFineArtsPracticalSession,
    resolveFineArtsTaskTermNumber,
} from '@/app/plugins/cbc/lib/fineArtsPracticals';
import { extractErrorMessage, type ApiError } from '@/app/core/types/errors';
import type { FineArtsPracticalContract } from '@/app/core/types/session';

function compactStatusVariant(complete: boolean) {
    return complete ? 'green' : 'default';
}

function CompactFineArtsStatusCard({
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
            ? 'Session proof is complete. Continue in Fine Arts workflow to complete learner evidence.'
            : learnerEvidenceComplete
                ? 'Fine Arts workflow is up to date for this lesson.'
                : (contract?.message ?? 'Continue in the Fine Arts workflow to complete learner evidence.');

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
                        <Button>Open Fine Arts workflow</Button>
                    </Link>
                </div>
            </div>
        </Card>
    );
}

function SessionFormFineArtsPracticalExtension(props: SessionFormExtensionComponentProps) {
    const termNumber = resolveFineArtsTaskTermNumber(props.formData.term, props.terms);
    const practicalContext = props.formData.practical_context;

    return (
        <FineArtsPracticalFieldset
            title="Fine Arts coursework task"
            description="Choose the official Grade 10 Fine Arts coursework task for this practical session before you create it."
            selectedTaskId={practicalContext?.coursework_task_id ?? null}
            termNumber={termNumber}
            error={props.errors.practical_context}
            onTaskChange={(taskId, taskCode) => {
                props.onChange('practical_context', buildFineArtsPracticalContext(taskId, taskCode));
            }}
        />
    );
}

function LessonPlanFineArtsPracticalExtension(props: LessonPlanScheduleExtensionComponentProps) {
    const practicalContext = props.scheduleForm.practical_context;

    return (
        <FineArtsPracticalFieldset
            title="Fine Arts coursework task"
            description="Choose the official Grade 10 Fine Arts coursework task for this practical lesson before you schedule it."
            selectedTaskId={practicalContext?.coursework_task_id ?? null}
            error={props.errors.practical_context}
            onTaskChange={(taskId, taskCode) => {
                props.onChange({
                    practical_context: buildFineArtsPracticalContext(taskId, taskCode),
                });
            }}
        />
    );
}

function SessionDetailFineArtsPracticalExtension({
    session,
    isHistorical,
    isInProgress,
    onSessionDataChanged,
}: SessionDetailExtensionComponentProps) {
    const practicalQuery = useSessionFineArtsPractical(session.id, true);
    const workflowHref = buildFineArtsPracticalWorkflowHref(
        session.id,
        `/sessions/${session.id}?section=complete`,
    );
    const editable = isInProgress && !isHistorical;

    if (practicalQuery.isLoading && !practicalQuery.data) {
        return (
            <Card>
                <LoadingSpinner message="Loading Fine Arts practical status..." fullScreen={false} />
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

    const contract = practicalQuery.data ?? null;

    if (!hasResolvedFineArtsPracticalContract(contract)) {
        return <CompactFineArtsStatusCard contract={contract} workflowHref={workflowHref} />;
    }

    void editable;
    void onSessionDataChanged;
    return <CompactFineArtsStatusCard contract={contract} workflowHref={workflowHref} />;
}

registerSessionFormExtension({
    key: 'cbc-fine-arts-practical-form',
    priority: 10,
    supports: ({ formData, selectedCurriculum, selectedSubjectOption }) => isCbcFineArtsPracticalSession({
        curriculum_type: selectedCurriculum?.curriculum_type,
        session_type: formData.session_type,
        subject_code: selectedSubjectOption?.subject_code,
        subject_name: selectedSubjectOption?.subject_name ?? selectedSubjectOption?.label,
    }),
    Component: SessionFormFineArtsPracticalExtension,
    validate: ({ formData }): Record<string, string> => {
        if (formData.practical_context?.coursework_task_id || formData.practical_context?.task_code) {
            return {};
        }

        return {
            practical_context: 'Select the Fine Arts coursework task for this practical session.',
        };
    },
});

registerLessonPlanScheduleExtension({
    key: 'cbc-fine-arts-practical-schedule',
    priority: 10,
    supports: ({ lessonPlan, scheduleForm }) => isCbcFineArtsLessonPlanPractical({
        sessionType: scheduleForm.session_type,
        subjectName: lessonPlan.subject_name,
        plannedOutcomes: lessonPlan.planned_outcomes,
    }),
    Component: LessonPlanFineArtsPracticalExtension,
    validate: ({ scheduleForm }): Record<string, string> => {
        if (scheduleForm.practical_context?.coursework_task_id || scheduleForm.practical_context?.task_code) {
            return {};
        }

        return {
            practical_context: 'Select the Fine Arts coursework task for this practical session.',
        };
    },
});

registerSessionDetailExtension({
    key: 'cbc-fine-arts-practical-detail',
    priority: 10,
    supports: ({ session }) => isCbcFineArtsPracticalSession(session),
    Component: SessionDetailFineArtsPracticalExtension,
});
