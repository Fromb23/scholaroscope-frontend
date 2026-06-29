// ============================================================================
// app/core/hooks/useInstructorDashboard.ts
//
// Owns all instructor dashboard data fetching, metric computation,
// alert generation, and auto-refresh. No logic in the page.
// ============================================================================

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useStudents } from '@/app/core/hooks/useStudents';
import { useTodaySessions } from '@/app/core/hooks/useSessions';
import {
    useAssessments,
    useAssessmentReviewSummary,
    useAssessmentScores,
} from '@/app/core/hooks/useAssessments';
import { useAssignmentTeachingToday } from '@/app/core/hooks/useAssignments';
import { useCurrentTerm, useCurrentAcademicYear } from '@/app/core/hooks/useAcademic';
import { useInstructorAttendanceRisk } from '@/app/core/hooks/useInstructorAttendanceRisk';
import type { Session } from '@/app/core/types/session';
import type {
    AssessmentReviewSummary,
    AssessmentScore,
    AssessmentScoreStatus,
} from '@/app/core/types/assessment';
import type {
    TeachingAssignment,
    HistoryEntry,
    TeachingCohortSummary,
} from '@/app/core/types/academic';
import type { DashboardAlert } from './useAdminDashboard';
import { globalUsersAPI } from '../api/globalUsers';

// ── Types ─────────────────────────────────────────────────────────────────

export interface InstructorMetrics {
    students: {
        total: number;
        active: number;
    };
    attendance: {
        todayRate: number;
        riskCount: number;
        riskLearnerCount: number;
    };
    assessments: {
        needsGrading: number;
        reviewExemptCount: number;
        upcoming: number;
    };
    sessions: {
        today: number;
        upcoming: number;
    };
    performance: {
        averageScore: number;
        needsSupport: number;
    };
}

// ── Helpers ───────────────────────────────────────────────────────────────

function computeInstructorMetrics(
    students: { id: number; status?: string }[],
    assessments: { assessment_date?: string | null }[],
    scores: {
        score?: number | null;
        rubric_level?: number | null;
        status?: AssessmentScoreStatus;
        assessment?: unknown;
    }[],
    reviewSummary: AssessmentReviewSummary | null,
    sessions: Session[],
    attendanceRiskCount: number,
    attendanceRiskLearnerCount: number,
): InstructorMetrics {
    const now = new Date();
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const activeStudents = students.filter(s => s.status === 'ACTIVE');

    const fallbackNeedsGrading = scores.filter((score) => (
        score.score == null
        && score.rubric_level == null
        && (
            score.status === 'PENDING_REVIEW'
            || score.status == null
        )
    )).length;
    const needsGrading = reviewSummary?.pending_review_count ?? fallbackNeedsGrading;
    const reviewExemptCount = reviewSummary
        ? (
            reviewSummary.absent_count
            + reviewSummary.excused_count
            + reviewSummary.late_enrolled_count
            + reviewSummary.not_assigned_count
            + reviewSummary.not_admitted_yet_count
        )
        : 0;
    const upcomingAssessments = assessments.filter(a => {
        if (!a.assessment_date) return false;
        const d = new Date(a.assessment_date);
        return d > now && d <= nextWeek;
    }).length;

    const upcomingSessions = sessions.filter(s => {
        if (!s.start_time) return false;
        return new Date(`${s.session_date} ${s.start_time}`) > now;
    }).length;

    let totalPresent = 0;
    let totalExpected = 0;
    sessions.forEach(s => {
        totalExpected += s.attendance_count.total;
        totalPresent += s.attendance_count.present;
    });
    const todayRate = totalExpected > 0
        ? Math.round((totalPresent / totalExpected) * 1000) / 10
        : 0;

    const scoredScores = scores.filter(s => s.score !== null && s.score !== undefined);
    const averageScore = scoredScores.length > 0
        ? Math.round(scoredScores.reduce((sum, s) => sum + (s.score ?? 0), 0) / scoredScores.length * 10) / 10
        : 0;

    const needsSupport = scores.filter(s => {
        if (!s.score || !s.assessment) return false;
        const total = (s.assessment as { total_marks: number }).total_marks;
        return total > 0 && (s.score / total) * 100 < 50;
    }).length;

    return {
        students: { total: students.length, active: activeStudents.length },
        attendance: {
            todayRate,
            riskCount: attendanceRiskCount,
            riskLearnerCount: attendanceRiskLearnerCount,
        },
        assessments: {
            needsGrading,
            reviewExemptCount,
            upcoming: upcomingAssessments,
        },
        sessions: { today: sessions.length, upcoming: upcomingSessions },
        performance: { averageScore, needsSupport },
    };
}

