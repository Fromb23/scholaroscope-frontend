import { describe, expect, it } from 'vitest';
import {
  AssessmentParticipationMode,
  AssessmentParticipationStatus,
} from '../types/assessment';
import {
  getDefaultAssessmentParticipationMode,
  getReadyForGradingRecordIds,
  isParticipationRecordReadyForGrading,
  tracksAssessmentParticipation,
} from './assessmentParticipation';

describe('assessmentParticipation', () => {
  it('defaults new assessments to simple score entry mode', () => {
    expect(getDefaultAssessmentParticipationMode()).toBe(AssessmentParticipationMode.NONE);
  });

  it('flags only tracked assessments as participation-enabled', () => {
    expect(tracksAssessmentParticipation(AssessmentParticipationMode.TRACKED)).toBe(true);
    expect(tracksAssessmentParticipation(AssessmentParticipationMode.NONE)).toBe(false);
  });

  it('makes missed learners grading-eligible only after makeup completion', () => {
    const missedRecord = {
      id: 7,
      participation_status: AssessmentParticipationStatus.ABSENT,
      makeup_completed_at: null,
    };
    const makeupRecord = {
      ...missedRecord,
      makeup_completed_at: '2026-06-16T09:00:00Z',
    };

    expect(isParticipationRecordReadyForGrading(missedRecord)).toBe(false);
    expect(isParticipationRecordReadyForGrading(makeupRecord)).toBe(true);
    expect(getReadyForGradingRecordIds([missedRecord, makeupRecord])).toEqual([7]);
  });

  it('keeps late and not-part learners out of grading', () => {
    const readyIds = getReadyForGradingRecordIds([
      {
        id: 1,
        participation_status: AssessmentParticipationStatus.PRESENT,
        makeup_completed_at: null,
      },
      {
        id: 2,
        participation_status: AssessmentParticipationStatus.LATE_ENROLLED,
        makeup_completed_at: null,
      },
      {
        id: 3,
        participation_status: AssessmentParticipationStatus.NOT_PART_OF_ASSESSMENT,
        makeup_completed_at: null,
      },
    ]);

    expect(readyIds).toEqual([1]);
  });
});
