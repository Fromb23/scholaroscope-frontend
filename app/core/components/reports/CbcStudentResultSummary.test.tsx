import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { CbcStudentResultSummary } from './CbcStudentResultSummary';
import type { CbcStudentSection } from '@/app/core/types/reporting';

function cbcSection(overrides: Partial<CbcStudentSection> = {}): CbcStudentSection {
  const section: CbcStudentSection = {
    reporting_source: 'cbc',
    curriculum_type: 'CBE',
    performance: {
      level: 'ME',
      label: 'Meeting Expectations',
      status: 'FINAL',
    },
    coverage: {
      outcomes_selected: 18,
      outcomes_taught: 14,
      outcomes_observed: 12,
      outcomes_taught_not_observed: 2,
    },
    distribution: {
      EE: 2,
      ME: 7,
      AE: 3,
      BE: 0,
      PROVISIONAL: 0,
      NO_EVIDENCE: 2,
    },
    strengths: [
      {
        outcome_id: 44,
        code: 'MAT.2.1',
        description: 'Uses place value to solve everyday problems.',
        level: 'EE',
      },
    ],
    support_needed: [
      {
        outcome_id: 52,
        code: 'MAT.3.2',
        description: 'Needs guided practice interpreting word problems.',
        level: 'AE',
      },
    ],
    evidence_summary: {
      total: 14,
      observations: 8,
      assignments: 3,
      group_assignments: 0,
      projects: 1,
      practicals: 0,
      assessments: 2,
      descriptive: 4,
      rubric: 8,
      numeric: 2,
      competency: 0,
    },
    teacher_review: {
      id: 5,
      teacher_remark: 'Shows steady mathematical reasoning during group tasks.',
      recommended_next_steps: ['Use number lines for multi-step problems.'],
      contextual_note: 'Reviewed after term evidence closed.',
      approved_at: null,
      approved_by: null,
      requires_re_review: false,
    },
    portfolio: {
      entries: [
        {
          evidence_id: 91,
          source_type: 'assignment',
          source_id: 17,
          learning_outcome: {
            id: 44,
            code: 'MAT.2.1',
            description: 'Uses place value to solve everyday problems.',
          },
          observed_at: '2026-06-01',
          performance_level: 'EE',
          evaluation_type: 'rubric',
          teacher_narrative: 'Explained the strategy clearly.',
          source_reference: 'Assignment 17',
        },
      ],
    },
    observation_records: [
      {
        learner: 7,
        learning_outcome: {
          id: 52,
          code: 'MAT.3.2',
          description: 'Interprets word problems.',
        },
        date: '2026-06-03',
        session: 33,
        evaluation_type: 'observation',
        performance_level: 'AE',
        teacher_narrative: 'Needed support identifying the operation.',
        follow_up: 'Revisit keywords in the next lesson.',
      },
    ],
    assessment_indicator: {
      weighted_score: 99.9,
      component_scores: { exam: 99.9 },
      diagnostic_scores: {},
      missing_components: [],
      result_status: 'FINAL',
      is_stale: false,
      computed_at: '2026-06-10T08:00:00Z',
    },
    cbc_result: {
      weighted_score: 99.9,
      cbc_level: 'EE',
      cbc_code: 'EE1',
      cbc_label: 'Exceeding Expectations',
      cbc_points: 4,
      result_status: 'FINAL',
      missing_components: [],
      component_scores: { exam: 99.9 },
      diagnostic_scores: {},
      is_stale: false,
      computed_at: '2026-06-10T08:00:00Z',
    },
    competency_result: {
      id: 77,
      performance: {
        level: 'ME',
        label: 'Meeting Expectations',
        status: 'FINAL',
      },
      coverage: {
        outcomes_selected: 18,
        outcomes_taught: 14,
        outcomes_observed: 12,
        outcomes_taught_not_observed: 2,
      },
      distribution: {
        EE: 2,
        ME: 7,
        AE: 3,
        BE: 0,
        PROVISIONAL: 0,
        NO_EVIDENCE: 2,
      },
      strengths: [
        {
          outcome_id: 44,
          code: 'MAT.2.1',
          description: 'Uses place value to solve everyday problems.',
          level: 'EE',
        },
      ],
      support_needed: [
        {
          outcome_id: 52,
          code: 'MAT.3.2',
          description: 'Needs guided practice interpreting word problems.',
          level: 'AE',
        },
      ],
      evidence_summary: {
        total: 14,
        observations: 8,
        assignments: 3,
        group_assignments: 0,
        projects: 1,
        practicals: 0,
        assessments: 2,
        descriptive: 4,
        rubric: 8,
        numeric: 2,
        competency: 0,
      },
      readiness: {
        has_result: true,
        is_stale: false,
        is_final: true,
        missing_requirements: [],
      },
      computed_at: '2026-06-10T08:00:00Z',
    },
    progress_summary: null,
    readiness: {
      has_result: true,
      is_stale: false,
      is_final: true,
      missing_requirements: [],
      missing_components: [],
    },
    note: null,
  };

  return { ...section, ...overrides };
}

