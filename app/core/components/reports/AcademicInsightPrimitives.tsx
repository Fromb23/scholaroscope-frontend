'use client';

import { useState } from 'react';
import {
  Activity,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  FileText,
  Lightbulb,
  ShieldCheck,
} from 'lucide-react';
import { Badge } from '@/app/components/ui/Badge';
import { Button } from '@/app/components/ui/Button';
import { Card } from '@/app/components/ui/Card';
import type {
  AcademicOutcomeRef,
  ClassSubjectIntelligence,
  ClassSubjectIntelligenceSupportingDetail,
  EvidenceConfidenceLevel,
  EvidenceGapReason,
  IntelligenceStatus,
  LearnerSubjectIntelligence,
  OutcomeExposureStatus,
  OutcomeTeachingPriority,
  TrendDirection,
} from '@/app/core/types/academicIntelligence';

export function academicInsightStatusTone(status: IntelligenceStatus): 'success' | 'warning' | 'danger' | 'default' {
  if (status === 'ON_TRACK') return 'success';
  if (status === 'DEVELOPING' || status === 'NEEDS_MORE_EVIDENCE' || status === 'BASELINE_REQUIRED') return 'warning';
  if (status === 'NEEDS_SUPPORT') return 'danger';
  return 'default';
}

export function academicInsightTrendLabel(direction: TrendDirection): string {
  switch (direction) {
    case 'IMPROVING':
      return 'Improving';
    case 'STABLE':
      return 'Stable';
    case 'DECLINING':
      return 'Declining';
    case 'VOLATILE':
      return 'Volatile';
    case 'TOO_EARLY_TO_TELL':
      return 'Too early to tell';
    case 'INSUFFICIENT_EVIDENCE':
      return 'Insufficient evidence';
    default:
      return direction;
  }
}

export function academicInsightConfidenceVariant(level: EvidenceConfidenceLevel): 'success' | 'warning' | 'default' {
  if (level === 'HIGH') return 'success';
  if (level === 'MODERATE') return 'warning';
  return 'default';
}

export function academicInsightActionLabel(type: string): string {
  return type.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (match) => match.toUpperCase());
}

export function academicInsightConfidenceLabel(level: EvidenceConfidenceLevel): string {
  switch (level) {
    case 'HIGH':
      return 'High';
    case 'MODERATE':
      return 'Moderate';
    default:
      return 'Limited';
  }
}

export function friendlyOutcomeExposureStatus(status: OutcomeExposureStatus): string {
  switch (status) {
    case 'NOT_IN_RECORDED_TEACHING_SCOPE':
      return 'Not in recorded teaching scope';
    case 'TAUGHT_NO_DIRECT_EVIDENCE':
      return 'Taught, but no direct learner evidence';
    case 'LIMITED_DIRECT_EVIDENCE':
      return 'Direct evidence is still limited';
    case 'SUFFICIENT_DIRECT_EVIDENCE':
      return 'Direct evidence is sufficient';
    case 'BROAD_SUBJECT_EVIDENCE_ONLY':
      return 'Broad subject evidence only';
    default:
      return status;
  }
}

export function friendlyEvidenceGapReason(reason: EvidenceGapReason): string {
  switch (reason) {
    case 'NO_DIRECT_LEARNER_EVIDENCE':
      return 'No direct learner evidence has been recorded yet.';
    case 'LOW_LEARNER_COVERAGE':
      return 'Evidence covers too few eligible learners for a class conclusion.';
    case 'INSUFFICIENT_INDEPENDENT_SOURCES':
      return 'Evidence comes from too few independent sources.';
    case 'BROAD_SUBJECT_SIGNAL_ONLY':
      return 'A broad subject signal exists, but it is not outcome-specific.';
    case 'NOT_IN_RECORDED_SCOPE':
      return 'This outcome has no recorded current-term exposure.';
    default:
      return 'No evidence gap is currently flagged.';
  }
}

export function hasUnsupportedCausalAcademicLanguage(message: string): boolean {
  const normalized = message.toLowerCase();
  return [
    'caused failure',
    'caused the decline',
    'failed because',
    'teacher caused',
    'learner is lazy',
    'learner is weak',
  ].some((phrase) => normalized.includes(phrase));
}

export function EvidenceConfidenceBadge({
  level,
  label,
}: {
  level: EvidenceConfidenceLevel;
  label?: string;
}) {
  return <Badge variant={academicInsightConfidenceVariant(level)}>{label || level}</Badge>;
}

