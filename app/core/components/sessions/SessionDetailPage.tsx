'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
    AlertCircle,
    ArrowLeft,
    BookOpen,
    Calendar,
    CheckCircle2,
    ClipboardCheck,
    Clock,
    Edit,
    FilePlus2,
    FileText,
    Layers,
    MapPin,
    PlayCircle,
    Target,
    type LucideIcon,
} from 'lucide-react';
import { Card } from '@/app/components/ui/Card';
import { Button } from '@/app/components/ui/Button';
import { Badge } from '@/app/components/ui/Badge';
import { LoadingSpinner } from '@/app/components/ui/LoadingSpinner';
import { AttendanceStatsStrip } from '@/app/core/components/sessions/AttendanceStats';
import { AttendanceTable } from '@/app/core/components/sessions/AttendanceTable';
import { ParticipatingCohorts } from '@/app/core/components/sessions/ParticipatingCohorts';
import { RescheduleLessonModal } from '@/app/core/components/sessions/RescheduleLessonModal';
import { useSessionDetail, useSessionCohorts } from '@/app/core/hooks/useSessions';
import { useAttendanceDraft } from '@/app/core/hooks/useAttendanceDraft';
import {
    usesExpandedSessionScope,
} from '@/app/core/components/assignments/assignmentUtils';
import { getCurriculumTypeLabel } from '@/app/core/lib/curriculumBridge';
import { getSessionTeachingWorkflow } from '@/app/core/registry/pluginRoutes';
import type { Assignment } from '@/app/core/types/assignments';
import type { RescheduleSessionPayload } from '@/app/core/types/session';
import { calcAttendanceStats } from '@/app/utils/sessionUtils';
import { useAuth } from '@/app/context/AuthContext';
import { useAssistantPageContext } from '@/app/core/components/assistant/useAssistantPageContext';

type TaughtStatus = 'TAUGHT' | 'PARTIALLY_TAUGHT' | 'NOT_TAUGHT';

const TAUGHT_STATUS_OPTIONS: Array<{
    value: TaughtStatus;
    label: string;
    description: string;
}> = [
    { value: 'TAUGHT', label: 'Taught', description: 'Fully covered in class' },
    { value: 'PARTIALLY_TAUGHT', label: 'Partially taught', description: 'Started but not fully covered' },
    { value: 'NOT_TAUGHT', label: 'Not taught', description: 'Planned but not covered' },
];

function parseSessionDate(value: string | null | undefined) {
    if (!value) {
        return null;
    }

    const [year, month, day] = value.split('-').map(Number);
    if (!year || !month || !day) {
        return null;
    }

    const parsed = new Date(year, month - 1, day);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function parseSessionDateTime(dateValue: string | null | undefined, timeValue: string | null | undefined) {
    const parsedDate = parseSessionDate(dateValue);
    if (!parsedDate || !timeValue) {
        return null;
    }

    const [hours, minutes, seconds = '0'] = timeValue.split(':');
    parsedDate.setHours(Number(hours), Number(minutes), Number(seconds), 0);
    return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
}

function formatSessionDate(value: string | null | undefined, includeYear = true) {
    const parsed = parseSessionDate(value);
    if (!parsed) {
        return null;
    }

    return parsed.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        ...(includeYear ? { year: 'numeric' } : {}),
    });
}

function formatSessionTime(value: string | null | undefined) {
    if (!value) {
        return null;
    }

    const parsed = parseSessionDateTime('2000-01-01', value);
    if (!parsed) {
        return null;
    }

    return parsed.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
    });
}

function formatSessionDateTime(dateValue: string | null | undefined, timeValue: string | null | undefined) {
    const parsed = parseSessionDateTime(dateValue, timeValue);
    if (!parsed) {
        return null;
    }

    return parsed.toLocaleString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
    });
}

function statusBadgeVariant(status: TaughtStatus) {
    if (status === 'TAUGHT') return 'green';
    if (status === 'PARTIALLY_TAUGHT') return 'yellow';
    return 'default';
}

function SessionMetaItem({
    icon: Icon,
    label,
    value,
}: {
    icon: LucideIcon;
    label: string;
    value: string;
}) {
    return (
        <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm text-gray-500">
                <Icon className="h-4 w-4 shrink-0 text-gray-400" />
                <span>{label}</span>
            </div>
            <p className="text-sm font-medium text-gray-900">{value}</p>
        </div>
    );
}

function scrollToSection(sectionId: string) {
    window.requestAnimationFrame(() => {
        document.getElementById(sectionId)?.scrollIntoView({
            behavior: 'smooth',
            block: 'start',
        });
    });
}

