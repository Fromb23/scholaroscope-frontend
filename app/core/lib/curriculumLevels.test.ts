import { describe, expect, it } from 'vitest';

import {
  getAcademicLevelLabel,
  getCurriculumLevelOptions,
  isStructuredCurriculumLevel,
  normalizeAcademicLevel,
} from './curriculumLevels';

describe('curriculumLevels', () => {
  it('normalizes legacy CBC level values to canonical values', () => {
    expect(normalizeAcademicLevel('Grade 10')).toBe('grade10');
    expect(normalizeAcademicLevel('grade 10')).toBe('grade10');
    expect(normalizeAcademicLevel('Grade10')).toBe('grade10');
    expect(normalizeAcademicLevel('G10')).toBe('grade10');
    expect(normalizeAcademicLevel('Pre-primary 1')).toBe('pp1');
    expect(normalizeAcademicLevel('pp2')).toBe('pp2');
  });

  it('does not promote non-level senior aliases into canonical senior levels', () => {
    expect(normalizeAcademicLevel('senior')).toBe('senior');
    expect(normalizeAcademicLevel('snr')).toBe('snr');
    expect(normalizeAcademicLevel('senior school')).toBe('seniorschool');
  });

  it('returns structured CBC/CBE level options', () => {
    expect(isStructuredCurriculumLevel('CBE')).toBe(true);
    expect(isStructuredCurriculumLevel('CAMBRIDGE')).toBe(false);
    expect(getCurriculumLevelOptions('CBE')).toHaveLength(14);
  });

  it('renders human-readable labels for canonical and legacy level values', () => {
    expect(getAcademicLevelLabel('grade10', 'CBE')).toBe('Grade 10');
    expect(getAcademicLevelLabel('Grade 10', 'CBE')).toBe('Grade 10');
    expect(getAcademicLevelLabel('pp1', 'CBE')).toBe('Pre-primary 1');
    expect(getAcademicLevelLabel('form3', null)).toBe('Form 3');
  });
});
