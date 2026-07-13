'use client';

// ============================================================================
// app/(dashboard)/admin/instructors/page.tsx
//
// Display-only staff list. Teaching actions live on the progress page.
// Clicking any row navigates to /admin/instructors/[id]/progress.
// ============================================================================

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
    Users, Plus, GraduationCap,
    UserCheck, UserX, BookOpen, LayoutGrid, List, Mail, Phone,
} from 'lucide-react';
import { useInstructors } from '@/app/core/hooks/useInstructors';
import {
    GlobalUser,
    globalStatusLabel,
    globalStatusVariant,
    isEffectivelyActiveInCurrentOrg,
    membershipStatusLabel,
    membershipStatusVariant,
    resolveGlobalStatus,
} from '@/app/core/types/globalUsers';
import { Badge } from '@/app/components/ui/Badge';
import { Button } from '@/app/components/ui/Button';
import { Card } from '@/app/components/ui/Card';
import { LoadingSpinner } from '@/app/components/ui/LoadingSpinner';
import { DataTable, Column } from '@/app/components/ui/Table';
import Modal from '@/app/components/ui/Modal';
import { Input } from '@/app/components/ui/Input';
import { UserCreatePayload } from '@/app/core/types/globalUsers';
import { AppError, getAppError, resolveAppError } from '@/app/core/errors';
import { InlineActionError, RecoverableErrorCard } from '@/app/components/ui/errors';
import { ActionStateBanner } from '@/app/components/ui/actions';
import { useAuth } from '@/app/context/AuthContext';
import { canRenderInstitutionReportOverview } from '@/app/core/components/reports/reportAccessPolicy';
import { buildInstructorReportHref } from '@/app/core/components/reports/reportNavigation';

type ViewMode = 'table' | 'grid';

// ── Stats bar ─────────────────────────────────────────────────────────────

function StatsBar({ instructors }: { instructors: GlobalUser[] }) {
    const active = instructors.filter((instructor) => isEffectivelyActiveInCurrentOrg(instructor)).length;
    const restricted = instructors.filter(
        (instructor) => resolveGlobalStatus(instructor) === 'ACTIVE' && instructor.membership_status === 'SUSPENDED'
    ).length;
    const platformRestricted = instructors.filter(
        (instructor) => resolveGlobalStatus(instructor) === 'GLOBAL_DEACTIVATED'
    ).length;

    return (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
                { label: 'Total staff', value: instructors.length, color: 'text-blue-600', bg: 'bg-blue-50', icon: Users },
                { label: 'Active', value: active, color: 'text-green-600', bg: 'bg-green-50', icon: UserCheck },
                { label: 'Access Restricted', value: restricted, color: 'text-yellow-600', bg: 'bg-yellow-50', icon: UserX },
                { label: 'Platform Restricted', value: platformRestricted, color: 'text-red-600', bg: 'bg-red-50', icon: BookOpen },
            ].map(s => (
                <Card key={s.label} className="py-4 px-5">
                    <div className="flex items-center gap-3">
                        <div className={`p-2 ${s.bg} rounded-lg`}>
                            <s.icon className={`h-4 w-4 ${s.color}`} />
                        </div>
                        <div>
                            <p className="text-xs font-medium text-gray-500">{s.label}</p>
                            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                        </div>
                    </div>
                </Card>
            ))}
        </div>
    );
}

// ── Create modal (stays here — creating a teacher identity is a list-level action) 

interface CreateForm {
    first_name: string; last_name: string; email: string;
    phone: string; password: string; password2: string;
}
const EMPTY_CREATE: CreateForm = {
    first_name: '', last_name: '', email: '', phone: '', password: '', password2: '',
};

