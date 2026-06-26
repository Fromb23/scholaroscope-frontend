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
import { isSafeNextPath } from '@/app/core/auth/navigation';
import { useTerms } from '@/app/core/hooks/useAcademic';
import { cbcAPI } from '@/app/plugins/cbc/api/cbc';
import { CbcReportPoliciesPage } from '@/app/plugins/cbc/components/reportPolicies/CbcReportPoliciesPage';

type ReportSetupScope = 'class' | 'subject';

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
    const [error, setError] = useState<string | null>(null);

    if (!cohortId || (scope === 'subject' && !cohortSubjectId)) {
        return <ErrorState fullScreen={false} message="Invalid class report computation route." />;
    }

    if (loading) {
        return <LoadingSpinner fullScreen={false} message="Loading terms..." />;
    }

    const handleCompute = async () => {
        if (!selectedTerm) {
            setError('Select a term before computing results.');
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
            setError(caught instanceof Error ? caught.message : 'Failed to compute CBC results.');
        } finally {
            setComputing(false);
        }
    };

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
                {error ? <p className="text-sm font-medium text-red-700">{error}</p> : null}
                {message ? <p className="text-sm font-medium text-green-700">{message}</p> : null}
                <Button type="button" onClick={handleCompute} disabled={computing || !selectedTerm}>
                    {computing ? 'Computing...' : scope === 'subject' ? 'Compute subject results' : 'Compute class results'}
                </Button>
            </Card>
        </div>
    );
}
