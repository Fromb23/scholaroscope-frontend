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
import {
    useAssessments,
    useAssessmentReviewSummary,
    useAssessmentScores,
} from '@/app/core/hooks/useAssessments';
import { useCurrentTerm, useCurrentAcademicYear } from '@/app/core/hooks/useAcademic';
import type { Session } from '@/app/core/types/session';
import type {
    Assessment,
    AssessmentReviewSummary,
    AssessmentScore,
} from '@/app/core/types/assessment';
import { cohortSubjectAPI } from '../api/academic';

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

export interface DashboardAcademicContext {
    key: string;
    curriculumName: string;
    termName: string;
    yearName: string;
}

export interface DashboardAttentionItem {
    id: string;
    label: string;
    detail: string;
    href: string;
}

export interface DashboardWeekIndicator {
    id: string;
    label: string;
    numerator: number;
    denominator: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────

function computeMetrics(
    students: { id: number; status?: string }[],
    assessments: Assessment[],
    scores: AssessmentScore[],
    reviewSummary: AssessmentReviewSummary | null,
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

    const fallbackNeedsGrading = scores.filter((score) => (
        score.score == null
        && score.rubric_level == null
        && (
            score.status === 'PENDING_REVIEW'
            || score.status == null
        )
    )).length;
    const needsGrading = reviewSummary?.pending_review_count ?? fallbackNeedsGrading;

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
            message: `${metrics.assessments.needsGrading} submissions need review`,
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

function deriveAcademicContexts(
    currentTerm: { id: number; name: string; academic_year_name?: string | null } | null,
    currentYear: { name: string } | null,
    sessions: Session[],
    assessments: Assessment[]
): DashboardAcademicContext[] {
    const contexts = new Map<string, DashboardAcademicContext>();

    if (currentTerm) {
        const yearName = currentTerm.academic_year_name ?? currentYear?.name ?? 'Current year';
        contexts.set(`current-${currentTerm.id}`, {
            key: `current-${currentTerm.id}`,
            curriculumName: 'Current academic context',
            termName: currentTerm.name,
            yearName,
        });
    }

    [...sessions, ...assessments].forEach(item => {
        const curriculumName = item.curriculum_name ?? null;
        const termName = item.term_name ?? null;
        if (!curriculumName || !termName) return;
        const key = `${curriculumName}:${termName}`;
        if (!contexts.has(key)) {
            contexts.set(key, {
                key,
                curriculumName,
                termName,
                yearName: currentYear?.name ?? 'Current year',
            });
        }
    });

    return Array.from(contexts.values()).sort((left, right) => (
        left.curriculumName.localeCompare(right.curriculumName)
        || left.termName.localeCompare(right.termName)
    ));
}

function deriveAttentionItems(
    assessments: Assessment[],
    reviewSummary: AssessmentReviewSummary | null,
    unattendedSubjects: { cohort_subject_id: number; cohort_name: string; subject_name: string }[]
): DashboardAttentionItem[] {
    const items: DashboardAttentionItem[] = [];
    const readyToFinalize = assessments.filter(assessment => assessment.can_finalize).length;
    const pendingReview = reviewSummary?.pending_review_count ?? 0;

    if (pendingReview > 0) {
        items.push({
            id: 'assessment-review',
            label: 'Assessment scores awaiting review',
            detail: `${pendingReview} score${pendingReview === 1 ? '' : 's'} pending review`,
            href: '/assessments?status=pending-review',
        });
    }

    if (readyToFinalize > 0) {
        items.push({
            id: 'assessment-finalization',
            label: 'Assessments ready for finalization',
            detail: `${readyToFinalize} assessment${readyToFinalize === 1 ? '' : 's'} ready`,
            href: '/assessments?can_finalize=true',
        });
    }

    unattendedSubjects.slice(0, 3).forEach(subject => {
        items.push({
            id: `unattended-${subject.cohort_subject_id}`,
            label: `${subject.subject_name} has no assigned instructor`,
            detail: subject.cohort_name,
            href: `/academic/cohort-subjects/${subject.cohort_subject_id}`,
        });
    });

    return items;
}

function deriveWeekIndicators(sessions: Session[], assessments: Assessment[]): DashboardWeekIndicator[] {
    const indicators: DashboardWeekIndicator[] = [];
    const recordedSessions = sessions.filter(session => session.attendance_count.total > 0).length;
    const completedSessions = sessions.filter(session => (
        session.status === 'COMPLETED'
        || session.workflow_summary?.lifecycle_status === 'COMPLETED'
    )).length;
    const finalizedAssessments = assessments.filter(assessment => assessment.status === 'FINALIZED').length;

    if (sessions.length > 0) {
        indicators.push({
            id: 'attendance-coverage',
            label: 'Attendance recorded today',
            numerator: recordedSessions,
            denominator: sessions.length,
        });
        indicators.push({
            id: 'lesson-completion',
            label: 'Lessons completed today',
            numerator: completedSessions,
            denominator: sessions.length,
        });
    }

    if (assessments.length > 0) {
        indicators.push({
            id: 'assessment-finalization',
            label: 'Assessment finalization',
            numerator: finalizedAssessments,
            denominator: assessments.length,
        });
    }

    return indicators;
}

function deriveUpcomingAssessments(assessments: Assessment[]): Assessment[] {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const windowEnd = new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000);

    return assessments
        .filter(assessment => {
            if (!assessment.assessment_date) return false;
            const assessmentDate = new Date(assessment.assessment_date);
            return assessmentDate >= today && assessmentDate <= windowEnd;
        })
        .sort((left, right) => (
            (left.assessment_date ?? '').localeCompare(right.assessment_date ?? '')
            || left.subject_name.localeCompare(right.subject_name)
            || left.cohort_name.localeCompare(right.cohort_name)
            || left.id - right.id
        ))
        .slice(0, 6);
}

// ── Hook ──────────────────────────────────────────────────────────────────

export function useAdminDashboard() {
    const [lastRefresh, setLastRefresh] = useState(new Date());
    const [unattendedSubjects, setUnattendedSubjects] = useState<{
        cohort_subject_id: number;
        cohort_name: string;
        subject_name: string;
    }[]>([]);

    const { students, loading: studentsLoading, reload: refetchStudents } = useStudents({ page_size: 1000 });
    const { cohorts, loading: cohortsLoading } = useCohorts();
    const { sessions, loading: sessionsLoading, refetch: refetchSessions } = useTodaySessions();
    const { currentTerm, loading: termLoading } = useCurrentTerm();
    const { currentYear, loading: yearLoading } = useCurrentAcademicYear();
    const { assessments, loading: assessmentsLoading, refetch: refetchAssessments } = useAssessments({
        term: currentTerm?.id,
    });
    const { scores, loading: scoresLoading } = useAssessmentScores();
    const {
        summary: reviewSummary,
        loading: reviewSummaryLoading,
        refetch: refetchReviewSummary,
    } = useAssessmentReviewSummary({
        term: currentTerm?.id,
        enabled: Boolean(currentTerm?.id),
    });

    const isLoading = studentsLoading || cohortsLoading || sessionsLoading ||
        assessmentsLoading || scoresLoading || reviewSummaryLoading || termLoading || yearLoading;

    const metrics = useMemo(
        () => computeMetrics(students, assessments, scores, reviewSummary, sessions),
        [students, assessments, scores, reviewSummary, sessions]
    );

    const academicContexts = useMemo(
        () => deriveAcademicContexts(currentTerm, currentYear, sessions, assessments),
        [assessments, currentTerm, currentYear, sessions]
    );

    const attentionItems = useMemo(
        () => deriveAttentionItems(assessments, reviewSummary, unattendedSubjects),
        [assessments, reviewSummary, unattendedSubjects]
    );

    const weekIndicators = useMemo(
        () => deriveWeekIndicators(sessions, assessments),
        [assessments, sessions]
    );

    const upcomingAssessments = useMemo(
        () => deriveUpcomingAssessments(assessments),
        [assessments]
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
            refetchReviewSummary(),
        ]);
        setLastRefresh(new Date());
    }, [refetchStudents, refetchSessions, refetchAssessments, refetchReviewSummary]);

    useEffect(() => {
        cohortSubjectAPI.getUnattended()
            .then(data => setUnattendedSubjects(
                data.map(cs => ({
                    cohort_subject_id: cs.id,
                    cohort_name: cs.cohort_name,
                    subject_name: cs.subject_name,
                }))
            ))
            .catch(() => { });
    }, []);

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
        academicContexts,
        attentionItems,
        weekIndicators,
        upcomingAssessments,
        lastRefresh,
        isLoading,
        refresh,
        unattendedSubjects
    };
}
