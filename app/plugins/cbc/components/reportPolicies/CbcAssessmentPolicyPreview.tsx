'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Puzzle } from 'lucide-react';
import { Badge } from '@/app/components/ui/Badge';
import { Button } from '@/app/components/ui/Button';
import { Card } from '@/app/components/ui/Card';
import { cbcReportPolicyAPI } from '@/app/plugins/cbc/api/reportPolicies';
import type { CbcReportPolicy } from '@/app/plugins/cbc/types/reportPolicy';
import type { AssessmentPolicyPreviewContext } from '@/app/core/registry/assessmentPolicyPreviews';
import { useAuth } from '@/app/context/AuthContext';
import { canManageCbcReportPolicyAuthoring } from '@/app/plugins/cbc/components/reportPolicies/reportPolicyAuthoringAccess';
import { buildCbcPolicyRuleSummary } from '@/app/plugins/cbc/components/reportPolicies/policySummaries';

type CbcPreviewState =
    | { status: 'loading' }
    | {
        status: 'ready';
        source: 'resolved' | 'term_fallback' | 'default' | 'no_policy';
        policy: CbcReportPolicy | null;
    }
    | { status: 'error'; message: string };

function firstMatchingPolicy(
    policies: CbcReportPolicy[],
    predicate: (policy: CbcReportPolicy) => boolean,
): CbcReportPolicy | null {
    return policies.find(predicate) ?? null;
}

function resolveCbcSubjectId(context: AssessmentPolicyPreviewContext): number | null {
    if (typeof context.subject.cbc_cohort_subject_id === 'number') {
        return context.subject.cbc_cohort_subject_id;
    }

    if (
        context.subject.subject_source === 'cbc'
        && typeof context.subject.teaching_link_id === 'number'
    ) {
        return context.subject.teaching_link_id;
    }

    return null;
}

