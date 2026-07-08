import { describe, expect, it } from 'vitest';

import { buildGradePolicyRuleSummary } from './policySummaries';

describe('generic policy summaries', () => {
  it('summarizes legacy weighted policies in academic language', () => {
    const summary = buildGradePolicyRuleSummary({
      category_configs: [],
      default_weighting: {
        CAT: 40,
        MAIN_EXAM: 60,
      },
      required_components: ['MAIN_EXAM'],
    });

    expect(summary).toEqual([
      'Legacy weighted policy:',
      'CAT contributes 40%',
      'Main Exam contributes 60%',
      'Required: Main Exam',
    ]);
  });
});
