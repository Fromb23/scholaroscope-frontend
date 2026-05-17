'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { Button } from '@/app/components/ui/Button';
import { Card } from '@/app/components/ui/Card';
import { ErrorBanner } from '@/app/components/ui/ErrorBanner';
import { LoadingSpinner } from '@/app/components/ui/LoadingSpinner';
import { useAuth } from '@/app/context/AuthContext';
import { isAdminOrAbove } from '@/app/utils/permissions';
import { useCohorts } from '@/app/core/hooks/useCohorts';
import { useCohortSubjectsByCohorts } from '@/app/core/hooks/useCohortSubjects';
import { useCurricula, useTerms } from '@/app/core/hooks/useAcademic';
import { usePlugins } from '@/app/core/hooks/usePlugins';
import { getAvailablePolicySurfaces } from '@/app/core/lib/policySurfaces';
import { useCBCCatalog } from '@/app/plugins/cbc/hooks/useCBC';
import {
    CbcReportPolicyFormModal,
} from '@/app/plugins/cbc/components/reportPolicies/CbcReportPolicyFormModal';
import { CbcReportPoliciesTable } from '@/app/plugins/cbc/components/reportPolicies/CbcReportPoliciesTable';
import {
    buildCbcCohortSubjectOptions,
    buildCbcSubjectProfileOptions,
} from '@/app/plugins/cbc/components/reportPolicies/policyScopeOptions';
import { useCbcReportPolicies } from '@/app/plugins/cbc/hooks/useCbcReportPolicies';
import type { CbcReportPolicy } from '@/app/plugins/cbc/types/reportPolicy';
import { PolicyAdminOnlyState } from '@/app/core/components/reports/PolicyAdminOnlyState';

export function CbcReportPoliciesPage() {
    const { user, activeRole, loading: authLoading } = useAuth();
    const canManagePolicies = isAdminOrAbove(user, activeRole);
    const [showModal, setShowModal] = useState(false);
    const [editingPolicy, setEditingPolicy] = useState<CbcReportPolicy | null>(null);
    const [deleteError, setDeleteError] = useState<string | null>(null);
    const [deletingId, setDeletingId] = useState<number | null>(null);

    const { policies, loading, error, refetch, deletePolicy } = useCbcReportPolicies(
        undefined,
        { enabled: canManagePolicies },
    );
    const { cohorts } = useCohorts();
    const { curricula } = useCurricula();
    const { plugins } = usePlugins();
    const { terms } = useTerms();
    const { data: catalog } = useCBCCatalog();
    const cohortIds = useMemo(() => cohorts.map((cohort) => cohort.id), [cohorts]);
    const { subjects: cohortSubjects } = useCohortSubjectsByCohorts(cohortIds);

    const availableSurfaces = useMemo(() => (
        getAvailablePolicySurfaces({
            curricula,
            installedPlugins: plugins,
        })
    ), [curricula, plugins]);
    const cbcSurfaceAvailable = availableSurfaces.some((surface) => surface.key === 'cbc');

    const subjectProfileOptions = useMemo(
        () => buildCbcSubjectProfileOptions(catalog),
        [catalog],
    );
    const cohortSubjectOptions = useMemo(
        () => buildCbcCohortSubjectOptions(cohortSubjects),
        [cohortSubjects],
    );
    const termOptions = useMemo(
        () => terms.map((term) => ({
            id: term.id,
            label: `${term.academic_year_name} · ${term.name}`,
        })),
        [terms],
    );
    const defaultPolicy = useMemo(
        () => policies.find((policy) => policy.is_default) ?? null,
        [policies],
    );

    const handleOpen = (policy?: CbcReportPolicy) => {
        if (!canManagePolicies) return;
        setEditingPolicy(policy ?? null);
        setShowModal(true);
    };

    const handleClose = () => {
        setEditingPolicy(null);
        setShowModal(false);
    };

    const handleDelete = async (id: number) => {
        setDeletingId(id);
        setDeleteError(null);
        try {
            await deletePolicy(id);
            await refetch();
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to delete CBC report policy.';
            setDeleteError(message);
        } finally {
            setDeletingId(null);
        }
    };

    const handleSuccess = async () => {
        await refetch();
        handleClose();
    };

    if (authLoading) {
        return <LoadingSpinner />;
    }

    if (!canManagePolicies) {
        return <PolicyAdminOnlyState title="CBC Report Policies" />;
    }

    if (loading && !policies.length) {
        return <LoadingSpinner />;
    }

    if (!cbcSurfaceAvailable) {
        return (
            <div className="space-y-6">
                <div>
                    <h1 className="text-2xl font-semibold text-gray-900">CBC Report Policies</h1>
                    <p className="mt-1 text-gray-500">
                        CBC report policies are only available when the CBC plugin and CBC curriculum are active.
                    </p>
                </div>
                <Card className="max-w-3xl">
                    <div className="space-y-4">
                        <p className="text-sm text-gray-600">
                            This organization does not currently expose the CBC report policy surface.
                        </p>
                        <Link href="/reports/policies">
                            <Button variant="secondary">Open Policy Hub</Button>
                        </Link>
                    </div>
                </Card>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-semibold text-gray-900">CBC Report Policies</h1>
                    <p className="mt-1 text-gray-500">
                        Plugin-owned policy authoring for CBC report interpretation.
                    </p>
                </div>
                {canManagePolicies && (
                    <Button onClick={() => handleOpen()}>
                        <Plus className="mr-1.5 h-4 w-4" />
                        New CBC Report Policy
                    </Button>
                )}
            </div>

            <div className="rounded-lg border border-green-100 bg-green-50 px-4 py-3 text-sm text-green-800">
                Assessment pages preview CBC policy context and link here for policy authoring. They do not create or edit CBC policies inline.
            </div>

            {error && (
                <ErrorBanner
                    message={error instanceof Error ? error.message : 'Failed to load CBC report policies.'}
                    onDismiss={() => {}}
                />
            )}
            {deleteError && <ErrorBanner message={deleteError} onDismiss={() => setDeleteError(null)} />}

            <CbcReportPoliciesTable
                policies={policies}
                canManage={canManagePolicies}
                deletingId={deletingId}
                onCreate={() => handleOpen()}
                onEdit={handleOpen}
                onDelete={handleDelete}
            />

            {showModal && (
                <CbcReportPolicyFormModal
                    editingPolicy={editingPolicy}
                    defaultPolicy={editingPolicy ? null : defaultPolicy}
                    subjectProfiles={subjectProfileOptions}
                    cohortSubjects={cohortSubjectOptions}
                    terms={termOptions}
                    onSuccess={handleSuccess}
                    onClose={handleClose}
                />
            )}
        </div>
    );
}
