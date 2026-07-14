import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

function source(path: string): string {
  return readFileSync(join(process.cwd(), path), 'utf8');
}

describe('actor responsibility API boundaries', () => {
  it('keeps session authorization on the server and separates supervision requests', () => {
    const hook = source('app/core/hooks/useSessions.ts');
    const api = source('app/core/api/sessions.ts');

    expect(hook).not.toContain('filterInstructorSessions');
    expect(hook).toContain('sessionAPI.getSupervised');
    expect(api).toContain("authority_mode: 'supervision'");
    expect(api).toContain('interface CohortSummaryParams');
    expect(api).toContain('cohort_subject_id: number');
    expect(api).not.toContain('marked_by: string;');
  });

  it('does not discard server-authorized shared assessments or assignments', () => {
    const assessments = source('app/core/hooks/useAssessments.ts');
    const assignments = source('app/core/hooks/useAssignments.ts');
    const assessmentList = assessments.slice(
      assessments.indexOf('export const useAssessments'),
      assessments.indexOf('export const useOpenAssessmentsForStudent'),
    );
    const assignmentList = assignments.slice(
      assignments.indexOf('export function useAssignments'),
      assignments.indexOf('export function useAssignmentDetail'),
    );
    const assignmentDetail = assignments.slice(
      assignments.indexOf('export function useAssignmentDetail'),
      assignments.indexOf('export function useAssignmentLifecycleState'),
    );

    expect(assessmentList).not.toContain('allowedCohortSubjectIds');
    expect(assessmentSourceUsesServerList(assessmentList)).toBe(true);
    expect(assignmentList).not.toContain('items.filter');
    expect(assignmentDetail).not.toContain('ensureInstructorCohortSubjectAccess');
  });

  it('includes authority mode in assessment and assignment request state', () => {
    expect(source('app/core/hooks/useAssessments.ts')).toContain(
      'authority_mode: params?.authority_mode',
    );
    expect(source('app/core/hooks/useAssignments.ts')).toContain(
      'authority_mode: filters?.authority_mode',
    );
    expect(source('app/core/components/assessments/AssessmentsOverview.tsx')).toContain(
      "authority_mode: isAdminSupervisionMode ? 'supervision' : 'teaching'",
    );
  });
});

function assessmentSourceUsesServerList(assessmentHookSource: string): boolean {
  return assessmentHookSource.includes('setAssessments(unwrapList(data))');
}
