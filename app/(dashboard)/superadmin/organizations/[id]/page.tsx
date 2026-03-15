'use client';

// ============================================================================
// app/(dashboard)/superadmin/organizations/[id]/page.tsx
// Enhanced: SuperAdmin can oversee organization's academic hierarchy
// Tabs: Overview | Curricula | Years | Terms | Subjects | Cohorts | Users
// ============================================================================

import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
    Building2, ArrowLeft, Pencil, Power, PowerOff, Trash2,
    Users, ShieldCheck, GraduationCap, Mail, Phone, MapPin,
    Hash, Globe, Calendar, AlertTriangle, CheckCircle,
    BookOpen, CalendarDays, LayoutGrid,
} from 'lucide-react';
import { OrganizationProvider } from '@/app/context/OrganizationContext';
import {
    useOrganizationDetail,
    useOrganizationStats,
    useOrganizationUsers,
} from '@/app/core/hooks/useOrganizations';
import { organizationAPI } from '@/app/core/api/organizations';
import { Organization, OrgUser, PLAN_LABELS, PLAN_COLORS } from '@/app/core/types/organization';
import { Badge } from '@/app/components/ui/Badge';
import { Button } from '@/app/components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '@/app/components/ui/Card';
import { Input } from '@/app/components/ui/Input';
import Modal from '@/app/components/ui/Modal';
import { Select } from '@/app/components/ui/Select';

// Tab configuration
type TabId = 'overview' | 'curricula' | 'years' | 'terms' | 'subjects' | 'cohorts' | 'users';

const TABS: Array<{ id: TabId; label: string; icon: any }> = [
    { id: 'overview', label: 'Overview', icon: LayoutGrid },
    { id: 'curricula', label: 'Curricula', icon: BookOpen },
    { id: 'years', label: 'Academic Years', icon: Calendar },
    { id: 'terms', label: 'Terms', icon: CalendarDays },
    { id: 'subjects', label: 'Subjects', icon: BookOpen },
    { id: 'cohorts', label: 'Cohorts', icon: Users },
    { id: 'users', label: 'Users', icon: Users },
];

// ============================================================================
// Edit Modal
// ============================================================================

interface OrgFormData {
    name: string;
    email: string;
    phone: string;
    address: string;
    plan_type: string;
}

function EditModal({
    isOpen, onClose, onSubmit, org, submitting,
}: {
    isOpen: boolean; onClose: () => void;
    onSubmit: (data: OrgFormData) => Promise<void>;
    org: Organization; submitting: boolean;
}) {
    const [form, setForm] = useState<OrgFormData>({
        name: org.name,
        email: org.email,
        phone: org.phone,
        address: org.address,
        plan_type: org.plan_type,
    });
    const [errors, setErrors] = useState<Partial<OrgFormData>>({});

    const handleChange = (field: keyof OrgFormData, value: string) => {
        setForm(prev => ({ ...prev, [field]: value }));
        if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }));
    };

    const validate = () => {
        const e: Partial<OrgFormData> = {};
        if (!form.name.trim()) e.name = 'Name is required';
        if (form.email && !/\S+@\S+\.\S+/.test(form.email)) e.email = 'Invalid email';
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Edit Organization" size="lg">
            <div className="space-y-4">
                <Input label="Organization Name *" value={form.name}
                    onChange={e => handleChange('name', e.target.value)} error={errors.name} />
                <div className="grid grid-cols-2 gap-4">
                    <Input label="Email" type="email" value={form.email}
                        onChange={e => handleChange('email', e.target.value)} error={errors.email} />
                    <Input label="Phone" value={form.phone}
                        onChange={e => handleChange('phone', e.target.value)} />
                </div>
                <Input label="Address" value={form.address}
                    onChange={e => handleChange('address', e.target.value)} />
                <Select label="Plan Type" value={form.plan_type}
                    onChange={e => handleChange('plan_type', e.target.value)}
                    options={[
                        { value: 'FREE', label: 'Free' },
                        { value: 'BASIC', label: 'Basic' },
                        { value: 'PREMIUM', label: 'Premium' },
                        { value: 'ENTERPRISE', label: 'Enterprise' },
                    ]}
                />
                <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                    <Button variant="secondary" onClick={onClose} disabled={submitting}>Cancel</Button>
                    <Button variant="primary" onClick={() => validate() && onSubmit(form)}
                        disabled={submitting}
                        className="bg-purple-600 hover:bg-purple-700 focus:ring-purple-500">
                        {submitting ? 'Saving...' : 'Save Changes'}
                    </Button>
                </div>
            </div>
        </Modal>
    );
}

