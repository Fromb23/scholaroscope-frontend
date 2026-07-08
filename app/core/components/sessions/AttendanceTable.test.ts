import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = () => readFileSync(
  join(process.cwd(), 'app/core/components/sessions/AttendanceTable.tsx'),
  'utf8',
);

describe('AttendanceTable learner navigation', () => {
  it('uses a provided learnerHrefBuilder when supplied', () => {
    const component = source();

    expect(component).toContain('learnerHrefBuilder?: (record: AttendanceRecord) => string');
    expect(component).toContain('const learnerHref = learnerHrefBuilder?.(r) ?? `/learners/${r.student}`;');
    expect(component).toContain('href={learnerHref}');
  });

  it('preserves the learner profile fallback when no builder is supplied', () => {
    const component = source();

    expect(component).toContain('?? `/learners/${r.student}`');
  });
});
