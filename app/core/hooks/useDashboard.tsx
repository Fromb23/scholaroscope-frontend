// ============================================================================
// app/hooks/useDashboard.ts - Custom Hook for Dashboard Data
// ============================================================================

import { useState, useEffect, useCallback } from 'react';
import { learnersAPI } from '@/app/core/api/learners';
import { sessionAPI } from '@/app/core/api/sessions';
import { assessmentAPI, assessmentScoreAPI } from '@/app/core/api/assessments';
import { cohortAPI, termAPI, academicYearAPI } from '@/app/core/api/academic';

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
    lowPerformingCohorts: Array<{
      id: number;
      name: string;
      rate: number;
    }>;
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
    topPerformers: Array<{
      id: number;
      name: string;
      score: number;
      admissionNo: string;
    }>;
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

      // Fetch all required data
      const [
        studentsResponse,
        cohortsResponse,
        todaySessionsResponse,
        currentTermResponse,
        assessmentsResponse,
      ] = await Promise.allSettled([
        learnersAPI.getStudents(),
        cohortAPI.getAll(),
        sessionAPI.getToday(),
        termAPI.getCurrent(),
        assessmentAPI.getAll(),
      ]);

      // Process students data
      const students = studentsResponse.status === 'fulfilled'
        ? studentsResponse.value.results || []
        : [];

      const activeStudents = students.filter((s: any) => s.status === 'ACTIVE');
      const inactiveStudents = students.filter((s: any) => s.status !== 'ACTIVE');

      // Process sessions
      const todaySessions = todaySessionsResponse.status === 'fulfilled'
        ? todaySessionsResponse.value
        : [];

      // Process assessments
      const assessments = assessmentsResponse.status === 'fulfilled'
        ? assessmentsResponse.value
        : [];

      // Calculate attendance metrics
      const attendanceMetrics = await calculateAttendanceMetrics(todaySessions);

      // Calculate assessment metrics
      const assessmentMetrics = await calculateAssessmentMetrics(assessments);

      // Build final metrics
      const dashboardMetrics: DashboardMetrics = {
        students: {
          total: students.length,
          active: activeStudents.length,
          inactive: inactiveStudents.length,
          trend: 0, // Calculate from historical data if available
        },
        attendance: attendanceMetrics,
        sessions: {
          today: todaySessions.length,
          thisWeek: 0, // Fetch from API if needed
          upcoming: todaySessions.filter((s: any) =>
            new Date(s.session_date + ' ' + s.start_time) > new Date()
          ).length,
        },
        assessments: assessmentMetrics,
        performance: {
          classAverage: 0, // Calculate from assessment scores
          trend: 0,
          topPerformers: [],
          needsSupport: 0,
        },
      };

      setMetrics(dashboardMetrics);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Dashboard fetch error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMetrics();

    // Auto-refresh every 5 minutes
    const interval = setInterval(fetchMetrics, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchMetrics]);

  return {
    metrics,
    loading,
    error,
    lastUpdated,
    refresh: fetchMetrics,
  };
}

// Helper functions
async function calculateAttendanceMetrics(sessions: any[]) {
  let totalPresent = 0;
  let totalExpected = 0;

  for (const session of sessions) {
    try {
      const summary = await sessionAPI.getAttendanceSummary(session.id);
      totalPresent += summary.present_count || 0;
      totalExpected += summary.total_students || 0;
    } catch (error) {
      console.error(`Failed to get attendance for session ${session.id}`, error);
    }
  }

  const todayRate = totalExpected > 0 ? (totalPresent / totalExpected) * 100 : 0;

  return {
    todayRate: Math.round(todayRate * 10) / 10,
    weekRate: 0, // Implement week calculation
    monthRate: 0, // Implement month calculation
    trend: 0,
    lowPerformingCohorts: [],
  };
}

async function calculateAssessmentMetrics(assessments: any[]) {
  const today = new Date();
  const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const pending = assessments.filter(a => !a.assessment_date).length;

  const upcoming = assessments.filter(a => {
    if (!a.assessment_date) return false;
    const date = new Date(a.assessment_date);
    return date > today && date <= nextWeek;
  }).length;

  const completed = assessments.filter(a => {
    if (!a.assessment_date) return false;
    const date = new Date(a.assessment_date);
    return date <= today;
  }).length;

  let needsGrading = 0;
  try {
    // Get ungraded scores across all assessments
    const scores = await assessmentScoreAPI.getAll();
    needsGrading = scores.filter(s => !s.score && !s.rubric_level).length;
  } catch (error) {
    console.error('Failed to calculate grading needs', error);
  }

  return {
    pending,
    upcoming,
    needsGrading,
    completed,
  };
}

