import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import {
  academicInsightActionLabel,
  academicInsightConfidenceVariant,
  academicInsightStatusTone,
  academicInsightTrendLabel,
  ClassSubjectIntelligencePanel,
  hasUnsupportedCausalAcademicLanguage,
} from './AcademicInsightPrimitives';
import type { ClassSubjectIntelligence } from '@/app/core/types/academicIntelligence';

function buildClassIntelligence(
  overrides?: Partial<ClassSubjectIntelligence>,
): ClassSubjectIntelligence {
  return {
    scope: {
      cohort_subject_id: 3,
      cohort_id: 5,
      cohort_name: 'Grade 10 Yellow',
      subject_id: 9,
      subject_name: 'Computer Studies',
      subject_code: 'CS',
      term_id: 7,
      term_name: 'Term 2',
      term_resolution: 'EXPLICIT',
    },
    status: 'NEEDS_MORE_EVIDENCE',
    status_label: 'Needs More Evidence',
    class_learning_picture: 'No reliable class-wide reteaching pattern has been identified.',
    teaching_priority: {
      state: 'COLLECT_EVIDENCE',
      headline: 'No reliable class-wide reteaching pattern has been identified.',
      why_it_matters:
        'Recorded lessons exist, but direct learner evidence is still too limited for a class conclusion.',
      confidence: 'LIMITED',
      recommended_action: {
        type: 'RECORD_EVIDENCE',
        message: 'Use a short evidence activity for "Early computing devices" before making a class judgement.',
      },
      priority_outcomes: [],
      supporting_counts: {
        outcomes_in_recorded_scope: 1,
        outcomes_not_in_recorded_scope: 4,
        outcomes_needing_evidence: 1,
        outcomes_needing_reteaching: 0,
        outcomes_with_broad_subject_evidence_only: 0,
      },
    },
    supporting_detail: {
      secure_outcomes: [],
      outcomes_not_in_recorded_scope: [],
      broad_subject_evidence_only_outcomes: [],
      subject_context: {},
      class_participation: {
        eligible_learner_count: 21,
        learners_needing_targeted_support: 0,
        learners_needing_more_evidence: 0,
        learners_needing_baseline: 0,
      },
      learners_needing_targeted_support: [],
      learners_needing_more_evidence: [],
      learners_needing_baseline: [],
      evidence_confidence_distribution: {
        HIGH: 0,
        MODERATE: 0,
        LIMITED: 21,
      },
    },
    computed_at: '2026-06-18T08:00:00Z',
    source_version: 'academic-intelligence-v2',
    visibility: 'instructor',
    ...overrides,
  };
}

describe('academic intelligence presentation helpers', () => {
  it('keeps status and confidence labels cognitive-light', () => {
    expect(academicInsightStatusTone('ON_TRACK')).toBe('success');
    expect(academicInsightStatusTone('NEEDS_MORE_EVIDENCE')).toBe('warning');
    expect(academicInsightConfidenceVariant('HIGH')).toBe('success');
    expect(academicInsightConfidenceVariant('LIMITED')).toBe('default');
  });

  it('formats trends and actions without enum-style text', () => {
    expect(academicInsightTrendLabel('TOO_EARLY_TO_TELL')).toBe('Too early to tell');
    expect(academicInsightTrendLabel('INSUFFICIENT_EVIDENCE')).toBe('Insufficient evidence');
    expect(academicInsightActionLabel('SHORT_DIAGNOSTIC')).toBe('Short Diagnostic');
    expect(academicInsightActionLabel('DIRECT_EVIDENCE')).toBe('Direct Evidence');
  });

  it('flags unsupported causal or punitive academic language', () => {
    expect(hasUnsupportedCausalAcademicLanguage('Attendance caused the decline.')).toBe(true);
    expect(hasUnsupportedCausalAcademicLanguage('The learner is lazy.')).toBe(true);
    expect(hasUnsupportedCausalAcademicLanguage('Reduced attendance may be contributing.')).toBe(false);
    expect(hasUnsupportedCausalAcademicLanguage('Evidence suggests a short diagnostic is recommended.')).toBe(false);
  });
});

