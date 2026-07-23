import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { buildLearnerPortfolioHref } from '@/app/core/components/learners/learnerProfileNavigation';
import { buildPortfolioSourceRecordHref } from '@/app/core/components/portfolio/portfolioSourceNavigation';

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

  it('adds Portfolio return state to source record links without dropping source query params', () => {
    const portfolioHref = '/learners/18/portfolio?page=1&source=assignment&evidence=44&returnTo=%2Flearners%2F18%3Fback%3Dsort%253Dadmission_number%253Aasc%2526page%253D1%2526page_size%253D20%26section%3Dreports';
    const href = buildPortfolioSourceRecordHref({
      sourceHref: '/academic/cohorts/3/assignments/90?tab=evaluations',
      portfolioHref,
    });

    expect(href).toBe(
      '/academic/cohorts/3/assignments/90?tab=evaluations&returnTo=%2Flearners%2F18%2Fportfolio%3Fpage%3D1%26source%3Dassignment%26evidence%3D44%26returnTo%3D%252Flearners%252F18%253Fback%253Dsort%25253Dadmission_number%25253Aasc%252526page%25253D1%252526page_size%25253D20%2526section%253Dreports',
    );
  });

  it('replaces existing source returnTo and rejects unsafe Portfolio/source destinations', () => {
    expect(buildPortfolioSourceRecordHref({
      sourceHref: '/sessions/42?returnTo=%2Fsessions',
      portfolioHref: '/learners/18/portfolio?page=1&evidence=44',
    })).toBe('/sessions/42?returnTo=%2Flearners%2F18%2Fportfolio%3Fpage%3D1%26evidence%3D44');

    expect(buildPortfolioSourceRecordHref({
      sourceHref: 'https://evil.example/sessions/42',
      portfolioHref: '/learners/18/portfolio?page=1',
    })).toBeNull();
    expect(buildPortfolioSourceRecordHref({
      sourceHref: '/sessions/42',
      portfolioHref: '//evil.example/learners/18/portfolio',
    })).toBeNull();
  });

  it('keeps Portfolio source-record navigation wired to the full current Portfolio state', () => {
    const detailSource = readFileSync(join(root, 'app/core/components/portfolio/PortfolioEvidenceDetail.tsx'), 'utf8');
    const portfolioSource = readFileSync(join(root, 'app/core/components/portfolio/LearnerPortfolioPage.tsx'), 'utf8');
    const assignmentSource = readFileSync(join(root, 'app/core/components/assignments/CohortAssignmentDetailPage.tsx'), 'utf8');

    expect(detailSource).toContain('buildPortfolioSourceRecordHref');
    expect(detailSource).toContain('currentPortfolioHref');
    expect(detailSource).not.toContain('href={evidence.source_route.href}');
    expect(portfolioSource).toContain('buildPortfolioQuery(filters, selectedEvidenceId, returnTo)');
    expect(portfolioSource).toContain('currentPortfolioHref={currentPortfolioHref}');
    expect(assignmentSource).toContain('/^\\/learners\\/\\d+\\/portfolio');
  });
});
