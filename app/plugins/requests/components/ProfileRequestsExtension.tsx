'use client';

import { useState } from 'react';
import {
    DangerZoneCard,
    DeletionRequestModal,
    RecentRequestsCard,
} from '@/app/core/components/profile/ProfileComponents';
import type { ProfileExtensionContext } from '@/app/core/registry/profileExtensions';
import { useMyRequests } from '@/app/plugins/requests/hooks/useRequests';

type DeletionRequestType = 'ACCOUNT_DELETION' | 'ORG_DELETION';

export function ProfileRequestsExtension({ profile }: ProfileExtensionContext) {
    const { requests, loading, submitDeletionRequest, hasPendingDeletion } = useMyRequests();
    const [deletionModal, setDeletionModal] = useState<DeletionRequestType | null>(null);

    const isInstructor = profile.role === 'INSTRUCTOR';
    const isAdmin = profile.role === 'ADMIN';
    const isSuperAdmin = profile.role === 'SUPERADMIN';

    const dangerActions = [
        ...(isInstructor || isAdmin ? [{
            label: 'Delete My Account',
            description: 'Request your account and all associated data to be permanently erased. Your administrator will review this request.',
            pending: hasPendingDeletion('ACCOUNT_DELETION'),
            pendingLabel: 'Request Pending',
            onDelete: () => setDeletionModal('ACCOUNT_DELETION'),
        }] : []),
        ...(isAdmin ? [{
            label: `Delete Organization${profile.organization_name ? ` · ${profile.organization_name}` : ''}`,
            description: 'Request the complete deletion of your organization and all its data. This will be escalated to a SuperAdmin.',
            pending: hasPendingDeletion('ORG_DELETION'),
            pendingLabel: 'Request Pending',
            onDelete: () => setDeletionModal('ORG_DELETION'),
        }] : []),
    ];

    return (
        <>
            {!isSuperAdmin ? (
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
