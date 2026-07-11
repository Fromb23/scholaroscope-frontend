import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const academicApiSource = readFileSync(join(process.cwd(), 'app/core/api/academic.ts'), 'utf8');
const academicHookSource = readFileSync(join(process.cwd(), 'app/core/hooks/useAcademic.ts'), 'utf8');
const lessonPlanHookSource = readFileSync(join(process.cwd(), 'app/core/hooks/useLessonPlans.ts'), 'utf8');
const assignmentHookSource = readFileSync(join(process.cwd(), 'app/core/hooks/useAssignments.ts'), 'utf8');
const sessionHookSource = readFileSync(join(process.cwd(), 'app/core/hooks/useSessions.ts'), 'utf8');
const assessmentHookSource = readFileSync(join(process.cwd(), 'app/core/hooks/useAssessments.ts'), 'utf8');
const schemeHookSource = readFileSync(join(process.cwd(), 'app/core/hooks/useSchemes.ts'), 'utf8');
const queryKeySource = readFileSync(join(process.cwd(), 'app/core/lib/queryKeys.ts'), 'utf8');

describe('frontend academic lifecycle scoping contract', () => {
  it('uses the backend current academic context endpoint', () => {
    expect(academicApiSource).toContain("'/academic/current-context/'");
    expect(academicHookSource).toContain('useAcademicLifecycleContext');
    expect(queryKeySource).toContain("['academic', 'current-context', organizationId]");
  });

  it('defaults operational list hooks to lifecycle-scoped requests', () => {
    for (const source of [
      lessonPlanHookSource,
      assignmentHookSource,
      sessionHookSource,
      assessmentHookSource,
      schemeHookSource,
    ]) {
      expect(source).toContain('withOperationalScope');
    }
  });

  it('keeps explicit term aliases server-visible for historical selections', () => {
    expect(sessionHookSource).toContain("['session__term']");
    expect(assessmentHookSource).toContain("['assessment__term']");
    expect(assignmentHookSource).toContain('term: filters?.term');
  });

  it('keeps assignment query keys scoped by normalized lifecycle filters', () => {
    expect(assignmentHookSource).toContain('queryKey: assignmentKeys.list(normalizedFilters)');
    expect(assignmentHookSource).toContain('scope: filters?.scope');
  });
});
