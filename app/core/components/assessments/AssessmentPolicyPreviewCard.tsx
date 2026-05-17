'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Award } from 'lucide-react';
import { Badge } from '@/app/components/ui/Badge';
import { Button } from '@/app/components/ui/Button';
import { Card } from '@/app/components/ui/Card';
import { useCohortSubjects } from '@/app/core/hooks/useCohorts';
import { gradePolicyAPI } from '@/app/core/api/gradePolicy';
import {
    getPolicySurfaceForCurriculumType,
    type PolicySurfaceDefinition,
} from '@/app/core/lib/policySurfaces';
import {
    renderAssessmentPolicyPreviewExtension,
    type AssessmentPolicyPreviewSubject,
} from '@/app/core/registry/assessmentPolicyPreviews';
import type { GradePolicy } from '@/app/core/types/gradePolicy';
import { usePlugins } from '@/app/core/hooks/usePlugins';

type GenericPreviewState =
    | { status: 'idle' | 'loading'; surface: PolicySurfaceDefinition | null }
    | {
        status: 'ready';
        surface: PolicySurfaceDefinition | null;
        source: 'resolved' | 'module_only';
        policy: GradePolicy | null;
    }
    | { status: 'error'; surface: PolicySurfaceDefinition | null; message: string };

interface AssessmentPolicyPreviewCardProps {
    cohortId?: number | null;
    cohortSubjectId?: number | null;
    termId?: number | null;
}

