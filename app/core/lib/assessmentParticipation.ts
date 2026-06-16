import {
  AssessmentParticipationMode,
  AssessmentParticipationRecord,
  AssessmentParticipationStatus,
} from '../types/assessment';

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
