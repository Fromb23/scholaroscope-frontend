'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Building2, AlertTriangle } from 'lucide-react';
import { useOrganizations } from '@/app/core/hooks/useOrganizations';
import { Button } from '@/app/components/ui/Button';
import { Card } from '@/app/components/ui/Card';
import { LoadingSpinner } from '@/app/components/ui/LoadingSpinner';
import { ErrorState } from '@/app/components/ui/ErrorState';
import {
    StatsBar, OrgFormModal, DeleteModal,
    OrgTableRow, OrgFilters,
} from '@/app/core/components/superadmin/OrgListComponents';
import type { Organization, PlanType } from '@/app/core/types/organization';
import type { OrgFormData } from '@/app/core/components/superadmin/OrgListComponents';

export default function OrganizationsPage() {
    const router = useRouter();
    const {
        organizations, loading, error, refetch,
        createOrganization, updateOrganization,
        deleteOrganization, toggleOrganizationActive,
    } = useOrganizations();

    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [planFilter, setPlanFilter] = useState('all');

    const [createOpen, setCreateOpen] = useState(false);
    const [editTarget, setEditTarget] = useState<Organization | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<Organization | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [actionError, setActionError] = useState<string | null>(null);

    const filtered = useMemo(() => organizations.filter(org => {
        const q = search.toLowerCase();
        const matchSearch = !search ||
            org.name.toLowerCase().includes(q) ||
            org.code.toLowerCase().includes(q) ||
            org.email.toLowerCase().includes(q);
        const matchStatus = statusFilter === 'all' ||
            (statusFilter === 'active' && org.is_active) ||
            (statusFilter === 'suspended' && !org.is_active);
        const matchPlan = planFilter === 'all' || org.plan_type === planFilter;
        return matchSearch && matchStatus && matchPlan;
    }), [organizations, search, statusFilter, planFilter]);

    // ── Handlers ──────────────────────────────────────────────────────────

    const withSubmit = async (fn: () => Promise<void>) => {
        setSubmitting(true);
        setActionError(null);
        try { await fn(); }
        catch (err: unknown) {
            setActionError(err instanceof Error ? err.message : 'An error occurred');
        } finally {
            setSubmitting(false);
        }
    };

    const handleCreate = (data: OrgFormData) =>
        withSubmit(async () => {
            await createOrganization({
                name: data.name,
                email: data.email || undefined,
                phone: data.phone || undefined,
                address: data.address || undefined,
                plan_type: data.plan_type as PlanType,
                org_type: data.org_type,
            });
            setCreateOpen(false);
        });

    const handleEdit = (data: OrgFormData) =>
        withSubmit(async () => {
            await updateOrganization(editTarget!.id, {
                name: data.name,
                email: data.email || undefined,
                phone: data.phone || undefined,
                address: data.address || undefined,
                plan_type: data.plan_type as PlanType,
            });
            setEditTarget(null);
        });

    const handleToggleActive = (org: Organization) =>
        withSubmit(async () => {
            await toggleOrganizationActive(org.id, !org.is_active);
        });

    const handleDelete = () =>
        withSubmit(async () => {
            await deleteOrganization(deleteTarget!.id);
            setDeleteTarget(null);
        });

    // ── Render ─────────────────────────────────────────────────────────────

    if (loading) return <LoadingSpinner />;
    if (error) return <ErrorState message={error} onRetry={refetch} />;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Organizations</h1>
                    <p className="text-sm text-gray-500 mt-1">Manage all institutions on the platform</p>
                </div>
                <Button onClick={() => { setActionError(null); setCreateOpen(true); }}
                    className="bg-purple-600 hover:bg-purple-700 focus:ring-purple-500 gap-2">
                    <Plus className="h-4 w-4" /> New Organization
                </Button>
            </div>

            <StatsBar organizations={organizations} />

            {actionError && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    {actionError}
                    <button onClick={() => setActionError(null)} className="ml-auto text-red-500 hover:text-red-700">✕</button>
                </div>
            )}

            <OrgFilters
                search={search} statusFilter={statusFilter} planFilter={planFilter}
                onSearch={setSearch} onStatusChange={setStatusFilter} onPlanChange={setPlanFilter}
            />

            <Card className="p-0 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-gray-200 bg-gray-50">
                                {['Organization', 'Contact', 'Plan', 'Type', 'Users', 'Status', 'Created', 'Actions'].map(h => (
                                    <th key={h} className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                        {h}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-12 text-center">
                                        <Building2 className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                                        <p className="text-sm font-medium text-gray-500">
                                            {search || statusFilter !== 'all' || planFilter !== 'all'
                                                ? 'No organizations match your filters'
                                                : 'No organizations yet'
                                            }
                                        </p>
                                        {!search && statusFilter === 'all' && planFilter === 'all' && (
                                            <button onClick={() => setCreateOpen(true)}
                                                className="mt-2 text-sm text-purple-600 hover:text-purple-700 font-medium">
                                                Create your first organization →
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ) : (
                                filtered.map(org => (
                                    <OrgTableRow
                                        key={org.id}
                                        org={org}
                                        onView={o => router.push(`/superadmin/organizations/${o.id}`)}
                                        onEdit={o => { setActionError(null); setEditTarget(o); }}
                                        onToggleActive={handleToggleActive}
                                        onDelete={o => { setActionError(null); setDeleteTarget(o); }}
                                    />
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
                {filtered.length > 0 && (
                    <div className="px-6 py-3 border-t border-gray-100 bg-gray-50">
                        <p className="text-xs text-gray-500">
                            Showing {filtered.length} of {organizations.length} organization{organizations.length !== 1 ? 's' : ''}
                        </p>
                    </div>
                )}
            </Card>

            <OrgFormModal
                isOpen={createOpen}
                onClose={() => setCreateOpen(false)}
                onSubmit={handleCreate}
                submitting={submitting}
                mode="create"
            />

            {editTarget && (
                <OrgFormModal
                    isOpen={!!editTarget}
                    onClose={() => setEditTarget(null)}
                    onSubmit={handleEdit}
                    initialData={{
                        name: editTarget.name,
                        email: editTarget.email,
                        phone: editTarget.phone,
                        address: editTarget.address,
                        plan_type: editTarget.plan_type,
                        org_type: editTarget.org_type,
                    }}
                    submitting={submitting}
                    mode="edit"
                />
            )}

            <DeleteModal
                isOpen={!!deleteTarget}
                onClose={() => setDeleteTarget(null)}
                onConfirm={handleDelete}
                organization={deleteTarget}
                submitting={submitting}
            />
        </div>
    );
}