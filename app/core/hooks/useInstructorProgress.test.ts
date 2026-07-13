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
    expect(hookSource).toContain('schemesAPI.getInstructorSchemes(instructorId)');
    expect(hookSource).not.toContain('lessonPlanAPI');
    expect(hookSource).not.toContain('getInstructorLessonPlans');
    expect(hookSource).not.toContain('setLessonPlans');
    expect(hookSource).not.toContain('lessonPlans,');
    expect(hookSource).not.toContain("schemesAPI.listSchemes({ teacher: instructorId })");
  });
});
