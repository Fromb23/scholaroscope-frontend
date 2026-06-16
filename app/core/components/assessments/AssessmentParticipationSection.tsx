'use client';

import { useEffect, useMemo, useState } from 'react';
import { CheckSquare, RefreshCw, Users } from 'lucide-react';
import { Badge } from '@/app/components/ui/Badge';
import { Button } from '@/app/components/ui/Button';
import { Card } from '@/app/components/ui/Card';
import { ErrorBanner } from '@/app/components/ui/ErrorBanner';
import {
  AssessmentParticipationRecord,
  AssessmentParticipationStatus,
  AssessmentParticipationSummary,
} from '@/app/core/types/assessment';

interface AssessmentParticipationSectionProps {
  summary: AssessmentParticipationSummary | null;
  records: AssessmentParticipationRecord[];
  loaded: boolean;
  loading: boolean;
  saving: boolean;
  error: string | null;
  makeupSavingStudentId: number | null;
  readOnly: boolean;
  onLoad: () => void;
  onSave: (
    records: {
      student_id: number;
      participation_status: AssessmentParticipationStatus;
    }[]
  ) => void;
  onMarkMakeup: (studentId: number, completed?: boolean) => void;
}

const metricLabelClass = 'text-xs font-medium uppercase tracking-wide text-gray-500';

