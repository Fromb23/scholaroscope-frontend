'use client';

import { useMemo, useState } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Target,
  Users,
  AlertCircle,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  X,
  FileText,
} from 'lucide-react';
import {
  useStrandDetail,
  useStrandOutcomeDistribution,
  useOutcomeLearners,
} from '@/app/plugins/cbc/hooks/useCBC';
import { useCohorts } from '@/app/core/hooks/useAcademic';
import { useCBCContext } from '@/app/plugins/cbc/context/CBCContext';
import { useResolvedCBCInstructorContext } from '@/app/plugins/cbc/hooks/useCBCInstructorContext';
import {
  CBCNav,
  CBCBreadcrumb,
  CBCError,
  CBCLoading,
  MasteryBadge,
  MASTERY_CONFIG,
} from '@/app/plugins/cbc/components/CBCComponents';
import { Card } from '@/app/components/ui/Card';
import { Button } from '@/app/components/ui/Button';
import { Badge } from '@/app/components/ui/Badge';
import {
  buildCbcPath,
  buildCurrentCbcWorkspaceHref,
  getCbcBackLabel,
  sanitizeInternalReturnTo,
} from '@/app/plugins/cbc/lib/navigation';
import type {
  MasteryLevel,
  StrandOutcomeDistribution,
  CompetencyDistribution,
  OutcomeLearner,
} from '@/app/plugins/cbc/types/cbc';

const MASTERY_LEVELS: MasteryLevel[] = [
  'NOT_STARTED',
  'BELOW',
  'APPROACHING',
  'MEETING',
  'EXCEEDING',
];

const LEVEL_VALUES: Record<MasteryLevel, number> = {
  NOT_STARTED: 0,
  BELOW: 1,
  APPROACHING: 2,
  MEETING: 3,
  EXCEEDING: 4,
};

function totalLearners(dist: CompetencyDistribution): number {
  return Object.values(dist).reduce((a, b) => a + b, 0);
}

function outcomeStatus(dist: CompetencyDistribution): MasteryLevel {
  const total = totalLearners(dist);
  if (total === 0) return 'NOT_STARTED';
  const weightedSum = MASTERY_LEVELS.reduce(
    (sum, level) => sum + dist[level] * LEVEL_VALUES[level],
    0,
  );
  const avg = weightedSum / total;
  if (avg < 0.5) return 'NOT_STARTED';
  if (avg < 1.5) return 'BELOW';
  if (avg < 2.5) return 'APPROACHING';
  if (avg < 3.5) return 'MEETING';
  return 'EXCEEDING';
}

function criticalCount(dist: CompetencyDistribution): number {
  return dist.BELOW;
}

function watchCount(dist: CompetencyDistribution): number {
  return dist.APPROACHING;
}

function DistributionBar({ dist }: { dist: CompetencyDistribution }) {
  const total = totalLearners(dist);
  if (total === 0) return <div className="theme-surface-muted h-2 w-full rounded-full" />;
  return (
    <div className="flex h-2 rounded-full overflow-hidden w-full">
      {MASTERY_LEVELS.map((level) => {
        const pct = (dist[level] / total) * 100;
        if (pct === 0) return null;
        return (
          <div
            key={level}
            className={`${MASTERY_CONFIG[level].segment} transition-all duration-500`}
            style={{ width: `${pct}%` }}
            title={`${MASTERY_CONFIG[level].label}: ${dist[level]}`}
          />
        );
      })}
    </div>
  );
}

// ─── Learner Drill-Down Modal ────────────────────────────────────────────────

interface LearnerDrillDownProps {
  outcome: StrandOutcomeDistribution;
  cohortId: number;
  subjectId: number | null;
  levels: string;
  label: string;
  returnTo: string;
  onClose: () => void;
}

