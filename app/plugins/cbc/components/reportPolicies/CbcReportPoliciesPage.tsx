'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Plus } from 'lucide-react';
import { Button } from '@/app/components/ui/Button';
import { Card } from '@/app/components/ui/Card';
import { ErrorBanner } from '@/app/components/ui/ErrorBanner';
import { LoadingSpinner } from '@/app/components/ui/LoadingSpinner';
import { useAuth } from '@/app/context/AuthContext';
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
import { CbcTermPolicyPlanSection } from '@/app/plugins/cbc/components/reportPolicies/CbcTermPolicyPlanSection';
import {
    buildCbcCohortSubjectOptions,
    buildCbcSubjectProfileOptions,
} from '@/app/plugins/cbc/components/reportPolicies/policyScopeOptions';
import { useCbcReportPolicies } from '@/app/plugins/cbc/hooks/useCbcReportPolicies';
import type { CbcReportPolicy, CbcReportPolicyFilters, PolicyAuthoringMode } from '@/app/plugins/cbc/types/reportPolicy';
import { PolicyAdminOnlyState } from '@/app/core/components/reports/PolicyAdminOnlyState';
import { canManageCbcReportPolicyAuthoring } from '@/app/plugins/cbc/components/reportPolicies/reportPolicyAuthoringAccess';

interface CbcReportPoliciesPageProps {
    authoringMode?: PolicyAuthoringMode;
    cohortId?: number | null;
    lockedCohortSubjectId?: number | null;
    lockedKernelCohortSubjectId?: number | null;
    returnTo?: string | null;
    backLabel?: string;
    title?: string;
    description?: string;
}

