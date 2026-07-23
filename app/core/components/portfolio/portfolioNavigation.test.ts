import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const navSource = readFileSync(join(root, 'app/core/components/learners/learnerProfileNavigation.ts'), 'utf8');
const reportSource = readFileSync(join(root, 'app/core/components/reports/LearnerOverviewReportPage.tsx'), 'utf8');
const learnerSource = readFileSync(join(root, 'app/core/components/learners/LearnerDetailPage.tsx'), 'utf8');

describe('Portfolio navigation from learner and report surfaces', () => {
  it('builds stable learner portfolio links with report-compatible filters', () => {
    expect(navSource).toContain('buildLearnerPortfolioHref');
    expect(navSource).toContain("setPositiveParam(params, 'term'");
    expect(navSource).toContain("setPositiveParam(params, 'cohort_subject'");
    expect(navSource).toContain("setPositiveParam(params, 'outcome'");
    expect(navSource).toContain("params.set('returnTo'");
  });

  it('adds report-to-portfolio links without renaming reports', () => {
    expect(reportSource).toContain('Learner Progress Report');
    expect(reportSource).toContain('Download PDF');
    expect(reportSource).toContain('View supporting evidence');
    expect(reportSource).toContain('buildLearnerPortfolioHref');
    expect(reportSource).not.toContain('<h1 className="text-2xl font-semibold theme-text">Learner Portfolio</h1>');
  });

  it('adds a learner profile portfolio entry while preserving report entries', () => {
    expect(learnerSource).toContain('Open Portfolio');
    expect(learnerSource).toContain('Open Overall Report');
    expect(learnerSource).toContain('Subject Report');
  });
});
