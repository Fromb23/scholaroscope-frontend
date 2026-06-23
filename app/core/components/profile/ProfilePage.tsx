'use client';

// ============================================================================
// app/(dashboard)/profile/page.tsx
//
// Responsibility: fetch via hook, handle modal state, compose components.
// No UI definitions. No modal logic. No form handling.
// ============================================================================

import { useState } from 'react';
import { useProfile } from '@/app/core/hooks/useProfile';
import { LoadingSpinner } from '@/app/components/ui/LoadingSpinner';
import { ErrorState } from '@/app/components/ui/ErrorState';
import {
    IdentityCard,
    AccountMetaCard,
    ContactDetailsCard,
    SecurityCard,
    InlineAlert,
    EditProfileModal,
    ChangePasswordModal,
} from '@/app/core/components/profile/ProfileComponents';
import { getProfileExtensions } from '@/app/core/registry/profileExtensions';

export function ProfilePage() {
    const { profile, loading, error, updateProfile, changePassword } = useProfile();

    const [editOpen, setEditOpen] = useState(false);
    const [passwordOpen, setPasswordOpen] = useState(false);
    const [profileSuccess, setProfileSuccess] = useState(false);

    // ── Guards ────────────────────────────────────────────────────────────

    if (loading) return <LoadingSpinner message="Loading profile..." />;
    if (error || !profile) return <ErrorState message={error ?? 'Failed to load profile'} />;

    // ── Derived state ─────────────────────────────────────────────────────

    const profileExtensions = getProfileExtensions({ profile });

    const handleSaveProfile = async (data: { first_name: string; last_name: string; phone: string }) => {
        await updateProfile(data);
        setProfileSuccess(true);
        setTimeout(() => setProfileSuccess(false), 3000);
    };

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

                    {profileExtensions.map((extension) => (
                        <extension.Component key={extension.key} profile={profile} />
                    ))}
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
        </div>
    );
}
