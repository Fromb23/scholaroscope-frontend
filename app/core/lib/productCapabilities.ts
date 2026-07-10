import type { EffectiveCapability, WorkspaceCapabilities } from '@/app/core/types/auth';

type PluginCapabilityContext = {
  capabilities?: WorkspaceCapabilities | null;
  enabledFeatures?: readonly string[] | null;
};

export function getProductCapability(
  capabilities: WorkspaceCapabilities | null | undefined,
  key: string,
): EffectiveCapability | null {
  return capabilities?.product_capabilities?.[key]
    ?? capabilities?.effective_capabilities?.[key]
    ?? null;
}

export function hasProductCapability(
  capabilities: WorkspaceCapabilities | null | undefined,
  key: string,
): boolean {
  return getProductCapability(capabilities, key)?.enabled === true;
}

export function hasResolvedProductCapabilityEntry(
  capabilities: WorkspaceCapabilities | null | undefined,
  key: string,
): boolean {
  return getProductCapability(capabilities, key) !== null;
}

export function hasPluginCapability(
  context: PluginCapabilityContext,
  key: string,
): boolean {
  const resolved = getProductCapability(context.capabilities, key);
  if (resolved !== null) {
    return resolved.enabled === true;
  }
  return context.enabledFeatures?.some((feature) => feature === key) === true;
}

export function hasWorkspacePermission(
  capabilities: WorkspaceCapabilities | null | undefined,
  permissionKey: string,
): boolean {
  return capabilities?.authorization?.permission_keys.includes(permissionKey) === true;
}

export function hasFeatureAccess(
  capabilities: WorkspaceCapabilities | null | undefined,
  options: {
  permissionKey: string;
  productCapabilityKey?: string;
  },
): boolean {
  const { permissionKey, productCapabilityKey } = options;
  if (!hasWorkspacePermission(capabilities, permissionKey)) {
    return false;
  }
  if (!productCapabilityKey) {
    return true;
  }
  return hasProductCapability(capabilities, productCapabilityKey);
}
