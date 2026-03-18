'use client';

// ============================================================================
// app/core/components/profile/ProfileComponents.tsx
//
// All profile page sub-components — extracted from profile/page.tsx.
// Typed props, no any, no inline definitions in the page.
// ============================================================================

import { useState } from 'react';
import Link from 'next/link';
import {
    Mail, Phone, Building2, Shield, Calendar, Clock,
    AlertTriangle, CheckCircle, Eye, EyeOff, ChevronRight,
    FileText, Pencil, Trash2,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Badge } from '@/app/components/ui/Badge';
import { Button } from '@/app/components/ui/Button';
import { Card } from '@/app/components/ui/Card';
import { Input } from '@/app/components/ui/Input';
import Modal from '@/app/components/ui/Modal';
import { STATUS_COLORS, Request } from '@/app/plugins/requests/types/requests';
import type { ProfileData } from '@/app/core/hooks/useProfile';

// ── Helpers ───────────────────────────────────────────────────────────────

export function formatDate(iso: string | null): string {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('en-GB', {
        day: '2-digit', month: 'short', year: 'numeric',
    });
}

export function formatDateTime(iso: string | null): string {
    if (!iso) return 'Never';
    return new Date(iso).toLocaleString('en-GB', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
    });
}

export const ROLE_BADGE: Record<string, 'purple' | 'info' | 'default'> = {
    SUPERADMIN: 'purple',
    ADMIN: 'info',
    INSTRUCTOR: 'default',
};

// ── ProfileField ──────────────────────────────────────────────────────────

interface ProfileFieldProps {
    icon: LucideIcon;
    label: string;
    value: string;
}

