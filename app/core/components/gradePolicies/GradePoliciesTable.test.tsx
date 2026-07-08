import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import { GradePoliciesTable } from './GradePoliciesTable';
import type { GradePolicy } from '@/app/core/types/gradePolicy';

function basePolicy(overrides: Partial<GradePolicy> = {}): GradePolicy {
  return {
    id: 1,
    name: 'Generic policy',
    description: '',
    cohort_subject: null,
    cohort_subject_name: null,
    cohort: null,
    cohort_name: null,
    curriculum: null,
    curriculum_name: null,
    term: null,
    term_name: null,
    aggregation_method: 'WEIGHTED',
    default_weighting: {
      CAT: 40,
      MAIN_EXAM: 60,
    },
    required_components: ['MAIN_EXAM'],
    grading_scale: [],
    drop_lowest_cat: false,
    cap_cat_score: null,
    cap_exam_score: null,
    is_active: true,
    is_default: false,
    category_configs: [],
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    created_by: null,
    created_by_name: null,
    ...overrides,
  };
}

describe('generic grade policies table', () => {
  it('shows inactive guidance and available actions for inactive policies', () => {
    const html = renderToStaticMarkup(
      <GradePoliciesTable
        policies={[basePolicy({ is_active: false })]}
        deletingId={null}
        canManage
        onCreate={vi.fn()}
        onEdit={vi.fn()}
        onActivate={vi.fn()}
        onCreateActiveCopy={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    expect(html).toContain('This policy is inactive. It is saved but will not be used in report computation.');
    expect(html).toContain('Activate policy');
    expect(html).toContain('Create active copy');
  });
});
