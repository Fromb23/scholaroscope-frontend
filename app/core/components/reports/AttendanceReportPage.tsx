'use client';

import Link from 'next/link';
import { useCallback, useEffect } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowLeft,
  Calendar,
  Download,
  Search,
} from 'lucide-react';
import { Badge } from '@/app/components/ui/Badge';
import { Button } from '@/app/components/ui/Button';
import { Card } from '@/app/components/ui/Card';
import { ErrorBanner } from '@/app/components/ui/ErrorBanner';
import { Input } from '@/app/components/ui/Input';
import {
  ButtonPendingContent,
  ReportPreparingState,
  SectionLoading,
} from '@/app/components/ui/loading';
import { Select } from '@/app/components/ui/Select';
import { adminReportsAPI } from '@/app/core/api/reporting';
import { AdminReportAccessGate } from '@/app/core/components/reports/AdminReportAccessGate';
import { AttendanceReportStats } from '@/app/core/components/reports/AttendanceReportStats';
import { AttendanceReportTable } from '@/app/core/components/reports/AttendanceReportTable';
import {
  buildAttendanceReportHref,
  buildReportReturnTo,
  parsePositiveReportParam,
  resolveReportBackHref,
} from '@/app/core/components/reports/reportNavigation';
import { useCurrentTerm, useLearnerSubjectOptions, useSubjects, useTerms } from '@/app/core/hooks/useAcademic';
import { useCohorts } from '@/app/core/hooks/useCohorts';
import { useReportExport } from '@/app/core/hooks/reports/useReportExport';
import { useAdminAttendanceScopeReport } from '@/app/core/hooks/useReporting';
import { useStudents } from '@/app/core/hooks/useStudents';

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

