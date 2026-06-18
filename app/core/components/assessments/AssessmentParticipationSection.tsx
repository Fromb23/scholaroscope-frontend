'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { CheckSquare, ChevronDown, ChevronRight, RefreshCw, Users } from 'lucide-react';
import { Badge } from '@/app/components/ui/Badge';
import { Button } from '@/app/components/ui/Button';
import { Card } from '@/app/components/ui/Card';
import { ErrorBanner } from '@/app/components/ui/ErrorBanner';
import {
  AssessmentParticipationDetailSection,
  getDefaultAssessmentParticipationDetailSection,
  getParticipationReadyForGradingCount,
} from '@/app/core/lib/assessmentParticipation';
import {
  AssessmentParticipationRecord,
  AssessmentParticipationStatus,
  AssessmentParticipationSummary,
  AssessmentScoreStatus,
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
  onJumpToScoreEntry: () => void;
}

const metricLabelClass = 'text-xs font-medium uppercase tracking-wide text-gray-500';

function isRecordGraded(
  record: Pick<AssessmentParticipationRecord, 'grading_state' | 'has_score' | 'score_status'>
): boolean {
  return (
    record.grading_state === 'GRADED'
    || record.has_score
    || record.score_status === AssessmentScoreStatus.GRADED
  );
}

function getLateOrNotPartExplanation(record: Pick<AssessmentParticipationRecord, 'participation_status'>): string {
  if (record.participation_status === AssessmentParticipationStatus.LATE_ENROLLED) {
    return 'Joined after assessment and stays excluded from this participation roster.';
  }

  if (record.participation_status === AssessmentParticipationStatus.NOT_ADMITTED_YET) {
    return 'Not admitted at assessment time and stays excluded from this participation roster.';
  }

  if (record.participation_status === AssessmentParticipationStatus.NOT_ENROLLED_IN_SUBJECT) {
    return 'Not enrolled in subject at assessment time and stays excluded from this participation roster.';
  }

  return 'Was not part of the assessment roster at assessment time and stays read-only here.';
}

function getCountBadgeVariant(
  section: AssessmentParticipationDetailSection,
  count: number
): 'default' | 'warning' | 'info' | 'blue' {
  if (count === 0) {
    return 'default';
  }

  if (section === 'missedAssessment') {
    return 'warning';
  }

  if (section === 'makeupCompleted') {
    return 'blue';
  }

  if (section === 'readyForGrading') {
    return 'info';
  }

  return 'default';
}