export function CbcReportPoliciesPage({
    authoringMode = 'INSTITUTION_GOVERNANCE',
    cohortId = null,
    lockedCohortSubjectId = null,
    lockedKernelCohortSubjectId = null,
    returnTo = null,
    backLabel = 'Back',
    title,
    description,
}: CbcReportPoliciesPageProps = {}) {
    const { user, capabilities, loading: authLoading } = useAuth();
    const canManagePolicies = canManageCbcReportPolicyAuthoring({
        user,
        capabilities,
        authoringMode,
    });
    const [showModal, setShowModal] = useState(false);
    const [editingPolicy, setEditingPolicy] = useState<CbcReportPolicy | null>(null);
    const [templatePolicy, setTemplatePolicy] = useState<CbcReportPolicy | null>(null);
    const [deleteError, setDeleteError] = useState<string | null>(null);
    const [deletingId, setDeletingId] = useState<number | null>(null);
    const [activatingId, setActivatingId] = useState<number | null>(null);

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
    const cohortOptions = useMemo(
        () => cohorts.map((cohort) => ({
            id: cohort.id,
            label: cohort.name,
        })),
        [cohorts],
    );
    const lockedCohortSubject = useMemo(() => (
        cohortSubjectOptions.find((subject) => (
            subject.id === lockedCohortSubjectId
            || subject.cohortSubjectId === lockedKernelCohortSubjectId
        )) ?? null
    ), [cohortSubjectOptions, lockedCohortSubjectId, lockedKernelCohortSubjectId]);
    const resolvedLockedCohortSubjectId = lockedCohortSubject?.id ?? lockedCohortSubjectId ?? null;
    const classCohortSubjectIds = useMemo(() => (
        new Set(
            cohortSubjectOptions
                .filter((subject) => !cohortId || subject.cohortId === cohortId)
                .map((subject) => subject.id),
        )
    ), [cohortId, cohortSubjectOptions]);
    const filters = useMemo<CbcReportPolicyFilters | undefined>(() => {
        if (authoringMode === 'WORKSPACE_POLICY') {
            return { is_default: true };
        }
        return undefined;
    }, [authoringMode]);
    const { policies, loading, error, refetch, updatePolicy, deletePolicy } = useCbcReportPolicies(
        filters,
        {
            enabled: canManagePolicies
                && (authoringMode !== 'CLASS_SUBJECT_SETUP' || Boolean(resolvedLockedCohortSubjectId)),
        },
    );
    const visiblePolicies = useMemo(() => {
        if (authoringMode === 'CLASS_SUBJECT_SETUP') {
            return policies.filter((policy) => (
                policy.is_default
                || policy.cbc_cohort_subject === resolvedLockedCohortSubjectId
                || (policy.cohort === cohortId && policy.cbc_cohort_subject === null)
            ));
        }
        if (authoringMode === 'CLASS_SETUP') {
            return policies.filter((policy) => (
                policy.is_default
                || policy.cohort === cohortId
                || (policy.cbc_cohort_subject !== null && classCohortSubjectIds.has(policy.cbc_cohort_subject))
            ));
        }
        if (authoringMode === 'WORKSPACE_POLICY') {
            return policies.filter((policy) => policy.is_default);
        }
        return policies;
    }, [authoringMode, classCohortSubjectIds, cohortId, policies, resolvedLockedCohortSubjectId]);
    const termOptions = useMemo(
        () => terms.map((term) => ({
            id: term.id,
            label: `${term.academic_year_name} · ${term.name}`,
            status: term.status,
            is_frozen: term.is_frozen,
        })),
        [terms],
    );
    const defaultPolicy = useMemo(
        () => policies.find((policy) => policy.is_default) ?? null,
        [policies],
    );
    const isInstitutionGovernance = authoringMode === 'INSTITUTION_GOVERNANCE';
    const createButtonLabel = isInstitutionGovernance ? 'New Report Policy' : 'New Report Setup';
    const authoringNotice = isInstitutionGovernance
        ? 'CBC report engine uses these academic policies for official report computation.'
        : 'Class report setup is saved against this class workspace context.';

    const handleOpen = (policy?: CbcReportPolicy) => {
        if (!canManagePolicies) return;
        setEditingPolicy(policy ?? null);
        setTemplatePolicy(null);
        setShowModal(true);
    };

    const handleCreateActiveCopy = (policy: CbcReportPolicy) => {
        if (!canManagePolicies) return;
        setEditingPolicy(null);
        setTemplatePolicy(policy);
        setShowModal(true);
    };

    const handleClose = () => {
        setEditingPolicy(null);
        setTemplatePolicy(null);
        setShowModal(false);
    };

    const handleActivate = async (policy: CbcReportPolicy) => {
        setActivatingId(policy.id);
        setDeleteError(null);
        try {
            await updatePolicy(policy.id, { is_active: true });
            await refetch();
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to activate CBC report policy.';
            setDeleteError(message);
        } finally {
            setActivatingId(null);
        }
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
        return <LoadingSpinner message="Checking CBC report policy access..." />;
    }

    if (!canManagePolicies) {
        return <PolicyAdminOnlyState title={title ?? 'Report Policies'} />;
    }

    if (loading && !policies.length) {
        return <LoadingSpinner message="Loading CBC report policies..." />;
    }

    if (!cbcSurfaceAvailable) {
        return (
            <div className="space-y-6">
                <div>
                    <h1 className="text-2xl font-semibold text-gray-900">{title ?? 'CBC Academic Policies'}</h1>
                    <p className="mt-1 text-gray-500">
                        {description ?? 'Academic report policies are only available when the CBC report engine and CBC curriculum are active.'}
                    </p>
                </div>
                <Card className="max-w-3xl">
                    <div className="space-y-4">
                        <p className="text-sm text-gray-600">
                            This organization does not currently expose the CBC report policy surface.
                        </p>
                        {isInstitutionGovernance ? (
                            <Link href="/reports/policies">
                                <Button variant="secondary">Open Policy Hub</Button>
                            </Link>
                        ) : returnTo ? (
                            <Link href={returnTo}>
                                <Button variant="secondary">Back to workspace</Button>
                            </Link>
                        ) : null}
                    </div>
                </Card>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {returnTo ? (
                <Link href={returnTo}>
                    <Button variant="ghost" size="sm">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        {backLabel}
                    </Button>
                </Link>
            ) : null}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-semibold text-gray-900">{title ?? 'CBC Academic Policies'}</h1>
                    <p className="mt-1 text-gray-500">
                        {description ?? 'Report governance for CBC class subjects and terms.'}
                    </p>
                </div>
                {canManagePolicies && (
                    <Button onClick={() => handleOpen()}>
                        <Plus className="mr-1.5 h-4 w-4" />
                        {createButtonLabel}
                    </Button>
                )}
            </div>

            <div className="rounded-lg border border-green-100 bg-green-50 px-4 py-3 text-sm text-green-800">
                {authoringNotice}
            </div>

            {isInstitutionGovernance ? (
                <CbcTermPolicyPlanSection
                    policies={policies}
                    terms={termOptions}
                    canManage={canManagePolicies}
                    onCreatePolicy={() => handleOpen()}
                    onRefreshPolicies={refetch}
                />
            ) : null}

            {error && (
                <ErrorBanner
                    message={error instanceof Error ? error.message : 'Failed to load CBC report policies.'}
                    onDismiss={() => {}}
                />
            )}
            {deleteError && <ErrorBanner message={deleteError} onDismiss={() => setDeleteError(null)} />}

            <CbcReportPoliciesTable
                policies={visiblePolicies}
                canManage={canManagePolicies}
                authoringMode={authoringMode}
                deletingId={deletingId}
                onCreate={() => handleOpen()}
                onEdit={handleOpen}
                onActivate={(policy) => {
                    if (activatingId !== policy.id) void handleActivate(policy);
                }}
                onCreateActiveCopy={handleCreateActiveCopy}
                onDelete={handleDelete}
            />

            {showModal && (
                <CbcReportPolicyFormModal
                    editingPolicy={editingPolicy}
                    templatePolicy={templatePolicy}
                    defaultPolicy={editingPolicy ? null : defaultPolicy}
                    authoringMode={authoringMode}
                    lockedCohortId={cohortId}
                    lockedCohortSubjectId={resolvedLockedCohortSubjectId}
                    lockedCohortSubjectLabel={lockedCohortSubject?.label ?? null}
                    subjectProfiles={subjectProfileOptions}
                    cohorts={cohortOptions}
                    cohortSubjects={cohortSubjectOptions}
                    terms={termOptions}
                    onSuccess={handleSuccess}
                    onClose={handleClose}
                />
            )}
        </div>
    );
}