function generateInstructorAlerts(metrics: InstructorMetrics): DashboardAlert[] {
    const alerts: DashboardAlert[] = [];

    if (metrics.assessments.needsGrading > 50) {
        alerts.push({
            id: 1, type: 'warning',
            message: `${metrics.assessments.needsGrading} submissions need review`,
            action: 'Grade Now', link: '/assessments',
        });
    }
    if (metrics.sessions.upcoming > 0) {
        alerts.push({
            id: 2, type: 'info',
            message: `${metrics.sessions.upcoming} sessions starting soon`,
            action: 'View Schedule', link: '/sessions',
        });
    }
    if (metrics.performance.needsSupport > 10) {
        alerts.push({
            id: 3, type: 'warning',
            message: `${metrics.performance.needsSupport} learners need academic support`,
            action: 'View Learners', link: '/learners?filter=struggling',
        });
    }
    return alerts;
}

function getTeachingAssignmentKey(assignment: Pick<
    TeachingAssignment,
    'source' | 'subject_source' | 'curriculum_type' | 'teaching_link_id' | 'cbc_cohort_subject_id' | 'cambridge_cohort_subject_id' | 'cohort_subject_id' | 'subject_id'
>) {
    const source =
        assignment.source?.trim().toLowerCase() ||
        assignment.subject_source?.trim().toLowerCase() ||
        (assignment.curriculum_type === 'CBE' ? 'cbc' : 'unknown');
    const identity =
        assignment.teaching_link_id ??
        assignment.cbc_cohort_subject_id ??
        assignment.cambridge_cohort_subject_id ??
        assignment.cohort_subject_id ??
        assignment.subject_id;

    return `${source}-${identity ?? 'unresolved'}`;
}

function buildTeachingCohorts(assignments: TeachingAssignment[]): TeachingCohortSummary[] {
    const teachingCohortMap = new Map<number, TeachingCohortSummary>();

    assignments.forEach((assignment) => {
        const existing = teachingCohortMap.get(assignment.cohort_id);
        const teachingKey = getTeachingAssignmentKey(assignment);

        if (!existing) {
            teachingCohortMap.set(assignment.cohort_id, {
                cohort_id: assignment.cohort_id,
                cohort_name: assignment.cohort_name,
                level: assignment.level ?? null,
                curriculum_type: assignment.curriculum_type ?? null,
                subject_count: 1,
                subjects: [{
                    teaching_key: teachingKey,
                    subject_id: assignment.subject_id,
                    subject_name: assignment.subject_name,
                    subject_code: assignment.subject_code ?? null,
                }],
            });
            return;
        }

        const alreadyAdded = existing.subjects.some((subject) => subject.teaching_key === teachingKey);
        if (alreadyAdded) {
            return;
        }

        existing.subjects.push({
            teaching_key: teachingKey,
            subject_id: assignment.subject_id,
            subject_name: assignment.subject_name,
            subject_code: assignment.subject_code ?? null,
        });
        existing.subject_count = existing.subjects.length;
        existing.level = existing.level ?? assignment.level ?? null;
        existing.curriculum_type = existing.curriculum_type ?? assignment.curriculum_type ?? null;
    });

    return Array.from(teachingCohortMap.values());
}

// ── Hook ──────────────────────────────────────────────────────────────────