function render(section: CbcStudentSection, canManageReview = false): string {
  return renderToStaticMarkup(createElement(CbcStudentResultSummary, { cbc: section, canManageReview }));
}

describe('CbcStudentResultSummary', () => {
  it('renders the backend competency performance as the primary CBC result', () => {
    const html = render(cbcSection());

    expect(html).toContain('CBC Competency Result');
    expect(html).toContain('ME');
    expect(html).toContain('Meeting Expectations');
    expect(html.indexOf('ME')).toBeLessThan(html.indexOf('Assessment computation details'));
    expect(html.indexOf('99.9%')).toBeGreaterThan(html.indexOf('Assessment computation details'));
  });

  it('shows coverage, distribution, strengths, support areas, and evidence summary', () => {
    const html = render(cbcSection());

    expect(html).toContain('Competency Coverage');
    expect(html).toContain('Outcome Distribution');
    expect(html).toContain('Strengths');
    expect(html).toContain('MAT.2.1');
    expect(html).toContain('Support Needed');
    expect(html).toContain('MAT.3.2');
    expect(html).toContain('Evidence Considered');
    expect(html).toContain('Observations');
    expect(html).toContain('Rubric');
  });

  it('renders teacher remarks, next steps, portfolio entries, and observations', () => {
    const html = render(cbcSection());

    expect(html).toContain('Shows steady mathematical reasoning');
    expect(html).toContain('Use number lines for multi-step problems.');
    expect(html).toContain('Portfolio And Observation Records');
    expect(html).toContain('Explained the strategy clearly.');
    expect(html).toContain('Needed support identifying the operation.');
    expect(html).not.toContain('Save Review');
  });

  it('renders teacher review editing controls only when explicitly allowed', () => {
    const learnerHtml = render(cbcSection());
    const teacherHtml = render(cbcSection(), true);

    expect(learnerHtml).not.toContain('Save Review');
    expect(teacherHtml).toContain('Save Review');
    expect(teacherHtml).toContain('Approve');
  });

  it('renders provisional, no-evidence, stale, and missing optional states without generic ranking', () => {
    const provisional = render(cbcSection({
      performance: { level: '', label: '', status: 'PROVISIONAL' },
      teacher_review: null,
      portfolio: null,
      observation_records: [],
      competency_result: {
        ...cbcSection().competency_result!,
        performance: { level: '', label: '', status: 'PROVISIONAL' },
        readiness: {
          has_result: true,
          is_stale: true,
          is_final: false,
          missing_requirements: ['MINIMUM_EVIDENCE_COUNT'],
        },
      },
      readiness: {
        has_result: true,
        is_stale: true,
        is_final: false,
        missing_requirements: ['MINIMUM_EVIDENCE_COUNT'],
      },
    }));
    const noEvidence = render(cbcSection({
      performance: { level: '', label: '', status: 'NO_EVIDENCE' },
      competency_result: {
        ...cbcSection().competency_result!,
        performance: { level: '', label: '', status: 'NO_EVIDENCE' },
      },
    }));

    expect(provisional).toContain('PROVISIONAL');
    expect(provisional).toContain('Stale');
    expect(provisional).toContain('MINIMUM EVIDENCE COUNT');
    expect(provisional).not.toContain('Position');
    expect(provisional).not.toContain('Rank');
    expect(provisional).not.toContain('Letter Grade');
    expect(noEvidence).toContain('NO EVIDENCE');
  });

  it('uses the CBC review endpoint and does not recalculate competency from weighted scores', () => {
    const componentSource = readFileSync(
      join(process.cwd(), 'app/core/components/reports/CbcStudentResultSummary.tsx'),
      'utf8',
    );
    const presentationSource = readFileSync(
      join(process.cwd(), 'app/core/lib/reportingPresentation.ts'),
      'utf8',
    );
    const apiSource = readFileSync(
      join(process.cwd(), 'app/core/api/reporting.ts'),
      'utf8',
    );

    expect(apiSource).toContain('/cbc/term-subject-results/${termSubjectResultId}/review/');
    expect(componentSource).toContain('cbcReportingAPI.updateSubjectReportReview');
    expect(`${componentSource}\n${presentationSource}`).not.toMatch(/weighted_score\s*[<>]=?/);
    expect(`${componentSource}\n${presentationSource}`).not.toMatch(/weighted_score\s*[+\-*/]/);
  });
});
