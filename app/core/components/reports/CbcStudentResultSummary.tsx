'use client';

import { useState } from 'react';
import {
  AlertTriangle,
  ClipboardList,
  FileText,
  Save,
  ShieldCheck,
} from 'lucide-react';
import { Badge } from '@/app/components/ui/Badge';
import { cbcReportingAPI } from '@/app/core/api/reporting';
import type {
  CbcAssessmentIndicator,
  CbcCompetencyCoverage,
  CbcEvidenceSummary,
  CbcObservationRecord,
  CbcOutcomeDistribution,
  CbcOutcomeReference,
  CbcPortfolioEntry,
  CbcStudentResult,
  CbcStudentSection,
  CbcTeacherReview,
} from '@/app/core/types/reporting';
import {
  formatDateTime,
  formatNumber,
  formatPercent,
  resolveCbcCompetencyResult,
  resolveCbcReadiness,
  resolveCbcStudentResult,
} from '@/app/core/lib/reportingPresentation';

interface CbcStudentResultSummaryProps {
  cbc: CbcStudentSection | CbcStudentResult | null | undefined;
  canManageReview?: boolean;
  onReviewSaved?: (review: CbcTeacherReview) => void;
}

export function CbcStudentResultSummary({
  cbc,
  canManageReview = false,
  onReviewSaved,
}: CbcStudentResultSummaryProps) {
  const competency = resolveCbcCompetencyResult(cbc);
  const legacyResult = resolveCbcStudentResult(cbc);
  const readiness = resolveCbcReadiness(cbc) ?? competency?.readiness ?? null;
  const section = isCbcSection(cbc) ? cbc : null;
  const assessmentIndicator = section?.assessment_indicator ?? toAssessmentIndicator(legacyResult);
  const teacherReview = section?.teacher_review ?? null;
  const portfolioEntries = section?.portfolio?.entries ?? [];
  const observationRecords = section?.observation_records ?? [];

  if (!competency) {
    return (
      <p className="text-sm text-gray-500">
        No CBC competency result is available yet.
      </p>
    );
  }

  const performance = competency.performance;
  const statusLabel = labelize(performance.status);
  const level = performance.level || 'Not awarded';
  const missingRequirements = readiness?.missing_requirements ?? readiness?.missing_components ?? [];

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <ClipboardList className="mt-1 h-5 w-5 text-green-600" aria-hidden="true" />
          <div>
            <h3 className="text-sm font-semibold text-gray-900">CBC Competency Result</h3>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="text-2xl font-semibold text-gray-950">{level}</span>
              {performance.label && (
                <span className="text-sm font-medium text-gray-700">{performance.label}</span>
              )}
              <Badge variant={statusVariant(performance.status)}>{statusLabel}</Badge>
              {readiness?.is_stale && <Badge variant="orange">Stale</Badge>}
            </div>
          </div>
        </div>
        <div className="text-left sm:text-right">
          <p className="text-xs text-gray-500">Computed At</p>
          <p className="text-sm font-medium text-gray-900">{formatDateTime(competency.computed_at ?? null)}</p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Outcomes Observed" value={formatNumber(competency.coverage.outcomes_observed, 0)} />
        <Metric label="Outcomes Taught" value={formatNumber(competency.coverage.outcomes_taught, 0)} />
        <Metric label="Evidence Records" value={formatNumber(competency.evidence_summary.total, 0)} />
        <Metric label="Evidence Sufficiency" value={readiness?.is_final ? 'Ready' : statusLabel} />
      </div>

      {missingRequirements.length > 0 && (
        <div className="flex gap-3 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <p>{missingRequirements.map(labelize).join(', ')}</p>
        </div>
      )}

      <CoverageGrid coverage={competency.coverage} />
      <DistributionGrid distribution={competency.distribution} />

      <div className="grid gap-4 lg:grid-cols-2">
        <OutcomeList title="Strengths" items={competency.strengths} emptyText="No final ME or EE outcomes recorded." />
        <OutcomeList title="Support Needed" items={competency.support_needed} emptyText="No final AE or BE outcomes recorded." />
      </div>

      <EvidenceSummary summary={competency.evidence_summary} />
      <TeacherReviewPanel
        resultId={competency.id}
        review={teacherReview}
        canManage={canManageReview}
        onSaved={onReviewSaved}
      />
      <EvidenceRecords entries={portfolioEntries} observations={observationRecords} />
      <AssessmentDetails indicator={assessmentIndicator} legacyResult={legacyResult} />
    </div>
  );
}

