import { parseAppDestination, sanitizeAppDestination } from '@/app/core/auth/navigation';

export function buildProjectDetailHref(deploymentId: number, returnTo: string): string {
  const safeReturnTo = parseAppDestination(returnTo) ?? '/projects';
  const params = new URLSearchParams({ returnTo: safeReturnTo });
  return `/projects/${deploymentId}?${params.toString()}`;
}

export function buildProjectDefinitionHref(
  definitionVersionId: number,
  returnTo = '/projects',
): string {
  const safeReturnTo = parseAppDestination(returnTo) ?? '/projects';
  const params = new URLSearchParams({ returnTo: safeReturnTo });
  return `/projects/definitions/${definitionVersionId}?${params.toString()}`;
}

export function buildProjectWorkspaceHref(
  deploymentId: number,
  currentSearch: string | URLSearchParams,
  tab: string,
): string {
  const params = new URLSearchParams(
    typeof currentSearch === 'string' ? currentSearch : currentSearch.toString(),
  );
  const safeReturnTo = parseAppDestination(params.get('returnTo'));
  if (safeReturnTo) params.set('returnTo', safeReturnTo);
  else params.delete('returnTo');
  params.set('tab', tab);
  return `/projects/${deploymentId}?${params.toString()}`;
}

export function projectBackHref(returnTo: string | null | undefined): string {
  return sanitizeAppDestination(returnTo, '/projects');
}
