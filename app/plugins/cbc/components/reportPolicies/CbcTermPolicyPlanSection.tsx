'use client';

import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle, Copy, FilePlus2, RefreshCw } from 'lucide-react';
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
                        <h2 className="text-lg font-semibold text-gray-900">Term Policy Plan</h2>
                        <p className="mt-1 text-sm text-gray-600">
                            {coverage?.manual_selection_notice
                                ?? 'If you do not manually select policies, Scholaroscope will intentionally use all active policies according to specificity rules.'}
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
                        <div className="flex flex-wrap gap-2">
                            <Badge variant={coverage?.computation_allowed ? 'green' : 'red'}>
                                {coverage?.computation_allowed ? 'Computation allowed' : 'Computation blocked'}
                            </Badge>
                            <Badge variant={missingEntries.length ? 'orange' : 'default'}>
                                Missing {coverage?.missing_count ?? missingEntries.length}
                            </Badge>
                            <Badge variant={conflictEntries.length ? 'red' : 'default'}>
                                Conflicts {coverage?.conflict_count ?? conflictEntries.length}
                            </Badge>
                            <Badge variant={shadowedPolicies.length ? 'orange' : 'default'}>
                                Shadowed {shadowedPolicies.length}
                            </Badge>
                            {plan ? <Badge variant="blue">Plan {plan.status}</Badge> : null}
                        </div>

                        {canManage ? (
                            <div className="flex flex-wrap gap-2">
                                <Button
                                    type="button"
                                    variant="secondary"
                                    onClick={() => void handleUseAllActive()}
                                    disabled={!selectedTermId || saving}
                                >
                                    <CheckCircle className="mr-1.5 h-4 w-4" />
                                    Use all active policies by specificity
                                </Button>
                                <Button
                                    type="button"
                                    variant="secondary"
                                    onClick={() => void handleSaveManualSelection()}
                                    disabled={!selectedTermId || saving}
                                >
                                    Save selected policies
                                </Button>
                                <Button type="button" variant="ghost" onClick={() => void refreshAll()}>
                                    <RefreshCw className="mr-1.5 h-4 w-4" />
                                    Refresh plan
                                </Button>
                                <Button type="button" variant="ghost" onClick={onCreatePolicy}>
                                    <FilePlus2 className="mr-1.5 h-4 w-4" />
                                    Create missing policy
                                </Button>
                            </div>
                        ) : null}

                        <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
                            <div className="overflow-x-auto rounded-lg border border-gray-200">
                                <table className="min-w-full divide-y divide-gray-200 text-sm">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-3 py-2 text-left font-medium text-gray-500">Class subject</th>
                                            <th className="px-3 py-2 text-left font-medium text-gray-500">Effective policy</th>
                                            <th className="px-3 py-2 text-left font-medium text-gray-500">Status</th>
                                            <th className="px-3 py-2 text-left font-medium text-gray-500">Resolution path</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200">
                                        {entries.length === 0 ? (
                                            <tr>
                                                <td className="px-3 py-6 text-center text-gray-500" colSpan={4}>
                                                    No class subjects are registered for this term.
                                                </td>
                                            </tr>
                                        ) : entries.map((entry) => {
                                            const effectivePolicy = policyForEntry(entry);
                                            return (
                                                <tr key={entry.cbc_cohort_subject_id ?? entry.cohort_subject_id ?? entry.label}>
                                                    <td className="px-3 py-3 font-medium text-gray-900">{entryLabel(entry)}</td>
                                                    <td className="px-3 py-3">{policyLabel(effectivePolicy)}</td>
                                                    <td className="px-3 py-3">
                                                        <Badge variant={entry.computation_allowed ? 'green' : 'red'}>
                                                            {entry.policy_status ?? 'Unknown'}
                                                        </Badge>
                                                        {entry.missing_policy_warning ? (
                                                            <p className="mt-1 text-xs text-red-700">{entry.missing_policy_warning}</p>
                                                        ) : null}
                                                        {entry.conflict_warning ? (
                                                            <p className="mt-1 text-xs text-red-700">{entry.conflict_warning}</p>
                                                        ) : null}
                                                    </td>
                                                    <td className="px-3 py-3 text-xs text-gray-500">
                                                        {entry.resolution_path.join(' > ') || 'No resolution path'}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>

                            <div className="space-y-4">
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
                                </div>

                                {missingEntries.length ? (
                                    <div className="rounded-lg border border-red-200 bg-red-50 p-3">
                                        <h3 className="flex items-center gap-2 text-sm font-semibold text-red-800">
                                            <AlertTriangle className="h-4 w-4" />
                                            Missing policy scopes
                                        </h3>
                                        <ul className="mt-2 space-y-1 text-sm text-red-700">
                                            {missingEntries.slice(0, 5).map((entry) => (
                                                <li key={entry.cbc_cohort_subject_id ?? entry.label}>{entryLabel(entry)}</li>
                                            ))}
                                        </ul>
                                    </div>
                                ) : null}

                                {conflictEntries.length ? (
                                    <div className="rounded-lg border border-red-200 bg-red-50 p-3">
                                        <h3 className="text-sm font-semibold text-red-800">Resolve conflict</h3>
                                        <p className="mt-1 text-sm text-red-700">
                                            Multiple active policies exist at the same specificity for at least one class subject.
                                        </p>
                                    </div>
                                ) : null}

                                {shadowedPolicies.length ? (
                                    <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                                        <h3 className="text-sm font-semibold text-amber-900">Shadowed active policies</h3>
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

                                {reusablePolicies.length ? (
                                    <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
                                        <h3 className="text-sm font-semibold text-blue-900">Reuse policy for new term</h3>
                                        <p className="mt-1 text-sm text-blue-800">
                                            Old policy remains historical. New copy will govern the new term.
                                        </p>
                                        <div className="mt-2 space-y-2">
                                            {reusablePolicies.slice(0, 3).map((policy) => (
                                                <Button
                                                    key={policy.id}
                                                    type="button"
                                                    size="sm"
                                                    variant="secondary"
                                                    onClick={() => void handleReuse(policy)}
                                                    disabled={!selectedTermId || reusingId === policy.id}
                                                >
                                                    <Copy className="mr-1.5 h-4 w-4" />
                                                    {reusingId === policy.id ? 'Reusing...' : `Reuse ${policy.name}`}
                                                </Button>
                                            ))}
                                        </div>
                                    </div>
                                ) : null}
                            </div>
                        </div>
                    </>
                )}
            </div>
        </Card>
    );
}
