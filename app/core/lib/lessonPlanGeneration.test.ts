import { describe, expect, it } from 'vitest';

import {
  containsInternalCurriculumIdentifier,
  getLessonGenerationBadge,
  getLessonGenerationSource,
  getStructuredLessonDraft,
} from './lessonPlanGeneration';
import type { LessonPlan } from '@/app/core/types/lessonPlans';

function lessonPlan(overrides: Partial<LessonPlan> = {}): LessonPlan {
  return {
    id: 1,
    organization: 1,
    session: null,
    session_title: null,
    session_date: null,
    cohort_subject: 1,
    cohort_subject_name: 'Grade 10 - Computer Studies',
    teacher: 1,
    teacher_name: 'Teacher',
    cohort: 1,
    cohort_name: 'Grade 10',
    subject: 1,
    subject_name: 'Computer Studies',
    curriculum: 1,
    curriculum_name: 'CBC',
    term: 1,
    term_name: 'Term 1',
    academic_year: 1,
    academic_year_name: '2026',
    title: 'Hardware lesson',
    status: 'GENERATED',
    planned_outcomes: [],
    planned_date: null,
    planned_start_time: null,
    planned_end_time: null,
    objectives: [],
    prior_knowledge: null,
    learning_resources: [],
    introduction: null,
    lesson_development: null,
    learner_activities: null,
    assessment_strategy: null,
    differentiation: null,
    conclusion: null,
    reflection: null,
    generated_context: null,
    generated_draft_snapshot: null,
    references_snapshot: [],
    generated_by_ai: false,
    ai_provider: null,
    ai_model: null,
    ai_fallback_reason: null,
    generated_at: '2026-02-10T09:00:00Z',
    reviewed_at: null,
    used_at: null,
    selected_references: [],
    created_at: '2026-02-10T09:00:00Z',
    updated_at: '2026-02-10T09:00:00Z',
    ...overrides,
  };
}

describe('lessonPlanGeneration helpers', () => {
  it('returns distinct badges for AI, repaired AI, and fallback sources', () => {
    expect(getLessonGenerationBadge(lessonPlan({
      generated_context: { generation: { generation_source: 'ai' } },
      generated_by_ai: true,
    })).label).toBe('AI-assisted draft');
    expect(getLessonGenerationBadge(lessonPlan({
      generated_context: { generation: { generation_source: 'ai_repaired' } },
      generated_by_ai: true,
    })).label).toBe('AI-assisted draft · validated');
    expect(getLessonGenerationBadge(lessonPlan({
      generated_context: { generation: { generation_source: 'fallback' } },
      ai_fallback_reason: 'timeout',
    })).label).toBe('Basic draft');
  });

  it('falls back to legacy generation flags for old records', () => {
    expect(getLessonGenerationSource(lessonPlan({ generated_by_ai: true }))).toBe('ai');
    expect(getLessonGenerationSource(lessonPlan({ ai_fallback_reason: 'timeout' }))).toBe('fallback');
  });

  it('parses structured draft snapshots and leaves legacy-only plans alone', () => {
    const structured = lessonPlan({
      generated_draft_snapshot: {
        structured_draft: {
          title: 'Hardware lesson',
          objectives: [{ text: 'Explain hardware.', source_outcome_ids: [12] }],
          prior_knowledge: 'Known parts',
          learning_resources: ['Textbook'],
          phases: [{
            phase_type: 'INTRODUCTION',
            title: 'Start',
            duration_minutes: 5,
            teacher_actions: ['Ask'],
            learner_actions: ['Answer'],
            resources: [],
            assessment_checks: ['Listen'],
            evidence_expected: ['Oral responses'],
          }],
          differentiation: { support: ['Prompt'], extension: ['Compare'] },
          conclusion: { teacher_actions: ['Summarise'], learner_actions: ['Exit'], exit_evidence: ['Answer'] },
          selected_reference_entry_ids: [8],
        },
      },
    });

    expect(getStructuredLessonDraft(structured)?.phases[0].duration_minutes).toBe(5);
    expect(getStructuredLessonDraft(lessonPlan())).toBeNull();
  });

  it('detects internal curriculum ids before normal rendering displays them', () => {
    expect(containsInternalCurriculumIdentifier('MATHEMATIC.grade9.strand1')).toBe(true);
    expect(containsInternalCurriculumIdentifier('Explain fractions in groups.')).toBe(false);
  });
});
