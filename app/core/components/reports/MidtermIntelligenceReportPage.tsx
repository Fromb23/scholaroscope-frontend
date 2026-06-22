'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { ArrowLeft, ArrowRight, BookOpenCheck, ClipboardCheck, Sparkles } from 'lucide-react';
import { Button } from '@/app/components/ui/Button';
import { Card } from '@/app/components/ui/Card';
import { ErrorBanner } from '@/app/components/ui/ErrorBanner';
import { LoadingSpinner } from '@/app/components/ui/LoadingSpinner';
import { useTeachingToday } from '@/app/core/hooks/useTeachingToday';
import { MIDTERM_DASHBOARD_RETURN_TO, deriveMidtermInsights } from '@/app/core/lib/midtermBreak';

function safeReturnTo(value: string | null): string {
  return value?.startsWith('/') ? value : MIDTERM_DASHBOARD_RETURN_TO;
}

export function MidtermIntelligenceReportPage() {
  const searchParams = useSearchParams();
  const returnTo = safeReturnTo(searchParams.get('returnTo'));
  const { context, loading, error, refresh } = useTeachingToday();
  const insights = useMemo(
    () => deriveMidtermInsights(context, 8),
    [context]
  );
  const groupedInsights = useMemo(() => ({
    attendance: insights.filter((insight) => insight.kind === 'attendance'),
    sessions: insights.filter((insight) => insight.kind === 'sessions'),
    assignments: insights.filter((insight) => insight.kind === 'assignments'),
    assessments: insights.filter((insight) => insight.kind === 'assessments'),
    schemes: insights.filter((insight) => insight.kind === 'schemes'),
  }), [insights]);

  if (loading) {
    return <LoadingSpinner fullScreen={false} message="Opening midterm insights..." />;
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link href={returnTo}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Midterm Break
            </Button>
          </Link>
          <div className="mt-4 flex items-start gap-3">
            <div className="rounded-2xl p-3 theme-info-surface text-[color:var(--color-primary)]">
              <Sparkles className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-3xl font-semibold theme-text">A few things Scholaroscope noticed</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 theme-muted">
                Midterm-specific notes from your current teaching context. Open any item when you have a quiet moment.
              </p>
            </div>
          </div>
        </div>
        <Button variant="secondary" size="sm" onClick={() => void refresh()}>
          Refresh insights
        </Button>
      </div>

      {error ? <ErrorBanner message={error} onDismiss={() => void refresh()} /> : null}

      {insights.length === 0 ? (
        <Card>
          <div className="py-16 text-center">
            <BookOpenCheck className="mx-auto h-12 w-12 theme-subtle" />
            <h2 className="mt-3 text-lg font-semibold theme-text">Nothing urgent is waiting. Enjoy the break.</h2>
            <p className="mt-2 text-sm theme-muted">
              Attendance, lesson records, assignments, assessments, and schemes will appear here when there is context to review.
            </p>
          </div>
        </Card>
      ) : (
        <div className="grid gap-5 lg:grid-cols-2">
          {insights.map((insight) => (
            <Link
              key={insight.id}
              href={insight.href}
              className={`theme-card block rounded-2xl border theme-border p-5 transition-colors theme-hover-surface ${insight.featured ? 'lg:col-span-2' : ''}`}
            >
              <div className="flex h-full flex-col justify-between gap-5">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide theme-subtle">{insight.kind}</p>
                  <h2 className="mt-2 text-lg font-semibold theme-text">{insight.title}</h2>
                  <p className="mt-2 text-sm leading-6 theme-muted">{insight.body}</p>
                </div>
                <p className="flex items-center text-sm font-medium theme-link">
                  {insight.actionLabel}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="p-5">
          <ClipboardCheck className="h-5 w-5 text-blue-600" />
          <p className="mt-3 text-2xl font-semibold theme-text">{groupedInsights.sessions.length}</p>
          <p className="mt-1 text-sm theme-muted">pending lesson record notes</p>
        </Card>
        <Card className="p-5">
          <ClipboardCheck className="h-5 w-5 text-amber-600" />
          <p className="mt-3 text-2xl font-semibold theme-text">{groupedInsights.assignments.length}</p>
          <p className="mt-1 text-sm theme-muted">assignment review workspaces</p>
        </Card>
        <Card className="p-5">
          <ClipboardCheck className="h-5 w-5 text-green-600" />
          <p className="mt-3 text-2xl font-semibold theme-text">{groupedInsights.attendance.length}</p>
          <p className="mt-1 text-sm theme-muted">learner attendance paths</p>
        </Card>
        <Card className="p-5">
          <ClipboardCheck className="h-5 w-5 text-sky-600" />
          <p className="mt-3 text-2xl font-semibold theme-text">{groupedInsights.schemes.length + groupedInsights.assessments.length}</p>
          <p className="mt-1 text-sm theme-muted">planning and assessment notes</p>
        </Card>
      </div>
    </div>
  );
}
