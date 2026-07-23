import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { buildLearnerPortfolioHref } from '@/app/core/components/learners/learnerProfileNavigation';

const root = process.cwd();
const navSource = readFileSync(join(root, 'app/core/components/learners/learnerProfileNavigation.ts'), 'utf8');
const reportSource = readFileSync(join(root, 'app/core/components/reports/LearnerOverviewReportPage.tsx'), 'utf8');
const learnerSource = readFileSync(join(root, 'app/core/components/learners/LearnerDetailPage.tsx'), 'utf8');

describe('Portfolio navigation from learner and report surfaces', () => {
  it('builds direct learner portfolio links with report-compatible filters and returnTo', () => {
    const href = buildLearnerPortfolioHref(42, {
      academicYear: 2026,
      term: 3,
      cohortSubject: 9,
      outcome: 15,
      source: 'assessment',
      evidence: 77,
      returnTo: '/reports/learners/42/overview?term=3',
    });

    expect(href).toBe(
      '/learners/42/portfolio?academic_year=2026&term=3&cohort_subject=9&outcome=15&evidence=77&source=assessment&returnTo=%2Freports%2Flearners%2F42%2Foverview%3Fterm%3D3',
    );
    expect(navSource).toContain('buildLearnerPortfolioHref');
    expect(navSource).toContain("setPositiveParam(params, 'academic_year'");
    expect(navSource).toContain("setPositiveParam(params, 'term'");
    expect(navSource).toContain("setPositiveParam(params, 'cohort_subject'");
    expect(navSource).toContain("setPositiveParam(params, 'outcome'");
    expect(navSource).toContain("params.set('source'");
    expect(navSource).toContain("params.set('returnTo'");
  });

  it('adds report-to-portfolio links with applicable filters without renaming reports', () => {
    expect(reportSource).toContain('Learner Progress Report');
    expect(reportSource).toContain('Download PDF');
    expect(reportSource).toContain('View supporting evidence');
    expect(reportSource).toContain('buildLearnerPortfolioHref');
    expect(reportSource).toContain('term: termId');
    expect(reportSource).toContain('cohortSubject: area.cohort_subject_id');
    expect(reportSource).toContain('outcome: outcomeId');
    expect(reportSource).toContain('returnTo');
    expect(reportSource).not.toContain('<h1 className="text-2xl font-semibold theme-text">Learner Portfolio</h1>');
  });

  it('adds a learner profile portfolio entry while preserving report entries', () => {
    expect(learnerSource).toContain('Open Portfolio');
    expect(learnerSource).toContain('Open Overall Report');
    expect(learnerSource).toContain('Subject Report');
  });
});
