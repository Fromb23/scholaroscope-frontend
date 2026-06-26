export function isCohortWorkspaceReturnTo(value?: string | null): boolean {
  if (!value || !value.startsWith('/')) {
    return false;
  }

  const [pathAndQuery, hash = ''] = value.split('#');
  const path = pathAndQuery.split('?')[0];

  return /^\/academic\/cohorts\/\d+$/.test(path) && /^subject-\d+$/.test(hash);
}

export function getReturnBackLabel(value?: string | null, fallback = 'Back'): string {
  return isCohortWorkspaceReturnTo(value) ? 'Back to workspace' : fallback;
}
