import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import {
  CbcReportPoliciesTable,
  getCbcReportPolicyScopeBadges,
} from './CbcReportPoliciesTable';
import type { CbcReportPolicy } from '@/app/plugins/cbc/types/reportPolicy';

function basePolicy(overrides: Partial<CbcReportPolicy> = {}): CbcReportPolicy {
  return {
    id: 1,
    name: 'CBC report policy',
    description: null,
    organization: 3,
    subject_profile: null,
    subject_profile_name: null,
    cohort: null,
    cohort_name: null,
    cbc_cohort_subject: null,
    cbc_cohort_subject_name: null,
    term: null,
    term_name: null,
    assessment_weights: {
      MIDTERM: 40,
      MAIN_EXAM: 60,
    },
    level_scale: [
      {
        min: 0,
        max: 100,
        level: 'ME',
        code: 'ME1',
        label: 'Meeting Expectations',
        points: 3,
      },
    ],
    diagnostic_assessment_types: [],
    required_components: ['MAIN_EXAM'],
    include_assignments: true,
    include_projects: true,
    include_practicals: true,
    rounding_mode: 'ROUND_HALF_UP',
    is_default: false,
    is_active: true,
    created_by: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

function renderTable(
  policies: CbcReportPolicy[],
  authoringMode: 'CLASS_SETUP' | 'INSTITUTION_GOVERNANCE' = 'INSTITUTION_GOVERNANCE',
) {
  return renderToStaticMarkup(
    <CbcReportPoliciesTable
      policies={policies}
      canManage
      authoringMode={authoringMode}
      deletingId={null}
      onCreate={vi.fn()}
      onEdit={vi.fn()}
      onDelete={vi.fn()}
    />,
  );
}

describe('CBC report policies table', () => {
  it('renders class, subject, default, subject-profile, and term scopes clearly', () => {
    const html = renderTable([
      basePolicy({
        id: 1,
        name: 'Whole class',
        cohort: 9,
        cohort_name: 'Grade 7',
      }),
      basePolicy({
        id: 2,
        name: 'Subject',
        cohort: 9,
        cohort_name: 'Grade 7',
        cbc_cohort_subject: 41,
        cbc_cohort_subject_name: 'Grade 7 - Mathematics',
        subject_profile: 12,
        subject_profile_name: 'Mathematics',
        term: 3,
        term_name: 'Term 1',
      }),
      basePolicy({
        id: 3,
        name: 'Workspace default',
        is_default: true,
      }),
      basePolicy({
        id: 4,
        name: 'Institution subject profile',
        subject_profile: 12,
        subject_profile_name: 'Mathematics',
      }),
    ]);

    expect(html).toContain('Whole class policy: Grade 7');
    expect(html).toContain('Subject policy: Grade 7 - Mathematics');
    expect(html).toContain('Workspace default policy');
    expect(html).toContain('Subject profile: Mathematics');
    expect(html).toContain('Term: Term 1');
  });

  it('does not label a class-subject policy as a whole-class policy', () => {
    const badges = getCbcReportPolicyScopeBadges(basePolicy({
      cohort: 9,
      cohort_name: 'Grade 7',
      cbc_cohort_subject: 41,
      cbc_cohort_subject_name: 'Grade 7 - Mathematics',
    }));

    expect(badges.map((badge) => badge.label)).toEqual([
      'Subject policy: Grade 7 - Mathematics',
    ]);
  });

  it('keeps global view links in institution governance but hides them in class setup', () => {
    const policy = basePolicy({ id: 99, cohort: 9, cohort_name: 'Grade 7' });

    expect(renderTable([policy], 'INSTITUTION_GOVERNANCE')).toContain('/cbc/report-policies/99');
    expect(renderTable([policy], 'CLASS_SETUP')).not.toContain('/cbc/report-policies/99');
  });
});
