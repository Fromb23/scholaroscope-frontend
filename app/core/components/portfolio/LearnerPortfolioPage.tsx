'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, BookOpenCheck, ChevronLeft, ChevronRight } from 'lucide-react';

import { Badge } from '@/app/components/ui/Badge';
import { Button } from '@/app/components/ui/Button';
import { Card } from '@/app/components/ui/Card';
import { ErrorBanner } from '@/app/components/ui/ErrorBanner';
import { EntityLoadingState } from '@/app/components/ui/loading';
import { PortfolioEvidenceCard } from '@/app/core/components/portfolio/PortfolioEvidenceCard';
import { PortfolioEvidenceDetail } from '@/app/core/components/portfolio/PortfolioEvidenceDetail';
import { PortfolioFilters } from '@/app/core/components/portfolio/PortfolioFilters';
import { parseAppDestination } from '@/app/core/auth/navigation';
import { useAcademicYears, useTerms } from '@/app/core/hooks/useAcademic';
import {
  useLearnerPortfolio,
  useLearnerPortfolioEvidenceDetail,
} from '@/app/core/hooks/useLearnerPortfolio';
import type {
  LearnerPortfolioFilters,
  PortfolioLearningArea,
  PortfolioLearningOutcome,
} from '@/app/core/types/portfolio';

