'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowLeft,
  ClipboardList,
  Download,
  FileBarChart,
  RefreshCw,
  ShieldAlert,
} from 'lucide-react';
import { Badge } from '@/app/components/ui/Badge';
import { Button } from '@/app/components/ui/Button';
import { Card } from '@/app/components/ui/Card';
import { ErrorBanner } from '@/app/components/ui/ErrorBanner';
import { LoadingSpinner } from '@/app/components/ui/LoadingSpinner';
import { Select } from '@/app/components/ui/Select';
import { learnerReportingAPI } from '@/app/core/api/reporting';
import { downloadBlob } from '@/app/core/api/downloads';
import {
  formatReportDate,
  formatReportPercent,
  friendlyTeacherStatusLabel,
  ReportMetricCard,
  teacherStatusTone,
  toneToBadgeVariant,
} from '@/app/core/components/reports/ReportSummaryPrimitives';
import {
  useAdminInstructorTeacherReport,
  useInstructorCohortSubjects,
  useInstructorTeacherReport,
} from '@/app/core/hooks/useReporting';
import { useTerms } from '@/app/core/hooks/useAcademic';
import type {
  ReportExportFormat,
  TeacherPerformanceAssignedSubject,
} from '@/app/core/types/reporting';
import { extractErrorMessage, type ApiError } from '@/app/core/types/errors';
import {
  buildReflectionSubjectKey,
  getReflectionCardBodyText,
  MISSING_REFLECTION_TEXT_WARNING,
  prepareTeacherReflectionItem,
} from '@/app/core/components/reports/teacherPerformanceReflection';

const ALL_REFLECTION_SUBJECTS = 'all-subjects';
const INITIAL_REFLECTION_BATCH_SIZE = 10;
const REFLECTION_BATCH_INCREMENT = 20;

