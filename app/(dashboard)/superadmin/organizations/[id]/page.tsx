'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import {
    Building2, ArrowLeft, Pencil, Power, PowerOff,
    Trash2, AlertTriangle, CheckCircle, BookOpen,
    Calendar, CalendarDays, LayoutGrid, Users,
} from 'lucide-react';

import { OrganizationProvider } from '@/app/context/OrganizationContext';
import { useOrganizationDetailPage } from '@/app/core/hooks/useOrganizationDetailPage';
import { Badge } from '@/app/components/ui/Badge';
import { Button } from '@/app/components/ui/Button';
import { LoadingSpinner } from '@/app/components/ui/LoadingSpinner';
import { ErrorState } from '@/app/components/ui/ErrorState';
import {
    OrgStats, OrgOverviewTab, OrgUsersTab,
    EditModal, DeleteModal, AddToOrgModal, SuspendModal,
} from '@/app/core/components/superadmin/OrgDetailComponents';
import type { TabId } from '@/app/core/components/superadmin/OrgDetailComponents';
import { useGlobalUsers } from '@/app/core/hooks/useGlobalUsers';
import { ORG_STATUS_COLORS, ORG_STATUS_LABELS } from '@/app/core/types/organization';
import type { SuspensionReason } from '@/app/core/types/organization';

// ── Dynamic academic tab pages ────────────────────────────────────────────────

const loader = () => (
    <div className="flex items-center justify-center py-16">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-purple-600 border-t-transparent" />
    </div>
);

const CurriculaPage = dynamic(() => import('@/app/(dashboard)/academic/curricula/page'), { loading: loader, ssr: false });
const YearsPage = dynamic(() => import('@/app/(dashboard)/academic/years/page'), { loading: loader, ssr: false });
const TermsPage = dynamic(() => import('@/app/(dashboard)/academic/terms/page'), { loading: loader, ssr: false });
const SubjectsPage = dynamic(() => import('@/app/(dashboard)/academic/subjects/page'), { loading: loader, ssr: false });
const CohortsPage = dynamic(() => import('@/app/(dashboard)/academic/cohorts/page'), { loading: loader, ssr: false });

// ── Tab config ────────────────────────────────────────────────────────────────

const TABS: Array<{ id: TabId; label: string; icon: React.ElementType }> = [
    { id: 'overview', label: 'Overview', icon: LayoutGrid },
    { id: 'curricula', label: 'Curricula', icon: BookOpen },
    { id: 'years', label: 'Academic Years', icon: Calendar },
    { id: 'terms', label: 'Terms', icon: CalendarDays },
    { id: 'subjects', label: 'Subjects', icon: BookOpen },
    { id: 'cohorts', label: 'Cohorts', icon: Users },
    { id: 'users', label: 'Users', icon: Users },
];

// ── Page ──────────────────────────────────────────────────────────────────────