export function useInstructorDashboard() {
    const [lastRefresh, setLastRefresh] = useState(new Date());
    const [teachingLoad, setTeachingLoad] = useState<TeachingAssignment[]>([]);
    const [teachingLoadLoading, setTeachingLoadLoading] = useState(true);
    const [teachingHistory, setTeachingHistory] = useState<HistoryEntry[]>([]);

    const { students, loading: studentsLoading, reload: refetchStudents } = useStudents({ page_size: 1000 });
    const { sessions, loading: sessionsLoading, refetch: refetchSessions } = useTodaySessions();
    const { currentTerm, loading: termLoading } = useCurrentTerm();
    const { currentYear, loading: yearLoading } = useCurrentAcademicYear();
    const { assessments, loading: assessmentsLoading, refetch: refetchAssessments } = useAssessments({
        term: currentTerm?.id,
    });
    const {
        scores,
        loading: scoresLoading,
        refetch: refetchScores,
    } = useAssessmentScores({
        assessment__term: currentTerm?.id,
        page_size: 200,
    });
    const {
        summary: reviewSummary,
        loading: reviewSummaryLoading,
        refetch: refetchReviewSummary,
    } = useAssessmentReviewSummary({
        term: currentTerm?.id,
        enabled: Boolean(currentTerm?.id),
    });
    const {
        items: assignmentWork,
        loading: assignmentWorkLoading,
        error: assignmentWorkError,
        refetch: refetchAssignmentWork,
    } = useAssignmentTeachingToday();
    const {
        count: attendanceRiskCount,
        uniqueLearnerCount: attendanceRiskLearnerCount,
        loading: attendanceRiskLoading,
        error: attendanceRiskError,
        refetch: refetchAttendanceRisk,
    } = useInstructorAttendanceRisk({
        termId: currentTerm?.id,
    });

    const isLoading = studentsLoading || sessionsLoading ||
        assessmentsLoading || scoresLoading || reviewSummaryLoading ||
        termLoading || yearLoading || teachingLoadLoading || assignmentWorkLoading;

    const metrics = useMemo(
        () => computeInstructorMetrics(
            students,
            assessments,
            scores,
            reviewSummary,
            sessions,
            attendanceRiskCount,
            attendanceRiskLearnerCount,
        ),
        [
            students,
            assessments,
            scores,
            reviewSummary,
            sessions,
            attendanceRiskCount,
            attendanceRiskLearnerCount,
        ]
    );

    const alerts = useMemo(
        () => generateInstructorAlerts(metrics),
        [metrics]
    );
    const pendingReviewRows = useMemo<AssessmentScore[]>(() => (
        scores
            .filter((score) => (
                score.is_pending_review
                || (
                    score.score == null
                    && score.rubric_level == null
                    && score.status === 'PENDING_REVIEW'
                )
            ))
            .sort((left, right) => (
                left.assessment_name.localeCompare(right.assessment_name)
                || left.student_name.localeCompare(right.student_name)
            ))
    ), [scores]);

    const loadTeachingLoad = useCallback(async (showLoadingState = false) => {
        if (showLoadingState) {
            setTeachingLoadLoading(true);
        }

        try {
            const data = await globalUsersAPI.getMyTeachingLoad();
            setTeachingLoad(data.assignments);
        } catch {
            setTeachingLoad([]);
        } finally {
            if (showLoadingState) {
                setTeachingLoadLoading(false);
            }
        }
    }, []);

    useEffect(() => {
        void loadTeachingLoad(true);
    }, [loadTeachingLoad]);

    useEffect(() => {
        globalUsersAPI.getMyTeachingHistory()
            .then(data => setTeachingHistory(data.history))
            .catch(() => setTeachingHistory([]));
    }, []);

    const teachingCohorts = useMemo(
        () => buildTeachingCohorts(teachingLoad),
        [teachingLoad]
    );

    const refresh = useCallback(async () => {
        await Promise.all([
            refetchStudents(),
            refetchSessions(),
            refetchAssessments(),
            refetchScores(),
            refetchReviewSummary(),
            refetchAssignmentWork(),
            refetchAttendanceRisk(),
            loadTeachingLoad(),
        ]);
        setLastRefresh(new Date());
    }, [
        refetchStudents,
        refetchSessions,
        refetchAssessments,
        refetchScores,
        refetchReviewSummary,
        refetchAssignmentWork,
        refetchAttendanceRisk,
        loadTeachingLoad,
    ]);

    useEffect(() => {
        const interval = setInterval(refresh, 5 * 60 * 1000);
        return () => clearInterval(interval);
    }, [refresh]);

    return {
        metrics,
        alerts,
        sessions,
        teachingCohorts,
        currentTerm,
        currentYear,
        lastRefresh,
        isLoading,
        refresh,
        teachingLoad,
        teachingHistory,
        attendanceRiskLoading,
        attendanceRiskError,
        pendingReviewRows,
        assignmentWork,
        assignmentWorkError,
    };
}
