import { describe, expect, it } from 'vitest';

import {
  academicInsightActionLabel,
  academicInsightConfidenceVariant,
  academicInsightStatusTone,
  academicInsightTrendLabel,
  hasUnsupportedCausalAcademicLanguage,
} from './AcademicInsightPrimitives';

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