describe('class academic intelligence panel', () => {
  it('does not render a no-exposure outcome as a default concern', () => {
    const html = renderToStaticMarkup(
      createElement(ClassSubjectIntelligencePanel, {
        intelligence: buildClassIntelligence({
          teaching_priority: {
            ...buildClassIntelligence().teaching_priority,
            state: 'RETHINK_EXPOSURE',
            priority_outcomes: [],
          },
          supporting_detail: {
            ...buildClassIntelligence().supporting_detail,
            outcomes_not_in_recorded_scope: [
              {
                id: 12,
                code: 'CS.G10.1.2',
                description: 'Computer generations',
                strand: 'History',
                sub_strand: 'Foundations',
                exposure_status: 'NOT_IN_RECORDED_TEACHING_SCOPE',
                evidence_gap_reason: 'NOT_IN_RECORDED_SCOPE',
                evidence_confidence: 'LIMITED',
                performance_signal: 'NOT_IN_SCOPE',
                class_score: null,
                weak_learner_count: 0,
                secure_learner_count: 0,
                eligible_learner_count: 21,
                learners_with_direct_evidence: 0,
                coverage_percent: 0,
                direct_evidence_count: 0,
                independent_source_count: 0,
                recorded_exposure_sources: [],
                recommended_action: 'No action is needed until this outcome enters recorded teaching scope.',
              },
            ],
          },
        }),
      }),
    );

    expect(html).not.toContain('Computer generations');
    expect(html).not.toContain('Needs More Evidence');
  });

  it('renders a clear evidence-collection action for taught outcomes without direct evidence', () => {
    const html = renderToStaticMarkup(
      createElement(ClassSubjectIntelligencePanel, {
        intelligence: buildClassIntelligence({
          teaching_priority: {
            ...buildClassIntelligence().teaching_priority,
            priority_outcomes: [
              {
                id: 10,
                code: 'CS.G10.1.1',
                description: 'Early computing devices',
                strand: 'History',
                sub_strand: 'Foundations',
                exposure_status: 'TAUGHT_NO_DIRECT_EVIDENCE',
                evidence_gap_reason: 'NO_DIRECT_LEARNER_EVIDENCE',
                evidence_confidence: 'LIMITED',
                performance_signal: 'INSUFFICIENT_DIRECT_EVIDENCE',
                class_score: null,
                weak_learner_count: 0,
                secure_learner_count: 0,
                eligible_learner_count: 21,
                learners_with_direct_evidence: 0,
                coverage_percent: 0,
                direct_evidence_count: 0,
                independent_source_count: 0,
                recorded_exposure_sources: [
                  {
                    type: 'COMPLETED_SESSION',
                    label: 'History of computers lesson',
                    date: '2026-06-11',
                  },
                ],
                recommended_action: 'Use a short exit task and record direct learner evidence.',
              },
            ],
          },
        }),
      }),
    );

    expect(html).toContain('Use a short evidence activity for');
    expect(html).toContain('Early computing devices');
  });

  it('renders a reteaching action when the supported class signal is weak', () => {
    const html = renderToStaticMarkup(
      createElement(ClassSubjectIntelligencePanel, {
        intelligence: buildClassIntelligence({
          status: 'NEEDS_SUPPORT',
          status_label: 'Needs Support',
          teaching_priority: {
            ...buildClassIntelligence().teaching_priority,
            state: 'RETEACH',
            confidence: 'MODERATE',
            headline: 'Evidence indicates that "Computer storage" may need a short class review.',
            why_it_matters:
              'Direct mapped evidence covers 18 of 21 eligible learners and the supported pattern is weak.',
            recommended_action: {
              type: 'RETEACH',
              message: 'Reteach "Computer storage", then record a short follow-up activity.',
            },
            priority_outcomes: [
              {
                id: 11,
                code: 'CS.G10.2.1',
                description: 'Computer storage',
                strand: 'Hardware',
                sub_strand: 'Storage',
                exposure_status: 'SUFFICIENT_DIRECT_EVIDENCE',
                evidence_gap_reason: 'NONE',
                evidence_confidence: 'MODERATE',
                performance_signal: 'SUPPORTED_WEAK',
                class_score: 28,
                weak_learner_count: 12,
                secure_learner_count: 1,
                eligible_learner_count: 21,
                learners_with_direct_evidence: 18,
                coverage_percent: 85.7,
                direct_evidence_count: 36,
                independent_source_count: 2,
                recorded_exposure_sources: [],
                recommended_action: 'Reteach "Computer storage" briefly, then record a short follow-up task.',
              },
            ],
            supporting_counts: {
              outcomes_in_recorded_scope: 3,
              outcomes_not_in_recorded_scope: 5,
              outcomes_needing_evidence: 0,
              outcomes_needing_reteaching: 1,
              outcomes_with_broad_subject_evidence_only: 0,
            },
          },
        }),
      }),
    );

    expect(html).toContain('Reteach');
    expect(html).toContain('Computer storage');
    expect(html).toContain('Term 2');
  });

  it('keeps curriculum codes secondary and supporting detail collapsed by default', () => {
    const html = renderToStaticMarkup(
      createElement(ClassSubjectIntelligencePanel, {
        intelligence: buildClassIntelligence({
          teaching_priority: {
            ...buildClassIntelligence().teaching_priority,
            priority_outcomes: [
              {
                id: 10,
                code: 'CS.G10.1.1',
                description: 'Early computing devices',
                strand: 'History',
                sub_strand: 'Foundations',
                exposure_status: 'TAUGHT_NO_DIRECT_EVIDENCE',
                evidence_gap_reason: 'NO_DIRECT_LEARNER_EVIDENCE',
                evidence_confidence: 'LIMITED',
                performance_signal: 'INSUFFICIENT_DIRECT_EVIDENCE',
                class_score: null,
                weak_learner_count: 0,
                secure_learner_count: 0,
                eligible_learner_count: 21,
                learners_with_direct_evidence: 0,
                coverage_percent: 0,
                direct_evidence_count: 0,
                independent_source_count: 0,
                recorded_exposure_sources: [],
                recommended_action: 'Use a short exit task and record direct learner evidence.',
              },
            ],
          },
        }),
      }),
    );

    expect(html).toContain('Early computing devices');
    expect(html).not.toContain('CS.G10.1.1');
    expect(html).toContain('See supporting evidence');
    expect(html).not.toContain('Recorded exposure');
  });
});
