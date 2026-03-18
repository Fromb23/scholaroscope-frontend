'use client';

// ============================================================================
// app/(dashboard)/profile/page.tsx
//
// Responsibility: fetch via hook, handle modal state, compose components.
// No UI definitions. No modal logic. No form handling.
// ============================================================================

import { useState } from 'react';
import { useProfile, useMyRequests } from '@/app/core/hooks/useProfile';
import { LoadingSpinner } from '@/app/components/ui/LoadingSpinner';
import { ErrorState } from '@/app/components/ui/ErrorState';
import {
    IdentityCard,
    AccountMetaCard,
    ContactDetailsCard,
    SecurityCard,
    RecentRequestsCard,
    DangerZoneCard,
    InlineAlert,
    EditProfileModal,
    ChangePasswordModal,
    DeletionRequestModal,
} from '@/app/core/components/profile/ProfileComponents';

export default function ProfilePage() {
    const { profile, loading, error, updateProfile, changePassword } = useProfile();
    const { requests, loading: requestsLoading, submitDeletionRequest, hasPendingDeletion } = useMyRequests();

    const [editOpen, setEditOpen] = useState(false);
    const [passwordOpen, setPasswordOpen] = useState(false);
    const [deletionModal, setDeletionModal] = useState<'ACCOUNT_DELETION' | 'ORG_DELETION' | null>(null);
    const [profileSuccess, setProfileSuccess] = useState(false);

    // ── Guards ────────────────────────────────────────────────────────────

    if (loading) return <LoadingSpinner message="Loading profile..." />;
    if (error || !profile) return <ErrorState message={error ?? 'Failed to load profile'} />;

    // ── Derived state ─────────────────────────────────────────────────────

    const isInstructor = profile.role === 'INSTRUCTOR';
    const isAdmin = profile.role === 'ADMIN';
    const isSuperAdmin = profile.role === 'SUPERADMIN';

    const accountDeletionPending = hasPendingDeletion('ACCOUNT_DELETION');
    const orgDeletionPending = hasPendingDeletion('ORG_DELETION');

    const handleSaveProfile = async (data: { first_name: string; last_name: string; phone: string }) => {
        await updateProfile(data);
        setProfileSuccess(true);
        setTimeout(() => setProfileSuccess(false), 3000);
    };

    // Build danger zone actions per role
    const dangerActions = [
        ...(isInstructor || isAdmin ? [{
            label: 'Delete My Account',
            description: 'Request your account and all associated data to be permanently erased. Your administrator will review this request.',
            pending: accountDeletionPending,
            pendingLabel: 'Request Pending',
            onDelete: () => setDeletionModal('ACCOUNT_DELETION'),
        }] : []),
        ...(isAdmin ? [{
            label: `Delete Organization${profile.organization_name ? ` · ${profile.organization_name}` : ''}`,
            description: 'Request the complete deletion of your organization and all its data. This will be escalated to a SuperAdmin.',
            pending: orgDeletionPending,
            pendingLabel: 'Request Pending',
            onDelete: () => setDeletionModal('ORG_DELETION'),
        }] : []),
    ];

    // ── Render ────────────────────────────────────────────────────────────

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>
                <p className="text-sm text-gray-500 mt-1">
                    Manage your personal information and account settings
                </p>
            </div>

            {profileSuccess && (
                <InlineAlert type="success" message="Profile updated successfully." />
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left column */}
                <div className="lg:col-span-1 space-y-4">
                    <IdentityCard
                        profile={profile}
                        onEditClick={() => setEditOpen(true)}
                    />
                    <AccountMetaCard
                        dateJoined={profile.date_joined}
                        lastLogin={profile.last_login}
                        isActive={profile.is_active}
                    />
                </div>

                {/* Right column */}
                <div className="lg:col-span-2 space-y-4">
                    <ContactDetailsCard
                        profile={profile}
                        onEditClick={() => setEditOpen(true)}
                    />

                    <SecurityCard onChangePassword={() => setPasswordOpen(true)} />

                    {!isSuperAdmin && (
                        <RecentRequestsCard
                            requests={requests}
                            loading={requestsLoading}
                        />
                    )}

                    {dangerActions.length > 0 && (
                        <DangerZoneCard actions={dangerActions} />
                    )}
                </div>
            </div>

            {/* ── Modals ── */}
            <EditProfileModal
                isOpen={editOpen}
                onClose={() => setEditOpen(false)}
                initialValues={{
                    first_name: profile.first_name,
                    last_name: profile.last_name,
                    phone: profile.phone,
                }}
                onSave={handleSaveProfile}
            />

            <ChangePasswordModal
                isOpen={passwordOpen}
                onClose={() => setPasswordOpen(false)}
                onSave={changePassword}
            />

            {deletionModal && (
                <DeletionRequestModal
                    isOpen={!!deletionModal}
                    onClose={() => setDeletionModal(null)}
                    type={deletionModal}
                    orgName={profile.organization_name}
                    onConfirm={async reason => {
                        await submitDeletionRequest(deletionModal, reason);
                    }}
                />
            )}
        </div>
    );
}