function parsePositiveNumber(value: string | null): number | null {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function stringValue(value: string | number): string {
  return typeof value === 'number' ? String(value) : value;
}

export function TeacherPerformanceReportPage({
  mode,
  instructorId,
  returnTo,
}: {
  mode: 'self' | 'admin';
  instructorId?: number | null;
  returnTo: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const selectedTermId = parsePositiveNumber(searchParams.get('term'));
  const selectedCohortSubjectId = parsePositiveNumber(
    searchParams.get('cohortSubject') ?? searchParams.get('cohort_subject_id'),
  );

  const { terms, loading: termsLoading } = useTerms();
  const selfCohortSubjectsQuery = useInstructorCohortSubjects({ enabled: mode === 'self' });

  const selfReportQuery = useInstructorTeacherReport(
    {
      termId: selectedTermId,
      cohortSubjectId: selectedCohortSubjectId,
    },
    { enabled: mode === 'self' },
  );
  const adminReportQuery = useAdminInstructorTeacherReport(
    mode === 'admin' ? instructorId ?? null : null,
    {
      termId: selectedTermId,
      cohortSubjectId: selectedCohortSubjectId,
    },
    { enabled: mode === 'admin' && Boolean(instructorId) },
  );

  const activeQuery = mode === 'self' ? selfReportQuery : adminReportQuery;
  const report = activeQuery.report;
  const loading = activeQuery.loading;
  const error = activeQuery.error;

  const [exporting, setExporting] = useState<ReportExportFormat | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const [selectedReflectionSubject, setSelectedReflectionSubject] = useState(
    ALL_REFLECTION_SUBJECTS,
  );
  const [visibleReflectionCount, setVisibleReflectionCount] = useState(
    INITIAL_REFLECTION_BATCH_SIZE,
  );
  const [expandedReflectionKeys, setExpandedReflectionKeys] = useState<Set<string>>(
    () => new Set(),
  );

  const updateQuery = useCallback((updates: {
    term?: number | null;
    cohortSubjectId?: number | null;
  }) => {
    const nextParams = new URLSearchParams(searchParams.toString());

    if (updates.term !== undefined) {
      if (updates.term) {
        nextParams.set('term', String(updates.term));
      } else {
        nextParams.delete('term');
      }
    }

    if (updates.cohortSubjectId !== undefined) {
      if (updates.cohortSubjectId) {
        nextParams.set('cohortSubject', String(updates.cohortSubjectId));
        nextParams.delete('cohort_subject_id');
      } else {
        nextParams.delete('cohortSubject');
        nextParams.delete('cohort_subject_id');
      }
    }

    const nextUrl = nextParams.toString()
      ? `${pathname}?${nextParams.toString()}`
      : pathname;
    router.replace(nextUrl, { scroll: false });
  }, [pathname, router, searchParams]);

  const subjectOptions = useMemo(() => {
    if (mode === 'self') {
      return selfCohortSubjectsQuery.cohortSubjects.map((item) => ({
        value: String(item.id),
        label: `${item.cohort_name} · ${item.subject_name}`,
      }));
    }

    return (report?.assigned_subjects ?? []).map((item) => ({
      value: String(item.cohort_subject_id),
      label: `${item.cohort_name} · ${item.subject_name}`,
    }));
  }, [mode, report?.assigned_subjects, selfCohortSubjectsQuery.cohortSubjects]);

  const reflectionSubjectOptions = useMemo(() => ([
    { value: ALL_REFLECTION_SUBJECTS, label: 'All subjects' },
    ...(report?.assigned_subjects ?? []).map((item) => ({
      value: String(item.cohort_subject_id),
      label: `${item.cohort_name} · ${item.subject_name}`,
    })),
  ]), [report?.assigned_subjects]);

  const assignedReflectionSubjectsById = useMemo(
    () => new Map(
      (report?.assigned_subjects ?? []).map((item) => [String(item.cohort_subject_id), item]),
    ),
    [report?.assigned_subjects],
  );

  const selectedReflectionSubjectMatchKey = useMemo(() => {
    if (selectedReflectionSubject === ALL_REFLECTION_SUBJECTS) {
      return null;
    }

    const selectedSubject = assignedReflectionSubjectsById.get(selectedReflectionSubject);
    return selectedSubject
      ? buildReflectionSubjectKey(selectedSubject.cohort_name, selectedSubject.subject_name)
      : null;
  }, [assignedReflectionSubjectsById, selectedReflectionSubject]);

  const reflectionItems = useMemo(
    () => (report?.reflection_summary.latest_reflections ?? []).map(prepareTeacherReflectionItem),
    [report?.reflection_summary.latest_reflections],
  );

  const filteredReflections = useMemo(() => {
    const selectedCohortSubjectId = selectedReflectionSubject === ALL_REFLECTION_SUBJECTS
      ? null
      : Number(selectedReflectionSubject);
    const matchingReflections = reflectionItems.filter((item) => {
      if (selectedCohortSubjectId == null) {
        return true;
      }

      if (typeof item.cohort_subject_id === 'number') {
        return item.cohort_subject_id === selectedCohortSubjectId;
      }

      return item.matchKey === selectedReflectionSubjectMatchKey;
    });

    return [...matchingReflections].sort((left, right) => right.sortTimestamp - left.sortTimestamp);
  }, [reflectionItems, selectedReflectionSubject, selectedReflectionSubjectMatchKey]);

  const visibleReflections = useMemo(
    () => filteredReflections.slice(0, visibleReflectionCount),
    [filteredReflections, visibleReflectionCount],
  );

  const hasMoreReflections = visibleReflectionCount < filteredReflections.length;

  useEffect(() => {
    if (selectedReflectionSubject === ALL_REFLECTION_SUBJECTS) {
      return;
    }

    const hasSelectedOption = reflectionSubjectOptions.some(
      (option) => String(option.value) === selectedReflectionSubject,
    );

    if (!hasSelectedOption) {
      setSelectedReflectionSubject(ALL_REFLECTION_SUBJECTS);
    }
  }, [reflectionSubjectOptions, selectedReflectionSubject]);

  useEffect(() => {
    setVisibleReflectionCount(INITIAL_REFLECTION_BATCH_SIZE);
    setExpandedReflectionKeys(new Set());
  }, [report?.reflection_summary.latest_reflections, selectedReflectionSubject]);

  const handleExport = useCallback(async (format: ReportExportFormat) => {
    try {
      setExportError(null);
      setExporting(format);
      const params = {
        termId: selectedTermId,
        cohortSubjectId: selectedCohortSubjectId,
      };
      const file = mode === 'self'
        ? await learnerReportingAPI.exportInstructorTeacherReport(format, params)
        : await learnerReportingAPI.exportAdminInstructorTeacherReport(
            instructorId ?? 0,
            format,
            params,
          );
      downloadBlob(file.blob, file.fileName);
    } catch (requestError) {
      setExportError(
        extractErrorMessage(requestError as ApiError, 'Failed to export teacher report'),
      );
    } finally {
      setExporting(null);
    }
  }, [instructorId, mode, selectedCohortSubjectId, selectedTermId]);

  const toggleReflectionExpanded = useCallback((reflectionKey: string) => {
    setExpandedReflectionKeys((current) => {
      const next = new Set(current);
      if (next.has(reflectionKey)) {
        next.delete(reflectionKey);
      } else {
        next.add(reflectionKey);
      }
      return next;
    });
  }, []);

  const headlineMetrics = report?.headline
    ? [
        {
          label: 'Teaching Delivery',
          value: friendlyTeacherStatusLabel(report.headline.teaching_delivery_status),
          note: 'Session completion and attendance marking.',
          tone: teacherStatusTone(report.headline.teaching_delivery_status),
        },
        {
          label: 'Curriculum Coverage',
          value: friendlyTeacherStatusLabel(report.headline.curriculum_coverage_status),
          note: 'Visible coverage across assigned subjects.',
          tone: teacherStatusTone(report.headline.curriculum_coverage_status),
        },
        {
          label: 'Learner Evidence',
          value: friendlyTeacherStatusLabel(report.headline.learner_evidence_status),
          note: 'Direct learner evidence visibility.',
          tone: teacherStatusTone(report.headline.learner_evidence_status),
        },
        {
          label: 'Learner Response',
          value: friendlyTeacherStatusLabel(report.headline.learner_response_status),
          note: 'Attendance, assignments, and support signals.',
          tone: teacherStatusTone(report.headline.learner_response_status),
        },
        {
          label: 'Reflection Discipline',
          value: friendlyTeacherStatusLabel(report.headline.reflection_status),
          note: 'Completed lessons with reflections.',
          tone: teacherStatusTone(report.headline.reflection_status),
        },
      ]
    : [];

  if (loading && !report) {
    return <LoadingSpinner message="Loading teacher report..." />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link href={returnTo}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
          </Link>
          <div className="mt-3">
            <h1 className="text-2xl font-semibold theme-text">Teacher Report</h1>
            <p className="mt-1 text-sm theme-muted">
              Visibility into delivery, coverage, evidence, learner response, and reflection discipline.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            disabled={!report || exporting !== null}
            onClick={() => void handleExport('pdf')}
          >
            <Download className="h-4 w-4" />
            {exporting === 'pdf' ? 'Exporting PDF...' : 'Export PDF'}
          </Button>
          <Button
            variant="secondary"
            size="sm"
            disabled={!report || exporting !== null}
            onClick={() => void handleExport('xlsx')}
          >
            <Download className="h-4 w-4" />
            {exporting === 'xlsx' ? 'Exporting Excel...' : 'Export Excel'}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            disabled={!report || exporting !== null}
            onClick={() => void handleExport('csv')}
          >
            <Download className="h-4 w-4" />
            {exporting === 'csv' ? 'Exporting CSV...' : 'Export CSV'}
          </Button>
        </div>
      </div>

      {exportError || error ? (
        <ErrorBanner
          message={exportError ?? error ?? 'Teacher report is unavailable.'}
          onDismiss={() => setExportError(null)}
        />
      ) : null}

      <Card>
        <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)]">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-semibold theme-text">
                {report?.instructor.name || 'Teacher report'}
              </h2>
              {report ? (
                <Badge variant={toneToBadgeVariant(teacherStatusTone(report.headline.overall_visibility_status))}>
                  {friendlyTeacherStatusLabel(report.headline.overall_visibility_status)}
                </Badge>
              ) : null}
            </div>
            <p className="mt-2 text-sm theme-muted">{report?.instructor.email || 'No teacher email available yet.'}</p>
            <p className="mt-1 text-sm theme-subtle">{report?.organization.name || 'Organization not available'}</p>
          </div>

          <div>
            <p className="text-xs font-medium uppercase tracking-wide theme-subtle">Reporting Period</p>
            <p className="mt-2 text-sm font-medium theme-text">{report?.period.label || 'All visible records'}</p>
            <p className="mt-1 text-sm theme-muted">
              Generated {report ? formatReportDate(report.generated_at) : 'No date yet'}
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            <Select
              label="Term"
              value={selectedTermId ? String(selectedTermId) : ''}
              onChange={(event) => updateQuery({
                term: event.target.value ? Number(event.target.value) : null,
              })}
              options={[
                { value: '', label: termsLoading ? 'Loading terms...' : 'All visible terms' },
                ...terms.map((term) => ({
                  value: String(term.id),
                  label: term.name,
                })),
              ]}
            />
            <Select
              label="Assigned Subject"
              value={selectedCohortSubjectId ? String(selectedCohortSubjectId) : ''}
              onChange={(event) => updateQuery({
                cohortSubjectId: event.target.value ? Number(event.target.value) : null,
              })}
              options={[
                { value: '', label: 'All assigned subjects' },
                ...subjectOptions,
              ]}
            />
          </div>
        </div>
      </Card>

      {loading ? <LoadingSpinner message="Refreshing teacher report..." /> : null}

      {report ? (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            {headlineMetrics.map((item) => (
              <ReportMetricCard
                key={item.label}
                label={item.label}
                value={item.value}
                note={item.note}
                tone={item.tone}
              />
            ))}
          </div>

          <Card>
            <div className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5 theme-subtle" />
              <h2 className="text-lg font-semibold theme-text">What This Means</h2>
            </div>
            <p className="mt-4 text-sm theme-muted">{report.summary}</p>
          </Card>

          <div className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
            <Card>
              <h2 className="text-lg font-semibold theme-text">Key Metrics</h2>
              <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {report.key_metrics.map((item) => (
                  <ReportMetricCard
                    key={item.key}
                    label={item.label}
                    value={stringValue(item.value)}
                    note={item.note}
                    tone={item.tone}
                  />
                ))}
              </div>
            </Card>

            <Card>
              <div className="flex items-center gap-2">
                <RefreshCw className="h-5 w-5 theme-subtle" />
                <h2 className="text-lg font-semibold theme-text">Reflection Summary</h2>
              </div>
              <div className="mt-4 space-y-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="theme-muted">Reflection completion</span>
                  <span className="font-medium theme-text">
                    {formatReportPercent(report.reflection_summary.reflection_completion_rate)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="theme-muted">Completed sessions</span>
                  <span className="font-medium theme-text">{report.reflection_summary.completed_sessions}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="theme-muted">Missing reflections</span>
                  <span className="font-medium theme-text">{report.reflection_summary.missing_reflection_count}</span>
                </div>
                {report.reflection_summary.repeated_themes.length > 0 ? (
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide theme-subtle">Repeated Themes</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {report.reflection_summary.repeated_themes.map((item) => (
                        <Badge key={item} variant="default">{item}</Badge>
                      ))}
                    </div>
                  </div>
                ) : null}
                {report.reflection_summary.repeated_gaps.length > 0 ? (
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide theme-subtle">Repeated Gaps</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {report.reflection_summary.repeated_gaps.map((item) => (
                        <Badge key={item} variant="warning">{item}</Badge>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            </Card>
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <Card>
              <h2 className="text-lg font-semibold theme-text">Strengths</h2>
              {report.strengths.length === 0 ? (
                <p className="mt-4 text-sm theme-muted">No strong visibility signals are available yet.</p>
              ) : (
                <ul className="mt-4 space-y-3">
                  {report.strengths.map((item) => (
                    <li key={`${item.label}-${item.metric}`} className="rounded-lg border theme-border theme-surface-muted px-4 py-3">
                      <p className="text-sm font-medium theme-text">{item.label}</p>
                      <p className="mt-1 text-sm theme-muted">{item.metric}</p>
                      <p className="mt-1 text-sm theme-subtle">{item.note}</p>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card>
              <div className="flex items-center gap-2">
                <ShieldAlert className="h-5 w-5 text-amber-600" />
                <h2 className="text-lg font-semibold theme-text">Areas Needing Attention</h2>
              </div>
              {report.gaps.length === 0 ? (
                <p className="mt-4 text-sm theme-muted">No follow-up areas are currently flagged.</p>
              ) : (
                <ul className="mt-4 space-y-3">
                  {report.gaps.map((item) => (
                    <li key={`${item.label}-${item.metric}`} className="rounded-lg border theme-border theme-surface-muted px-4 py-3">
                      <p className="text-sm font-medium theme-text">{item.label}</p>
                      <p className="mt-1 text-sm theme-muted">{item.metric}</p>
                      <p className="mt-1 text-sm theme-subtle">{item.note}</p>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>

          <Card>
            <h2 className="text-lg font-semibold theme-text">Recommended Actions</h2>
            {report.recommended_actions.length === 0 ? (
              <p className="mt-4 text-sm theme-muted">No recommended actions are available yet.</p>
            ) : (
              <ul className="mt-4 space-y-3">
                {report.recommended_actions.map((action) => (
                  <li
                    key={action}
                    className="rounded-lg border theme-border theme-surface-muted px-4 py-3 text-sm theme-text"
                  >
                    {action}
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card>
            <div className="flex items-center gap-2">
              <FileBarChart className="h-5 w-5 theme-subtle" />
              <h2 className="text-lg font-semibold theme-text">Assigned Subject Summary</h2>
            </div>
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b theme-border text-left text-xs uppercase tracking-wide theme-subtle">
                    <th className="px-3 py-2">Cohort</th>
                    <th className="px-3 py-2">Subject</th>
                    <th className="px-3 py-2 text-right">Learners</th>
                    <th className="px-3 py-2 text-right">Sessions Completed</th>
                    <th className="px-3 py-2 text-right">Coverage</th>
                    <th className="px-3 py-2 text-right">Evidence</th>
                    <th className="px-3 py-2">Risk</th>
                  </tr>
                </thead>
                <tbody>
                  {report.assigned_subjects.map((item: TeacherPerformanceAssignedSubject) => (
                    <tr key={item.cohort_subject_id} className="border-b theme-border">
                      <td className="px-3 py-3 theme-text">{item.cohort_name}</td>
                      <td className="px-3 py-3">
                        <div className="font-medium theme-text">{item.subject_name}</div>
                        <div className="text-xs theme-subtle">{item.curriculum_type || 'Curriculum not set'}</div>
                      </td>
                      <td className="px-3 py-3 text-right theme-muted">{item.learners_total}</td>
                      <td className="px-3 py-3 text-right theme-muted">{item.sessions_completed}</td>
                      <td className="px-3 py-3 text-right theme-muted">{formatReportPercent(item.coverage_percentage)}</td>
                      <td className="px-3 py-3 text-right theme-muted">{item.evidence_count}</td>
                      <td className="px-3 py-3">
                        <Badge variant={toneToBadgeVariant(teacherStatusTone(item.risk_level))}>
                          {friendlyTeacherStatusLabel(item.risk_level)}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <div className="grid gap-4 xl:grid-cols-2">
            <Card>
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <h2 className="text-lg font-semibold theme-text">Latest Reflections</h2>
                    {reflectionItems.length > 0 ? (
                      <p className="mt-1 text-sm theme-muted">
                        Showing {visibleReflections.length} of {filteredReflections.length} reflections
                      </p>
                    ) : null}
                  </div>
                  <div className="w-full sm:max-w-md">
                    <Select
                      label="Filter reflections by subject"
                      value={selectedReflectionSubject}
                      onChange={(event) => setSelectedReflectionSubject(
                        event.target.value || ALL_REFLECTION_SUBJECTS,
                      )}
                      options={reflectionSubjectOptions}
                    />
                  </div>
                </div>

                {reflectionItems.length === 0 ? (
                  <p className="text-sm theme-muted">No reflections recorded yet.</p>
                ) : filteredReflections.length === 0 ? (
                  <p className="text-sm theme-muted">No reflections recorded for this subject yet.</p>
                ) : (
                  <>
                    <div className="space-y-3">
                      {visibleReflections.map((item) => {
                        const isExpanded = expandedReflectionKeys.has(item.rowKey);
                        const reflectionText = getReflectionCardBodyText(item, isExpanded);

                        return (
                          <div
                            key={item.rowKey}
                            className="rounded-lg border theme-border theme-surface-muted px-4 py-3"
                          >
                            <div className="flex flex-wrap items-start justify-between gap-2">
                              <p className="text-sm font-medium theme-text">{item.session_title}</p>
                              <span className="text-xs theme-subtle">
                                {formatReportDate(item.session_date || item.created_at)}
                              </span>
                            </div>
                            <p className="mt-1 text-xs theme-subtle">
                              {item.cohort_name} · {item.subject_name}
                            </p>
                            <p
                              className={`mt-3 text-sm theme-muted ${
                                isExpanded || !item.canExpand ? 'whitespace-pre-line break-words' : ''
                              }`}
                            >
                              {reflectionText || 'No reflection text is available in this report payload.'}
                            </p>
                            {item.hasPayloadWarning ? (
                              <p className="mt-2 text-xs font-medium text-amber-700">
                                {MISSING_REFLECTION_TEXT_WARNING}
                              </p>
                            ) : null}
                            {item.canExpand ? (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="mt-2 px-0"
                                onClick={() => toggleReflectionExpanded(item.rowKey)}
                              >
                                {isExpanded ? 'View less' : 'View more'}
                              </Button>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>

                    {hasMoreReflections ? (
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        className="self-start"
                        onClick={() => setVisibleReflectionCount(
                          (current) => current + REFLECTION_BATCH_INCREMENT,
                        )}
                      >
                        Show more reflections
                      </Button>
                    ) : null}
                  </>
                )}
              </div>
            </Card>

            <Card>
              <h2 className="text-lg font-semibold theme-text">Alignment Signals</h2>
              {report.evidence_alignment.length === 0 ? (
                <p className="mt-4 text-sm theme-muted">No alignment signals are available yet.</p>
              ) : (
                <div className="mt-4 space-y-3">
                  {report.evidence_alignment.map((item) => (
                    <div
                      key={`${item.label}-${item.note}`}
                      className="rounded-lg border theme-border theme-surface-muted px-4 py-3"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-medium theme-text">{item.label}</p>
                        <Badge variant={toneToBadgeVariant(item.tone)}>
                          {friendlyTeacherStatusLabel(item.status)}
                        </Badge>
                      </div>
                      <p className="mt-2 text-sm theme-muted">{item.note}</p>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </>
      ) : null}
    </div>
  );
}
