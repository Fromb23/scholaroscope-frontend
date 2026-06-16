import {
  AssessmentParticipationMode,
  AssessmentParticipationRecord,
  AssessmentParticipationStatus,
  type AssessmentParticipationSummary,
} from '../types/assessment';

export type AssessmentParticipationDetailSection =
  | 'markParticipation'
  | 'missedAssessment'
  | 'makeupCompleted'
  | 'readyForGrading'
  | 'lateOrNotPart';

export function getDefaultAssessmentParticipationMode(): AssessmentParticipationMode {
  return AssessmentParticipationMode.NONE;
}

export function tracksAssessmentParticipation(
  mode: AssessmentParticipationMode | null | undefined
): boolean {
  return mode === AssessmentParticipationMode.TRACKED;
}

export function isParticipationRecordReadyForGrading(
  record: Pick<AssessmentParticipationRecord, 'participation_status' | 'makeup_completed_at'>
): boolean {
  return (
    record.participation_status === AssessmentParticipationStatus.PRESENT
    || Boolean(record.makeup_completed_at)
  );
}

export function getReadyForGradingRecordIds(
  records: Array<Pick<AssessmentParticipationRecord, 'id' | 'participation_status' | 'makeup_completed_at'>>
): number[] {
  return records
    .filter(isParticipationRecordReadyForGrading)
    .map((record) => record.id);
}

export function getParticipationReadyForGradingCount(
  summary: Pick<
    AssessmentParticipationSummary,
    'sat_not_graded_count' | 'makeup_ready_for_grading_count'
  > | null | undefined
): number {
  if (!summary) {
    return 0;
  }

  return Math.max(summary.sat_not_graded_count, 0) + Math.max(summary.makeup_ready_for_grading_count, 0);
}

export function getDefaultAssessmentParticipationDetailSection(
  summary: Pick<
    AssessmentParticipationSummary,
    'pending_makeup_count' | 'makeup_ready_for_grading_count'
  > | null | undefined,
  records: Array<Pick<AssessmentParticipationRecord, 'expected_at_assessment_time' | 'participation_status'>>
): AssessmentParticipationDetailSection | null {
  const hasExpectedLearners = records.some((record) => record.expected_at_assessment_time);
  const hasMarkedExpectedLearners = records.some(
    (record) => record.expected_at_assessment_time
      && (
        record.participation_status === AssessmentParticipationStatus.PRESENT
        || record.participation_status === AssessmentParticipationStatus.ABSENT
      )
  );
  const hasUnmarkedExpectedLearners = records.some(
    (record) => record.expected_at_assessment_time && record.participation_status == null
  );

  if (hasExpectedLearners && !hasMarkedExpectedLearners && hasUnmarkedExpectedLearners) {
    return 'markParticipation';
  }

  if ((summary?.pending_makeup_count ?? 0) > 0) {
    return 'missedAssessment';
  }

  if ((summary?.makeup_ready_for_grading_count ?? 0) > 0) {
    return 'readyForGrading';
  }

  return null;
}
