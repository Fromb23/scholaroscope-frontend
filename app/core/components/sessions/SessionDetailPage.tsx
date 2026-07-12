'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useParams, usePathname, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
    AlertCircle,
    ArrowLeft,
    BookOpen,
    Calendar,
    CheckCircle2,
    ChevronDown,
    ChevronRight,
    ClipboardCheck,
    Clock,
    Edit,
    FilePlus2,
    FileText,
    Layers,
    MapPin,
    MessageSquareText,
    PlayCircle,
    Target,
    type LucideIcon,
} from 'lucide-react';
import { ActionMenu } from '@/app/components/ui/ActionMenu';
import { Card } from '@/app/components/ui/Card';
import { Button } from '@/app/components/ui/Button';
import { Badge } from '@/app/components/ui/Badge';
import { ErrorBanner } from '@/app/components/ui/ErrorBanner';
import { LoadingSpinner } from '@/app/components/ui/LoadingSpinner';
import { AttendanceStatsStrip } from '@/app/core/components/sessions/AttendanceStats';
import { AttendanceTable } from '@/app/core/components/sessions/AttendanceTable';
import { ParticipatingCohorts } from '@/app/core/components/sessions/ParticipatingCohorts';
import { LessonReflectionCard } from '@/app/core/components/sessions/LessonReflectionCard';
import {
    clampDashboardScrollToContent,
    scrollDashboardSectionIntoView,
} from '@/app/core/lib/dashboardScroll';
import { RescheduleLessonModal } from '@/app/core/components/sessions/RescheduleLessonModal';
import { useSessionDetail, useSessionCohorts } from '@/app/core/hooks/useSessions';
import { useAcademicTodayMode } from '@/app/core/hooks/useAcademicTodayMode';
import { useAttendanceDraft } from '@/app/core/hooks/useAttendanceDraft';
import {
    usesExpandedSessionScope,
} from '@/app/core/components/assignments/assignmentUtils';
import { getCurriculumTypeLabel } from '@/app/core/lib/curriculumBridge';
import {
    getSessionClosureEvidenceWorkflowHref,
    getSessionTeachingWorkflow,
    resolveSessionClosureEvidenceWorkflowHref,
} from '@/app/core/registry/pluginRoutes';
import { canCreateTeachingRecord } from '@/app/core/lib/workspaces';
import { getSessionDetailExtensions } from '@/app/core/registry/sessionDetailExtensions';
import {
    useIssuePreparedAssignment,
    usePreparedAssignmentsForLessonPlan,
} from '@/app/core/hooks/useAssignments';
import type { Assignment } from '@/app/core/types/assignments';
import type {
    RescheduleSessionPayload,
    SessionClosureState,
    SessionWorkflowSummary,
} from '@/app/core/types/session';
import { calcAttendanceStats } from '@/app/utils/sessionUtils';
import { useAuth } from '@/app/context/AuthContext';
import { useAssistantPageContext } from '@/app/core/components/assistant/useAssistantPageContext';
import {
    shouldShowMergedCohortBadge,
    shouldShowParticipatingCohorts,
    shouldShowPostLessonAssignmentActions,
} from '@/app/core/components/sessions/sessionDetailVisibility';
import { ContextualApprovalRequestButton } from '@/app/core/components/approvals/ApprovalIntentComponents';
import { buildContextualRequestKey } from '@/app/core/lib/approvalIntents';
import { buildSessionLearnerAttendanceReportHref } from '@/app/core/lib/learnerIntentRoutes';
import { supportsInternalRequests } from '@/app/core/lib/workspaceGovernance';

type TaughtStatus = 'TAUGHT' | 'PARTIALLY_TAUGHT' | 'NOT_TAUGHT';
type SessionPageNotice = {
    message: string;
    variant: 'info' | 'success';
};

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

function CollapsibleSection({
    sectionId,
    title,
    summary,
    badge,
    open,
    onToggle,
    children,
}: {
    sectionId: string;
    title: string;
    summary: string;
    badge?: ReactNode;
    open: boolean;
    onToggle: () => void;
    children: ReactNode;
}) {
    return (
        <div id={sectionId}>
            <Card className="overflow-hidden p-0">
                <button
                    type="button"
                    onClick={onToggle}
                    className="theme-focus-ring flex w-full items-start gap-3 px-6 py-4 text-left transition-colors theme-hover-surface"
                >
                    <div className="theme-surface-elevated mt-0.5 shrink-0 rounded-lg border p-1.5 theme-border">
                        {open ? (
                            <ChevronDown className="h-4 w-4 text-blue-600" />
                        ) : (
                            <ChevronRight className="h-4 w-4 theme-subtle" />
                        )}
                    </div>
                    <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                            <h2 className="text-lg font-semibold theme-text">{title}</h2>
                            {badge}
                        </div>
                        <p className="mt-1 text-sm theme-muted">{summary}</p>
                    </div>
                </button>
                {open ? (
                    <div className="border-t px-6 py-6 theme-border">
                        {children}
                    </div>
                ) : null}
            </Card>
        </div>
    );
}

function scrollToSection(sectionId: string) {
    scrollDashboardSectionIntoView(sectionId);
}

function withReturnTo(href: string, returnTo: string) {
    const separator = href.includes('?') ? '&' : '?';
    return `${href}${separator}${new URLSearchParams({ returnTo }).toString()}`;
}

function lowerFirst(value: string) {
    return value.length > 0 ? `${value.charAt(0).toLowerCase()}${value.slice(1)}` : value;
}

function joinHumanList(values: string[]) {
    if (values.length <= 1) {
        return values[0] ?? '';
    }
    if (values.length === 2) {
        return `${values[0]} and ${values[1]}`;
    }
    return `${values.slice(0, -1).join(', ')}, and ${values[values.length - 1]}`;
}

function buildSupervisionMissingMessage(summary: SessionWorkflowSummary | null) {
    const labels = summary?.missing_labels ?? [];
    if (labels.length === 0) {
        return summary?.message || 'The assigned instructor must complete this lesson record.';
    }

    const readableLabels = labels.map((label, index) => (index === 0 ? label : lowerFirst(label)));
    return `${joinHumanList(readableLabels)} ${labels.length === 1 ? 'is' : 'are'} still required.`;
}

