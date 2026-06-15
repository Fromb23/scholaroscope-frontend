'use client';

import Link from 'next/link';
import { useCallback, useEffect } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowLeft,
  BookOpen,
  Calendar,
  Download,
  GraduationCap,
  Users,
} from 'lucide-react';
import { Badge } from '@/app/components/ui/Badge';
import { Button } from '@/app/components/ui/Button';
import { Card } from '@/app/components/ui/Card';
import { ErrorBanner } from '@/app/components/ui/ErrorBanner';
import { LoadingSpinner } from '@/app/components/ui/LoadingSpinner';
import { Select } from '@/app/components/ui/Select';
import { StatsCard } from '@/app/components/dashboard/StatsCard';
import { downloadBlob } from '@/app/core/api/downloads';
import { adminReportsAPI } from '@/app/core/api/reporting';
import { AdminReportAccessGate } from '@/app/core/components/reports/AdminReportAccessGate';
import { CurriculumSubjectReportCard } from '@/app/core/components/reports/CurriculumSubjectReportCard';
import {
  buildAttendanceReportHref,
  buildCbcCohortProgressHref,
  buildCohortReportHref,
  buildCohortSubjectReportHref,
  buildInstructorReportHref,
  buildReportReturnTo,
  buildSubjectReportHref,
  parsePositiveReportParam,
  resolveReportBackHref,
} from '@/app/core/components/reports/reportNavigation';
import { useCurrentTerm, useTerms } from '@/app/core/hooks/useAcademic';
import { useCohorts } from '@/app/core/hooks/useCohorts';
import { useClassSummary } from '@/app/core/hooks/useReporting';
import { formatPercent } from '@/app/core/lib/reportingPresentation';
import type { ReportAssignedInstructor, ReportExportFormat } from '@/app/core/types/reporting';
import { extractErrorMessage, type ApiError } from '@/app/core/types/errors';

function InstructorsLine({
  instructors,
  termId,
  returnTo,
}: {
  instructors: ReportAssignedInstructor[];
  termId: number | null;
  returnTo: string;
}) {
  if (instructors.length === 0) {
    return <span className="text-sm text-gray-500">Unassigned instructor</span>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {instructors.map((instructor) => (
        <Link
          key={instructor.id}
          href={buildInstructorReportHref(instructor.id, {
            term: termId,
            returnTo,
          })}
        >
          <Badge variant="blue">{instructor.name}</Badge>
        </Link>
      ))}
    </div>
  );
}

