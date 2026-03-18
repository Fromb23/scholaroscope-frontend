// ============================================================================
// app/core/hooks/useAdminDashboard.ts
//
// Owns all admin dashboard data fetching, metric computation, alert
// generation, and auto-refresh. No logic in the page.
// ============================================================================

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useStudents } from '@/app/core/hooks/useStudents';
import { useCohorts } from '@/app/core/hooks/useCohorts';
import { useTodaySessions } from '@/app/core/hooks/useSessions';
import { useAssessments, useAssessmentScores } from '@/app/core/hooks/useAssessments';
import { useCurrentTerm, useCurrentAcademicYear } from '@/app/core/hooks/useAcademic';
import type { Session } from '@/app/core/types/session';
import type { Assessment, AssessmentScore } from '@/app/core/types/assessment';

// ── Types ─────────────────────────────────────────────────────────────────

export type AlertType = 'error' | 'warning' | 'info' | 'success';

export interface DashboardAlert {
    id: number;
    type: AlertType;
    message: string;
    action: string;
    link: string;
}

export interface DashboardMetrics {
    students: {
        total: number;
        active: number;
    };
    attendance: {
        todayRate: number;
    };
    assessments: {
        total: number;
        pending: number;
        upcoming: number;
        needsGrading: number;
        completed: number;
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

function computeMetrics(
    students: { id: number; status?: string }[],
    assessments: Assessment[],
    scores: AssessmentScore[],
    sessions: Session[]
): DashboardMetrics {
    const now = new Date();
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const activeStudents = students.filter(s => s.status === 'ACTIVE');
    const pendingAssessments = assessments.filter(a => !a.assessment_date).length;

    const upcomingAssessments = assessments.filter(a => {
        if (!a.assessment_date) return false;
        const d = new Date(a.assessment_date);
        return d > now && d <= nextWeek;
    }).length;

    const completedAssessments = assessments.filter(a => {
        if (!a.assessment_date) return false;
        const d = new Date(a.assessment_date);
        return d >= weekAgo && d <= now;
    }).length;

    const needsGrading = scores.filter(s => !s.score && !s.rubric_level).length;

    const upcomingSessions = sessions.filter(s => {
        if (!s.start_time) return false;
        return new Date(`${s.session_date} ${s.start_time}`) > now;
    }).length;

    let totalPresent = 0;
    let totalExpected = 0;
    sessions.forEach(s => {
        const records = s.attendance_count;
        totalExpected += records.total;
        totalPresent += records.present;
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
        const totalMarks = (s.assessment as unknown as Assessment).total_marks;
        if (!totalMarks) return false;
        const pct = (s.score / totalMarks) * 100;
        return pct < 50;
    }).length;

    return {
        students: { total: students.length, active: activeStudents.length },
        attendance: { todayRate: todayRate },
        assessments: {
            total: assessments.length,
            pending: pendingAssessments,
            upcoming: upcomingAssessments,
            needsGrading: needsGrading,
            completed: completedAssessments,
        },
        sessions: { today: sessions.length, upcoming: upcomingSessions },
        performance: { averageScore, needsSupport },
    };
}

function generateAlerts(metrics: DashboardMetrics): DashboardAlert[] {
    const alerts: DashboardAlert[] = [];

    if (metrics.assessments.needsGrading > 100) {
        alerts.push({
            id: 1, type: 'warning',
            message: `${metrics.assessments.needsGrading} assessment scores need grading`,
            action: 'Grade Now', link: '/assessments',
        });
    }
    if (metrics.attendance.todayRate > 0 && metrics.attendance.todayRate < 80) {
        alerts.push({
            id: 2, type: 'error',
            message: `Today's attendance is low at ${metrics.attendance.todayRate}%`,
            action: 'View Details', link: '/sessions',
        });
    }
    if (metrics.assessments.upcoming > 0) {
        alerts.push({
            id: 3, type: 'info',
            message: `${metrics.assessments.upcoming} assessments due this week`,
            action: 'View Schedule', link: '/assessments',
        });
    }
    if (metrics.performance.needsSupport > 20) {
        alerts.push({
            id: 4, type: 'warning',
            message: `${metrics.performance.needsSupport} students scoring below 50%`,
            action: 'View Students', link: '/learners?filter=struggling',
        });
    }

    return alerts;
}

// ── Hook ──────────────────────────────────────────────────────────────────

export function useAdminDashboard() {
    const [lastRefresh, setLastRefresh] = useState(new Date());

    const { students, loading: studentsLoading, reload: refetchStudents } = useStudents();
    const { cohorts, loading: cohortsLoading } = useCohorts();
    const { sessions, loading: sessionsLoading, refetch: refetchSessions } = useTodaySessions();
    const { currentTerm, loading: termLoading } = useCurrentTerm();
    const { currentYear, loading: yearLoading } = useCurrentAcademicYear();
    const { assessments, loading: assessmentsLoading, refetch: refetchAssessments } = useAssessments({
        term: currentTerm?.id,
    });
    const { scores, loading: scoresLoading } = useAssessmentScores();

    const isLoading = studentsLoading || cohortsLoading || sessionsLoading ||
        assessmentsLoading || scoresLoading || termLoading || yearLoading;

    const metrics = useMemo(
        () => computeMetrics(students, assessments, scores, sessions),
        [students, assessments, scores, sessions]
    );

    const alerts = useMemo(
        () => generateAlerts(metrics),
        [metrics]
    );

    const refresh = useCallback(async () => {
        await Promise.all([
            refetchStudents(),
            refetchSessions(),
            refetchAssessments(),
        ]);
        setLastRefresh(new Date());
    }, [refetchStudents, refetchSessions, refetchAssessments]);

    // Auto-refresh every 5 minutes
    useEffect(() => {
        const interval = setInterval(refresh, 5 * 60 * 1000);
        return () => clearInterval(interval);
    }, [refresh]);

    return {
        metrics,
        alerts,
        sessions,
        cohorts,
        currentTerm,
        currentYear,
        lastRefresh,
        isLoading,
        refresh,
    };
}