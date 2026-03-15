'use client';

// ============================================================================
// app/(dashboard)/profile/page.tsx
// Route: /profile
// Single page that adapts its content and available actions by role:
//   INSTRUCTOR  → view profile, edit name/phone, change password, request account deletion
//   ADMIN       → same + request org deletion
//   SUPERADMIN  → view profile, edit name/phone, change password (no deletion requests)
// ============================================================================

import { useState } from 'react';
import {
    Mail, Phone, Building2, Shield, Calendar,
    Clock, KeyRound, Trash2, AlertTriangle, CheckCircle,
    Pencil, Eye, EyeOff, ChevronRight, FileText,
    Link,
} from 'lucide-react';
import { useProfile, useMyRequests } from '@/app/core/hooks/useProfile';
import { Badge } from '@/app/components/ui/Badge';
import { Button } from '@/app/components/ui/Button';
import { Card } from '@/app/components/ui/Card';
import { Input } from '@/app/components/ui/Input';
import Modal from '@/app/components/ui/Modal';
import { STATUS_COLORS, Request } from '@/app/plugins/requests/types/requests';

// ============================================================================
// Helpers
// ============================================================================

function formatDate(iso: string | null): string {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('en-GB', {
        day: '2-digit', month: 'short', year: 'numeric',
    });
}

function formatDateTime(iso: string | null): string {
    if (!iso) return 'Never';
    return new Date(iso).toLocaleString('en-GB', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
    });
}

const ROLE_BADGE: Record<string, 'purple' | 'info' | 'default'> = {
    SUPERADMIN: 'purple',
    ADMIN: 'info',
    INSTRUCTOR: 'default',
};

// ============================================================================
// Edit Profile Modal
// ============================================================================

interface EditProfileModalProps {
    isOpen: boolean;
    onClose: () => void;
    initialValues: { first_name: string; last_name: string; phone: string };
    onSave: (data: { first_name: string; last_name: string; phone: string }) => Promise<void>;
}

