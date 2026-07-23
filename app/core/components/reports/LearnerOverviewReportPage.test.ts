import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

function read(relativePath: string): string {
  return readFileSync(join(root, relativePath), 'utf8');
}

describe('LearnerOverviewReportPage', () => {
  it('is rendered by the learner-specific overview route wrapper', () => {
    const routePath = 'app/(dashboard)/reports/learners/[learnerId]/overview/page.tsx';
    const routeSource = read(routePath);

    expect(existsSync(join(root, routePath))).toBe(true);
    expect(routeSource).toContain('LearnerOverviewReportPage');
    expect(routeSource).not.toContain('redirect');
    expect(routeSource).not.toContain('/reports/instructor');
  });

  it('loads the selected learner report and preserves safe Back state', () => {
    const pageSource = read('app/core/components/reports/LearnerOverviewReportPage.tsx');

    expect(pageSource).toContain('useParams<{ learnerId: string }>()');
    expect(pageSource).toContain('useLearnerTermProgressReport');
    expect(pageSource).toContain('sanitizeAppDestination');
    expect(pageSource).toContain('`/learners/${learnerId}`');
    expect(pageSource).toContain('<Link href={returnTo}>');
    expect(pageSource).not.toContain('/reports/instructor');
  });
});
