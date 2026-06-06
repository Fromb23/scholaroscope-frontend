'use client';

import Link from 'next/link';

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
import { FineArtsPracticalRequirementsCard } from '@/app/plugins/cbc/components/fineArts/FineArtsPracticalRequirementsCard';
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
        return (
            <Card>
                <div className="space-y-4 p-6">
                    <div className="space-y-1">
                        <h2 className="text-lg font-semibold theme-text">Fine Arts Practical Task Required</h2>
                        <p className="text-sm theme-muted">
                            {contract?.message ?? 'Resolve the official Fine Arts coursework task before recording evidence or closing this practical session.'}
                        </p>
                    </div>
                    <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                        <Link href={workflowHref}>
                            <Button>Open Fine Arts workflow</Button>
                        </Link>
                    </div>
                </div>
            </Card>
        );
    }

    return (
        <FineArtsPracticalRequirementsCard
            sessionId={session.id}
            editable={editable}
            onStateChange={onSessionDataChanged}
            footer={(
                editable ? (
                    <div className="flex justify-end border-t pt-4 theme-border">
                        <Link href={workflowHref}>
                            <Button variant="secondary">Open Fine Arts workflow</Button>
                        </Link>
                    </div>
                ) : null
            )}
        />
    );
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
