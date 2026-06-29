import { describe, expect, it } from 'vitest';
import { getAssessmentCurrentStage } from './AssessmentStageActionCard';

describe('AssessmentStageActionCard stage mapping', () => {
  it('shows draft assessments as Prepared', () => {
    expect(getAssessmentCurrentStage({
      isDraft: true,
      isActive: false,
      isFinalized: false,
      scoredCount: 0,
      unscoredCount: 20,
      canFinalize: false,
    })).toBe('Prepared');
  });

  it('shows active assessments with learner rows as Scores', () => {
    expect(getAssessmentCurrentStage({
      isDraft: false,
      isActive: true,
      isFinalized: false,
      scoredCount: 5,
      unscoredCount: 15,
      canFinalize: true,
    })).toBe('Scores');
  });

  it('shows active assessments ready to finalize as Review', () => {
    expect(getAssessmentCurrentStage({
      isDraft: false,
      isActive: true,
      isFinalized: false,
      scoredCount: 20,
      unscoredCount: 0,
      canFinalize: true,
    })).toBe('Review');
  });

  it('shows finalized assessments as Finalized', () => {
    expect(getAssessmentCurrentStage({
      isDraft: false,
      isActive: false,
      isFinalized: true,
      scoredCount: 20,
      unscoredCount: 0,
      canFinalize: false,
    })).toBe('Finalized');
  });
});