export function CbcAssessmentPolicyPreview(context: AssessmentPolicyPreviewContext) {
    const { termId, subject } = context;
    const { user, capabilities, loading: authLoading } = useAuth();
    const [preview, setPreview] = useState<CbcPreviewState>({ status: 'loading' });
    const canManagePolicyRoutes = !authLoading && canManageCbcReportPolicyAuthoring({
        user,
        capabilities,
        authoringMode: 'INSTITUTION_GOVERNANCE',
    });
    const cbcSubjectId = resolveCbcSubjectId(context);
    const subjectProfileId = subject.subject_profile_id ?? null;

    useEffect(() => {
        let cancelled = false;

        async function loadPreview() {
            try {
                setPreview({ status: 'loading' });

                if (cbcSubjectId && termId !== null) {
                    const exactTermPolicies = await cbcReportPolicyAPI.getAll({
                        cbc_cohort_subject: cbcSubjectId,
                        term: termId,
                        is_active: true,
                    });
                    const exactTermPolicy = exactTermPolicies[0] ?? null;

                    if (cancelled) return;
                    if (exactTermPolicy) {
                        setPreview({ status: 'ready', source: 'resolved', policy: exactTermPolicy });
                        return;
                    }
                }

                if (cbcSubjectId) {
                    const cohortPolicies = await cbcReportPolicyAPI.getAll({
                        cbc_cohort_subject: cbcSubjectId,
                        is_active: true,
                    });
                    const exactCohortPolicy = firstMatchingPolicy(
                        cohortPolicies,
                        (policy) => policy.term === null,
                    );

                    if (cancelled) return;
                    if (exactCohortPolicy) {
                        setPreview({ status: 'ready', source: 'resolved', policy: exactCohortPolicy });
                        return;
                    }
                }

                if (subjectProfileId && termId !== null) {
                    const profileTermPolicies = await cbcReportPolicyAPI.getAll({
                        subject_profile: subjectProfileId,
                        term: termId,
                        is_active: true,
                    });
                    const profileTermPolicy = firstMatchingPolicy(
                        profileTermPolicies,
                        (policy) => policy.cbc_cohort_subject === null,
                    );

                    if (cancelled) return;
                    if (profileTermPolicy) {
                        setPreview({ status: 'ready', source: 'resolved', policy: profileTermPolicy });
                        return;
                    }
                }

                if (subjectProfileId) {
                    const profilePolicies = await cbcReportPolicyAPI.getAll({
                        subject_profile: subjectProfileId,
                        is_active: true,
                    });
                    const profilePolicy = firstMatchingPolicy(
                        profilePolicies,
                        (policy) => policy.cbc_cohort_subject === null && policy.term === null,
                    );

                    if (cancelled) return;
                    if (profilePolicy) {
                        setPreview({ status: 'ready', source: 'resolved', policy: profilePolicy });
                        return;
                    }
                }

                if (termId !== null) {
                    const termPolicies = await cbcReportPolicyAPI.getAll({
                        term: termId,
                        is_active: true,
                    });
                    const termOnlyPolicy = firstMatchingPolicy(
                        termPolicies,
                        (policy) => policy.subject_profile === null && policy.cbc_cohort_subject === null,
                    );

                    if (cancelled) return;
                    if (termOnlyPolicy) {
                        setPreview({ status: 'ready', source: 'term_fallback', policy: termOnlyPolicy });
                        return;
                    }
                }

                const defaultPolicies = await cbcReportPolicyAPI.getAll({
                    is_default: true,
                    is_active: true,
                });
                const defaultPolicy = defaultPolicies[0] ?? null;

                if (cancelled) return;

                setPreview({
                    status: 'ready',
                    source: defaultPolicy ? 'default' : 'no_policy',
                    policy: defaultPolicy,
                });
            } catch (error) {
                if (cancelled) return;
                setPreview({
                    status: 'error',
                    message: error instanceof Error ? error.message : 'Failed to resolve CBC policy preview.',
                });
            }
        }

        void loadPreview();

        return () => {
            cancelled = true;
        };
    }, [cbcSubjectId, subjectProfileId, termId]);

    const detailHref = (
        preview.status === 'ready'
        && preview.policy?.id
    )
        ? `/cbc/report-policies/${preview.policy.id}`
        : '/cbc/report-policies';
    const actionLabel = (
        preview.status === 'ready'
        && preview.policy?.id
    )
        ? 'View CBC Report Policy'
        : 'Manage CBC Report Policies';

    const renderPolicyAction = () => {
        if (authLoading) {
            return null;
        }

        if (!canManagePolicyRoutes) {
            return (
                <p className="text-sm text-gray-500">
                    Policy managed by administrator.
                </p>
            );
        }

        return (
            <Link href={detailHref}>
                <Button variant="secondary" size="sm">
                    {actionLabel}
                    <ArrowRight className="ml-1.5 h-4 w-4" />
                </Button>
            </Link>
        );
    };

    return (
        <Card>
            <div className="space-y-4">
                <div className="flex items-start justify-between gap-4">
                    <div className="space-y-2">
                        <div className="flex items-center gap-2">
                            <Puzzle className="h-5 w-5 text-green-600" />
                            <h2 className="text-base font-semibold text-gray-900">CBC Report Policy</h2>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <Badge variant="green">Plugin-owned</Badge>
                            {preview.status === 'ready' && preview.source === 'term_fallback' && (
                                <Badge variant="indigo">Term fallback policy</Badge>
                            )}
                            {preview.status === 'ready' && preview.source === 'default' && (
                                <Badge variant="orange">Default fallback policy</Badge>
                            )}
                            {preview.status === 'ready' && preview.source === 'no_policy' && (
                                <Badge variant="default">No policy assigned</Badge>
                            )}
                        </div>
                    </div>
                    {renderPolicyAction()}
                </div>

                {preview.status === 'loading' && (
                    <p className="text-sm text-gray-500">Loading resolved policy context…</p>
                )}

                {preview.status === 'error' && (
                    <p className="text-sm text-red-600">{preview.message}</p>
                )}

                {preview.status === 'ready' && preview.source === 'no_policy' && (
                    <p className="text-sm text-gray-600">
                        No CBC report policy assigned for this assessment context.
                    </p>
                )}

                {preview.status === 'ready' && preview.source !== 'no_policy' && preview.policy && (
                    <div className="space-y-4">
                        <div className="flex flex-wrap gap-2">
                            {preview.policy.term_name && <Badge variant="indigo">{preview.policy.term_name}</Badge>}
                            <Badge variant={preview.policy.is_active ? 'green' : 'red'}>
                                {preview.policy.is_active ? 'Active' : 'Inactive'}
                            </Badge>
                        </div>

                        <div>
                            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Assessment Weights</p>
                            <div className="mt-2 flex flex-wrap gap-2">
                                {Object.entries(preview.policy.assessment_weights).map(([type, weight]) => (
                                    <Badge key={type} variant="blue">{type} {weight}%</Badge>
                                ))}
                            </div>
                        </div>

                        <div>
                            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Policy Summary</p>
                            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-gray-700">
                                {buildCbcPolicyRuleSummary(preview.policy).map((line) => (
                                    <li key={line}>{line}</li>
                                ))}
                            </ul>
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                            <div>
                                <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Required Components</p>
                                <div className="mt-2 flex flex-wrap gap-2">
                                    {(preview.policy.required_components.length > 0 ? preview.policy.required_components : ['None']).map((entry) => (
                                        <Badge key={entry} variant="purple">{entry}</Badge>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Diagnostic Assessment Types</p>
                                <div className="mt-2 flex flex-wrap gap-2">
                                    {(preview.policy.diagnostic_assessment_types.length > 0 ? preview.policy.diagnostic_assessment_types : ['None']).map((entry) => (
                                        <Badge key={entry} variant="green">{entry}</Badge>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200 text-sm">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-3 py-2 text-left font-medium text-gray-500">Min</th>
                                        <th className="px-3 py-2 text-left font-medium text-gray-500">Max</th>
                                        <th className="px-3 py-2 text-left font-medium text-gray-500">Performance Level</th>
                                        <th className="px-3 py-2 text-left font-medium text-gray-500">Actual Level</th>
                                        <th className="px-3 py-2 text-left font-medium text-gray-500">Label</th>
                                        <th className="px-3 py-2 text-left font-medium text-gray-500">Points</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {preview.policy.level_scale.map((row) => (
                                        <tr key={row.code}>
                                            <td className="px-3 py-2">{row.min}</td>
                                            <td className="px-3 py-2">{row.max}</td>
                                            <td className="px-3 py-2">{row.level}</td>
                                            <td className="px-3 py-2">{row.code}</td>
                                            <td className="px-3 py-2">{row.label}</td>
                                            <td className="px-3 py-2">{row.points}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </Card>
    );
}