// ============================================================================
// Delete Modal
// ============================================================================

function DeleteModal({ isOpen, onClose, onConfirm, orgName, submitting }: {
    isOpen: boolean; onClose: () => void; onConfirm: () => Promise<void>;
    orgName: string; submitting: boolean;
}) {
    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Delete Organization" size="sm">
            <div className="space-y-4">
                <div className="flex items-start gap-3 p-4 bg-red-50 rounded-lg border border-red-100">
                    <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <div>
                        <p className="text-sm font-medium text-red-800">This cannot be undone</p>
                        <p className="text-sm text-red-700 mt-1">
                            Permanently delete <strong>{orgName}</strong> and all its data?
                        </p>
                    </div>
                </div>
                <div className="flex justify-end gap-3">
                    <Button variant="secondary" onClick={onClose} disabled={submitting}>Cancel</Button>
                    <Button variant="danger" onClick={onConfirm} disabled={submitting}>
                        {submitting ? 'Deleting...' : 'Delete'}
                    </Button>
                </div>
            </div>
        </Modal>
    );
}

// ============================================================================
// Stat Card
// ============================================================================

function StatCard({ label, value, icon: Icon, color }: {
    label: string; value: number | string; icon: any; color: string;
}) {
    return (
        <div className={`flex items-center gap-4 p-5 rounded-xl border ${color}`}>
            <div className="p-2.5 rounded-lg bg-white/60">
                <Icon className="h-5 w-5" />
            </div>
            <div>
                <p className="text-2xl font-bold">{value}</p>
                <p className="text-sm font-medium opacity-80">{label}</p>
            </div>
        </div>
    );
}

// ============================================================================
// Detail Info Row
// ============================================================================

