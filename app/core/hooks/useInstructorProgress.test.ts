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

  it('loads planning drill-downs through server-filtered instructor endpoints', () => {
    expect(hookSource).toContain('lessonPlanAPI.getInstructorLessonPlans(instructorId)');
    expect(hookSource).toContain('schemesAPI.getInstructorSchemes(instructorId)');
    expect(hookSource).toContain('setLessonPlans(lessonPlanData.results)');
    expect(hookSource).not.toContain("schemesAPI.listSchemes({ teacher: instructorId })");
  });
});