function isCbcSection(value: CbcStudentResultSummaryProps['cbc']): value is CbcStudentSection {
  return !!value && typeof value === 'object' && 'reporting_source' in value && value.reporting_source === 'cbc';
}

function toAssessmentIndicator(result: CbcStudentResult | null): CbcAssessmentIndicator | null {
  if (!result) return null;
  return {
    weighted_score: result.weighted_score,
    component_scores: result.component_scores ?? {},
    diagnostic_scores: result.diagnostic_scores ?? {},
    missing_components: result.missing_components ?? [],
    result_status: result.result_status,
    is_stale: result.is_stale,
    computed_at: result.computed_at,
  };
}

function statusVariant(status: string): 'green' | 'yellow' | 'orange' | 'default' {
  if (status === 'FINAL') return 'green';
  if (status === 'PROVISIONAL') return 'yellow';
  if (status === 'NO_EVIDENCE') return 'orange';
  return 'default';
}

function labelize(value: string | null | undefined): string {
  return String(value ?? '').replace(/_/g, ' ').trim() || 'Not available';
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-gray-200 px-3 py-2">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="mt-1 text-base font-semibold text-gray-900">{value}</p>
    </div>
  );
}

function CoverageGrid({ coverage }: { coverage: CbcCompetencyCoverage }) {
  return (
    <section aria-labelledby="cbc-coverage-heading">
      <h4 id="cbc-coverage-heading" className="text-sm font-semibold text-gray-900">Competency Coverage</h4>
      <div className="mt-2 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Selected" value={formatNumber(coverage.outcomes_selected, 0)} />
        <Metric label="Taught" value={formatNumber(coverage.outcomes_taught, 0)} />
        <Metric label="Observed" value={formatNumber(coverage.outcomes_observed, 0)} />
        <Metric label="Taught Not Observed" value={formatNumber(coverage.outcomes_taught_not_observed, 0)} />
      </div>
    </section>
  );
}

