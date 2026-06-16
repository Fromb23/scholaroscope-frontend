import { describe, expect, it } from 'vitest';
import {
  AssessmentParticipationMode,
  AssessmentParticipationStatus,
} from '../types/assessment';
import {
  getDefaultAssessmentParticipationDetailSection,
  getParticipationReadyForGradingCount,
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

  it('adds sat and makeup-ready learners into the ready-for-grading summary total', () => {
    expect(getParticipationReadyForGradingCount({
      sat_not_graded_count: 5,
      makeup_ready_for_grading_count: 2,
    })).toBe(7);
  });

  it('opens mark participation first when expected learners are still unmarked', () => {
    expect(getDefaultAssessmentParticipationDetailSection(
      {
        pending_makeup_count: 0,
        makeup_ready_for_grading_count: 0,
      },
      [
        {
          expected_at_assessment_time: true,
          participation_status: null,
        },
        {
          expected_at_assessment_time: true,
          participation_status: null,
        },
      ]
    )).toBe('markParticipation');
  });

  it('prioritizes missed assessment when makeup is still pending', () => {
    expect(getDefaultAssessmentParticipationDetailSection(
      {
        pending_makeup_count: 3,
        makeup_ready_for_grading_count: 1,
      },
      [
        {
          expected_at_assessment_time: true,
          participation_status: AssessmentParticipationStatus.PRESENT,
        },
      ]
    )).toBe('missedAssessment');
  });

  it('opens ready for grading when makeup completion is waiting on grading', () => {
    expect(getDefaultAssessmentParticipationDetailSection(
      {
        pending_makeup_count: 0,
        makeup_ready_for_grading_count: 2,
      },
      [
        {
          expected_at_assessment_time: true,
          participation_status: AssessmentParticipationStatus.ABSENT,
        },
      ]
    )).toBe('readyForGrading');
  });

  it('keeps detailed learner groups collapsed when there is no priority workflow', () => {
    expect(getDefaultAssessmentParticipationDetailSection(
      {
        pending_makeup_count: 0,
        makeup_ready_for_grading_count: 0,
      },
      [
        {
          expected_at_assessment_time: true,
          participation_status: AssessmentParticipationStatus.PRESENT,
        },
      ]
    )).toBeNull();
  });
});
