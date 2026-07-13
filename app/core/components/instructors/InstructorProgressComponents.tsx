'use client';

// ============================================================================
// app/core/components/instructors/InstructorProgressComponents.tsx
//
// Supporting components for the instructor detail page.
// No any. Typed props.
// ============================================================================

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
    BookOpen,
    Calendar,
    ChevronDown,
    ChevronRight,
    FileText,
    GraduationCap,
    TrendingUp,
} from 'lucide-react';
import { Badge } from '@/app/components/ui/Badge';
import { Button } from '@/app/components/ui/Button';
import { isSafeNextPath } from '@/app/core/auth/navigation';
import type { TeachingAssignment } from '@/app/core/types/academic';
import type { Session } from '@/app/core/types/session';

// ── SessionCohortGroup ────────────────────────────────────────────────────

interface SessionGroup {
    cohortId: number;
    cohortName: string;
    sessions: Session[];
}

export interface PlanningReviewScope {
    startDate: string;
    endDate: string;
    termId?: number;
    subjectId?: number;
    cohortId?: number;
}

function buildSessionDetailHref(sessionId: number, returnTo?: string) {
    if (!isSafeNextPath(returnTo)) {
        return `/sessions/${sessionId}`;
    }

    const params = new URLSearchParams({ returnTo });
    return `/sessions/${sessionId}?${params.toString()}`;
}

function buildLessonPlanDetailHref(lessonPlanId: number, returnTo?: string) {
    if (!isSafeNextPath(returnTo)) {
        return `/lesson-plans/${lessonPlanId}`;
    }

    const params = new URLSearchParams({ returnTo });
    return `/lesson-plans/${lessonPlanId}?${params.toString()}`;
}

function buildCbcProgressHref(assignment: TeachingAssignment, instructorId: number, returnTo?: string) {
    const params = new URLSearchParams({
        subject: String(assignment.subject_id),
        instructor_id: String(instructorId),
    });

    const cohortSubjectId =
        assignment.cohort_subject_id
        ?? assignment.cbc_cohort_subject_id
        ?? assignment.teaching_link_id
        ?? null;
    if (typeof cohortSubjectId === 'number' && Number.isFinite(cohortSubjectId)) {
        params.set('cohort_subject_id', String(cohortSubjectId));
    }

    if (isSafeNextPath(returnTo)) {
        params.set('returnTo', returnTo);
    }

    return `/cbc/progress/cohort/${assignment.cohort_id}?${params.toString()}`;
}

function attendanceVariant(rate: number): 'success' | 'blue' | 'yellow' | 'default' {
    if (rate >= 80) return 'success';
    if (rate >= 60) return 'blue';
    if (rate > 0) return 'yellow';
    return 'default';
}

type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'default' | 'blue' | 'green' | 'yellow' | 'red' | 'maroon' | 'purple' | 'indigo' | 'orange';

const PLAN_STATUS_LABELS: Record<string, string> = {
    DRAFT: 'Draft',
    GENERATED: 'Generated',
    REVIEWED: 'Reviewed',
    SCHEDULED: 'Scheduled',
    USED: 'Used',
    ARCHIVED: 'Archived',
};

function getSessionLifecycleStatus(session: Session) {
    if (session.workflow_summary?.lifecycle_status) {
        return session.workflow_summary.lifecycle_status;
    }
    if (session.status === 'CANCELLED') return 'CANCELLED';
    if (session.status === 'COMPLETED') return 'COMPLETED';
    if (session.needs_completion) return 'NEEDS_COMPLETION';
    if (session.status === 'IN_PROGRESS') return 'IN_PROGRESS';
    if (session.status === 'SCHEDULED') return 'SCHEDULED';
    return 'REQUIRES_REVIEW';
}

export function getSessionWorkflowOrderingPriority(session: Session) {
    const status = getSessionLifecycleStatus(session);
    if (status === 'NEEDS_COMPLETION') return 0;
    if (status === 'READY') return 1;
    if (status === 'IN_PROGRESS') return 2;
    if (status === 'REQUIRES_REVIEW') return 3;
    if (status === 'SCHEDULED' || status === 'READY_TO_START') return 4;
    if (status === 'COMPLETED') return 5;
    if (status === 'CANCELLED') return 6;
    return 3;
}

function lifecycleBadgeVariant(status: string): BadgeVariant {
    if (status === 'NEEDS_COMPLETION' || status === 'REQUIRES_REVIEW') return 'orange';
    if (status === 'READY') return 'blue';
    if (status === 'IN_PROGRESS') return 'yellow';
    if (status === 'COMPLETED') return 'green';
    if (status === 'CANCELLED') return 'red';
    return 'default';
}

