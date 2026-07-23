'use client';

import Link from 'next/link';
import { useEffect, useMemo } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowLeft,
  BookOpenCheck,
  FileBarChart,
  GraduationCap,
  ShieldCheck,
  User,
} from 'lucide-react';
import { Badge } from '@/app/components/ui/Badge';
import { Button } from '@/app/components/ui/Button';
import { Card } from '@/app/components/ui/Card';
import { ErrorBanner } from '@/app/components/ui/ErrorBanner';
import { Select } from '@/app/components/ui/Select';
import {
  EntityLoadingState,
  ReportPreparingState,
} from '@/app/components/ui/loading';
import { learnerReportingAPI } from '@/app/core/api/reporting';
import {
  formatReportDate,
  formatReportPercent,
  ReportMetricCard,
} from '@/app/core/components/reports/ReportSummaryPrimitives';
import {
  buildLearnerSubjectReportHref,
  parsePositiveReportParam,
} from '@/app/core/components/reports/reportNavigation';
import { ReportExportButtons } from '@/app/core/components/reports/ReportExportButtons';
import { useCurrentTerm, useTerms } from '@/app/core/hooks/useAcademic';
import { useLearnerTermProgressReport } from '@/app/core/hooks/useReporting';
import { useReportExport } from '@/app/core/hooks/reports/useReportExport';
import { useStudent } from '@/app/core/hooks/useStudents';
import type {
  LearnerTermProgressLearningArea,
  LearnerTermProgressOutcome,
  LearnerTermProgressReportPayload,
  LearnerTermProgressResultStatus,
} from '@/app/core/types/reporting';
import { sanitizeAppDestination } from '@/app/core/auth/navigation';

type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'default';

function labelize(value: string | null | undefined): string {
  return String(value ?? '').replace(/_/g, ' ').replace(/-/g, ' ').trim() || 'Not available';
}

function statusBadgeVariant(status: LearnerTermProgressResultStatus | undefined): BadgeVariant {
  const normalized = String(status ?? '').toUpperCase();
  if (normalized === 'FINAL' || normalized === 'ASSESSED') return 'success';
  if (normalized === 'PROVISIONAL' || normalized === 'READY_FOR_REVIEW') return 'warning';
  if (normalized === 'STALE') return 'danger';
  if (normalized === 'NO_EVIDENCE' || normalized === 'AWAITING_EVIDENCE') return 'info';
  return 'default';
}

function metricLabel(key: string): string {
  return labelize(key).replace(/\b\w/g, (char) => char.toUpperCase());
}

function metricValue(value: number | string | null): string {
  if (value === null || value === '') return 'Not available';
  if (typeof value === 'number') return Number.isInteger(value) ? String(value) : value.toFixed(1);
  return value;
}

function performanceText(area: LearnerTermProgressLearningArea): string {
  if (area.performance.level) {
    return area.performance.label
      ? `${area.performance.level} - ${area.performance.label}`
      : area.performance.level;
  }
  return labelize(area.performance.status);
}

function CoverageSummary({ area }: { area: LearnerTermProgressLearningArea }) {
  const coverage = area.coverage;
  return (
    <div className="grid gap-3 sm:grid-cols-4">
      {[
        ['Selected', coverage.selected],
        ['Taught', coverage.taught],
        ['Observed', coverage.observed],
        ['Taught not observed', coverage.taught_not_observed],
      ].map(([label, value]) => (
        <div key={label} className="rounded-lg border theme-border theme-surface-muted p-3">
          <p className="text-xs font-medium uppercase tracking-wide theme-subtle">{label}</p>
          <p className="mt-1 text-lg font-semibold theme-text">{String(value)}</p>
        </div>
      ))}
    </div>
  );
}

