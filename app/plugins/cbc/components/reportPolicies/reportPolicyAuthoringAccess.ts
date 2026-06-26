import type { User, WorkspaceCapabilities } from '@/app/core/types/auth';
import type { PolicyAuthoringMode } from '@/app/plugins/cbc/types/reportPolicy';

export function canManageCbcReportPolicyAuthoring(params: {
    user?: User | null;
    capabilities?: WorkspaceCapabilities | null;
    authoringMode: PolicyAuthoringMode;
}): boolean {
    const { user, capabilities, authoringMode } = params;
    if (!user) {
        return false;
    }
    if (user.is_superadmin) {
        return true;
    }

    const reportConfiguration = capabilities?.report_configuration;
    const reportPolicyAvailable = Boolean(
        reportConfiguration?.report_policy_available
        ?? capabilities?.can_manage_report_policy
    );
    const reportPolicyMode = (
        reportConfiguration?.report_policy_mode
        ?? capabilities?.report_policy_mode
        ?? null
    );

    if (!reportPolicyAvailable) {
        return false;
    }

    if (authoringMode === 'INSTITUTION_GOVERNANCE') {
        return Boolean(
            reportPolicyMode === 'INSTITUTION_GOVERNANCE'
            && reportConfiguration?.reporting_governance_routes_allowed
        );
    }

    return reportPolicyMode === 'CLASS_CONFIGURATION';
}
