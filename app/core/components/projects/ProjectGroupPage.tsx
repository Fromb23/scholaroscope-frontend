'use client';

import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { Button } from '@/app/components/ui/Button';
import { Card } from '@/app/components/ui/Card';
import { LoadingSpinner } from '@/app/components/ui/LoadingSpinner';
import { AppErrorBanner } from '@/app/components/ui/errors';
import { parseAppDestination } from '@/app/core/auth/navigation';
import { resolveAppError } from '@/app/core/errors';
import { useProjectGroup } from '@/app/core/hooks/useProjects';

export function ProjectGroupPage() {
  const params = useParams<{ deploymentId: string; groupId: string }>();
  const searchParams = useSearchParams();
  const deploymentId = Number(params.deploymentId);
  const groupId = Number(params.groupId);
  const query = useProjectGroup(deploymentId, groupId);
  const returnTo =
    parseAppDestination(searchParams.get('returnTo')) ?? `/projects/${deploymentId}?tab=groups`;

  if (query.isLoading) return <LoadingSpinner message="Loading group members…" />;
  if (query.error || !query.data) {
    return (
      <AppErrorBanner
        error={resolveAppError(query.error, {
          domain: 'projects',
          action: 'load',
          entityLabel: 'project group',
        })}
      />
    );
  }

  return (
    <div className="space-y-6">
      <Link href={returnTo}>
        <Button variant="ghost">Back</Button>
      </Link>
      <div>
        <h1 className="text-2xl font-bold theme-text">{query.data.name}</h1>
        <p className="theme-muted">Current group members</p>
      </div>
      <Card>
        {query.data.members.length ? (
          query.data.members.map((member) => (
            <div key={member.id} className="border-b theme-border py-3 last:border-0">
              <p className="font-medium theme-text">{member.learner_name}</p>
              <p className="text-sm theme-muted">
                {member.participation_status}{member.role ? ` · ${member.role}` : ''}
              </p>
            </div>
          ))
        ) : (
          <p className="theme-muted">This group has no active project participants.</p>
        )}
      </Card>
      {query.data.historical_members?.length ? (
        <Card>
          <h2 className="font-semibold theme-text">Historical memberships</h2>
          <p className="mb-2 text-sm theme-muted">Excluded from new evidence and evaluation.</p>
          {query.data.historical_members.map((member) => (
            <div key={member.id} className="border-b theme-border py-3 last:border-0">
              <p className="font-medium theme-text">{member.learner_name}</p>
              <p className="text-sm theme-muted">Historical · {member.participation_status}</p>
            </div>
          ))}
        </Card>
      ) : null}
    </div>
  );
}
