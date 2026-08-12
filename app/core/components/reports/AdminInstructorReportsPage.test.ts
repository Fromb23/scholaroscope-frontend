import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const pageSource = readFileSync(
  join(process.cwd(), 'app/core/components/reports/AdminInstructorReportsPage.tsx'),
  'utf8',
);

describe('AdminInstructorReportsPage lifecycle participants', () => {
  it('keeps restricted instructors searchable and visibly distinct', () => {
    expect(pageSource).toContain('instructor.email');
    expect(pageSource).toContain("instructor.status === 'RESTRICTED'");
    expect(pageSource).toContain("'Access restricted'");
    expect(pageSource).toContain("'Restricted'");
  });
});
