'use client';

import { useEffect, useMemo, useState } from 'react';
import { CheckCircle, Copy, FilePlus2, RefreshCw } from 'lucide-react';
import { Badge } from '@/app/components/ui/Badge';
import { Button } from '@/app/components/ui/Button';
import { Card } from '@/app/components/ui/Card';
import { AppErrorBanner } from '@/app/components/ui/errors';
import { LoadingSpinner } from '@/app/components/ui/LoadingSpinner';
import { Select } from '@/app/components/ui/Select';
import { resolveReportError, type AppError } from '@/app/core/errors';
import { cbcReportPolicyAPI } from '@/app/plugins/cbc/api/reportPolicies';
import { useCbcTermPolicyPlan } from '@/app/plugins/cbc/hooks/useCbcReportPolicies';
import type {
    CbcPolicyCoverageEntry,
    CbcReportPolicy,
    CbcTermPolicyPlan,
} from '@/app/plugins/cbc/types/reportPolicy';

interface TermOption {
    id: number;
    label: string;
    status?: string | null;
    is_frozen?: boolean;
}

interface CbcTermPolicyPlanSectionProps {
    policies: CbcReportPolicy[];
    terms: TermOption[];
    canManage: boolean;
    onCreatePolicy: () => void;
    onRefreshPolicies: () => Promise<unknown>;
}

function policyLabel(policy: CbcReportPolicy | null | undefined): string {
    return policy?.name ?? 'No active policy';
}

function entryLabel(entry: CbcPolicyCoverageEntry): string {
    return entry.label
        ?? [entry.cohort?.name, entry.subject?.code ?? entry.subject?.name].filter(Boolean).join(' · ')
        ?? 'Class subject';
}

function policyForEntry(entry: CbcPolicyCoverageEntry): CbcReportPolicy | null {
    return entry.effective_policy ?? entry.resolved_policy ?? null;
}

function planForCoverage(plan?: CbcTermPolicyPlan | null, legacyPlan?: CbcTermPolicyPlan | null): CbcTermPolicyPlan | null {
    return plan ?? legacyPlan ?? null;
}