function LearnerDrillDown({
  outcome,
  cohortId,
  subjectId,
  levels,
  label,
  returnTo,
  onClose,
}: LearnerDrillDownProps) {
  const router = useRouter();
  const { data: learners = [], isLoading } = useOutcomeLearners({
    learning_outcome_id: outcome.outcome_id,
    cohort_id: cohortId,
    subject_id: subjectId,
    levels,
  });

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center
            justify-center p-4"
    >
      <div
        className="theme-border theme-surface-elevated flex max-h-[80vh] w-full max-w-lg
                flex-col overflow-hidden rounded-2xl border shadow-2xl"
      >
        {/* Header */}
        <div className="theme-border flex items-center justify-between border-b p-5">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="indigo" size="sm" className="font-mono">
                {outcome.outcome_code}
              </Badge>
              <span className="text-sm font-semibold theme-muted">{label}</span>
            </div>
            <p className="max-w-xs truncate text-xs theme-muted">{outcome.description}</p>
          </div>
          <button
            onClick={onClose}
            className="theme-focus-ring rounded-lg p-2 transition-colors theme-hover-surface"
            aria-label="Close learner list"
          >
            <X className="h-5 w-5 theme-subtle" />
          </button>
        </div>

        {/* Learner list */}
        <div className="overflow-y-auto flex-1 p-4">
          {isLoading ? (
            <CBCLoading message="Loading learners…" />
          ) : learners.length === 0 ? (
            <p className="py-8 text-center theme-muted">No learners found</p>
          ) : (
            <div className="space-y-2">
              {learners.map((l: OutcomeLearner) => (
                <div
                  key={l.student_id}
                  className="theme-border theme-hover-border-strong theme-hover-surface
                                        flex items-center justify-between rounded-lg border p-3
                                        transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="theme-surface-muted rounded-lg p-2 shrink-0">
                      <Users className="h-4 w-4 theme-muted" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-medium theme-text">{l.student_name}</p>
                      <p className="text-xs theme-muted">{l.admission_number}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-3">
                    <MasteryBadge level={l.mastery_level} size="sm" />
                    <Badge variant="default" size="sm">
                      {l.evidence_count} observation{l.evidence_count !== 1 ? 's' : ''}
                    </Badge>
                    <button
                      onClick={() => {
                        onClose();
                        router.push(`/cbc/progress/learner/${l.student_id}?${new URLSearchParams({
                          returnTo,
                        }).toString()}`);
                      }}
                      className="theme-focus-ring rounded-lg p-1.5 transition-colors theme-hover-surface"
                      aria-label={`View progress for ${l.student_name}`}
                      title="View learner progress"
                    >
                      <ChevronRight className="h-4 w-4 text-blue-500" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="theme-border theme-surface-muted flex justify-end border-t p-4">
          <Button variant="ghost" size="md" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

interface DrillDown {
  outcome: StrandOutcomeDistribution;
  levels: string;
  label: string;
}

export default function StrandCompetencyOverviewPage() {
  const { strandId: raw } = useParams<{ strandId: string }>();
  const strandId = Number(raw);
  const router = useRouter();
  const searchParams = useSearchParams();
  const safeReturnTo = sanitizeInternalReturnTo(searchParams.get('returnTo'));
  const currentReturnTo = buildCurrentCbcWorkspaceHref(
    `/cbc/progress/strand/${strandId}`,
    searchParams,
  );
  const cohortFromUrl = searchParams.get('cohort');
  const cohortFromQuery = cohortFromUrl ? Number(cohortFromUrl) : null;
  const subjectFromUrl = searchParams.get('subject');
  const subjectFromQuery = subjectFromUrl ? Number(subjectFromUrl) : null;

  const { selectedCohortId, selectedCurriculumId, isAdmin } = useCBCContext();
  const [expandedOutcome, setExpandedOutcome] = useState<number | null>(null);
  const [drillDown, setDrillDown] = useState<DrillDown | null>(null);

  const { data: strand, isLoading: strandLoading } = useStrandDetail(strandId);
  const { cohorts = [] } = useCohorts(
    isAdmin ? { curriculum: selectedCurriculumId ?? undefined } : undefined,
    { enabled: isAdmin },
  );
  const instructorContext = useResolvedCBCInstructorContext({
    selectedCurriculumId,
    requestedCohortId: cohortFromQuery ?? selectedCohortId,
    requestedSubjectId: null,
  });
  const { isLoading: instructorContextLoading, error: instructorContextError } = instructorContext;
  const resolvedCohortId = useMemo(() => {
    if (!Number.isNaN(cohortFromQuery) && cohortFromQuery !== null) return cohortFromQuery;
    if (!isAdmin) return instructorContext.effectiveCohortId;
    return selectedCohortId ?? cohorts[0]?.id ?? null;
  }, [cohortFromQuery, cohorts, instructorContext.effectiveCohortId, isAdmin, selectedCohortId]);

  const {
    data: outcomes = [],
    isLoading,
    error,
    refetch,
  } = useStrandOutcomeDistribution({
    strand_id: strandId,
    cohort_id: resolvedCohortId,
    subject_id: subjectFromQuery,
  });

  const bySubStrand = useMemo(
    () =>
      outcomes.reduce<
        Record<
          number,
          {
            name: string;
            outcomes: StrandOutcomeDistribution[];
          }
        >
      >((acc, o) => {
        if (!acc[o.sub_strand_id]) {
          acc[o.sub_strand_id] = { name: o.sub_strand_name, outcomes: [] };
        }
        acc[o.sub_strand_id].outcomes.push(o);
        return acc;
      }, {}),
    [outcomes],
  );

  const needsAttention = useMemo(
    () => outcomes.filter((o) => o.distribution.BELOW > 0 || o.distribution.APPROACHING > 0),
    [outcomes],
  );
  const backHref = safeReturnTo ?? buildCbcPath('/cbc/progress', {
    cohort: resolvedCohortId,
    subject: subjectFromQuery,
  });
  const backLabel = getCbcBackLabel(safeReturnTo, 'Back to Learning Progress');

  if (strandLoading || (!isAdmin && instructorContextLoading))
    return (
      <div className="space-y-6">
        <CBCNav />
        <CBCLoading message="Loading strand…" />
      </div>
    );

  if (!isAdmin && instructorContextError) {
    return (
      <div className="space-y-6">
        <CBCNav />
        <CBCError error={instructorContextError} onRetry={() => instructorContext.refetch()} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <CBCNav />
      <CBCBreadcrumb
        segments={[
          { label: 'Learning Progress', href: backHref },
          { label: strand?.name ?? `Strand ${strandId}` },
        ]}
      />

      <Link href={backHref}>
        <Button variant="ghost" size="md">
          <ArrowLeft className="mr-2 h-4 w-4" />
          {backLabel}
        </Button>
      </Link>

      {/* Strand header */}
      <Card className="theme-info-surface">
        <div className="flex items-start gap-4">
          <div className="theme-border theme-surface-elevated rounded-xl border p-3 shadow-sm shrink-0">
            <Target className="h-8 w-8 text-blue-600" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <Badge variant="blue" size="lg" className="font-mono font-semibold">
                {strand?.code}
              </Badge>
              {strand?.subject_name && (
                <span className="text-sm theme-muted">{strand.subject_name}</span>
              )}
            </div>
            <h1 className="text-xl font-bold theme-text">{strand?.name}</h1>
            <p className="mt-1 text-xs uppercase tracking-wide theme-subtle">
              Learning progress overview
            </p>
          </div>
        </div>
      </Card>

      {!resolvedCohortId ? (
        <Card className="py-12 text-center">
          <Users className="mx-auto mb-3 h-12 w-12 theme-subtle" />
          <p className="mb-4 theme-muted">No class selected - go back and choose a class first</p>
          <Link href={backHref}>
            <Button variant="secondary" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" /> {backLabel}
            </Button>
          </Link>
        </Card>
      ) : isLoading ? (
        <CBCLoading message="Loading learning progress…" />
      ) : error ? (
        <CBCError error={error} onRetry={refetch} />
      ) : (
        <>
          {/* Summary */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {[
              {
                label: 'Learning Goals',
                value: outcomes.length,
                color: 'text-blue-600',
              },
              {
                label: 'Need Support',
                value: needsAttention.length,
                color: needsAttention.length > 0 ? 'text-amber-500' : 'text-emerald-600',
              },
              {
                label: 'On Track',
                value: outcomes.length - needsAttention.length,
                color: 'text-emerald-600',
              },
            ].map((s) => (
              <Card key={s.label} className="text-center">
                <div className={`text-3xl font-bold ${s.color}`}>{s.value}</div>
                <div className="mt-1 text-sm theme-muted">{s.label}</div>
              </Card>
            ))}
          </div>

          {/* Outcomes by sub-strand */}
          {Object.entries(bySubStrand).map(([subStrandId, group]) => (
            <Card key={subStrandId}>
              <h3
                className="mb-4 flex items-center font-semibold theme-text
                                gap-2"
              >
                <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                {group.name}
                <Badge variant="blue" size="sm">
                  {group.outcomes.length}
                </Badge>
              </h3>

              <div className="space-y-2">
                {group.outcomes.map((outcome) => {
                  const total = totalLearners(outcome.distribution);
                  const isOpen = expandedOutcome === outcome.outcome_id;
                  const status = outcomeStatus(outcome.distribution);
                  const critical = criticalCount(outcome.distribution);
                  const watch = watchCount(outcome.distribution);

                  return (
                    <div
                      key={outcome.outcome_id}
                      className={`border rounded-xl overflow-hidden
                                                transition-all ${
                                                  critical > 0
                                                    ? 'border-red-500/30'
                                                    : watch > 0
                                                      ? 'border-amber-500/30'
                                                      : 'theme-border'
                                                }`}
                    >
                      <button
                        type="button"
                        onClick={() => setExpandedOutcome(isOpen ? null : outcome.outcome_id)}
                        className="theme-focus-ring theme-hover-surface w-full p-4 text-left
                                                    transition-colors"
                      >
                        <div className="flex items-start gap-3">
                          <div className="shrink-0 mt-0.5">
                            {isOpen ? (
                              <ChevronDown className="h-4 w-4 theme-subtle" />
                            ) : (
                              <ChevronRight className="h-4 w-4 theme-subtle" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div
                              className="flex items-center gap-2
                                                        mb-1 flex-wrap"
                            >
                              <Badge variant="indigo" size="sm" className="font-mono shrink-0">
                                {outcome.outcome_code}
                              </Badge>
                              <MasteryBadge level={status} size="sm" />
                              {critical > 0 && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setDrillDown({
                                      outcome,
                                      levels: 'BELOW',
                                      label: `Needs support (${critical})`,
                                    });
                                  }}
                                  className="text-xs font-medium text-red-600 hover:underline"
                                >
                                  Needs support: {critical}
                                </button>
                              )}
                              {watch > 0 && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setDrillDown({
                                      outcome,
                                      levels: 'APPROACHING',
                                      label: `Keep watching (${watch})`,
                                    });
                                  }}
                                  className="text-xs font-medium text-amber-600 hover:underline"
                                >
                                  Keep watching: {watch}
                                </button>
                              )}
                            </div>
                            <p className="mb-2 text-sm theme-muted">{outcome.description}</p>
                            <DistributionBar dist={outcome.distribution} />
                          </div>
                          {/* Evidence link */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push('/cbc/teaching/sessions');
                            }}
                            className="theme-focus-ring theme-hover-surface shrink-0 rounded-lg
                                                            p-1.5 transition-colors"
                            aria-label="Open lessons for this strand"
                            title="Open lessons for this strand"
                          >
                            <FileText className="h-4 w-4 text-blue-400" />
                          </button>
                        </div>
                      </button>

                      {isOpen && (
                        <div className="theme-border theme-surface-muted space-y-2 border-t p-4">
                          {MASTERY_LEVELS.map((level) => {
                            const count = outcome.distribution[level];
                            const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                            return (
                              <div
                                key={level}
                                className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3"
                              >
                                <div className="sm:w-36 sm:shrink-0">
                                  <MasteryBadge level={level} size="sm" />
                                </div>
                                <div className="theme-surface-elevated h-2 flex-1 overflow-hidden rounded-full">
                                  <div
                                    className={`h-full rounded-full
                                                                            ${MASTERY_CONFIG[level].segment}`}
                                    style={{ width: `${pct}%` }}
                                  />
                                </div>
                                <div className="text-sm sm:w-20 sm:shrink-0 sm:text-right">
                                  <span className="font-semibold theme-text">{count}</span>
                                  <span className="ml-1 theme-subtle">({pct}%)</span>
                                </div>
                                {count > 0 && (
                                  <button
                                    onClick={() =>
                                      setDrillDown({
                                        outcome,
                                        levels: level,
                                        label: MASTERY_CONFIG[level].label,
                                      })
                                    }
                                    className="shrink-0 text-xs text-blue-500 hover:underline"
                                  >
                                    View learners
                                  </button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </Card>
          ))}

          {/* Attention callout */}
          {needsAttention.length === 0 ? (
            <Card className="theme-success-surface">
              <div className="flex items-start gap-4">
                <div className="theme-border theme-surface-elevated rounded-xl border p-3 shrink-0">
                  <CheckCircle className="h-6 w-6 text-emerald-600" />
                </div>
                <div>
                  <h3 className="mb-1 text-lg font-semibold theme-text">
                    All learning goals on track
                  </h3>
                  <p className="text-sm theme-muted">
                    No learners currently need support or close watching.
                  </p>
                </div>
              </div>
            </Card>
          ) : (
            <Card className="theme-warning-surface">
              <div className="flex items-start gap-4">
                <div className="theme-border theme-surface-elevated rounded-xl border p-3 shrink-0">
                  <AlertCircle className="h-6 w-6 text-amber-600" />
                </div>
                <div className="flex-1">
                  <h3 className="mb-1 text-lg font-semibold theme-text">
                    {needsAttention.length} learning goal
                    {needsAttention.length !== 1 ? 's' : ''} need support
                  </h3>
                  <div className="space-y-1 mt-2">
                    {needsAttention.map((o) => (
                      <div key={o.outcome_id} className="flex items-center gap-2 text-sm">
                        <Badge variant="indigo" size="sm" className="font-mono shrink-0">
                          {o.outcome_code}
                        </Badge>
                        <span className="truncate theme-muted">{o.description}</span>
                        <div className="flex gap-2 shrink-0">
                          {criticalCount(o.distribution) > 0 && (
                            <button
                              onClick={() =>
                                setDrillDown({
                                  outcome: o,
                                  levels: 'BELOW',
                                  label: `Needs support (${criticalCount(o.distribution)})`,
                                })
                              }
                              className="text-xs font-medium text-red-600 hover:underline"
                            >
                              Needs support: {criticalCount(o.distribution)}
                            </button>
                          )}
                          {watchCount(o.distribution) > 0 && (
                            <button
                              onClick={() =>
                                setDrillDown({
                                  outcome: o,
                                  levels: 'APPROACHING',
                                  label: `Keep watching (${watchCount(o.distribution)})`,
                                })
                              }
                              className="text-xs font-medium text-amber-600 hover:underline"
                            >
                              Keep watching: {watchCount(o.distribution)}
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          )}
        </>
      )}

      {/* Drill-down modal */}
      {drillDown && resolvedCohortId && (
        <LearnerDrillDown
          outcome={drillDown.outcome}
          cohortId={resolvedCohortId}
          subjectId={subjectFromQuery}
          levels={drillDown.levels}
          label={drillDown.label}
          returnTo={currentReturnTo}
          onClose={() => setDrillDown(null)}
        />
      )}
    </div>
  );
}