function DistributionGrid({ distribution }: { distribution: CbcOutcomeDistribution }) {
  const entries: Array<[string, number]> = [
    ['EE', distribution.EE ?? 0],
    ['ME', distribution.ME ?? 0],
    ['AE', distribution.AE ?? 0],
    ['BE', distribution.BE ?? 0],
    ['Provisional', distribution.PROVISIONAL ?? 0],
    ['No Evidence', distribution.NO_EVIDENCE ?? 0],
  ];

  return (
    <section aria-labelledby="cbc-distribution-heading">
      <h4 id="cbc-distribution-heading" className="text-sm font-semibold text-gray-900">Outcome Distribution</h4>
      <div className="mt-2 grid gap-2 sm:grid-cols-3 xl:grid-cols-6">
        {entries.map(([label, value]) => (
          <div key={label} className="rounded-md border border-gray-200 px-3 py-2">
            <p className="text-xs text-gray-500">{label}</p>
            <p className="mt-1 text-base font-semibold text-gray-900">{formatNumber(value, 0)}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function OutcomeList({
  title,
  items,
  emptyText,
}: {
  title: string;
  items: CbcOutcomeReference[];
  emptyText: string;
}) {
  return (
    <section aria-label={title}>
      <h4 className="text-sm font-semibold text-gray-900">{title}</h4>
      {items.length === 0 ? (
        <p className="mt-2 text-sm text-gray-500">{emptyText}</p>
      ) : (
        <ul className="mt-2 space-y-2">
          {items.slice(0, 6).map((item) => (
            <li key={`${item.outcome_id}-${item.level}`} className="rounded-md border border-gray-200 px-3 py-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium text-gray-900">{item.code}</span>
                {item.level && <Badge variant={statusVariant('FINAL')}>{item.level}</Badge>}
              </div>
              <p className="mt-1 text-sm text-gray-600">{item.description}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function EvidenceSummary({ summary }: { summary: CbcEvidenceSummary }) {
  const entries: Array<[string, number | undefined]> = [
    ['Total', summary.total],
    ['Observations', summary.observations],
    ['Assignments', summary.assignments],
    ['Group Assignments', summary.group_assignments],
    ['Projects', summary.projects],
    ['Practicals', summary.practicals],
    ['Assessments', summary.assessments],
    ['Rubric', summary.rubric],
    ['Numeric', summary.numeric],
    ['Descriptive', summary.descriptive],
    ['Competency', summary.competency],
  ];

  return (
    <section aria-labelledby="cbc-evidence-summary-heading">
      <h4 id="cbc-evidence-summary-heading" className="text-sm font-semibold text-gray-900">Evidence Considered</h4>
      <div className="mt-2 grid gap-2 sm:grid-cols-3 xl:grid-cols-6">
        {entries.map(([label, value]) => (
          <div key={label} className="rounded-md border border-gray-200 px-3 py-2">
            <p className="text-xs text-gray-500">{label}</p>
            <p className="mt-1 text-sm font-semibold text-gray-900">{formatNumber(value ?? 0, 0)}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function TeacherReviewPanel({
  resultId,
  review,
  canManage,
  onSaved,
}: {
  resultId: number;
  review: CbcTeacherReview | null;
  canManage: boolean;
  onSaved?: (review: CbcTeacherReview) => void;
}) {
  const [remark, setRemark] = useState(review?.teacher_remark ?? '');
  const [nextSteps, setNextSteps] = useState((review?.recommended_next_steps ?? []).join('\n'));
  const [contextualNote, setContextualNote] = useState(review?.contextual_note ?? '');
  const [saving, setSaving] = useState(false);
  const [savedReview, setSavedReview] = useState<CbcTeacherReview | null>(review);
  const [error, setError] = useState<string | null>(null);

  const canSave = canManage && resultId > 0;

  async function saveReview(approve = false) {
    if (!canSave) return;
    setSaving(true);
    setError(null);
    try {
      const saved = await cbcReportingAPI.updateSubjectReportReview(resultId, {
        teacher_remark: remark,
        recommended_next_steps: nextSteps.split('\n').map((item) => item.trim()).filter(Boolean),
        contextual_note: contextualNote,
        approve,
      });
      setSavedReview(saved);
      onSaved?.(saved);
    } catch {
      setError('Could not save CBC report review.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <section aria-labelledby="cbc-teacher-review-heading" className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <ShieldCheck className="h-4 w-4 text-green-600" aria-hidden="true" />
        <h4 id="cbc-teacher-review-heading" className="text-sm font-semibold text-gray-900">Teacher Review</h4>
        {savedReview?.approved_at && <Badge variant="green">Approved</Badge>}
        {savedReview?.requires_re_review && <Badge variant="orange">Needs Review</Badge>}
      </div>

      <div className="rounded-md border border-gray-200 p-3">
        <p className="text-sm text-gray-700">{savedReview?.teacher_remark || 'No teacher remark recorded.'}</p>
        {savedReview?.recommended_next_steps?.length ? (
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-gray-700">
            {savedReview.recommended_next_steps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ul>
        ) : null}
      </div>

      {canSave && (
        <div className="space-y-3 rounded-md border border-gray-200 p-3">
          <label className="block text-xs font-medium text-gray-700" htmlFor={`cbc-remark-${resultId}`}>Teacher remark</label>
          <textarea
            id={`cbc-remark-${resultId}`}
            className="min-h-20 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            value={remark}
            onChange={(event) => setRemark(event.target.value)}
          />
          <label className="block text-xs font-medium text-gray-700" htmlFor={`cbc-next-steps-${resultId}`}>Recommended next steps</label>
          <textarea
            id={`cbc-next-steps-${resultId}`}
            className="min-h-20 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            value={nextSteps}
            onChange={(event) => setNextSteps(event.target.value)}
          />
          <label className="block text-xs font-medium text-gray-700" htmlFor={`cbc-context-${resultId}`}>Contextual note</label>
          <input
            id={`cbc-context-${resultId}`}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            value={contextualNote}
            onChange={(event) => setContextualNote(event.target.value)}
          />
          {error && <p className="text-sm text-red-700">{error}</p>}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-md bg-gray-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
              disabled={saving}
              onClick={() => void saveReview(false)}
            >
              <Save className="h-4 w-4" aria-hidden="true" />
              {saving ? 'Saving' : 'Save Review'}
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-900 disabled:opacity-60"
              disabled={saving}
              onClick={() => void saveReview(true)}
            >
              <ShieldCheck className="h-4 w-4" aria-hidden="true" />
              Approve
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

function EvidenceRecords({
  entries,
  observations,
}: {
  entries: CbcPortfolioEntry[];
  observations: CbcObservationRecord[];
}) {
  if (entries.length === 0 && observations.length === 0) return null;

  return (
    <section aria-labelledby="cbc-records-heading">
      <div className="flex items-center gap-2">
        <FileText className="h-4 w-4 text-green-600" aria-hidden="true" />
        <h4 id="cbc-records-heading" className="text-sm font-semibold text-gray-900">Portfolio And Observation Records</h4>
      </div>
      <details className="mt-2 rounded-md border border-gray-200 p-3">
        <summary className="cursor-pointer text-sm font-medium text-gray-900">
          {formatNumber(entries.length + observations.length, 0)} supporting records
        </summary>
        <div className="mt-3 space-y-2">
          {entries.slice(0, 12).map((entry) => (
            <EvidenceRow key={`entry-${entry.evidence_id}`} entry={entry} />
          ))}
          {observations.slice(0, 12).map((observation, index) => (
            <ObservationRow key={`observation-${observation.session ?? index}`} observation={observation} />
          ))}
        </div>
      </details>
    </section>
  );
}

function EvidenceRow({ entry }: { entry: CbcPortfolioEntry }) {
  return (
    <div className="rounded-md border border-gray-100 px-3 py-2">
      <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
        <span>{labelize(entry.source_type)}</span>
        <span>{formatDateTime(entry.observed_at)}</span>
        {entry.performance_level && <Badge variant="green">{entry.performance_level}</Badge>}
        {entry.evaluation_type && <Badge variant="default">{labelize(entry.evaluation_type)}</Badge>}
      </div>
      <p className="mt-1 text-sm font-medium text-gray-900">{entry.learning_outcome?.code ?? 'Outcome'}</p>
      <p className="text-sm text-gray-600">{entry.learning_outcome?.description ?? ''}</p>
      {entry.teacher_narrative && <p className="mt-1 text-sm text-gray-700">{entry.teacher_narrative}</p>}
    </div>
  );
}

function ObservationRow({ observation }: { observation: CbcObservationRecord }) {
  return (
    <div className="rounded-md border border-gray-100 px-3 py-2">
      <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
        <span>Observation</span>
        <span>{formatDateTime(observation.date)}</span>
        {observation.performance_level && <Badge variant="green">{observation.performance_level}</Badge>}
      </div>
      <p className="mt-1 text-sm font-medium text-gray-900">{observation.learning_outcome?.code ?? 'Outcome'}</p>
      <p className="text-sm text-gray-600">{observation.learning_outcome?.description ?? ''}</p>
      {observation.teacher_narrative && <p className="mt-1 text-sm text-gray-700">{observation.teacher_narrative}</p>}
    </div>
  );
}

function AssessmentDetails({
  indicator,
  legacyResult,
}: {
  indicator: CbcAssessmentIndicator | null;
  legacyResult: CbcStudentResult | null;
}) {
  if (!indicator && !legacyResult) return null;

  const componentEntries = Object.entries(indicator?.component_scores ?? legacyResult?.component_scores ?? {});
  const diagnosticEntries = Object.entries(indicator?.diagnostic_scores ?? legacyResult?.diagnostic_scores ?? {});

  return (
    <details className="rounded-md border border-gray-200 p-3">
      <summary className="cursor-pointer text-sm font-semibold text-gray-900">Assessment computation details</summary>
      <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Weighted Score" value={formatPercent(indicator?.weighted_score ?? legacyResult?.weighted_score ?? null)} />
        <Metric label="Result Status" value={labelize(indicator?.result_status ?? legacyResult?.result_status)} />
        <Metric label="Stale" value={indicator?.is_stale || legacyResult?.is_stale ? 'Yes' : 'No'} />
        <Metric label="Computed At" value={formatDateTime(indicator?.computed_at ?? legacyResult?.computed_at ?? null)} />
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <KeyValueList title="Component Scores" entries={componentEntries} />
        <KeyValueList title="Diagnostic Scores" entries={diagnosticEntries} />
      </div>
    </details>
  );
}

function KeyValueList({
  title,
  entries,
}: {
  title: string;
  entries: Array<[string, string | number | boolean | null | undefined]>;
}) {
  if (entries.length === 0) return null;

  return (
    <div>
      <h5 className="text-sm font-medium text-gray-900">{title}</h5>
      <div className="mt-2 space-y-2">
        {entries.map(([key, value]) => (
          <div key={key} className="flex items-center justify-between rounded-md border border-gray-200 px-3 py-2">
            <span className="text-sm text-gray-600">{key.replace(/_/g, ' ')}</span>
            <span className="text-sm font-medium text-gray-900">
              {typeof value === 'number'
                ? value.toFixed(1)
                : typeof value === 'boolean'
                  ? value ? 'Yes' : 'No'
                  : (value ?? 'Not available')}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
