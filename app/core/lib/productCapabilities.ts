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

export function hasPluginCapability(
  context: PluginCapabilityContext,
  key: string,
): boolean {
  if (hasProductCapability(context.capabilities, key)) {
    return true;
  }
  return context.enabledFeatures?.some((feature) => feature === key) === true;
}
