'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { BookOpen, FileText, Target, Users } from 'lucide-react';
import { useAssistantPageContext } from '@/app/core/components/assistant/useAssistantPageContext';
import {
  useTeachingSession,
  useSessionLearners,
  useOutcomeSessions,
} from '@/app/plugins/cbc/hooks/useCBC';
import {
  CBCNav,
  CBCBreadcrumb,
  CBCError,
  CBCLoading,
  SessionStatusBadge,
  CBCTeachingSessionNav,
} from '@/app/plugins/cbc/components/CBCComponents';
import { Card } from '@/app/components/ui/Card';
import { Button } from '@/app/components/ui/Button';
import { Badge } from '@/app/components/ui/Badge';

export function CBCSessionLearnersPage() {
  const { sessionId: raw } = useParams<{ sessionId: string }>();
  const sessionId = Number(raw);
  const router = useRouter();

  const {
    data: session,
    isLoading: sessionLoading,
    error: sessionError,
  } = useTeachingSession(sessionId);
  const { data: learners = [], isLoading: learnersLoading } = useSessionLearners(sessionId);
  const { data: links = [] } = useOutcomeSessions(sessionId);

  const learnersWithEvidence = learners.filter(
    (learner) => learner.session_evidence_count > 0,
  ).length;
  const firstOutcomeId = links[0]?.learning_outcome;
  const firstLearnerId = learners[0]?.id;
  const evidenceHref =
    firstOutcomeId && firstLearnerId
      ? `/cbc/teaching/sessions/${sessionId}/outcomes/${firstOutcomeId}?student=${firstLearnerId}`
      : null;
  const lessonHref = session?.id ? `/sessions/${session.id}` : '/cbc/teaching/sessions';
  const addOutcomesHref = `/cbc/teaching/sessions/${sessionId}/outcomes/add`;
  const getLearnerPerformanceHref = (learnerId: number, sessionEvidenceCount: number) => {
    if (sessionEvidenceCount > 0) {
      return `/cbc/progress/learner/${learnerId}`;
    }

    if (!firstOutcomeId) {
      return null;
    }

    return `/cbc/teaching/sessions/${sessionId}/outcomes/${firstOutcomeId}?student=${learnerId}`;
  };
  const assistantContext = useMemo(
    () => ({
      pageKey: 'cbc_session_learners',
      pageTitle: 'CBC Session Learners',
      state: {
        is_loading: sessionLoading || learnersLoading,
        is_empty: !sessionLoading && !learnersLoading && learners.length === 0,
        has_sessions: Boolean(session),
        session_status: session?.status ?? null,
        has_subject_filter: false,
        has_cohort_filter: false,
        has_taught_outcomes: links.length > 0,
        has_learner_evidence: learnersWithEvidence > 0,
        coverage_percentage:
          learners.length > 0 ? Math.round((learnersWithEvidence / learners.length) * 100) : 0,
      },
      visibleActions: [
        {
          label: 'Open CBC Teaching',
          type: 'navigate' as const,
          href: '/cbc/teaching',
        },
        {
          label: 'Open CBC Sessions',
          type: 'navigate' as const,
          href: '/cbc/teaching/sessions',
        },
        {
          label: 'Browse CBC',
          type: 'navigate' as const,
          href: '/cbc/browser',
        },
        ...(links.length === 0
          ? [
              {
                label: 'Add taught outcomes',
                type: 'navigate' as const,
                href: addOutcomesHref,
              },
            ]
          : []),
        ...(evidenceHref
          ? [
              {
                label: 'Record learner evidence',
                type: 'navigate' as const,
                href: evidenceHref,
              },
            ]
          : []),
      ],
      nextSafeAction:
        links.length === 0
          ? {
              label: 'Add taught outcomes',
              type: 'navigate' as const,
              href: addOutcomesHref,
            }
          : evidenceHref
            ? {
                label: 'Record learner evidence',
                type: 'navigate' as const,
                href: evidenceHref,
              }
            : {
                label: 'Open CBC Sessions',
                type: 'navigate' as const,
                href: '/cbc/teaching/sessions',
              },
      workflowStep: links.length === 0 ? 'confirm_taught_outcomes' : 'record_cbc_evidence',
      emptyStateReason:
        !sessionLoading && !learnersLoading && learners.length === 0
          ? 'No learners are active in this CBC session scope.'
          : undefined,
    }),
    [
      addOutcomesHref,
      evidenceHref,
      learners.length,
      learnersLoading,
      learnersWithEvidence,
      links.length,
      session,
      sessionLoading,
    ],
  );

  useAssistantPageContext(assistantContext);

  if (sessionLoading) {
    return (
      <div className="space-y-6">
        <CBCNav />
        <CBCLoading message="Loading lesson…" />
      </div>
    );
  }

  if (sessionError || !session) {
    return (
      <div className="space-y-6">
        <CBCNav />
        <CBCError
          error="Lesson details could not be opened. Return to My Lessons and choose the lesson again."
          title="Lesson unavailable"
        />
        <Link href="/cbc/teaching/sessions">
          <Button variant="secondary" size="md">
            Back to My Lessons
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <CBCNav />
      <CBCBreadcrumb
        segments={[
          { label: 'Teaching', href: '/cbc/teaching' },
          { label: 'Lessons', href: '/cbc/teaching/sessions' },
          {
            label: session.subject_name ?? 'Lesson',
            href: `/cbc/teaching/sessions/${sessionId}/outcomes`,
          },
          { label: 'Learners' },
        ]}
      />
      <CBCTeachingSessionNav sessionId={sessionId} active="learners" lessonHref={lessonHref} />

      <Card>
        <div className="flex flex-col sm:flex-row items-start gap-4">
          <div className="theme-border theme-surface-elevated rounded-xl border p-3 shrink-0">
            <BookOpen className="h-7 w-7 text-purple-600" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3 flex-wrap mb-1">
              <h1 className="text-xl font-bold theme-text">{session.subject_name ?? 'Lesson'}</h1>
              <SessionStatusBadge status={session.status} />
            </div>
            <p className="theme-muted mb-2">{session.cohort_name}</p>
            <p className="text-sm theme-muted mb-2">
              Learners shown here reflect the session&apos;s active participation scope.
            </p>
            <div className="flex items-center gap-4 text-sm theme-muted flex-wrap">
              <span>
                {new Date(session.session_date).toLocaleDateString('en-GB', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </span>
              <div className="flex items-center gap-2">
                <Badge variant="blue" size="sm">
                  {links.length} learning goal{links.length !== 1 ? 's' : ''}
                </Badge>
                <Badge variant="purple" size="sm">
                  {learners.length} learners
                </Badge>
              </div>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          {
            label: 'Total participating learners',
            value: learners.length,
            color: 'text-purple-600',
          },
          { label: 'Observed', value: learnersWithEvidence, color: 'text-emerald-600' },
          {
            label: 'Performance Records',
            value: learners.reduce((sum, learner) => sum + learner.session_evidence_count, 0),
            color: 'text-blue-600',
          },
        ].map((stat) => (
          <Card key={stat.label} className="text-center">
            <div className={`text-3xl font-bold ${stat.color}`}>{stat.value}</div>
            <div className="mt-1 text-sm theme-muted">{stat.label}</div>
          </Card>
        ))}
      </div>

      <Card>
        <div className="mb-5">
          <h2 className="text-xl font-semibold theme-text flex items-center gap-2">
            <Users className="h-5 w-5 text-purple-600" />
            Participating learners
          </h2>
          <p className="mt-1 text-sm theme-muted">
            See which learners in the active session scope already have observations for this
            lesson.
          </p>
        </div>

        {learnersLoading ? (
          <CBCLoading />
        ) : learners.length === 0 ? (
          <div className="py-16 text-center">
            <Users className="mx-auto mb-3 h-12 w-12 theme-subtle" />
            <p className="theme-muted">No learners are active in this session scope.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {learners.map((learner) => {
              const performanceHref = getLearnerPerformanceHref(
                learner.id,
                learner.session_evidence_count,
              );

              return (
                <div
                  key={learner.id}
                  className="theme-border theme-hover-border-strong theme-hover-surface flex flex-col gap-4 rounded-xl border p-4 transition-all sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="theme-border theme-surface-elevated rounded-lg border p-2.5 shrink-0">
                      <Users className="h-5 w-5 text-purple-600" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold theme-text truncate">
                        {learner.first_name} {learner.last_name}
                      </h3>
                      <p className="text-sm theme-muted">{learner.admission_number}</p>
                    </div>
                  </div>

                  <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center sm:gap-4">
                    <div className="flex items-center justify-between sm:block sm:text-right">
                      <div className="text-2xl font-bold text-purple-600">
                        {learner.session_evidence_count}
                      </div>
                      <div className="text-xs theme-muted">
                        record{learner.session_evidence_count !== 1 ? 's' : ''}
                      </div>
                    </div>

                    {links.length > 0 && performanceHref ? (
                      <Button
                        variant={learner.session_evidence_count > 0 ? 'primary' : 'secondary'}
                        size="sm"
                        className="w-full sm:w-auto"
                        onClick={() => router.push(performanceHref)}
                      >
                        <FileText className="h-4 w-4 mr-2" />
                        {learner.session_evidence_count > 0
                          ? 'View performance'
                          : 'Record performance'}
                      </Button>
                    ) : (
                      <span className="text-xs theme-subtle">Confirm what was taught first</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {!learnersLoading && learners.length > 0 && links.length === 0 && (
          <div className="theme-warning-surface mt-6 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <Target className="mt-0.5 h-5 w-5 shrink-0 text-[color:var(--color-warning)]" />
              <div>
                <p className="text-sm font-medium theme-text">
                  No taught outcomes have been confirmed yet
                </p>
                <p className="mt-1 text-sm theme-muted">
                  Confirm what was taught on the lesson page before recording class performance.
                </p>
                <Link href={lessonHref}>
                  <Button variant="primary" size="sm" className="mt-3">
                    Open lesson
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