export function AttendanceReportPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const selectedTermId = parsePositiveReportParam(searchParams.get('term'));
  const selectedStudentId = parsePositiveReportParam(searchParams.get('student'));
  const selectedCohortId = parsePositiveReportParam(searchParams.get('cohort'));
  const selectedSubjectId = parsePositiveReportParam(searchParams.get('subject'));
  const selectedCohortSubjectId = parsePositiveReportParam(searchParams.get('cohortSubject'));
  const source = searchParams.get('source');
  const learnerQuery = searchParams.get('q') ?? '';
  const hasScope = Boolean(
    selectedStudentId
    || selectedCohortId
    || selectedSubjectId
    || selectedCohortSubjectId,
  );
  const backHref = resolveReportBackHref({
    returnTo: searchParams.get('returnTo'),
    fallbackHref: source === 'midterm' ? '/dashboard/instructor?mode=midterm' : '/reports',
    fallbackState: { term: selectedTermId },
  });
  const backLabel = source === 'midterm' ? 'Back to Midterm Break' : 'Back';
  const { currentTerm, loading: currentTermLoading } = useCurrentTerm();
  const { terms, loading: termsLoading } = useTerms();
  const { cohorts, loading: cohortsLoading } = useCohorts();
  const { subjects, loading: subjectsLoading } = useSubjects();
  const {
    subjectOptions: learnerSubjectOptions,
    loading: learnerSubjectOptionsLoading,
  } = useLearnerSubjectOptions(selectedStudentId, { enabled: Boolean(selectedStudentId) });
  const { students: learnerMatches, loading: learnerSearchLoading } = useStudents(
    {
      q: learnerQuery.trim(),
      page_size: 8,
    },
    { enabled: learnerQuery.trim().length >= 2 },
  );
  const { report, loading, error } = useAdminAttendanceScopeReport({
    termId: selectedTermId,
    studentId: selectedStudentId,
    cohortId: selectedCohortId,
    subjectId: selectedSubjectId,
    cohortSubjectId: selectedCohortSubjectId,
    enabled: hasScope && Boolean(selectedTermId || currentTerm?.id),
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
    if (selectedTermId || report?.term?.id == null) {
      return;
    }
    updateQuery({ term: report.term.id });
  }, [report?.term?.id, selectedTermId, updateQuery]);

  useEffect(() => {
    if (selectedStudentId && report) {
      focusReportPanel('attendance-report-panel');
    }
  }, [report, selectedStudentId]);

  const { handleExport, exporting } = useReportExport((format) => (
    adminReportsAPI.exportAttendanceScope(format, {
      termId: selectedTermId,
      studentId: selectedStudentId,
      cohortId: selectedCohortId,
      subjectId: selectedSubjectId,
      cohortSubjectId: selectedCohortSubjectId,
    })
  ), 'attendance report');

  const noActiveTerm = !selectedTermId && !currentTermLoading && !currentTerm;
  const waitingForTerm = hasScope && !selectedTermId && currentTermLoading;
  const subjectSelectValue = selectedCohortSubjectId
    ? `cohortSubject:${selectedCohortSubjectId}`
    : selectedSubjectId
      ? `subject:${selectedSubjectId}`
      : '';
  const learnerScopedSubjectSelectOptions = learnerSubjectOptions.map((option) => ({
    value: option.cohort_subject_id
      ? `cohortSubject:${option.cohort_subject_id}`
      : `subject:${option.subject_id}`,
    label: `${option.subject_name}${option.subject_code ? ` (${option.subject_code})` : ''}${option.cohort_name ? ` — ${option.cohort_name}` : ''}`,
  }));
  const subjectSelectOptions = selectedStudentId
    ? [
        { value: '', label: learnerSubjectOptionsLoading ? 'Loading learner subjects...' : 'All learner subjects' },
        ...learnerScopedSubjectSelectOptions,
      ]
    : [
        { value: '', label: 'All subjects' },
        ...subjects.map((subject) => ({
          value: `subject:${subject.id}`,
          label: `${subject.name} (${subject.code})`,
        })),
      ];

  useEffect(() => {
    if (!selectedStudentId || learnerSubjectOptionsLoading) {
      return;
    }
    if (!selectedSubjectId && !selectedCohortSubjectId) {
      return;
    }
    const valid = learnerSubjectOptions.some((option) => (
      (selectedCohortSubjectId && option.cohort_subject_id === selectedCohortSubjectId)
      || (!selectedCohortSubjectId && selectedSubjectId && option.subject_id === selectedSubjectId)
    ));
    if (!valid) {
      updateQuery({ subject: null, cohortSubject: null });
    }
  }, [
    learnerSubjectOptions,
    learnerSubjectOptionsLoading,
    selectedCohortSubjectId,
    selectedStudentId,
    selectedSubjectId,
    updateQuery,
  ]);

  return (
    <AdminReportAccessGate>
      <div className="space-y-6 max-w-full">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <Link href={backHref}>
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4" />
                {backLabel}
              </Button>
            </Link>
            <div className="mt-3">
              <h1 className="text-2xl font-semibold text-gray-900">Attendance Explorer</h1>
              <p className="mt-1 max-w-3xl text-sm text-gray-500">
                Attendance belongs under a learner, class, subject, or class-subject investigation.
                Start from a scope, not from a whole-school table.
              </p>
            </div>
          </div>

          {hasScope ? (
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="secondary" size="sm" disabled={exporting} onClick={() => void handleExport('pdf')}>
                <ButtonPendingContent pending={exporting} pendingLabel="Preparing PDF...">
                  <Download className="h-4 w-4" />
                  Export PDF
                </ButtonPendingContent>
              </Button>
              <Button variant="secondary" size="sm" disabled={exporting} onClick={() => void handleExport('xlsx')}>
                <ButtonPendingContent pending={exporting} pendingLabel="Preparing Excel...">
                  <Download className="h-4 w-4" />
                  Export Excel
                </ButtonPendingContent>
              </Button>
              <Button variant="ghost" size="sm" disabled={exporting} onClick={() => void handleExport('csv')}>
                <ButtonPendingContent pending={exporting} pendingLabel="Preparing CSV...">
                  <Download className="h-4 w-4" />
                  Export CSV
                </ButtonPendingContent>
              </Button>
            </div>
          ) : null}
        </div>

        <Card className="max-w-full">
          <div className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_repeat(3,minmax(0,1fr))]">
            <Input
              label="Find learner"
              value={learnerQuery}
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
            <Select
              label="Class"
              value={selectedCohortId ? String(selectedCohortId) : ''}
              onChange={(event) => updateQuery({ cohort: event.target.value ? Number(event.target.value) : null })}
              disabled={cohortsLoading}
              options={[
                { value: '', label: 'All classes' },
                ...cohorts.map((cohort) => ({
                  value: String(cohort.id),
                  label: `${cohort.name} — ${cohort.level}`,
                })),
              ]}
            />
            <Select
              label="Subject"
              value={subjectSelectValue}
              onChange={(event) => {
                const value = event.target.value;
                if (!value) {
                  updateQuery({ subject: null, cohortSubject: null });
                  return;
                }
                if (value.startsWith('cohortSubject:')) {
                  updateQuery({
                    cohortSubject: Number(value.replace('cohortSubject:', '')),
                    subject: null,
                  });
                  return;
                }
                updateQuery({
                  subject: Number(value.replace('subject:', '')),
                  cohortSubject: null,
                });
              }}
              disabled={selectedStudentId ? learnerSubjectOptionsLoading : subjectsLoading}
              options={subjectSelectOptions}
            />
          </div>
        </Card>

        {learnerQuery.trim().length >= 2 ? (
          <Card>
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-gray-400" />
              <h2 className="text-base font-semibold text-gray-900">Learner Matches</h2>
            </div>
            <div className="mt-4 space-y-3">
              {learnerSearchLoading ? (
                <SectionLoading title="Searching learner attendance matches..." />
              ) : learnerMatches.length === 0 ? (
                <div className="rounded-lg border border-dashed border-gray-200 px-4 py-4 text-sm text-gray-500">
                  No learners matched this search.
                </div>
              ) : (
                learnerMatches.map((student) => (
                  <Link
                    key={student.id}
                    href={buildAttendanceReportHref({
                      term: selectedTermId ?? currentTerm?.id ?? null,
                      student: student.id,
                      returnTo: buildReportReturnTo('/reports/attendance', {
                        term: selectedTermId ?? currentTerm?.id ?? null,
                        q: learnerQuery,
                        cohort: selectedCohortId,
                        subject: selectedSubjectId,
                      }),
                    })}
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
                      <Badge variant={selectedStudentId === student.id ? 'blue' : 'default'}>Open</Badge>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </Card>
        ) : null}

        {noActiveTerm ? (
          <Card>
            <div className="py-12 text-center">
              <Calendar className="mx-auto h-10 w-10 text-gray-300" />
              <p className="mt-3 text-sm font-medium text-gray-900">No active term is configured</p>
              <p className="mt-1 text-sm text-gray-500">
                Choose a term above before opening attendance reports.
              </p>
            </div>
          </Card>
        ) : null}

        {error ? <ErrorBanner message={error} onDismiss={() => {}} /> : null}

        {!hasScope ? (
          <Card>
            <div className="py-16 text-center">
              <Search className="mx-auto h-12 w-12 text-gray-300" />
              <p className="mt-3 text-sm font-medium text-gray-900">Choose a reporting scope</p>
              <p className="mt-1 text-sm text-gray-500">
                Open attendance from a learner, class, subject, or class-subject context.
              </p>
            </div>
          </Card>
        ) : waitingForTerm || (loading && !report) ? (
          <ReportPreparingState
            title="Building attendance risk report..."
            steps={[
              'Collecting attendance scope',
              'Reading attendance and assignment signals',
              'Calculating learning and participation risk',
              'Preparing recommendations',
            ]}
            activeStep={1}
          />
        ) : report ? (
          <div
            id="attendance-report-panel"
            tabIndex={-1}
            className="space-y-6 focus:outline-none"
          >
            <div className="flex flex-wrap gap-2">
              {report.scope.student ? <Badge variant="blue">{report.scope.student.name}</Badge> : null}
              {report.scope.cohort ? <Badge variant="indigo">{report.scope.cohort.name}</Badge> : null}
              {report.scope.subject ? <Badge variant="purple">{report.scope.subject.name}</Badge> : null}
              {report.scope.cohort_subject ? (
                <Badge variant="default">
                  {report.scope.cohort_subject.cohort_name} · {report.scope.cohort_subject.subject_name}
                </Badge>
              ) : null}
            </div>

            <AttendanceReportStats
              records={report.summary.record_count}
              avgAttendance={report.summary.average_attendance ?? 0}
              totalSessions={report.summary.total_sessions}
              atRisk={report.rows.filter((row) => row.attendance_percentage < 75).length}
            />

            {report.rows.length === 0 ? (
              <Card>
                <div className="py-12 text-center">
                  <Calendar className="mx-auto h-10 w-10 text-gray-300" />
                  <p className="mt-2 text-sm text-gray-500">
                    No attendance records are available for this scope in the selected term.
                  </p>
                </div>
              </Card>
            ) : (
              <AttendanceReportTable summaries={report.rows} />
            )}
          </div>
        ) : null}
      </div>
    </AdminReportAccessGate>
  );
}
