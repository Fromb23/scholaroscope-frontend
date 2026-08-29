import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const hookSource = readFileSync(
  join(process.cwd(), 'app/core/hooks/useInstructorProgress.ts'),
  'utf8',
);
const progressPageSource = readFileSync(
  join(process.cwd(), 'app/core/components/admin/instructors/InstructorProgressPage.tsx'),
  'utf8',
);

describe('useInstructorProgress session scope', () => {
  it('does not remove admin-created sessions returned by the server instructor scope', () => {
    expect(hookSource).toContain('setSessions(sessionsResult.value)');
    expect(hookSource).not.toContain('created_by_id === instructorId');
    expect(hookSource).not.toContain('shouldFilterByCreatorId');
  });

  it('keeps the lifecycle-safe profile when an optional history projection fails', () => {
    expect(hookSource).toContain('Promise.allSettled');
    expect(hookSource).toContain("setError('Failed to load staff profile')");
    expect(hookSource).toContain('Historical sessions are temporarily unavailable.');
    expect(hookSource).toContain('Historical schemes are temporarily unavailable.');
    expect(hookSource).not.toContain("setError('Failed to load instructor data')");
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
    expect(hookSource).toContain("scope: scope.termId ? undefined : 'all'");
    expect(hookSource).toContain('session_date__gte: scope.startDate');
    expect(hookSource).toContain('session_date__lte: scope.endDate');
    expect(hookSource).not.toContain("scope: 'current'");
  });

  it('applies the membership action response before a non-silent background refresh without a hard reload', () => {
    expect(hookSource).toContain('applyMembershipAction');
    expect(hookSource).toContain('response.membership_status');
    expect(hookSource).toContain("throw new Error('Failed to refresh staff profile')");
    expect(progressPageSource).toContain('publishInstructorMembershipState');
    expect(progressPageSource).toContain('Access was updated, but the latest staff profile details could not be refreshed.');
    expect(progressPageSource).not.toContain('window.location.reload');
    expect(progressPageSource).not.toContain('router.refresh()');
  });
});
