// ============================================================================
// app/core/hooks/useInstructorDashboard.ts
//
// Owns all instructor dashboard data fetching, metric computation,
// alert generation, and auto-refresh. No logic in the page.
// ============================================================================

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useStudents } from '@/app/core/hooks/useStudents';
import { useCohorts } from '@/app/core/hooks/useCohorts';
import { useTodaySessions } from '@/app/core/hooks/useSessions';
import { useAssessments, useAssessmentScores } from '@/app/core/hooks/useAssessments';
import { useCurrentTerm, useCurrentAcademicYear } from '@/app/core/hooks/useAcademic';
import type { Session } from '@/app/core/types/session';
import type { Cohort, TeachingAssignment, HistoryEntry } from '@/app/core/types/academic';
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
        frequentlyAbsent: number;
    };
    assessments: {
        needsGrading: number;
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
    scores: { score?: number | null; rubric_level?: number | null; assessment?: unknown }[],
    sessions: Session[]
): InstructorMetrics {
    const now = new Date();
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const activeStudents = students.filter(s => s.status === 'ACTIVE');

    const needsGrading = scores.filter(s => !s.score && !s.rubric_level).length;
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

    // Placeholder — ~8% of active students frequently absent
    const frequentlyAbsent = Math.floor(activeStudents.length * 0.08);

    return {
        students: { total: students.length, active: activeStudents.length },
        attendance: { todayRate, frequentlyAbsent },
        assessments: { needsGrading, upcoming: upcomingAssessments },
        sessions: { today: sessions.length, upcoming: upcomingSessions },
        performance: { averageScore, needsSupport },
    };
}

function generateInstructorAlerts(metrics: InstructorMetrics): DashboardAlert[] {
    const alerts: DashboardAlert[] = [];

    if (metrics.assessments.needsGrading > 50) {
        alerts.push({
            id: 1, type: 'warning',
            message: `${metrics.assessments.needsGrading} assignments need grading`,
            action: 'Grade Now', link: '/assessments',
        });
    }
    if (metrics.sessions.upcoming > 0) {
        alerts.push({
            id: 2, type: 'info',
            message: `${metrics.sessions.upcoming} sessions starting soon`,
            action: 'View Schedule', link: '/sessions/today',
        });
    }
    if (metrics.performance.needsSupport > 10) {
        alerts.push({
            id: 3, type: 'warning',
            message: `${metrics.performance.needsSupport} learners need academic support`,
            action: 'View Learners', link: '/learners?filter=struggling',
        });
    }
    if (metrics.attendance.frequentlyAbsent > 5) {
        alerts.push({
            id: 4, type: 'error',
            message: `${metrics.attendance.frequentlyAbsent} learners frequently absent`,
            action: 'Check Attendance', link: '/learners?filter=absent',
        });
    }

    return alerts;
}

// ── Hook ──────────────────────────────────────────────────────────────────

export function useInstructorDashboard() {
    const [lastRefresh, setLastRefresh] = useState(new Date());
    const [teachingLoad, setTeachingLoad] = useState<TeachingAssignment[]>([]);
    const [teachingLoadLoading, setTeachingLoadLoading] = useState(true);
    const [teachingHistory, setTeachingHistory] = useState<HistoryEntry[]>([]);

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
        assessmentsLoading || scoresLoading || termLoading || yearLoading || teachingLoadLoading;

    const metrics = useMemo(
        () => computeInstructorMetrics(students, assessments, scores, sessions),
        [students, assessments, scores, sessions]
    );

    const alerts = useMemo(
        () => generateInstructorAlerts(metrics),
        [metrics]
    );

    useEffect(() => {
        globalUsersAPI.getMyTeachingLoad()
            .then(data => setTeachingLoad(data.assignments))
            .catch(() => setTeachingLoad([]))
            .finally(() => setTeachingLoadLoading(false));
    }, []);

    useEffect(() => {
        globalUsersAPI.getMyTeachingHistory()
            .then(data => setTeachingHistory(data.history))
            .catch(() => setTeachingHistory([]));
    }, []);

    const refresh = useCallback(async () => {
        await Promise.all([
            refetchStudents(),
            refetchSessions(),
            refetchAssessments(),
        ]);
        setLastRefresh(new Date());
    }, [refetchStudents, refetchSessions, refetchAssessments]);

    useEffect(() => {
        const interval = setInterval(refresh, 5 * 60 * 1000);
        return () => clearInterval(interval);
    }, [refresh]);

    return {
        metrics,
        alerts,
        sessions,
        cohorts: cohorts as Cohort[],
        currentTerm,
        currentYear,
        lastRefresh,
        isLoading,
        refresh,
        teachingLoad,
        teachingHistory,
    };
}