function CollapsibleLearnerSection({
  section,
  title,
  description,
  count,
  open,
  onToggle,
  children,
}: {
  section: AssessmentParticipationDetailSection;
  title: string;
  description: string;
  count: number;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  const badgeVariant = getCountBadgeVariant(section, count);
  const sectionPanelId = `assessment-participation-${section}`;

  return (
    <section className="overflow-hidden rounded-xl border border-gray-200 bg-white">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={sectionPanelId}
        onClick={onToggle}
        className="theme-focus-ring flex w-full items-start justify-between gap-4 px-4 py-4 text-left transition-colors hover:bg-gray-50 sm:px-5"
      >
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            {open ? (
              <ChevronDown className="h-4 w-4 shrink-0 text-blue-600" />
            ) : (
              <ChevronRight className="h-4 w-4 shrink-0 text-gray-400" />
            )}
            <h3 className="text-sm font-semibold text-gray-900 sm:text-base">{title}</h3>
          </div>
          <p className="mt-1 text-sm text-gray-500">{description}</p>
        </div>
        <Badge variant={badgeVariant} className="shrink-0">
          {count}
        </Badge>
      </button>

      {open ? (
        <div id={sectionPanelId} className="border-t border-gray-200 px-4 py-4 sm:px-5">
          {children}
        </div>
      ) : null}
    </section>
  );
}

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
  onJumpToScoreEntry,
}: AssessmentParticipationSectionProps) {
  const [draftStatuses, setDraftStatuses] = useState<Record<number, AssessmentParticipationStatus>>({});
  const [detailPanelOpen, setDetailPanelOpen] = useState(loaded || loading);
  const [openSections, setOpenSections] = useState<Set<AssessmentParticipationDetailSection>>(new Set());
  const userToggledDetailPanelRef = useRef(false);
  const initializedSectionsRef = useRef(false);

  useEffect(() => {
    const nextDraft: Record<number, AssessmentParticipationStatus> = {};
    records.forEach((record) => {
      if (
        record.expected_at_assessment_time
        && record.participation_status
        && record.participation_status !== AssessmentParticipationStatus.NOT_PART_OF_ASSESSMENT
        && record.participation_status !== AssessmentParticipationStatus.LATE_ENROLLED
        && record.participation_status !== AssessmentParticipationStatus.NOT_ADMITTED_YET
        && record.participation_status !== AssessmentParticipationStatus.NOT_ENROLLED_IN_SUBJECT
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
  const makeupCompletedRecords = useMemo(
    () => records.filter((record) => Boolean(record.makeup_completed_at)),
    [records]
  );
  const readyForGradingRecords = useMemo(
    () => records.filter((record) => record.grading_eligible && !isRecordGraded(record)),
    [records]
  );
  const lateOrNotPartRecords = useMemo(
    () => records.filter(
      (record) => record.participation_status === AssessmentParticipationStatus.LATE_ENROLLED
        || record.participation_status === AssessmentParticipationStatus.NOT_PART_OF_ASSESSMENT
        || record.participation_status === AssessmentParticipationStatus.NOT_ADMITTED_YET
        || record.participation_status === AssessmentParticipationStatus.NOT_ENROLLED_IN_SUBJECT
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
  const readyForGradingCount = getParticipationReadyForGradingCount(summary);

  useEffect(() => {
    if (!userToggledDetailPanelRef.current && (loaded || loading)) {
      setDetailPanelOpen(true);
    }
  }, [loaded, loading]);

  useEffect(() => {
    if (!loaded || initializedSectionsRef.current) {
      return;
    }

    const defaultSection = getDefaultAssessmentParticipationDetailSection(summary, records);
    setOpenSections(defaultSection ? new Set([defaultSection]) : new Set());
    initializedSectionsRef.current = true;
  }, [loaded, records, summary]);

  const toggleSection = (section: AssessmentParticipationDetailSection) => {
    setOpenSections((current) => {
      const next = new Set(current);
      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }
      return next;
    });
  };

  const handleToggleDetailPanel = () => {
    userToggledDetailPanelRef.current = true;
    if (!detailPanelOpen && !loaded && !loading) {
      onLoad();
    }
    setDetailPanelOpen((current) => !current);
  };

  return (
    <Card>
      <div className="p-4 sm:p-6">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-gray-400" />
              <h2 className="text-base font-semibold text-gray-900">Assessment Participation</h2>
            </div>
            <p className="mt-1 text-sm text-gray-500">
              Keep the summary visible, then open only the learner group you need.
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Button size="sm" variant="secondary" onClick={handleToggleDetailPanel}>
              {!loaded && loading ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : detailPanelOpen ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
              {!loaded && loading
                ? 'Loading learner groups…'
                : loaded
                  ? (detailPanelOpen ? 'Hide learner groups' : 'Show learner groups')
                  : 'Open learner groups'}
            </Button>
          </div>
        </div>

        {summary && (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
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
              <p className={metricLabelClass}>Ready for Grading</p>
              <p className="mt-1 text-2xl font-semibold text-gray-900">{readyForGradingCount}</p>
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

        {detailPanelOpen && !loaded && (loading || Boolean(error)) && (
          <div className="mt-6 space-y-4 border-t border-gray-200 pt-6">
            {loading ? (
              <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-4 py-8 text-center">
                <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
                <p className="mt-3 text-sm text-gray-500">
                  Loading learner groups without blocking the rest of the page.
                </p>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-4 py-6 text-center">
                <p className="text-sm text-gray-500">
                  Learner groups did not load. Retry without leaving the assessment page.
                </p>
                <div className="mt-3">
                  <Button type="button" size="sm" variant="secondary" onClick={onLoad}>
                    Retry learner groups
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {detailPanelOpen && loaded && (
          <div className="mt-6 space-y-4 border-t border-gray-200 pt-6">
            {loading ? (
              <p className="text-sm text-gray-500">Refreshing learner groups…</p>
            ) : null}

            <CollapsibleLearnerSection
              section="markParticipation"
              title="Mark participation"
              description="Mark each expected learner as sat assessment or missed assessment, then save."
              count={expectedRecords.length}
              open={openSections.has('markParticipation')}
              onToggle={() => toggleSection('markParticipation')}
            >
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
                        className="flex flex-col gap-3 rounded-lg border border-gray-200 px-4 py-3 xl:flex-row xl:items-center xl:justify-between"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900">{record.student_name}</p>
                          <p className="mt-1 text-sm text-gray-500">
                            Admission No. {record.student_admission || '—'}
                          </p>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {currentStatus === AssessmentParticipationStatus.PRESENT ? (
                              <Badge variant="green">Sat assessment</Badge>
                            ) : currentStatus === AssessmentParticipationStatus.ABSENT ? (
                              <Badge variant="red">Missed assessment</Badge>
                            ) : (
                              <Badge variant="default">Not marked</Badge>
                            )}
                            {record.makeup_completed_at ? (
                              <Badge variant="blue">Makeup completed</Badge>
                            ) : null}
                            {isRecordGraded(record) ? (
                              <Badge variant="green">Graded</Badge>
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

                  {!readOnly && (
                    <div className="flex flex-col gap-3 rounded-lg border border-dashed border-gray-200 bg-gray-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-sm text-gray-500">
                        {changedRecords.length > 0
                          ? `${changedRecords.length} learner${changedRecords.length === 1 ? '' : 's'} changed and ready to save.`
                          : 'No unsaved participation changes.'}
                      </p>
                      <Button
                        size="sm"
                        onClick={() => onSave(changedRecords)}
                        disabled={saving || changedRecords.length === 0}
                      >
                        <CheckSquare className="h-4 w-4" />
                        {saving ? 'Saving…' : 'Save participation'}
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </CollapsibleLearnerSection>

            <CollapsibleLearnerSection
              section="missedAssessment"
              title="Missed assessment"
              description="These learners stay out of grading until makeup is marked complete."
              count={missedRecords.length}
              open={openSections.has('missedAssessment')}
              onToggle={() => toggleSection('missedAssessment')}
            >
              {missedRecords.length === 0 ? (
                <p className="rounded-lg border border-dashed border-gray-200 px-4 py-6 text-sm text-gray-500">
                  No learners are pending makeup.
                </p>
              ) : (
                <div className="space-y-3">
                  {missedRecords.map((record) => (
                    <div
                      key={record.id}
                      className="flex flex-col gap-3 rounded-lg border border-gray-200 px-4 py-3 xl:flex-row xl:items-center xl:justify-between"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900">{record.student_name}</p>
                        <p className="mt-1 text-sm text-gray-500">
                          Admission No. {record.student_admission || '—'}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <Badge variant="warning">Makeup pending</Badge>
                        </div>
                      </div>
                      {!readOnly ? (
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => onMarkMakeup(record.student, true)}
                          disabled={makeupSavingStudentId === record.student}
                        >
                          {makeupSavingStudentId === record.student ? 'Saving…' : 'Mark makeup completed'}
                        </Button>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
            </CollapsibleLearnerSection>

            <CollapsibleLearnerSection
              section="makeupCompleted"
              title="Makeup completed"
              description="Review which makeup learners are still waiting on grading and which ones are already graded."
              count={makeupCompletedRecords.length}
              open={openSections.has('makeupCompleted')}
              onToggle={() => toggleSection('makeupCompleted')}
            >
              {makeupCompletedRecords.length === 0 ? (
                <p className="rounded-lg border border-dashed border-gray-200 px-4 py-6 text-sm text-gray-500">
                  No learners have been marked as makeup completed yet.
                </p>
              ) : (
                <div className="space-y-3">
                  {makeupCompletedRecords.map((record) => {
                    const graded = isRecordGraded(record);
                    return (
                      <div
                        key={record.id}
                        className="flex flex-col gap-3 rounded-lg border border-gray-200 px-4 py-3 xl:flex-row xl:items-center xl:justify-between"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900">{record.student_name}</p>
                          <p className="mt-1 text-sm text-gray-500">
                            Admission No. {record.student_admission || '—'}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Badge variant="blue">Makeup completed</Badge>
                          <Badge variant={graded ? 'green' : 'warning'}>
                            {graded ? 'Graded' : 'Grading pending'}
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CollapsibleLearnerSection>

            <CollapsibleLearnerSection
              section="readyForGrading"
              title="Ready for grading"
              description="Use this as a checklist only. Enter actual scores in the grading table below."
              count={readyForGradingRecords.length}
              open={openSections.has('readyForGrading')}
              onToggle={() => toggleSection('readyForGrading')}
            >
              {readyForGradingRecords.length === 0 ? (
                <p className="rounded-lg border border-dashed border-gray-200 px-4 py-6 text-sm text-gray-500">
                  No learners are waiting in the ready-for-grading queue.
                </p>
              ) : (
                <div className="space-y-3">
                  <div className="flex flex-col gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-sm text-blue-700">
                      Use the grading table below for scoring. This list is a visibility aid so large classes stay manageable.
                    </p>
                    <Button type="button" size="sm" variant="secondary" onClick={onJumpToScoreEntry}>
                      Go to grading table
                    </Button>
                  </div>

                  {readyForGradingRecords.map((record) => (
                    <div
                      key={record.id}
                      className="flex flex-col gap-3 rounded-lg border border-gray-200 px-4 py-3 xl:flex-row xl:items-center xl:justify-between"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900">{record.student_name}</p>
                        <p className="mt-1 text-sm text-gray-500">
                          Admission No. {record.student_admission || '—'}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Badge variant={record.makeup_completed_at ? 'blue' : 'green'}>
                          {record.makeup_completed_at ? 'Makeup completed' : 'Sat assessment'}
                        </Badge>
                        <Badge variant="warning">Awaiting grading</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CollapsibleLearnerSection>

            <CollapsibleLearnerSection
              section="lateOrNotPart"
              title="Late enrolled / Not part"
              description="Read-only explanations for learners who stay outside this assessment roster."
              count={lateOrNotPartRecords.length}
              open={openSections.has('lateOrNotPart')}
              onToggle={() => toggleSection('lateOrNotPart')}
            >
              {lateOrNotPartRecords.length === 0 ? (
                <p className="rounded-lg border border-dashed border-gray-200 px-4 py-6 text-sm text-gray-500">
                  No late or excluded learners are recorded.
                </p>
              ) : (
                <div className="space-y-3">
                  {lateOrNotPartRecords.map((record) => (
                    <div
                      key={record.id}
                      className="flex flex-col gap-3 rounded-lg border border-gray-200 px-4 py-3 xl:flex-row xl:items-center xl:justify-between"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900">{record.student_name}</p>
                        <p className="mt-1 text-sm text-gray-500">
                          Admission No. {record.student_admission || '—'}
                        </p>
                        <p className="mt-2 text-sm text-gray-500">
                          {getLateOrNotPartExplanation(record)}
                        </p>
                      </div>
                      <Badge variant="default">{record.participation_status_display}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CollapsibleLearnerSection>
          </div>
        )}

        {!loaded && !loading && !detailPanelOpen && summary?.tracking_enabled && (
          <p className="mt-5 text-sm text-gray-500">
            Open learner groups only when you need to mark participation or review a specific learner list.
          </p>
        )}
      </div>
    </Card>
  );
}
