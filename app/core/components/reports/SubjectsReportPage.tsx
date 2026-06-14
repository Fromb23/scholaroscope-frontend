'use client';

import Link from 'next/link';
import { useCallback, useEffect } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowLeft,
  BookOpen,
  Calendar,
  Download,
  FileText,
  Layers3,
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
  buildCohortSubjectReportHref,
  buildInstructorReportHref,
  buildReportReturnTo,
  buildSubjectReportHref,
  parsePositiveReportParam,
  resolveReportBackHref,
} from '@/app/core/components/reports/reportNavigation';
import { useCurrentTerm, useSubjects, useTerms } from '@/app/core/hooks/useAcademic';
import { useSubjectAnalysis } from '@/app/core/hooks/useReporting';
import { formatPercent } from '@/app/core/lib/reportingPresentation';
import type { ReportAssignedInstructor, ReportExportFormat } from '@/app/core/types/reporting';
import { extractErrorMessage, type ApiError } from '@/app/core/types/errors';

function LinkedInstructorBadges({
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

export function SubjectsReportPage({
  subjectIdFromRoute = null,
}: {
  subjectIdFromRoute?: number | null;
} = {}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const selectedTermId = parsePositiveReportParam(searchParams.get('term'));
  const selectedSubjectId = subjectIdFromRoute
    ?? parsePositiveReportParam(searchParams.get('subject'));
  const currentReturnTo = buildReportReturnTo(pathname, searchParams.toString());
  const backHref = resolveReportBackHref({
    returnTo: searchParams.get('returnTo'),
    fallbackHref: subjectIdFromRoute ? '/reports/subjects' : '/reports',
    fallbackState: { term: selectedTermId },
  });

  const { currentTerm, loading: currentTermLoading } = useCurrentTerm();
  const { terms, loading: termsLoading } = useTerms();
  const { subjects, loading: subjectsLoading } = useSubjects();
  const reportEnabled = Boolean(selectedSubjectId) && Boolean(selectedTermId || currentTerm?.id);
  const { analysis, loading, error } = useSubjectAnalysis(selectedTermId, selectedSubjectId, {
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
    if (selectedTermId || analysis?.term?.id == null) {
      return;
    }
    updateQuery({ term: analysis.term.id });
  }, [analysis?.term?.id, selectedTermId, updateQuery]);

  const handleSubjectChange = useCallback((value: string) => {
    if (!value) {
      router.push(selectedTermId ? `/reports/subjects?term=${selectedTermId}` : '/reports/subjects');
      return;
    }
    router.push(buildSubjectReportHref(Number(value), { term: selectedTermId ?? currentTerm?.id ?? null }));
  }, [currentTerm?.id, router, selectedTermId]);

  const handleExport = useCallback(async (format: ReportExportFormat) => {
    if (!selectedSubjectId) {
      return;
    }

    try {
      const file = await adminReportsAPI.exportSubjectOverview(
        selectedSubjectId,
        format,
        selectedTermId,
      );
      downloadBlob(file.blob, file.fileName);
    } catch (requestError) {
      window.alert(extractErrorMessage(requestError as ApiError, 'Failed to export subject report.'));
    }
  }, [selectedSubjectId, selectedTermId]);

  const noActiveTerm = !selectedTermId && !currentTermLoading && !currentTerm;
  const waitingForTerm = Boolean(selectedSubjectId) && !selectedTermId && currentTermLoading;

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
              <h1 className="text-2xl font-semibold text-gray-900">Subject Reports</h1>
              <p className="mt-1 max-w-3xl text-sm text-gray-500">
                Open one subject, then move across classes, instructors, attendance, and
                assessment context from the same report state.
              </p>
            </div>
          </div>

          {selectedSubjectId ? (
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
              label="Subject"
              value={selectedSubjectId ? String(selectedSubjectId) : ''}
              onChange={(event) => handleSubjectChange(event.target.value)}
              disabled={subjectsLoading}
              options={[
                { value: '', label: 'Choose subject' },
                ...subjects.map((subject) => ({
                  value: String(subject.id),
                  label: `${subject.name} (${subject.code})`,
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
                Choose a term above before opening a subject report.
              </p>
            </div>
          </Card>
        ) : null}

        {error ? <ErrorBanner message={error} onDismiss={() => {}} /> : null}

        {!selectedSubjectId ? (
          <Card className="max-w-full">
            <div className="py-16 text-center">
              <FileText className="mx-auto h-12 w-12 text-gray-300" />
              <p className="mt-3 text-sm font-medium text-gray-900">Open one subject report</p>
              <p className="mt-1 text-sm text-gray-500">
                Pick a subject to compare class offerings, instructor ownership, and reporting
                depth from a single place.
              </p>
            </div>
          </Card>
        ) : waitingForTerm || (loading && !analysis) ? (
          <LoadingSpinner message="Loading subject report..." />
        ) : analysis ? (
          <div className="space-y-6 min-w-0 max-w-full">
            <Card className="max-w-full">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="truncate text-xl font-semibold text-gray-900">{analysis.subject.name}</h2>
                    <Badge variant="blue">{analysis.subject.code}</Badge>
                  </div>
                  <p className="mt-2 text-sm text-gray-500">
                    {analysis.term ? `${analysis.term.academic_year} · ${analysis.term.name}` : 'No term selected'}
                  </p>
                </div>
                <Badge variant="indigo">{analysis.cohort_subjects.length} class offerings</Badge>
              </div>
            </Card>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <StatsCard
                title="Average Score"
                value={formatPercent(analysis.average_score)}
                icon={BookOpen}
                color="blue"
              />
              <StatsCard
                title="Class Offerings"
                value={analysis.cohort_subjects.length}
                icon={Layers3}
                color="purple"
              />
              <StatsCard
                title="Assessment Types"
                value={analysis.assessment_type_breakdown.length}
                icon={FileText}
                color="green"
              />
              <StatsCard
                title="Visible Cohorts"
                value={new Set(analysis.cohort_subjects.map((item) => item.cohort.id)).size}
                icon={Users}
                color="indigo"
              />
            </div>

            {analysis.cohort_subjects.length === 0 ? (
              <Card>
                <div className="py-12 text-center">
                  <BookOpen className="mx-auto h-10 w-10 text-gray-300" />
                  <p className="mt-2 text-sm text-gray-500">
                    No subject data is available for this term.
                  </p>
                </div>
              </Card>
            ) : (
              <div className="grid gap-4">
                {analysis.cohort_subjects.map((item) => {
                  const assignedInstructors = item.assigned_instructors ?? (
                    item.assigned_instructor ? [item.assigned_instructor] : []
                  );

                  return (
                    <CurriculumSubjectReportCard
                      key={item.cohort_subject.id}
                      heading={item.cohort.name}
                      subheading={(
                        <div className="flex flex-wrap items-center gap-2">
                          <span>{item.cohort.level}</span>
                          <span className="text-gray-300">•</span>
                          <LinkedInstructorBadges
                            instructors={assignedInstructors}
                            termId={selectedTermId ?? analysis.term?.id ?? null}
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
                      averageGradeNote={item.average_grade_note ?? item.average_score_note}
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
                              label="Attendance"
                              value={formatPercent(item.average_attendance)}
                            />
                          </div>

                          <div className="flex flex-wrap gap-2">
                            <Link
                              href={buildCohortSubjectReportHref(item.cohort_subject.id, {
                                term: selectedTermId ?? analysis.term?.id ?? null,
                                cohort: item.cohort.id,
                                subject: analysis.subject.id,
                                returnTo: currentReturnTo,
                              })}
                            >
                              <Button variant="secondary" size="sm">Class Subject</Button>
                            </Link>
                            <Link
                              href={buildAttendanceReportHref({
                                term: selectedTermId ?? analysis.term?.id ?? null,
                                cohort: item.cohort.id,
                                subject: analysis.subject.id,
                                cohortSubject: item.cohort_subject.id,
                                returnTo: currentReturnTo,
                              })}
                            >
                              <Button variant="secondary" size="sm">Attendance</Button>
                            </Link>
                            {assignedInstructors[0] ? (
                              <Link
                                href={buildInstructorReportHref(assignedInstructors[0].id, {
                                  term: selectedTermId ?? analysis.term?.id ?? null,
                                  subject: analysis.subject.id,
                                  cohort: item.cohort.id,
                                  cohortSubject: item.cohort_subject.id,
                                  returnTo: currentReturnTo,
                                })}
                              >
                                <Button variant="ghost" size="sm">Instructor</Button>
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
              <FileText className="mx-auto h-10 w-10 text-gray-300" />
              <p className="mt-2 text-sm text-gray-500">No subject report is available for this selection.</p>
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
