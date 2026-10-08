import type { ProjectAuthority, ProjectDeployment } from '@/app/core/types/projects';

export type ProjectLifecycleAction = 'publish' | 'start' | 'complete' | 'finalize' | 'cancel';

export function getProjectLifecycleActions(
  project: Pick<ProjectDeployment, 'status' | 'authority'>,
): ProjectLifecycleAction[] {
  const actions: ProjectLifecycleAction[] = [];
  if (project.authority.can_publish) actions.push('publish');
  if (project.authority.can_start) actions.push('start');
  if (project.authority.can_complete) actions.push('complete');
  if (project.authority.can_finalize) actions.push('finalize');
  if (project.authority.can_cancel) actions.push('cancel');
  return actions;
}

export function canShowProjectEvaluationControls(authority: ProjectAuthority): boolean {
  return authority.can_evaluate;
}
