'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, ArrowLeft, CheckCircle2, ChevronDown, ClipboardCheck, Layers3, Loader, Plus } from 'lucide-react';
import { Badge } from '@/app/components/ui/Badge';
import { Button } from '@/app/components/ui/Button';
import { Card } from '@/app/components/ui/Card';
import { ErrorBanner } from '@/app/components/ui/ErrorBanner';
import { AppErrorBanner } from '@/app/components/ui/errors';
import { LoadingSpinner } from '@/app/components/ui/LoadingSpinner';
import { useAuth } from '@/app/context/AuthContext';
import { reportsAPI } from '@/app/core/api/reporting';
import { resolveReportError, type AppError } from '@/app/core/errors';
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
import type {
    ReportComputeEngineReadiness,
    ReportComputeReadiness,
    ReportPolicyReference,
    ReportReadinessRow,
} from '@/app/core/types/reporting';

interface CbcReportPoliciesPageProps {
    authoringMode?: PolicyAuthoringMode;
    cohortId?: number | null;
    lockedCohortSubjectId?: number | null;
    lockedKernelCohortSubjectId?: number | null;
    returnTo?: string | null;
    selectedTermId?: number | null;
    backLabel?: string;
    title?: string;
    description?: string;
}

function policyReferenceLabel(policy?: ReportPolicyReference | null): string {
    return policy?.name ?? policy?.label ?? 'No default policy';
}

function readinessRowLabel(row: ReportReadinessRow): string {
    return row.label
        ?? [row.cohort?.name, row.subject?.code ?? row.subject?.name].filter(Boolean).join(' - ')
        ?? 'Class subject';
}

