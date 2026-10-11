'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { Button } from '@/app/components/ui/Button';
import { Card } from '@/app/components/ui/Card';
import { LoadingSpinner } from '@/app/components/ui/LoadingSpinner';
import { AppErrorBanner } from '@/app/components/ui/errors';
import { resolveAppError } from '@/app/core/errors';
import { useGroupingContext } from '@/app/core/hooks/useGrouping';
import type { GroupingContextType } from '@/app/core/types/grouping';

export function buildGroupBuilderHref(type: GroupingContextType, id: number, returnTo: string) {
  const params = new URLSearchParams({ context: type, id: String(id), returnTo });
  return `/groups/builder?${params.toString()}`;
}

export function GroupRosterSummary({ type, id }: { type: GroupingContextType; id: number }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const query = useGroupingContext(type, id);
  const returnTo = `${pathname}${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;

  if (query.isLoading) return <LoadingSpinner fullScreen={false} message="Loading group roster…" />;
  if (query.error || !query.data) {
    return (
      <AppErrorBanner
        error={resolveAppError(query.error, {
          domain: type === 'project' ? 'projects' : 'assignments',
          action: 'load',
          entityLabel: 'group roster',
        })}
        onAction={() => void query.refetch()}
      />
    );
  }

  const data = query.data;
  const hasRoster = Boolean(data.group_set);
  return (
    <div className="space-y-4">
      <Card>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <h2 className="text-lg font-semibold theme-text">Group roster</h2>
            <p className="text-sm theme-muted">{data.context.population_label}</p>
            <div className="flex flex-wrap gap-3 text-sm theme-muted">
              <span>{data.counts.eligible} eligible</span>
              <span>{data.counts.assigned} grouped</span>
              <span>{data.counts.unassigned} unassigned</span>
            </div>
          </div>
          {data.capabilities.can_manage ? (
            <Link href={buildGroupBuilderHref(type, id, returnTo)}>
              <Button>{hasRoster ? 'Manage groups' : 'Set up groups'}</Button>
            </Link>
          ) : (
            <span className="rounded-full border theme-border px-3 py-1 text-xs theme-muted">
              Read only
            </span>
          )}
        </div>
      </Card>

      {data.legacy.status === 'FAILED' ? (
        <Card className="border-[color:var(--color-danger)]">
          <h3 className="font-semibold theme-text">Legacy reconciliation failed</h3>
          <p className="mt-1 text-sm theme-muted">
            {data.group_set?.reconciliation_error ||
              'The historical roster needs review before it can be managed.'}
          </p>
        </Card>
      ) : data.legacy.status === 'NEEDS_RECONCILIATION' ? (
        <Card className="border-[color:var(--color-warning)]">
          <h3 className="font-semibold theme-text">Legacy group — needs reconciliation</h3>
          <p className="mt-1 text-sm theme-muted">
            {data.legacy.legacy_group_count} historical group record(s) are preserved but are not
            treated as the current roster.
          </p>
        </Card>
      ) : data.legacy.status === 'NEEDS_ALLOCATION' ? (
        <Card>
          <h3 className="font-semibold theme-text">Legacy groups preserved</h3>
          <p className="mt-1 text-sm theme-muted">
            {data.legacy.empty_group_count} empty historical group(s) need learner allocation in the
            shared builder.
          </p>
        </Card>
      ) : null}

      {data.group_set?.groups.length ? (
        <Card>
          <div className="space-y-3">
            {data.group_set.groups.map((group) => (
              <div key={group.id} className="border-b theme-border pb-3 last:border-0 last:pb-0">
                <p className="font-medium theme-text">{group.name}</p>
                <p className="text-sm theme-muted">{group.members.length} learners</p>
              </div>
            ))}
          </div>
        </Card>
      ) : (
        <Card>
          <p className="py-6 text-center theme-muted">No shared roster has been saved.</p>
        </Card>
      )}
    </div>
  );
}