export function ProfileField({ icon: Icon, label, value }: ProfileFieldProps) {
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

// ── IdentityCard ──────────────────────────────────────────────────────────

interface IdentityCardProps {
    profile: ProfileData;
    onEditClick: () => void;
}

export function IdentityCard({ profile, onEditClick }: IdentityCardProps) {
    return (
        <Card className="text-center p-6">
            <div className="h-20 w-20 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center mx-auto mb-4 shadow-lg">
                <span className="text-2xl font-bold text-white">
                    {profile.first_name?.[0] ?? ''}{profile.last_name?.[0] ?? ''}
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
                onClick={onEditClick}
                className="mt-4 w-full gap-2"
            >
                <Pencil className="h-3.5 w-3.5" />
                Edit Profile
            </Button>
        </Card>
    );
}

// ── AccountMetaCard ───────────────────────────────────────────────────────

interface AccountMetaCardProps {
    dateJoined: string | null;
    lastLogin: string | null;
    isActive: boolean;
}

export function AccountMetaCard({ dateJoined, lastLogin, isActive }: AccountMetaCardProps) {
    return (
        <Card className="p-0">
            <div className="px-5 pt-4 pb-1 border-b border-gray-100">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Account Info</p>
            </div>
            <div className="px-5 divide-y divide-gray-50">
                <ProfileField icon={Calendar} label="Member Since" value={formatDate(dateJoined)} />
                <ProfileField icon={Clock} label="Last Login" value={formatDateTime(lastLogin)} />
                <ProfileField icon={Shield} label="Account Status" value={isActive ? 'Active' : 'Inactive'} />
            </div>
        </Card>
    );
}

// ── ContactDetailsCard ────────────────────────────────────────────────────

interface ContactDetailsCardProps {
    profile: ProfileData;
    onEditClick: () => void;
}

export function ContactDetailsCard({ profile, onEditClick }: ContactDetailsCardProps) {
    return (
        <Card className="p-0">
            <div className="px-6 pt-5 pb-1 border-b border-gray-100 flex items-center justify-between">
                <p className="text-sm font-semibold text-gray-800">Contact Details</p>
                <button
                    onClick={onEditClick}
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
    );
}

// ── SecurityCard ──────────────────────────────────────────────────────────

interface SecurityCardProps {
    onChangePassword: () => void;
}

export function SecurityCard({ onChangePassword }: SecurityCardProps) {
    return (
        <Card className="p-0">
            <div className="px-6 pt-5 pb-4 border-b border-gray-100">
                <p className="text-sm font-semibold text-gray-800">Security</p>
            </div>
            <div className="px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-gray-100 flex items-center justify-center">
                        <Shield className="h-4 w-4 text-gray-500" />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-gray-900">Password</p>
                        <p className="text-xs text-gray-400">Change your login password</p>
                    </div>
                </div>
                <Button variant="secondary" size="sm" onClick={onChangePassword}>
                    Change Password
                </Button>
            </div>
        </Card>
    );
}

// ── RecentRequests ────────────────────────────────────────────────────────

interface RecentRequestsCardProps {
    requests: unknown;
    loading: boolean;
}

export function RecentRequestsCard({ requests, loading }: RecentRequestsCardProps) {
    const safeRequests: Request[] = Array.isArray(requests) ? requests : [];

    return (
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
                {loading ? (
                    <p className="text-sm text-gray-400 py-4 text-center">Loading...</p>
                ) : safeRequests.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-4">No requests submitted yet.</p>
                ) : (
                    <ul className="divide-y divide-gray-100">
                        {safeRequests.slice(0, 5).map(r => (
                            <li key={r.id} className="py-3 flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <p className="text-sm font-medium text-gray-900 truncate">{r.title}</p>
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
                )}
            </div>
        </Card>
    );
}

// ── DangerZoneCard ────────────────────────────────────────────────────────

interface DangerAction {
    label: string;
    description: string;
    pending: boolean;
    pendingLabel: string;
    onDelete: () => void;
}

interface DangerZoneCardProps {
    actions: DangerAction[];
}

export function DangerZoneCard({ actions }: DangerZoneCardProps) {
    return (
        <Card className="p-0 border-red-200">
            <div className="px-6 pt-5 pb-4 border-b border-red-100 bg-red-50 rounded-t-lg">
                <p className="text-sm font-semibold text-red-800">Danger Zone</p>
                <p className="text-xs text-red-600 mt-0.5">
                    These actions are irreversible. Please read carefully before proceeding.
                </p>
            </div>
            <div className="divide-y divide-gray-100">
                {actions.map((action, i) => (
                    <div key={i} className="px-6 py-4">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <p className="text-sm font-medium text-gray-900">{action.label}</p>
                                <p className="text-xs text-gray-500 mt-0.5 max-w-sm">{action.description}</p>
                                {action.pending && (
                                    <div className="flex items-center gap-1.5 mt-2">
                                        <Badge variant="warning" size="sm">Pending Review</Badge>
                                        <span className="text-xs text-gray-400">Awaiting review.</span>
                                    </div>
                                )}
                            </div>
                            <Button
                                variant="danger"
                                size="sm"
                                onClick={action.onDelete}
                                disabled={action.pending}
                                className="shrink-0"
                            >
                                <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                                {action.pending ? action.pendingLabel : action.label}
                            </Button>
                        </div>
                    </div>
                ))}
            </div>
        </Card>
    );
}

// ── InlineAlert ───────────────────────────────────────────────────────────

interface InlineAlertProps {
    type: 'error' | 'success';
    message: string;
}

export function InlineAlert({ type, message }: InlineAlertProps) {
    const styles = {
        error: 'bg-red-50 border-red-200 text-red-700',
        success: 'bg-green-50 border-green-200 text-green-700',
    };
    const Icon = type === 'error' ? AlertTriangle : CheckCircle;

    return (
        <div className={`flex items-center gap-2 p-3 border rounded-lg text-sm ${styles[type]}`}>
            <Icon className="h-4 w-4 shrink-0" />
            {message}
        </div>
    );
}

// ── EditProfileModal ──────────────────────────────────────────────────────

interface EditProfileModalProps {
    isOpen: boolean;
    onClose: () => void;
    initialValues: { first_name: string; last_name: string; phone: string };
    onSave: (data: { first_name: string; last_name: string; phone: string }) => Promise<void>;
}

export function EditProfileModal({ isOpen, onClose, initialValues, onSave }: EditProfileModalProps) {
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
                err instanceof Error ? err.message : 'An error occurred'
            );
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Edit Profile" size="md">
            <div className="space-y-4">
                {apiError && <InlineAlert type="error" message={apiError} />}
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
                    <Button variant="secondary" onClick={onClose} disabled={saving}>Cancel</Button>
                    <Button variant="primary" onClick={handleSubmit} disabled={saving}>
                        {saving ? 'Saving...' : 'Save Changes'}
                    </Button>
                </div>
            </div>
        </Modal>
    );
}

// ── ChangePasswordModal ───────────────────────────────────────────────────

interface ChangePasswordModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: { old_password: string; new_password: string; new_password2: string }) => Promise<void>;
}

