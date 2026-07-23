import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = () => readFileSync(
  join(process.cwd(), 'app/core/components/reports/LearnerAssignmentReportPage.tsx'),
  'utf8',
);

describe('LearnerAssignmentReportPage', () => {
  it('uses the assignment report hook and renders normalized assignment rows', () => {
    const pageSource = source();

    expect(pageSource).toContain('useLearnerAssignmentReport');
    expect(pageSource).toContain('assignment_rows');
    expect(pageSource).toContain('delivery_mode');
    expect(pageSource).toContain('attachment_metadata');
    expect(pageSource).toContain('group_member_participation_status');
    expect(pageSource).toContain('evidence_status');
  });

  it('reads cohort-subject, highlighted assignment and safe return state from the URL', () => {
    const pageSource = source();

    expect(pageSource).toContain("searchParams.get('cohort_subject')");
    expect(pageSource).toContain("searchParams.get('highlightAssignment')");
    expect(pageSource).toContain("isSafeNextPath(searchParams.get('returnTo'))");
    expect(pageSource).toContain('row.assignment_id === highlightAssignment');
    expect(pageSource).toContain('<Link href={returnTo}>');
  });
});