export default function OrganizationDetailPage() {
    const params = useParams();
    const router = useRouter();
    const id = Number(params.id);

    const {
        organization, loading, error,
        stats, statsLoading,
        users, usersLoading,
        submitting, actionError, actionSuccess,
        setActionError,
        handleEdit, handleSuspend, handleUnsuspend, handleDelete,
        addExistingUser,
    } = useOrganizationDetailPage(id);

    const [activeTab, setActiveTab] = useState<TabId>('overview');
    const [editOpen, setEditOpen] = useState(false);
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [suspendOpen, setSuspendOpen] = useState(false);
    const [addUserOpen, setAddUserOpen] = useState(false);
    const [addUserSubmitting, setAddUserSubmitting] = useState(false);

    const { users: allUsers } = useGlobalUsers();

    const handleAddExistingUser = async (userId: number, organizationId: number, role: string) => {
        setAddUserSubmitting(true);
        try {
            await addExistingUser(userId, organizationId, role);
        } finally {
            setAddUserSubmitting(false);
        }
    };

    const onSuspendConfirm = async (reason: SuspensionReason) => {
        await handleSuspend(reason);
        setSuspendOpen(false);
    };

    if (loading) return <LoadingSpinner />;
    if (error || !organization) return <ErrorState message={error ?? 'Organization not found'} />;

    const isSuspended = organization.status === 'SUSPENDED';

    return (
        <div className="space-y-6">

            {/* Header */}
            <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => router.push('/superadmin/organizations')}
                        className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors">
                        <ArrowLeft className="h-4 w-4" />
                    </button>
                    <div className="flex items-center gap-3">
                        <div className="h-12 w-12 rounded-xl bg-purple-100 flex items-center justify-center">
                            {organization.logo
                                ? <img src={organization.logo} alt={organization.name} className="h-12 w-12 rounded-xl object-cover" />
                                : <Building2 className="h-6 w-6 text-purple-600" />
                            }
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-2xl font-bold text-gray-900">{organization.name}</h1>
                                <Badge variant={ORG_STATUS_COLORS[organization.status]}>
                                    {ORG_STATUS_LABELS[organization.status]}
                                </Badge>
                            </div>
                            <p className="text-sm text-gray-500 mt-0.5 font-mono">
                                Code: {organization.code} · Slug: {organization.slug}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                    <Button variant="secondary" size="sm" className="gap-1.5"
                        onClick={() => { setActionError(null); setEditOpen(true); }}>
                        <Pencil className="h-3.5 w-3.5" /> Edit
                    </Button>
                    {isSuspended ? (
                        <Button variant="secondary" size="sm"
                            onClick={() => { setActionError(null); handleUnsuspend(); }}
                            className="gap-1.5 text-green-700 hover:bg-green-50">
                            <Power className="h-3.5 w-3.5" /> Unsuspend
                        </Button>
                    ) : (
                        <Button variant="secondary" size="sm"
                            onClick={() => { setActionError(null); setSuspendOpen(true); }}
                            className="gap-1.5 text-yellow-700 hover:bg-yellow-50">
                            <PowerOff className="h-3.5 w-3.5" /> Suspend
                        </Button>
                    )}
                    <Button variant="danger" size="sm" className="gap-1.5"
                        onClick={() => { setActionError(null); setDeleteOpen(true); }}>
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
            {!statsLoading && stats && <OrgStats stats={stats} />}

            {/* Tabs */}
            <div className="border-b border-gray-200">
                <nav className="flex gap-1 overflow-x-auto">
                    {TABS.map(({ id: tabId, label, icon: Icon }) => (
                        <button key={tabId} onClick={() => setActiveTab(tabId)}
                            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors border-b-2 ${activeTab === tabId
                                ? 'border-purple-600 text-purple-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}>
                            <Icon className="h-4 w-4" />
                            {label}
                        </button>
                    ))}
                </nav>
            </div>

            {/* Tab content */}
            <div>
                {activeTab === 'overview' && <OrgOverviewTab organization={organization} onChangePlan={() => setEditOpen(true)} />}
                {activeTab === 'curricula' && <OrganizationProvider organizationId={id}><CurriculaPage /></OrganizationProvider>}
                {activeTab === 'years' && <OrganizationProvider organizationId={id}><YearsPage /></OrganizationProvider>}
                {activeTab === 'terms' && <OrganizationProvider organizationId={id}><TermsPage /></OrganizationProvider>}
                {activeTab === 'subjects' && <OrganizationProvider organizationId={id}><SubjectsPage /></OrganizationProvider>}
                {activeTab === 'cohorts' && <OrganizationProvider organizationId={id}><CohortsPage /></OrganizationProvider>}
                {activeTab === 'users' && <OrgUsersTab users={users} loading={usersLoading} onAddExisting={() => setAddUserOpen(true)} />}
            </div>

            {/* Modals */}
            <EditModal
                isOpen={editOpen}
                onClose={() => setEditOpen(false)}
                onSubmit={handleEdit}
                org={organization}
                submitting={submitting}
            />
            <SuspendModal
                isOpen={suspendOpen}
                onClose={() => setSuspendOpen(false)}
                onConfirm={onSuspendConfirm}
                organization={organization}
                submitting={submitting}
            />
            <DeleteModal
                isOpen={deleteOpen}
                onClose={() => setDeleteOpen(false)}
                onConfirm={handleDelete}
                orgName={organization.name}
                submitting={submitting}
            />
            <AddToOrgModal
                isOpen={addUserOpen}
                onClose={() => setAddUserOpen(false)}
                onSubmit={handleAddExistingUser}
                allUsers={allUsers}
                lockedOrgId={id}
                lockedOrgName={organization.name}
                submitting={addUserSubmitting}
            />
        </div>
    );
}