type PasswordForm = { old_password: string; new_password: string; new_password2: string };
type ShowState = { old: boolean; new: boolean; confirm: boolean };

export function ChangePasswordModal({ isOpen, onClose, onSave }: ChangePasswordModalProps) {
    const [form, setForm] = useState<PasswordForm>({ old_password: '', new_password: '', new_password2: '' });
    const [show, setShow] = useState<ShowState>({ old: false, new: false, confirm: false });
    const [errors, setErrors] = useState<Partial<PasswordForm>>({});
    const [saving, setSaving] = useState(false);
    const [apiError, setApiError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const handleChange = (field: keyof PasswordForm, value: string) => {
        setForm(prev => ({ ...prev, [field]: value }));
        if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }));
    };

    const validate = () => {
        const e: Partial<PasswordForm> = {};
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
            setApiError(err instanceof Error ? err.message : 'An error occurred');
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

    const PasswordInput = ({ label, field, showKey }: {
        label: string;
        field: keyof PasswordForm;
        showKey: keyof ShowState;
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
                    <Button variant="primary" onClick={handleClose} className="mt-4">Close</Button>
                </div>
            ) : (
                <div className="space-y-4">
                    {apiError && <InlineAlert type="error" message={apiError} />}
                    <PasswordInput label="Current Password" field="old_password" showKey="old" />
                    <PasswordInput label="New Password" field="new_password" showKey="new" />
                    <PasswordInput label="Confirm New Password" field="new_password2" showKey="confirm" />
                    <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                        <Button variant="secondary" onClick={handleClose} disabled={saving}>Cancel</Button>
                        <Button variant="primary" onClick={handleSubmit} disabled={saving}>
                            {saving ? 'Changing...' : 'Change Password'}
                        </Button>
                    </div>
                </div>
            )}
        </Modal>
    );
}

// ── DeletionRequestModal ──────────────────────────────────────────────────

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

interface DeletionModalProps {
    isOpen: boolean;
    onClose: () => void;
    type: 'ACCOUNT_DELETION' | 'ORG_DELETION';
    orgName?: string | null;
    onConfirm: (reason: string) => Promise<void>;
}

export function DeletionRequestModal({ isOpen, onClose, type, orgName, onConfirm }: DeletionModalProps) {
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
            setApiError(err instanceof Error ? err.message : 'An error occurred');
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
                        Your deletion request is pending review. Track it in the Requests section.
                    </p>
                    <Button variant="secondary" onClick={handleClose} className="mt-4">Close</Button>
                </div>
            ) : (
                <div className="space-y-5">
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

                    <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg">
                        <p className="text-sm text-blue-700">{copy.note}</p>
                    </div>

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

                    <label className="flex items-start gap-3 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={confirmed}
                            onChange={e => setConfirmed(e.target.checked)}
                            className="mt-0.5 h-4 w-4 rounded border-gray-300 text-red-600 focus:ring-red-500"
                        />
                        <span className="text-sm text-gray-700">
                            I understand that this request will initiate a deletion process and that all data
                            associated with {type === 'ORG_DELETION' && orgName ? orgName : copy.what} may be
                            permanently removed upon approval.
                        </span>
                    </label>

                    {apiError && <InlineAlert type="error" message={apiError} />}

                    <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                        <Button variant="secondary" onClick={handleClose} disabled={submitting}>Cancel</Button>
                        <Button variant="danger" onClick={handleSubmit} disabled={!canSubmit || submitting}>
                            {submitting ? 'Submitting...' : copy.buttonLabel}
                        </Button>
                    </div>
                </div>
            )}
        </Modal>
    );
}