function renderGenericPolicyDetails(policy: GradePolicy) {
    return (
        <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
                <Badge variant="purple">{policy.aggregation_method}</Badge>
                {policy.is_default && <Badge variant="orange">Default policy</Badge>}
                <Badge variant={policy.is_active ? 'green' : 'red'}>
                    {policy.is_active ? 'Active' : 'Inactive'}
                </Badge>
            </div>

            <div>
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Weights</p>
                <div className="mt-2 flex flex-wrap gap-2">
                    {Object.entries(policy.default_weighting).map(([type, weight]) => (
                        <Badge key={type} variant="blue">{type} {weight}%</Badge>
                    ))}
                </div>
            </div>

            <div>
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Required Components</p>
                <div className="mt-2 flex flex-wrap gap-2">
                    {(policy.required_components.length > 0 ? policy.required_components : ['None']).map((entry) => (
                        <Badge key={entry} variant="green">{entry}</Badge>
                    ))}
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-3 py-2 text-left font-medium text-gray-500">Min</th>
                            <th className="px-3 py-2 text-left font-medium text-gray-500">Max</th>
                            <th className="px-3 py-2 text-left font-medium text-gray-500">Grade</th>
                            <th className="px-3 py-2 text-left font-medium text-gray-500">Label</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {policy.grading_scale.map((band) => (
                            <tr key={`${band.grade}-${band.min}`}>
                                <td className="px-3 py-2">{band.min}</td>
                                <td className="px-3 py-2">{band.max ?? '—'}</td>
                                <td className="px-3 py-2">{band.grade}</td>
                                <td className="px-3 py-2">{band.label ?? '—'}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

export function AssessmentPolicyPreviewCard({
    cohortId = null,
    cohortSubjectId = null,
    termId = null,
}: AssessmentPolicyPreviewCardProps) {
    const { plugins, loading: pluginsLoading } = usePlugins();
    const { subjects, loading: subjectsLoading } = useCohortSubjects(cohortId ?? undefined);
    const selectedSubject = useMemo(
        () => (subjects as AssessmentPolicyPreviewSubject[]).find((subject) => subject.id === cohortSubjectId) ?? null,
        [cohortSubjectId, subjects],
    );
    const surface = useMemo(
        () => getPolicySurfaceForCurriculumType(selectedSubject?.curriculum_type, plugins),
        [plugins, selectedSubject?.curriculum_type],
    );
    const [preview, setPreview] = useState<GenericPreviewState>({
        status: cohortSubjectId ? 'loading' : 'idle',
        surface,
    });

    const pluginPreview = useMemo(() => {
        if (!selectedSubject || !cohortId || !cohortSubjectId || surface?.key === 'generic') {
            return null;
        }

        return renderAssessmentPolicyPreviewExtension({
            cohortId,
            cohortSubjectId,
            termId,
            subject: selectedSubject,
        });
    }, [cohortId, cohortSubjectId, selectedSubject, surface?.key, termId]);

    useEffect(() => {
        let cancelled = false;

        async function loadGenericPreview() {
            if (!cohortSubjectId) {
                setPreview({ status: 'idle', surface: null });
                return;
            }

            if (subjectsLoading || pluginsLoading) {
                setPreview({ status: 'loading', surface });
                return;
            }

            if (!selectedSubject) {
                setPreview({
                    status: 'error',
                    surface,
                    message: 'Policy preview is unavailable until the cohort subject metadata loads.',
                });
                return;
            }

            if (!surface) {
                setPreview({
                    status: 'ready',
                    surface: null,
                    source: 'module_only',
                    policy: null,
                });
                return;
            }

            if (surface.key !== 'generic') {
                setPreview({
                    status: 'ready',
                    surface,
                    source: 'module_only',
                    policy: null,
                });
                return;
            }

            setPreview({ status: 'loading', surface });

            try {
                const policy = await gradePolicyAPI.getForContext({
                    cohort_subject_id: cohortSubjectId,
                    cohort_id: cohortId ?? undefined,
                    term_id: termId ?? undefined,
                });

                if (cancelled) return;

                setPreview({
                    status: 'ready',
                    surface,
                    source: 'resolved',
                    policy,
                });
            } catch (error) {
                const status = (
                    error as { response?: { status?: number } }
                ).response?.status;

                if (cancelled) return;

                if (status === 404) {
                    setPreview({
                        status: 'ready',
                        surface,
                        source: 'module_only',
                        policy: null,
                    });
                    return;
                }

                setPreview({
                    status: 'error',
                    surface,
                    message: error instanceof Error ? error.message : 'Failed to resolve policy preview.',
                });
            }
        }

        void loadGenericPreview();

        return () => {
            cancelled = true;
        };
    }, [cohortId, cohortSubjectId, pluginsLoading, selectedSubject, subjectsLoading, surface, termId]);

    if (!cohortId || !cohortSubjectId) {
        return (
            <Card>
                <div className="space-y-2">
                    <h2 className="text-base font-semibold text-gray-900">Report Policy Preview</h2>
                    <p className="text-sm text-gray-600">
                        Select a cohort subject to preview the report policy context that will interpret this assessment.
                    </p>
                </div>
            </Card>
        );
    }

    if (surface?.key !== 'generic' && pluginPreview) {
        return <>{pluginPreview}</>;
    }

    if (!surface) {
        return (
            <Card>
                <div className="space-y-4">
                    <div className="flex items-start justify-between gap-4">
                        <div className="space-y-2">
                            <div className="flex items-center gap-2">
                                <Award className="h-5 w-5 text-gray-400" />
                                <h2 className="text-base font-semibold text-gray-900">Report Policy Module</h2>
                            </div>
                            <Badge variant="default">Unavailable</Badge>
                        </div>
                        <Link href="/reports/policies">
                            <Button variant="secondary" size="sm">
                                Open Policy Hub
                                <ArrowRight className="ml-1.5 h-4 w-4" />
                            </Button>
                        </Link>
                    </div>
                    <p className="text-sm text-gray-600">
                        No report policy module is available for this subject&apos;s curriculum yet.
                    </p>
                </div>
            </Card>
        );
    }

    if (surface.key !== 'generic') {
        return (
            <Card>
                <div className="space-y-4">
                    <div className="flex items-start justify-between gap-4">
                        <div className="space-y-2">
                            <div className="flex items-center gap-2">
                                <Award className="h-5 w-5 text-gray-400" />
                                <h2 className="text-base font-semibold text-gray-900">{surface.label}</h2>
                            </div>
                            <Badge variant="default">Preview unavailable</Badge>
                        </div>
                        <Link href={surface.href}>
                            <Button variant="secondary" size="sm">
                                Open Policy Module
                                <ArrowRight className="ml-1.5 h-4 w-4" />
                            </Button>
                        </Link>
                    </div>
                    <p className="text-sm text-gray-600">
                        Policy authoring is managed by the owning plugin surface for this curriculum.
                    </p>
                </div>
            </Card>
        );
    }

    const detailHref = (
        preview.status === 'ready'
        && preview.policy?.id
    )
        ? `/reports/grade-policies/${preview.policy.id}`
        : '/reports/grade-policies';
    const actionLabel = (
        preview.status === 'ready'
        && preview.policy?.id
    )
        ? 'View Grade Policy'
        : 'Manage Grade Policies';

    return (
        <Card>
            <div className="space-y-4">
                <div className="flex items-start justify-between gap-4">
                    <div className="space-y-2">
                        <div className="flex items-center gap-2">
                            <Award className="h-5 w-5 text-blue-600" />
                            <h2 className="text-base font-semibold text-gray-900">Generic Grade Policy</h2>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <Badge variant="blue">Kernel-owned</Badge>
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
                        Policy authoring is managed in the generic grade policy module. No resolved policy preview is available from the current API surface.
                    </p>
                )}

                {preview.status === 'ready' && preview.source === 'resolved' && preview.policy && (
                    renderGenericPolicyDetails(preview.policy)
                )}
            </div>
        </Card>
    );
}