function InfoRow({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
    return (
        <div className="flex items-start gap-3 py-3 border-b border-gray-100 last:border-0">
            <Icon className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
            <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">{label}</p>
                <p className="text-sm text-gray-900 mt-0.5">{value || '—'}</p>
            </div>
        </div>
    );
}

// ============================================================================
// Users Table
// ============================================================================

function UsersTable({ users, loading }: { users: OrgUser[]; loading: boolean }) {
    if (loading) {
        return (
            <div className="py-8 text-center">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-purple-600 border-t-transparent mx-auto" />
            </div>
        );
    }

    if (users.length === 0) {
        return (
            <div className="py-10 text-center">
                <Users className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-500">No users in this organization yet</p>
            </div>
        );
    }

    return (
        <div className="overflow-x-auto">
            <table className="w-full">
                <thead>
                    <tr className="border-b border-gray-200 bg-gray-50">
                        {['Name', 'Email', 'Role', 'Status', 'Joined'].map(h => (
                            <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                {h}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                    {users.map(user => (
                        <tr key={user.id} className="hover:bg-gray-50">
                            <td className="px-5 py-3">
                                <p className="text-sm font-medium text-gray-900">{user.full_name}</p>
                            </td>
                            <td className="px-5 py-3 text-sm text-gray-600">{user.email}</td>
                            <td className="px-5 py-3">
                                <div className="flex items-center gap-1.5">
                                    {user.role === 'ADMIN'
                                        ? <ShieldCheck className="h-3.5 w-3.5 text-blue-500" />
                                        : <GraduationCap className="h-3.5 w-3.5 text-green-500" />
                                    }
                                    <span className="text-xs font-medium text-gray-700">{user.role_display}</span>
                                </div>
                            </td>
                            <td className="px-5 py-3">
                                <Badge variant={user.is_active ? 'success' : 'danger'}>
                                    {user.is_active ? 'Active' : 'Inactive'}
                                </Badge>
                            </td>
                            <td className="px-5 py-3 text-sm text-gray-500">
                                {new Date(user.date_joined).toLocaleDateString('en-GB', {
                                    day: '2-digit', month: 'short', year: 'numeric',
                                })}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

// ============================================================================
// Dynamic Academic Page Imports
// ============================================================================

import dynamic from 'next/dynamic';

// Dynamically import the actual academic pages
const CurriculaPage = dynamic(() => import('@/app/(dashboard)/academic/curricula/page'), {
    loading: () => <div className="flex items-center justify-center py-16">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-purple-600 border-t-transparent" />
    </div>,
    ssr: false,
});

const YearsPage = dynamic(() => import('@/app/(dashboard)/academic/years/page'), {
    loading: () => <div className="flex items-center justify-center py-16">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-purple-600 border-t-transparent" />
    </div>,
    ssr: false,
});

const TermsPage = dynamic(() => import('@/app/(dashboard)/academic/terms/page'), {
    loading: () => <div className="flex items-center justify-center py-16">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-purple-600 border-t-transparent" />
    </div>,
    ssr: false,
});

const SubjectsPage = dynamic(() => import('@/app/(dashboard)/academic/subjects/page'), {
    loading: () => <div className="flex items-center justify-center py-16">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-purple-600 border-t-transparent" />
    </div>,
    ssr: false,
});

const CohortsPage = dynamic(() => import('@/app/(dashboard)/academic/cohorts/page'), {
    loading: () => <div className="flex items-center justify-center py-16">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-purple-600 border-t-transparent" />
    </div>,
    ssr: false,
});

// ============================================================================
// Main Page
// ============================================================================

export default function OrganizationDetailPage() {
    const params = useParams();
    const router = useRouter();
    const id = Number(params.id);

    const { organization, loading, error, refetch, setOrganization } = useOrganizationDetail(id);
    const { stats, loading: statsLoading } = useOrganizationStats(id);
    const { users, loading: usersLoading } = useOrganizationUsers(id);

    const [activeTab, setActiveTab] = useState<TabId>('overview');
    const [editOpen, setEditOpen] = useState(false);
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [actionError, setActionError] = useState<string | null>(null);
    const [actionSuccess, setActionSuccess] = useState<string | null>(null);

    const showSuccess = (msg: string) => {
        setActionSuccess(msg);
        setTimeout(() => setActionSuccess(null), 3000);
    };

    const handleEdit = async (data: OrgFormData) => {
        setSubmitting(true); setActionError(null);
        try {
            const updated = await organizationAPI.update(id, {
                name: data.name,
                email: data.email || undefined,
                phone: data.phone || undefined,
                address: data.address || undefined,
                plan_type: data.plan_type as any,
            });
            setOrganization(updated);
            setEditOpen(false);
            showSuccess('Organization updated successfully');
        } catch (err: any) {
            setActionError(err.response?.data?.name?.[0] || err.message || 'Update failed');
        } finally { setSubmitting(false); }
    };

    const handleToggleActive = async () => {
        if (!organization) return;
        setActionError(null);
        try {
            const updated = await organizationAPI.toggleActive(id, !organization.is_active);
            setOrganization(updated);
            showSuccess(`Organization ${updated.is_active ? 'activated' : 'suspended'}`);
        } catch (err: any) {
            setActionError(err.message || 'Status change failed');
        }
    };

    const handleDelete = async () => {
        setSubmitting(true); setActionError(null);
        try {
            await organizationAPI.delete(id);
            router.push('/superadmin/organizations');
        } catch (err: any) {
            setActionError(err.response?.data?.message || err.message || 'Delete failed');
            setSubmitting(false);
        }
    };

    // Loading / Error
    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-center">
                    <div className="h-10 w-10 animate-spin rounded-full border-4 border-purple-600 border-t-transparent mx-auto" />
                    <p className="mt-3 text-sm text-gray-500">Loading organization...</p>
                </div>
            </div>
        );
    }

    if (error || !organization) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-center">
                    <AlertTriangle className="h-8 w-8 text-red-500 mx-auto mb-2" />
                    <p className="text-sm text-red-600">{error || 'Organization not found'}</p>
                    <Button variant="secondary" onClick={() => router.back()} className="mt-3">
                        Go Back
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => router.push('/superadmin/organizations')}
                        className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
                    >
                        <ArrowLeft className="h-4 w-4" />
                    </button>
                    <div className="flex items-center gap-3">
                        <div className="h-12 w-12 rounded-xl bg-purple-100 flex items-center justify-center">
                            {organization.logo ? (
                                <img src={organization.logo} alt={organization.name}
                                    className="h-12 w-12 rounded-xl object-cover" />
                            ) : (
                                <Building2 className="h-6 w-6 text-purple-600" />
                            )}
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-2xl font-bold text-gray-900">{organization.name}</h1>
                                <Badge variant={organization.is_active ? 'success' : 'danger'}>
                                    {organization.is_active ? 'Active' : 'Suspended'}
                                </Badge>
                            </div>
                            <p className="text-sm text-gray-500 mt-0.5 font-mono">
                                Code: {organization.code} · Slug: {organization.slug}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 flex-shrink-0">
                    <Button variant="secondary" size="sm"
                        onClick={() => { setActionError(null); setEditOpen(true); }}
                        className="gap-1.5">
                        <Pencil className="h-3.5 w-3.5" /> Edit
                    </Button>
                    <Button variant="secondary" size="sm" onClick={handleToggleActive}
                        className={`gap-1.5 ${organization.is_active
                            ? 'text-yellow-700 hover:bg-yellow-50'
                            : 'text-green-700 hover:bg-green-50'
                            }`}>
                        {organization.is_active
                            ? <><PowerOff className="h-3.5 w-3.5" /> Suspend</>
                            : <><Power className="h-3.5 w-3.5" /> Activate</>
                        }
                    </Button>
                    <Button variant="danger" size="sm"
                        onClick={() => { setActionError(null); setDeleteOpen(true); }}
                        className="gap-1.5">
                        <Trash2 className="h-3.5 w-3.5" /> Delete
                    </Button>
                </div>
            </div>

            {/* Feedback */}
            {actionError && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                    <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                    {actionError}
                    <button onClick={() => setActionError(null)} className="ml-auto text-red-400 hover:text-red-600">✕</button>
                </div>
            )}
            {actionSuccess && (
                <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
                    <CheckCircle className="h-4 w-4 flex-shrink-0" />
                    {actionSuccess}
                </div>
            )}

            {/* Stats */}
            {!statsLoading && stats && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <StatCard label="Total Users" value={stats.total_users} icon={Users}
                        color="bg-blue-50 border-blue-200 text-blue-800" />
                    <StatCard label="Active Users" value={stats.active_users} icon={CheckCircle}
                        color="bg-green-50 border-green-200 text-green-800" />
                    <StatCard label="Admins" value={stats.by_role.admins} icon={ShieldCheck}
                        color="bg-purple-50 border-purple-200 text-purple-800" />
                    <StatCard label="Instructors" value={stats.by_role.instructors} icon={GraduationCap}
                        color="bg-orange-50 border-orange-200 text-orange-800" />
                </div>
            )}

            {/* Tab Navigation - NEW */}
            <div className="border-b border-gray-200">
                <nav className="flex gap-1 overflow-x-auto">
                    {TABS.map(tab => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors border-b-2 ${isActive
                                    ? 'border-purple-600 text-purple-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                    }`}
                            >
                                <Icon className="h-4 w-4" />
                                {tab.label}
                            </button>
                        );
                    })}
                </nav>
            </div>

            {/* Tab Content */}
            <div>
                {/* Overview Tab */}
                {activeTab === 'overview' && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <Card className="lg:col-span-2">
                            <CardHeader><CardTitle>Organization Details</CardTitle></CardHeader>
                            <CardContent>
                                <InfoRow icon={Hash} label="Code" value={organization.code} />
                                <InfoRow icon={Globe} label="Slug" value={organization.slug} />
                                <InfoRow icon={Mail} label="Email" value={organization.email} />
                                <InfoRow icon={Phone} label="Phone" value={organization.phone} />
                                <InfoRow icon={MapPin} label="Address" value={organization.address} />
                                <InfoRow icon={Calendar} label="Created"
                                    value={new Date(organization.created_at).toLocaleDateString('en-GB', {
                                        day: '2-digit', month: 'long', year: 'numeric',
                                    })}
                                />
                                <InfoRow icon={Calendar} label="Last Updated"
                                    value={new Date(organization.updated_at).toLocaleDateString('en-GB', {
                                        day: '2-digit', month: 'long', year: 'numeric',
                                    })}
                                />
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader><CardTitle>Subscription Plan</CardTitle></CardHeader>
                            <CardContent>
                                <div className="flex flex-col items-center justify-center py-6 gap-3">
                                    <Badge variant={PLAN_COLORS[organization.plan_type]} size="lg">
                                        {PLAN_LABELS[organization.plan_type]}
                                    </Badge>
                                    <p className="text-xs text-gray-500 text-center">
                                        Current plan tier for this organization
                                    </p>
                                    <Button variant="secondary" size="sm"
                                        onClick={() => setEditOpen(true)}
                                        className="mt-2 w-full">
                                        Change Plan
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}

                {/* Curricula Tab */}
                {activeTab === 'curricula' && (
                    <OrganizationProvider organizationId={id}>
                        <CurriculaPage />
                    </OrganizationProvider>
                )}


                {/* Academic Years Tab */}
                {activeTab === 'years' && (
                    <OrganizationProvider organizationId={id}>
                        <YearsPage />
                    </OrganizationProvider>
                )}

                {/* Terms Tab */}
                {activeTab === 'terms' && (
                    <OrganizationProvider organizationId={id}>
                        <TermsPage />
                    </OrganizationProvider>
                )}

                {/* Subjects Tab */}
                {activeTab === 'subjects' && (
                    <OrganizationProvider organizationId={id}>
                        <SubjectsPage />
                    </OrganizationProvider>
                )}

                {/* Cohorts Tab */}
                {activeTab === 'cohorts' && (
                    <OrganizationProvider organizationId={id}>
                        <CohortsPage />
                    </OrganizationProvider>
                )}

                {/* Users Tab */}
                {activeTab === 'users' && (
                    <Card className="p-0 overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-200">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-900">Users</h3>
                                    <p className="text-sm text-gray-500 mt-0.5">
                                        All users belonging to this organization
                                    </p>
                                </div>
                                <Badge variant="info">{users.length} user{users.length !== 1 ? 's' : ''}</Badge>
                            </div>
                        </div>
                        <UsersTable users={users} loading={usersLoading} />
                    </Card>
                )}
            </div>

            {/* Modals */}
            <EditModal isOpen={editOpen} onClose={() => setEditOpen(false)}
                onSubmit={handleEdit} org={organization} submitting={submitting} />

            <DeleteModal isOpen={deleteOpen} onClose={() => setDeleteOpen(false)}
                onConfirm={handleDelete} orgName={organization.name} submitting={submitting} />
        </div>
    );
}