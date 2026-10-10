import Link from 'next/link';
import { Eye, Rocket, School } from 'lucide-react';
import { Badge } from '@/app/components/ui/Badge';
import { Button } from '@/app/components/ui/Button';
import { Card } from '@/app/components/ui/Card';
import type { ProjectCatalogueAction, ProjectDefinitionVersion } from '@/app/core/types/projects';
import { buildProjectDefinitionHref } from './projectNavigation';

export function eligibleTargetLabel(count: number): string {
  return `${count} eligible teaching ${count === 1 ? 'target' : 'targets'}`;
}

export function primaryCatalogueAction(
  definition: ProjectDefinitionVersion,
): ProjectCatalogueAction | null {
  return (
    definition.available_actions.find(
      (action) =>
        action === 'REGISTER' ||
        action === 'DEPLOY' ||
        action === 'VIEW_PROJECT' ||
        action === 'VIEW_DEPLOYMENT',
    ) ?? null
  );
}

export function ProjectCatalogueCard({
  definition,
  returnTo,
  onViewDetails,
  onRegister,
  onDeploy,
}: {
  definition: ProjectDefinitionVersion;
  returnTo: string;
  onViewDetails: (definition: ProjectDefinitionVersion) => void;
  onRegister: (definition: ProjectDefinitionVersion) => void;
  onDeploy: (definition: ProjectDefinitionVersion) => void;
}) {
  return (
    <Card className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold theme-text">{definition.title}</h3>
          <p className="text-sm theme-muted">
            {definition.subject_key} · {definition.level_key} · {definition.assessment_year}
          </p>
        </div>
        <Badge>
          {definition.catalogue_scope === 'PLATFORM_OFFICIAL' ? 'Official' : 'Organization project'}
        </Badge>
      </div>
      <p className="text-sm theme-muted">{definition.summary || 'No summary supplied.'}</p>
      <div className="flex flex-wrap gap-2">
        <Badge>Version {definition.version}</Badge>
        <Badge>{definition.maximum_marks} marks</Badge>
        <Badge>{definition.task_count ?? definition.tasks.length} tasks</Badge>
        {definition.catalogue_scope === 'PLATFORM_OFFICIAL' ? (
          <Badge>Read-only definition</Badge>
        ) : null}
      </div>
      <p className="flex items-center gap-2 text-sm theme-muted">
        <School className="h-4 w-4" aria-hidden="true" />
        {eligibleTargetLabel(definition.eligible_cohort_subjects.length)}
      </p>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant="secondary"
          aria-label={`View details for ${definition.title}`}
          onClick={() => onViewDetails(definition)}
        >
          <Eye className="h-4 w-4" aria-hidden="true" />
          View details
        </Button>
        {definition.available_actions.includes('REGISTER') ? (
          <Button
            type="button"
            size="sm"
            aria-label={`Register project ${definition.title}`}
            onClick={() => onRegister(definition)}
          >
            <Rocket className="h-4 w-4" aria-hidden="true" />
            Register project
          </Button>
        ) : null}
        {definition.available_actions.includes('DEPLOY') ? (
          <Button
            type="button"
            size="sm"
            aria-label={`Deploy project ${definition.title}`}
            onClick={() => onDeploy(definition)}
          >
            <Rocket className="h-4 w-4" aria-hidden="true" />
            Deploy project
          </Button>
        ) : null}
        {definition.available_actions.includes('VIEW_PROJECT') ||
        definition.available_actions.includes('VIEW_DEPLOYMENT') ? (
          <Link href={buildProjectDefinitionHref(definition.id, returnTo)}>
            <Button
              type="button"
              size="sm"
              aria-label={`View deployed project ${definition.title}`}
            >
              View deployed project
            </Button>
          </Link>
        ) : null}
      </div>
    </Card>
  );
}
