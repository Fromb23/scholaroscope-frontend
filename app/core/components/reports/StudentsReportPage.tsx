'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowLeft,
  BookOpen,
  Calendar,
  ChevronDown,
  ChevronUp,
  Download,
  FileText,
  Search,
  TrendingUp,
  User,
} from 'lucide-react';
import { Badge } from '@/app/components/ui/Badge';
import { Button } from '@/app/components/ui/Button';
import { Card } from '@/app/components/ui/Card';
import { ErrorBanner } from '@/app/components/ui/ErrorBanner';
import { Input } from '@/app/components/ui/Input';
import { LoadingSpinner } from '@/app/components/ui/LoadingSpinner';
import { Select } from '@/app/components/ui/Select';
import { StatsCard } from '@/app/components/dashboard/StatsCard';
import { StatStrip } from '@/app/components/dashboard/StatStrip';
import { adminReportsAPI } from '@/app/core/api/reporting';
import { AdminReportAccessGate } from '@/app/core/components/reports/AdminReportAccessGate';
import { CurriculumSubjectReportCard } from '@/app/core/components/reports/CurriculumSubjectReportCard';
import {
  buildAssessmentReportHref,
  buildAttendanceReportHref,
  buildCbcLearnerProgressHref,
  buildCohortSubjectReportHref,
  buildLearnerSubjectReportHref,
  buildLearnerReportHref,
  buildReportReturnTo,
  parsePositiveReportParam,
  resolveReportBackHref,
} from '@/app/core/components/reports/reportNavigation';
import { useCurrentTerm, useTerms } from '@/app/core/hooks/useAcademic';
import { useReportExport } from '@/app/core/hooks/reports/useReportExport';
import { useStudentReportCard } from '@/app/core/hooks/useReporting';
import { useStudents } from '@/app/core/hooks/useStudents';
import {
  formatPercent,
  resolveCbcCompetencyResult,
  resolveGenericStudentResult,
} from '@/app/core/lib/reportingPresentation';
import { getLearnerProfileExtensions } from '@/app/core/registry/learnerSlot';

function SearchResultSkeleton() {
  return (
    <div className="rounded-lg border border-dashed border-gray-200 px-4 py-3 text-sm text-gray-500">
      Start with a learner name, admission number, or class.
    </div>
  );
}

function focusReportPanel(panelId: string) {
  if (typeof document === 'undefined') {
    return;
  }
  window.setTimeout(() => {
    const panel = document.getElementById(panelId);
    if (!panel) {
      return;
    }
    panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
    panel.focus({ preventScroll: true });
  }, 0);
}

function formatCbcCompetencyResultLabel(
  competency: ReturnType<typeof resolveCbcCompetencyResult>,
): string {
  if (!competency) return 'CBC result pending';
  const performance = competency.performance;
  if (performance.level) {
    return performance.label ? `${performance.level} · ${performance.label}` : performance.level;
  }
  return performance.status?.replace(/_/g, ' ') || 'CBC result pending';
}

