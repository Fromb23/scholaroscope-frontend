'use client';

import { useState } from 'react';
import {
    DangerZoneCard,
    DeletionRequestModal,
    RecentRequestsCard,
} from '@/app/core/components/profile/ProfileComponents';
import type { ProfileExtensionContext } from '@/app/core/registry/profileExtensions';
import { useMyRequests } from '@/app/plugins/requests/hooks/useRequests';
import { useAuth } from '@/app/context/AuthContext';
import { isSelfManagedTeachingWorkspace } from '@/app/core/lib/workspaces';

type DeletionRequestType = 'ACCOUNT_DELETION' | 'ORG_DELETION';

export function ProfileRequestsExtension({ profile }: ProfileExtensionContext) {
    const { activeOrg, capabilities } = useAuth();
    const { requests, loading, submitDeletionRequest, hasPendingDeletion } = useMyRequests();
    const [deletionModal, setDeletionModal] = useState<DeletionRequestType | null>(null);

    const selfManagedTeachingWorkspace = isSelfManagedTeachingWorkspace({
        orgType: activeOrg?.org_type,
        capabilities,
    });
    const canRequestAccountDeletion = Boolean(capabilities.can_teach || capabilities.can_manage_staff);
    const canRequestOrganizationDeletion = Boolean(capabilities.is_workspace_owner || capabilities.can_manage_staff);

    const dangerActions = [
        ...(canRequestAccountDeletion ? [{
            label: 'Delete My Account',
            description: 'Request your account and all associated data to be permanently erased. Your administrator will review this request.',
            pending: hasPendingDeletion('ACCOUNT_DELETION'),
            pendingLabel: 'Request Pending',
            onDelete: () => setDeletionModal('ACCOUNT_DELETION'),
        }] : []),
        ...(canRequestOrganizationDeletion ? [{
            label: `Delete Organization${profile.organization_name ? ` · ${profile.organization_name}` : ''}`,
            description: 'Request the complete deletion of your organization and all its data. This will be escalated to Scholaroscope support.',
            pending: hasPendingDeletion('ORG_DELETION'),
            pendingLabel: 'Request Pending',
            onDelete: () => setDeletionModal('ORG_DELETION'),
        }] : []),
    ];

    return (
        <>
            {!selfManagedTeachingWorkspace ? (
                <RecentRequestsCard
                    requests={requests}
                    loading={loading}
                />
            ) : null}

            {dangerActions.length > 0 ? (
                <DangerZoneCard actions={dangerActions} />
            ) : null}

            {deletionModal ? (
                <DeletionRequestModal
                    isOpen={!!deletionModal}
                    onClose={() => setDeletionModal(null)}
                    type={deletionModal}
                    orgName={profile.organization_name}
                    onConfirm={async reason => {
                        await submitDeletionRequest(deletionModal, reason);
                    }}
                />
            ) : null}
        </>
    );
}
