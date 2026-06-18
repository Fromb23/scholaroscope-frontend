'use client';

import { useState } from 'react';
import {
  Activity,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ClipboardCheck,
  FileText,
  Lightbulb,
  ShieldCheck,
  Target,
} from 'lucide-react';
import { Badge } from '@/app/components/ui/Badge';
import { Button } from '@/app/components/ui/Button';
import { Card } from '@/app/components/ui/Card';
import type {
  AcademicOutcomeRef,
  ClassSubjectIntelligence,
  EvidenceConfidenceLevel,
  IntelligenceStatus,
  LearnerSubjectIntelligence,
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
  const firstAction = intelligence.suggested_next_teaching_action[0];

  return (
    <section className="space-y-4">
      <Card className="p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={academicInsightStatusTone(intelligence.status)}>{intelligence.status_label}</Badge>
              <Badge variant="default">{intelligence.scope.term_name}</Badge>
            </div>
            <h2 className="mt-3 text-lg font-semibold theme-text">Class Learning Picture</h2>
            <p className="mt-1 text-sm theme-muted">{intelligence.class_learning_picture}</p>
          </div>
          {firstAction ? (
            <div className="lg:max-w-md">
              <RecommendedActionCard action={firstAction} />
            </div>
          ) : null}
        </div>
      </Card>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="p-5">
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 theme-subtle" />
            <h3 className="text-sm font-semibold theme-text">Outcomes Needing Reteaching</h3>
          </div>
          <OutcomeList outcomes={intelligence.outcomes_needing_reteaching} emptyMessage="No class-wide reteaching outcome is flagged." />
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-2">
            <ClipboardCheck className="h-4 w-4 theme-subtle" />
            <h3 className="text-sm font-semibold theme-text">Needs More Evidence</h3>
          </div>
          <OutcomeList outcomes={intelligence.outcomes_with_insufficient_evidence} emptyMessage="No high missing-evidence outcome is flagged." />
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 theme-subtle" />
            <h3 className="text-sm font-semibold theme-text">Most Secure Outcomes</h3>
          </div>
          <OutcomeList outcomes={intelligence.most_secure_outcomes} emptyMessage="No secure outcome is identified yet." />
        </Card>
      </div>
    </section>
  );
}

function OutcomeList({
  outcomes,
  emptyMessage,
}: {
  outcomes: AcademicOutcomeRef[];
  emptyMessage: string;
}) {
  if (outcomes.length === 0) {
    return <p className="mt-3 text-sm theme-muted">{emptyMessage}</p>;
  }

  return (
    <div className="mt-3 space-y-3">
      {outcomes.slice(0, 4).map((outcome) => (
        <div key={outcome.id} className="rounded-lg border theme-border theme-surface-muted px-3 py-2">
          <p className="text-sm font-semibold theme-text">{outcome.code}</p>
          <p className="mt-1 text-sm theme-muted line-clamp-2">{outcome.description}</p>
        </div>
      ))}
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