export function StudentsReportPage({
  studentIdFromRoute = null,
}: {
  studentIdFromRoute?: number | null;
} = {}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const selectedStudentId = studentIdFromRoute
    ?? parsePositiveReportParam(searchParams.get('student'));
  const selectedTermId = parsePositiveReportParam(searchParams.get('term'));
  const searchQuery = searchParams.get('q') ?? '';
  const [expandedMobileSubjectId, setExpandedMobileSubjectId] = useState<number | null>(null);
  const currentReturnTo = buildReportReturnTo(pathname, searchParams.toString());
  const backHref = resolveReportBackHref({
    returnTo: searchParams.get('returnTo'),
    fallbackHref: studentIdFromRoute ? '/reports/students' : '/reports',
    fallbackState: {
      term: selectedTermId,
      q: searchQuery || null,
    },
  });

  const { currentTerm, loading: currentTermLoading } = useCurrentTerm();
  const { terms, loading: termsLoading } = useTerms();
  const reportEnabled = Boolean(selectedStudentId) && Boolean(selectedTermId || currentTerm?.id);
  const {
    reportCard,
    loading: reportLoading,
    error: reportError,
    refetch: refetchReportCard,
  } = useStudentReportCard(
    selectedStudentId,
    selectedTermId,
    { enabled: reportEnabled },
  );
  const {
    students: searchResults,
    loading: searchLoading,
    error: searchError,
  } = useStudents(
    {
      q: searchQuery.trim(),
      page_size: 8,
    },
    { enabled: searchQuery.trim().length >= 2 },
  );

  const updateQuery = useCallback((updates: Record<string, string | number | null>) => {
    const nextParams = new URLSearchParams(searchParams.toString());

    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === '') {
        nextParams.delete(key);
      } else {
        nextParams.set(key, String(value));
      }
    });

    const nextUrl = nextParams.toString()
      ? `${pathname}?${nextParams.toString()}`
      : pathname;
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
    if (selectedTermId || reportCard?.term?.id == null) {
      return;
    }
    updateQuery({ term: reportCard.term.id });
  }, [reportCard?.term?.id, selectedTermId, updateQuery]);

  useEffect(() => {
    if (selectedStudentId && reportCard) {
      focusReportPanel('learner-report-panel');
    }
  }, [reportCard, selectedStudentId]);

  const { handleExport, exporting } = useReportExport(async (format) => {
    if (!selectedStudentId) {
      throw new Error('Select a learner before exporting.');
    }

    return adminReportsAPI.exportStudentReportCard(
      selectedStudentId,
      format,
      selectedTermId,
    );
  }, 'learner report');

  const noActiveTerm = !selectedTermId && !currentTermLoading && !currentTerm;
  const visibleError = reportError ?? searchError;
  const waitingForTerm = Boolean(selectedStudentId) && !selectedTermId && currentTermLoading;
  const hasCbcProgress = Boolean(reportCard?.subjects.some((subject) => (
    subject.reporting_source === 'cbc'
    && (subject.cbc?.readiness?.has_result
      || subject.cbc?.progress_summary
      || subject.cbc?.cbc_result)
  )));
  const learnerProfileExtensions = selectedStudentId == null
    ? []
    : getLearnerProfileExtensions({
      studentId: selectedStudentId,
      curricula: Array.from(
        new Set(
          (reportCard?.subjects ?? []).flatMap((subject) => {
            const curriculumType = String(subject.curriculum_type ?? '').toUpperCase();
            if (!curriculumType) {
              return [];
            }
            return curriculumType === 'CBC' ? ['CBC', 'CBE'] : [curriculumType];
          }),
        ),
      ),
    });

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
              <h1 className="text-2xl font-semibold text-gray-900">Learner Reports</h1>
              <p className="mt-1 max-w-3xl text-sm text-gray-500">
                Find one learner, stay inside that learner&apos;s context, and drill down into
                subjects, attendance, sessions, and evidence without losing your place.
              </p>
            </div>
          </div>

          {selectedStudentId ? (
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="secondary" size="sm" disabled={exporting} onClick={() => void handleExport('pdf')}>
                <Download className="h-4 w-4" />
                Export PDF
              </Button>
              <Button variant="secondary" size="sm" disabled={exporting} onClick={() => void handleExport('xlsx')}>
                <Download className="h-4 w-4" />
                Export Excel
              </Button>
              <Button variant="ghost" size="sm" disabled={exporting} onClick={() => void handleExport('csv')}>
                <Download className="h-4 w-4" />
                Export CSV
              </Button>
            </div>
          ) : null}
        </div>

        <Card className="max-w-full">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
            <Input
              label="Find learner"
              value={searchQuery}
              onChange={(event) => updateQuery({ q: event.target.value || null })}
              placeholder="Search by learner name, admission number, or class"
            />
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
          </div>
        </Card>

        {noActiveTerm ? (
          <Card>
            <div className="py-12 text-center">
              <Calendar className="mx-auto h-10 w-10 text-gray-300" />
              <p className="mt-3 text-sm font-medium text-gray-900">No active term is configured</p>
              <p className="mt-1 text-sm text-gray-500">
                Choose a term above before opening learner reports.
              </p>
            </div>
          </Card>
        ) : null}

        {visibleError ? <ErrorBanner message={visibleError} onDismiss={() => {}} /> : null}

        <div className="grid gap-6 xl:grid-cols-[minmax(280px,360px)_minmax(0,1fr)]">
          <Card className="h-fit max-w-full">
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-gray-400" />
              <h2 className="text-base font-semibold text-gray-900">Learner Search</h2>
            </div>
            <div className="mt-4 space-y-3">
              {searchQuery.trim().length < 2 ? (
                <SearchResultSkeleton />
              ) : searchLoading ? (
                <LoadingSpinner fullScreen={false} message="Searching learners..." />
              ) : searchResults.length === 0 ? (
                <div className="rounded-lg border border-dashed border-gray-200 px-4 py-6 text-sm text-gray-500">
                  No learners matched this search.
                </div>
              ) : (
                searchResults.map((student) => {
                  const href = buildLearnerReportHref(student.id, {
                    term: selectedTermId ?? currentTerm?.id ?? null,
                    returnTo: buildReportReturnTo('/reports/students', {
                      term: selectedTermId ?? currentTerm?.id ?? null,
                    }),
                  });

                  return (
                    <Link
                      key={student.id}
                      href={href}
                      className={`block rounded-xl border px-4 py-3 transition hover:border-blue-300 hover:bg-blue-50/40 ${
                        selectedStudentId === student.id
                          ? 'border-blue-400 bg-blue-50/70'
                          : 'border-gray-200'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate font-medium text-gray-900">{student.full_name}</p>
                          <p className="mt-1 break-words text-sm text-gray-500">
                            {student.admission_number}
                            {student.primary_cohort_name ? ` · ${student.primary_cohort_name}` : ''}
                          </p>
                        </div>
                        <Badge variant={selectedStudentId === student.id ? 'blue' : 'default'}>
                          Open
                        </Badge>
                      </div>
                    </Link>
                  );
                })
              )}
            </div>
          </Card>

          {!selectedStudentId ? (
            <Card className="max-w-full">
              <div className="py-16 text-center">
                <Search className="mx-auto h-12 w-12 text-gray-300" />
                <p className="mt-3 text-sm font-medium text-gray-900">Open one learner at a time</p>
                <p className="mt-1 text-sm text-gray-500">
                  Search first, then open the learner report you want to investigate.
                </p>
              </div>
            </Card>
          ) : waitingForTerm || (reportLoading && !reportCard) ? (
            <LoadingSpinner message="Loading learner report..." />
          ) : reportCard ? (
            <div
              id="learner-report-panel"
              tabIndex={-1}
              className="space-y-6 min-w-0 max-w-full focus:outline-none"
            >
              <Card className="max-w-full">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="truncate text-xl font-semibold text-gray-900">
                        {reportCard.student.name}
                      </h2>
                      <Badge variant="blue">{reportCard.student.admission_number}</Badge>
                    </div>
                    <p className="mt-2 break-words text-sm text-gray-500">
                      {reportCard.student.cohort ?? 'No active class'}
                      {reportCard.student.level ? ` · ${reportCard.student.level}` : ''}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {reportCard.term ? <Badge variant="indigo">{reportCard.term.name}</Badge> : null}
                    <Badge variant="default">{reportCard.overall.total_subjects} subjects</Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => updateQuery({ student: null, q: null })}
                    >
                      Change learner
                    </Button>
                  </div>
                </div>
              </Card>

              <StatStrip mdColumns={2} xlColumns={4}>
                <StatsCard
                  title="Average Score"
                  value={formatPercent(reportCard.overall.average_score)}
                  icon={TrendingUp}
                  color="blue"
                />
                <StatsCard
                  title="Average Attendance"
                  value={formatPercent(reportCard.overall.average_attendance)}
                  icon={Calendar}
                  color="indigo"
                />
                <StatsCard
                  title="Generic Numeric"
                  value={formatPercent(reportCard.overall.generic_average_score)}
                  icon={BookOpen}
                  color="green"
                />
                <StatsCard
                  title="CBC Assessment Indicator"
                  value={formatPercent(reportCard.overall.cbc_average_weighted_score)}
                  icon={FileText}
                  color="purple"
                />
              </StatStrip>

              {selectedStudentId && hasCbcProgress && learnerProfileExtensions.length > 0 ? (
                <div className="space-y-3">
                  <div>
                    <h3 className="text-base font-semibold text-gray-900">CBC Competency Progress</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      CBC competency meaning stays inside the CBC reporting surface and returns back here when you finish drilling down.
                    </p>
                  </div>
                  {learnerProfileExtensions.map((extension) => (
                    <extension.component
                      key={extension.key}
                      studentId={selectedStudentId}
                      returnTo={currentReturnTo}
                    />
                  ))}
                </div>
              ) : null}

              {reportCard.subjects.length === 0 ? (
                <Card>
                  <div className="py-12 text-center">
                    <BookOpen className="mx-auto h-10 w-10 text-gray-300" />
                    <p className="mt-2 text-sm text-gray-500">
                      No subject reporting is available for this learner in the selected term.
                    </p>
                  </div>
                </Card>
              ) : (
                <div className="grid gap-4">
                  {reportCard.subjects.map((subject) => {
                    const genericResult = resolveGenericStudentResult(subject.generic);
                    const cbcCompetency = resolveCbcCompetencyResult(subject.cbc);
                    const isCbcSubject = subject.reporting_source === 'cbc';
                    const subjectActions = (
                      <>
                        <Link
                          href={buildLearnerSubjectReportHref(
                            selectedStudentId,
                            subject.cohort_subject.id,
                            { returnTo: currentReturnTo },
                          )}
                        >
                          <Button variant="secondary" size="sm">Learner Subject</Button>
                        </Link>
                        <Link
                          href={buildCohortSubjectReportHref(subject.cohort_subject.id, {
                            term: selectedTermId ?? reportCard.term?.id ?? null,
                            cohort: subject.cohort_subject.cohort_id,
                            subject: subject.cohort_subject.subject_id,
                            student: selectedStudentId,
                            returnTo: currentReturnTo,
                          })}
                        >
                          <Button variant="secondary" size="sm">Class Subject</Button>
                        </Link>
                        <Link
                          href={buildAttendanceReportHref({
                            term: selectedTermId ?? reportCard.term?.id ?? null,
                            student: selectedStudentId,
                            cohortSubject: subject.cohort_subject.id,
                            returnTo: currentReturnTo,
                          })}
                        >
                          <Button variant="secondary" size="sm">Attendance</Button>
                        </Link>
                        {subject.assessment_completion?.total_assessments ? (
                          <Link
                            href={buildAssessmentReportHref(null, {
                              term: selectedTermId ?? reportCard.term?.id ?? null,
                              student: selectedStudentId,
                              cohortSubject: subject.cohort_subject.id,
                              returnTo: currentReturnTo,
                            })}
                          >
                            <Button variant="ghost" size="sm">Assessments</Button>
                          </Link>
                        ) : null}
                        {subject.reporting_source === 'cbc' ? (
                          <Link
                            href={buildCbcLearnerProgressHref(selectedStudentId, {
                              subject: subject.cohort_subject.subject_id,
                              cohortSubject: subject.cohort_subject.id,
                              returnTo: currentReturnTo,
                            })}
                          >
                            <Button variant="ghost" size="sm">CBC Progress</Button>
                          </Link>
                        ) : null}
                      </>
                    );
                    const isMobileExpanded = expandedMobileSubjectId === subject.cohort_subject.id;

                    return (
                      <CurriculumSubjectReportCard
                        key={subject.cohort_subject.id}
                        heading={subject.cohort_subject.subject_name}
                        subheading={`${subject.cohort_subject.subject_code} · ${subject.performance_source}`}
                        reportingSource={subject.reporting_source}
                        performanceSource={subject.performance_source}
                        curriculumType={subject.curriculum_type}
                        status={subject.status}
                        note={subject.note}
                        attendance={subject.attendance}
                        assessmentCompletion={subject.assessment_completion}
                        genericStudent={subject.generic}
                        cbcStudent={subject.cbc}
                        canManageCbcReview
                        onCbcReviewSaved={() => void refetchReportCard()}
                        footer={(
                          <div className="space-y-4">
                            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                              <MetricTile
                                label="Sessions Attended"
                                value={`${subject.session_summary?.sessions_attended ?? 0}/${subject.session_summary?.total_sessions ?? 0}`}
                              />
                              <MetricTile
                                label="Present / Late / Absent"
                                value={`${subject.session_summary?.present_count ?? 0} / ${subject.session_summary?.late_count ?? 0} / ${subject.session_summary?.absent_count ?? 0}`}
                              />
                              <MetricTile
                                label="Assignments"
                                value={`${subject.assignment_summary?.submitted_recipients ?? 0} submitted`}
                              />
                              <MetricTile
                                label={isCbcSubject ? 'Competency Result' : 'Latest Score'}
                                value={isCbcSubject
                                  ? formatCbcCompetencyResultLabel(cbcCompetency)
                                  : formatPercent(
                                      genericResult.finalScore
                                      ?? genericResult.averageScore
                                      ?? null,
                                    )}
                              />
                            </div>

                            <div className="md:hidden">
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => setExpandedMobileSubjectId((current) => (
                                  current === subject.cohort_subject.id ? null : subject.cohort_subject.id
                                ))}
                              >
                                {isMobileExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                {isMobileExpanded ? 'Show less' : 'Show more'}
                              </Button>
                              {isMobileExpanded ? (
                                <div className="mt-3 flex flex-wrap gap-2">
                                  {subjectActions}
                                </div>
                              ) : null}
                            </div>

                            <div className="hidden flex-wrap gap-2 md:flex">
                              {subjectActions}
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
                <User className="mx-auto h-10 w-10 text-gray-300" />
                <p className="mt-2 text-sm text-gray-500">
                  No learner report is available for this selection.
                </p>
              </div>
            </Card>
          )}
        </div>
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