export function SessionDetailPage() {
    const params = useParams();
    const sessionId = Number(params.id);
    const { activeRole } = useAuth();
    const isInstructor = activeRole === 'INSTRUCTOR';

    const [searchQuery, setSearchQuery] = useState('');
    const [workflowError, setWorkflowError] = useState<string | null>(null);
    const [workflowSuccess, setWorkflowSuccess] = useState<string | null>(null);
    const [confirmingTaughtOutcomes, setConfirmingTaughtOutcomes] = useState(false);
    const [creatingAssignment, setCreatingAssignment] = useState(false);
    const [showRescheduleModal, setShowRescheduleModal] = useState(false);
    const [preparedAssignment, setPreparedAssignment] = useState<Assignment | null>(null);
    const [taughtSelections, setTaughtSelections] = useState<Record<number, TaughtStatus | ''>>({});
    const [guidedSection, setGuidedSection] = useState<'attendance' | 'taught-outcomes' | 'complete' | 'post-lesson' | null>(null);
    const {
        session,
        attendanceRecords,
        pagination,
        loading,
        markAttendance,
        refetch,
        startSession,
        completeSession,
        rescheduleSession,
        confirmTaughtOutcomes,
        createAssignmentFromLesson,
    } = useSessionDetail(sessionId, searchQuery);

    const { activeCohorts } = useSessionCohorts(sessionId);

    const isHistorical = session ? !session.is_current_year : false;
    const sessionStatus = session?.status ?? 'SCHEDULED';
    const scheduleState = session?.schedule_state ?? 'UNKNOWN';
    const isCompleted = sessionStatus === 'COMPLETED';
    const isInProgress = sessionStatus === 'IN_PROGRESS';
    const isScheduled = sessionStatus === 'SCHEDULED';
    const isScheduledLocked = scheduleState === 'SCHEDULED_LOCKED';
    const isScheduledReady = scheduleState === 'SCHEDULED_READY';
    const isScheduledOverdue = scheduleState === 'SCHEDULED_OVERDUE';
    const isInProgressOverdue = scheduleState === 'IN_PROGRESS_OVERDUE';
    const needsCompletion = Boolean(session?.needs_completion || isInProgressOverdue);
    const canReschedule = Boolean(session?.can_reschedule && !isHistorical);
    const canEditAttendance = isInProgress && !isHistorical;
    const teachingWorkflow = getSessionTeachingWorkflow(session);
    const curriculumLabel = session?.curriculum_name || getCurriculumTypeLabel(session?.curriculum_type) || 'General';
    const activeParticipationCount = useMemo(() => {
        if (!session) {
            return 0;
        }

        const activeClassIds = new Set<number>([session.cohort_id]);
        activeCohorts.forEach((cohort) => {
            activeClassIds.add(cohort.cohort);
        });
        return activeClassIds.size;
    }, [activeCohorts, session]);
    const isMerged = activeParticipationCount > 1;

    const attendanceStats = useMemo(
        () => calcAttendanceStats(attendanceRecords),
        [attendanceRecords]
    );

    const hasMarkedAttendance = useMemo(
        () => attendanceRecords.some((record) => record.status !== null),
        [attendanceRecords]
    );
    const previousHasMarkedAttendance = useRef(hasMarkedAttendance);

    const hasLessonPlan = Boolean(session?.lesson_plan_id);
    const confirmedTaughtOutcomes = session?.taught_outcomes ?? [];
    const hasConfirmedTaughtOutcomes = confirmedTaughtOutcomes.length > 0;
    const previousHasConfirmedTaughtOutcomes = useRef(hasConfirmedTaughtOutcomes);
    const taughtOutcomeCount = confirmedTaughtOutcomes.filter(
        (outcome) => outcome.status === 'TAUGHT' || outcome.status === 'PARTIALLY_TAUGHT'
    ).length;
    const canRecordEvidence = Boolean(
        teachingWorkflow &&
        isCompleted &&
        hasMarkedAttendance &&
        hasConfirmedTaughtOutcomes &&
        taughtOutcomeCount > 0
    );
    const canCreateAssignmentFromLesson = Boolean(
        isCompleted &&
        hasLessonPlan &&
        hasConfirmedTaughtOutcomes
    );
    const showPreparedAssignmentScopeNote = Boolean(
        preparedAssignment && usesExpandedSessionScope(preparedAssignment)
    );
    const lessonDateLabel = formatSessionDate(session?.session_date);
    const lessonTimeLabel = [
        formatSessionTime(session?.start_time),
        formatSessionTime(session?.end_time),
    ].filter(Boolean).join(' - ') || 'Not set';
    const scheduledStartLabel = formatSessionDateTime(session?.session_date, session?.start_time);
    const startAvailableDateTimeLabel = formatSessionDateTime(
        session?.start_available_date ?? null,
        session?.start_available_time ?? null
    );
    const startAvailableTimeLabel = formatSessionTime(session?.start_available_time ?? null);
    const startAvailabilityLabel = (
        session?.start_available_date === session?.session_date && startAvailableTimeLabel
    )
        ? startAvailableTimeLabel
        : (startAvailableDateTimeLabel || '5 minutes before the scheduled start');
    const startAvailabilityMessage = useMemo(() => {
        if (!isScheduled) {
            return null;
        }

        if (scheduledStartLabel && startAvailableTimeLabel && session?.start_available_date === session?.session_date) {
            return `This lesson starts on ${scheduledStartLabel}. You can start it from ${startAvailableTimeLabel}.`;
        }

        if (scheduledStartLabel && startAvailableDateTimeLabel) {
            return `This lesson starts on ${scheduledStartLabel}. You can start it from ${startAvailableDateTimeLabel}.`;
        }

        return 'You can start this lesson 5 minutes before its scheduled start time.';
    }, [
        isScheduled,
        scheduledStartLabel,
        session?.session_date,
        session?.start_available_date,
        startAvailableDateTimeLabel,
        startAvailableTimeLabel,
    ]);
    const currentWorkflowStep = useMemo(() => {
        if (isScheduled) {
            return 'scheduled';
        }
        if (isInProgress && !hasMarkedAttendance) {
            return 'attendance';
        }
        if (isInProgress && !hasConfirmedTaughtOutcomes) {
            return 'confirm_taught';
        }
        if (isInProgress) {
            return 'complete';
        }
        if (isCompleted) {
            return 'post_lesson';
        }
        return 'scheduled';
    }, [
        hasConfirmedTaughtOutcomes,
        hasMarkedAttendance,
        isCompleted,
        isInProgress,
        isScheduled,
    ]);
    const showAttendanceSection = currentWorkflowStep === 'attendance' || isCompleted || needsCompletion;
    const showTaughtOutcomesSection = hasLessonPlan && (
        currentWorkflowStep === 'confirm_taught'
        || isCompleted
        || needsCompletion
    );

    useEffect(() => {
        if (guidedSection === 'attendance' && showAttendanceSection) {
            scrollToSection('attendance-section');
            setGuidedSection(null);
        }

        if (guidedSection === 'taught-outcomes' && showTaughtOutcomesSection) {
            scrollToSection('taught-outcomes-section');
            setGuidedSection(null);
        }

        if (guidedSection === 'complete' && currentWorkflowStep === 'complete') {
            scrollToSection('lesson-complete-section');
            setGuidedSection(null);
        }

        if (guidedSection === 'post-lesson' && currentWorkflowStep === 'post_lesson') {
            scrollToSection('post-lesson-section');
            setGuidedSection(null);
        }
    }, [currentWorkflowStep, guidedSection, showAttendanceSection, showTaughtOutcomesSection]);

    useEffect(() => {
        if (!session) {
            return;
        }

        const nextSelections: Record<number, TaughtStatus | ''> = {};
        const confirmedStatusByOutcomeId = new Map(
            session.taught_outcomes.map((outcome) => [outcome.outcome_id, outcome.status ?? ''])
        );

        session.planned_outcomes.forEach((outcome) => {
            nextSelections[outcome.outcome_id] = (confirmedStatusByOutcomeId.get(outcome.outcome_id) ?? '') as TaughtStatus | '';
        });

        setTaughtSelections(nextSelections);
    }, [session]);

    useEffect(() => {
        if (!previousHasMarkedAttendance.current && hasMarkedAttendance && !hasConfirmedTaughtOutcomes) {
            setGuidedSection('taught-outcomes');
        }

        previousHasMarkedAttendance.current = hasMarkedAttendance;
    }, [hasConfirmedTaughtOutcomes, hasMarkedAttendance]);

    useEffect(() => {
        if (!previousHasConfirmedTaughtOutcomes.current && hasConfirmedTaughtOutcomes && isInProgress) {
            setGuidedSection('complete');
        }

        previousHasConfirmedTaughtOutcomes.current = hasConfirmedTaughtOutcomes;
    }, [hasConfirmedTaughtOutcomes, isInProgress]);

    const {
        draft,
        saving,
        saveError,
        dismissError,
        updateStatus,
        updateNotes,
        markAll,
        save,
    } = useAttendanceDraft({
        records: attendanceRecords,
        onSave: markAttendance,
        readOnly: !canEditAttendance,
    });

    const workflowSteps = useMemo(() => ([
        {
            title: 'Start lesson',
            icon: PlayCircle,
            complete: !isScheduled,
            description: isCompleted
                ? 'Lesson started and completed.'
                : isInProgress
                    ? 'Lesson is in progress.'
                    : isScheduledOverdue
                        ? 'Scheduled time passed. The lesson can still be started late.'
                        : isScheduledReady
                            ? 'Start the lesson when you are ready.'
                            : 'Actions unlock when the start window opens.',
        },
        {
            title: 'Take attendance',
            icon: ClipboardCheck,
            complete: hasMarkedAttendance,
            description: hasMarkedAttendance
                ? `${attendanceStats.total - attendanceStats.unmarked}/${attendanceStats.total} learners marked.`
                : 'Take attendance first.',
        },
        {
            title: 'Confirm what was taught',
            icon: Target,
            complete: confirmedTaughtOutcomes.length > 0,
            description: confirmedTaughtOutcomes.length > 0
                ? `${confirmedTaughtOutcomes.length} planned outcome${confirmedTaughtOutcomes.length === 1 ? '' : 's'} confirmed.`
                : 'Use the lesson plan outcomes.',
        },
        {
            title: 'Complete lesson',
            icon: CheckCircle2,
            complete: isCompleted,
            description: isCompleted
                ? 'Lesson completed.'
                : needsCompletion
                    ? 'Scheduled end passed. Review the lesson and complete it explicitly.'
                    : 'Finish after class records are updated.',
        },
    ]), [
        confirmedTaughtOutcomes.length,
        hasMarkedAttendance,
        isCompleted,
        isInProgress,
        isScheduled,
        isScheduledOverdue,
        isScheduledReady,
        needsCompletion,
        attendanceStats.total,
        attendanceStats.unmarked,
    ]);

    const scrollToAttendance = () => {
        scrollToSection('attendance-section');
    };
    const nextSafeAssistantAction = useMemo(() => {
        if (isInProgress && !hasMarkedAttendance) {
            return {
                label: 'Review attendance section',
                type: 'page_action' as const,
                target: 'review_attendance_section',
                handler: () => scrollToSection('attendance-section'),
            };
        }

        if (hasMarkedAttendance && !hasConfirmedTaughtOutcomes) {
            return {
                label: 'Review what was taught',
                type: 'page_action' as const,
                target: 'review_taught_outcomes_section',
                handler: () => scrollToSection('taught-outcomes-section'),
            };
        }

        if (needsCompletion) {
            return {
                label: 'Review lesson completion',
                type: 'page_action' as const,
                target: 'review_completion_section',
                handler: () => scrollToSection('lesson-complete-section'),
            };
        }

        if (hasLessonPlan && session?.lesson_plan_id) {
            return {
                label: 'View lesson preparation',
                type: 'navigate' as const,
                href: `/lesson-plans/${session.lesson_plan_id}`,
            };
        }

        return undefined;
    }, [
        hasConfirmedTaughtOutcomes,
        hasLessonPlan,
        hasMarkedAttendance,
        isInProgress,
        needsCompletion,
        session?.lesson_plan_id,
    ]);
    const assistantContext = useMemo(() => ({
        pageKey: 'session_detail',
        pageTitle: 'Lesson Workspace',
        state: {
            is_loading: loading,
            status: sessionStatus,
            is_in_progress: isInProgress,
            is_completed: isCompleted,
            has_lesson_plan: hasLessonPlan,
            has_marked_attendance: hasMarkedAttendance,
            has_confirmed_taught_outcomes: hasConfirmedTaughtOutcomes,
            needs_completion: needsCompletion,
            workflow_step: currentWorkflowStep,
        },
        visibleActions: [
            {
                label: 'Review attendance section',
                type: 'page_action' as const,
                target: 'review_attendance_section',
                handler: () => scrollToSection('attendance-section'),
            },
            {
                label: 'Review what was taught',
                type: 'page_action' as const,
                target: 'review_taught_outcomes_section',
                handler: () => scrollToSection('taught-outcomes-section'),
            },
            {
                label: 'Review lesson completion',
                type: 'page_action' as const,
                target: 'review_completion_section',
                handler: () => scrollToSection('lesson-complete-section'),
            },
            ...(hasLessonPlan && session?.lesson_plan_id
                ? [{
                    label: 'View lesson preparation',
                    type: 'navigate' as const,
                    href: `/lesson-plans/${session.lesson_plan_id}`,
                }]
                : []),
        ],
        nextSafeAction: nextSafeAssistantAction,
        workflowStep: currentWorkflowStep,
        emptyStateReason: !loading && !session
            ? 'The lesson workspace is not available yet.'
            : undefined,
    }), [
        currentWorkflowStep,
        hasConfirmedTaughtOutcomes,
        hasLessonPlan,
        hasMarkedAttendance,
        isCompleted,
        isInProgress,
        loading,
        needsCompletion,
        nextSafeAssistantAction,
        session,
        sessionStatus,
    ]);

    useAssistantPageContext(assistantContext);

    const handleStartLesson = async () => {
        try {
            setWorkflowError(null);
            setWorkflowSuccess(null);
            await startSession();
            setGuidedSection('attendance');
            setWorkflowSuccess(
                isInstructor ? 'Lesson started. Next step: take attendance.' : 'Lesson started.'
            );
        } catch (error) {
            setWorkflowError(error instanceof Error ? error.message : 'We could not start this lesson.');
        }
    };

    const handleCompleteLesson = async () => {
        try {
            setWorkflowError(null);
            setWorkflowSuccess(null);
            await completeSession();
            setGuidedSection('post-lesson');
            setWorkflowSuccess(
                isInstructor ? 'Lesson completed. Post-lesson actions are ready below.' : 'Lesson completed.'
            );
        } catch (error) {
            setWorkflowError(error instanceof Error ? error.message : 'We could not complete this lesson.');
        }
    };

    const handleRescheduleLesson = async (
        payload: RescheduleSessionPayload,
    ) => {
        try {
            setWorkflowError(null);
            setWorkflowSuccess(null);
            await rescheduleSession(payload);
            setWorkflowSuccess('Lesson rescheduled.');
        } catch (error) {
            throw error;
        }
    };

    const handleConfirmWhatWasTaught = async () => {
        if (!session) {
            return;
        }

        const missingOutcomes = session.planned_outcomes.filter(
            (outcome) => !taughtSelections[outcome.outcome_id]
        );
        if (missingOutcomes.length > 0) {
            setWorkflowError('Confirm every planned outcome before continuing.');
            return;
        }

        try {
            setConfirmingTaughtOutcomes(true);
            setWorkflowError(null);
            setWorkflowSuccess(null);
            await confirmTaughtOutcomes({
                outcomes: session.planned_outcomes.map((outcome) => ({
                    outcome_id: outcome.outcome_id,
                    status: taughtSelections[outcome.outcome_id] as TaughtStatus,
                })),
            });
            setGuidedSection('complete');
            setWorkflowSuccess(
                isInstructor
                    ? 'What was taught is confirmed. Next step: complete lesson.'
                    : 'What was taught has been confirmed.'
            );
        } catch (error) {
            setWorkflowError(error instanceof Error ? error.message : 'We could not confirm what was taught.');
        } finally {
            setConfirmingTaughtOutcomes(false);
        }
    };

    const handleCreateAssignmentFromLesson = async () => {
        if (!session) {
            return;
        }

        try {
            setCreatingAssignment(true);
            setWorkflowError(null);
            setWorkflowSuccess(null);
            const response = await createAssignmentFromLesson();
            setPreparedAssignment(response.assignment);
            setWorkflowSuccess(response.detail);
        } catch (error) {
            setWorkflowError(error instanceof Error ? error.message : 'We could not prepare an assignment draft.');
        } finally {
            setCreatingAssignment(false);
        }
    };

    if (loading && !session) {
        return (
            <div className="mx-auto w-full max-w-6xl pb-8">
                <LoadingSpinner />
            </div>
        );
    }

    if (!session) {
        return (
            <div className="mx-auto w-full max-w-6xl pb-8">
                <div className="p-10 text-gray-500">Lesson not found.</div>
            </div>
        );
    }

    return (
        <div className="mx-auto w-full max-w-6xl space-y-6 pb-8">
            <div className="space-y-3">
                <Link href="/sessions">
                    <Button variant="ghost" size="sm">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        {isInstructor ? 'Back to My Lessons' : 'Back'}
                    </Button>
                </Link>

                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                        <h1 className="flex flex-wrap items-center gap-2 text-xl font-semibold">
                            <span className="truncate">{session.title || session.subject_name}</span>
                            {isMerged ? (
                                <Badge variant="purple">
                                    <Layers className="mr-1 h-3 w-3" />
                                    Multi-cohort
                                </Badge>
                            ) : null}
                            {isHistorical ? <Badge variant="default">Historical</Badge> : null}
                        </h1>
                        <p className="mt-0.5 text-sm text-gray-500">{session.term_name}</p>
                    </div>

                    <div className="flex flex-wrap items-center justify-end gap-2 shrink-0">
                        <Badge variant="blue">{session.session_type_display}</Badge>
                        {isScheduled ? <Badge variant="default">Scheduled</Badge> : null}
                        {isScheduledOverdue ? <Badge variant="orange">Overdue</Badge> : null}
                        {isInProgress && !isInProgressOverdue ? <Badge variant="yellow">In progress</Badge> : null}
                        {isInProgressOverdue ? <Badge variant="red">Needs completion</Badge> : null}
                        {isCompleted ? <Badge variant="green">Completed</Badge> : null}
                    </div>
                </div>

                {!isHistorical ? (
                    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
                        {(isScheduledReady || isScheduledOverdue) ? (
                            <Button
                                variant="primary"
                                size="sm"
                                className="w-full sm:w-auto"
                                onClick={handleStartLesson}
                                disabled={!session.can_start_now}
                            >
                                <PlayCircle className="mr-1.5 h-4 w-4" />
                                {isScheduledOverdue ? 'Start late' : 'Start lesson'}
                            </Button>
                        ) : null}

                        {currentWorkflowStep === 'attendance' ? (
                            <Button
                                variant="secondary"
                                size="sm"
                                className="w-full sm:w-auto"
                                onClick={scrollToAttendance}
                            >
                                <ClipboardCheck className="mr-1.5 h-4 w-4" />
                                Take attendance
                            </Button>
                        ) : null}

                        {canReschedule ? (
                            <Button
                                variant="secondary"
                                size="sm"
                                className="w-full sm:w-auto"
                                onClick={() => setShowRescheduleModal(true)}
                            >
                                <Calendar className="mr-1.5 h-4 w-4" />
                                Reschedule lesson
                            </Button>
                        ) : null}

                        {needsCompletion ? (
                            <Button
                                variant="secondary"
                                size="sm"
                                className="w-full sm:w-auto"
                                onClick={scrollToAttendance}
                            >
                                <ClipboardCheck className="mr-1.5 h-4 w-4" />
                                Review attendance
                            </Button>
                        ) : null}

                        {!isCompleted && showTaughtOutcomesSection && currentWorkflowStep === 'confirm_taught' ? (
                            <Button
                                variant="secondary"
                                size="sm"
                                className="w-full sm:w-auto"
                                onClick={() => scrollToSection('taught-outcomes-section')}
                            >
                                <Target className="mr-1.5 h-4 w-4" />
                                Confirm what was taught
                            </Button>
                        ) : null}

                        {(currentWorkflowStep === 'complete' || needsCompletion) ? (
                            <Button variant="primary" size="sm" className="w-full sm:w-auto" onClick={handleCompleteLesson}>
                                <CheckCircle2 className="mr-1.5 h-4 w-4" />
                                Complete lesson
                            </Button>
                        ) : null}

                        {!isCompleted ? (
                            <Link href={`/sessions/${session.id}/edit`} className="w-full sm:w-auto">
                                <Button variant="secondary" size="sm" className="w-full sm:w-auto">
                                    <Edit className="mr-1.5 h-4 w-4" />
                                    Edit
                                </Button>
                            </Link>
                        ) : null}
                    </div>
                ) : null}

                {isScheduledLocked ? (
                    <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm text-blue-700">
                        <p>Lesson is scheduled. Start stays locked until the allowed window opens.</p>
                        {startAvailabilityMessage ? (
                            <p className="mt-1">{startAvailabilityMessage}</p>
                        ) : null}
                    </div>
                ) : null}

                {isScheduledReady ? (
                    <div className="rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-700">
                        Start lesson when you are ready, or reschedule it before class begins.
                    </div>
                ) : null}

                {isScheduledOverdue ? (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
                        <p>This lesson time has passed and the lesson was not started.</p>
                        <p className="mt-1">You can start it late or reschedule it.</p>
                    </div>
                ) : null}

                {isInProgressOverdue ? (
                    <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                        <p>This lesson is still in progress past its scheduled end time.</p>
                        <p className="mt-1">
                            Complete the lesson after reviewing attendance and taught outcomes. ScholaroScope does not auto-complete lessons because completion finalizes attendance and marks unmarked learners absent.
                        </p>
                    </div>
                ) : null}
            </div>

            {workflowError ? (
                <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                    {workflowError}
                </div>
            ) : null}

            {workflowSuccess ? (
                <div className="flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-700">
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    {workflowSuccess}
                </div>
            ) : null}

            {preparedAssignment ? (
                <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm text-blue-700">
                    <span className="font-medium">Assignment draft ready.</span>{' '}
                    <Link
                        href={`/academic/cohorts/${preparedAssignment.cohort_id}/assignments/${preparedAssignment.id}?returnTo=/sessions/${session.id}`}
                        className="font-medium underline underline-offset-2"
                    >
                        Open assignment
                    </Link>
                    {showPreparedAssignmentScopeNote ? (
                        <p className="mt-2">
                            This assignment can include learners from all active classes linked to the source session.
                        </p>
                    ) : null}
                </div>
            ) : null}

            {isHistorical ? (
                <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    This lesson is from a past academic year. Attendance records are read-only.
                </div>
            ) : null}

            <Card>
                <div className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
                        <SessionMetaItem
                            icon={BookOpen}
                            label="Subject"
                            value={session.subject_name || session.title || 'Not set'}
                        />
                        <SessionMetaItem
                            icon={Layers}
                            label="Class"
                            value={session.cohort_name || 'Not set'}
                        />
                        <SessionMetaItem
                            icon={Calendar}
                            label={isInstructor ? 'Lesson date' : 'Scheduled date'}
                            value={lessonDateLabel || 'Not set'}
                        />
                        <SessionMetaItem
                            icon={Clock}
                            label="Lesson time"
                            value={lessonTimeLabel}
                        />
                        <SessionMetaItem
                            icon={MapPin}
                            label="Venue"
                            value={session.venue || 'Not set'}
                        />
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                        <SessionMetaItem
                            icon={Target}
                            label="Term"
                            value={session.term_name || 'Not set'}
                        />
                        {isScheduled ? (
                            <SessionMetaItem
                                icon={PlayCircle}
                                label="Start availability"
                                value={startAvailabilityLabel}
                            />
                        ) : null}
                        {session.session_type_display ? (
                            <div className="space-y-1">
                                <div className="text-sm text-gray-500">Session type</div>
                                <div className="flex items-center gap-2">
                                    <Badge variant="blue">{session.session_type_display}</Badge>
                                </div>
                            </div>
                        ) : null}
                    </div>
                </div>
            </Card>

            {hasLessonPlan ? (
                <Card>
                    <div className="space-y-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <h2 className="text-lg font-semibold text-gray-900">
                                        {isInstructor ? 'Lesson preparation' : 'Lesson plan'}
                                    </h2>
                                    {session.lesson_plan_status ? (
                                        <Badge variant="blue">{session.lesson_plan_status}</Badge>
                                    ) : null}
                                    <Badge variant="default">{curriculumLabel}</Badge>
                                </div>
                                <p className="mt-1 text-sm text-gray-600">
                                    The outcomes below come from the lesson plan prepared before this lesson was scheduled.
                                </p>
                            </div>

                            <Link href={`/lesson-plans/${session.lesson_plan_id}`} className="w-full sm:w-auto shrink-0">
                                <Button variant="secondary" size="sm" className="w-full sm:w-auto">
                                    <BookOpen className="mr-1.5 h-4 w-4" />
                                    {isInstructor ? 'View lesson preparation' : 'View lesson plan'}
                                </Button>
                            </Link>
                        </div>

                        {session.planned_outcomes.length === 0 ? (
                            <p className="text-sm text-gray-500">No planned learning outcomes were saved for this lesson.</p>
                        ) : (
                            <div className="space-y-3">
                                {session.planned_outcomes.map((outcome) => (
                                    <div
                                        key={`${session.id}-${outcome.outcome_id}`}
                                        className="rounded-lg border border-gray-200 bg-gray-50 p-4"
                                    >
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className="rounded-full bg-blue-100 px-2.5 py-1 text-xs font-medium text-blue-700">
                                                {outcome.code}
                                            </span>
                                            <span className="text-xs text-gray-500">
                                                {outcome.strand} · {outcome.sub_strand}
                                            </span>
                                        </div>
                                        <p className="mt-2 text-sm text-gray-800">{outcome.text}</p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </Card>
            ) : (
                <Card>
                    <div className="flex items-start gap-3">
                        <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
                        <div className="space-y-1">
                            <h2 className="text-base font-semibold text-gray-900">
                                {isInstructor ? 'No lesson preparation linked' : 'Lesson plan not linked'}
                            </h2>
                            <p className="text-sm text-gray-600">
                                {isInstructor
                                    ? 'This lesson was not scheduled from a lesson preparation. The teaching record is still available, but plan-linked workflow steps are not available here.'
                                    : 'This lesson was not scheduled from a lesson plan. It remains readable for compatibility, but the plan-first workflow is not available here.'}
                            </p>
                        </div>
                    </div>
                </Card>
            )}

            <Card>
                <div className="space-y-4">
                    <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="text-lg font-semibold text-gray-900">
                            {isInstructor ? 'Teaching checklist' : 'Lesson workflow'}
                        </h2>
                        <Badge variant="blue">{curriculumLabel}</Badge>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                        {workflowSteps.map((step) => {
                            const Icon = step.icon;
                            return (
                                <div key={step.title} className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="rounded-lg bg-white p-2 shadow-sm">
                                            <Icon className="h-4 w-4 text-gray-700" />
                                        </div>
                                        <Badge variant={step.complete ? 'green' : 'default'}>
                                            {step.complete ? 'Done' : 'Pending'}
                                        </Badge>
                                    </div>
                                    <h3 className="mt-3 text-sm font-semibold text-gray-900">{step.title}</h3>
                                    <p className="mt-1 text-sm text-gray-600">{step.description}</p>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </Card>

            {!isHistorical && currentWorkflowStep === 'attendance' ? (
                <Card>
                    <div className="space-y-2">
                        <h2 className="text-lg font-semibold text-gray-900">Next step: take attendance</h2>
                        <p className="text-sm text-gray-600">
                            Start with attendance. After that, the lesson page will unlock confirmation of what was taught.
                        </p>
                        <p className="text-sm text-gray-500">
                            Assignments and learner performance are handled after the lesson so teaching time is not interrupted.
                        </p>
                    </div>
                </Card>
            ) : null}

            {!isHistorical && currentWorkflowStep === 'confirm_taught' ? (
                <Card>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="space-y-2">
                            <h2 className="text-lg font-semibold text-gray-900">Next step: confirm what was taught</h2>
                            <p className="text-sm text-gray-600">
                                Attendance is saved. Confirm the planned outcomes taught in class before completing the lesson.
                            </p>
                            <p className="text-sm text-gray-500">
                                Assignments and learner performance are handled after the lesson so teaching time is not interrupted.
                            </p>
                        </div>
                        <Button
                            size="sm"
                            className="w-full sm:w-auto"
                            onClick={handleConfirmWhatWasTaught}
                            disabled={confirmingTaughtOutcomes || session.planned_outcomes.length === 0}
                        >
                            {confirmingTaughtOutcomes ? 'Saving...' : 'Confirm what was taught'}
                        </Button>
                    </div>
                </Card>
            ) : null}

            {!isHistorical && currentWorkflowStep === 'complete' ? (
                <div id="lesson-complete-section">
                <Card>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="space-y-2">
                            <h2 className="text-lg font-semibold text-gray-900">Next step: complete lesson</h2>
                            <p className="text-sm text-gray-600">
                                {needsCompletion
                                    ? 'This lesson ran past its scheduled end time. Review attendance, confirm taught outcomes if needed, and complete it manually.'
                                    : 'Attendance and taught outcomes are saved. Complete the lesson, then return later for learner performance or assignment follow-up.'}
                            </p>
                        </div>
                        <Button
                            variant="primary"
                            size="sm"
                            className="w-full sm:w-auto"
                            onClick={handleCompleteLesson}
                        >
                            <CheckCircle2 className="mr-1.5 h-4 w-4" />
                            Complete lesson
                        </Button>
                    </div>
                </Card>
                </div>
            ) : null}

            {currentWorkflowStep === 'post_lesson' ? (
                <div id="post-lesson-section">
                <Card>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <h2 className="text-lg font-semibold text-gray-900">
                                {isInstructor ? 'Post-lesson actions' : 'Record learner performance when ready'}
                            </h2>
                            <p className="text-sm text-gray-600">
                                {isInstructor
                                    ? 'Record learner performance, create follow-up work, or reopen the lesson preparation after class.'
                                    : 'Post-lesson evidence and assignment work stay outside the live teaching window.'}
                            </p>
                        </div>

                        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                            {canRecordEvidence && teachingWorkflow ? (
                                <Link href={teachingWorkflow.href} className="w-full sm:w-auto">
                                    <Button className="w-full sm:w-auto" size="sm">
                                        <FileText className="mr-1.5 h-4 w-4" />
                                        Record learner performance
                                    </Button>
                                </Link>
                            ) : (
                                <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-600">
                                    {!hasMarkedAttendance || !hasConfirmedTaughtOutcomes
                                        ? 'Learner performance opens after attendance and taught outcomes are confirmed.'
                                        : taughtOutcomeCount === 0
                                            ? 'No outcomes were marked as taught for this lesson yet.'
                                            : 'No curriculum evidence workflow is available for this lesson.'}
                                </div>
                            )}

                            {canCreateAssignmentFromLesson ? (
                                <Button
                                    size="sm"
                                    variant="secondary"
                                    className="w-full sm:w-auto"
                                    onClick={handleCreateAssignmentFromLesson}
                                    disabled={creatingAssignment}
                                >
                                    <FilePlus2 className="mr-1.5 h-4 w-4" />
                                    {creatingAssignment ? 'Preparing...' : 'Create assignment from this lesson'}
                                </Button>
                            ) : null}

                            {hasLessonPlan ? (
                                <Link href={`/lesson-plans/${session.lesson_plan_id}`} className="w-full sm:w-auto">
                                    <Button variant="secondary" size="sm" className="w-full sm:w-auto">
                                        <BookOpen className="mr-1.5 h-4 w-4" />
                                        {isInstructor ? 'View lesson preparation' : 'View lesson plan'}
                                    </Button>
                                </Link>
                            ) : null}
                        </div>
                    </div>
                </Card>
                </div>
            ) : null}

            {!isScheduled ? (
                <AttendanceStatsStrip stats={attendanceStats} />
            ) : null}

            {showAttendanceSection ? (
                <div id="attendance-section">
                    <Card>
                        <div className="space-y-4">
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                <div>
                                    <h2 className="text-lg font-semibold text-gray-900">
                                        {isCompleted
                                            ? 'Attendance records'
                                            : needsCompletion
                                                ? 'Review attendance'
                                                : 'Take attendance'}
                                    </h2>
                                    <p className="mt-1 text-sm text-gray-600">
                                        {needsCompletion
                                            ? 'Review the attendance record before you complete this lesson.'
                                            : 'Attendance must be recorded before you confirm what was taught.'}
                                    </p>
                                </div>
                            </div>

                            <AttendanceTable
                                records={attendanceRecords}
                                draft={draft}
                                loading={loading}
                                saving={saving}
                                saveError={saveError}
                                pagination={pagination}
                                onUpdateStatus={updateStatus}
                                onUpdateNotes={updateNotes}
                                onMarkAll={markAll}
                                readOnly={!canEditAttendance}
                                onSave={async () => {
                                    await save();
                                    await refetch();
                                    setGuidedSection('taught-outcomes');
                                    setWorkflowSuccess(
                                        isInstructor
                                            ? 'Attendance saved. Next step: confirm what was taught.'
                                            : 'Attendance updated.'
                                    );
                                }}
                                onDismissError={dismissError}
                                onSearch={setSearchQuery}
                            />
                        </div>
                    </Card>
                </div>
            ) : null}

            {showTaughtOutcomesSection ? (
                <div id="taught-outcomes-section">
                <Card>
                    <div className="space-y-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                                <h2 className="text-lg font-semibold text-gray-900">Confirm what was taught</h2>
                                <p className="mt-1 text-sm text-gray-600">
                                    Use the planned outcomes from the lesson plan. Do not add new outcomes here.
                                </p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {!isCompleted ? (
                                    <Button variant="secondary" size="sm" onClick={scrollToAttendance}>
                                        <ClipboardCheck className="mr-1.5 h-4 w-4" />
                                        Review attendance
                                    </Button>
                                ) : null}
                                {!isCompleted ? (
                                    <Button
                                        size="sm"
                                        onClick={handleConfirmWhatWasTaught}
                                        disabled={
                                            confirmingTaughtOutcomes ||
                                            !isInProgress ||
                                            !hasMarkedAttendance ||
                                            isHistorical ||
                                            session.planned_outcomes.length === 0
                                        }
                                    >
                                        {confirmingTaughtOutcomes ? 'Saving...' : 'Confirm what was taught'}
                                    </Button>
                                ) : null}
                            </div>
                        </div>

                        {confirmedTaughtOutcomes.length > 0 ? (
                            <div className="rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-700">
                                What was taught has been saved for this lesson.
                            </div>
                        ) : null}

                        <div className="space-y-4">
                            {session.planned_outcomes.map((outcome) => (
                                <div
                                    key={`${session.id}-confirm-${outcome.outcome_id}`}
                                    className="rounded-lg border border-gray-200 p-4"
                                >
                                    <div className="space-y-2">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className="rounded-full bg-blue-100 px-2.5 py-1 text-xs font-medium text-blue-700">
                                                {outcome.code}
                                            </span>
                                            <span className="text-xs text-gray-500">
                                                {outcome.strand} · {outcome.sub_strand}
                                            </span>
                                            {taughtSelections[outcome.outcome_id] ? (
                                                <Badge variant={statusBadgeVariant(taughtSelections[outcome.outcome_id] as TaughtStatus)}>
                                                    {
                                                        TAUGHT_STATUS_OPTIONS.find(
                                                            (option) => option.value === taughtSelections[outcome.outcome_id]
                                                        )?.label
                                                    }
                                                </Badge>
                                            ) : null}
                                        </div>
                                        <p className="text-sm text-gray-800">{outcome.text}</p>
                                    </div>

                                    <div className="mt-4 grid gap-3 md:grid-cols-3">
                                        {TAUGHT_STATUS_OPTIONS.map((option) => (
                                            <label
                                                key={`${outcome.outcome_id}-${option.value}`}
                                                className={`cursor-pointer rounded-lg border p-3 text-sm transition-colors ${
                                                    taughtSelections[outcome.outcome_id] === option.value
                                                        ? 'border-blue-500 bg-blue-50'
                                                        : 'border-gray-200 hover:border-blue-300'
                                                }`}
                                            >
                                                <input
                                                    type="radio"
                                                    name={`outcome-${outcome.outcome_id}`}
                                                    value={option.value}
                                                    checked={taughtSelections[outcome.outcome_id] === option.value}
                                                    onChange={() => {
                                                        setTaughtSelections((current) => ({
                                                            ...current,
                                                            [outcome.outcome_id]: option.value,
                                                        }));
                                                    }}
                                                    disabled={!isInProgress || !hasMarkedAttendance || isHistorical || isCompleted}
                                                    className="sr-only"
                                                />
                                                <div className="font-medium text-gray-900">{option.label}</div>
                                                <div className="mt-1 text-xs text-gray-500">{option.description}</div>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </Card>
                </div>
            ) : null}

            <ParticipatingCohorts
                sessionId={sessionId}
                isHistorical={isHistorical}
                canManageLinks={!isHistorical}
                primaryCohort={{
                    id: session.cohort_id,
                    name: session.cohort_name,
                    level: session.cohort_level,
                }}
            />

            <RescheduleLessonModal
                isOpen={showRescheduleModal}
                session={session}
                onClose={() => setShowRescheduleModal(false)}
                onSubmit={handleRescheduleLesson}
            />
        </div>
    );
}