function EvidenceSummary({ area }: { area: LearnerTermProgressLearningArea }) {
  const evidence = area.evidence_summary;
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {[
        ['Assessments', evidence.assessments],
        ['Assignments', evidence.assignments],
        ['Group assignments', evidence.group_assignments],
        ['Observations', evidence.observations],
        ['Projects', evidence.projects],
        ['Practicals', evidence.practicals],
        ['Portfolio items', evidence.portfolio_items],
        ['Total evidence', evidence.total],
      ].map(([label, value]) => (
        <div key={label} className="rounded-lg border theme-border p-3">
          <p className="text-xs font-medium uppercase tracking-wide theme-subtle">{label}</p>
          <p className="mt-1 text-lg font-semibold theme-text">{String(value)}</p>
        </div>
      ))}
    </div>
  );
}

function OutcomesTable({ outcomes }: { outcomes: LearnerTermProgressOutcome[] }) {
  if (outcomes.length === 0) {
    return (
      <p className="rounded-lg border theme-border theme-surface-muted p-4 text-sm theme-muted">
        No outcome projections are available for this learning area yet.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="border-b theme-border text-left text-xs uppercase tracking-wide theme-subtle">
            <th className="px-3 py-2">Outcome</th>
            <th className="px-3 py-2">Strand</th>
            <th className="px-3 py-2">Level</th>
            <th className="px-3 py-2">Status</th>
            <th className="px-3 py-2 text-right">Evidence</th>
          </tr>
        </thead>
        <tbody>
          {outcomes.map((outcome) => (
            <tr key={`${outcome.outcome_code}-${outcome.description}`} className="border-b theme-border">
              <td className="px-3 py-3 align-top">
                <p className="font-medium theme-text">{outcome.outcome_code || 'Outcome'}</p>
                <p className="mt-1 max-w-xl theme-muted">{outcome.description}</p>
              </td>
              <td className="px-3 py-3 align-top theme-muted">
                {outcome.strand}
                <br />
                <span className="theme-subtle">{outcome.sub_strand}</span>
              </td>
              <td className="px-3 py-3 align-top theme-muted">
                {outcome.level ? `${outcome.level} - ${outcome.label}` : 'Awaiting Evidence'}
              </td>
              <td className="px-3 py-3 align-top">
                <Badge variant={statusBadgeVariant(outcome.status)}>
                  {labelize(outcome.status)}
                </Badge>
              </td>
              <td className="px-3 py-3 text-right align-top theme-muted">{outcome.evidence_count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function LearningAreaCard({
  area,
  learnerId,
  returnTo,
}: {
  area: LearnerTermProgressLearningArea;
  learnerId: number;
  returnTo: string;
}) {
  const nextSteps = area.teacher_review.recommended_next_steps ?? [];
  const subjectHref = buildLearnerSubjectReportHref(learnerId, area.cohort_subject_id, { returnTo });

  return (
    <Card className="space-y-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-semibold theme-text">{area.name}</h2>
            <Badge variant="info">{area.code}</Badge>
            <Badge variant={statusBadgeVariant(area.performance.status)}>
              {labelize(area.performance.status)}
            </Badge>
          </div>
          <p className="mt-2 text-sm theme-muted">
            Server competency result: <span className="font-medium theme-text">{performanceText(area)}</span>
          </p>
        </div>
        <Link href={subjectHref}>
          <Button variant="secondary" size="sm">
            <FileBarChart className="h-4 w-4" />
            Subject detail
          </Button>
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <ReportMetricCard
          label="Attendance"
          value={formatReportPercent(area.attendance.percentage)}
          note={`${area.attendance.attended} of ${area.attendance.recorded} recorded sessions attended.`}
          tone="neutral"
        />
        <ReportMetricCard
          label="Evidence"
          value={area.evidence_summary.total}
          note="Verified term-scoped evidence records."
          tone={area.evidence_summary.total > 0 ? 'success' : 'warning'}
        />
        <ReportMetricCard
          label="Observed Outcomes"
          value={`${area.coverage.observed}/${area.coverage.selected}`}
          note="Observed outcomes use server projection coverage."
          tone={area.coverage.observed > 0 ? 'success' : 'warning'}
        />
      </div>

      <section aria-labelledby={`evidence-${area.cohort_subject_id}`}>
        <h3 id={`evidence-${area.cohort_subject_id}`} className="text-base font-semibold theme-text">
          Evidence Summary
        </h3>
        <div className="mt-3">
          <EvidenceSummary area={area} />
        </div>
      </section>

      <section aria-labelledby={`coverage-${area.cohort_subject_id}`}>
        <h3 id={`coverage-${area.cohort_subject_id}`} className="text-base font-semibold theme-text">
          Coverage
        </h3>
        <div className="mt-3">
          <CoverageSummary area={area} />
        </div>
      </section>

      <section aria-labelledby={`outcomes-${area.cohort_subject_id}`}>
        <h3 id={`outcomes-${area.cohort_subject_id}`} className="text-base font-semibold theme-text">
          Outcomes
        </h3>
        <div className="mt-3">
          <OutcomesTable outcomes={area.outcomes} />
        </div>
      </section>

      <section aria-labelledby={`review-${area.cohort_subject_id}`} className="rounded-lg border theme-border theme-surface-muted p-4">
        <h3 id={`review-${area.cohort_subject_id}`} className="text-base font-semibold theme-text">
          Teacher Review
        </h3>
        <p className="mt-2 text-sm theme-text">{area.teacher_review.teacher_remark}</p>
        {area.teacher_review.contextual_note ? (
          <p className="mt-2 text-sm theme-muted">{area.teacher_review.contextual_note}</p>
        ) : null}
        {nextSteps.length > 0 ? (
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm theme-muted">
            {nextSteps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm theme-subtle">No recommended next steps recorded.</p>
        )}
        <div className="mt-3 flex flex-wrap gap-2">
          <Badge variant={area.teacher_review.approved ? 'success' : 'warning'}>
            {area.teacher_review.approved ? 'Review approved' : 'Review pending'}
          </Badge>
          {area.teacher_review.requires_re_review ? (
            <Badge variant="danger">Requires re-review</Badge>
          ) : null}
        </div>
      </section>
    </Card>
  );
}

function EvidenceMetrics({ report }: { report: LearnerTermProgressReportPayload }) {
  const entries = Object.entries(report.evidence_metrics ?? {});
  if (entries.length === 0) return null;

  return (
    <Card>
      <h2 className="text-lg font-semibold theme-text">Evidence Metrics</h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {entries.map(([key, value]) => (
          <div key={key} className="rounded-lg border theme-border p-3">
            <p className="text-xs font-medium uppercase tracking-wide theme-subtle">{metricLabel(key)}</p>
            <p className="mt-1 text-lg font-semibold theme-text">{metricValue(value)}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}

export function LearnerOverviewReportPage() {
  const params = useParams<{ learnerId: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const learnerId = Number(params.learnerId);
  const selectedTermId = parsePositiveReportParam(searchParams.get('term'));
  const returnTo = sanitizeAppDestination(
    searchParams.get('returnTo'),
    `/learners/${learnerId}`,
  );
  const { student, loading: learnerLoading, error: learnerError } = useStudent(learnerId);
  const { currentTerm, loading: currentTermLoading } = useCurrentTerm();
  const { terms, loading: termsLoading } = useTerms();
  const effectiveTermId = selectedTermId ?? currentTerm?.id ?? null;
  const {
    report,
    loading: reportLoading,
    error: reportError,
  } = useLearnerTermProgressReport(
    Number.isFinite(learnerId) && learnerId > 0 ? learnerId : null,
    effectiveTermId,
    { enabled: Boolean(effectiveTermId) },
  );

  const returnToQuery = useMemo(() => {
    const next = new URLSearchParams();
    if (returnTo) next.set('returnTo', returnTo);
    return next.toString();
  }, [returnTo]);

  useEffect(() => {
    if (selectedTermId || currentTermLoading || !currentTerm?.id) {
      return;
    }
    const next = new URLSearchParams(searchParams.toString());
    next.set('term', String(currentTerm.id));
    router.replace(`?${next.toString()}`);
  }, [currentTerm?.id, currentTermLoading, router, searchParams, selectedTermId]);

  const { handleExport, exporting } = useReportExport(async () => {
    if (!Number.isFinite(learnerId) || learnerId <= 0 || !effectiveTermId) {
      throw new Error('Choose a learner and term before downloading the report.');
    }
    return learnerReportingAPI.exportLearnerTermProgressReport(learnerId, {
      termId: effectiveTermId,
      format: 'pdf',
    });
  }, 'learner term progress report');

  const termOptions = useMemo(() => [
    { value: '', label: termsLoading || currentTermLoading ? 'Loading terms...' : 'Choose term' },
    ...terms.map((term) => ({ value: term.id, label: term.name })),
  ], [currentTermLoading, terms, termsLoading]);

  const handleTermChange = (value: string) => {
    const next = new URLSearchParams(searchParams.toString());
    if (value) {
      next.set('term', value);
    } else {
      next.delete('term');
    }
    router.push(`?${next.toString()}`);
  };

  const visibleError = reportError ?? learnerError ?? null;
  const noTermAvailable = !effectiveTermId && !currentTermLoading;

  if (learnerLoading && !student) {
    return <EntityLoadingState entity="learner reporting context" action="Loading" />;
  }

  return (
    <div className="space-y-6" aria-live={exporting ? 'polite' : undefined}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link href={returnTo}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4" />
              Back to Learner Profile
            </Button>
          </Link>
          <div className="mt-3">
            <h1 className="text-2xl font-semibold theme-text">Learner Progress Report</h1>
            <p className="mt-1 max-w-3xl text-sm theme-muted">
              Term-specific preview of the server-authoritative learner progress report.
            </p>
          </div>
        </div>

        <ReportExportButtons
          reportType="learner_term_progress"
          exporting={exporting}
          disabled={!report || !effectiveTermId}
          onExport={handleExport}
          labels={{ pdf: 'Download PDF' }}
        />
      </div>

      <Card>
        <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(220px,320px)]">
          <div>
            <p className="text-sm font-medium theme-muted">Formal report term</p>
            <p className="mt-1 text-sm theme-subtle">
              The formal report requires an explicit organization-scoped term.
            </p>
          </div>
          <Select
            label="Term"
            value={effectiveTermId ? String(effectiveTermId) : ''}
            onChange={(event) => handleTermChange(event.target.value)}
            options={termOptions}
            required
          />
        </div>
      </Card>

      {visibleError ? (
        <ErrorBanner
          message={visibleError}
          onDismiss={() => undefined}
        />
      ) : null}

      {noTermAvailable ? (
        <Card>
          <h2 className="text-lg font-semibold theme-text">Term Required</h2>
          <p className="mt-2 text-sm theme-muted">
            Create or select a term before generating a formal learner progress report.
          </p>
        </Card>
      ) : null}

      {effectiveTermId && reportLoading ? (
        <ReportPreparingState
          title={`Building ${student?.full_name ?? 'learner'}'s term progress report...`}
          steps={[
            'Reading learner and term scope',
            'Loading attendance and classroom evidence',
            'Reading CBC projections and teacher reviews',
            'Preparing the report preview',
          ]}
          activeStep={1}
        />
      ) : null}

      {report && !reportLoading ? (
        <>
          <Card>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex items-start gap-4">
                <div className="theme-info-surface flex h-14 w-14 items-center justify-center rounded-xl">
                  <User className="h-7 w-7" />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-xl font-semibold theme-text">{report.learner.name}</h2>
                    <Badge variant={statusBadgeVariant(report.document_state)}>
                      {labelize(report.document_state)}
                    </Badge>
                  </div>
                  <p className="mt-2 text-sm theme-muted">
                    {report.learner.admission_number}
                    {report.learner.cohort ? ` · ${report.learner.cohort}` : ''}
                    {report.learner.level ? ` · ${report.learner.level}` : ''}
                  </p>
                  <p className="mt-1 text-sm theme-subtle">
                    {report.organization.name} · {report.academic_year.name} · {report.term.name}
                  </p>
                </div>
              </div>

              <div className="text-sm theme-muted">
                <p>Generated {formatReportDate(report.generated_at)}</p>
                <p className="mt-1">{report.learning_areas.length} learning areas included</p>
              </div>
            </div>
          </Card>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <ReportMetricCard
              label="Attendance"
              value={formatReportPercent(report.attendance_summary.attendance_percentage)}
              note={report.attendance_summary.evidence_reliability_note}
              tone={report.attendance_summary.sessions_recorded > 0 ? 'success' : 'warning'}
            />
            <ReportMetricCard
              label="Sessions Attended"
              value={`${report.attendance_summary.sessions_attended}/${report.attendance_summary.sessions_recorded}`}
              note={labelize(report.attendance_summary.status)}
              tone="neutral"
            />
            <ReportMetricCard
              label="Learning Areas"
              value={report.learning_areas.length}
              note="Subjects enrolled during the selected term."
              tone="neutral"
            />
            <ReportMetricCard
              label="Document State"
              value={labelize(report.document_state)}
              note="Draft reports use current mutable server projections."
              tone={report.document_state === 'OFFICIAL' ? 'success' : 'warning'}
            />
          </div>

          <Card>
            <div className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-[color:var(--color-primary)]" />
              <h2 className="text-lg font-semibold theme-text">CBC Level Legend</h2>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {[
                ['EE', 'Exceeding Expectations'],
                ['ME', 'Meeting Expectations'],
                ['AE', 'Approaching Expectations'],
                ['BE', 'Below Expectations'],
                ['Awaiting Evidence', 'No sufficient evidence-backed level yet'],
              ].map(([code, label]) => (
                <div key={code} className="rounded-lg border theme-border theme-surface-muted p-3">
                  <p className="font-semibold theme-text">{code}</p>
                  <p className="mt-1 text-sm theme-muted">{label}</p>
                </div>
              ))}
            </div>
          </Card>

          <section aria-labelledby="learning-areas" className="space-y-4">
            <div className="flex items-center gap-2">
              <BookOpenCheck className="h-5 w-5 text-[color:var(--color-primary)]" />
              <h2 id="learning-areas" className="text-xl font-semibold theme-text">Learning Areas</h2>
            </div>
            {report.learning_areas.map((area) => (
              <LearningAreaCard
                key={area.cohort_subject_id}
                area={area}
                learnerId={learnerId}
                returnTo={`/reports/learners/${learnerId}/overview${returnToQuery ? `?${returnToQuery}` : ''}`}
              />
            ))}
          </section>

          <Card>
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-[color:var(--color-primary)]" />
              <h2 className="text-lg font-semibold theme-text">Core Competencies</h2>
            </div>
            {report.core_competencies.available ? (
              <p className="mt-3 text-sm theme-muted">
                Core competency evidence is included in the server payload.
              </p>
            ) : (
              <p className="mt-3 text-sm theme-muted">
                {report.core_competencies.message
                  ?? 'Core competency reporting is not yet available from verified evidence.'}
              </p>
            )}
          </Card>

          <Card>
            <h2 className="text-lg font-semibold theme-text">Evidence Integrity</h2>
            <ul className="mt-4 space-y-2 text-sm theme-muted">
              {report.evidence_integrity.statements.map((statement) => (
                <li key={statement} className="rounded-lg border theme-border theme-surface-muted p-3">
                  {statement}
                </li>
              ))}
            </ul>
          </Card>

          <EvidenceMetrics report={report} />
        </>
      ) : null}
    </div>
  );
}