function getLifecycleLabel(session: Session) {
    return session.workflow_summary?.lifecycle_label ?? getSessionLifecycleStatus(session).replaceAll('_', ' ').toLowerCase();
}

function formatPlanStatus(status: string | null) {
    if (!status) return 'Linked';
    return PLAN_STATUS_LABELS[status] ?? status.replaceAll('_', ' ').toLowerCase().replace(/\b\w/g, char => char.toUpperCase());
}

function getLessonPlanStatusLabel(session: Session) {
    if (session.lesson_plan_id === null) {
        return 'Lesson plan missing';
    }
    return `Plan: ${formatPlanStatus(session.lesson_plan_status)}`;
}

function lessonPlanBadgeVariant(session: Session): BadgeVariant {
    if (session.lesson_plan_id === null) {
        return session.status === 'CANCELLED' ? 'default' : 'warning';
    }
    if (session.lesson_plan_status === 'USED' || session.lesson_plan_status === 'SCHEDULED') return 'success';
    if (session.lesson_plan_status === 'REVIEWED' || session.lesson_plan_status === 'GENERATED') return 'blue';
    if (session.lesson_plan_status === 'DRAFT') return 'yellow';
    return 'default';
}

function normalizeDateValue(value: string | null | undefined) {
    return value ? value.slice(0, 10) : '';
}

export function sessionMatchesPlanningReviewScope(session: Session, scope: PlanningReviewScope) {
    const sessionDate = normalizeDateValue(session.session_date);
    if (!sessionDate || sessionDate < scope.startDate || sessionDate > scope.endDate) {
        return false;
    }
    if (scope.termId && session.term !== scope.termId) {
        return false;
    }
    if (scope.subjectId && session.subject_id !== scope.subjectId) {
        return false;
    }
    if (scope.cohortId && session.cohort_id !== scope.cohortId) {
        return false;
    }
    return true;
}

export function sessionNeedsPlanningAttention(session: Session, scope?: PlanningReviewScope) {
    if (session.status === 'CANCELLED') {
        return false;
    }
    if (scope && !sessionMatchesPlanningReviewScope(session, scope)) {
        return false;
    }
    return session.lesson_plan_id === null;
}

function pluralize(count: number, singular: string, plural = `${singular}s`) {
    return `${count} ${count === 1 ? singular : plural}`;
}

export function summarizeSessionGroupStatus(sessions: Session[]) {
    const counts = sessions.reduce<Record<string, number>>((acc, session) => {
        const status = getSessionLifecycleStatus(session);
        acc[status] = (acc[status] ?? 0) + 1;
        return acc;
    }, {});

    const parts = [
        counts.NEEDS_COMPLETION ? `${counts.NEEDS_COMPLETION} ${counts.NEEDS_COMPLETION === 1 ? 'needs' : 'need'} completion` : null,
        counts.READY ? `${counts.READY} ready to close` : null,
        counts.IN_PROGRESS ? `${counts.IN_PROGRESS} in progress` : null,
        counts.REQUIRES_REVIEW ? `${counts.REQUIRES_REVIEW} ${counts.REQUIRES_REVIEW === 1 ? 'requires' : 'require'} review` : null,
        counts.READY_TO_START ? `${counts.READY_TO_START} ready to start` : null,
        counts.SCHEDULED ? `${counts.SCHEDULED} scheduled` : null,
        counts.COMPLETED ? `${counts.COMPLETED} completed` : null,
        counts.CANCELLED ? `${counts.CANCELLED} cancelled` : null,
    ].filter(Boolean);

    return parts.length > 0 ? parts.join(' · ') : pluralize(sessions.length, 'session');
}

function formatAttendanceSummary(session: Session) {
    const total = session.attendance_count?.total ?? 0;
    const present = session.attendance_count?.present ?? 0;
    const unmarked = session.attendance_count?.unmarked ?? 0;
    const marked = Math.max(0, total - unmarked);
    const rate = total > 0 ? Math.round((present / total) * 100) : 0;

    return {
        rate,
        label: total > 0 ? `${marked}/${total} marked · ${rate}% present` : 'No attendance records',
    };
}

function formatMissingRecords(session: Session) {
    const labels = session.workflow_summary?.missing_labels ?? [];
    return labels.length > 0 ? labels.join(' · ') : 'No required records missing';
}

function formatActionOwner(session: Session) {
    const summary = session.workflow_summary;
    if (!summary || summary.action_owner === 'NONE') {
        return 'No open action';
    }
    if (summary.stage === 'REQUIRES_REVIEW') {
        return 'Review required';
    }
    return summary.needs_teacher_action ? 'Teacher action required' : 'Teacher owns next action';
}

