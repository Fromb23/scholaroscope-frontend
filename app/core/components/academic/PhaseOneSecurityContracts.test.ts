import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

function source(path: string): string {
  return readFileSync(join(process.cwd(), path), 'utf8');
}

function interfaceBlock(contents: string, name: string, nextName: string): string {
  const start = contents.indexOf(`export interface ${name}`);
  const end = nextName
    ? contents.indexOf(`export interface ${nextName}`, start)
    : contents.length;
  return contents.slice(start, end);
}

describe('Phase 1 academic security frontend contracts', () => {
  it('does not submit client-controlled grading attribution', () => {
    const assessmentTypes = source('app/core/types/assessment.ts');
    const detailHook = source('app/core/hooks/assessments/useAssessmentDetailPage.ts');
    const assessmentApi = source('app/core/api/assessments.ts');
    const scoreCreateStart = assessmentApi.indexOf(
      'create: async (data: {',
      assessmentApi.indexOf('export const assessmentScoreAPI'),
    );
    const scoreCreateEnd = assessmentApi.indexOf('}) => {', scoreCreateStart);
    const scoreUpdateStart = assessmentApi.indexOf('update: async', scoreCreateEnd);
    const scoreUpdateEnd = assessmentApi.indexOf('delete: async', scoreUpdateStart);

    expect(interfaceBlock(assessmentTypes, 'BulkScoreData', 'AssessmentFormData')).not.toContain('scored_by');
    expect(detailHook).not.toContain('scored_by');
    expect(assessmentApi.slice(scoreCreateStart, scoreCreateEnd)).not.toContain('graded_by');
    expect(assessmentApi.slice(scoreUpdateStart, scoreUpdateEnd)).toContain('data: AssessmentScoreDraft');
    expect(assessmentApi.slice(scoreUpdateStart, scoreUpdateEnd)).not.toContain('Partial<AssessmentScore>');
  });

  it('keeps ordinary assignment ownership out of create and update payloads', () => {
    const assignmentTypes = source('app/core/types/assignments.ts');
    const assignmentPage = source('app/core/components/assignments/CohortAssignmentsPage.tsx');
    const assignmentModal = source('app/core/components/assignments/AssignmentCreateModal.tsx');

    expect(interfaceBlock(assignmentTypes, 'AssignmentCreatePayload', 'PrepareAssignmentFromLessonPlanPayload'))
      .not.toContain('instructor?:');
    expect(interfaceBlock(assignmentTypes, 'AssignmentUpdatePayload', 'AssignmentFilters'))
      .not.toContain('instructor?:');
    expect(assignmentPage).toContain('const canCreateAssignments = Boolean(user) && isTeachingActor;');
    expect(assignmentPage).toContain('editingAssignment ? canManageAssignments : canCreateAssignments');
    expect(assignmentModal).toContain("assignment.status === 'DRAFT'");
    expect(assignmentModal).toContain("disabled={isEditMode && assignment?.status !== 'DRAFT'}");
  });

  it('only sends mutable attendance fields and blocks incomplete lesson closure', () => {
    const sessionTypes = source('app/core/types/session.ts');
    const sessionApi = source('app/core/api/sessions.ts');
    const sessionDetail = source('app/core/components/sessions/SessionDetailPage.tsx');

    const updatePayload = interfaceBlock(
      sessionTypes,
      'AttendanceRecordUpdatePayload',
      'AttendanceSummary',
    );
    expect(updatePayload).toContain('status?: string | null');
    expect(updatePayload).toContain('notes?: string');
    expect(updatePayload).not.toContain('session:');
    expect(updatePayload).not.toContain('student:');
    expect(sessionApi).toContain('data: AttendanceRecordUpdatePayload');
    expect(sessionDetail).toContain('closureState?.has_attendance');
    expect(sessionDetail).toContain('attendanceRecords.length > 0');
    expect(sessionDetail).toContain('attendanceRecords.every((record) => record.status !== null)');
    expect(sessionDetail).not.toContain('attendanceRecords.some((record) => record.status !== null)');
  });

  it('models learner assessment detail and never loads class children for learner viewers', () => {
    const assessmentTypes = source('app/core/types/assessment.ts');
    const detailHook = source('app/core/hooks/assessments/useAssessmentDetailPage.ts');
    const detailPage = source('app/core/components/assessments/AssessmentDetailPage.tsx');
    const editPage = source('app/core/components/assessments/EditAssessmentPage.tsx');
    const learnerDetail = interfaceBlock(
      assessmentTypes,
      'LearnerAssessmentDetail',
      'BulkScoreData',
    );
    const learnerScore = interfaceBlock(
      assessmentTypes,
      'LearnerAssessmentScore',
      'AssessmentScoreDraft',
    );

    expect(learnerDetail).toContain('own_score: LearnerAssessmentScore | null');
    expect(learnerDetail).toContain('own_participation: LearnerAssessmentParticipation | null');
    expect(learnerScore).not.toContain('student_name');
    expect(learnerScore).not.toContain('student_admission');
    expect(learnerScore).not.toContain('graded_by');
    expect(detailHook).toContain('enabled: isStaffAcademicViewer');
    expect(detailHook).toContain('!canManageAssessment');
    expect(detailPage).toContain('isLearnerAssessmentDetail(assessment)');
    expect(detailPage).toContain('learnerParticipation?.participation_status_display');
    expect(editPage).toContain('!isLearnerAssessmentDetail(assessment)');
    expect(editPage).toContain('editor is restricted to authorized staff');
  });

  it('renders minimized learner sessions without staff operational requests', () => {
    const sessionTypes = source('app/core/types/session.ts');
    const sessionHook = source('app/core/hooks/useSessions.ts');
    const sessionDetail = source('app/core/components/sessions/SessionDetailPage.tsx');
    const learnerSession = interfaceBlock(
      sessionTypes,
      'LearnerSessionDetail',
      'AttendanceRecordUpdatePayload',
    );

    expect(learnerSession).toContain('attendance_records: LearnerAttendanceRecord[]');
    expect(learnerSession).not.toContain('workflow_summary');
    expect(learnerSession).not.toContain('attendance_count');
    expect(sessionHook).toContain('includeOperationalData');
    expect(sessionDetail).toContain('includeOperationalData: isStaffAcademicViewer');
    expect(sessionDetail).toContain('useSessionCohorts(sessionId, isStaffAcademicViewer)');
    expect(sessionDetail).toContain("label=\"Your attendance\"");
  });

  it('represents only the learner-owned assignment and enrollment workflow rows', () => {
    const assignmentTypes = source('app/core/types/assignments.ts');
    const studentTypes = source('app/core/types/student.ts');
    const learnerAssignment = interfaceBlock(
      assignmentTypes,
      'LearnerAssignment',
      'AssignmentEvaluationCreatePayload',
    );
    const selfEnrollment = interfaceBlock(
      studentTypes,
      'LearnerSelfEnrollment',
      'StudentSummary',
    );

    expect(learnerAssignment).toContain('my_recipient: AssignmentRecipient | null');
    expect(learnerAssignment).toContain('my_submission: AssignmentSubmission | null');
    expect(learnerAssignment).toContain('my_evaluations: LearnerAssignmentEvaluation[]');
    expect(learnerAssignment).not.toContain('recipient_count');
    expect(learnerAssignment).not.toContain('instructor_email');
    expect(selfEnrollment).not.toContain('notes:');
    expect(selfEnrollment).not.toContain('end_reason:');
    expect(selfEnrollment).not.toContain('locked_by:');
  });

  it('accepts minimized CBC switch options without administrative-only fields', () => {
    const pathwayTypes = source('app/plugins/cbc/types/pathways.ts');
    const options = interfaceBlock(
      pathwayTypes,
      'CbcStudentSubjectSwitchOptions',
      '',
    );

    expect(options).toContain('cohort_id: number | null');
    expect(options).toContain('blocked?: CbcAllowedSubject[]');
    expect(options).toContain('lock_reason?: string');
  });

});
