import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = () => readFileSync(
  join(process.cwd(), 'app/core/hooks/useTeachingToday.ts'),
  'utf8',
);

describe('Teaching Today assignment workflow integration', () => {
  it('uses instructor-safe academic context instead of admin setup/year/term requests', () => {
    const hookSource = source();

    expect(hookSource).toContain('useMyTeachingLoad');
    expect(hookSource).toContain('useAcademicTodayMode');
    expect(hookSource).toContain('assignment.current_term');
    expect(hookSource).not.toContain('useAcademicLifecycleContext');
    expect(hookSource).not.toContain('useAcademicSetupStatus');
    expect(hookSource).not.toContain('useCurrentAcademicYear');
    expect(hookSource).not.toContain('useCurrentTerm');
    expect(hookSource).not.toContain('useTermCalendarEvents');
  });

  it('refreshes dashboard data independently', () => {
    const hookSource = source();

    expect(hookSource).toContain('Promise.allSettled');
    expect(hookSource).not.toContain('refetchSetupStatus');
    expect(hookSource).not.toContain('refetchCurrentYear');
    expect(hookSource).not.toContain('refetchCurrentTerm');
  });

  it('loads assignment workflow items from the assignment hook', () => {
    const hookSource = source();

    expect(hookSource).toContain('useAssignmentTeachingToday');
    expect(hookSource).toContain('assignmentWork');
    expect(hookSource).toContain('AssignmentTeachingTodayItem');
  });

  it('prioritizes active assignment work before ready sessions', () => {
    const hookSource = source();
    const assignmentIndex = hookSource.indexOf('const activeAssignmentWork = sortAssignmentTeachingTodayItems(assignmentWork)');
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

  it('uses server-provided today-mode action eligibility for new-work visibility', () => {
    const hookSource = source();

    expect(hookSource).toContain('action_eligibility');
    expect(hookSource).toContain('deriveTeachingTodayEligibility');
    expect(hookSource).toContain('actionEligibility.createNewWorkAllowed');
    expect(hookSource).not.toContain("todayMode?.mode === 'MIDTERM_BREAK' && todayMode.allows_new_teaching === false");
  });

  it('does not build continue or start actions when server policy denies new work', () => {
    const hookSource = source();

    expect(hookSource).toContain("eligibility.createNewWorkAllowed ? 'Continue lesson' : 'Complete record'");
    expect(hookSource).toContain("'resolve-ready-scheduled-record'");
    expect(hookSource).toContain('eligibility.createNewWorkReason');
  });

  it('requests reminder sessions with explicit lifecycle scope for reconciliation', () => {
    const reminderHookSource = readFileSync(
      join(process.cwd(), 'app/core/hooks/useSessionLifecycleReminders.ts'),
      'utf8',
    );

    expect(reminderHookSource).toContain("getByDateRange(rangeStart, todayKey, { scope: 'all' })");
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