function CreateInstructorModal({
    isOpen, onClose, onSubmit, submitting,
}: {
    isOpen: boolean; onClose: () => void;
    onSubmit: (data: UserCreatePayload) => Promise<void>;
    submitting: boolean;
}) {
    const [form, setForm] = useState<CreateForm>(EMPTY_CREATE);
    const [errors, setErrors] = useState<Partial<CreateForm>>({});
    const [apiError, setApiError] = useState<AppError | null>(null);
    const [createSuccess, setCreateSuccess] = useState<string | null>(null);
    const [showPw, setShowPw] = useState(false);

    const set = (f: keyof CreateForm, v: string) => {
        setForm(p => ({ ...p, [f]: v }));
        if (errors[f]) setErrors(p => ({ ...p, [f]: '' }));
        if (apiError?.fieldErrors?.[f]) setApiError(null);
        if (createSuccess) setCreateSuccess(null);
    };

    const resetLocalState = useCallback(() => {
        setForm(EMPTY_CREATE);
        setErrors({});
        setApiError(null);
        setCreateSuccess(null);
        setShowPw(false);
    }, []);

    const handleClose = () => {
        if (submitting) return;
        onClose();
    };

    useEffect(() => {
        if (!isOpen) {
            resetLocalState();
        }
    }, [isOpen, resetLocalState]);

    const validate = () => {
        const e: Partial<CreateForm> = {};
        if (!form.first_name.trim()) e.first_name = 'Required';
        if (!form.last_name.trim()) e.last_name = 'Required';
        if (!form.email.trim()) e.email = 'Required';
        else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = 'Invalid email';
        if (!form.password) e.password = 'Required';
        else if (form.password.length < 8) e.password = 'Min 8 characters';
        if (form.password !== form.password2) e.password2 = 'Passwords do not match';
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const handleSubmit = async () => {
        if (!validate()) return;
        setApiError(null);
        setCreateSuccess(null);
        try {
            await onSubmit({
                email: form.email, first_name: form.first_name, last_name: form.last_name,
                role: 'INSTRUCTOR',
                phone: form.phone || undefined,
                password: form.password, password2: form.password2,
            });
            setForm(EMPTY_CREATE);
            setErrors({});
            setCreateSuccess('Teacher added successfully.');
        } catch (err: unknown) {
            const appError = getAppError(err) ?? resolveAppError(err, {
                domain: 'instructors',
                action: 'create',
                entityLabel: 'staff account',
                role: 'ADMIN',
            });
            setApiError(appError);
            if (appError.fieldErrors) {
                setErrors(prev => ({
                    ...prev,
                    ...Object.fromEntries(
                        Object.entries(appError.fieldErrors ?? {})
                            .filter(([field]) => field in EMPTY_CREATE)
                            .map(([field, messages]) => [field, messages[0] ?? 'Check this field']),
                    ),
                }));
            }
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={handleClose}
            title="Add teacher"
            size="lg"
            closeDisabled={submitting}
            closeOnBackdrop={false}
            footer={
                createSuccess ? (
                    <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                        <Button variant="primary" onClick={handleClose}>
                            Done
                        </Button>
                    </div>
                ) : (
                    <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                        <Button variant="secondary" onClick={handleClose} disabled={submitting}>Cancel</Button>
                        <Button variant="primary" onClick={handleSubmit} disabled={submitting}>
                            {submitting ? 'Creating...' : 'Add teacher'}
                        </Button>
                    </div>
                )
            }
        >
            <div className="space-y-4">
                {createSuccess ? (
                    <ActionStateBanner
                        variant="success"
                        title="Teacher added"
                        message={createSuccess}
                    />
                ) : null}

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Input label="First Name *" value={form.first_name}
                        onChange={e => set('first_name', e.target.value)} error={errors.first_name} />
                    <Input label="Last Name *" value={form.last_name}
                        onChange={e => set('last_name', e.target.value)} error={errors.last_name} />
                </div>
                <Input label="Email *" type="email" value={form.email}
                    onChange={e => set('email', e.target.value)} error={errors.email} />
                <Input label="Phone (optional)" value={form.phone}
                    onChange={e => set('phone', e.target.value)} placeholder="+254 700 000 000" />
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="relative">
                        <Input label="Password *" type={showPw ? 'text' : 'password'} value={form.password}
                            onChange={e => set('password', e.target.value)} error={errors.password} />
                        <button type="button" onClick={() => setShowPw(v => !v)}
                            className="absolute right-3 top-8 text-gray-400 hover:text-gray-600 text-xs">
                            {showPw ? 'Hide' : 'Show'}
                        </button>
                    </div>
                    <Input label="Confirm Password *" type="password" value={form.password2}
                        onChange={e => set('password2', e.target.value)} error={errors.password2} />
                </div>

                {apiError && (
                    <InlineActionError
                        error={apiError}
                        onDismiss={() => setApiError(null)}
                    />
                )}
            </div>
        </Modal>
    );
}

// ── Grid card — display only ──────────────────────────────────────────────

function InstructorGridCard({
    instructor, progressHref, reportHref, onClick,
}: {
    instructor: GlobalUser;
    progressHref: string;
    reportHref: string | null;
    onClick: () => void;
}) {
    return (
        <div
            className="p-5 hover:shadow-md hover:border-blue-200 transition-all cursor-pointer"
            onClick={onClick}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && onClick()}
        >
            <Card className="h-full">
                <div className="flex items-start gap-3 mb-4">
                    <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center text-base font-bold text-blue-700 shrink-0">
                        {instructor.first_name.charAt(0)}{instructor.last_name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-gray-900 truncate">{instructor.full_name}</p>
                        <p className="text-xs text-gray-500 truncate">{instructor.email}</p>
                        {instructor.phone && <p className="text-xs text-gray-400">{instructor.phone}</p>}
                        {instructor.state_message ? (
                            <p className="mt-1 text-xs text-gray-500">{instructor.state_message}</p>
                        ) : null}
                    </div>
                    <div className="flex flex-col items-end gap-1">
                        <Badge variant={globalStatusVariant(resolveGlobalStatus(instructor))} size="sm">
                            {globalStatusLabel(resolveGlobalStatus(instructor))}
                        </Badge>
                        <Badge variant={membershipStatusVariant(instructor.membership_status)} size="sm">
                            {membershipStatusLabel(instructor.membership_status)}
                        </Badge>
                    </div>
                </div>
                <div className="flex items-center gap-4 text-xs text-gray-500 border-t border-gray-100 pt-3">
                    <span className="flex items-center gap-1">
                        <GraduationCap className="h-3.5 w-3.5 text-blue-400" />Teaching role
                    </span>
                    <span>Joined {new Date(instructor.date_joined).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}</span>
                    <span className="ml-auto flex items-center gap-2" onClick={(event) => event.stopPropagation()}>
                        <Link href={progressHref} className="font-medium text-blue-600 hover:underline">
                            Progress
                        </Link>
                        {reportHref ? (
                            <Link href={reportHref} className="font-medium text-blue-600 hover:underline">
                                Report
                            </Link>
                        ) : null}
                    </span>
                </div>
            </Card>
        </div>
    );
}

// ── Page ──────────────────────────────────────────────────────────────────

export function InstructorManagementPage() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const { user, activeRole, activeOrg, capabilities } = useAuth();
    const { instructors, loading, error, refetch, createInstructor } = useInstructors();

    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [viewMode, setViewMode] = useState<ViewMode>('table');
    const [createOpen, setCreateOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const filtered = useMemo(() => {
        return instructors.filter(i => {
            const matchSearch = !search ||
                i.full_name.toLowerCase().includes(search.toLowerCase()) ||
                i.email.toLowerCase().includes(search.toLowerCase()) ||
                (i.state_message ?? '').toLowerCase().includes(search.toLowerCase());
            const matchStatus = statusFilter === 'all'
                || (statusFilter === 'active' && isEffectivelyActiveInCurrentOrg(i))
                || (statusFilter === 'access_restricted' && resolveGlobalStatus(i) === 'ACTIVE' && i.membership_status === 'SUSPENDED')
                || (statusFilter === 'removed' && i.membership_status === 'REVOKED')
                || (statusFilter === 'platform_restricted' && resolveGlobalStatus(i) === 'GLOBAL_DEACTIVATED');
            return matchSearch && matchStatus;
        });
    }, [instructors, search, statusFilter]);
    const selectedCohortSubjectId = searchParams.get('cohort_subject_id');
    const selectedCohortName = searchParams.get('cohort_name');
    const selectedSubjectName = searchParams.get('subject_name');
    const selectedSubjectSource = searchParams.get('subject_source');
    const returnTo = searchParams.get('returnTo');
    const hasTeachingContext = Boolean(selectedCohortSubjectId && selectedSubjectName && selectedCohortName);
    const preservedContextQuery = searchParams.toString();
    const currentReturnTo = useMemo(() => {
        const query = searchParams.toString();
        return query ? `${pathname}?${query}` : pathname;
    }, [pathname, searchParams]);
    const canOpenInstructorReports = canRenderInstitutionReportOverview({
        user,
        activeRole,
        activeOrg,
        capabilities,
    });

    const buildProgressHref = (id: number) => {
        const params = new URLSearchParams({
            returnTo: currentReturnTo,
        });

        if (!hasTeachingContext) {
            return `/admin/instructors/${id}/progress?${params.toString()}`;
        }

        params.set('cohort_subject_id', selectedCohortSubjectId ?? '');
        params.set('cohort_name', selectedCohortName ?? '');
        params.set('subject_name', selectedSubjectName ?? '');
        params.set('open', 'teaching');

        if (selectedSubjectSource) {
            params.set('subject_source', selectedSubjectSource);
        }

        if (preservedContextQuery) {
            params.set('back', preservedContextQuery);
        }

        return `/admin/instructors/${id}/progress?${params.toString()}`;
    };

    const buildReportHref = (id: number) => (
        canOpenInstructorReports
            ? buildInstructorReportHref(id, { returnTo: currentReturnTo })
            : null
    );

    const navigateTo = (id: number) => {
        router.push(buildProgressHref(id));
    };

    const handleCreate = async (data: UserCreatePayload) => {
        setSubmitting(true);
        try {
            await createInstructor(data);
        } catch (err: unknown) {
            throw err;
        } finally {
            setSubmitting(false);
        }
    };

    // ── Table columns — no action buttons, row click handles navigation ───

    const columns: Column<GlobalUser>[] = [
        {
            key: 'full_name',
            header: 'Staff member',
            sortable: true,
            render: row => (
                <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-blue-100 flex items-center justify-center text-sm font-bold text-blue-700 shrink-0">
                        {row.first_name.charAt(0)}{row.last_name.charAt(0)}
                    </div>
                    <div>
                        <p className="text-sm font-semibold text-gray-900">{row.full_name}</p>
                        <p className="text-xs text-gray-500 flex items-center gap-1">
                            <Mail className="h-3 w-3" />{row.email}
                        </p>
                        {row.phone && (
                            <p className="text-xs text-gray-400 flex items-center gap-1">
                                <Phone className="h-3 w-3" />{row.phone}
                            </p>
                        )}
                    </div>
                </div>
            ),
        },
        {
            key: 'status',
            header: 'Lifecycle',
            render: row => (
                <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                        <Badge variant={globalStatusVariant(resolveGlobalStatus(row))}>
                            {globalStatusLabel(resolveGlobalStatus(row))}
                        </Badge>
                        <Badge variant={membershipStatusVariant(row.membership_status)}>
                            {membershipStatusLabel(row.membership_status)}
                        </Badge>
                    </div>
                    {row.state_message ? (
                        <p className="max-w-sm text-xs text-gray-500">{row.state_message}</p>
                    ) : null}
                </div>
            ),
        },
        {
            key: 'last_login',
            header: 'Last Login',
            sortable: true,
            render: row => row.last_login
                ? new Date(row.last_login).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                : <span className="text-gray-300 italic text-xs">Never</span>,
        },
        {
            key: 'date_joined',
            header: 'Joined',
            sortable: true,
            render: row => new Date(row.date_joined).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
        },
        {
            key: 'id',
            header: 'Actions',
            render: row => {
                const reportHref = buildReportHref(row.id);

                return (
                    <div
                        className="flex flex-wrap items-center gap-2"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <Link href={buildProgressHref(row.id)} className="text-xs font-medium text-blue-600 hover:underline">
                            Progress
                        </Link>
                        {reportHref ? (
                            <Link href={reportHref} className="text-xs font-medium text-blue-600 hover:underline">
                                Report
                            </Link>
                        ) : null}
                    </div>
                );
            },
        },
    ];

    if (loading) return (
        <div className="flex items-center justify-center h-64">
            <div className="text-center">
                <LoadingSpinner size="lg" fullScreen={false} message="Loading staff..." showMessage={false} />
                <p className="mt-3 text-sm text-gray-500">Loading staff...</p>
            </div>
        </div>
    );

    if (error) return (
        <RecoverableErrorCard error={error} onRetry={refetch} className="mx-auto mt-8 max-w-2xl" />
    );

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Staff</h1>
                    <p className="text-sm text-gray-500 mt-1">
                        {instructors.length} staff member{instructors.length !== 1 ? 's' : ''} with teaching access — click any row to view details and manage assignments
                    </p>
                </div>
                <Button variant="primary" onClick={() => { setCreateOpen(true); }} className="gap-2">
                    <Plus className="h-4 w-4" />Add teacher
                </Button>
            </div>

            <StatsBar instructors={instructors} />

            {hasTeachingContext && (
                <Card>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <h2 className="text-sm font-semibold text-gray-900">Cohort Subject Assignment</h2>
                            <p className="mt-1 text-sm text-gray-600">
                                Select a teacher to manage <span className="font-medium text-gray-900">{selectedSubjectName}</span> in{' '}
                                <span className="font-medium text-gray-900">{selectedCohortName}</span>.
                            </p>
                        </div>
                        {returnTo ? (
                            <Link href={returnTo} className="text-sm font-medium text-blue-600 hover:text-blue-700">
                                Return to cohort
                            </Link>
                        ) : null}
                    </div>
                </Card>
            )}

            {/* Filter + view toggle */}
            <div className="flex gap-3 items-center">
                <select
                    value={statusFilter}
                    onChange={e => setStatusFilter(e.target.value)}
                    className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                    <option value="all">All Lifecycle States</option>
                    <option value="active">Org Active</option>
                    <option value="access_restricted">Access Restricted</option>
                    <option value="removed">Removed from Org</option>
                    <option value="platform_restricted">Platform Restricted</option>
                </select>
                <div className="flex rounded-lg border border-gray-200 overflow-hidden ml-auto">
                    <button
                        onClick={() => setViewMode('table')}
                        className={`px-3 py-2 text-sm transition-colors ${viewMode === 'table' ? 'bg-blue-600 text-white' : 'text-gray-500 hover:bg-gray-50'}`}
                    >
                        <List className="h-4 w-4" />
                    </button>
                    <button
                        onClick={() => setViewMode('grid')}
                        className={`px-3 py-2 text-sm border-l border-gray-200 transition-colors ${viewMode === 'grid' ? 'bg-blue-600 text-white' : 'text-gray-500 hover:bg-gray-50'}`}
                    >
                        <LayoutGrid className="h-4 w-4" />
                    </button>
                </div>
            </div>

            {/* Table or Grid */}
            {viewMode === 'table' ? (
                <DataTable<GlobalUser & Record<string, unknown>>
                    data={filtered.map(i => i as GlobalUser & Record<string, unknown>)}
                    columns={columns}
                    loading={false}
                    loadingMessage="Loading staff accounts..."
                    enableSearch
                    enableSort
                    searchPlaceholder="Search by name or email..."
                    emptyMessage={search || statusFilter !== 'all' ? 'No staff match your filters' : 'No staff members yet'}
                    onSearch={setSearch}
                    onRowClick={row => navigateTo(row.id)}
                    onSort={() => { }}
                />
            ) : filtered.length === 0 ? (
                <div className="bg-white rounded-xl border border-gray-200 p-14 text-center">
                    <GraduationCap className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-sm font-medium text-gray-500">
                        {search || statusFilter !== 'all' ? 'No staff match your filters' : 'No staff members yet'}
                    </p>
                    {!search && statusFilter === 'all' && (
                        <button onClick={() => setCreateOpen(true)} className="mt-2 text-sm text-blue-600 hover:text-blue-700 font-medium">
                            Add your first teacher →
                        </button>
                    )}
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {filtered.map(i => (
                        <InstructorGridCard
                            key={i.id}
                            instructor={i}
                            progressHref={buildProgressHref(i.id)}
                            reportHref={buildReportHref(i.id)}
                            onClick={() => navigateTo(i.id)}
                        />
                    ))}
                </div>
            )}

            <CreateInstructorModal
                isOpen={createOpen}
                onClose={() => setCreateOpen(false)}
                onSubmit={handleCreate}
                submitting={submitting}
            />
        </div>
    );
}