function parsePositive(value: string | null): number | null {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function formatDate(value: string | null): string {
  if (!value) return 'No dated evidence';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString();
}

function distinctById<T extends { id: number | null }>(items: T[]): T[] {
  const seen = new Set<number>();
  return items.filter((item) => {
    if (!item.id || seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

function buildPortfolioQuery(
  filters: LearnerPortfolioFilters,
  evidenceId: number | null,
  returnTo: string | null,
): string {
  const params = new URLSearchParams();

  Object.entries(filters).forEach(([key, value]) => {
    if (value !== null && value !== undefined && value !== '') {
      params.set(key, String(value));
    }
  });

  if (evidenceId) {
    params.set('evidence', String(evidenceId));
  }

  const safeReturnTo = parseAppDestination(returnTo);
  if (safeReturnTo) {
    params.set('returnTo', safeReturnTo);
  }

  return params.toString();
}

function filtersFromSearchParams(searchParams: URLSearchParams): LearnerPortfolioFilters {
  return {
    academic_year: parsePositive(searchParams.get('academic_year')),
    term: parsePositive(searchParams.get('term')),
    cohort_subject: parsePositive(searchParams.get('cohort_subject') ?? searchParams.get('cohortSubject')),
    outcome: parsePositive(searchParams.get('outcome')),
    source: searchParams.get('source') || null,
    page: parsePositive(searchParams.get('page')),
  };
}

export function LearnerPortfolioPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const learnerId = Number(params.id);
  const selectedEvidenceId = parsePositive(searchParams.get('evidence'));
  const returnTo = parseAppDestination(searchParams.get('returnTo'));
  const filters = useMemo(() => filtersFromSearchParams(new URLSearchParams(searchParams.toString())), [searchParams]);
  const { academicYears } = useAcademicYears();
  const { terms } = useTerms(filters.academic_year ?? undefined);
  const { portfolio, loading, error, errorStatus } = useLearnerPortfolio(learnerId || null, filters);
  const {
    evidence: detail,
    loading: detailLoading,
    error: detailError,
    errorStatus: detailErrorStatus,
  } = useLearnerPortfolioEvidenceDetail(learnerId || null, selectedEvidenceId, filters, {
    enabled: Boolean(selectedEvidenceId),
  });

  const backHref = returnTo || `/learners/${learnerId}`;
  const learningAreas = useMemo<PortfolioLearningArea[]>(() => {
    const represented = portfolio?.filters.represented_learning_areas ?? [];
    const fromEvidence = portfolio?.results.map((evidence) => evidence.learning_area).filter(Boolean) as PortfolioLearningArea[] | undefined;
    return distinctById([...(represented ?? []), ...(fromEvidence ?? [])]);
  }, [portfolio]);
  const outcomes = useMemo<PortfolioLearningOutcome[]>(() => {
    const represented = portfolio?.filters.represented_outcomes ?? [];
    const fromEvidence = portfolio?.results.map((evidence) => evidence.learning_outcome).filter(Boolean) as PortfolioLearningOutcome[] | undefined;
    return distinctById([...(represented ?? []), ...(fromEvidence ?? [])]);
  }, [portfolio]);
  const sourceOptions = portfolio?.filters.available_sources ?? Object.keys(portfolio?.summary.source_distribution ?? {});

  const navigateWith = (nextFilters: LearnerPortfolioFilters, nextEvidenceId = selectedEvidenceId) => {
    const query = buildPortfolioQuery(nextFilters, nextEvidenceId, returnTo);
    router.push(query ? `/learners/${learnerId}/portfolio?${query}` : `/learners/${learnerId}/portfolio`);
  };

  const closeDetail = () => navigateWith(filters, null);
  const openDetail = (evidenceId: number) => navigateWith(filters, evidenceId);
  const resetFilters = () => {
    const query = buildPortfolioQuery({}, null, returnTo);
    router.push(query ? `/learners/${learnerId}/portfolio?${query}` : `/learners/${learnerId}/portfolio`);
  };

  if (!learnerId) {
    return (
      <ErrorBanner
        title="Invalid learner"
        message="The learner portfolio URL does not contain a valid learner identifier."
        onDismiss={() => undefined}
      />
    );
  }

  if (loading) {
    return <EntityLoadingState entity="learner portfolio" action="Loading" />;
  }

  if (error) {
    return (
      <div className="space-y-4">
        <Link href={backHref}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
        </Link>
        <ErrorBanner
          title={errorStatus === 403 ? 'No learner portfolio access' : 'Learner portfolio unavailable'}
          message={error}
          onDismiss={() => undefined}
        />
      </div>
    );
  }

  if (!portfolio) {
    return null;
  }

  const summary = portfolio.summary;
  const hasActiveFilters = Object.entries(filters).some(([key, value]) => key !== 'page' && Boolean(value));
  const noEvidenceMessage = summary.total_evidence === 0 && !hasActiveFilters
    ? 'No visible learner evidence has been recorded for this portfolio.'
    : 'No visible evidence matches the active portfolio filters.';

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <Link href={backHref}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
          </Link>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <BookOpenCheck className="h-6 w-6 text-blue-600" />
            <h1 className="text-2xl font-semibold theme-text">Learner Portfolio</h1>
          </div>
          <p className="mt-2 text-sm theme-muted">
            {portfolio.learner.name}
            {portfolio.learner.admission_number ? ` · ${portfolio.learner.admission_number}` : ''}
          </p>
          <p className="mt-1 text-sm theme-subtle">
            {portfolio.scope.organization?.name ?? 'Current workspace'}
            {portfolio.learner.current_cohort?.name ? ` · ${portfolio.learner.current_cohort.name}` : ''}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {portfolio.scope.academic_year?.name ? <Badge variant="default">{portfolio.scope.academic_year.name}</Badge> : null}
          {portfolio.scope.term?.name ? <Badge variant="info">{portfolio.scope.term.name}</Badge> : null}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <Card>
          <p className="text-xs font-medium uppercase tracking-wide theme-subtle">Visible evidence</p>
          <p className="mt-1 text-2xl font-semibold theme-text">{summary.total_evidence}</p>
        </Card>
        <Card>
          <p className="text-xs font-medium uppercase tracking-wide theme-subtle">Learning areas</p>
          <p className="mt-1 text-2xl font-semibold theme-text">{summary.learning_area_count}</p>
        </Card>
        <Card>
          <p className="text-xs font-medium uppercase tracking-wide theme-subtle">Outcomes</p>
          <p className="mt-1 text-2xl font-semibold theme-text">{summary.outcome_count}</p>
        </Card>
        <Card>
          <p className="text-xs font-medium uppercase tracking-wide theme-subtle">Latest evidence</p>
          <p className="mt-1 text-lg font-semibold theme-text">{formatDate(summary.latest_evidence_at)}</p>
        </Card>
        <Card>
          <p className="text-xs font-medium uppercase tracking-wide theme-subtle">Sources</p>
          <p className="mt-1 text-sm theme-text">
            {Object.entries(summary.source_distribution).length > 0
              ? Object.entries(summary.source_distribution).map(([source, count]) => `${source}: ${count}`).join(', ')
              : 'No sources'}
          </p>
        </Card>
      </div>

      <PortfolioFilters
        filters={filters}
        academicYears={academicYears}
        terms={terms}
        learningAreas={learningAreas}
        outcomes={outcomes}
        sources={sourceOptions}
        onChange={navigateWith}
        onReset={resetFilters}
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(320px,420px)]">
        <section aria-labelledby="portfolio-evidence" className="space-y-4">
          <h2 id="portfolio-evidence" className="text-lg font-semibold theme-text">Evidence</h2>
          {portfolio.results.length === 0 ? (
            <Card>
              <p className="text-sm theme-muted">{noEvidenceMessage}</p>
            </Card>
          ) : (
            portfolio.results.map((evidence) => (
              <PortfolioEvidenceCard
                key={evidence.evidence_record_id}
                evidence={evidence}
                selected={selectedEvidenceId === evidence.evidence_record_id}
                onOpen={openDetail}
              />
            ))
          )}
          {portfolio.pagination.total_pages > 1 ? (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Button
                type="button"
                variant="secondary"
                disabled={portfolio.pagination.page <= 1}
                onClick={() => navigateWith({ ...filters, page: portfolio.pagination.page - 1 }, null)}
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
              <p className="text-sm theme-muted">
                Page {portfolio.pagination.page} of {portfolio.pagination.total_pages}
              </p>
              <Button
                type="button"
                variant="secondary"
                disabled={portfolio.pagination.page >= portfolio.pagination.total_pages}
                onClick={() => navigateWith({ ...filters, page: portfolio.pagination.page + 1 }, null)}
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          ) : null}
        </section>

        <aside aria-label="Evidence detail" className="min-w-0">
          <PortfolioEvidenceDetail
            evidence={detail}
            loading={detailLoading}
            error={detailError}
            errorStatus={detailErrorStatus}
            onClose={closeDetail}
          />
        </aside>
      </div>
    </div>
  );
}