function readinessMetric(engine: ReportComputeEngineReadiness | null, key: 'covered_count' | 'missing_count' | 'exception_count' | 'official_result_estimate'): number {
    if (!engine) return 0;
    const value = engine[key] ?? engine.context?.[key];
    return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function scopeLabel(scope: string): string {
    const labels: Record<string, string> = {
        workspace_default: 'Default',
        cohort: 'Grade/cohort override',
        subject: 'Subject override',
        cohort_subject: 'Class-subject exception',
    };
    return labels[scope] ?? scope.replaceAll('_', ' ');
}

function recordLabel(entry: Record<string, unknown>): string {
    const label = entry.label;
    const policy = entry.policy;
    const effectivePolicy = entry.effective_policy;
    const name = typeof label === 'string' ? label : null;
    const policyName = policy && typeof policy === 'object' && 'name' in policy
        ? String((policy as { name?: unknown }).name ?? '')
        : effectivePolicy && typeof effectivePolicy === 'object' && 'name' in effectivePolicy
            ? String((effectivePolicy as { name?: unknown }).name ?? '')
            : '';
    return [name, policyName].filter(Boolean).join(' - ') || 'Scoped policy';
}

export function CbcReportPoliciesPage({
    authoringMode = 'INSTITUTION_GOVERNANCE',
    cohortId = null,
    lockedCohortSubjectId = null,
    lockedKernelCohortSubjectId = null,
    returnTo = null,
    selectedTermId = null,
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
    const [readiness, setReadiness] = useState<ReportComputeReadiness | null>(null);
    const [readinessLoading, setReadinessLoading] = useState(false);
    const [setupError, setSetupError] = useState<AppError | null>(null);
    const [preparingTerm, setPreparingTerm] = useState(false);
    const [applyingRecommendation, setApplyingRecommendation] = useState<string | null>(null);
    const [advancedPolicyListOpen, setAdvancedPolicyListOpen] = useState(false);

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
    const effectiveTermId = selectedTermId ?? termOptions[0]?.id ?? null;
    const selectedTermOption = termOptions.find((term) => term.id === effectiveTermId) ?? null;
    const modalDefaultPolicy = useMemo(
        () => policies.find((policy) => policy.is_default) ?? null,
        [policies],
    );
    const isInstitutionGovernance = authoringMode === 'INSTITUTION_GOVERNANCE';
    const cbcEngine = useMemo(() => (
        readiness?.engines.find((engine) => engine.key === 'cbc' || engine.engine === 'cbc') ?? null
    ), [readiness]);
    const coverage = cbcEngine?.coverage ?? null;
    const summaryDefaultPolicy: ReportPolicyReference | null = cbcEngine?.default_policy
        ?? coverage?.default_policy
        ?? (modalDefaultPolicy ? { id: modalDefaultPolicy.id, name: modalDefaultPolicy.name } : null);
    const missingRows = useMemo(() => (
        coverage?.missing ?? readiness?.missing ?? []
    ), [coverage, readiness]);
    const conflictRows = useMemo(() => (
        coverage?.conflicts ?? readiness?.conflicts ?? []
    ), [coverage, readiness]);
    const exceptionRows = useMemo(() => (
        coverage?.exceptions ?? readiness?.exceptions ?? []
    ), [coverage, readiness]);
    const safeRecommendation = readiness?.recommendations?.find((recommendation) => (
        recommendation.safe_to_apply && recommendation.engine === 'cbc'
    )) ?? readiness?.recommendations?.find((recommendation) => recommendation.safe_to_apply) ?? null;
    const overrideEntries = useMemo(() => {
        const byScope = coverage?.coverage_by_scope ?? {};
        return Object.entries(byScope)
            .filter(([scope]) => scope !== 'workspace_default')
            .flatMap(([scope, entries]) => (
                Array.isArray(entries)
                    ? entries.map((entry) => ({
                        scope,
                        label: recordLabel(entry),
                    }))
                    : []
            ));
    }, [coverage]);
    const missingGroups = useMemo(() => {
        const groups = new Map<string, ReportReadinessRow[]>();
        missingRows.forEach((row) => {
            const key = row.cohort?.name
                ? `${row.cohort.name} subjects`
                : row.subject?.name
                    ? `${row.subject.name} classes`
                    : 'Ungrouped missing setup';
            groups.set(key, [...(groups.get(key) ?? []), row]);
        });
        return Array.from(groups.entries()).map(([label, rows]) => ({ label, rows }));
    }, [missingRows]);
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

    useEffect(() => {
        if (!isInstitutionGovernance || !canManagePolicies || !effectiveTermId) {
            setReadiness(null);
            setReadinessLoading(false);
            return;
        }

        let cancelled = false;
        setReadinessLoading(true);
        setSetupError(null);
        reportsAPI.getComputeReadiness(effectiveTermId)
            .then((payload) => {
                if (!cancelled) {
                    setReadiness(payload);
                }
            })
            .catch((caught) => {
                if (!cancelled) {
                    setReadiness(null);
                    setSetupError(resolveReportError(caught, {
                        action: 'load',
                        entityLabel: 'CBC policy coverage summary',
                        role: 'ADMIN',
                    }));
                }
            })
            .finally(() => {
                if (!cancelled) {
                    setReadinessLoading(false);
                }
            });

        return () => {
            cancelled = true;
        };
    }, [canManagePolicies, effectiveTermId, isInstitutionGovernance]);

    const handlePrepareTermForReports = async () => {
        if (!effectiveTermId) return;
        setPreparingTerm(true);
        setSetupError(null);
        try {
            setReadiness(await reportsAPI.prepareTermForReports(effectiveTermId));
            await refetch();
        } catch (caught) {
            setSetupError(resolveReportError(caught, {
                action: 'load',
                entityLabel: 'report setup recommendations',
                role: 'ADMIN',
            }));
        } finally {
            setPreparingTerm(false);
        }
    };

    const handleApplyRecommendation = async (recommendationId: string) => {
        if (!effectiveTermId) return;
        setApplyingRecommendation(recommendationId);
        setSetupError(null);
        try {
            setReadiness(await reportsAPI.applyRecommendedFix(effectiveTermId, recommendationId));
            await refetch();
        } catch (caught) {
            setSetupError(resolveReportError(caught, {
                action: 'update',
                entityLabel: 'recommended report setup fix',
                role: 'ADMIN',
            }));
        } finally {
            setApplyingRecommendation(null);
        }
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
                <Card>
                    <div className="space-y-5">
                        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                            <div>
                                <h2 className="text-lg font-semibold text-gray-900">Policy Coverage Summary</h2>
                                <p className="mt-1 text-sm text-gray-600">
                                    {selectedTermOption?.label ?? 'Select a term from the compute page'}.
                                </p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                <Button
                                    type="button"
                                    variant="secondary"
                                    size="sm"
                                    onClick={handlePrepareTermForReports}
                                    disabled={!effectiveTermId || preparingTerm}
                                >
                                    {preparingTerm ? (
                                        <Loader className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <ClipboardCheck className="h-4 w-4" />
                                    )}
                                    Prepare Term for Reports
                                </Button>
                                <Button
                                    type="button"
                                    variant="secondary"
                                    size="sm"
                                    onClick={() => setAdvancedPolicyListOpen((open) => !open)}
                                >
                                    <Layers3 className="h-4 w-4" />
                                    {advancedPolicyListOpen ? 'Hide Advanced Policy Map' : 'View Advanced Policy Map'}
                                </Button>
                            </div>
                        </div>

                        {setupError ? <AppErrorBanner error={setupError} onDismiss={() => setSetupError(null)} /> : null}

                        {readinessLoading ? (
                            <LoadingSpinner message="Loading CBC policy coverage summary..." />
                        ) : (
                            <>
                                <div className="grid gap-3 md:grid-cols-4">
                                    <div className="rounded-lg border border-gray-200 p-4">
                                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Coverage</p>
                                        <p className="mt-2 text-2xl font-semibold text-gray-900">{readinessMetric(cbcEngine, 'covered_count')}</p>
                                        <p className="text-sm text-gray-600">class subjects</p>
                                    </div>
                                    <div className="rounded-lg border border-gray-200 p-4">
                                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Results</p>
                                        <p className="mt-2 text-2xl font-semibold text-gray-900">{readinessMetric(cbcEngine, 'official_result_estimate')}</p>
                                        <p className="text-sm text-gray-600">estimated official rows</p>
                                    </div>
                                    <div className="rounded-lg border border-gray-200 p-4">
                                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Exceptions</p>
                                        <p className="mt-2 text-2xl font-semibold text-gray-900">{readinessMetric(cbcEngine, 'exception_count')}</p>
                                        <p className="text-sm text-gray-600">class-subject policies</p>
                                    </div>
                                    <div className="rounded-lg border border-gray-200 p-4">
                                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Missing</p>
                                        <p className="mt-2 text-2xl font-semibold text-gray-900">{readinessMetric(cbcEngine, 'missing_count')}</p>
                                        <p className="text-sm text-gray-600">coverage gaps</p>
                                    </div>
                                </div>

                                <div className="grid gap-4 lg:grid-cols-2">
                                    <div className="rounded-lg border border-gray-200 p-4">
                                        <div className="flex items-center justify-between gap-3">
                                            <h3 className="font-semibold text-gray-900">Default Policy</h3>
                                            <Badge variant={summaryDefaultPolicy ? 'green' : 'orange'}>
                                                {summaryDefaultPolicy ? 'Active' : 'Missing'}
                                            </Badge>
                                        </div>
                                        <p className="mt-2 text-sm text-gray-700">
                                            {policyReferenceLabel(summaryDefaultPolicy)}
                                        </p>
                                        <p className="mt-1 text-sm text-gray-500">
                                            Applies to: {readinessMetric(cbcEngine, 'covered_count')} class subject{readinessMetric(cbcEngine, 'covered_count') === 1 ? '' : 's'} unless an override applies.
                                        </p>
                                    </div>

                                    <div className="rounded-lg border border-gray-200 p-4">
                                        <h3 className="font-semibold text-gray-900">Overrides / Exceptions</h3>
                                        {overrideEntries.length || exceptionRows.length ? (
                                            <div className="mt-3 space-y-2 text-sm text-gray-700">
                                                {overrideEntries.slice(0, 6).map((entry) => (
                                                    <div key={`${entry.scope}-${entry.label}`} className="flex items-start justify-between gap-3">
                                                        <span>{entry.label}</span>
                                                        <Badge variant="default">{scopeLabel(entry.scope)}</Badge>
                                                    </div>
                                                ))}
                                                {exceptionRows.slice(0, 4).map((row) => (
                                                    <div key={readinessRowLabel(row)} className="flex items-start justify-between gap-3">
                                                        <span>{readinessRowLabel(row)}</span>
                                                        <Badge variant="default">Exception</Badge>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="mt-2 text-sm text-gray-500">No overrides or exceptions are active.</p>
                                        )}
                                    </div>
                                </div>

                                <div className={`rounded-lg border px-4 py-3 text-sm ${
                                    missingRows.length || conflictRows.length
                                        ? 'border-amber-200 bg-amber-50 text-amber-900'
                                        : 'border-green-200 bg-green-50 text-green-800'
                                }`}>
                                    <div className="flex items-start gap-3">
                                        {missingRows.length || conflictRows.length ? (
                                            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
                                        ) : (
                                            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
                                        )}
                                        <div>
                                            <p className="font-semibold">
                                                {missingRows.length || conflictRows.length ? 'Missing Setup' : 'No missing setup'}
                                            </p>
                                            {missingGroups.length ? (
                                                <div className="mt-2 space-y-2">
                                                    {missingGroups.map((group) => (
                                                        <div key={group.label} className="rounded-md bg-white/70 px-3 py-2">
                                                            <p>{group.rows.length} {group.label} need coverage.</p>
                                                            <div className="mt-2 flex flex-wrap gap-2">
                                                                {safeRecommendation ? (
                                                                    <Button
                                                                        type="button"
                                                                        size="sm"
                                                                        onClick={() => handleApplyRecommendation(safeRecommendation.id)}
                                                                        disabled={Boolean(applyingRecommendation)}
                                                                    >
                                                                        {applyingRecommendation === safeRecommendation.id ? 'Applying...' : 'Apply to all in group'}
                                                                    </Button>
                                                                ) : null}
                                                                <Button type="button" variant="secondary" size="sm" onClick={() => handleOpen()}>
                                                                    Create exception
                                                                </Button>
                                                                <Button type="button" variant="secondary" size="sm" onClick={() => setAdvancedPolicyListOpen(true)}>
                                                                    Manage manually
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <p className="mt-1">0 missing.</p>
                                            )}
                                            {conflictRows.length ? (
                                                <p className="mt-2 font-medium">{conflictRows.length} conflict{conflictRows.length === 1 ? '' : 's'} need admin decision.</p>
                                            ) : null}
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </Card>
            ) : null}

            {error && (
                <ErrorBanner
                    message={error instanceof Error ? error.message : 'Failed to load CBC report policies.'}
                    onDismiss={() => {}}
                />
            )}
            {deleteError && <ErrorBanner message={deleteError} onDismiss={() => setDeleteError(null)} />}

            {isInstitutionGovernance ? (
                <Card>
                    <button
                        type="button"
                        className="flex w-full items-center justify-between text-left"
                        onClick={() => setAdvancedPolicyListOpen((open) => !open)}
                    >
                        <div>
                            <h2 className="text-lg font-semibold text-gray-900">Advanced Policy Map</h2>
                            <p className="mt-1 text-sm text-gray-600">
                                Row-by-row coverage, active policy selections, and policy copies.
                            </p>
                        </div>
                        <ChevronDown className={`h-5 w-5 text-gray-500 transition-transform ${advancedPolicyListOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {advancedPolicyListOpen ? (
                        <div className="mt-5 space-y-5">
                            <CbcTermPolicyPlanSection
                                policies={policies}
                                terms={termOptions}
                                canManage={canManagePolicies}
                                initialTermId={effectiveTermId}
                                onCreatePolicy={() => handleOpen()}
                                onRefreshPolicies={refetch}
                            />
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
                        </div>
                    ) : null}
                </Card>
            ) : (
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
            )}

            {showModal && (
                <CbcReportPolicyFormModal
                    editingPolicy={editingPolicy}
                    templatePolicy={templatePolicy}
                    defaultPolicy={editingPolicy ? null : modalDefaultPolicy}
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
