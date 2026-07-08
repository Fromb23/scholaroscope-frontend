import { describe, expect, it } from 'vitest';

import { buildCbcPolicyRuleSummary } from './policySummaries';

describe('CBC report policy summaries', () => {
  it('summarizes flexible policy config with requirements and fallback order', () => {
    const summary = buildCbcPolicyRuleSummary({
      assessment_weights: {
        CAT: 30,
        MAIN_EXAM: 70,
        MIDTERM: 0,
      },
      required_components: [],
      flexible_config: {
        final_requirements: [
          { assessment_type: 'CAT', min_count: 1 },
          { any_of: ['MAIN_EXAM', 'MIDTERM'] },
        ],
        component_fallbacks: {
          EXAM: ['MAIN_EXAM', 'MIDTERM'],
        },
      },
    });

    expect(summary).toEqual([
      'Final report requires:',
      'CAT evidence, at least 1 record',
      'Either Main Exam or Midterm',
      'Exam component uses Main Exam first; if missing, Midterm',
      'CAT contributes 30%',
      'Main Exam contributes 70%',
    ]);
  });

  it('summarizes legacy weighted CBC policies', () => {
    const summary = buildCbcPolicyRuleSummary({
      assessment_weights: {
        CAT: 40,
        MAIN_EXAM: 60,
      },
      required_components: ['MAIN_EXAM'],
      flexible_config: null,
    });

    expect(summary).toEqual([
      'Legacy weighted policy:',
      'CAT contributes 40%',
      'Main Exam contributes 60%',
      'Required: Main Exam',
    ]);
  });
});
