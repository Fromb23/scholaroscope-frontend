import type { WorkspaceCapabilities } from '@/app/core/types/auth';
import { hasWorkspacePermission } from '@/app/core/lib/productCapabilities';

export type WorkspaceSettingsTab = 'general' | 'members' | 'plugins';

export function getWorkspaceSettingsTabs(
  capabilities: WorkspaceCapabilities | null | undefined,
  options: { isFreelance: boolean },
): WorkspaceSettingsTab[] {
  const tabs: WorkspaceSettingsTab[] = [];

  if (hasWorkspacePermission(capabilities, 'themes.manage')) {
    tabs.push('general');
  }
  if (!options.isFreelance && hasWorkspacePermission(capabilities, 'workspace.members.view')) {
    tabs.push('members');
  }
  if (hasWorkspacePermission(capabilities, 'plugins.view')) {
    tabs.push('plugins');
  }

  return tabs;
}
