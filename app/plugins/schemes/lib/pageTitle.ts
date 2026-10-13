export function getSchemesPageTitle(
  effectiveMyTeachingMode: boolean,
  isInstitutionalAdminSupervisor: boolean,
): string {
  if (effectiveMyTeachingMode) return 'My Schemes of Work';
  if (isInstitutionalAdminSupervisor) return 'Schemes of Work Supervision';
  return 'Schemes of Work';
}