export function TrendIndicator({
  direction,
  message,
}: {
  direction: TrendDirection;
  message?: string;
}) {
  return (
    <div className="flex items-start gap-2 rounded-lg border theme-border theme-surface-muted px-3 py-2">
      <Activity className="mt-0.5 h-4 w-4 theme-subtle" />
      <div>
        <p className="text-sm font-medium theme-text">{academicInsightTrendLabel(direction)}</p>
        {message ? <p className="mt-1 text-sm theme-muted">{message}</p> : null}
      </div>
    </div>
  );
}

export function RecommendedActionCard({
  action,
}: {
  action: { type: string; message: string };
}) {
  return (
    <div className="rounded-lg border border-amber-200 theme-warning-surface px-4 py-3">
      <div className="flex items-start gap-3">
        <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
        <div>
          <p className="text-sm font-semibold theme-text">
            {academicInsightActionLabel(action.type)}
          </p>
          <p className="mt-1 text-sm theme-text">{action.message}</p>
        </div>
      </div>
    </div>
  );
}

function formatOutcomeNames(outcomes: OutcomeTeachingPriority[], limit = 3): string {
  const labels = outcomes
    .slice(0, limit)
    .map((outcome) => `"${outcome.description}"`);

  if (labels.length === 0) return 'the recorded outcomes';
  if (labels.length === 1) return labels[0];
  if (labels.length === 2) return `${labels[0]} and ${labels[1]}`;
  return `${labels.slice(0, -1).join(', ')}, and ${labels.at(-1)}`;
}

export function classEvidenceReliabilityMessage(intelligence: ClassSubjectIntelligence): string {
  const { teaching_priority: teachingPriority } = intelligence;
  const topOutcome = teachingPriority.priority_outcomes[0];
  const evidenceCount = teachingPriority.supporting_counts.outcomes_needing_evidence;

  if (teachingPriority.state === 'RETEACH' && topOutcome) {
    return `${academicInsightConfidenceLabel(teachingPriority.confidence)}: direct evidence covers ${topOutcome.learners_with_direct_evidence} of ${topOutcome.eligible_learner_count} eligible learners.`;
  }

  if (teachingPriority.state === 'COLLECT_EVIDENCE') {
    if (evidenceCount <= 0) {
      return 'Limited until more direct learner evidence is recorded.';
    }
    return `Limited for ${evidenceCount} outcome${evidenceCount === 1 ? '' : 's'} currently in recorded teaching scope.`;
  }

  if (teachingPriority.state === 'RETHINK_EXPOSURE') {
    return 'Limited until current-term teaching exposure is recorded explicitly.';
  }

  if (topOutcome) {
    return `${academicInsightConfidenceLabel(teachingPriority.confidence)} for the outcomes currently in recorded scope.`;
  }

  return `${academicInsightConfidenceLabel(teachingPriority.confidence)} based on the recorded class evidence currently in scope.`;
}

function classSuccessLine(detail: ClassSubjectIntelligenceSupportingDetail): string | null {
  if (detail.secure_outcomes.length === 0) {
    return null;
  }
  return `What is going well: ${formatOutcomeNames(detail.secure_outcomes, 2)} currently show the strongest supported evidence.`;
}

export function ParticipationContextPanel({
  intelligence,
}: {
  intelligence: LearnerSubjectIntelligence;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="rounded-lg border theme-border theme-surface-muted px-4 py-3">
        <p className="text-xs uppercase tracking-wide theme-subtle">Attendance Context</p>
        <p className="mt-1 text-sm font-semibold theme-text">
          {intelligence.participation.attendance_status?.replace(/_/g, ' ') || 'Limited records'}
        </p>
        <p className="mt-1 text-sm theme-muted">{intelligence.participation.attendance_message}</p>
      </div>
      <div className="rounded-lg border theme-border theme-surface-muted px-4 py-3">
        <p className="text-xs uppercase tracking-wide theme-subtle">Assignment Context</p>
        <p className="mt-1 text-sm font-semibold theme-text">
          {intelligence.participation.assignment_completion_status?.replace(/_/g, ' ') || 'Limited records'}
        </p>
        <p className="mt-1 text-sm theme-muted">{intelligence.participation.assignment_message}</p>
      </div>
    </div>
  );
}

