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
    const assignmentIndex = hookSource.indexOf('const activeAssignmentWork = sortAssignmentWork(assignmentWork)[0];');
    const readyIndex = hookSource.indexOf('const ready = groups.ready[0];');

    expect(assignmentIndex).toBeGreaterThan(-1);
    expect(readyIndex).toBeGreaterThan(-1);
    expect(assignmentIndex).toBeLessThan(readyIndex);
  });

  it('contains teacher-facing assignment reminder labels', () => {
    const hookSource = source();

    expect(hookSource).toContain('Issue prepared learner task');
    expect(hookSource).toContain('Record learner responses');
    expect(hookSource).toContain('Review learner work');
    expect(hookSource).toContain('Store reviewed assignment');
    expect(hookSource).toContain('Evidence pending for reviewed assignment');
  });
});
