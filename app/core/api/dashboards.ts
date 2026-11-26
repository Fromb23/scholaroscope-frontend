import type { MyTeachingLoadResponse } from '@/app/core/api/teachingLoad';
import { apiClient } from '@/app/core/api/client';
import type { AcademicTodayMode } from '@/app/core/types/academic';
import type { Assessment, AssessmentReviewSummary } from '@/app/core/types/assessment';
import type { AssignmentTeachingTodayItem } from '@/app/core/types/assignments';
import type { Session, SessionLifecycleReminder } from '@/app/core/types/session';

export interface InstructorTeachingTodayDashboardResponse {
  generated_at: string;
  date: string;
  teaching_load: MyTeachingLoadResponse;
  today_mode: AcademicTodayMode;
  sessions: Session[];
  session_reminders: SessionLifecycleReminder[];
  assessment_review: AssessmentReviewSummary;
  assignment_work: AssignmentTeachingTodayItem[];
}

export interface AdminDashboardResponse {
  generated_at: string;
  metrics: {
    students: { total: number; active: number };
    attendance: { todayRate: number };
    assessments: { total: number; pending: number; upcoming: number; needsGrading: number; completed: number };
    sessions: { today: number; upcoming: number };
    performance: { averageScore: number; needsSupport: number };
  };
  alerts: Array<{ id: number; type: 'error' | 'warning' | 'info' | 'success'; message: string; action: string; link: string }>;
  sessions: Session[];
  cohorts: Array<{ id: number; name: string }>;
  current_term: { id: number; name: string; academic_year_name?: string | null } | null;
  current_year: { id?: number; name: string } | null;
  academic_contexts: Array<{ key: string; curriculumName: string; termName: string; yearName: string }>;
  attention_items: Array<{ id: string; label: string; detail: string; href: string }>;
  week_indicators: Array<{ id: string; label: string; numerator: number; denominator: number }>;
  upcoming_assessments: Assessment[];
  unattended_subjects: Array<{ cohort_subject_id: number; cohort_name: string; subject_name: string }>;
}

export const dashboardAPI = {
  getInstructorTeachingToday: async (): Promise<InstructorTeachingTodayDashboardResponse> => {
    const response = await apiClient.get<InstructorTeachingTodayDashboardResponse>(
      '/reporting/dashboards/instructor/teaching-today/',
      { headers: { 'X-Scholaroscope-Operating-Context': 'MY_TEACHING' } },
    );
    return response.data;
  },
  getWorkspaceAdmin: async (): Promise<AdminDashboardResponse> => {
    const response = await apiClient.get<AdminDashboardResponse>(
      '/reporting/dashboards/admin/',
      { headers: { 'X-Scholaroscope-Operating-Context': 'WORKSPACE_MANAGEMENT' } },
    );
    return response.data;
  },
};
