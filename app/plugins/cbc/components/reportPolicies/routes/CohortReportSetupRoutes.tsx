'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/app/components/ui/Button';
import { Card } from '@/app/components/ui/Card';
import { Select } from '@/app/components/ui/Select';
import { LoadingSpinner } from '@/app/components/ui/LoadingSpinner';
import { ErrorState } from '@/app/components/ui/ErrorState';
import { AppErrorBanner } from '@/app/components/ui/errors';
import { isSafeNextPath } from '@/app/core/auth/navigation';
import { resolveReportError, type AppError } from '@/app/core/errors';
import { useTerms } from '@/app/core/hooks/useAcademic';
import { cbcAPI } from '@/app/plugins/cbc/api/cbc';
import { CbcReportPoliciesPage } from '@/app/plugins/cbc/components/reportPolicies/CbcReportPoliciesPage';

export type ReportSetupScope = 'class' | 'subject';

export interface ComputeFailureState extends AppError {
    actionHref?: string;
}

function parsePositiveNumber(value?: string | string[] | null): number | null {
    const raw = Array.isArray(value) ? value[0] : value;
    const parsed = Number(raw ?? '');
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function useWorkspaceReturnTo(cohortId: number | null): string {
    const searchParams = useSearchParams();
    const rawReturnTo = searchParams.get('returnTo');
    if (isSafeNextPath(rawReturnTo)) {
        return rawReturnTo;
    }
    return cohortId ? `/academic/cohorts/${cohortId}` : '/academic/cohorts';
}

export function buildComputePolicyRequiredSetupHref(
    scope: ReportSetupScope,
    cohortId: number,
    cohortSubjectId?: number | null,
): string {
    if (scope === 'subject' && cohortSubjectId) {
        return `/academic/cohorts/${cohortId}/subjects/${cohortSubjectId}/report-policy?${new URLSearchParams({
            source: 'class_configuration',
            cohort: String(cohortId),
            cohort_subject: String(cohortSubjectId),
            returnTo: `/academic/cohorts/${cohortId}#subject-${cohortSubjectId}`,
        }).toString()}`;
    }

    return `/academic/cohorts/${cohortId}/report-setup?${new URLSearchParams({
        source: 'class_configuration',
        cohort: String(cohortId),
        returnTo: `/academic/cohorts/${cohortId}`,
    }).toString()}`;
}

export function resolveCbcComputeFailure(
    error: unknown,
    scope: ReportSetupScope,
    cohortId: number,
    cohortSubjectId?: number | null,
): ComputeFailureState {
    const resolved = resolveReportError(error, {
        action: 'compute',
        entityLabel: scope === 'subject' ? 'subject report' : 'class report',
        role: 'INSTRUCTOR',
    });

    if (resolved.serverCode === 'policy_required') {
        return {
            ...resolved,
            message: 'No active policy is available for this class subject and term.',
            actionHref: '/reports/policies/cbc',
        };
    }

    if (resolved.serverCode === 'class_report_policy_required') {
        return {
            ...resolved,
            actionHref: buildComputePolicyRequiredSetupHref(scope, cohortId, cohortSubjectId),
        };
    }

    return resolved;
}

export function CohortReportPolicyRoutePage({ scope }: { scope: ReportSetupScope }) {
    const params = useParams<{ id: string; cohortSubjectId?: string }>();
    const searchParams = useSearchParams();
    const cohortId = parsePositiveNumber(params.id);
    const cohortSubjectId = parsePositiveNumber(params.cohortSubjectId);
    const cbcCohortSubjectId = parsePositiveNumber(searchParams.get('cbc_cohort_subject'));
    const returnTo = useWorkspaceReturnTo(cohortId);

    if (!cohortId || (scope === 'subject' && !cohortSubjectId)) {
        return <ErrorState fullScreen={false} message="Invalid class report setup route." />;
    }

    return (
        <CbcReportPoliciesPage
            authoringMode={scope === 'subject' ? 'CLASS_SUBJECT_SETUP' : 'CLASS_SETUP'}
            cohortId={cohortId}
            lockedKernelCohortSubjectId={cohortSubjectId}
            lockedCohortSubjectId={cbcCohortSubjectId}
            returnTo={returnTo}
            backLabel="Back to workspace"
            title={scope === 'subject' ? 'Subject report policy' : 'Class report policy'}
            description="Class configuration for CBC report interpretation."
        />
    );
}

export function CohortReportComputationRoutePage({ scope }: { scope: ReportSetupScope }) {
    const params = useParams<{ id: string; cohortSubjectId?: string }>();
    const cohortId = parsePositiveNumber(params.id);
    const cohortSubjectId = parsePositiveNumber(params.cohortSubjectId);
    const returnTo = useWorkspaceReturnTo(cohortId);
    const { terms, loading } = useTerms();
    const [selectedTerm, setSelectedTerm] = useState<number | null>(null);
    const [computing, setComputing] = useState(false);
    const [message, setMessage] = useState<string | null>(null);
    const [error, setError] = useState<ComputeFailureState | null>(null);

    if (!cohortId || (scope === 'subject' && !cohortSubjectId)) {
        return <ErrorState fullScreen={false} message="Invalid class report computation route." />;
    }

    if (loading) {
        return <LoadingSpinner fullScreen={false} message="Loading terms..." />;
    }

    const handleCompute = async () => {
        if (!selectedTerm) {
            setError({
                kind: 'validation',
                title: 'Choose a term before calculating.',
                message: 'Select the term you want to calculate, then try again.',
                retryable: false,
                severity: 'warning',
                actionLabel: 'Review fields',
            });
            return;
        }
        setComputing(true);
        setError(null);
        setMessage(null);
        try {
            const result = await cbcAPI.computeAssessmentReportResults({
                source: 'class_configuration',
                term: selectedTerm,
                cohort: cohortId,
                cohort_subject: scope === 'subject' ? cohortSubjectId ?? undefined : undefined,
            });
            setMessage(result.detail);
        } catch (caught) {
            setError(resolveCbcComputeFailure(caught, scope, cohortId, cohortSubjectId));
        } finally {
            setComputing(false);
        }
    };
    const policyRequired = error?.serverCode === 'policy_required';

    return (
        <div className="mx-auto max-w-4xl space-y-6">
            <Link href={returnTo}>
                <Button variant="ghost" size="sm">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to workspace
                </Button>
            </Link>

            <div>
                <h1 className="text-2xl font-semibold text-gray-900">
                    {scope === 'subject' ? 'Subject report computation' : 'Class report computation'}
                </h1>
                <p className="mt-1 text-sm text-gray-500">Class configuration</p>
            </div>

            <Card className="space-y-4">
                <Select
                    label="Term"
                    value={selectedTerm?.toString() ?? ''}
                    onChange={(event) => setSelectedTerm(event.target.value ? Number(event.target.value) : null)}
                    options={[
                        { value: '', label: 'Select term' },
                        ...terms.map((term) => ({
                            value: String(term.id),
                            label: `${term.academic_year_name} · ${term.name}`,
                        })),
                    ]}
                />
                {error ? (
                    <div className="space-y-3">
                        <AppErrorBanner
                            error={error}
                            compact
                            onDismiss={() => setError(null)}
                            onAction={!error.actionHref && error.retryable ? handleCompute : undefined}
                        />
                        {error.actionHref ? (
                            <Link href={error.actionHref}>
                                <Button type="button" variant="secondary" size="sm">
                                    {error.actionLabel ?? 'Open setup'}
                                </Button>
                            </Link>
                        ) : null}
                        {policyRequired ? (
                            <div className="flex flex-wrap gap-2">
                                <Link href="/reports/policies/cbc">
                                    <Button type="button" variant="secondary" size="sm">Create policy</Button>
                                </Link>
                                <Link href="/reports/policies/cbc">
                                    <Button type="button" variant="secondary" size="sm">Activate existing policy</Button>
                                </Link>
                                <Link href="/reports/policies/cbc">
                                    <Button type="button" variant="secondary" size="sm">Reuse previous term policy</Button>
                                </Link>
                                <Link href="/reports/policies/cbc">
                                    <Button type="button" variant="secondary" size="sm">View policy plan</Button>
                                </Link>
                            </div>
                        ) : null}
                    </div>
                ) : null}
                {message ? <p className="text-sm font-medium text-green-700">{message}</p> : null}
                <Button type="button" onClick={handleCompute} disabled={computing || !selectedTerm}>
                    {computing ? 'Computing...' : scope === 'subject' ? 'Compute subject results' : 'Compute class results'}
                </Button>
            </Card>
        </div>
    );
}
