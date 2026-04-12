'use client';

// ============================================================================
// app/(dashboard)/admin/instructors/page.tsx
//
// Display-only list. All instructor actions live on the progress page.
// Clicking any row navigates to /admin/instructors/[id]/progress.
// ============================================================================

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
    Users, Plus, GraduationCap, AlertTriangle, CheckCircle,
    UserCheck, UserX, BookOpen, LayoutGrid, List, Mail, Phone,
} from 'lucide-react';
import { useInstructors } from '@/app/core/hooks/useInstructors';
import { GlobalUser } from '@/app/core/types/globalUsers';
import { Badge } from '@/app/components/ui/Badge';
import { Button } from '@/app/components/ui/Button';
import { Card } from '@/app/components/ui/Card';
import { DataTable, Column } from '@/app/components/ui/Table';
import Modal from '@/app/components/ui/Modal';
import { Input } from '@/app/components/ui/Input';
import { instructorsAPI } from '@/app/core/api/instructors';
import { UserCreatePayload } from '@/app/core/types/globalUsers';
import { ErrorState } from '@/app/components/ui/ErrorState';

type ViewMode = 'table' | 'grid';

// ── Stats bar ─────────────────────────────────────────────────────────────

function StatsBar({ instructors }: { instructors: GlobalUser[] }) {
    const active = instructors.filter(i => i.is_active).length;
    const inactive = instructors.filter(i => !i.is_active).length;

    return (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
                { label: 'Total Instructors', value: instructors.length, color: 'text-blue-600', bg: 'bg-blue-50', icon: Users },
                { label: 'Active', value: active, color: 'text-green-600', bg: 'bg-green-50', icon: UserCheck },
                { label: 'Inactive', value: inactive, color: 'text-red-600', bg: 'bg-red-50', icon: UserX },
                { label: 'With Cohorts', value: '—', color: 'text-purple-600', bg: 'bg-purple-50', icon: BookOpen },
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

// ── Create modal (stays here — creating an instructor is a list-level action) 

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
    const [apiError, setApiError] = useState<string | null>(null);
    const [showPw, setShowPw] = useState(false);

    const set = (f: keyof CreateForm, v: string) => {
        setForm(p => ({ ...p, [f]: v }));
        if (errors[f]) setErrors(p => ({ ...p, [f]: '' }));
    };

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
        try {
            await onSubmit({
                email: form.email, first_name: form.first_name, last_name: form.last_name,
                role: 'INSTRUCTOR',
                phone: form.phone || undefined,
                password: form.password, password2: form.password2,
            });
            setForm(EMPTY_CREATE);
        } catch (err: unknown) {
            setApiError(err instanceof Error ? err.message : 'Failed to create instructor');
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Add Instructor" size="lg">
            <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <Input label="First Name *" value={form.first_name}
                        onChange={e => set('first_name', e.target.value)} error={errors.first_name} />
                    <Input label="Last Name *" value={form.last_name}
                        onChange={e => set('last_name', e.target.value)} error={errors.last_name} />
                </div>
                <Input label="Email *" type="email" value={form.email}
                    onChange={e => set('email', e.target.value)} error={errors.email} />
                <Input label="Phone (optional)" value={form.phone}
                    onChange={e => set('phone', e.target.value)} placeholder="+254 700 000 000" />
                <div className="grid grid-cols-2 gap-4">
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

                {/* API-level error — shows only when submit fails */}
                {apiError && (
                    <ErrorState
                        fullScreen={false}
                        message={apiError}
                    />
                )}

                <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                    <Button variant="secondary" onClick={onClose} disabled={submitting}>Cancel</Button>
                    <Button variant="primary" onClick={handleSubmit} disabled={submitting}>
                        {submitting ? 'Creating...' : 'Create Instructor'}
                    </Button>
                </div>
            </div>
        </Modal>
    );
}

// ── Grid card — display only ──────────────────────────────────────────────

function InstructorGridCard({
    instructor, onClick,
}: {
    instructor: GlobalUser;
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
                    </div>
                    <Badge variant={instructor.is_active ? 'success' : 'danger'} size="sm">
                        {instructor.is_active ? 'Active' : 'Off'}
                    </Badge>
                </div>
                <div className="flex items-center gap-4 text-xs text-gray-500 border-t border-gray-100 pt-3">
                    <span className="flex items-center gap-1">
                        <GraduationCap className="h-3.5 w-3.5 text-blue-400" />Instructor
                    </span>
                    <span>Joined {new Date(instructor.date_joined).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}</span>
                    <span className="ml-auto text-blue-500 font-medium text-xs">View →</span>
                </div>
            </Card>
        </div>
    );
}

// ── Page ──────────────────────────────────────────────────────────────────

export default function InstructorManagementPage() {
    const router = useRouter();
    const { instructors, loading, error, refetch, createInstructor } = useInstructors();

    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [viewMode, setViewMode] = useState<ViewMode>('table');
    const [createOpen, setCreateOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [actionError, setActionError] = useState<string | null>(null);
    const [actionSuccess, setActionSuccess] = useState<string | null>(null);

    const flash = (msg: string) => {
        setActionSuccess(msg);
        setTimeout(() => setActionSuccess(null), 3000);
    };

    const filtered = useMemo(() => {
        return instructors.filter(i => {
            const matchSearch = !search ||
                i.full_name.toLowerCase().includes(search.toLowerCase()) ||
                i.email.toLowerCase().includes(search.toLowerCase());
            const matchStatus = statusFilter === 'all' ||
                (statusFilter === 'active' && i.is_active) ||
                (statusFilter === 'inactive' && !i.is_active);
            return matchSearch && matchStatus;
        });
    }, [instructors, search, statusFilter]);

    const navigateTo = (id: number) => router.push(`/admin/instructors/${id}/progress`);

    const handleCreate = async (data: UserCreatePayload) => {
        setSubmitting(true); setActionError(null);
        try {
            await createInstructor(data);
            setCreateOpen(false);
            flash('Instructor created successfully');
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
            header: 'Instructor',
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
            key: 'is_active',
            header: 'Status',
            render: row => (
                <Badge variant={row.is_active ? 'success' : 'danger'}>
                    {row.is_active ? 'Active' : 'Inactive'}
                </Badge>
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
            header: '',
            render: () => (
                <span className="text-xs text-blue-500 font-medium">View →</span>
            ),
        },
    ];

    if (loading) return (
        <div className="flex items-center justify-center h-64">
            <div className="text-center">
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent mx-auto" />
                <p className="mt-3 text-sm text-gray-500">Loading instructors...</p>
            </div>
        </div>
    );

    if (error) return (
        <div className="flex items-center justify-center h-64">
            <div className="text-center">
                <AlertTriangle className="h-8 w-8 text-red-500 mx-auto mb-2" />
                <p className="text-sm text-red-600">{error}</p>
                <Button variant="secondary" onClick={refetch} className="mt-3">Try Again</Button>
            </div>
        </div>
    );

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Instructor Management</h1>
                    <p className="text-sm text-gray-500 mt-1">
                        {instructors.length} instructor{instructors.length !== 1 ? 's' : ''} — click any row to view details and manage
                    </p>
                </div>
                <Button variant="primary" onClick={() => { setActionError(null); setCreateOpen(true); }} className="gap-2">
                    <Plus className="h-4 w-4" />Add Instructor
                </Button>
            </div>

            <StatsBar instructors={instructors} />

            {/* Feedback */}
            {actionError && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    {actionError}
                    <button onClick={() => setActionError(null)} className="ml-auto text-red-400 hover:text-red-600">✕</button>
                </div>
            )}
            {actionSuccess && (
                <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
                    <CheckCircle className="h-4 w-4 shrink-0" />{actionSuccess}
                </div>
            )}

            {/* Filter + view toggle */}
            <div className="flex gap-3 items-center">
                <select
                    value={statusFilter}
                    onChange={e => setStatusFilter(e.target.value)}
                    className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                    <option value="all">All Statuses</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
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
                    enableSearch
                    enableSort
                    searchPlaceholder="Search by name or email..."
                    emptyMessage={search || statusFilter !== 'all' ? 'No instructors match your filters' : 'No instructors yet'}
                    onSearch={setSearch}
                    onRowClick={row => navigateTo(row.id)}
                    onSort={() => { }}
                />
            ) : filtered.length === 0 ? (
                <div className="bg-white rounded-xl border border-gray-200 p-14 text-center">
                    <GraduationCap className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-sm font-medium text-gray-500">
                        {search || statusFilter !== 'all' ? 'No instructors match your filters' : 'No instructors yet'}
                    </p>
                    {!search && statusFilter === 'all' && (
                        <button onClick={() => setCreateOpen(true)} className="mt-2 text-sm text-blue-600 hover:text-blue-700 font-medium">
                            Add your first instructor →
                        </button>
                    )}
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {filtered.map(i => (
                        <InstructorGridCard key={i.id} instructor={i} onClick={() => navigateTo(i.id)} />
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