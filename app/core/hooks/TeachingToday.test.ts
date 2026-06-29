import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = () => readFileSync(
  join(process.cwd(), 'app/core/hooks/useTeachingToday.ts'),
  'utf8',
);

describe('Teaching Today assignment workflow integration', () => {
  it('loads assignment workflow items from the assignment hook', () => {
    const hookSource = source();

    expect(hookSource).toContain('useAssignmentTeachingToday');
    expect(hookSource).toContain('assignmentWork');
    expect(hookSource).toContain('AssignmentTeachingTodayItem');
  });

  it('prioritizes active assignment work before ready sessions', () => {
    const hookSource = source();
    const assignmentIndex = hookSource.indexOf('const activeAssignmentWork = sortAssignmentTeachingTodayItems(assignmentWork)[0];');
    const readyIndex = hookSource.indexOf('const ready = groups.ready[0];');

    expect(assignmentIndex).toBeGreaterThan(-1);
    expect(readyIndex).toBeGreaterThan(-1);
    expect(assignmentIndex).toBeLessThan(readyIndex);
  });

  it('contains teacher-facing assignment reminder labels', () => {
    const helperSource = readFileSync(
      join(process.cwd(), 'app/core/lib/teachingActionQueue.ts'),
      'utf8',
    );

    expect(helperSource).toContain('Issue prepared learner task');
    expect(helperSource).toContain('Record learner responses');
    expect(helperSource).toContain('Review learner work');
    expect(helperSource).toContain('Store reviewed learner work');
    expect(helperSource).toContain('Reviewed learner work is ready for evidence');
  });

  it('invalidates assignment teaching-today memory after assignment stage changes', () => {
    const assignmentHookSource = readFileSync(
      join(process.cwd(), 'app/core/hooks/useAssignments.ts'),
      'utf8',
    );

    expect(assignmentHookSource).toContain('assignmentKeys.teachingToday()');
    expect(assignmentHookSource).toContain('assignmentKeys.preparedForLessonPlan(lessonPlanId)');
    expect(assignmentHookSource).toContain('usePrepareAssignmentFromLessonPlan');
    expect(assignmentHookSource).toContain('useIssuePreparedAssignment');
    expect(assignmentHookSource).toContain('usePublishAssignment');
    expect(assignmentHookSource).toContain('useCloseAssignment');
    expect(assignmentHookSource).toContain('useArchiveAssignment');
    expect(assignmentHookSource).toContain('useRestoreAssignmentToReview');
    expect(assignmentHookSource).toContain('useCreateAssignmentSubmission');
    expect(assignmentHookSource).toContain('useCreateAssignmentEvaluation');
    expect(assignmentHookSource).toContain('useBridgeAssignmentEvaluation');
  });
});