export function CbcTermPolicyPlanSection({
    policies,
    terms,
    canManage,
    onCreatePolicy,
    onRefreshPolicies,
}: CbcTermPolicyPlanSectionProps) {
    const [selectedTermId, setSelectedTermId] = useState<number | null>(terms[0]?.id ?? null);
    const [selectedPolicyIds, setSelectedPolicyIds] = useState<number[]>([]);
    const [actionError, setActionError] = useState<AppError | null>(null);
    const [reusingId, setReusingId] = useState<number | null>(null);
    const [deactivatingId, setDeactivatingId] = useState<number | null>(null);
    const [advancedOpen, setAdvancedOpen] = useState(false);
    const {
        coverage,
        loading,
        error,
        refetch,
        savePlan,
        saving,
    } = useCbcTermPolicyPlan(selectedTermId, { enabled: Boolean(selectedTermId) });

    useEffect(() => {
        if (selectedTermId === null && terms[0]) {
            setSelectedTermId(terms[0].id);
        }
    }, [selectedTermId, terms]);

    const plan = planForCoverage(coverage?.plan, coverage?.term_policy_plan);
    const fallbackActivePolicies = useMemo(
        () => policies.filter((policy) => policy.is_active),
        [policies],
    );
    const activePolicies = coverage?.active_policies ?? fallbackActivePolicies;
    const entries = coverage?.entries ?? [];
    const missingEntries = entries.filter((entry) => entry.missing_policy_warning);
    const conflictEntries = entries.filter((entry) => entry.conflict_warning);
    const shadowedPolicies = coverage?.shadowed_policies ?? [];
    const termClosed = Boolean(coverage?.term?.is_frozen || coverage?.term?.status === 'CLOSED_HISTORICAL');
    const selectedTermOption = terms.find((term) => term.id === selectedTermId) ?? null;
    const selectedTargetTermAllowsReuse = Boolean(
        selectedTermId
        && !termClosed
        && selectedTermOption?.status !== 'CLOSED_HISTORICAL'
        && !selectedTermOption?.is_frozen,
    );
    const reusablePolicies = useMemo(() => (
        selectedTargetTermAllowsReuse
            ? policies.filter((policy) => policy.term && policy.term !== selectedTermId)
            : []
    ), [policies, selectedTargetTermAllowsReuse, selectedTermId]);
    const firstReusablePolicy = reusablePolicies[0] ?? null;
    const missingCount = coverage?.missing_count ?? missingEntries.length;
    const conflictCount = coverage?.conflict_count ?? conflictEntries.length;
    const readinessStatus = coverage?.readiness_status
        ?? (
            conflictCount
                ? 'CONFLICTS'
                : missingCount
                    ? 'MISSING_POLICIES'
                    : entries.length
                        ? 'READY'
                        : 'NOT_CONFIGURED'
        );
    const topState = readinessStatus === 'READY'
        ? {
            label: 'Ready',
            title: 'Ready for computation',
            description: 'Every class subject in this term has one active organization policy.',
            badge: 'green' as const,
        }
        : readinessStatus === 'CONFLICTS'
            ? {
                label: 'Conflict',
                title: `Conflict: ${conflictCount} policy conflict${conflictCount === 1 ? '' : 's'} need review`,
                description: 'Resolve duplicate active policies before reports are computed.',
                badge: 'red' as const,
            }
            : missingCount > 0
                ? {
                    label: 'Not ready',
                    title: `Not ready: ${missingCount} subject${missingCount === 1 ? '' : 's'} need a policy`,
                    description: 'Before reports are computed, every class subject in this term must have one active organization policy.',
                    badge: 'orange' as const,
                }
                : {
                    label: 'No active organization policies',
                    title: 'No active organization policies',
                    description: 'Create or reuse a policy before reports are computed.',
                    badge: 'default' as const,
                };
    const selectedTermLabel = selectedTermOption?.label ?? coverage?.term?.name ?? 'this term';

    useEffect(() => {
        if (!coverage) return;
        const selectedIds = plan?.selected_policy_ids;
        setSelectedPolicyIds(
            selectedIds?.length
                ? selectedIds
                : activePolicies.map((policy) => policy.id),
        );
    }, [activePolicies, coverage, plan]);

    const refreshAll = async () => {
        await refetch();
        await onRefreshPolicies();
    };

    const handleUseAllActive = async () => {
        if (!selectedTermId) return;
        setActionError(null);
        try {
            await savePlan({
                term_id: selectedTermId,
                use_all_active_policies: true,
                selected_policy_ids: [],
                status: 'ACTIVE',
            });
            await refreshAll();
        } catch (caught) {
            setActionError(resolveReportError(caught, {
                action: 'update',
                entityLabel: 'term policy plan',
                role: 'ADMIN',
            }));
        }
    };

    const handleSaveManualSelection = async () => {
        if (!selectedTermId) return;
        setActionError(null);
        try {
            await savePlan({
                term_id: selectedTermId,
                use_all_active_policies: false,
                selected_policy_ids: selectedPolicyIds,
                status: 'ACTIVE',
            });
            await refreshAll();
        } catch (caught) {
            setActionError(resolveReportError(caught, {
                action: 'update',
                entityLabel: 'selected term policies',
                role: 'ADMIN',
            }));
        }
    };

    const handleReuse = async (policy: CbcReportPolicy) => {
        if (!selectedTermId) return;
        setActionError(null);
        setReusingId(policy.id);
        try {
            await cbcReportPolicyAPI.reuseForTerm(policy.id, { term_id: selectedTermId, activate: false });
            await refreshAll();
        } catch (caught) {
            setActionError(resolveReportError(caught, {
                action: 'create',
                entityLabel: 'reused policy',
                role: 'ADMIN',
            }));
        } finally {
            setReusingId(null);
        }
    };

    const handleDeactivate = async (policy: CbcReportPolicy) => {
        setActionError(null);
        setDeactivatingId(policy.id);
        try {
            await cbcReportPolicyAPI.update(policy.id, { is_active: false });
            await refreshAll();
        } catch (caught) {
            setActionError(resolveReportError(caught, {
                action: 'update',
                entityLabel: 'unused policy',
                role: 'ADMIN',
            }));
        } finally {
            setDeactivatingId(null);
        }
    };

    const toggleSelectedPolicy = (policyId: number) => {
        setSelectedPolicyIds((current) => (
            current.includes(policyId)
                ? current.filter((id) => id !== policyId)
                : [...current, policyId]
        ));
    };

    return (
        <Card>
            <div className="space-y-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                        <h2 className="text-lg font-semibold text-gray-900">Term report setup</h2>
                        <p className="mt-1 text-sm text-gray-600">
                            Before reports are computed, every class subject in this term must have one active organization policy.
                        </p>
                    </div>
                    <div className="w-full max-w-xs">
                        <Select
                            label="Term"
                            value={selectedTermId?.toString() ?? ''}
                            onChange={(event) => setSelectedTermId(event.target.value ? Number(event.target.value) : null)}
                            options={[
                                { value: '', label: 'Choose term', disabled: true },
                                ...terms.map((term) => ({ value: String(term.id), label: term.label })),
                            ]}
                        />
                    </div>
                </div>

                {actionError ? <AppErrorBanner error={actionError} onDismiss={() => setActionError(null)} /> : null}
                {error ? (
                    <AppErrorBanner
                        error={resolveReportError(error, {
                            action: 'load',
                            entityLabel: 'term policy plan',
                            role: 'ADMIN',
                        })}
                        onDismiss={() => {}}
                    />
                ) : null}
                {termClosed ? (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                        This term is closed. Policies and reports are historical.
                    </div>
                ) : null}

                {loading ? (
                    <LoadingSpinner message="Loading term policy plan..." />
                ) : (
                    <>
                        <div className="rounded-lg border border-gray-200 p-4">
                            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                                <div>
                                    <Badge variant={topState.badge}>{topState.label}</Badge>
                                    <h3 className="mt-3 text-base font-semibold text-gray-900">{topState.title}</h3>
                                    <p className="mt-1 text-sm text-gray-600">{topState.description}</p>
                                </div>
                                <Button type="button" variant="ghost" onClick={() => void refreshAll()}>
                                    <RefreshCw className="mr-1.5 h-4 w-4" />
                                    Refresh
                                </Button>
                            </div>
                            <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                                This curriculum uses a plugin report engine. Scholaroscope default policy is only a template. Your organization must create or reuse a policy before reports can compute.
                            </div>
                        </div>

                        {canManage ? (
                            <div className="flex flex-wrap gap-2">
                                <Button
                                    type="button"
                                    variant="secondary"
                                    onClick={onCreatePolicy}
                                    disabled={!selectedTermId || saving}
                                >
                                    <CheckCircle className="mr-1.5 h-4 w-4" />
                                    Create one policy for all subjects
                                </Button>
                                <Button
                                    type="button"
                                    variant="secondary"
                                    onClick={() => firstReusablePolicy ? void handleReuse(firstReusablePolicy) : undefined}
                                    disabled={!selectedTermId || !firstReusablePolicy || reusingId === firstReusablePolicy.id}
                                >
                                    <Copy className="mr-1.5 h-4 w-4" />
                                    {firstReusablePolicy && reusingId === firstReusablePolicy.id ? 'Reusing...' : 'Reuse previous term policy'}
                                </Button>
                                <Button type="button" variant="ghost" onClick={onCreatePolicy}>
                                    Create policies for missing subjects
                                </Button>
                                <Button type="button" variant="ghost" onClick={() => setAdvancedOpen(true)}>
                                    <FilePlus2 className="mr-1.5 h-4 w-4" />
                                    Review active policies
                                </Button>
                            </div>
                        ) : null}

                        <div className="overflow-x-auto rounded-lg border border-gray-200">
                            <table className="min-w-full divide-y divide-gray-200 text-sm">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-3 py-2 text-left font-medium text-gray-500">Class subject</th>
                                        <th className="px-3 py-2 text-left font-medium text-gray-500">Report policy</th>
                                        <th className="px-3 py-2 text-left font-medium text-gray-500">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {entries.length === 0 ? (
                                        <tr>
                                            <td className="px-3 py-6 text-center text-gray-500" colSpan={3}>
                                                No class subjects are configured for this term.
                                            </td>
                                        </tr>
                                    ) : entries.map((entry) => {
                                        const effectivePolicy = policyForEntry(entry);
                                        const entryStatus = entry.status ?? entry.policy_status ?? (entry.computation_allowed ? 'READY' : 'MISSING');
                                        const rowNeedsPolicy = entryStatus === 'MISSING' || Boolean(entry.missing_policy_warning);
                                        const rowMessage = rowNeedsPolicy
                                            ? `${entry.cohort?.name ?? 'Class subject'} - ${entry.subject?.name ?? 'Subject'} needs a report policy for ${selectedTermLabel}.`
                                            : entry.conflict_warning ?? entry.message ?? 'Ready for computation.';
                                        return (
                                            <tr key={entry.cbc_cohort_subject_id ?? entry.cohort_subject_id ?? entry.label}>
                                                <td className="px-3 py-3 font-medium text-gray-900">{entryLabel(entry)}</td>
                                                <td className="px-3 py-3">{policyLabel(effectivePolicy)}</td>
                                                <td className="px-3 py-3">
                                                    <Badge variant={entryStatus === 'READY' ? 'green' : entryStatus === 'CONFLICT' ? 'red' : 'orange'}>
                                                        {entryStatus === 'READY' ? 'Ready' : entryStatus === 'CONFLICT' ? 'Conflict' : 'Missing'}
                                                    </Badge>
                                                    <p className="mt-1 text-xs text-gray-600">{rowMessage}</p>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {activePolicies.length === 0 ? (
                            <div className="rounded-lg border border-dashed border-gray-300 px-4 py-6 text-sm text-gray-600">
                                No active organization policies are available for this term.
                            </div>
                        ) : null}

                        <div className="rounded-lg border border-gray-200">
                            <button
                                type="button"
                                onClick={() => setAdvancedOpen((current) => !current)}
                                className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-semibold text-gray-900"
                            >
                                Advanced details
                                <span className="text-xs font-normal text-gray-500">
                                    {advancedOpen ? 'Hide' : 'Show'}
                                </span>
                            </button>
                            {advancedOpen ? (
                                <div className="space-y-4 border-t border-gray-200 p-4">
                                    <p className="text-sm text-gray-600">
                                        Scholaroscope will use active policies according to the most specific match.
                                    </p>
                                    {plan ? (
                                        <div className="flex flex-wrap gap-2 text-xs text-gray-600">
                                            <Badge variant="default">Saved plan {coverage?.status ?? plan.status}</Badge>
                                            <Badge variant="default">Selected policy ids {plan.selected_policy_ids.length}</Badge>
                                        </div>
                                    ) : null}
                                    <div className="grid gap-4 lg:grid-cols-2">
                                        <div className="rounded-lg border border-gray-200 p-3">
                                            <h3 className="text-sm font-semibold text-gray-900">Active policies</h3>
                                            <div className="mt-3 space-y-2">
                                                {activePolicies.length === 0 ? (
                                                    <p className="text-sm text-gray-500">No active policies for this organization.</p>
                                                ) : activePolicies.map((policy) => (
                                                    <label key={policy.id} className="flex items-start gap-2 text-sm text-gray-700">
                                                        <input
                                                            type="checkbox"
                                                            className="mt-1 rounded border-gray-300"
                                                            checked={selectedPolicyIds.includes(policy.id)}
                                                            onChange={() => toggleSelectedPolicy(policy.id)}
                                                            disabled={!canManage}
                                                        />
                                                        <span>
                                                            <span className="font-medium text-gray-900">{policy.name}</span>
                                                            <span className="ml-1 text-xs text-gray-500">
                                                                {policy.term_name ?? 'Any term'}
                                                            </span>
                                                        </span>
                                                    </label>
                                                ))}
                                            </div>
                                            {canManage ? (
                                                <div className="mt-3 flex flex-wrap gap-2">
                                                    <Button
                                                        type="button"
                                                        variant="secondary"
                                                        onClick={() => void handleUseAllActive()}
                                                        disabled={!selectedTermId || saving}
                                                    >
                                                        Use active policies
                                                    </Button>
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        onClick={() => void handleSaveManualSelection()}
                                                        disabled={!selectedTermId || saving}
                                                    >
                                                        Save selected policies
                                                    </Button>
                                                </div>
                                            ) : null}
                                        </div>
                                        <div className="rounded-lg border border-gray-200 p-3">
                                            <h3 className="text-sm font-semibold text-gray-900">Resolution path</h3>
                                            <div className="mt-3 space-y-2 text-xs text-gray-600">
                                                {entries.slice(0, 6).map((entry) => (
                                                    <div key={entry.cbc_cohort_subject_id ?? entry.cohort_subject_id ?? entry.label}>
                                                        <p className="font-medium text-gray-800">{entryLabel(entry)}</p>
                                                        <p>{entry.resolution_path.join(' > ') || 'No resolution path'}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                    {shadowedPolicies.length ? (
                                        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                                            <h3 className="text-sm font-semibold text-amber-900">Unused active policies</h3>
                                            <div className="mt-2 space-y-2">
                                                {shadowedPolicies.map((item) => (
                                                    <div key={item.policy.id} className="text-sm text-amber-800">
                                                        <p className="font-medium">{item.policy.name}</p>
                                                        <p>{item.warning}</p>
                                                        {canManage ? (
                                                            <Button
                                                                type="button"
                                                                size="sm"
                                                                variant="ghost"
                                                                onClick={() => void handleDeactivate(item.policy)}
                                                                disabled={deactivatingId === item.policy.id}
                                                                className="mt-1"
                                                            >
                                                                Deactivate unused policy
                                                            </Button>
                                                        ) : null}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ) : null}
                                </div>
                            ) : null}
                        </div>
                    </>
                )}
            </div>
        </Card>
    );
}