function EditProfileModal({ isOpen, onClose, initialValues, onSave }: EditProfileModalProps) {
    const [form, setForm] = useState(initialValues);
    const [errors, setErrors] = useState<Partial<typeof form>>({});
    const [saving, setSaving] = useState(false);
    const [apiError, setApiError] = useState<string | null>(null);

    const handleChange = (field: keyof typeof form, value: string) => {
        setForm(prev => ({ ...prev, [field]: value }));
        if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }));
    };

    const validate = () => {
        const e: Partial<typeof form> = {};
        if (!form.first_name.trim()) e.first_name = 'First name is required';
        if (!form.last_name.trim()) e.last_name = 'Last name is required';
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const handleSubmit = async () => {
        if (!validate()) return;
        setSaving(true);
        setApiError(null);
        try {
            await onSave(form);
            onClose();
        } catch (err: unknown) {
            setApiError(
                err && typeof err === 'object' && 'message' in err
                    ? String((err as { message?: string }).message)
                    : 'An error occurred'
            );
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Edit Profile" size="md">
            <div className="space-y-4">
                {apiError && (
                    <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                        <AlertTriangle className="h-4 w-4 shrink-0" />
                        {apiError}
                    </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                    <Input
                        label="First Name *"
                        value={form.first_name}
                        onChange={e => handleChange('first_name', e.target.value)}
                        error={errors.first_name}
                    />
                    <Input
                        label="Last Name *"
                        value={form.last_name}
                        onChange={e => handleChange('last_name', e.target.value)}
                        error={errors.last_name}
                    />
                </div>
                <Input
                    label="Phone"
                    value={form.phone}
                    onChange={e => handleChange('phone', e.target.value)}
                    placeholder="+254 700 000 000"
                />
                <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                    <Button variant="secondary" onClick={onClose} disabled={saving}>
                        Cancel
                    </Button>
                    <Button variant="primary" onClick={handleSubmit} disabled={saving}>
                        {saving ? 'Saving...' : 'Save Changes'}
                    </Button>
                </div>
            </div>
        </Modal>
    );
}

// ============================================================================
// Change Password Modal
// ============================================================================

function ChangePasswordModal({
    isOpen,
    onClose,
    onSave,
}: {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: { old_password: string; new_password: string; new_password2: string }) => Promise<void>;
}) {
    const [form, setForm] = useState({ old_password: '', new_password: '', new_password2: '' });
    const [show, setShow] = useState({ old: false, new: false, confirm: false });
    const [errors, setErrors] = useState<Partial<typeof form>>({});
    const [saving, setSaving] = useState(false);
    const [apiError, setApiError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const handleChange = (field: keyof typeof form, value: string) => {
        setForm(prev => ({ ...prev, [field]: value }));
        if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }));
    };

    const validate = () => {
        const e: Partial<typeof form> = {};
        if (!form.old_password) e.old_password = 'Current password is required';
        if (!form.new_password || form.new_password.length < 8)
            e.new_password = 'New password must be at least 8 characters';
        if (form.new_password !== form.new_password2)
            e.new_password2 = 'Passwords do not match';
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const handleSubmit = async () => {
        if (!validate()) return;
        setSaving(true);
        setApiError(null);
        try {
            await onSave(form);
            setSuccess(true);
            setForm({ old_password: '', new_password: '', new_password2: '' });
        } catch (err: unknown) {
            setApiError(
                err && typeof err === 'object' && 'message' in err
                    ? String((err as { message?: string }).message)
                    : 'An error occurred'
            );
        } finally {
            setSaving(false);
        }
    };

    const handleClose = () => {
        setSuccess(false);
        setApiError(null);
        setForm({ old_password: '', new_password: '', new_password2: '' });
        setErrors({});
        onClose();
    };

    const PasswordInput = ({
        label, field, showKey,
    }: {
        label: string;
        field: keyof typeof form;
        showKey: keyof typeof show;
    }) => (
        <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
            <div className="relative">
                <input
                    type={show[showKey] ? 'text' : 'password'}
                    value={form[field]}
                    onChange={e => handleChange(field, e.target.value)}
                    className={`w-full rounded-lg border px-4 py-2 pr-10 focus:outline-none focus:ring-2 ${errors[field]
                        ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                        : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                        }`}
                />
                <button
                    type="button"
                    onClick={() => setShow(s => ({ ...s, [showKey]: !s[showKey] }))}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                    {show[showKey] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
            </div>
            {errors[field] && <p className="mt-1 text-sm text-red-600">{errors[field]}</p>}
        </div>
    );

    return (
        <Modal isOpen={isOpen} onClose={handleClose} title="Change Password" size="md">
            {success ? (
                <div className="text-center py-6">
                    <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
                    <p className="text-base font-semibold text-gray-900">Password changed successfully</p>
                    <p className="text-sm text-gray-500 mt-1">Your new password is now active.</p>
                    <Button variant="primary" onClick={handleClose} className="mt-4">
                        Close
                    </Button>
                </div>
            ) : (
                <div className="space-y-4">
                    {apiError && (
                        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                            <AlertTriangle className="h-4 w-4 shrink-0" />
                            {apiError}
                        </div>
                    )}
                    <PasswordInput label="Current Password" field="old_password" showKey="old" />
                    <PasswordInput label="New Password" field="new_password" showKey="new" />
                    <PasswordInput label="Confirm New Password" field="new_password2" showKey="confirm" />
                    <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                        <Button variant="secondary" onClick={handleClose} disabled={saving}>
                            Cancel
                        </Button>
                        <Button variant="primary" onClick={handleSubmit} disabled={saving}>
                            {saving ? 'Changing...' : 'Change Password'}
                        </Button>
                    </div>
                </div>
            )}
        </Modal>
    );
}

// ============================================================================
// Deletion Request Modal — shared for both ACCOUNT_DELETION and ORG_DELETION
// ============================================================================

interface DeletionModalProps {
    isOpen: boolean;
    onClose: () => void;
    type: 'ACCOUNT_DELETION' | 'ORG_DELETION';
    orgName?: string | null;
    onConfirm: (reason: string) => Promise<void>;
}

const DELETION_COPY = {
    ACCOUNT_DELETION: {
        title: 'Request Account Deletion',
        what: 'your account',
        consequences: [
            'All your personal data will be permanently erased from our systems.',
            'You will lose access to all sessions, assessments, and records you authored.',
            'This action cannot be undone once approved by your administrator.',
            'Your organization admin will review this request before any data is removed.',
        ],
        note: 'Your request will be sent to your organization administrator for review. You will not be immediately deleted — the admin must approve first.',
        buttonLabel: 'Submit Deletion Request',
    },
    ORG_DELETION: {
        title: 'Request Organization Deletion',
        what: 'your organization',
        consequences: [
            'All learner records, assessments, sessions, and reports will be permanently erased.',
            'All instructor and admin accounts within this organization will be removed.',
            'All CBC progress data, schemes of work, and curricula will be lost.',
            'Subscriptions and billing will be terminated immediately upon approval.',
            'This action is irreversible and cannot be undone once approved by a SuperAdmin.',
        ],
        note: 'This request will be escalated to a SuperAdmin for review. Your organization will continue to operate normally until the request is approved.',
        buttonLabel: 'Submit Organization Deletion Request',
    },
};

function DeletionRequestModal({ isOpen, onClose, type, orgName, onConfirm }: DeletionModalProps) {
    const [reason, setReason] = useState('');
    const [confirmed, setConfirmed] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [apiError, setApiError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const copy = DELETION_COPY[type];
    const canSubmit = reason.trim().length >= 20 && confirmed;

    const handleSubmit = async () => {
        if (!canSubmit) return;
        setSubmitting(true);
        setApiError(null);
        try {
            await onConfirm(reason.trim());
            setSuccess(true);
        } catch (err: unknown) {
            setApiError(
                err && typeof err === 'object' && 'message' in err
                    ? String((err as { message?: string }).message)
                    : 'An error occurred'
            );
        } finally {
            setSubmitting(false);
        }
    };

    const handleClose = () => {
        setReason('');
        setConfirmed(false);
        setApiError(null);
        setSuccess(false);
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={handleClose} title={copy.title} size="lg">
            {success ? (
                <div className="text-center py-6">
                    <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
                    <p className="text-base font-semibold text-gray-900">Request submitted</p>
                    <p className="text-sm text-gray-500 mt-1 max-w-xs mx-auto">
                        Your deletion request has been submitted and is pending review.
                        You can track its status in the Requests section.
                    </p>
                    <Button variant="secondary" onClick={handleClose} className="mt-4">
                        Close
                    </Button>
                </div>
            ) : (
                <div className="space-y-5">
                    {/* Warning block */}
                    <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                        <div className="flex items-start gap-3">
                            <AlertTriangle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                            <div>
                                <p className="text-sm font-semibold text-red-800 mb-2">
                                    Warning: Deletion of {type === 'ORG_DELETION' && orgName ? orgName : copy.what}
                                </p>
                                <ul className="space-y-1.5">
                                    {copy.consequences.map((c, i) => (
                                        <li key={i} className="flex items-start gap-2 text-sm text-red-700">
                                            <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-red-500 shrink-0" />
                                            {c}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </div>

                    {/* Process note */}
                    <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg">
                        <p className="text-sm text-blue-700">{copy.note}</p>
                    </div>

                    {/* Reason textarea */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Reason for deletion <span className="text-gray-400">(minimum 20 characters)</span>
                        </label>
                        <textarea
                            rows={3}
                            value={reason}
                            onChange={e => setReason(e.target.value)}
                            placeholder="Please describe why you want to delete..."
                            className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:border-blue-500 focus:ring-blue-500 resize-none"
                        />
                        <p className="text-xs text-gray-400 mt-1">{reason.trim().length} / 20 minimum characters</p>
                    </div>

                    {/* Confirmation checkbox */}
                    <label className="flex items-start gap-3 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={confirmed}
                            onChange={e => setConfirmed(e.target.checked)}
                            className="mt-0.5 h-4 w-4 rounded border-gray-300 text-red-600 focus:ring-red-500"
                        />
                        <span className="text-sm text-gray-700">
                            I understand that this request will initiate a deletion process and
                            that all data associated with {type === 'ORG_DELETION' && orgName ? orgName : copy.what} may
                            be permanently removed upon approval.
                        </span>
                    </label>

                    {apiError && (
                        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                            <AlertTriangle className="h-4 w-4 shrink-0" />
                            {apiError}
                        </div>
                    )}

                    <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                        <Button variant="secondary" onClick={handleClose} disabled={submitting}>
                            Cancel
                        </Button>
                        <Button
                            variant="danger"
                            onClick={handleSubmit}
                            disabled={!canSubmit || submitting}
                        >
                            {submitting ? 'Submitting...' : copy.buttonLabel}
                        </Button>
                    </div>
                </div>
            )}
        </Modal>
    );
}

// ============================================================================
// Recent Requests mini-list (shown on profile for context)
// ============================================================================

type RecentRequestsProps = {
    requests: unknown;
};

function RecentRequests({ requests }: RecentRequestsProps) {
    // Normalize once. UI consumes only valid arrays.
    const safeRequests: Request[] = Array.isArray(requests)
        ? requests
        : [];

    if (safeRequests.length === 0) {
        return (
            <p className="text-sm text-gray-400 text-center py-4">
                No requests submitted yet.
            </p>
        );
    }

    const recent = safeRequests.slice(0, 5);

    return (
        <ul className="divide-y divide-gray-100">
            {recent.map((r) => (
                <li
                    key={r.id}
                    className="py-3 flex items-start justify-between gap-3"
                >
                    <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                            {r.title}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">
                            {r.request_type_display} · {formatDate(r.created_at)}
                        </p>
                    </div>

                    <Badge variant={STATUS_COLORS[r.status]} size="sm">
                        {r.status_display}
                    </Badge>
                </li>
            ))}
        </ul>
    );
}

// ============================================================================
// Profile Field — read-only display row
// ============================================================================

function ProfileField({ icon: Icon, label, value }: {
    icon: React.ElementType;
    label: string;
    value: string;
}) {
    return (
        <div className="flex items-start gap-3 py-3">
            <div className="h-8 w-8 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                <Icon className="h-4 w-4 text-gray-500" />
            </div>
            <div>
                <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">{label}</p>
                <p className="text-sm text-gray-900 mt-0.5">{value || '—'}</p>
            </div>
        </div>
    );
}

// ============================================================================
// Main Profile Page
// ============================================================================

export default function ProfilePage() {
    const { profile, loading, error, updateProfile, changePassword } = useProfile();
    console.log('Profile data:', profile, 'Loading:', loading, 'Error:', error);
    const { requests, loading: requestsLoading, submitDeletionRequest, hasPendingDeletion } = useMyRequests();

    const [editOpen, setEditOpen] = useState(false);
    const [passwordOpen, setPasswordOpen] = useState(false);
    const [deletionModal, setDeletionModal] = useState<'ACCOUNT_DELETION' | 'ORG_DELETION' | null>(null);
    const [profileSuccess, setProfileSuccess] = useState(false);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-center">
                    <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent mx-auto" />
                    <p className="mt-3 text-sm text-gray-500">Loading profile...</p>
                </div>
            </div>
        );
    }

    if (error || !profile) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-center">
                    <AlertTriangle className="h-8 w-8 text-red-500 mx-auto mb-2" />
                    <p className="text-sm text-red-600">{error || 'Failed to load profile'}</p>
                </div>
            </div>
        );
    }

    const isInstructor = profile.role === 'INSTRUCTOR';
    const isAdmin = profile.role === 'ADMIN';
    const isSuperAdmin = profile.role === 'SUPERADMIN';

    const handleSaveProfile = async (data: { first_name: string; last_name: string; phone: string }) => {
        await updateProfile(data);
        setProfileSuccess(true);
        setTimeout(() => setProfileSuccess(false), 3000);
    };

    const accountDeletionPending = hasPendingDeletion('ACCOUNT_DELETION');
    const orgDeletionPending = hasPendingDeletion('ORG_DELETION');

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            {/* Page header */}
            <div>
                <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>
                <p className="text-sm text-gray-500 mt-1">
                    Manage your personal information and account settings
                </p>
            </div>

            {/* Profile success toast */}
            {profileSuccess && (
                <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
                    <CheckCircle className="h-4 w-4 shrink-0" />
                    Profile updated successfully.
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* ── Left column: identity card ── */}
                <div className="lg:col-span-1 space-y-4">
                    {/* Avatar + name card */}
                    <Card className="text-center p-6">
                        <div className="h-20 w-20 rounded-full bg-linear-to-br from-blue-500 to-indigo-600 flex items-center justify-center mx-auto mb-4">
                            <span className="text-2xl font-bold text-white">
                                {profile?.first_name?.[0] ?? ''}
                                {profile?.last_name?.[0] ?? ''}
                            </span>
                        </div>
                        <p className="text-lg font-semibold text-gray-900">{profile.full_name}</p>
                        <p className="text-sm text-gray-500 mt-0.5">{profile.email}</p>
                        <div className="mt-3 flex justify-center">
                            <Badge variant={ROLE_BADGE[profile.role]}>{profile.role_display}</Badge>
                        </div>
                        {profile.organization_name && (
                            <p className="text-xs text-gray-400 mt-3 flex items-center justify-center gap-1">
                                <Building2 className="h-3.5 w-3.5" />
                                {profile.organization_name}
                                {profile.organization_code && (
                                    <span className="font-mono">· {profile.organization_code}</span>
                                )}
                            </p>
                        )}
                        <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => setEditOpen(true)}
                            className="mt-4 w-full gap-2"
                        >
                            <Pencil className="h-3.5 w-3.5" />
                            Edit Profile
                        </Button>
                    </Card>

                    {/* Account meta */}
                    <Card className="p-0">
                        <div className="px-5 pt-4 pb-1 border-b border-gray-100">
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                                Account Info
                            </p>
                        </div>
                        <div className="px-5 divide-y divide-gray-50">
                            <ProfileField
                                icon={Calendar}
                                label="Member Since"
                                value={formatDate(profile.date_joined)}
                            />
                            <ProfileField
                                icon={Clock}
                                label="Last Login"
                                value={formatDateTime(profile.last_login)}
                            />
                            <ProfileField
                                icon={Shield}
                                label="Account Status"
                                value={profile.is_active ? 'Active' : 'Inactive'}
                            />
                        </div>
                    </Card>
                </div>

                {/* ── Right column: details + actions ── */}
                <div className="lg:col-span-2 space-y-4">
                    {/* Contact details */}
                    <Card className="p-0">
                        <div className="px-6 pt-5 pb-1 border-b border-gray-100 flex items-center justify-between">
                            <p className="text-sm font-semibold text-gray-800">Contact Details</p>
                            <button
                                onClick={() => setEditOpen(true)}
                                className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                            >
                                <Pencil className="h-3 w-3" /> Edit
                            </button>
                        </div>
                        <div className="px-6 divide-y divide-gray-50">
                            <ProfileField icon={Mail} label="Email Address" value={profile.email} />
                            <ProfileField icon={Phone} label="Phone Number" value={profile.phone || '—'} />
                            {profile.organization_name && (
                                <ProfileField
                                    icon={Building2}
                                    label="Organization"
                                    value={`${profile.organization_name}${profile.organization_code ? ` (${profile.organization_code})` : ''}`}
                                />
                            )}
                        </div>
                    </Card>

                    {/* Security */}
                    <Card className="p-0">
                        <div className="px-6 pt-5 pb-4 border-b border-gray-100">
                            <p className="text-sm font-semibold text-gray-800">Security</p>
                        </div>
                        <div className="px-6 py-4 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="h-8 w-8 rounded-lg bg-gray-100 flex items-center justify-center">
                                    <KeyRound className="h-4 w-4 text-gray-500" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-gray-900">Password</p>
                                    <p className="text-xs text-gray-400">Change your login password</p>
                                </div>
                            </div>
                            <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => setPasswordOpen(true)}
                            >
                                Change Password
                            </Button>
                        </div>
                    </Card>

                    {/* Recent requests (shown for INSTRUCTOR and ADMIN) */}
                    {!isSuperAdmin && (
                        <Card className="p-0">
                            <div className="px-6 pt-5 pb-4 border-b border-gray-100 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <FileText className="h-4 w-4 text-gray-500" />
                                    <p className="text-sm font-semibold text-gray-800">My Recent Requests</p>
                                </div>
                                <Link
                                    href="/requests"
                                    className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                                >
                                    View all <ChevronRight className="h-3 w-3" />
                                </Link>
                            </div>
                            <div className="px-6 py-2">
                                {requestsLoading ? (
                                    <p className="text-sm text-gray-400 py-4 text-center">Loading...</p>
                                ) : (
                                    <RecentRequests requests={requests} />
                                )}
                            </div>
                        </Card>
                    )}

                    {/* Danger zone — INSTRUCTOR: account deletion */}
                    {isInstructor && (
                        <Card className="p-0 border-red-200">
                            <div className="px-6 pt-5 pb-4 border-b border-red-100 bg-red-50 rounded-t-lg">
                                <p className="text-sm font-semibold text-red-800">Danger Zone</p>
                                <p className="text-xs text-red-600 mt-0.5">
                                    These actions are irreversible. Please read carefully.
                                </p>
                            </div>
                            <div className="px-6 py-4">
                                <div className="flex items-start justify-between gap-4">
                                    <div>
                                        <p className="text-sm font-medium text-gray-900">Delete My Account</p>
                                        <p className="text-xs text-gray-500 mt-0.5 max-w-sm">
                                            Request your account and all associated data to be permanently erased.
                                            Your administrator will review and process this request.
                                        </p>
                                        {accountDeletionPending && (
                                            <div className="flex items-center gap-1.5 mt-2">
                                                <Badge variant="warning" size="sm">Pending Review</Badge>
                                                <span className="text-xs text-gray-400">
                                                    A deletion request is already awaiting review.
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                    <Button
                                        variant="danger"
                                        size="sm"
                                        onClick={() => setDeletionModal('ACCOUNT_DELETION')}
                                        disabled={accountDeletionPending}
                                        className="shrink-0"
                                    >
                                        <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                                        {accountDeletionPending ? 'Request Pending' : 'Delete Account'}
                                    </Button>
                                </div>
                            </div>
                        </Card>
                    )}

                    {/* Danger zone — ADMIN: account deletion + org deletion */}
                    {isAdmin && (
                        <Card className="p-0 border-red-200">
                            <div className="px-6 pt-5 pb-4 border-b border-red-100 bg-red-50 rounded-t-lg">
                                <p className="text-sm font-semibold text-red-800">Danger Zone</p>
                                <p className="text-xs text-red-600 mt-0.5">
                                    These actions are irreversible. Please read carefully before proceeding.
                                </p>
                            </div>

                            {/* Account deletion */}
                            <div className="px-6 py-4 border-b border-gray-100">
                                <div className="flex items-start justify-between gap-4">
                                    <div>
                                        <p className="text-sm font-medium text-gray-900">Delete My Account</p>
                                        <p className="text-xs text-gray-500 mt-0.5 max-w-sm">
                                            Request that your personal admin account be permanently removed.
                                            A SuperAdmin will review this request.
                                        </p>
                                        {accountDeletionPending && (
                                            <div className="flex items-center gap-1.5 mt-2">
                                                <Badge variant="warning" size="sm">Pending Review</Badge>
                                                <span className="text-xs text-gray-400">
                                                    Awaiting review.
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                    <Button
                                        variant="danger"
                                        size="sm"
                                        onClick={() => setDeletionModal('ACCOUNT_DELETION')}
                                        disabled={accountDeletionPending}
                                        className="shrink-0"
                                    >
                                        <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                                        {accountDeletionPending ? 'Request Pending' : 'Delete Account'}
                                    </Button>
                                </div>
                            </div>

                            {/* Org deletion */}
                            <div className="px-6 py-4">
                                <div className="flex items-start justify-between gap-4">
                                    <div>
                                        <p className="text-sm font-medium text-gray-900">
                                            Delete Organization
                                            {profile.organization_name && (
                                                <span className="text-gray-400 font-normal">
                                                    {' '}· {profile.organization_name}
                                                </span>
                                            )}
                                        </p>
                                        <p className="text-xs text-gray-500 mt-0.5 max-w-sm">
                                            Request the complete deletion of your organization and all its data.
                                            This will be escalated to a SuperAdmin and cannot be undone once approved.
                                        </p>
                                        {orgDeletionPending && (
                                            <div className="flex items-center gap-1.5 mt-2">
                                                <Badge variant="warning" size="sm">Pending SuperAdmin Review</Badge>
                                            </div>
                                        )}
                                    </div>
                                    <Button
                                        variant="danger"
                                        size="sm"
                                        onClick={() => setDeletionModal('ORG_DELETION')}
                                        disabled={orgDeletionPending}
                                        className="shrink-0"
                                    >
                                        <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                                        {orgDeletionPending ? 'Request Pending' : 'Delete Organization'}
                                    </Button>
                                </div>
                            </div>
                        </Card>
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
                    onConfirm={async (reason) => {
                        await submitDeletionRequest(deletionModal, reason);
                    }}
                />
            )}
        </div>
    );
}