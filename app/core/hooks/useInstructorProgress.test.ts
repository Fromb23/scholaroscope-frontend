import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const hookSource = readFileSync(
  join(process.cwd(), 'app/core/hooks/useInstructorProgress.ts'),
  'utf8',
);

describe('useInstructorProgress session scope', () => {
  it('does not remove admin-created sessions returned by the server instructor scope', () => {
    expect(hookSource).toContain('setSessions(allSessions)');
    expect(hookSource).not.toContain('created_by_id === instructorId');
    expect(hookSource).not.toContain('shouldFilterByCreatorId');
  });

  it('loads schemes but not the removed instructor lesson-plan drilldown', () => {
    expect(hookSource).toContain('schemesAPI.getInstructorSchemes(instructorId, {');
    expect(hookSource).toContain('term_id: scope.termId');
    expect(hookSource).toContain('subject_id: scope.subjectId');
    expect(hookSource).not.toContain('lessonPlanAPI');
    expect(hookSource).not.toContain('getInstructorLessonPlans');
    expect(hookSource).not.toContain('setLessonPlans');
    expect(hookSource).not.toContain('lessonPlans,');
    expect(hookSource).not.toContain("schemesAPI.listSchemes({ teacher: instructorId })");
  });

  it('sends inherited historical scope to the session API without implicit current scope', () => {
    expect(hookSource).toContain('sessionAPI.getSupervisedComplete({');
    expect(hookSource).toContain('term: scope.termId');
    expect(hookSource).toContain('session_date__gte: scope.startDate');
    expect(hookSource).toContain('session_date__lte: scope.endDate');
    expect(hookSource).not.toContain("scope: 'current'");
  });
});
