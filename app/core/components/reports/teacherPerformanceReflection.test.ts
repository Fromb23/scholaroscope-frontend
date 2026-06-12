import { describe, expect, it } from 'vitest';

import {
  getReflectionCardBodyText,
  MISSING_REFLECTION_TEXT_WARNING,
  prepareTeacherReflectionItem,
} from './teacherPerformanceReflection';

const TRIGONOMETRY_REFLECTION =
  'Learners actively participated in class,,they understood how to apply the trigonometric ratios to angles of depression,,,assignments was done well ,,,positive enough to say they understood,,Learning Outcomes was achieved';

const ANGLE_OF_ELEVATION_REFLECTION =
  'The learners understood how angle of elevation comes about and how to apply the tangent ratio to find height given distance and angle of elevation. The lesson was successfully achieved.';

function buildReflectionItem(overrides: Partial<{
  id: number | null;
  session_id: number | null;
  cohort_subject_id: number | null;
  subject_id: number | null;
  cohort_name: string;
  subject_name: string;
  session_title: string;
  session_date: string | null;
  created_at: string;
  excerpt: string;
  reflection_text: string | null;
}> = {}) {
  return {
    id: 1,
    session_id: 11,
    cohort_subject_id: 21,
    subject_id: 31,
    cohort_name: 'Grade 10',
    subject_name: 'Mathematics',
    session_title: 'Trigonometric Ratios',
    session_date: '2026-06-01',
    created_at: '2026-06-01T10:00:00Z',
    excerpt: '',
    reflection_text: TRIGONOMETRY_REFLECTION,
    ...overrides,
  };
}

describe('teacher reflection preview handling', () => {
  it('builds a word-safe preview from full reflection text and keeps it expandable', () => {
    const item = prepareTeacherReflectionItem(
      buildReflectionItem({
        excerpt: 'positive enough to say they u',
        reflection_text: TRIGONOMETRY_REFLECTION,
      }),
    );

    const collapsedText = getReflectionCardBodyText(item, false);
    const expandedText = getReflectionCardBodyText(item, true);

    expect(item.canExpand).toBe(true);
    expect(collapsedText.endsWith('they u')).toBe(false);
    expect(collapsedText.endsWith('…')).toBe(true);
    expect(expandedText).toContain('Learning Outcomes was achieved');
  });

  it('ignores a clipped excerpt when full reflection text is present', () => {
    const item = prepareTeacherReflectionItem(
      buildReflectionItem({
        id: 2,
        session_id: 12,
        excerpt: 'The lesson was successfully ach',
        reflection_text: ANGLE_OF_ELEVATION_REFLECTION,
      }),
    );

    const collapsedText = getReflectionCardBodyText(item, false);

    expect(collapsedText).not.toBe('The lesson was successfully ach');
    expect(collapsedText.endsWith('ach')).toBe(false);
    expect(item.hasPayloadWarning).toBe(false);
    expect(getReflectionCardBodyText(item, true)).toContain('successfully achieved.');
  });

  it('shows a payload warning when only an excerpt is available', () => {
    const item = prepareTeacherReflectionItem(
      buildReflectionItem({
        id: 3,
        session_id: 13,
        excerpt: 'positive enough to say they u',
        reflection_text: null,
      }),
    );

    expect(item.canExpand).toBe(false);
    expect(item.hasPayloadWarning).toBe(true);
    expect(item.fullText).toBeNull();
    expect(getReflectionCardBodyText(item, false)).toBe('positive enough to say they u');
    expect(MISSING_REFLECTION_TEXT_WARNING).toBe(
      'Full reflection text is not available in this report payload.',
    );
  });
});