export function SessionDetailPage() {
    const params = useParams();
    const pathname = usePathname();
    const router = useRouter();
    const searchParams = useSearchParams();
    const sessionId = Number(params.id);
    const { activeOrg, activeRole, user, capabilities } = useAuth();
    const { data: todayMode } = useAcademicTodayMode({ enabled: Boolean(user) });
    const isInstructor = activeRole === 'INSTRUCTOR';
    const showInternalRequestActions = supportsInternalRequests(capabilities);
    const canCreateTeachingRecords = canCreateTeachingRecord({
        role: activeRole,
        orgType: activeOrg?.org_type,
        isSuperadmin: false,
        capabilities,
    });
    const returnTo = searchParams.get('returnTo');
    const backHref = returnTo?.startsWith('/') ? returnTo : '/sessions';
    const sessionReturnTo = useMemo(() => {
        const query = searchParams.toString();
        return query ? `${pathname}?${query}` : pathname;
    }, [pathname, searchParams]);

    const [workflowError, setWorkflowError] = useState<string | null>(null);
    const [workflowNotice, setWorkflowNotice] = useState<string | null>(null);
    const [workflowSuccess, setWorkflowSuccess] = useState<string | null>(null);
    const [transientWorkflowNotice, setTransientWorkflowNotice] = useState<SessionPageNotice | null>(null);
    const [confirmingTaughtOutcomes, setConfirmingTaughtOutcomes] = useState(false);
    const [taughtOutcomesValidationError, setTaughtOutcomesValidationError] = useState<string | null>(null);
    const [issuingPreparedTask, setIssuingPreparedTask] = useState(false);
    const [showRescheduleModal, setShowRescheduleModal] = useState(false);
    const [preparedAssignment, setPreparedAssignment] = useState<Assignment | null>(null);
    const [taughtSelections, setTaughtSelections] = useState<Record<number, TaughtStatus | ''>>({});
    const [guidedSection, setGuidedSection] = useState<'attendance' | 'taught-outcomes' | 'complete' | 'reflection' | 'post-lesson' | null>(null);
    const [lessonPreparationOpen, setLessonPreparationOpen] = useState(false);
    const [attendanceOpen, setAttendanceOpen] = useState(false);
    const [taughtOutcomesOpen, setTaughtOutcomesOpen] = useState(false);
    const [checklistOpen, setChecklistOpen] = useState(false);
    const [skipPreparedTaskPrompt, setSkipPreparedTaskPrompt] = useState(false);
    const [highlightedAssignmentId, setHighlightedAssignmentId] = useState<number | null>(null);
    const [resolvedClosureEvidenceWorkflowHref, setResolvedClosureEvidenceWorkflowHref] = useState<string | null>(null);
    const [closureEvidenceWorkflowPending, setClosureEvidenceWorkflowPending] = useState(false);
    const closureIntentRef = useRef(false);
    const {
        session,
        attendanceRecords,
        closureState,
        pagination,
        loading,
        markAttendance,
        refetch,
        refetchClosureState,
        reseedAttendance,
        startSession,
        completeSession,
        cancelSession,
        rescheduleSession,
        confirmTaughtOutcomes,
    } = useSessionDetail(sessionId);
    const issuePreparedAssignmentMutation = useIssuePreparedAssignment();
    const {
        draft: lessonPlanPreparedDraft,
        issued: lessonPlanIssuedAssignments,
    } = usePreparedAssignmentsForLessonPlan(session?.lesson_plan_id ?? null, {
        enabled: Boolean(session?.lesson_plan_id),
    });

    const { activeCohorts } = useSessionCohorts(sessionId);
    const isCbcSession = session ? ['CBE', 'CBC'].includes(session.curriculum_type) : false;

    const isHistorical = session ? !session.is_current_year : false;
    const sessionStatus = session?.status ?? 'SCHEDULED';
    const scheduleState = session?.schedule_state ?? 'UNKNOWN';
    const isCompleted = sessionStatus === 'COMPLETED';
    const isInProgress = sessionStatus === 'IN_PROGRESS';
    const isScheduled = sessionStatus === 'SCHEDULED';
    const isCancelled = sessionStatus === 'CANCELLED';
    const isScheduledLocked = scheduleState === 'SCHEDULED_LOCKED';
    const isScheduledReady = scheduleState === 'SCHEDULED_READY';
    const isScheduledOverdue = scheduleState === 'SCHEDULED_OVERDUE';
    const isInProgressOverdue = scheduleState === 'IN_PROGRESS_OVERDUE';
    const needsCompletion = Boolean(session?.needs_completion || isInProgressOverdue);
    const canReschedule = Boolean(session?.can_reschedule && !isHistorical);
    const workflowSummary = closureState?.workflow_summary ?? session?.workflow_summary ?? null;
    const viewerCanAdvanceWorkflow = workflowSummary?.viewer_can_advance ?? canCreateTeachingRecords;
    const canAdvanceTeachingWorkflow = canCreateTeachingRecords && viewerCanAdvanceWorkflow;
    const canEditAttendance = canAdvanceTeachingWorkflow && isInProgress && !isHistorical;
    const midtermBreakPausesNormalStart = todayMode?.mode === 'MIDTERM_BREAK'
        && todayMode.allows_new_teaching === false
        && session?.session_type !== 'EXAM'
        && session?.session_type !== 'ASSEMBLY'
        && session?.session_type !== 'FIELD_TRIP'
        && session?.session_type !== 'OTHER';
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
    const showParticipatingCohorts = shouldShowParticipatingCohorts(sessionStatus);
    const participatingCohortsLockedReason = isCompleted
        ? 'Completed lessons cannot be relinked. Attendance and evidence records are preserved.'
        : isCancelled
            ? 'Cancelled lessons cannot be relinked. Attendance and evidence records are preserved.'
            : undefined;
    const showMergedBadge = shouldShowMergedCohortBadge({ isMerged, status: sessionStatus });
    const showPostLessonAssignmentActions = shouldShowPostLessonAssignmentActions();

    const attendanceStats = useMemo(
        () => calcAttendanceStats(attendanceRecords),
        [attendanceRecords]
    );

    const hasMarkedAttendance = useMemo(
        () => attendanceRecords.some((record) => record.status !== null),
        [attendanceRecords]
    );

    const hasLessonPlan = Boolean(session?.lesson_plan_id);
    const confirmedTaughtOutcomes = session?.taught_outcomes ?? [];
    const hasConfirmedTaughtOutcomes = confirmedTaughtOutcomes.length > 0;
    const taughtOutcomeCount = confirmedTaughtOutcomes.filter(
        (outcome) => outcome.status === 'TAUGHT' || outcome.status === 'PARTIALLY_TAUGHT'
    ).length;
    const closureReady = closureState?.ready ?? false;
    const closureNextStep = closureState?.next_step ?? 'READY';
    const isNotTaughtInterrupted = isInProgress && closureNextStep === 'INTERRUPTED';
    const requiresEvidence = closureState?.requires_evidence ?? taughtOutcomeCount > 0;
    const hasRequiredEvidence = closureState?.has_required_evidence ?? !requiresEvidence;
    const hasReflection = closureState?.has_reflection ?? false;
    const closureEvidenceMessage = closureState?.message?.trim()
        || 'Learner performance is required before this lesson can be closed.';
    const requiresClosureReflection = isInProgress && closureNextStep === 'REFLECTION';
    const canRecordEvidence = Boolean(
        canAdvanceTeachingWorkflow &&
        isInProgress &&
        teachingWorkflow &&
        hasMarkedAttendance &&
        hasConfirmedTaughtOutcomes &&
        taughtOutcomeCount > 0
    );
    const showPreparedAssignmentScopeNote = Boolean(
        (preparedAssignment ?? lessonPlanPreparedDraft ?? lessonPlanIssuedAssignments[0] ?? null)
        && usesExpandedSessionScope(
            (preparedAssignment ?? lessonPlanPreparedDraft ?? lessonPlanIssuedAssignments[0]) as Assignment
        )
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
        if (isCancelled) {
            return 'cancelled';
        }
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
        isCancelled,
        isInProgress,
        isScheduled,
    ]);
    const preparedTaskDraft = [preparedAssignment, lessonPlanPreparedDraft].find(
        (assignment) => assignment?.status === 'DRAFT'
    ) ?? null;
    const issuedPreparedTask = [
        ...(preparedAssignment && preparedAssignment.status !== 'DRAFT' ? [preparedAssignment] : []),
        ...lessonPlanIssuedAssignments,
    ][0] ?? null;
    const learnerTaskForLesson = preparedTaskDraft ?? issuedPreparedTask ?? null;
    const hasPreparedTaskForLesson = Boolean(learnerTaskForLesson);
    const preparedTaskWasIssued = Boolean(
        learnerTaskForLesson && learnerTaskForLesson.status !== 'DRAFT'
    );
    const showPreparedTaskIssueAction = Boolean(
        preparedTaskDraft
        && (
            currentWorkflowStep === 'complete'
            || (currentWorkflowStep === 'post_lesson' && showPostLessonAssignmentActions)
        )
    );
    const showAttendanceSection = currentWorkflowStep === 'attendance' || isCompleted || needsCompletion;
    const showTaughtOutcomesSection = hasLessonPlan && (
        currentWorkflowStep === 'confirm_taught'
        || isCompleted
        || needsCompletion
    );
    const buildAttendanceLearnerHref = useCallback((record: { student: number }) => {
        if (!session) {
            return `/learners/${record.student}`;
        }

        return buildSessionLearnerAttendanceReportHref({
            studentId: record.student,
            sessionId: session.id,
            termId: session.term,
            cohortId: session.cohort_id,
            subjectId: session.subject_id,
            cohortSubjectId: session.cohort_subject,
        });
    }, [session]);
    const completionReturnTo = session ? `/sessions/${session.id}?section=complete` : '/sessions';
    const defaultTeachingWorkflowHref = teachingWorkflow
        ? withReturnTo(teachingWorkflow.href, completionReturnTo)
        : null;
    const requiredEvidenceOutcomeIds = useMemo(() => (
        session?.taught_outcomes
            .filter((outcome) => (
                outcome.status === 'TAUGHT' || outcome.status === 'PARTIALLY_TAUGHT'
            ))
            .map((outcome) => outcome.outcome_id) ?? []
    ), [session?.taught_outcomes]);
    const syncClosureEvidenceWorkflowHref = useMemo(() => {
        if (!session || session.status === 'COMPLETED' || !isCbcSession || requiredEvidenceOutcomeIds.length === 0) {
            return null;
        }

        return getSessionClosureEvidenceWorkflowHref({
            requiredOutcomeIds: requiredEvidenceOutcomeIds,
            returnTo: completionReturnTo,
            session,
        });
    }, [
        completionReturnTo,
        isCbcSession,
        requiredEvidenceOutcomeIds,
        session,
    ]);
    const closureTeachingWorkflowHref = useMemo(() => {
        if (!session || session.status === 'COMPLETED') {
            return null;
        }

        if (!isCbcSession) {
            return defaultTeachingWorkflowHref;
        }

        if (requiredEvidenceOutcomeIds.length === 0) {
            return defaultTeachingWorkflowHref;
        }

        return syncClosureEvidenceWorkflowHref ?? resolvedClosureEvidenceWorkflowHref;
    }, [
        defaultTeachingWorkflowHref,
        isCbcSession,
        requiredEvidenceOutcomeIds.length,
        resolvedClosureEvidenceWorkflowHref,
        session,
        syncClosureEvidenceWorkflowHref,
    ]);
    const isClosureEvidenceWorkflowPending = Boolean(
        isCbcSession
        && requiredEvidenceOutcomeIds.length > 0
        && !closureTeachingWorkflowHref
        && closureEvidenceWorkflowPending
    );

    useEffect(() => {
        let isActive = true;

        if (!session || session.status === 'COMPLETED' || !isCbcSession || requiredEvidenceOutcomeIds.length === 0) {
            setResolvedClosureEvidenceWorkflowHref(null);
            setClosureEvidenceWorkflowPending(false);
            return () => {
                isActive = false;
            };
        }

        if (syncClosureEvidenceWorkflowHref) {
            setResolvedClosureEvidenceWorkflowHref(syncClosureEvidenceWorkflowHref);
            setClosureEvidenceWorkflowPending(false);
            return () => {
                isActive = false;
            };
        }

        setClosureEvidenceWorkflowPending(true);

        void resolveSessionClosureEvidenceWorkflowHref({
            requiredOutcomeIds: requiredEvidenceOutcomeIds,
            returnTo: completionReturnTo,
            session,
        }).then((href) => {
            if (isActive) {
                setResolvedClosureEvidenceWorkflowHref(href);
            }
        }).catch(() => {
            if (isActive) {
                setResolvedClosureEvidenceWorkflowHref(null);
            }
        }).finally(() => {
            if (isActive) {
                setClosureEvidenceWorkflowPending(false);
            }
        });

        return () => {
            isActive = false;
        };
    }, [
        completionReturnTo,
        isCbcSession,
        requiredEvidenceOutcomeIds,
        session,
        syncClosureEvidenceWorkflowHref,
    ]);

    const clearWorkflowFeedback = useCallback(() => {
        setWorkflowError(null);
        setWorkflowNotice(null);
        setWorkflowSuccess(null);
    }, []);
    const noticeConfig = useMemo<SessionPageNotice | null>(() => {
        const notice = searchParams.get('notice');

        if (notice === 'evidence-recorded-next-close') {
            return {
                message: 'Class performance has been recorded. Continue with the current closure step.',
                variant: 'info',
            };
        }

        if (notice === 'lesson-closed') {
            return {
                message: 'Lesson record closed successfully.',
                variant: 'success',
            };
        }

        if (notice === 'attendance-next-taught') {
            return {
                message: 'Attendance saved. Continue by confirming what was taught.',
                variant: 'info',
            };
        }

        if (notice === 'taught-next-evidence') {
            return {
                message: 'What was taught is confirmed. Record learner performance for the taught outcomes.',
                variant: 'info',
            };
        }

        if (notice === 'session-current-step') {
            return {
                message: 'You were redirected to the current required lesson step.',
                variant: 'info',
            };
        }

        return null;
    }, [searchParams]);

    const revealAttendanceSection = useCallback(() => {
        if (!showAttendanceSection) {
            return;
        }
        setAttendanceOpen(true);
        setGuidedSection('attendance');
    }, [showAttendanceSection]);

    const revealTaughtOutcomesSection = useCallback(() => {
        if (!showTaughtOutcomesSection) {
            return;
        }
        setTaughtOutcomesOpen(true);
        setGuidedSection('taught-outcomes');
    }, [showTaughtOutcomesSection]);

    const revealReflectionSection = useCallback(() => {
        setGuidedSection('reflection');
    }, []);

    const openCompletionSection = useCallback(() => {
        setGuidedSection('complete');
    }, []);

    const revealWorkflowSection = useCallback(() => {
        setChecklistOpen(true);
        window.setTimeout(() => scrollToSection('workflow-section'), 0);
    }, []);

    const resolveClosureTeachingWorkflowHref = useCallback(async () => {
        if (!session || session.status === 'COMPLETED') {
            return null;
        }

        if (!isCbcSession) {
            return defaultTeachingWorkflowHref;
        }

        if (closureTeachingWorkflowHref) {
            return closureTeachingWorkflowHref;
        }

        if (requiredEvidenceOutcomeIds.length === 0) {
            return defaultTeachingWorkflowHref;
        }

        const evidenceWorkflowHref = await resolveSessionClosureEvidenceWorkflowHref({
            requiredOutcomeIds: requiredEvidenceOutcomeIds,
            returnTo: completionReturnTo,
            session,
        });
        setResolvedClosureEvidenceWorkflowHref(evidenceWorkflowHref);

        return evidenceWorkflowHref;
    }, [
        closureTeachingWorkflowHref,
        completionReturnTo,
        defaultTeachingWorkflowHref,
        isCbcSession,
        requiredEvidenceOutcomeIds,
        session,
    ]);

    const routeClosureStateFromBackend = useCallback(async (
        latestClosureState: SessionClosureState,
        options?: {
            explicitClosureIntent?: boolean;
            navigateForEvidence?: boolean;
        },
    ): Promise<{ closureState: SessionClosureState; completed: boolean }> => {
        const explicitClosureIntent = options?.explicitClosureIntent ?? false;
        const navigateForEvidence = options?.navigateForEvidence ?? false;

        if (latestClosureState.next_step === 'ATTENDANCE') {
            revealAttendanceSection();
            setWorkflowNotice('Take attendance before closing this lesson.');
            return { closureState: latestClosureState, completed: false };
        }

        if (latestClosureState.next_step === 'TAUGHT_OUTCOMES') {
            revealTaughtOutcomesSection();
            setWorkflowNotice('Confirm what was taught before closing this lesson.');
            return { closureState: latestClosureState, completed: false };
        }

        if (latestClosureState.next_step === 'INTERRUPTED') {
            openCompletionSection();
            setWorkflowNotice('This lesson was not taught. Reschedule it to keep the lesson plan active.');
            return { closureState: latestClosureState, completed: false };
        }

        if (latestClosureState.next_step === 'EVIDENCE') {
            const evidenceWorkflowHref = await resolveClosureTeachingWorkflowHref();

            if (!evidenceWorkflowHref) {
                setWorkflowError('Learner performance is required, but no curriculum evidence workflow is available for this lesson.');
                openCompletionSection();
                return { closureState: latestClosureState, completed: false };
            }

            if (navigateForEvidence) {
                router.push(evidenceWorkflowHref);
                return { closureState: latestClosureState, completed: false };
            }

            setWorkflowNotice(
                latestClosureState.message?.trim()
                    || 'Learner performance is required before this lesson can be closed.',
            );
            openCompletionSection();
            return { closureState: latestClosureState, completed: false };
        }

        if (latestClosureState.next_step === 'REFLECTION') {
            revealReflectionSection();
            setWorkflowNotice('Add a lesson reflection before closing this lesson.');
            return { closureState: latestClosureState, completed: false };
        }

        if (explicitClosureIntent && isInProgress) {
            await completeSession();
            await refetch();
            const refreshedClosureState = await refetchClosureState();
            closureIntentRef.current = false;
            setGuidedSection('post-lesson');
            setWorkflowSuccess(
                isInstructor ? 'Lesson record closed. Post-lesson actions are ready below.' : 'Lesson record closed.'
            );
            return {
                closureState: refreshedClosureState ?? latestClosureState,
                completed: true,
            };
        }

        openCompletionSection();
        setWorkflowNotice('All required teaching records are complete. Close the lesson record.');
        closureIntentRef.current = false;
        return { closureState: latestClosureState, completed: false };
    }, [
        completeSession,
        isInProgress,
        isInstructor,
        openCompletionSection,
        refetch,
        refetchClosureState,
        revealAttendanceSection,
        revealReflectionSection,
        revealTaughtOutcomesSection,
        resolveClosureTeachingWorkflowHref,
        router,
    ]);

    const continueSessionClosureWorkflow = useCallback(async (
        reason?: string,
        options?: {
            explicitClosureIntent?: boolean;
            navigateForEvidence?: boolean;
        },
    ): Promise<{ closureState: SessionClosureState; completed: boolean } | null> => {
        if (typeof options?.explicitClosureIntent === 'boolean') {
            closureIntentRef.current = options.explicitClosureIntent;
        }

        if (reason === 'participation_changed') {
            setTransientWorkflowNotice({
                message: 'Participating class updated. The lesson workspace has refreshed to the current required step.',
                variant: 'info',
            });
        }

        if (reason === 'reflection_saved') {
            setTransientWorkflowNotice({
                message: 'Reflection saved. The lesson workspace has refreshed to the next required step.',
                variant: 'info',
            });
        }

        await refetch();
        const latestClosureState = await refetchClosureState();

        if (!latestClosureState) {
            setWorkflowError('The lesson workspace could not refresh the latest closure state.');
            return null;
        }

        return routeClosureStateFromBackend(latestClosureState, {
            explicitClosureIntent: closureIntentRef.current,
            navigateForEvidence: options?.navigateForEvidence ?? false,
        });
    }, [
        refetch,
        refetchClosureState,
        routeClosureStateFromBackend,
    ]);

    const toggleChecklistOpen = useCallback(() => {
        setChecklistOpen((current) => {
            const next = !current;
            if (!next) {
                clampDashboardScrollToContent();
            }
            return next;
        });
    }, []);

    const toggleLessonPreparationOpen = useCallback(() => {
        setLessonPreparationOpen((current) => {
            const next = !current;
            if (!next) {
                clampDashboardScrollToContent();
            }
            return next;
        });
    }, []);

    const toggleAttendanceOpen = useCallback(() => {
        setAttendanceOpen((current) => {
            const next = !current;
            if (!next) {
                clampDashboardScrollToContent();
            }
            return next;
        });
    }, []);

    const toggleTaughtOutcomesOpen = useCallback(() => {
        setTaughtOutcomesOpen((current) => {
            const next = !current;
            if (!next) {
                clampDashboardScrollToContent();
            }
            return next;
        });
    }, []);

    useEffect(() => {
        if (!noticeConfig) {
            return;
        }

        setTransientWorkflowNotice(noticeConfig);
    }, [noticeConfig]);

    useEffect(() => {
        const notice = searchParams.get('notice');
        if (!notice || !pathname) {
            return;
        }

        const nextSearchParams = new URLSearchParams(searchParams.toString());
        nextSearchParams.delete('notice');

        const nextUrl = nextSearchParams.toString()
            ? `${pathname}?${nextSearchParams.toString()}`
            : pathname;

        router.replace(nextUrl, { scroll: false });
    }, [pathname, router, searchParams]);

    useEffect(() => {
        if (guidedSection === 'attendance' && showAttendanceSection) {
            if (!attendanceOpen) {
                setAttendanceOpen(true);
                return;
            }
            scrollToSection('attendance-section');
            setGuidedSection(null);
        }

        if (guidedSection === 'taught-outcomes' && showTaughtOutcomesSection) {
            if (!taughtOutcomesOpen) {
                setTaughtOutcomesOpen(true);
                return;
            }
            scrollToSection('taught-outcomes-section');
            setGuidedSection(null);
        }

        if (guidedSection === 'complete' && currentWorkflowStep === 'complete') {
            scrollToSection('lesson-complete-section');
            setGuidedSection(null);
        }

        if (guidedSection === 'reflection' && currentWorkflowStep === 'complete') {
            scrollToSection('lesson-reflection-section');
            setGuidedSection(null);
        }

        if (guidedSection === 'post-lesson' && currentWorkflowStep === 'post_lesson') {
            scrollToSection('post-lesson-section');
            setGuidedSection(null);
        }
    }, [
        attendanceOpen,
        currentWorkflowStep,
        guidedSection,
        showAttendanceSection,
        showTaughtOutcomesSection,
        taughtOutcomesOpen,
    ]);

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
        setTaughtOutcomesValidationError(null);
    }, [session]);

    useEffect(() => {
        setSkipPreparedTaskPrompt(false);
    }, [preparedTaskDraft?.id, issuedPreparedTask?.id, sessionId]);

    useEffect(() => {
        if (currentWorkflowStep === 'scheduled') {
            setLessonPreparationOpen(hasLessonPlan);
            setAttendanceOpen(false);
            setTaughtOutcomesOpen(false);
            return;
        }

        if (currentWorkflowStep === 'attendance') {
            setLessonPreparationOpen(false);
            setAttendanceOpen(true);
            setTaughtOutcomesOpen(false);
            return;
        }

        if (currentWorkflowStep === 'confirm_taught') {
            setLessonPreparationOpen(false);
            setAttendanceOpen(false);
            setTaughtOutcomesOpen(true);
            return;
        }

        if (currentWorkflowStep === 'complete') {
            setLessonPreparationOpen(false);
            setAttendanceOpen(false);
            setTaughtOutcomesOpen(false);
            return;
        }

        setLessonPreparationOpen(false);
        setAttendanceOpen(false);
        setTaughtOutcomesOpen(false);
    }, [currentWorkflowStep, hasLessonPlan]);

    useEffect(() => {
        const section = searchParams.get('section');
        if (!section) {
            return;
        }

        const timer = window.setTimeout(() => {
            if (section === 'lesson-preparation') {
                scrollToSection('lesson-preparation-section');
                return;
            }
            if (section === 'post-lesson') {
                scrollToSection('post-lesson-section');
                return;
            }
            if (section === 'attendance') {
                revealAttendanceSection();
                return;
            }
            if (section === 'taught-outcomes') {
                revealTaughtOutcomesSection();
                return;
            }
            if (section === 'complete') {
                scrollToSection('lesson-complete-section');
            }
        }, 100);

        return () => window.clearTimeout(timer);
    }, [revealAttendanceSection, revealTaughtOutcomesSection, searchParams]);

    useEffect(() => {
        const highlightValue = Number(searchParams.get('highlightAssignment') ?? '');
        if (!Number.isFinite(highlightValue) || highlightValue <= 0) {
            return;
        }

        setHighlightedAssignmentId(highlightValue);
        const timer = window.setTimeout(() => {
            setHighlightedAssignmentId(null);
        }, 5000);

        return () => window.clearTimeout(timer);
    }, [searchParams]);

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
            title: 'Record learner performance',
            icon: FileText,
            complete: isNotTaughtInterrupted || !requiresEvidence || hasRequiredEvidence,
            description: isNotTaughtInterrupted
                ? 'No evidence is required because the lesson was not taught.'
                : !requiresEvidence
                ? 'No taught outcomes need evidence for this lesson.'
                : hasRequiredEvidence
                    ? 'Learner performance is recorded for the outcomes taught.'
                    : 'Record learner performance for taught outcomes.',
        },
        {
            title: 'Add lesson reflection',
            icon: MessageSquareText,
            complete: isNotTaughtInterrupted || hasReflection,
            description: isNotTaughtInterrupted
                ? 'Normal lesson reflection is skipped because the lesson was not taught.'
                : hasReflection
                ? 'Lesson reflection recorded.'
                : 'Add a short lesson reflection before closing the lesson record.',
        },
        {
            title: 'Close lesson record',
            icon: CheckCircle2,
            complete: isCompleted,
            description: isCompleted
                ? 'Lesson record closed.'
                : isCancelled
                    ? 'Lesson cancelled.'
                    : isNotTaughtInterrupted
                        ? 'This lesson cannot be completed. Reschedule or cancel it instead.'
                : needsCompletion
                    ? 'Scheduled end passed. End the lesson and finish the missing record.'
                    : closureReady
                        ? 'All required teaching records are ready. Close the lesson record.'
                        : 'Use End lesson to continue the missing closure step.',
        },
    ]), [
        confirmedTaughtOutcomes.length,
        closureReady,
        hasReflection,
        hasRequiredEvidence,
        hasMarkedAttendance,
        isCompleted,
        isCancelled,
        isInProgress,
        isNotTaughtInterrupted,
        isScheduled,
        isScheduledOverdue,
        isScheduledReady,
        needsCompletion,
        requiresEvidence,
        attendanceStats.total,
        attendanceStats.unmarked,
    ]);

    const completedWorkflowSteps = workflowSteps.filter((step) => step.complete).length;
    const attendanceMarkedCount = Math.max(0, attendanceStats.total - attendanceStats.unmarked);
    const attendanceSectionTitle = isCompleted
        ? 'Attendance records'
        : needsCompletion
            ? 'Review attendance'
            : 'Take attendance';
    const attendanceSectionSummary = attendanceStats.total > 0
        ? `${attendanceMarkedCount}/${attendanceStats.total} learners marked`
        : 'No attendance records are available yet.';
    const plannedOutcomeCount = session?.planned_outcomes.length ?? 0;
    const canEditTaughtOutcomes = canAdvanceTeachingWorkflow && isInProgress && hasMarkedAttendance && !isHistorical && !isCompleted && !confirmingTaughtOutcomes;
    const allPlannedOutcomesSelected = session?.planned_outcomes.every(
        (outcome) => Boolean(taughtSelections[outcome.outcome_id])
    ) ?? false;
    const allPlannedOutcomesNotTaught = (
        plannedOutcomeCount > 0
        && allPlannedOutcomesSelected
        && (session?.planned_outcomes.every(
            (outcome) => taughtSelections[outcome.outcome_id] === 'NOT_TAUGHT'
        ) ?? false)
    );
    const canConfirmTaughtOutcomes = (
        isInProgress
        && canAdvanceTeachingWorkflow
        && hasMarkedAttendance
        && !isHistorical
        && !isCompleted
        && plannedOutcomeCount > 0
        && allPlannedOutcomesSelected
        && !confirmingTaughtOutcomes
    );
    const confirmTaughtOutcomesLabel = allPlannedOutcomesNotTaught
        ? 'Mark lesson as not taught'
        : 'Confirm what was taught';
    const taughtOutcomesSelectionMessage = (
        canEditTaughtOutcomes
        && plannedOutcomeCount > 0
        && !allPlannedOutcomesSelected
    )
        ? 'Select a taught status for every planned outcome before confirming.'
        : taughtOutcomesValidationError;
    const taughtOutcomesSectionSummary = plannedOutcomeCount > 0
        ? `${plannedOutcomeCount} planned outcome${plannedOutcomeCount === 1 ? '' : 's'} · ${hasConfirmedTaughtOutcomes ? 'confirmed' : 'not yet confirmed'}`
        : 'No planned outcomes are linked to this lesson.';
    const checklistSummary = `${completedWorkflowSteps}/${workflowSteps.length} steps complete`;

    const handleTaughtSelectionChange = useCallback((outcomeId: number, status: TaughtStatus) => {
        setTaughtSelections((current) => ({
            ...current,
            [outcomeId]: status,
        }));
        setTaughtOutcomesValidationError(null);
    }, []);

    const handleEndLessonIntent = useCallback(async () => {
        try {
            clearWorkflowFeedback();
            await continueSessionClosureWorkflow('end_lesson_intent', {
                explicitClosureIntent: true,
                navigateForEvidence: true,
            });
        } catch (error) {
            setWorkflowError(error instanceof Error ? error.message : 'We could not close this lesson record.');
        }
    }, [
        clearWorkflowFeedback,
        continueSessionClosureWorkflow,
    ]);

    const handleOpenRescheduleModal = useCallback(() => {
        setShowRescheduleModal(true);
    }, []);

    const handleCancelLesson = useCallback(async () => {
        if (!session || isHistorical || isCompleted || !window.confirm('Cancel this lesson?')) {
            return;
        }

        try {
            clearWorkflowFeedback();
            await cancelSession();
            setWorkflowSuccess('Lesson cancelled.');
        } catch (error) {
            setWorkflowError(error instanceof Error ? error.message : 'We could not cancel this lesson.');
        }
    }, [
        cancelSession,
        clearWorkflowFeedback,
        isCompleted,
        isHistorical,
        session,
    ]);

    const nextSafeAssistantAction = useMemo(() => {
        if (isCancelled) {
            if (hasLessonPlan && session?.lesson_plan_id) {
                return {
                    label: 'View lesson preparation',
                    type: 'navigate' as const,
                    href: `/lesson-plans/${session.lesson_plan_id}`,
                };
            }
            return undefined;
        }

        if (closureNextStep === 'ATTENDANCE') {
            return {
                label: 'Review attendance section',
                type: 'page_action' as const,
                target: 'review_attendance_section',
                handler: revealAttendanceSection,
            };
        }

        if (closureNextStep === 'TAUGHT_OUTCOMES') {
            return {
                label: 'Review what was taught',
                type: 'page_action' as const,
                target: 'review_taught_outcomes_section',
                handler: revealTaughtOutcomesSection,
            };
        }

        if (closureNextStep === 'INTERRUPTED') {
            return {
                label: 'Reschedule lesson',
                type: 'page_action' as const,
                target: 'reschedule_lesson',
                handler: handleOpenRescheduleModal,
            };
        }

        if (closureNextStep === 'EVIDENCE' && !isCompleted && canAdvanceTeachingWorkflow) {
            return {
                label: 'Record learner performance',
                type: canRecordEvidence && closureTeachingWorkflowHref ? 'navigate' as const : 'page_action' as const,
                ...(canRecordEvidence && closureTeachingWorkflowHref
                    ? { href: closureTeachingWorkflowHref }
                    : {
                        target: 'close_lesson_record',
                        handler: () => {
                            void handleEndLessonIntent();
                        },
                    }),
            };
        }

        if (closureNextStep === 'REFLECTION' && canAdvanceTeachingWorkflow) {
            return {
                label: 'Add lesson reflection',
                type: 'page_action' as const,
                target: 'review_reflection_section',
                handler: revealReflectionSection,
            };
        }

        if (closureNextStep === 'READY' && isInProgress && canAdvanceTeachingWorkflow) {
            return {
                label: 'Close lesson record',
                type: 'page_action' as const,
                target: 'close_lesson_record',
                handler: () => {
                    void handleEndLessonIntent();
                },
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
        hasLessonPlan,
        canAdvanceTeachingWorkflow,
        canRecordEvidence,
        isCompleted,
        isCancelled,
        isInProgress,
        closureNextStep,
        closureTeachingWorkflowHref,
        handleEndLessonIntent,
        handleOpenRescheduleModal,
        revealAttendanceSection,
        revealReflectionSection,
        revealTaughtOutcomesSection,
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
            closure_ready: closureReady,
            closure_next_step: closureNextStep,
            requires_evidence: requiresEvidence,
            has_required_evidence: hasRequiredEvidence,
            has_reflection: hasReflection,
            workflow_step: currentWorkflowStep,
        },
        visibleActions: [
            {
                label: 'Review attendance section',
                type: 'page_action' as const,
                target: 'review_attendance_section',
                handler: revealAttendanceSection,
            },
            {
                label: 'Review what was taught',
                type: 'page_action' as const,
                target: 'review_taught_outcomes_section',
                handler: revealTaughtOutcomesSection,
            },
            {
                label: 'Review lesson completion',
                type: 'page_action' as const,
                target: 'review_completion_section',
                handler: () => scrollToSection('lesson-complete-section'),
            },
            ...(isNotTaughtInterrupted
                ? [{
                    label: 'Reschedule lesson',
                    type: 'page_action' as const,
                    target: 'reschedule_lesson',
                    handler: handleOpenRescheduleModal,
                }, {
                    label: 'Cancel lesson',
                    type: 'page_action' as const,
                    target: 'cancel_lesson',
                    handler: () => {
                        void handleCancelLesson();
                    },
                }]
                : []),
            ...(canRecordEvidence && closureTeachingWorkflowHref
                ? [{
                    label: 'Record learner performance',
                    type: 'navigate' as const,
                    href: closureTeachingWorkflowHref,
                }]
                : []),
            ...(canAdvanceTeachingWorkflow
                ? [{
                    label: 'Add lesson reflection',
                    type: 'page_action' as const,
                    target: 'review_reflection_section',
                    handler: revealReflectionSection,
                }, {
                    label: 'Close lesson record',
                    type: 'page_action' as const,
                    target: 'close_lesson_record',
                    handler: () => {
                        void handleEndLessonIntent();
                    },
                }]
                : []),
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
        canAdvanceTeachingWorkflow,
        canRecordEvidence,
        closureNextStep,
        closureReady,
        closureTeachingWorkflowHref,
        hasReflection,
        hasRequiredEvidence,
        hasConfirmedTaughtOutcomes,
        hasLessonPlan,
        hasMarkedAttendance,
        handleCancelLesson,
        handleEndLessonIntent,
        handleOpenRescheduleModal,
        isCompleted,
        isInProgress,
        isNotTaughtInterrupted,
        loading,
        needsCompletion,
        nextSafeAssistantAction,
        requiresEvidence,
        revealAttendanceSection,
        revealReflectionSection,
        revealTaughtOutcomesSection,
        session,
        sessionStatus,
    ]);

    useAssistantPageContext(assistantContext);

    const handleStartLesson = async () => {
        try {
            clearWorkflowFeedback();
            closureIntentRef.current = false;
            await startSession();
            setGuidedSection('attendance');
            setWorkflowSuccess(
                isInstructor ? 'Lesson started. Next step: take attendance.' : 'Lesson started.'
            );
        } catch (error) {
            setWorkflowError(error instanceof Error ? error.message : 'We could not start this lesson.');
        }
    };

    const handleRescheduleLesson = async (
        payload: RescheduleSessionPayload,
    ) => {
        try {
            clearWorkflowFeedback();
            await rescheduleSession(payload);
            setWorkflowSuccess('Lesson rescheduled.');
        } catch (error) {
            throw error;
        }
    };

    const handleParticipationChanged = useCallback(async () => {
        try {
            clearWorkflowFeedback();

            const canReseedForParticipationChange = Boolean(
                session
                && !isHistorical
                && (session.status === 'SCHEDULED' || session.status === 'IN_PROGRESS')
            );

            if (canReseedForParticipationChange) {
                await reseedAttendance();
            } else {
                await refetch();
            }

            await continueSessionClosureWorkflow('participation_changed');
        } catch (error) {
            setWorkflowError(
                error instanceof Error
                    ? error.message
                    : 'Participating class updated, but the lesson workspace could not finish refreshing.'
            );
        }
    }, [
        clearWorkflowFeedback,
        continueSessionClosureWorkflow,
        isHistorical,
        refetch,
        reseedAttendance,
        session,
    ]);

    const handleReflectionSaved = useCallback(async () => {
        try {
            clearWorkflowFeedback();
            const result = await continueSessionClosureWorkflow('reflection_saved');
            if (!result) {
                return;
            }

            if (!result.completed && result.closureState.next_step === 'READY') {
                setWorkflowSuccess(
                    'Reflection saved. Close the lesson record when you are ready.'
                );
            } else if (!result.completed) {
                setWorkflowSuccess('Reflection saved.');
            }
        } catch (error) {
            setWorkflowError(
                error instanceof Error
                    ? error.message
                    : 'Reflection saved, but the lesson workflow could not continue automatically.'
            );
        }
    }, [
        clearWorkflowFeedback,
        continueSessionClosureWorkflow,
    ]);

    const handleConfirmWhatWasTaught = useCallback(async () => {
        if (!session) {
            return;
        }

        if (confirmingTaughtOutcomes) {
            return;
        }

        const missingOutcomes = session.planned_outcomes.filter(
            (outcome) => !taughtSelections[outcome.outcome_id]
        );

        if (missingOutcomes.length > 0) {
            setTaughtOutcomesValidationError('Select a taught status for every planned outcome before confirming.');
            return;
        }

        if (!isInProgress || !hasMarkedAttendance || isHistorical || isCompleted || session.planned_outcomes.length === 0) {
            return;
        }

        try {
            setConfirmingTaughtOutcomes(true);
            setTaughtOutcomesValidationError(null);
            clearWorkflowFeedback();
            await confirmTaughtOutcomes({
                outcomes: session.planned_outcomes.map((outcome) => ({
                    outcome_id: outcome.outcome_id,
                    status: taughtSelections[outcome.outcome_id] as TaughtStatus,
                })),
            });
            const result = await continueSessionClosureWorkflow('taught_outcomes_confirmed', {
                navigateForEvidence: true,
            });
            if (!result) {
                return;
            }
            setWorkflowSuccess(
                isInstructor
                    ? (
                        result.closureState.next_step === 'EVIDENCE'
                            ? 'What was taught is confirmed. Next step: record learner performance.'
                            : result.closureState.next_step === 'INTERRUPTED'
                                ? 'This lesson was marked as not taught. Reschedule it to keep the lesson plan active.'
                            : result.closureState.next_step === 'REFLECTION'
                                ? 'What was taught is confirmed. Next step: add the lesson reflection.'
                                : result.closureState.next_step === 'READY'
                                    ? 'What was taught is confirmed. Close the lesson record when you are ready.'
                                    : 'What was taught is confirmed.'
                    )
                    : 'What was taught has been confirmed.'
            );
        } catch (error) {
            setWorkflowError(error instanceof Error ? error.message : 'We could not confirm what was taught.');
        } finally {
            setConfirmingTaughtOutcomes(false);
        }
    }, [
        clearWorkflowFeedback,
        confirmTaughtOutcomes,
        confirmingTaughtOutcomes,
        continueSessionClosureWorkflow,
        hasMarkedAttendance,
        isCompleted,
        isHistorical,
        isInProgress,
        isInstructor,
        session,
        taughtSelections,
    ]);

    const handleIssuePreparedTask = async () => {
        if (!session || !preparedTaskDraft) {
            return;
        }

        try {
            setIssuingPreparedTask(true);
            clearWorkflowFeedback();
            const response = await issuePreparedAssignmentMutation.mutateAsync({
                sessionId: session.id,
                data: {
                    assignment_id: preparedTaskDraft.id,
                },
            });
            setPreparedAssignment(response.assignment);
            setSkipPreparedTaskPrompt(false);
            setWorkflowSuccess(response.detail);
        } catch (error) {
            setWorkflowError(
                error instanceof Error
                    ? error.message
                    : 'We could not issue the learner task.'
            );
        } finally {
            setIssuingPreparedTask(false);
        }
    };

    if (loading && !session) {
        return (
            <div className="mx-auto w-full max-w-6xl pb-8">
                <LoadingSpinner message="Loading session details..." />
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

    const lessonPlanHref = session.lesson_plan_id
        ? `/lesson-plans/${session.lesson_plan_id}`
        : null;
    const lessonTaskReturnSection = currentWorkflowStep === 'post_lesson'
        ? 'post-lesson'
        : 'lesson-preparation';
    const lessonTaskReturnTo = learnerTaskForLesson
        ? `/sessions/${session.id}?section=${lessonTaskReturnSection}&highlightAssignment=${learnerTaskForLesson.id}`
        : `/sessions/${session.id}?section=${lessonTaskReturnSection}`;
    const supervisedWorkflowStage = workflowSummary?.stage ?? (closureNextStep === 'INTERRUPTED' ? 'REQUIRES_REVIEW' : closureNextStep);
    const supervisedWorkflowIsActive = [
        'ATTENDANCE',
        'TAUGHT_OUTCOMES',
        'EVIDENCE',
        'REFLECTION',
        'READY',
        'REQUIRES_REVIEW',
    ].includes(supervisedWorkflowStage);
    const isSupervisionOnlyWorkflow = Boolean(
        !canAdvanceTeachingWorkflow
        && !isCompleted
        && !isCancelled
        && supervisedWorkflowIsActive
        && (workflowSummary?.action_owner ?? 'INSTRUCTOR') === 'INSTRUCTOR'
    );
    const supervisedStageLabel = workflowSummary?.stage_label ?? (
        supervisedWorkflowStage === 'EVIDENCE'
            ? 'Record learner performance'
            : supervisedWorkflowStage === 'REFLECTION'
                ? 'Add lesson reflection'
                : supervisedWorkflowStage === 'READY'
                    ? 'Ready to close'
                    : supervisedWorkflowStage === 'ATTENDANCE'
                        ? 'Take attendance'
                        : supervisedWorkflowStage === 'TAUGHT_OUTCOMES'
                            ? 'Confirm what was taught'
                            : 'Review lesson record'
    );
    const supervisionMissingMessage = buildSupervisionMissingMessage(workflowSummary);
    const currentActionTitle = isSupervisionOnlyWorkflow
        ? (supervisedWorkflowStage === 'REQUIRES_REVIEW' ? 'Review lesson record' : 'Teacher action required')
        : isScheduled
        ? 'Current action: get ready to teach'
        : isCancelled
            ? 'Current action: lesson cancelled'
        : currentWorkflowStep === 'attendance'
            ? 'Current action: take attendance'
            : currentWorkflowStep === 'confirm_taught'
                ? 'Current action: confirm what was taught'
                : currentWorkflowStep === 'complete'
                    ? (
                        closureNextStep === 'ATTENDANCE'
                            ? 'Current action: review attendance'
                            : closureNextStep === 'TAUGHT_OUTCOMES'
                                ? 'Current action: confirm what was taught'
                                : closureNextStep === 'INTERRUPTED'
                                    ? 'Current action: reschedule or cancel lesson'
                                : closureNextStep === 'EVIDENCE'
                                    ? 'Current action: record learner performance'
                                    : closureNextStep === 'REFLECTION'
                                        ? 'Current action: add lesson reflection'
                                        : 'Current action: close lesson record'
                    )
                    : 'Current action: review completed lesson';
    const currentActionDescription = isSupervisionOnlyWorkflow
        ? 'The assigned instructor must complete this lesson record.'
        : isScheduled
        ? (hasPreparedTaskForLesson
            ? 'Lesson preparation is linked and the learner task is ready. Start from the lesson window when class begins.'
            : 'Review lesson preparation, prepare the learner task if needed, and start from the lesson window when class begins.')
        : isCancelled
            ? 'This lesson was cancelled and will not continue through normal lesson closure.'
        : currentWorkflowStep === 'attendance'
            ? 'Keep teaching time focused. Mark attendance first so the next class action becomes visible.'
        : currentWorkflowStep === 'confirm_taught'
                ? 'Attendance is saved. Confirm the planned outcomes taught in class before the lesson record can move forward.'
                : currentWorkflowStep === 'complete'
                    ? (closureNextStep === 'ATTENDANCE'
                        ? 'Attendance is still missing. Review attendance to continue lesson closure.'
                        : closureNextStep === 'TAUGHT_OUTCOMES'
                            ? 'What was taught is still missing. Confirm the taught outcomes to continue lesson closure.'
                            : closureNextStep === 'INTERRUPTED'
                                ? 'This lesson was not taught. Reschedule it to keep the lesson plan active, or cancel it if it will not run.'
                            : closureNextStep === 'EVIDENCE'
                                ? (closureTeachingWorkflowHref || isClosureEvidenceWorkflowPending
                                    ? closureEvidenceMessage
                                    : 'Learner performance is required, but no curriculum evidence workflow is available for this lesson.')
                                : closureNextStep === 'REFLECTION'
                                    ? 'Add the required lesson reflection. If you lose your place, re-check lesson closure to reopen the current step.'
                                    : 'All required teaching records are complete. Close the lesson record.')
                    : 'This lesson is complete. Review the record here; assignment work remains in the assignment workspace.';
    const lessonPreparationSummary = `${session.planned_outcomes.length} planned outcome${session.planned_outcomes.length === 1 ? '' : 's'} · ${
        preparedTaskDraft
            ? 'learner task prepared'
            : issuedPreparedTask
                ? 'learner task issued'
                : 'no learner task prepared'
    }`;
    const currentActionPrimary = isCancelled
        ? null
        : isSupervisionOnlyWorkflow
            ? {
                label: 'View lesson workflow',
                onClick: revealWorkflowSection,
                icon: <ClipboardCheck className="mr-1.5 h-4 w-4" />,
                disabled: false,
            }
        : !canAdvanceTeachingWorkflow
            ? (hasLessonPlan
                ? {
                    label: 'View lesson preparation',
                    onClick: () => {
                        setLessonPreparationOpen(true);
                        scrollToSection('lesson-preparation-section');
                    },
                    icon: <BookOpen className="mr-1.5 h-4 w-4" />,
                    disabled: false,
                }
                : null)
        : isScheduled && (isScheduledReady || isScheduledOverdue)
        ? {
            label: isScheduledOverdue ? 'Start late' : 'Start lesson',
            onClick: handleStartLesson,
            icon: <PlayCircle className="mr-1.5 h-4 w-4" />,
            disabled: !session.can_start_now || midtermBreakPausesNormalStart || !canAdvanceTeachingWorkflow,
        }
        : isScheduled && hasLessonPlan
            ? {
                label: 'View lesson preparation',
                onClick: () => {
                    setLessonPreparationOpen(true);
                    scrollToSection('lesson-preparation-section');
                },
                icon: <BookOpen className="mr-1.5 h-4 w-4" />,
                disabled: false,
            }
            : currentWorkflowStep === 'attendance'
                ? {
                    label: 'Take attendance',
                    onClick: revealAttendanceSection,
                    icon: <ClipboardCheck className="mr-1.5 h-4 w-4" />,
                    disabled: false,
                }
                : currentWorkflowStep === 'confirm_taught'
                    ? {
                        label: 'Confirm what was taught',
                        onClick: revealTaughtOutcomesSection,
                        icon: <Target className="mr-1.5 h-4 w-4" />,
                        disabled: false,
                    }
                    : currentWorkflowStep === 'complete'
                        ? (
                            closureNextStep === 'ATTENDANCE'
                                ? {
                                    label: 'Review attendance',
                                    onClick: revealAttendanceSection,
                                    icon: <ClipboardCheck className="mr-1.5 h-4 w-4" />,
                                    disabled: false,
                                }
                                : closureNextStep === 'TAUGHT_OUTCOMES'
                                    ? {
                                        label: 'Review taught outcomes',
                                        onClick: revealTaughtOutcomesSection,
                                        icon: <Target className="mr-1.5 h-4 w-4" />,
                                        disabled: false,
                                    }
                                    : closureNextStep === 'INTERRUPTED'
                                        ? {
                                            label: 'Reschedule lesson',
                                            onClick: handleOpenRescheduleModal,
                                            icon: <Calendar className="mr-1.5 h-4 w-4" />,
                                            disabled: false,
                                        }
                                    : closureNextStep === 'EVIDENCE'
                                        ? (
                                            canRecordEvidence && closureTeachingWorkflowHref
                                                ? {
                                                    label: 'Record learner performance',
                                                    href: closureTeachingWorkflowHref,
                                                    icon: <FileText className="mr-1.5 h-4 w-4" />,
                                                    disabled: false,
                                                }
                                                : {
                                                    label: 'Re-check lesson closure',
                                                    onClick: () => {
                                                        void handleEndLessonIntent();
                                                    },
                                                    icon: <CheckCircle2 className="mr-1.5 h-4 w-4" />,
                                                    disabled: false,
                                                }
                                        )
                                        : closureNextStep === 'REFLECTION'
                                            ? {
                                                label: 'Add lesson reflection',
                                                onClick: revealReflectionSection,
                                                icon: <MessageSquareText className="mr-1.5 h-4 w-4" />,
                                                disabled: false,
                                            }
                                            : {
                                                label: 'Close lesson record',
                                                onClick: () => {
                                                    void handleEndLessonIntent();
                                                },
                                                icon: <CheckCircle2 className="mr-1.5 h-4 w-4" />,
                                                disabled: false,
                                }
                        )
                        : currentWorkflowStep === 'post_lesson' && showPostLessonAssignmentActions && preparedTaskDraft
                                ? {
                                    label: issuingPreparedTask ? 'Issuing...' : 'Issue prepared task',
                                    onClick: () => {
                                        void handleIssuePreparedTask();
                                    },
                                    icon: <FilePlus2 className="mr-1.5 h-4 w-4" />,
                                    disabled: issuingPreparedTask,
                                }
                                : null;
    const currentActionSecondary = !canAdvanceTeachingWorkflow
        ? null
        : currentWorkflowStep === 'complete'
        ? (
            closureNextStep === 'INTERRUPTED'
                ? {
                    label: 'Cancel lesson',
                    onClick: () => {
                        void handleCancelLesson();
                    },
                }
                : closureNextStep !== 'READY'
                    ? {
                        label: 'Re-check lesson closure',
                        onClick: () => {
                            void handleEndLessonIntent();
                        },
                    }
                    : null
        )
        : null;
    const currentActionShowsLessonPreparation = currentActionPrimary?.label === 'View lesson preparation';
    const sessionDetailExtensionContext = {
        session,
        closureState,
        isHistorical,
        isInProgress,
        isCompleted,
    };
    const sessionDetailExtensions = getSessionDetailExtensions(sessionDetailExtensionContext);

    return (
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 pb-8">
            <div className="space-y-3">
                <Link href={backHref}>
                    <Button variant="ghost" size="sm">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        {isInstructor ? 'Back to My Lessons' : 'Back'}
                    </Button>
                </Link>

                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                        <h1 className="flex flex-wrap items-center gap-2 text-xl font-semibold">
                            <span className="truncate">{session.title || session.subject_name}</span>
                            {showMergedBadge ? (
                                <Badge variant="maroon">
                                    <Layers className="mr-1 h-3 w-3" />
                                    Multi-cohort
                                </Badge>
                            ) : null}
                            {isHistorical ? <Badge variant="default">Historical</Badge> : null}
                        </h1>
                        <p className="mt-0.5 text-sm text-gray-500">{session.term_name}</p>
                    </div>

                    <div className="shrink-0 space-y-2">
                        <div className="flex flex-wrap items-center justify-end gap-2">
                            <Badge variant="blue">{session.session_type_display}</Badge>
                            {isScheduled ? <Badge variant="default">Scheduled</Badge> : null}
                            {isScheduledOverdue ? <Badge variant="orange">Overdue</Badge> : null}
                            {isInProgress && !isInProgressOverdue ? <Badge variant="yellow">In progress</Badge> : null}
                            {isInProgressOverdue ? <Badge variant="red">Needs completion</Badge> : null}
                            {isNotTaughtInterrupted ? <Badge variant="orange">Not taught</Badge> : null}
                            {isCancelled ? <Badge variant="red">Cancelled</Badge> : null}
                            {isCompleted ? <Badge variant="green">Completed</Badge> : null}
                        </div>

                        {lessonPlanHref || !isHistorical ? (
                            <div className="flex flex-wrap items-center justify-end gap-2">
                                {lessonPlanHref ? (
                                    <Link href={lessonPlanHref}>
                                        <Button variant="secondary" size="sm">
                                            <BookOpen className="mr-1.5 h-4 w-4" />
                                            {isInstructor ? 'Back to lesson preparation' : 'Back to lesson plan'}
                                        </Button>
                                    </Link>
                                ) : null}

                                {!isHistorical ? (
                                    <ActionMenu
                                        items={[
                                            ...(canReschedule ? [{
                                                label: 'Reschedule lesson',
                                                onSelect: () => setShowRescheduleModal(true),
                                                icon: <Calendar className="h-4 w-4" />,
                                            }] : []),
                                            ...(isNotTaughtInterrupted ? [{
                                                label: 'Reschedule lesson',
                                                onSelect: handleOpenRescheduleModal,
                                                icon: <Calendar className="h-4 w-4" />,
                                            }, {
                                                label: 'Cancel lesson',
                                                onSelect: () => {
                                                    void handleCancelLesson();
                                                },
                                                icon: <AlertCircle className="h-4 w-4" />,
                                                destructive: true,
                                            }] : []),
                                            ...(!isCompleted && !isCancelled ? [{
                                                label: 'Edit',
                                                href: `/sessions/${session.id}/edit`,
                                                icon: <Edit className="h-4 w-4" />,
                                            }] : []),
                                        ]}
                                    />
                                ) : null}
                            </div>
                        ) : null}
                    </div>
                </div>

                {isScheduledLocked ? (
                    <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm text-blue-700">
                        <p>Lesson is scheduled. Start stays locked until the allowed window opens.</p>
                        {startAvailabilityMessage ? (
                            <p className="mt-1">{startAvailabilityMessage}</p>
                        ) : null}
                    </div>
                ) : null}

                {midtermBreakPausesNormalStart ? (
                    <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm text-blue-700">
                        New normal teaching work resumes after the break.
                    </div>
                ) : isScheduledReady ? (
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

                {(!canCreateTeachingRecords || isCompleted) && showInternalRequestActions ? (
                    <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm text-blue-700">
                        <div className="flex flex-wrap gap-2">
                            {!canReschedule ? (
                                <ContextualApprovalRequestButton
                                    intent={{
                                        actionKey: 'SESSION_RESCHEDULE',
                                        title: `Request reschedule for ${session.title || session.subject_name}`,
                                        targetType: 'session',
                                        targetId: session.id,
                                        returnTo: sessionReturnTo,
                                        requestKey: buildContextualRequestKey(['session', session.id, 'reschedule']),
                                        referenceData: {
                                            contextual_action: 'reschedule',
                                            session_id: session.id,
                                            session_title: session.title || session.subject_name,
                                            session_date: session.session_date,
                                            start_time: session.start_time,
                                            end_time: session.end_time,
                                        },
                                    }}
                                >
                                    <Calendar className="h-4 w-4" />
                                    Ask admin to reschedule
                                </ContextualApprovalRequestButton>
                            ) : null}
                            {!isCancelled && !isCompleted ? (
                                <ContextualApprovalRequestButton
                                    intent={{
                                        actionKey: 'SESSION_RESCHEDULE',
                                        title: `Request cancellation for ${session.title || session.subject_name}`,
                                        targetType: 'session',
                                        targetId: session.id,
                                        returnTo: sessionReturnTo,
                                        requestKey: buildContextualRequestKey(['session', session.id, 'cancel']),
                                        referenceData: {
                                            contextual_action: 'cancel',
                                            session_id: session.id,
                                            session_title: session.title || session.subject_name,
                                        },
                                    }}
                                >
                                    <AlertCircle className="h-4 w-4" />
                                    Ask admin to cancel
                                </ContextualApprovalRequestButton>
                            ) : null}
                            {isCompleted ? (
                                <ContextualApprovalRequestButton
                                    intent={{
                                        actionKey: 'OTHER',
                                        title: `Request reopen completed lesson ${session.title || session.subject_name}`,
                                        targetType: 'session',
                                        targetId: session.id,
                                        returnTo: sessionReturnTo,
                                        requestKey: buildContextualRequestKey(['session', session.id, 'reopen-completed']),
                                        referenceData: {
                                            contextual_action: 'reopen_completed_session',
                                            session_id: session.id,
                                            session_title: session.title || session.subject_name,
                                        },
                                    }}
                                >
                                    Ask admin to reopen
                                </ContextualApprovalRequestButton>
                            ) : null}
                            <ContextualApprovalRequestButton
                                intent={{
                                    actionKey: 'RESOURCE_REQUEST',
                                    title: `Request attendance help for ${session.title || session.subject_name}`,
                                    targetType: 'session',
                                    targetId: session.id,
                                    returnTo: sessionReturnTo,
                                    requestKey: buildContextualRequestKey(['session', session.id, 'attendance-help']),
                                    referenceData: {
                                        contextual_action: 'attendance_correction_or_missing_learner',
                                        session_id: session.id,
                                        session_title: session.title || session.subject_name,
                                    },
                                }}
                            >
                                <ClipboardCheck className="h-4 w-4" />
                                Ask admin about attendance
                            </ContextualApprovalRequestButton>
                        </div>
                    </div>
                ) : null}

                {isInProgressOverdue ? (
                    <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                        <p>This lesson is still in progress past its scheduled end time.</p>
                        <p className="mt-1">
                            This lesson is still open. Finish the missing teaching record: attendance, taught outcomes, learner performance, and reflection. ScholaroScope will only close the lesson after the record is complete.
                        </p>
                    </div>
                ) : null}

                {isNotTaughtInterrupted ? (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
                        <p>This lesson was not taught.</p>
                        <p className="mt-1">Reschedule it to keep the lesson plan active.</p>
                    </div>
                ) : null}

                {isCancelled ? (
                    <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                        This lesson was cancelled.
                    </div>
                ) : null}
            </div>

            {transientWorkflowNotice ? (
                <ErrorBanner
                    message={transientWorkflowNotice.message}
                    variant={transientWorkflowNotice.variant}
                    autoDismissMs={4000}
                    onDismiss={() => setTransientWorkflowNotice(null)}
                />
            ) : null}

            {workflowError ? (
                <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                    {workflowError}
                </div>
            ) : null}

            {workflowNotice ? (
                <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm text-blue-700">
                    {workflowNotice}
                </div>
            ) : null}

            {workflowSuccess ? (
                <div className="flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-700">
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    {workflowSuccess}
                </div>
            ) : null}

            {!isHistorical ? (
                <Card className="theme-info-surface">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div className="space-y-2">
                            <h2 className="text-lg font-semibold theme-text">{currentActionTitle}</h2>
                            {isSupervisionOnlyWorkflow ? (
                                <div className="space-y-1 text-sm theme-muted">
                                    <p>
                                        <span className="font-medium theme-text">Current stage:</span> {supervisedStageLabel}
                                    </p>
                                    <p>{supervisionMissingMessage}</p>
                                    <p>{currentActionDescription}</p>
                                </div>
                            ) : (
                                <p className="text-sm theme-muted">{currentActionDescription}</p>
                            )}
                        </div>

                        {currentActionPrimary ? (
                            <div className="flex w-full flex-col gap-3 sm:w-auto sm:min-w-[220px]">
                                {'href' in currentActionPrimary && currentActionPrimary.href ? (
                                    <Link href={currentActionPrimary.href} className="w-full">
                                        <Button className="w-full">
                                            {currentActionPrimary.icon}
                                            {currentActionPrimary.label}
                                        </Button>
                                    </Link>
                                ) : (
                                    <Button
                                        className="w-full"
                                        onClick={currentActionPrimary.onClick}
                                        disabled={currentActionPrimary.disabled}
                                    >
                                        {currentActionPrimary.icon}
                                        {currentActionPrimary.label}
                                    </Button>
                                )}
                                {currentActionSecondary ? (
                                    <Button
                                        variant="secondary"
                                        className="w-full"
                                        onClick={currentActionSecondary.onClick}
                                    >
                                        {currentActionSecondary.label}
                                    </Button>
                                ) : null}
                            </div>
                        ) : null}
                    </div>
                </Card>
            ) : null}

            {learnerTaskForLesson ? (
                <div className={`rounded-xl border p-3 text-sm ${
                    highlightedAssignmentId === learnerTaskForLesson.id
                        ? 'border-blue-300 bg-blue-50 text-blue-700'
                        : 'border-blue-200 bg-blue-50 text-blue-700'
                }`}>
                    <span className="font-medium">
                        {preparedTaskWasIssued ? 'Learner task issued.' : 'Learner task prepared.'}
                    </span>{' '}
                    <span>
                        {isCompleted
                            ? 'It remains available from the assignment workspace and reports.'
                            : preparedTaskWasIssued
                                ? 'It is available in the assignment workspace.'
                                : 'It is ready to issue when the lesson is complete.'}
                    </span>
                    {showPreparedAssignmentScopeNote ? (
                        <p className="mt-2">
                            This learner task can include learners from all active classes linked to the source session.
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

            {sessionDetailExtensions.map((extension) => {
                const ExtensionComponent = extension.Component;
                return (
                    <ExtensionComponent
                        key={extension.key}
                        {...sessionDetailExtensionContext}
                        onSessionDataChanged={async () => {
                            await Promise.all([refetch(), refetchClosureState()]);
                        }}
                    />
                );
            })}

            {hasLessonPlan ? (
                <CollapsibleSection
                    sectionId="lesson-preparation-section"
                    title={isInstructor ? 'Lesson preparation' : 'Lesson plan'}
                    summary={lessonPreparationSummary}
                    badge={session.lesson_plan_status ? <Badge variant="blue">{session.lesson_plan_status}</Badge> : <Badge variant="default">{curriculumLabel}</Badge>}
                    open={lessonPreparationOpen}
                    onToggle={toggleLessonPreparationOpen}
                >
                    <div className="space-y-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div className="min-w-0">
                                <p className="text-sm text-gray-600">
                                    The outcomes below come from the lesson plan prepared before this lesson was scheduled.
                                </p>
                                <div className={`mt-3 rounded-lg border px-3 py-2 text-sm ${
                                    preparedTaskDraft
                                        ? 'border-blue-200 bg-blue-50 text-blue-800'
                                        : issuedPreparedTask
                                            ? 'border-green-200 bg-green-50 text-green-800'
                                            : 'border-gray-200 bg-gray-50 text-gray-600'
                                }`}>
                                    {preparedTaskDraft
                                        ? 'Learner task prepared'
                                        : issuedPreparedTask
                                            ? 'Learner task already issued'
                                            : 'No learner task prepared'}
                                </div>
                            </div>

                            {!currentActionShowsLessonPreparation ? (
                                <Link href={`/lesson-plans/${session.lesson_plan_id}`} className="w-full shrink-0 sm:w-auto">
                                    <Button variant="secondary" size="sm" className="w-full sm:w-auto">
                                        <BookOpen className="mr-1.5 h-4 w-4" />
                                        {isInstructor ? 'View lesson preparation' : 'View lesson plan'}
                                    </Button>
                                </Link>
                            ) : null}
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
                </CollapsibleSection>
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

            <CollapsibleSection
                sectionId="workflow-section"
                title={isInstructor ? 'Teaching checklist' : 'Lesson workflow'}
                summary={checklistSummary}
                badge={<Badge variant="blue">{curriculumLabel}</Badge>}
                open={checklistOpen}
                onToggle={toggleChecklistOpen}
            >
                <div className="space-y-4">
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
            </CollapsibleSection>

            {!isHistorical && currentWorkflowStep === 'complete' ? (
                <div id="lesson-complete-section">
                    <div className="space-y-4">
                        <Card>
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                <div className="space-y-2">
                                    <h2 className="text-lg font-semibold text-gray-900">
                                        Lesson closure
                                    </h2>
                                    <p className="text-sm text-gray-600">
                                        {closureNextStep === 'ATTENDANCE'
                                            ? 'Attendance is still missing. Review attendance to continue.'
                                            : closureNextStep === 'TAUGHT_OUTCOMES'
                                                ? 'What was taught is still missing. Confirm the taught outcomes to continue.'
                                                : closureNextStep === 'INTERRUPTED'
                                                    ? 'This lesson was not taught. Reschedule it to keep the lesson plan active, or cancel it if it will not run.'
                                                : closureNextStep === 'EVIDENCE'
                                                    ? (closureTeachingWorkflowHref || isClosureEvidenceWorkflowPending
                                                        ? closureEvidenceMessage
                                                        : 'Learner performance is required, but no curriculum evidence workflow is available for this lesson.')
                                                    : closureNextStep === 'REFLECTION'
                                                        ? 'Add the required lesson reflection. If you lose your place, re-check lesson closure to reopen the current step.'
                                                        : 'All required teaching records are complete. Close the lesson record now.'}
                                    </p>
                                    {currentActionPrimary ? (
                                        <div className="flex flex-col gap-2 pt-1 sm:flex-row">
                                            {'href' in currentActionPrimary && currentActionPrimary.href ? (
                                                <Link href={currentActionPrimary.href}>
                                                    <Button size="sm">
                                                        {currentActionPrimary.icon}
                                                        {currentActionPrimary.label}
                                                    </Button>
                                                </Link>
                                            ) : (
                                                <Button
                                                    size="sm"
                                                    onClick={currentActionPrimary.onClick}
                                                    disabled={currentActionPrimary.disabled}
                                                >
                                                    {currentActionPrimary.icon}
                                                    {currentActionPrimary.label}
                                                </Button>
                                            )}
                                            {currentActionSecondary ? (
                                                <Button
                                                    size="sm"
                                                    variant="secondary"
                                                    onClick={currentActionSecondary.onClick}
                                                >
                                                    {currentActionSecondary.label}
                                                </Button>
                                            ) : null}
                                        </div>
                                    ) : null}
                                </div>
                                {showPreparedTaskIssueAction ? (
                                    <ActionMenu
                                        items={[
                                            {
                                                label: issuingPreparedTask ? 'Issuing...' : 'Issue prepared task',
                                                onSelect: () => {
                                                    void handleIssuePreparedTask();
                                                },
                                                disabled: issuingPreparedTask,
                                                icon: <FilePlus2 className="h-4 w-4" />,
                                            },
                                            ...(canCreateTeachingRecords && preparedTaskDraft ? [{
                                                label: 'Open learner task',
                                                href: `/academic/cohorts/${preparedTaskDraft.cohort_id}/assignments/${preparedTaskDraft.id}?${new URLSearchParams({
                                                    returnTo: lessonTaskReturnTo,
                                                }).toString()}`,
                                                icon: <FilePlus2 className="h-4 w-4" />,
                                            }] : []),
                                        ]}
                                    />
                                ) : null}
                            </div>
                        </Card>

                        {requiresClosureReflection && canAdvanceTeachingWorkflow ? (
                            <div id="lesson-reflection-section">
                                <LessonReflectionCard
                                    sessionId={session.id}
                                    source="SESSION_COMPLETION"
                                    metadata={{
                                        confirmed_outcome_ids: confirmedTaughtOutcomes.map((outcome) => outcome.outcome_id),
                                        confirmed_outcome_count: confirmedTaughtOutcomes.length,
                                    }}
                                    title="Add lesson reflection"
                                    description="Add the lesson reflection required before this lesson record can be closed."
                                    onSaved={() => {
                                        void handleReflectionSaved();
                                    }}
                                />
                            </div>
                        ) : null}
                    </div>
                </div>
            ) : null}

            {currentWorkflowStep === 'post_lesson' ? (
                <div id="post-lesson-section">
                <Card>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <h2 className="text-lg font-semibold text-gray-900">Post-lesson summary</h2>
                            <p className="text-sm text-gray-600">
                                This lesson is complete. Evidence is locked here, and existing assignments remain available from the assignment workspace and reports.
                            </p>
                        </div>

                        {showPostLessonAssignmentActions && preparedTaskDraft && !skipPreparedTaskPrompt ? (
                            <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
                                <div className="font-medium">Prepared task was not issued.</div>
                                <div className="mt-1">
                                    Issue it now, or leave it in draft and return later.
                                </div>
                            </div>
                        ) : null}

                        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                            <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-600">
                                {isCompleted
                                    ? 'This lesson is completed. New learner performance cannot be recorded from the lesson workspace.'
                                    : !hasMarkedAttendance || !hasConfirmedTaughtOutcomes
                                        ? 'Learner performance opens after attendance and taught outcomes are confirmed.'
                                        : taughtOutcomeCount === 0
                                            ? 'No outcomes were marked as taught for this lesson yet.'
                                            : 'No curriculum evidence workflow is available for this lesson.'}
                            </div>

                            {hasLessonPlan ? (
                                <Link href={`/lesson-plans/${session.lesson_plan_id}`}>
                                    <Button variant="secondary" size="sm">
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

            {!isScheduled && !isCancelled ? (
                <AttendanceStatsStrip stats={attendanceStats} />
            ) : null}

            {showAttendanceSection ? (
                <CollapsibleSection
                    sectionId="attendance-section"
                    title={attendanceSectionTitle}
                    summary={attendanceSectionSummary}
                    open={attendanceOpen}
                    onToggle={toggleAttendanceOpen}
                >
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
                            const result = await continueSessionClosureWorkflow('attendance_saved');
                            if (!result?.closureState) {
                                setWorkflowSuccess(
                                    isInstructor
                                        ? 'Attendance saved. The lesson workspace refreshed, but the next required step could not be resolved automatically.'
                                        : 'Attendance updated.'
                                );
                                return;
                            }

                            setWorkflowSuccess(
                                isInstructor
                                    ? (
                                        result.closureState.next_step === 'TAUGHT_OUTCOMES'
                                            ? 'Attendance saved. Next step: confirm what was taught.'
                                            : result.closureState.next_step === 'EVIDENCE'
                                                ? 'Attendance saved. Continue with the current learner performance step.'
                                                : result.closureState.next_step === 'REFLECTION'
                                                    ? 'Attendance saved. Continue with the lesson reflection.'
                                                    : result.closureState.next_step === 'READY'
                                                        ? 'Attendance saved. Continue with lesson completion.'
                                                        : 'Attendance saved.'
                                    )
                                    : 'Attendance updated.'
                            );
                        }}
                        onDismissError={dismissError}
                        learnerHrefBuilder={buildAttendanceLearnerHref}
                    />
                </CollapsibleSection>
            ) : null}

            {showTaughtOutcomesSection ? (
                <CollapsibleSection
                    sectionId="taught-outcomes-section"
                    title="Confirm what was taught"
                    summary={taughtOutcomesSectionSummary}
                    open={taughtOutcomesOpen}
                    onToggle={toggleTaughtOutcomesOpen}
                >
                    <div className="space-y-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <p className="text-sm text-gray-600">
                                Use the planned outcomes from the lesson plan. Do not add new outcomes here.
                            </p>
                            <div className="flex flex-wrap gap-2">
                                {!isCompleted ? (
                                    <Button variant="secondary" size="sm" onClick={revealAttendanceSection}>
                                        <ClipboardCheck className="mr-1.5 h-4 w-4" />
                                        Review attendance
                                    </Button>
                                ) : null}
                                {!isCompleted ? (
                                    <Button
                                        size="sm"
                                        onClick={handleConfirmWhatWasTaught}
                                        disabled={!canConfirmTaughtOutcomes}
                                    >
                                        {confirmingTaughtOutcomes ? 'Saving...' : confirmTaughtOutcomesLabel}
                                    </Button>
                                ) : null}
                            </div>
                        </div>

                        {taughtOutcomesSelectionMessage ? (
                            <div className="rounded-lg border px-3 py-2 text-sm theme-border theme-surface-muted theme-muted">
                                {taughtOutcomesSelectionMessage}
                            </div>
                        ) : null}

                        {allPlannedOutcomesNotTaught && !hasConfirmedTaughtOutcomes ? (
                            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
                                All planned outcomes are marked as not taught. This lesson will move to reschedule or cancel instead of normal closure.
                            </div>
                        ) : null}

                        {confirmedTaughtOutcomes.length > 0 ? (
                            <div className="rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-700">
                                {isNotTaughtInterrupted
                                    ? 'This lesson was marked as not taught.'
                                    : 'What was taught has been saved for this lesson.'}
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
                                            <button
                                                key={`${outcome.outcome_id}-${option.value}`}
                                                type="button"
                                                disabled={!canEditTaughtOutcomes}
                                                aria-pressed={taughtSelections[outcome.outcome_id] === option.value}
                                                onClick={() => handleTaughtSelectionChange(outcome.outcome_id, option.value)}
                                                className={`theme-focus-ring rounded-lg border p-3 text-left text-sm transition-colors ${
                                                    taughtSelections[outcome.outcome_id] === option.value
                                                        ? 'border-blue-500 theme-surface-elevated'
                                                        : 'theme-border theme-hover-surface'
                                                } ${!canEditTaughtOutcomes ? 'cursor-not-allowed opacity-60' : ''}`}
                                            >
                                                <div className="font-medium theme-text">{option.label}</div>
                                                <div className="mt-1 text-xs theme-muted">{option.description}</div>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </CollapsibleSection>
            ) : null}

            {showParticipatingCohorts ? (
                <ParticipatingCohorts
                    sessionId={sessionId}
                    isHistorical={isHistorical}
                    canManageLinks={canCreateTeachingRecords && !isHistorical && !isCompleted && !isCancelled}
                    lockedReason={participatingCohortsLockedReason}
                    onParticipationChanged={handleParticipationChanged}
                    primaryCohort={{
                        id: session.cohort_id,
                        name: session.cohort_name,
                        level: session.cohort_level,
                    }}
                />
            ) : null}

            <RescheduleLessonModal
                isOpen={showRescheduleModal}
                session={session}
                onClose={() => setShowRescheduleModal(false)}
                onSubmit={handleRescheduleLesson}
            />
        </div>
    );
}
