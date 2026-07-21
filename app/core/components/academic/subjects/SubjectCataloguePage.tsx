'use client';

import { ArrowLeft, Plus, RotateCcw, Search, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Badge } from '@/app/components/ui/Badge';
import { Button } from '@/app/components/ui/Button';
import { Card } from '@/app/components/ui/Card';
import { ErrorBanner } from '@/app/components/ui/ErrorBanner';
import { useToast } from '@/app/components/ui/toast/useToast';
import { ButtonPendingContent, CardSkeleton, SectionLoading } from '@/app/components/ui/loading';
import { useCurricula } from '@/app/core/hooks/useAcademic';
import { useSubjectsPage } from '@/app/core/hooks/academic/useSubjectsPage';
import { subjectOfferingAPI } from '@/app/core/api/academic';
import { resolveErrorMessage } from '@/app/core/types/errors';
import type { ApiError } from '@/app/core/types/errors';
import type { SubjectCatalogItem, SubjectOfferingCatalogStatus } from '@/app/core/types/academic';
import { sanitizeAppDestination } from '@/app/core/auth/navigation';
import {
  canOffer,
  canRemove,
  canReoffer,
  canRestore,
  catalogRowLabel,
  contentMissingMessage,
  contentReadinessLabel,
  formatCatalogLevel,
  getCatalogStatus,
  isDroppedHistoricalOffering,
  isContentReady,
  isScheduledRemoval,
  matchesCatalogSearch,
  statusBadgeVariant,
  statusLabel,
  uniqueCatalogLevels,
} from './subjectCatalogUtils';

type OfferingStateFilter =
  | 'all'
  | 'offered'
  | 'available'
  | 'scheduled'
  | 'dropped';

type ContentFilter = 'all' | 'ready' | 'missing';

function offeringStateMatches(item: SubjectCatalogItem, filter: OfferingStateFilter): boolean {
  const status = getCatalogStatus(item);
  if (filter === 'all') return true;
  if (filter === 'offered') return status === 'OFFERED';
  if (filter === 'available') return status === 'AVAILABLE';
  if (filter === 'scheduled') return status === 'DROP_SCHEDULED' || status === 'DROP_PENDING_TERM_CLOSE';
  return status === 'DROPPED_HISTORICAL';
}

function contentMatches(item: SubjectCatalogItem, filter: ContentFilter): boolean {
  if (filter === 'all') return true;
  if (isDroppedHistoricalOffering(item)) return false;
  return filter === 'ready' ? isContentReady(item) : !isContentReady(item);
}

function stateFilterLabel(filter: OfferingStateFilter): string {
  switch (filter) {
    case 'offered':
      return 'Offered';
    case 'available':
      return 'Available';
    case 'scheduled':
      return 'Scheduled removal';
    case 'dropped':
      return 'Dropped historical';
    case 'all':
    default:
      return 'All states';
  }
}

function contentFilterLabel(filter: ContentFilter): string {
  switch (filter) {
    case 'ready':
      return 'Content ready';
    case 'missing':
      return 'Needs curriculum import';
    case 'all':
    default:
      return 'All content states';
  }
}

