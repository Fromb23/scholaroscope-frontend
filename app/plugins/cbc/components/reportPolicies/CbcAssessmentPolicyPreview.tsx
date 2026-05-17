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

type CbcPreviewState =
    | { status: 'loading' }
    | { status: 'ready'; source: 'resolved' | 'default' | 'module_only'; policy: CbcReportPolicy | null }
    | { status: 'error'; message: string };

function chooseCbcPolicy(
    policies: CbcReportPolicy[],
    termId: number | null,
    cbcCohortSubjectId?: number | null,
    subjectProfileId?: number | null,
): CbcReportPolicy | null {
    if (!policies.length) return null;

    const sorted = [...policies].sort((left, right) => {
        const leftScore =
            Number(left.term === termId)
            + Number(left.cbc_cohort_subject === (cbcCohortSubjectId ?? null))
            + Number(left.subject_profile === (subjectProfileId ?? null))
            + Number(left.is_default);
        const rightScore =
            Number(right.term === termId)
            + Number(right.cbc_cohort_subject === (cbcCohortSubjectId ?? null))
            + Number(right.subject_profile === (subjectProfileId ?? null))
            + Number(right.is_default);

        return rightScore - leftScore;
    });

    return sorted[0] ?? null;
}

export function CbcAssessmentPolicyPreview({
    termId,
    subject,
}: AssessmentPolicyPreviewContext) {
    const [preview, setPreview] = useState<CbcPreviewState>({ status: 'loading' });
    const cbcSubjectId = subject.cbc_cohort_subject_id ?? subject.id;

    useEffect(() => {
        let cancelled = false;

        async function loadPreview() {
            try {
                setPreview({ status: 'loading' });

                const exactPolicies = await cbcReportPolicyAPI.getAll({
                    cbc_cohort_subject: cbcSubjectId,
                    term: termId ?? undefined,
                    is_active: true,
                });
                const exactPolicy = chooseCbcPolicy(
                    exactPolicies,
                    termId,
                    cbcSubjectId,
                    subject.subject_profile_id ?? null,
                );

                if (cancelled) return;

                if (exactPolicy) {
                    setPreview({
                        status: 'ready',
                        source: exactPolicy.is_default ? 'default' : 'resolved',
                        policy: exactPolicy,
                    });
                    return;
                }

                if (subject.subject_profile_id) {
                    const profilePolicies = await cbcReportPolicyAPI.getAll({
                        subject_profile: subject.subject_profile_id,
                        term: termId ?? undefined,
                        is_active: true,
                    });
                    const profilePolicy = chooseCbcPolicy(
                        profilePolicies,
                        termId,
                        cbcSubjectId,
                        subject.subject_profile_id,
                    );

                    if (cancelled) return;

                    if (profilePolicy) {
                        setPreview({
                            status: 'ready',
                            source: profilePolicy.is_default ? 'default' : 'resolved',
                            policy: profilePolicy,
                        });
                        return;
                    }
                }

                const defaultPolicies = await cbcReportPolicyAPI.getAll({
                    is_default: true,
                    is_active: true,
                });
                const defaultPolicy = chooseCbcPolicy(
                    defaultPolicies,
                    termId,
                    cbcSubjectId,
                    subject.subject_profile_id ?? null,
                );

                if (cancelled) return;

                setPreview({
                    status: 'ready',
                    source: defaultPolicy ? 'default' : 'module_only',
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
    }, [cbcSubjectId, subject.subject_profile_id, termId]);

    const detailHref = (
        preview.status === 'ready'
        && preview.source === 'resolved'
        && preview.policy?.id
    )
        ? `/cbc/report-policies/${preview.policy.id}`
        : '/cbc/report-policies';
    const actionLabel = (
        preview.status === 'ready'
        && preview.source === 'resolved'
    )
        ? 'View CBC Report Policy'
        : 'Manage CBC Report Policies';

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
                            {preview.status === 'ready' && preview.source === 'default' && (
                                <Badge variant="orange">Default / fallback preview</Badge>
                            )}
                            {preview.status === 'ready' && preview.source === 'module_only' && (
                                <Badge variant="default">Preview unavailable</Badge>
                            )}
                        </div>
                    </div>
                    <Link href={detailHref}>
                        <Button variant="secondary" size="sm">
                            {actionLabel}
                            <ArrowRight className="ml-1.5 h-4 w-4" />
                        </Button>
                    </Link>
                </div>

                {preview.status === 'loading' && (
                    <p className="text-sm text-gray-500">Loading resolved policy context…</p>
                )}

                {preview.status === 'error' && (
                    <p className="text-sm text-red-600">{preview.message}</p>
                )}

                {preview.status === 'ready' && preview.source === 'module_only' && (
                    <p className="text-sm text-gray-600">
                        Policy authoring is managed in CBC Report Policies. No resolved preview is available from the current API surface.
                    </p>
                )}

                {preview.status === 'ready' && preview.source !== 'module_only' && preview.policy && (
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