export function OutcomeSignalTable({
  title,
  outcomes,
  emptyMessage,
}: {
  title: string;
  outcomes: AcademicOutcomeRef[];
  emptyMessage: string;
}) {
  return (
    <div>
      <h3 className="text-sm font-semibold theme-text">{title}</h3>
      {outcomes.length === 0 ? (
        <p className="mt-2 text-sm theme-muted">{emptyMessage}</p>
      ) : (
        <div className="mt-3 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b theme-border text-left text-xs uppercase tracking-wide theme-subtle">
                <th className="px-3 py-2">Outcome</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2 text-right">Evidence</th>
              </tr>
            </thead>
            <tbody>
              {outcomes.map((outcome) => (
                <tr key={outcome.id} className="border-b theme-border align-top">
                  <td className="px-3 py-3">
                    <p className="font-medium theme-text">{outcome.code}</p>
                    <p className="mt-1 theme-muted line-clamp-2">{outcome.description}</p>
                  </td>
                  <td className="px-3 py-3 theme-muted">{outcome.status?.replace(/_/g, ' ') || 'Review'}</td>
                  <td className="px-3 py-3 text-right theme-muted">{outcome.evidence_count ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export function EvidenceExplanationPanel({
  intelligence,
}: {
  intelligence: LearnerSubjectIntelligence;
}) {
  const [open, setOpen] = useState(false);
  const evidence = intelligence.evidence_details ?? [];

  return (
    <Card className="p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-base font-semibold theme-text">Why This Insight?</h2>
          <p className="mt-1 text-sm theme-muted">
            {intelligence.why?.confidence_basis || intelligence.confidence.message}
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={() => setOpen((current) => !current)}>
          <FileText className="h-4 w-4" />
          {open ? 'Hide evidence' : 'See evidence'}
          {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </Button>
      </div>

      {open ? (
        <div className="mt-5 space-y-5">
          <ParticipationContextPanel intelligence={intelligence} />

          <div className="rounded-lg border theme-border theme-surface-muted px-4 py-3">
            <p className="text-xs uppercase tracking-wide theme-subtle">Observed Pattern</p>
            <p className="mt-1 text-sm theme-text">
              {intelligence.why?.observed_pattern || intelligence.trend.message}
            </p>
          </div>

          <div className="grid gap-5 xl:grid-cols-2">
            <OutcomeSignalTable
              title="Strongest Outcomes"
              outcomes={intelligence.outcomes.strongest}
              emptyMessage="No strong outcomes are identified yet."
            />
            <OutcomeSignalTable
              title="Developing Or Unknown Outcomes"
              outcomes={[...intelligence.outcomes.developing, ...intelligence.outcomes.unknown].slice(0, 8)}
              emptyMessage="No developing or unknown outcomes are listed yet."
            />
          </div>

          <div>
            <h3 className="text-sm font-semibold theme-text">Evidence Sources</h3>
            {evidence.length === 0 ? (
              <p className="mt-2 text-sm theme-muted">Evidence detail is not available in this view.</p>
            ) : (
              <div className="mt-3 divide-y theme-border rounded-lg border theme-border">
                {evidence.slice(0, 8).map((item, index) => (
                  <div key={item.event_id ?? `${item.source_type}-${index}`} className="px-4 py-3 text-sm">
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="font-medium theme-text">{item.label}</p>
                        <p className="mt-1 theme-muted">{item.message}</p>
                      </div>
                      <span className="shrink-0 theme-subtle">{item.event_date || 'No date'}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : null}
    </Card>
  );
}

export function InsightStatusCard({
  intelligence,
}: {
  intelligence: LearnerSubjectIntelligence;
}) {
  const firstAction = intelligence.recommended_actions[0];

  return (
    <Card className="p-5">
      <div className="space-y-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={academicInsightStatusTone(intelligence.status)}>{intelligence.status_label}</Badge>
              <EvidenceConfidenceBadge level={intelligence.confidence.level} label={intelligence.confidence.label} />
              {intelligence.official_result.available && !intelligence.official_result.is_final ? (
                <Badge variant="warning">CBC not awarded</Badge>
              ) : null}
            </div>
            <h2 className="mt-3 text-lg font-semibold theme-text">Current Picture</h2>
            <p className="mt-1 text-sm theme-muted">{intelligence.current_picture}</p>
          </div>

          <div className="rounded-lg border theme-border theme-surface-muted px-4 py-3 lg:max-w-sm">
            <div className="flex items-start gap-2">
              <ShieldCheck className="mt-0.5 h-4 w-4 theme-subtle" />
              <div>
                <p className="text-sm font-semibold theme-text">Confidence</p>
                <p className="mt-1 text-sm theme-muted">{intelligence.confidence.message}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <TrendIndicator direction={intelligence.trend.direction} message={intelligence.trend.message} />
          {firstAction ? (
            <RecommendedActionCard action={firstAction} />
          ) : (
            <div className="rounded-lg border theme-border theme-surface-muted px-4 py-3">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 theme-subtle" />
                <p className="text-sm theme-muted">No immediate action is recommended.</p>
              </div>
            </div>
          )}
        </div>

        {intelligence.possible_contributing_factors.length > 0 ? (
          <div>
            <p className="text-sm font-semibold theme-text">Possible Contributing Factors</p>
            <div className="mt-2 grid gap-2">
              {intelligence.possible_contributing_factors.map((factor) => (
                <div key={factor.type} className="rounded-lg border theme-border px-3 py-2 text-sm theme-muted">
                  {factor.message}
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {intelligence.official_result.available ? (
          <div className="rounded-lg border theme-border theme-surface-muted px-4 py-3 text-sm">
            <p className="font-semibold theme-text">Official CBC Result</p>
            <p className="mt-1 theme-muted">
              {intelligence.official_result.is_final
                ? `${intelligence.official_result.cbc_code ?? 'Final'} · ${intelligence.official_result.cbc_points ?? 'No points'} points`
                : intelligence.official_result.not_awarded_message || intelligence.official_result.message}
            </p>
          </div>
        ) : null}
      </div>
    </Card>
  );
}

export function LearnerSubjectIntelligencePanel({
  intelligence,
}: {
  intelligence: LearnerSubjectIntelligence;
}) {
  return (
    <section className="space-y-4">
      <InsightStatusCard intelligence={intelligence} />
      <EvidenceExplanationPanel intelligence={intelligence} />
    </section>
  );
}

export function ClassSubjectIntelligencePanel({
  intelligence,
}: {
  intelligence: ClassSubjectIntelligence;
}) {
  const [detailOpen, setDetailOpen] = useState(false);
  const teachingPriority = intelligence.teaching_priority;
  const visiblePriorities = teachingPriority.priority_outcomes.slice(0, 3);
  const successLine = classSuccessLine(intelligence.supporting_detail);

  return (
    <section className="space-y-4">
      <Card className="p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={academicInsightStatusTone(intelligence.status)}>Class Academic Intelligence</Badge>
              <Badge variant="default">{intelligence.scope.term_name}</Badge>
            </div>
            <p className="mt-3 text-sm theme-muted">
              {intelligence.scope.term_name} · {intelligence.scope.cohort_name} · {intelligence.scope.subject_name}
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-4 xl:grid-cols-2">
          <ClassInsightBlock
            title="Current picture"
            body={teachingPriority.headline}
          />
          <ClassInsightBlock
            title="Evidence reliability"
            body={classEvidenceReliabilityMessage(intelligence)}
          />
          <ClassInsightBlock
            title="Next best action"
            body={teachingPriority.recommended_action.message}
          />
          <ClassInsightBlock
            title="Why this action"
            body={teachingPriority.why_it_matters}
          />
          <ClassInsightBlock
            title="Confidence"
            body={academicInsightConfidenceLabel(teachingPriority.confidence)}
          />
          {successLine ? (
            <ClassInsightBlock
              title="What is going well"
              body={successLine.replace('What is going well: ', '')}
            />
          ) : null}
        </div>

        {visiblePriorities.length > 0 ? (
          <div className="mt-5 rounded-lg border theme-border theme-surface-muted px-4 py-3">
            <p className="text-xs uppercase tracking-wide theme-subtle">Priority outcomes</p>
            <p className="mt-2 text-sm theme-text">{formatOutcomeNames(visiblePriorities)}</p>
          </div>
        ) : null}
      </Card>

      <Card className="p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-base font-semibold theme-text">Supporting evidence</h3>
            <p className="mt-1 text-sm theme-muted">
              Expand only when you need the audit trail behind the recommendation.
            </p>
          </div>
          <Button variant="secondary" size="sm" onClick={() => setDetailOpen((current) => !current)}>
            <FileText className="h-4 w-4" />
            {detailOpen ? 'Hide supporting evidence' : 'See supporting evidence'}
            {detailOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>

        {detailOpen ? (
          <div className="mt-5 space-y-5">
            <SupportingOutcomeGroup
              title="Priority outcomes"
              outcomes={teachingPriority.priority_outcomes}
              emptyMessage="No priority outcomes are currently surfaced."
            />

            {intelligence.supporting_detail.subject_context.assessment_count ? (
              <div className="rounded-lg border theme-border theme-surface-muted px-4 py-3">
                <p className="text-sm font-semibold theme-text">Broad subject context</p>
                <p className="mt-1 text-sm theme-muted">
                  {intelligence.supporting_detail.subject_context.message}
                </p>
              </div>
            ) : null}

            <SupportingOutcomeGroup
              title="What is going well"
              outcomes={intelligence.supporting_detail.secure_outcomes}
              emptyMessage="No secure outcomes are summarised yet."
            />

            <SupportingOutcomeGroup
              title="Not yet in recorded teaching scope"
              outcomes={intelligence.supporting_detail.outcomes_not_in_recorded_scope}
              emptyMessage="All surfaced outcomes are already in recorded teaching scope."
            />
          </div>
        ) : null}
      </Card>
    </section>
  );
}

function ClassInsightBlock({
  title,
  body,
}: {
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-lg border theme-border px-4 py-3">
      <p className="text-xs uppercase tracking-wide theme-subtle">{title}</p>
      <p className="mt-2 text-sm theme-text">{body}</p>
    </div>
  );
}

function SupportingOutcomeGroup({
  title,
  outcomes,
  emptyMessage,
}: {
  title: string;
  outcomes: OutcomeTeachingPriority[];
  emptyMessage: string;
}) {
  if (outcomes.length === 0) {
    return (
      <div>
        <h4 className="text-sm font-semibold theme-text">{title}</h4>
        <p className="mt-2 text-sm theme-muted">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div>
      <h4 className="text-sm font-semibold theme-text">{title}</h4>
      <div className="mt-3 space-y-3">
        {outcomes.map((outcome) => (
          <OutcomeAuditCard key={outcome.id} outcome={outcome} />
        ))}
      </div>
    </div>
  );
}

function OutcomeAuditCard({ outcome }: { outcome: OutcomeTeachingPriority }) {
  return (
    <div className="rounded-lg border theme-border theme-surface-muted px-4 py-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-semibold theme-text">{outcome.description}</p>
          <p className="mt-1 text-xs theme-subtle">Code: {outcome.code}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="default">{friendlyOutcomeExposureStatus(outcome.exposure_status)}</Badge>
          <Badge variant={academicInsightConfidenceVariant(outcome.evidence_confidence)}>
            {academicInsightConfidenceLabel(outcome.evidence_confidence)}
          </Badge>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div>
          <p className="text-xs uppercase tracking-wide theme-subtle">Learner coverage</p>
          <p className="mt-1 text-sm theme-text">
            {outcome.learners_with_direct_evidence} of {outcome.eligible_learner_count} eligible learners ({outcome.coverage_percent}%)
          </p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide theme-subtle">Why surfaced</p>
          <p className="mt-1 text-sm theme-text">{friendlyEvidenceGapReason(outcome.evidence_gap_reason)}</p>
        </div>
      </div>

      {outcome.recorded_exposure_sources.length > 0 ? (
        <div className="mt-4">
          <p className="text-xs uppercase tracking-wide theme-subtle">Recorded exposure</p>
          <div className="mt-2 space-y-2">
            {outcome.recorded_exposure_sources.map((source, index) => (
              <p key={`${source.type}-${source.date ?? 'nodate'}-${index}`} className="text-sm theme-muted">
                {source.label}
                {source.date ? ` · ${source.date}` : ''}
              </p>
            ))}
          </div>
        </div>
      ) : null}

      <div className="mt-4 rounded-lg border theme-border bg-white/60 px-3 py-2">
        <p className="text-xs uppercase tracking-wide theme-subtle">Suggested follow-up</p>
        <p className="mt-1 text-sm theme-text">{outcome.recommended_action}</p>
      </div>
    </div>
  );
}

export function ReportReadinessPanel({
  readiness,
}: {
  readiness: number | null;
}) {
  return (
    <Card className="p-5">
      <p className="text-sm font-medium theme-muted">Term Evidence Readiness</p>
      <p className="mt-2 text-2xl font-semibold theme-text">
        {readiness == null ? 'No data yet' : `${readiness.toFixed(1)}%`}
      </p>
      <p className="mt-2 text-sm theme-subtle">
        Final result readiness reflects controlled official CBC results, not operational intelligence alone.
      </p>
    </Card>
  );
}