export function CohortsReportPage({
  cohortIdFromRoute = null,
}: {
  cohortIdFromRoute?: number | null;
} = {}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const selectedTermId = parsePositiveReportParam(searchParams.get('term'));
  const selectedCohortId = cohortIdFromRoute
    ?? parsePositiveReportParam(searchParams.get('cohort'));
  const currentReturnTo = buildReportReturnTo(pathname, searchParams.toString());
  const backHref = resolveReportBackHref({
    returnTo: searchParams.get('returnTo'),
    fallbackHref: cohortIdFromRoute ? '/reports/cohorts' : '/reports',
    fallbackState: { term: selectedTermId },
  });

  const { currentTerm, loading: currentTermLoading } = useCurrentTerm();
  const { terms, loading: termsLoading } = useTerms();
  const { cohorts, loading: cohortsLoading } = useCohorts();
  const reportEnabled = Boolean(selectedCohortId) && Boolean(selectedTermId || currentTerm?.id);
  const { summary, loading, error } = useClassSummary(selectedTermId, selectedCohortId, {
    enabled: reportEnabled,
  });

  const updateQuery = useCallback((updates: Record<string, string | number | null>) => {
    const nextParams = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === '') {
        nextParams.delete(key);
      } else {
        nextParams.set(key, String(value));
      }
    });

    const nextUrl = nextParams.toString() ? `${pathname}?${nextParams.toString()}` : pathname;
    router.replace(nextUrl, { scroll: false });
  }, [pathname, router, searchParams]);

  useEffect(() => {
    if (selectedTermId || currentTermLoading) {
      return;
    }
    if (currentTerm?.id) {
      updateQuery({ term: currentTerm.id });
    }
  }, [currentTerm?.id, currentTermLoading, selectedTermId, updateQuery]);

  useEffect(() => {
    if (selectedTermId || summary?.term?.id == null) {
      return;
    }
    updateQuery({ term: summary.term.id });
  }, [selectedTermId, summary?.term?.id, updateQuery]);

  const handleCohortChange = useCallback((value: string) => {
    if (!value) {
      router.push(selectedTermId ? `/reports/cohorts?term=${selectedTermId}` : '/reports/cohorts');
      return;
    }
    router.push(buildCohortReportHref(Number(value), { term: selectedTermId ?? currentTerm?.id ?? null }));
  }, [currentTerm?.id, router, selectedTermId]);

  const handleExport = useCallback(async (format: ReportExportFormat) => {
    if (!selectedCohortId) {
      return;
    }

    try {
      const file = await adminReportsAPI.exportCohortSummary(
        selectedCohortId,
        format,
        selectedTermId,
      );
      downloadBlob(file.blob, file.fileName);
    } catch (requestError) {
      window.alert(extractErrorMessage(requestError as ApiError, 'Failed to export cohort report.'));
    }
  }, [selectedCohortId, selectedTermId]);

  const noActiveTerm = !selectedTermId && !currentTermLoading && !currentTerm;
  const waitingForTerm = Boolean(selectedCohortId) && !selectedTermId && currentTermLoading;

  return (
    <AdminReportAccessGate>
      <div className="space-y-6 max-w-full">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <Link href={backHref}>
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
            </Link>
            <div className="mt-3">
              <h1 className="text-2xl font-semibold text-gray-900">Class Reports</h1>
              <p className="mt-1 max-w-3xl text-sm text-gray-500">
                Start with a class, then follow subject, instructor, attendance, session, and
                assessment context from that class without reconstructing the data map yourself.
              </p>
            </div>
          </div>

          {selectedCohortId ? (
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="secondary" size="sm" onClick={() => void handleExport('pdf')}>
                <Download className="h-4 w-4" />
                Export PDF
              </Button>
              <Button variant="secondary" size="sm" onClick={() => void handleExport('xlsx')}>
                <Download className="h-4 w-4" />
                Export Excel
              </Button>
              <Button variant="ghost" size="sm" onClick={() => void handleExport('csv')}>
                <Download className="h-4 w-4" />
                Export CSV
              </Button>
            </div>
          ) : null}
        </div>

        <Card className="max-w-full">
          <div className="grid gap-4 lg:grid-cols-2">
            <Select
              label="Term"
              value={selectedTermId ? String(selectedTermId) : ''}
              onChange={(event) => updateQuery({ term: event.target.value ? Number(event.target.value) : null })}
              disabled={termsLoading}
              options={[
                { value: '', label: currentTermLoading ? 'Loading active term...' : 'Choose term' },
                ...terms.map((term) => ({
                  value: String(term.id),
                  label: `${term.academic_year_name} — ${term.name}`,
                })),
              ]}
            />
            <Select
              label="Class"
              value={selectedCohortId ? String(selectedCohortId) : ''}
              onChange={(event) => handleCohortChange(event.target.value)}
              disabled={cohortsLoading}
              options={[
                { value: '', label: 'Choose class' },
                ...cohorts.map((cohort) => ({
                  value: String(cohort.id),
                  label: `${cohort.name} — ${cohort.level}`,
                })),
              ]}
            />
          </div>
        </Card>

        {noActiveTerm ? (
          <Card>
            <div className="py-12 text-center">
              <Calendar className="mx-auto h-10 w-10 text-gray-300" />
              <p className="mt-3 text-sm font-medium text-gray-900">No active term is configured</p>
              <p className="mt-1 text-sm text-gray-500">
                Choose a term above before opening a class report.
              </p>
            </div>
          </Card>
        ) : null}

        {error ? <ErrorBanner message={error} onDismiss={() => {}} /> : null}

        {!selectedCohortId ? (
          <Card className="max-w-full">
            <div className="py-16 text-center">
              <GraduationCap className="mx-auto h-12 w-12 text-gray-300" />
              <p className="mt-3 text-sm font-medium text-gray-900">Open one class report</p>
              <p className="mt-1 text-sm text-gray-500">
                Pick a class to see subject ownership, teaching activity, attendance, and
                assessment context together.
              </p>
            </div>
          </Card>
        ) : waitingForTerm || (loading && !summary) ? (
          <LoadingSpinner message="Loading class report..." />
        ) : summary ? (
          <div className="space-y-6 min-w-0 max-w-full">
            <Card className="max-w-full">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="truncate text-xl font-semibold text-gray-900">{summary.cohort.name}</h2>
                    <Badge variant="blue">{summary.cohort.level}</Badge>
                    <Badge variant="default">{summary.cohort.curriculum}</Badge>
                  </div>
                  <p className="mt-2 break-words text-sm text-gray-500">
                    {summary.cohort.academic_year}
                    {summary.term ? ` · ${summary.term.name}` : ''}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="purple">{summary.learner_count} learners</Badge>
                  <Badge variant="indigo">{summary.cohort_subjects.length} class subjects</Badge>
                </div>
              </div>
            </Card>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <StatsCard title="Learners" value={summary.learner_count} icon={Users} color="blue" />
              <StatsCard
                title="Average Attendance"
                value={formatPercent(summary.average_attendance)}
                icon={Calendar}
                color="indigo"
              />
              <StatsCard
                title="Average Score"
                value={formatPercent(summary.average_grade)}
                icon={BookOpen}
                color="green"
              />
              <StatsCard
                title="Subjects"
                value={summary.cohort_subjects.length}
                icon={BookOpen}
                color="purple"
              />
            </div>

            {summary.cohort_subjects.length === 0 ? (
              <Card>
                <div className="py-12 text-center">
                  <BookOpen className="mx-auto h-10 w-10 text-gray-300" />
                  <p className="mt-2 text-sm text-gray-500">
                    No class-subject reporting is available for this class in the selected term.
                  </p>
                </div>
              </Card>
            ) : (
              <div className="grid gap-4">
                {summary.cohort_subjects.map((item) => {
                  const assignedInstructors = item.assigned_instructors ?? (
                    item.assigned_instructor ? [item.assigned_instructor] : []
                  );

                  return (
                    <CurriculumSubjectReportCard
                      key={item.cohort_subject.id}
                      heading={item.cohort_subject.subject_name}
                      subheading={(
                        <div className="flex flex-wrap items-center gap-2">
                          <span>{item.cohort_subject.subject_code}</span>
                          <span className="text-gray-300">•</span>
                          <InstructorsLine
                            instructors={assignedInstructors}
                            termId={selectedTermId ?? summary.term?.id ?? null}
                            returnTo={currentReturnTo}
                          />
                        </div>
                      )}
                      reportingSource={item.reporting_source}
                      performanceSource={item.performance_source}
                      curriculumType={item.curriculum_type}
                      status={item.status}
                      note={item.note}
                      learnerCount={item.active_learner_count}
                      averageAttendance={item.average_attendance}
                      coverage={item.coverage}
                      assessmentCompletion={item.assessment_completion}
                      genericPerformance={item.generic_performance}
                      cbcPerformance={item.cbc_performance}
                      averageGrade={item.average_grade}
                      averageGradeNote={item.average_grade_note}
                      footer={(
                        <div className="space-y-4">
                          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                            <MetricTile
                              label="Sessions"
                              value={`${item.session_summary?.completed_sessions ?? 0}/${item.session_summary?.total_sessions ?? 0} completed`}
                            />
                            <MetricTile
                              label="Pending Sessions"
                              value={String(item.session_summary?.pending_sessions ?? 0)}
                            />
                            <MetricTile
                              label="Assignments"
                              value={String(item.assignment_summary?.total_assignments ?? 0)}
                            />
                            <MetricTile
                              label="Attendance Complete"
                              value={formatPercent(item.session_summary?.attendance_completeness ?? null)}
                            />
                          </div>

                          <div className="flex flex-wrap gap-2">
                            <Link
                              href={buildSubjectReportHref(item.cohort_subject.subject_id, {
                                term: selectedTermId ?? summary.term?.id ?? null,
                                cohort: summary.cohort.id,
                                cohortSubject: item.cohort_subject.id,
                                returnTo: currentReturnTo,
                              })}
                            >
                              <Button variant="secondary" size="sm">Subject</Button>
                            </Link>
                            <Link
                              href={buildCohortSubjectReportHref(item.cohort_subject.id, {
                                term: selectedTermId ?? summary.term?.id ?? null,
                                cohort: summary.cohort.id,
                                subject: item.cohort_subject.subject_id,
                                returnTo: currentReturnTo,
                              })}
                            >
                              <Button variant="secondary" size="sm">Class Subject</Button>
                            </Link>
                            <Link
                              href={buildAttendanceReportHref({
                                term: selectedTermId ?? summary.term?.id ?? null,
                                cohort: summary.cohort.id,
                                cohortSubject: item.cohort_subject.id,
                                subject: item.cohort_subject.subject_id,
                                returnTo: currentReturnTo,
                              })}
                            >
                              <Button variant="secondary" size="sm">Attendance</Button>
                            </Link>
                            {assignedInstructors[0] ? (
                              <Link
                                href={buildInstructorReportHref(assignedInstructors[0].id, {
                                  term: selectedTermId ?? summary.term?.id ?? null,
                                  cohort: summary.cohort.id,
                                  cohortSubject: item.cohort_subject.id,
                                  returnTo: currentReturnTo,
                                })}
                              >
                                <Button variant="ghost" size="sm">Instructor</Button>
                              </Link>
                            ) : null}
                            {item.reporting_source === 'cbc' ? (
                              <Link
                                href={buildCbcCohortProgressHref(summary.cohort.id, {
                                  subject: item.cohort_subject.subject_id,
                                  cohortSubject: item.cohort_subject.id,
                                  returnTo: currentReturnTo,
                                })}
                              >
                                <Button variant="ghost" size="sm">CBC Progress</Button>
                              </Link>
                            ) : null}
                          </div>
                        </div>
                      )}
                    />
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          <Card>
            <div className="py-12 text-center">
              <BookOpen className="mx-auto h-10 w-10 text-gray-300" />
              <p className="mt-2 text-sm text-gray-500">No class data is available for this selection.</p>
            </div>
          </Card>
        )}
      </div>
    </AdminReportAccessGate>
  );
}

function MetricTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-lg border border-gray-200 px-3 py-2">
      <p className="text-xs uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-1 break-words text-sm font-semibold text-gray-900">{value}</p>
    </div>
  );
}
