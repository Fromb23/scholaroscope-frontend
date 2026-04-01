// ============================================================================
// app/core/hooks/useDashboard.tsx
// ============================================================================

import { useState, useEffect, useCallback } from 'react';
import { learnersAPI } from '@/app/core/api/learners';
import { sessionAPI } from '@/app/core/api/sessions';
import { assessmentAPI, assessmentScoreAPI } from '@/app/core/api/assessments';
import { Assessment, AssessmentScore } from '@/app/core/types/assessment';
import { Session } from '@/app/core/types/session';
import { ApiError, extractErrorMessage } from '@/app/core/types/errors';

export interface DashboardMetrics {
  students: {
    total: number;
    active: number;
    inactive: number;
    trend: number;
  };
  attendance: {
    todayRate: number;
    weekRate: number;
    monthRate: number;
    trend: number;
    lowPerformingCohorts: Array<{ id: number; name: string; rate: number }>;
  };
  sessions: {
    today: number;
    thisWeek: number;
    upcoming: number;
  };
  assessments: {
    pending: number;
    upcoming: number;
    needsGrading: number;
    completed: number;
  };
  performance: {
    classAverage: number;
    trend: number;
    topPerformers: Array<{ id: number; name: string; score: number; admissionNo: string }>;
    needsSupport: number;
  };
}

export function useDashboard() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const fetchMetrics = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [studentsResponse, todaySessionsResponse, assessmentsResponse] =
        await Promise.allSettled([
          learnersAPI.getStudents(),
          sessionAPI.getToday(),
          assessmentAPI.getAll(),
        ]);

      const students: { status: string }[] =
        studentsResponse.status === 'fulfilled'
          ? studentsResponse.value.results ?? []
          : [];

      const todaySessions: Session[] =
        todaySessionsResponse.status === 'fulfilled'
          ? todaySessionsResponse.value
          : [];

      const assessments: Assessment[] =
        assessmentsResponse.status === 'fulfilled'
          ? assessmentsResponse.value
          : [];

      // Attendance — parallel via Promise.allSettled, not sequential loop
      const attendanceResults = await Promise.allSettled(
        todaySessions.map((s) => sessionAPI.getAttendanceSummary(s.id))
      );

      let totalPresent = 0;
      let totalExpected = 0;
      attendanceResults.forEach((result) => {
        if (result.status === 'fulfilled') {
          totalPresent += result.value.present_count ?? 0;
          totalExpected += result.value.total_students ?? 0;
        }
      });

      const todayRate =
        totalExpected > 0
          ? Math.round((totalPresent / totalExpected) * 1000) / 10
          : 0;

      // Assessment metrics
      const now = new Date();
      const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      const pending = assessments.filter((a) => !a.assessment_date).length;

      const upcoming = assessments.filter((a) => {
        if (!a.assessment_date) return false;
        const d = new Date(a.assessment_date);
        return d > now && d <= nextWeek;
      }).length;

      const completed = assessments.filter((a) => {
        if (!a.assessment_date) return false;
        return new Date(a.assessment_date) <= now;
      }).length;

      let needsGrading = 0;
      try {
        const scores: AssessmentScore[] = await assessmentScoreAPI.getAll();
        needsGrading = scores.filter(
          (s) => s.score == null && s.rubric_level == null
        ).length;
      } catch {
        // non-critical — dashboard still renders without this count
      }

      setMetrics({
        students: {
          total: students.length,
          active: students.filter((s) => s.status === 'ACTIVE').length,
          inactive: students.filter((s) => s.status !== 'ACTIVE').length,
          trend: 0,
        },
        attendance: {
          todayRate,
          weekRate: 0,
          monthRate: 0,
          trend: 0,
          lowPerformingCohorts: [],
        },
        sessions: {
          today: todaySessions.length,
          thisWeek: 0,
          upcoming: todaySessions.filter(
            (s) => s.start_time != null &&
              new Date(`${s.session_date} ${s.start_time}`) > now
          ).length,
        },
        assessments: { pending, upcoming, needsGrading, completed },
        performance: {
          classAverage: 0,
          trend: 0,
          topPerformers: [],
          needsSupport: 0,
        },
      });

      setLastUpdated(new Date());
    } catch (err) {
      setError(extractErrorMessage(err as ApiError, 'Failed to load dashboard'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchMetrics]);

  return { metrics, loading, error, lastUpdated, refresh: fetchMetrics };
}