export function AssessmentParticipationSection({
  summary,
  records,
  loaded,
  loading,
  saving,
  error,
  makeupSavingStudentId,
  readOnly,
  onLoad,
  onSave,
  onMarkMakeup,
}: AssessmentParticipationSectionProps) {
  const [draftStatuses, setDraftStatuses] = useState<Record<number, AssessmentParticipationStatus>>({});

  useEffect(() => {
    const nextDraft: Record<number, AssessmentParticipationStatus> = {};
    records.forEach((record) => {
      if (
        record.expected_at_assessment_time
        && record.participation_status
        && record.participation_status !== AssessmentParticipationStatus.NOT_PART_OF_ASSESSMENT
        && record.participation_status !== AssessmentParticipationStatus.LATE_ENROLLED
      ) {
        nextDraft[record.student] = record.participation_status;
      }
    });
    setDraftStatuses(nextDraft);
  }, [records]);

  const expectedRecords = useMemo(
    () => records.filter(
      (record) => record.expected_at_assessment_time
        && record.participation_status !== AssessmentParticipationStatus.NOT_PART_OF_ASSESSMENT
    ),
    [records]
  );
  const missedRecords = useMemo(
    () => records.filter(
      (record) => record.participation_status === AssessmentParticipationStatus.ABSENT && !record.makeup_completed_at
    ),
    [records]
  );
  const lateOrNotPartRecords = useMemo(
    () => records.filter(
      (record) => record.participation_status === AssessmentParticipationStatus.LATE_ENROLLED
        || record.participation_status === AssessmentParticipationStatus.NOT_PART_OF_ASSESSMENT
    ),
    [records]
  );
  const changedRecords = useMemo(() => expectedRecords.flatMap((record) => {
    const nextStatus = draftStatuses[record.student];
    if (!nextStatus || nextStatus === record.participation_status) {
      return [];
    }
    return [{
      student_id: record.student,
      participation_status: nextStatus,
    }];
  }), [draftStatuses, expectedRecords]);

  return (
    <Card>
      <div className="p-4 sm:p-6">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-gray-400" />
              <h2 className="text-base font-semibold text-gray-900">Participation</h2>
            </div>
            <p className="mt-1 text-sm text-gray-500">
              Track who sat this assessment before grading.
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {!loaded && (
              <Button size="sm" variant="secondary" onClick={onLoad} disabled={loading}>
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                {loading ? 'Loading…' : 'Open roster'}
              </Button>
            )}
            {loaded && !readOnly && (
              <Button
                size="sm"
                onClick={() => onSave(changedRecords)}
                disabled={saving || changedRecords.length === 0}
              >
                <CheckSquare className="h-4 w-4" />
                {saving ? 'Saving…' : 'Save participation'}
              </Button>
            )}
          </div>
        </div>

        {summary && (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
            <div>
              <p className={metricLabelClass}>Sat</p>
              <p className="mt-1 text-2xl font-semibold text-gray-900">{summary.sat_count}</p>
            </div>
            <div>
              <p className={metricLabelClass}>Missed</p>
              <p className="mt-1 text-2xl font-semibold text-gray-900">{summary.missed_count}</p>
            </div>
            <div>
              <p className={metricLabelClass}>Makeup Completed</p>
              <p className="mt-1 text-2xl font-semibold text-gray-900">{summary.makeup_completed_count}</p>
            </div>
            <div>
              <p className={metricLabelClass}>Pending Makeup</p>
              <p className="mt-1 text-2xl font-semibold text-gray-900">{summary.pending_makeup_count}</p>
            </div>
            <div>
              <p className={metricLabelClass}>Graded</p>
              <p className="mt-1 text-2xl font-semibold text-gray-900">{summary.graded_count}</p>
            </div>
            <div>
              <p className={metricLabelClass}>Late / Not Part</p>
              <p className="mt-1 text-2xl font-semibold text-gray-900">
                {summary.late_enrolled_count + summary.not_part_of_assessment_count}
              </p>
            </div>
          </div>
        )}

        {error && (
          <div className="mt-5">
            <ErrorBanner message={error} onDismiss={() => undefined} />
          </div>
        )}

        {loaded && (
          <div className="mt-6 space-y-6">
            <section>
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">Expected learners</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Mark each learner as sat assessment or missed assessment.
                  </p>
                </div>
                <Badge variant="default">{expectedRecords.length}</Badge>
              </div>
              {expectedRecords.length === 0 ? (
                <p className="rounded-lg border border-dashed border-gray-200 px-4 py-6 text-sm text-gray-500">
                  No expected learners were captured for this assessment.
                </p>
              ) : (
                <div className="space-y-3">
                  {expectedRecords.map((record) => {
                    const currentStatus = draftStatuses[record.student] ?? record.participation_status;
                    return (
                      <div
                        key={record.id}
                        className="flex flex-col gap-3 rounded-lg border border-gray-200 px-4 py-3 lg:flex-row lg:items-center lg:justify-between"
                      >
                        <div>
                          <p className="text-sm font-medium text-gray-900">{record.student_name}</p>
                          <p className="mt-1 text-sm text-gray-500">
                            Admission No. {record.student_admission || '—'}
                          </p>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {record.makeup_completed_at ? (
                              <Badge variant="green">Makeup completed</Badge>
                            ) : null}
                            {record.grading_state === 'GRADED' ? (
                              <Badge variant="blue">Graded</Badge>
                            ) : null}
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant={currentStatus === AssessmentParticipationStatus.PRESENT ? 'primary' : 'secondary'}
                            disabled={readOnly}
                            onClick={() => setDraftStatuses((current) => ({
                              ...current,
                              [record.student]: AssessmentParticipationStatus.PRESENT,
                            }))}
                          >
                            Sat assessment
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant={currentStatus === AssessmentParticipationStatus.ABSENT ? 'danger' : 'secondary'}
                            disabled={readOnly}
                            onClick={() => setDraftStatuses((current) => ({
                              ...current,
                              [record.student]: AssessmentParticipationStatus.ABSENT,
                            }))}
                          >
                            Missed assessment
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            <section className="border-t border-gray-200 pt-6">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">Missed learners</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Learners stay out of grading until makeup is marked complete.
                  </p>
                </div>
                <Badge variant="default">{missedRecords.length}</Badge>
              </div>
              {missedRecords.length === 0 ? (
                <p className="rounded-lg border border-dashed border-gray-200 px-4 py-6 text-sm text-gray-500">
                  No learners are pending makeup.
                </p>
              ) : (
                <div className="space-y-3">
                  {missedRecords.map((record) => (
                    <div
                      key={record.id}
                      className="flex flex-col gap-3 rounded-lg border border-gray-200 px-4 py-3 lg:flex-row lg:items-center lg:justify-between"
                    >
                      <div>
                        <p className="text-sm font-medium text-gray-900">{record.student_name}</p>
                        <p className="mt-1 text-sm text-gray-500">
                          Admission No. {record.student_admission || '—'}
                        </p>
                      </div>
                      {!readOnly && (
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => onMarkMakeup(record.student, true)}
                          disabled={makeupSavingStudentId === record.student}
                        >
                          {makeupSavingStudentId === record.student ? 'Saving…' : 'Mark makeup completed'}
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="border-t border-gray-200 pt-6">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">Late or not part of assessment</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Visible for explanation only. These learners do not enter grading.
                  </p>
                </div>
                <Badge variant="default">{lateOrNotPartRecords.length}</Badge>
              </div>
              {lateOrNotPartRecords.length === 0 ? (
                <p className="rounded-lg border border-dashed border-gray-200 px-4 py-6 text-sm text-gray-500">
                  No late or excluded learners are recorded.
                </p>
              ) : (
                <div className="space-y-3">
                  {lateOrNotPartRecords.map((record) => (
                    <div
                      key={record.id}
                      className="flex flex-col gap-3 rounded-lg border border-gray-200 px-4 py-3 lg:flex-row lg:items-center lg:justify-between"
                    >
                      <div>
                        <p className="text-sm font-medium text-gray-900">{record.student_name}</p>
                        <p className="mt-1 text-sm text-gray-500">
                          Admission No. {record.student_admission || '—'}
                        </p>
                      </div>
                      <Badge variant="default">{record.participation_status_display}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}

        {!loaded && !loading && summary?.tracking_enabled && (
          <p className="mt-5 text-sm text-gray-500">
            Open the roster when you are ready to mark sat or missed learners.
          </p>
        )}
      </div>
    </Card>
  );
}
