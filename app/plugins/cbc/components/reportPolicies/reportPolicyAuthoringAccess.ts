import type { User, WorkspaceCapabilities } from '@/app/core/types/auth';
import { canManageReportPolicyAuthoring } from '@/app/core/lib/workspaces';
import type { PolicyAuthoringMode } from '@/app/plugins/cbc/types/reportPolicy';

export function canManageCbcReportPolicyAuthoring(params: {
    user?: User | null;
    capabilities?: WorkspaceCapabilities | null;
    authoringMode: PolicyAuthoringMode;
}): boolean {
    return canManageReportPolicyAuthoring(params);
}