export function SubjectCataloguePage() {
  const { showToast } = useToast();
  const searchParams = useSearchParams();
  const { curricula } = useCurricula();
  const { canManageSubjects } = useSubjectsPage();
  const selectedCurriculumId = Number(searchParams.get('curriculum') ?? '') || null;
  const activeCurriculum = useMemo(() => {
    if (selectedCurriculumId) {
      return curricula.find((curriculum) => curriculum.id === selectedCurriculumId) ?? null;
    }
    return curricula.find((curriculum) => curriculum.is_active) ?? curricula[0] ?? null;
  }, [curricula, selectedCurriculumId]);
  const returnTo = sanitizeAppDestination(
    searchParams.get('returnTo'),
    '/academic/subjects',
  );
  const initialLevel = searchParams.get('level') ?? 'all';
  const initialSubject = searchParams.get('subject') ?? '';
  const [catalog, setCatalog] = useState<SubjectCatalogItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);
  const [rowErrors, setRowErrors] = useState<Record<string, string>>({});
  const [actionId, setActionId] = useState<string | null>(null);
  const [search, setSearch] = useState(initialSubject);
  const [levelFilter, setLevelFilter] = useState(initialLevel);
  const [stateFilter, setStateFilter] = useState<OfferingStateFilter>('all');
  const [contentFilter, setContentFilter] = useState<ContentFilter>('all');

  const loadCatalog = async () => {
    if (!activeCurriculum) {
      return;
    }
    setLoading(true);
    try {
      setCatalog(await subjectOfferingAPI.getCatalog(activeCurriculum.id));
    } catch (error) {
      setPageError(resolveErrorMessage(error as ApiError, 'Failed to load curriculum catalogue.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let alive = true;
    if (!activeCurriculum) {
      setCatalog([]);
      return;
    }
    setLoading(true);
    subjectOfferingAPI.getCatalog(activeCurriculum.id)
      .then((items) => {
        if (alive) setCatalog(items);
      })
      .catch((error) => {
        if (alive) setPageError(resolveErrorMessage(error as ApiError, 'Failed to load curriculum catalogue.'));
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [activeCurriculum]);

  const levels = useMemo(() => uniqueCatalogLevels(catalog), [catalog]);
  const filteredRows = useMemo(
    () => catalog
      .filter((item) => levelFilter === 'all' || item.level === levelFilter)
      .filter((item) => offeringStateMatches(item, stateFilter))
      .filter((item) => contentMatches(item, contentFilter))
      .filter((item) => matchesCatalogSearch(item, search))
      .sort((left, right) => {
        const levelGap = formatCatalogLevel(left.level).localeCompare(formatCatalogLevel(right.level));
        if (levelGap !== 0) return levelGap;
        return left.name.localeCompare(right.name);
      }),
    [catalog, contentFilter, levelFilter, search, stateFilter],
  );

  const handleOfferSubject = async (item: SubjectCatalogItem) => {
    if (!activeCurriculum) return;
    if (!isContentReady(item)) {
      const message = contentMissingMessage(item);
      setRowErrors((current) => ({ ...current, [item.id]: message }));
      showToast({ message, severity: 'warning' });
      return;
    }
    setActionId(item.id);
    setRowErrors((current) => ({ ...current, [item.id]: '' }));
    try {
      await subjectOfferingAPI.offer({
        curriculum: activeCurriculum.id,
        catalog_subject_id: item.catalog_subject_id,
        level: item.level,
      });
      await loadCatalog();
      showToast({ message: `${catalogRowLabel(item)} is now offered by this workspace.`, severity: 'success' });
    } catch (error) {
      const message = resolveErrorMessage(error as ApiError, `Failed to offer ${catalogRowLabel(item)}.`);
      setRowErrors((current) => ({ ...current, [item.id]: message }));
      showToast({ message, severity: 'error' });
    } finally {
      setActionId(null);
    }
  };

  const handleRemoveOffering = async (item: SubjectCatalogItem) => {
    if (!item.offering_id) return;
    const label = catalogRowLabel(item);
    if (item.cohort_assignment_count > 0 && !confirm(`${label} is already assigned to cohorts. Removing the offering schedules removal after the current term closes and preserves historical records. Continue?`)) {
      return;
    }
    setActionId(item.id);
    setRowErrors((current) => ({ ...current, [item.id]: '' }));
    try {
      const result = await subjectOfferingAPI.remove(item.offering_id, activeCurriculum?.id);
      await loadCatalog();
      showToast({ message: result.detail ?? `${label} was removed from this workspace.`, severity: 'success' });
    } catch (error) {
      const message = resolveErrorMessage(error as ApiError, `Failed to remove ${label}.`);
      setRowErrors((current) => ({ ...current, [item.id]: message }));
      showToast({ message, severity: 'error' });
    } finally {
      setActionId(null);
    }
  };

  const handleRestoreOffering = async (item: SubjectCatalogItem) => {
    if (!item.offering_id || !activeCurriculum) return;
    const label = catalogRowLabel(item);
    setActionId(item.id);
    setRowErrors((current) => ({ ...current, [item.id]: '' }));
    try {
      await subjectOfferingAPI.restore(item.offering_id, activeCurriculum.id);
      await loadCatalog();
      showToast({ message: `${label} has been restored.`, severity: 'success' });
    } catch (error) {
      const message = resolveErrorMessage(error as ApiError, `Failed to restore ${label}.`);
      setRowErrors((current) => ({ ...current, [item.id]: message }));
      showToast({ message, severity: 'error' });
    } finally {
      setActionId(null);
    }
  };

  const handleReofferSubject = async (item: SubjectCatalogItem) => {
    if (!item.offering_id || !activeCurriculum) return;
    const label = catalogRowLabel(item);
    if (!isContentReady(item)) {
      const message = contentMissingMessage(item);
      setRowErrors((current) => ({ ...current, [item.id]: message }));
      showToast({ message, severity: 'warning' });
      return;
    }
    setActionId(item.id);
    setRowErrors((current) => ({ ...current, [item.id]: '' }));
    try {
      await subjectOfferingAPI.reoffer(item.offering_id, activeCurriculum.id);
      await loadCatalog();
      showToast({ message: `${label} has been offered again.`, severity: 'success' });
    } catch (error) {
      const message = resolveErrorMessage(error as ApiError, `Failed to offer ${label} again.`);
      setRowErrors((current) => ({ ...current, [item.id]: message }));
      showToast({ message, severity: 'error' });
    } finally {
      setActionId(null);
    }
  };

  const renderAction = (item: SubjectCatalogItem) => {
    const status = getCatalogStatus(item) as SubjectOfferingCatalogStatus;
    if (!canManageSubjects) {
      return null;
    }
    if (status === 'DROPPED_HISTORICAL' && canReoffer(item) && item.offering_id) {
      if (!isContentReady(item)) {
        return (
          <Button type="button" size="sm" variant="secondary" disabled>
            Request curriculum import
          </Button>
        );
      }
      return (
        <Button type="button" size="sm" disabled={actionId === item.id} onClick={() => handleReofferSubject(item)}>
          <ButtonPendingContent pending={actionId === item.id} pendingLabel="Offering...">
            <RotateCcw className="h-4 w-4" />
            Offer again
          </ButtonPendingContent>
        </Button>
      );
    }
    if (canOffer(item) && status !== 'DROPPED_HISTORICAL') {
      if (!isContentReady(item)) {
        return (
          <Button type="button" size="sm" variant="secondary" disabled>
            Request curriculum import
          </Button>
        );
      }
      return (
        <Button type="button" size="sm" disabled={actionId === item.id} onClick={() => handleOfferSubject(item)}>
          <ButtonPendingContent pending={actionId === item.id} pendingLabel="Offering...">
            <Plus className="h-4 w-4" />
            Offer subject
          </ButtonPendingContent>
        </Button>
      );
    }
    if (canRestore(item) && item.offering_id) {
      return (
        <Button type="button" size="sm" variant="secondary" disabled={actionId === item.id} onClick={() => handleRestoreOffering(item)}>
          <ButtonPendingContent pending={actionId === item.id} pendingLabel="Restoring...">
            <RotateCcw className="h-4 w-4" />
            Restore offering
          </ButtonPendingContent>
        </Button>
      );
    }
    if (canRemove(item) && item.offering_id) {
      return (
        <Button type="button" size="sm" variant="secondary" disabled={actionId === item.id} onClick={() => handleRemoveOffering(item)}>
          <ButtonPendingContent pending={actionId === item.id} pendingLabel="Removing...">
            <Trash2 className="h-4 w-4" />
            Remove from workspace
          </ButtonPendingContent>
        </Button>
      );
    }
    return <span className="text-sm theme-subtle">{status === 'OFFERED' ? 'Already offered' : statusLabel(item)}</span>;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold theme-text">Curriculum catalogue</h1>
          <p className="mt-1 theme-muted">
            Select subject levels from the full curriculum catalogue for this workspace.
          </p>
        </div>
        <Link href={returnTo}>
          <Button type="button" variant="secondary">
            <ArrowLeft className="h-4 w-4" />
            Back to subject offerings
          </Button>
        </Link>
      </div>

      {pageError ? <ErrorBanner message={pageError} onDismiss={() => setPageError(null)} /> : null}

      <Card>
        <div className="grid gap-4 lg:grid-cols-[1fr_auto_auto_auto] lg:items-end">
          <div>
            <label className="text-xs font-medium theme-subtle" htmlFor="catalogue-search">Search</label>
            <div className="relative mt-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 theme-subtle" />
              <input
                id="catalogue-search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by subject name, code, or level..."
                className="theme-input theme-focus-ring w-full rounded-xl py-2.5 pl-9 pr-4 text-sm"
              />
            </div>
          </div>
          <select
            value={levelFilter}
            onChange={(event) => setLevelFilter(event.target.value)}
            className="theme-input theme-focus-ring rounded-xl px-3 py-2.5 text-sm"
            aria-label="Filter by level"
          >
            <option value="all">All levels</option>
            {levels.map((level) => (
              <option key={level} value={level}>{formatCatalogLevel(level)}</option>
            ))}
          </select>
          <select
            value={stateFilter}
            onChange={(event) => setStateFilter(event.target.value as OfferingStateFilter)}
            className="theme-input theme-focus-ring rounded-xl px-3 py-2.5 text-sm"
            aria-label="Filter by offering state"
          >
            {(['all', 'offered', 'available', 'scheduled', 'dropped'] as OfferingStateFilter[]).map((filter) => (
              <option key={filter} value={filter}>{stateFilterLabel(filter)}</option>
            ))}
          </select>
          <select
            value={contentFilter}
            onChange={(event) => setContentFilter(event.target.value as ContentFilter)}
            className="theme-input theme-focus-ring rounded-xl px-3 py-2.5 text-sm"
            aria-label="Filter by content readiness"
          >
            {(['all', 'ready', 'missing'] as ContentFilter[]).map((filter) => (
              <option key={filter} value={filter}>{contentFilterLabel(filter)}</option>
            ))}
          </select>
        </div>
      </Card>

      {loading ? (
        <div>
          <SectionLoading title={`Loading ${activeCurriculum?.name ?? 'curriculum'} catalogue...`} />
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {Array.from({ length: 6 }).map((_, index) => (
              <CardSkeleton key={index} lines={3} />
            ))}
          </div>
        </div>
      ) : filteredRows.length === 0 ? (
        <Card>
          <div className="py-12 text-center">
            <h2 className="text-sm font-medium theme-text">No catalogue rows found</h2>
            <p className="mt-1 text-sm theme-muted">Adjust search or filters to find a subject level.</p>
          </div>
        </Card>
      ) : (
        <Card className="p-0">
          <div className="divide-y theme-border">
            {filteredRows.map((item) => {
              const status = getCatalogStatus(item);
              const rowError = rowErrors[item.id];
              const isHistorical = isDroppedHistoricalOffering(item);
              const missingContent = !isHistorical && !isContentReady(item);
              return (
                <div key={item.id} className="grid gap-3 px-5 py-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium theme-text">{item.name}</p>
                      <Badge variant="default">{item.subject_code ?? item.code}</Badge>
                      <Badge variant="info">{formatCatalogLevel(item.level)}</Badge>
                      <Badge variant={statusBadgeVariant(status)}>{statusLabel(item)}</Badge>
                      {!isHistorical ? (
                        <Badge variant={missingContent ? 'warning' : 'success'}>{contentReadinessLabel(item)}</Badge>
                      ) : null}
                    </div>
                    <p className="mt-1 text-sm theme-muted">
                      {item.cohort_assignment_count === 1 ? '1 cohort assignment' : `${item.cohort_assignment_count} cohort assignments`}
                    </p>
                    {missingContent ? (
                      <p className="mt-1 text-xs text-amber-700">{contentMissingMessage(item)}</p>
                    ) : null}
                    {isScheduledRemoval(item) ? (
                      <p className="mt-1 text-xs text-amber-700">
                        This offering is scheduled for removal and can be restored before finalization.
                      </p>
                    ) : null}
                    {status === 'DROPPED_HISTORICAL' ? (
                      <p className="mt-1 text-xs theme-subtle">
                        Historical offering. Use Offer again when this subject should return to current teaching.
                      </p>
                    ) : null}
                    {rowError ? <p className="mt-2 text-sm text-red-600">{rowError}</p> : null}
                  </div>
                  <div className="flex flex-wrap gap-2 lg:justify-end">
                    {renderAction(item)}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}