function teachingSourceLabel(assignment: TeachingAssignment) {
    if (assignment.source?.trim()) {
        return assignment.source.trim().toUpperCase();
    }

    if (assignment.subject_source?.trim()) {
        return assignment.subject_source.trim().toUpperCase();
    }

    return assignment.curriculum_name ?? assignment.curriculum_type;
}

function SessionCohortGroup({
    group,
    returnTo,
    planningReviewScope,
    defaultOpen = false,
    scopeKey,
}: {
    group: SessionGroup;
    returnTo?: string;
    planningReviewScope?: PlanningReviewScope;
    defaultOpen?: boolean;
    scopeKey?: string;
}) {
    const [open, setOpen] = useState(defaultOpen);
    const [page, setPage] = useState(1);
    const pageSize = 10;
    const totalPages = Math.ceil(group.sessions.length / pageSize);
    const paginated = group.sessions.slice((page - 1) * pageSize, page * pageSize);

    useEffect(() => {
        setPage(1);
    }, [group.cohortId, group.sessions.length, scopeKey]);

    useEffect(() => {
        if (defaultOpen) {
            setOpen(true);
        }
    }, [defaultOpen, scopeKey]);

    return (
        <div className="overflow-hidden rounded-xl border border-gray-200">
            <button
                type="button"
                onClick={() => setOpen(v => !v)}
                className="flex w-full items-start gap-3 bg-white px-4 py-3 text-left transition-colors hover:bg-gray-50"
            >
                {open
                    ? <ChevronDown className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
                    : <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
                }
                <span className="min-w-0 flex-1">
                    <span className="block font-semibold text-gray-900 break-words">
                        {group.cohortName}
                    </span>
                    <span className="mt-1 block text-xs text-gray-500">
                        {summarizeSessionGroupStatus(group.sessions)}
                    </span>
                </span>
                <Badge variant="info" size="sm" className="ml-auto shrink-0">
                    {group.sessions.length} session{group.sessions.length !== 1 ? 's' : ''}
                </Badge>
            </button>

            {open && (
                <div className="border-t border-gray-100">
                    <div>
                        <div className="divide-y divide-gray-100">
                            {paginated.map(session => {
                                const attendance = formatAttendanceSummary(session);
                                const lifecycleStatus = getSessionLifecycleStatus(session);
                                const workflowStage = session.workflow_summary?.stage_label ?? 'Review lesson record';
                                const needsPlanningAttention = sessionNeedsPlanningAttention(session, planningReviewScope);
                                return (
                                    <div
                                        key={session.id}
                                        className={`flex flex-col gap-3 px-4 py-4 transition-colors lg:flex-row lg:items-start lg:justify-between ${needsPlanningAttention
                                            ? 'border-l-4 border-amber-400 bg-amber-50/50 hover:bg-amber-50'
                                            : 'hover:bg-gray-50'
                                            }`}
                                    >
                                        <div className="min-w-0 flex-1 space-y-2">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <Badge variant={lifecycleBadgeVariant(lifecycleStatus)} size="sm">
                                                    {getLifecycleLabel(session)}
                                                </Badge>
                                                <Badge variant={attendanceVariant(attendance.rate)} size="sm">
                                                    Attendance: {attendance.label}
                                                </Badge>
                                            </div>
                                            <div className="flex flex-wrap items-center gap-2">
                                                <Badge variant={lessonPlanBadgeVariant(session)} size="sm">
                                                    {getLessonPlanStatusLabel(session)}
                                                </Badge>
                                                {needsPlanningAttention ? (
                                                    <Badge variant="orange" size="sm">
                                                        Planning attention
                                                    </Badge>
                                                ) : null}
                                            </div>
                                            <div>
                                                <p className="text-sm font-semibold text-gray-900 break-words">
                                                    {session.title || session.subject_name || 'Untitled lesson'}
                                                </p>
                                                <p className="mt-1 text-xs text-gray-500 break-words">
                                                    {session.subject_name || 'Subject not set'} · {new Date(session.session_date).toLocaleDateString('en-GB', {
                                                        day: '2-digit',
                                                        month: 'short',
                                                        year: 'numeric',
                                                    })}
                                                </p>
                                            </div>
                                            <div className="grid gap-1 text-xs text-gray-600 md:grid-cols-3">
                                                <p><span className="font-medium text-gray-700">Current stage:</span> {workflowStage}</p>
                                                <p><span className="font-medium text-gray-700">Missing:</span> {formatMissingRecords(session)}</p>
                                                <p><span className="font-medium text-gray-700">Action owner:</span> {formatActionOwner(session)}</p>
                                            </div>
                                        </div>
                                        <div className="flex shrink-0 flex-col gap-2 sm:flex-row lg:flex-col xl:flex-row">
                                            <Link href={buildSessionDetailHref(session.id, returnTo)}>
                                                <Button size="sm" variant="secondary" className="w-full lg:w-auto">
                                                    <BookOpen className="mr-1.5 h-3.5 w-3.5" />
                                                    Open lesson
                                                </Button>
                                            </Link>
                                            {session.lesson_plan_id !== null ? (
                                                <Link href={buildLessonPlanDetailHref(session.lesson_plan_id, returnTo)}>
                                                    <Button size="sm" variant="ghost" className="w-full lg:w-auto">
                                                        <FileText className="mr-1.5 h-3.5 w-3.5" />
                                                        View plan
                                                    </Button>
                                                </Link>
                                            ) : null}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {totalPages > 1 && (
                            <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 bg-gray-50">
                                <span className="text-xs text-gray-500">Page {page} of {totalPages}</span>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setPage(p => Math.max(1, p - 1))}
                                        disabled={page === 1}
                                        className="px-3 py-1 text-xs rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-white transition-colors"
                                    >Prev</button>
                                    <button
                                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                        disabled={page === totalPages}
                                        className="px-3 py-1 text-xs rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-white transition-colors"
                                    >Next</button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

// ── GroupedSessions ───────────────────────────────────────────────────────

interface GroupedSessionsProps {
    sessions: Session[];
    returnTo?: string;
    planningReviewScope?: PlanningReviewScope;
}

function buildPlanningReviewScopeKey(scope?: PlanningReviewScope) {
    if (!scope) return undefined;
    return [
        scope.startDate,
        scope.endDate,
        scope.termId ?? '',
        scope.subjectId ?? '',
        scope.cohortId ?? '',
    ].join(':');
}

export function GroupedSessions({ sessions, returnTo, planningReviewScope }: GroupedSessionsProps) {
    const scopedSessions = useMemo(() => {
        if (!planningReviewScope) {
            return sessions;
        }
        return sessions.filter(session => sessionMatchesPlanningReviewScope(session, planningReviewScope));
    }, [planningReviewScope, sessions]);
    const scopeKey = buildPlanningReviewScopeKey(planningReviewScope);
    const groups = useMemo<SessionGroup[]>(() => {
        const map = new Map<number, SessionGroup>();
        scopedSessions.forEach(s => {
            const cohortId = s.cohort_id ?? 0;
            const cohortName = s.cohort_name ?? 'Unknown Cohort';
            if (!map.has(cohortId)) {
                map.set(cohortId, { cohortId, cohortName, sessions: [] });
            }
            map.get(cohortId)!.sessions.push(s);
        });
        map.forEach(g => g.sessions.sort((a, b) => {
            if (planningReviewScope) {
                const planningDelta = Number(sessionNeedsPlanningAttention(b, planningReviewScope)) - Number(sessionNeedsPlanningAttention(a, planningReviewScope));
                if (planningDelta !== 0) {
                    return planningDelta;
                }
            }
            const priorityDelta = getSessionWorkflowOrderingPriority(a) - getSessionWorkflowOrderingPriority(b);
            if (priorityDelta !== 0) {
                return priorityDelta;
            }
            return new Date(b.session_date).getTime() - new Date(a.session_date).getTime();
        }));
        return Array.from(map.values()).sort((a, b) => {
            if (planningReviewScope) {
                const attentionDelta = Number(b.sessions.some(session => sessionNeedsPlanningAttention(session, planningReviewScope))) - Number(a.sessions.some(session => sessionNeedsPlanningAttention(session, planningReviewScope)));
                if (attentionDelta !== 0) {
                    return attentionDelta;
                }
            }
            return a.cohortName.localeCompare(b.cohortName);
        });
    }, [planningReviewScope, scopedSessions]);
    const defaultOpenGroupId = useMemo(() => {
        if (!planningReviewScope) {
            return null;
        }
        const attentionGroup = groups.find(group => group.sessions.some(session => sessionNeedsPlanningAttention(session, planningReviewScope)));
        return (attentionGroup ?? groups[0])?.cohortId ?? null;
    }, [groups, planningReviewScope]);

    if (scopedSessions.length === 0) return (
        <div className="py-10 text-center border border-dashed border-gray-200 rounded-xl">
            <Calendar className="h-8 w-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500">No sessions recorded yet</p>
        </div>
    );

    return (
        <div className="space-y-3">
            {groups.map(group => (
                <SessionCohortGroup
                    key={group.cohortId}
                    group={group}
                    returnTo={returnTo}
                    planningReviewScope={planningReviewScope}
                    defaultOpen={group.cohortId === defaultOpenGroupId}
                    scopeKey={scopeKey}
                />
            ))}
        </div>
    );
}

interface TeachingAssignmentsListProps {
    assignments: TeachingAssignment[];
}

export function TeachingAssignmentsList({ assignments }: TeachingAssignmentsListProps) {
    if (assignments.length === 0) {
        return null;
    }

    return (
        <div className="grid gap-3 lg:grid-cols-2">
            {assignments.map((assignment) => (
                <div
                    key={`${assignment.cohort_id}-${assignment.subject_id}-${assignment.academic_year}-${teachingSourceLabel(assignment)}`}
                    className="rounded-xl border border-blue-100 bg-blue-50/60 p-4"
                >
                    <div className="flex items-start gap-3">
                        <div className="rounded-xl bg-white p-2 text-blue-600 shadow-sm">
                            <GraduationCap className="h-5 w-5" />
                        </div>
                        <div className="min-w-0 flex-1 space-y-2">
                            <div className="flex flex-wrap items-center gap-2">
                                <Badge variant="info" size="sm">
                                    {assignment.cohort_name}
                                </Badge>
                                {assignment.subject_code ? (
                                    <Badge variant="default" size="sm">
                                        {assignment.subject_code}
                                    </Badge>
                                ) : null}
                            </div>
                            <p className="text-sm font-semibold text-gray-900 break-words">
                                {assignment.subject_name}
                            </p>
                            <div className="grid gap-2 text-xs text-gray-600 sm:grid-cols-3">
                                <div>
                                    <p className="font-semibold uppercase tracking-wide text-gray-500">Academic Year</p>
                                    <p className="mt-1 break-words">{assignment.academic_year}</p>
                                </div>
                                <div>
                                    <p className="font-semibold uppercase tracking-wide text-gray-500">Curriculum</p>
                                    <p className="mt-1 break-words">{assignment.curriculum_name ?? assignment.curriculum_type}</p>
                                </div>
                                <div>
                                    <p className="font-semibold uppercase tracking-wide text-gray-500">Source</p>
                                    <p className="mt-1 break-words">{teachingSourceLabel(assignment)}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}

interface CbcProgressAssignmentsProps {
    assignments: TeachingAssignment[];
    instructorId: number;
    returnTo?: string;
}

export function CbcProgressAssignments({
    assignments,
    instructorId,
    returnTo,
}: CbcProgressAssignmentsProps) {
    return (
        <div className="grid gap-3 xl:grid-cols-2">
            {assignments.map((assignment) => (
                <div
                    key={`${assignment.cohort_id}-${assignment.subject_id}-${assignment.academic_year}`}
                    className="rounded-xl border border-gray-200 bg-white p-4"
                >
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                        <div className="min-w-0 space-y-2">
                            <div className="flex flex-wrap items-center gap-2">
                                <Badge variant="purple" size="sm">
                                    {assignment.cohort_name}
                                </Badge>
                                {assignment.subject_code ? (
                                    <Badge variant="default" size="sm">
                                        {assignment.subject_code}
                                    </Badge>
                                ) : null}
                            </div>
                            <p className="text-sm font-semibold text-gray-900 break-words">
                                {assignment.subject_name}
                            </p>
                            <div className="grid gap-2 text-xs text-gray-600 sm:grid-cols-3">
                                <div>
                                    <p className="font-semibold uppercase tracking-wide text-gray-500">Academic Year</p>
                                    <p className="mt-1 break-words">{assignment.academic_year}</p>
                                </div>
                                <div>
                                    <p className="font-semibold uppercase tracking-wide text-gray-500">Curriculum</p>
                                    <p className="mt-1 break-words">{assignment.curriculum_name ?? assignment.curriculum_type}</p>
                                </div>
                                <div>
                                    <p className="font-semibold uppercase tracking-wide text-gray-500">Source</p>
                                    <p className="mt-1 break-words">{teachingSourceLabel(assignment)}</p>
                                </div>
                            </div>
                        </div>
                        <Link
                            href={buildCbcProgressHref(assignment, instructorId, returnTo)}
                            className="w-full lg:w-auto"
                        >
                            <Button size="sm" variant="ghost" className="w-full lg:w-auto">
                                <TrendingUp className="mr-1 h-3.5 w-3.5" />
                                View Progress
                            </Button>
                        </Link>
                    </div>
                </div>
            ))}
        </div>
    );
}
