type EffectiveCapability = {
  enabled?: boolean;
};

type TimetableCapabilities = {
  product_capabilities?: Record<string, EffectiveCapability>;
  effective_capabilities?: Record<string, EffectiveCapability>;
  authorization?: {
    permission_keys?: string[];
  };
} | null | undefined;

export const TIMETABLE_PERMISSIONS = {
  viewOwn: 'timetable.view_own',
  viewWorkspace: 'timetable.view_workspace',
  manage: 'timetable.manage',
} as const;

function getCapability(
  capabilities: TimetableCapabilities,
  key: string,
): EffectiveCapability | null {
  return capabilities?.product_capabilities?.[key]
    ?? capabilities?.effective_capabilities?.[key]
    ?? null;
}

export function hasTimetableCapability(
  capabilities: TimetableCapabilities,
  capabilityKey: 'timetable.enabled' | 'timetable.learning' | 'timetable.print',
): boolean {
  const explicit = getCapability(capabilities, capabilityKey);
  if (explicit !== null) return explicit.enabled === true;
  return getCapability(capabilities, 'timetable')?.enabled === true;
}

function hasWorkspacePermission(
  capabilities: TimetableCapabilities,
  permissionKey: string,
): boolean {
  return capabilities?.authorization?.permission_keys?.includes(permissionKey) === true;
}

export function canViewOwnTimetable(capabilities: TimetableCapabilities): boolean {
  return hasTimetableCapability(capabilities, 'timetable.enabled')
    && hasTimetableCapability(capabilities, 'timetable.learning')
    && hasWorkspacePermission(capabilities, TIMETABLE_PERMISSIONS.viewOwn);
}

export function canViewWorkspaceTimetable(capabilities: TimetableCapabilities): boolean {
  return hasTimetableCapability(capabilities, 'timetable.enabled')
    && hasTimetableCapability(capabilities, 'timetable.learning')
    && hasWorkspacePermission(capabilities, TIMETABLE_PERMISSIONS.viewWorkspace);
}

export function canPrintOwnTimetable(capabilities: TimetableCapabilities): boolean {
  return hasTimetableCapability(capabilities, 'timetable.enabled')
    && hasTimetableCapability(capabilities, 'timetable.print')
    && hasWorkspacePermission(capabilities, TIMETABLE_PERMISSIONS.viewOwn);
}

export function canPrintWorkspaceTimetable(capabilities: TimetableCapabilities): boolean {
  return hasTimetableCapability(capabilities, 'timetable.enabled')
    && hasTimetableCapability(capabilities, 'timetable.print')
    && hasWorkspacePermission(capabilities, TIMETABLE_PERMISSIONS.viewWorkspace);
}

export function canLaunchTimetableManagement(
  capabilities: TimetableCapabilities,
  provisioningReady: boolean,
): boolean {
  return hasTimetableCapability(capabilities, 'timetable.enabled')
    && provisioningReady
    && hasWorkspacePermission(capabilities, TIMETABLE_PERMISSIONS.manage);
}

export function canManageTimetable(capabilities: TimetableCapabilities): boolean {
  return hasTimetableCapability(capabilities, 'timetable.enabled')
    && hasWorkspacePermission(capabilities, TIMETABLE_PERMISSIONS.manage);
}
