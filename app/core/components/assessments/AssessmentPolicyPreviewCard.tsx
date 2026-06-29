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
import type { AssessmentPolicyContext } from '@/app/core/types/assessment';
import type { GradePolicy } from '@/app/core/types/gradePolicy';
import { usePlugins } from '@/app/core/hooks/usePlugins';
import { useAuth } from '@/app/context/AuthContext';
import { canManageInstitutionReportPolicy } from '@/app/core/components/reports/reportAccessPolicy';

type GenericPreviewState =
    | { status: 'idle' | 'loading'; surface: PolicySurfaceDefinition | null }
    | {
        status: 'ready';
        surface: PolicySurfaceDefinition;
        source: 'resolved' | 'no_policy';
        policy: GradePolicy | null;
    }
    | { status: 'error'; surface: PolicySurfaceDefinition | null; message: string };

interface AssessmentPolicyPreviewCardProps {
    cohortId?: number | null;
    cohortSubjectId?: number | null;
    termId?: number | null;
    assessmentContext?: AssessmentPolicyContext | null;
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

function resolveAssessmentCurriculumType(
    assessmentContext?: AssessmentPolicyContext | null,
): string | null {
    return (
        assessmentContext?.curriculum_type
        ?? assessmentContext?.subject_curriculum_type
        ?? assessmentContext?.cohort_curriculum_type
        ?? null
    );
}

function buildAssessmentSubject(
    cohortId: number | null,
    cohortSubjectId: number | null,
    assessmentContext?: AssessmentPolicyContext | null,
): AssessmentPolicyPreviewSubject | null {
    if (!cohortId || !cohortSubjectId) {
        return null;
    }

    return {
        id: cohortSubjectId,
        cohort: cohortId,
        cohort_id: cohortId,
        cohort_name: assessmentContext?.cohort_name ?? '',
        cohort_level: '',
        subject: assessmentContext?.subject_id ?? cohortSubjectId,
        subject_id: assessmentContext?.subject_id ?? cohortSubjectId,
        subject_name: assessmentContext?.subject_name ?? '',
        subject_code: assessmentContext?.subject_code ?? '',
        curriculum_name: assessmentContext?.curriculum_name ?? '',
        curriculum_type: resolveAssessmentCurriculumType(assessmentContext) ?? '',
        is_compulsory: false,
        subject_source: assessmentContext?.subject_source ?? null,
        teaching_link_id: assessmentContext?.teaching_link_id ?? null,
        cbc_cohort_subject_id: assessmentContext?.cbc_cohort_subject_id ?? null,
        subject_profile_id: assessmentContext?.subject_profile_id ?? null,
    };
}

function nonNullIds(...values: Array<number | null | undefined>): number[] {
    return values.filter((value): value is number => typeof value === 'number');
}

function subjectMatchesAssessmentContext(
    subject: AssessmentPolicyPreviewSubject,
    targetIds: number[],
): boolean {
    if (targetIds.length === 0) {
        return false;
    }

    const candidateIds = nonNullIds(
        subject.id,
        subject.cbc_cohort_subject_id,
        subject.teaching_link_id,
    );

    return candidateIds.some((candidateId) => targetIds.includes(candidateId));
}

function mergeAssessmentSubjects(
    preferred: AssessmentPolicyPreviewSubject | null,
    fallback: AssessmentPolicyPreviewSubject | null,
): AssessmentPolicyPreviewSubject | null {
    if (!preferred) {
        return fallback;
    }
    if (!fallback) {
        return preferred;
    }

    return {
        ...fallback,
        ...preferred,
        subject: preferred.subject ?? fallback.subject,
        subject_id: preferred.subject_id ?? fallback.subject_id,
        subject_name: preferred.subject_name || fallback.subject_name,
        subject_code: preferred.subject_code || fallback.subject_code,
        curriculum_name: preferred.curriculum_name || fallback.curriculum_name,
        curriculum_type: preferred.curriculum_type || fallback.curriculum_type,
        subject_source: preferred.subject_source ?? fallback.subject_source ?? null,
        teaching_link_id: preferred.teaching_link_id ?? fallback.teaching_link_id ?? null,
        cbc_cohort_subject_id: preferred.cbc_cohort_subject_id ?? fallback.cbc_cohort_subject_id ?? null,
        subject_profile_id: preferred.subject_profile_id ?? fallback.subject_profile_id ?? null,
    };
}

function buildMissingMetadataMessage(
    cohortSubjectId: number | null,
    cohortId: number | null,
    termId: number | null,
): string {
    return (
        'Policy preview is unavailable because assessment policy metadata is incomplete '
        + `(cohort_subject_id=${cohortSubjectId ?? 'null'}, `
        + `cohort_id=${cohortId ?? 'null'}, `
        + `term_id=${termId ?? 'null'}).`
    );
}

export function AssessmentPolicyPreviewCard({
    cohortId = null,
    cohortSubjectId = null,
    termId = null,
    assessmentContext = null,
}: AssessmentPolicyPreviewCardProps) {
    const { user, capabilities, loading: authLoading } = useAuth();
    const { plugins, loading: pluginsLoading } = usePlugins();
    const canManagePolicyRoutes = !authLoading && canManageInstitutionReportPolicy({ user, capabilities });
    const { subjects, loading: subjectsLoading } = useCohortSubjects(cohortId ?? undefined);
    const assessmentSubject = useMemo(
        () => buildAssessmentSubject(cohortId, cohortSubjectId, assessmentContext),
        [assessmentContext, cohortId, cohortSubjectId],
    );
    const matchedSubject = useMemo(() => {
        const targetIds = nonNullIds(
            cohortSubjectId,
            assessmentContext?.cbc_cohort_subject_id,
            assessmentContext?.teaching_link_id,
        );

        return (
            (subjects as AssessmentPolicyPreviewSubject[]).find((subject) => (
                subjectMatchesAssessmentContext(subject, targetIds)
            )) ?? null
        );
    }, [
        assessmentContext?.cbc_cohort_subject_id,
        assessmentContext?.teaching_link_id,
        cohortSubjectId,
        subjects,
    ]);
    const resolvedSubject = useMemo(
        () => mergeAssessmentSubjects(assessmentSubject, matchedSubject),
        [assessmentSubject, matchedSubject],
    );
    const resolvedCurriculumType = (
        resolvedSubject?.curriculum_type
        || resolveAssessmentCurriculumType(assessmentContext)
        || null
    );
    const surface = useMemo(
        () => getPolicySurfaceForCurriculumType(resolvedCurriculumType, plugins),
        [plugins, resolvedCurriculumType],
    );
    const isResolvingPolicySurface = pluginsLoading || (!resolvedCurriculumType && subjectsLoading);
    const [preview, setPreview] = useState<GenericPreviewState>({
        status: cohortSubjectId ? 'loading' : 'idle',
        surface,
    });

    const pluginPreview = useMemo(() => {
        if (!resolvedSubject || !cohortId || !cohortSubjectId || surface?.key === 'generic') {
            return null;
        }

        return renderAssessmentPolicyPreviewExtension({
            cohortId,
            cohortSubjectId,
            termId,
            subject: resolvedSubject,
        });
    }, [cohortId, cohortSubjectId, resolvedSubject, surface?.key, termId]);

    const renderPolicyAction = (href: string, label: string) => {
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
            <Link href={href}>
                <Button variant="secondary" size="sm">
                    {label}
                    <ArrowRight className="ml-1.5 h-4 w-4" />
                </Button>
            </Link>
        );
    };

    useEffect(() => {
        let cancelled = false;

        async function loadGenericPreview() {
            if (!cohortSubjectId) {
                setPreview({ status: 'idle', surface: null });
                return;
            }

            if (pluginsLoading || (!resolvedCurriculumType && subjectsLoading)) {
                setPreview({ status: 'loading', surface });
                return;
            }

            if (!surface) {
                setPreview({ status: 'idle', surface: null });
                return;
            }

            if (surface.key !== 'generic') {
                setPreview({ status: 'idle', surface });
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
                        source: 'no_policy',
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
    }, [
        cohortId,
        cohortSubjectId,
        pluginsLoading,
        resolvedCurriculumType,
        subjectsLoading,
        surface,
        termId,
    ]);

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

    if (isResolvingPolicySurface && !surface) {
        return (
            <Card>
                <div className="space-y-2">
                    <h2 className="text-base font-semibold text-gray-900">Report Policy Preview</h2>
                    <p className="text-sm text-gray-600">
                        Loading policy preview context…
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
                        {renderPolicyAction('/reports/policies', 'Open Policy Hub')}
                    </div>
                    <p className="text-sm text-gray-600">
                        {resolvedCurriculumType
                            ? 'No policy module is available for this curriculum.'
                            : buildMissingMetadataMessage(cohortSubjectId, cohortId, termId)}
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
                        {renderPolicyAction(surface.href, 'Open Policy Module')}
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
                            {preview.status === 'ready' && preview.source === 'no_policy' && (
                                <Badge variant="orange">No policy assigned</Badge>
                            )}
                        </div>
                    </div>
                    {renderPolicyAction(detailHref, actionLabel)}
                </div>

                {preview.status === 'loading' && (
                    <p className="text-sm text-gray-500">Loading resolved policy context…</p>
                )}

                {preview.status === 'error' && (
                    <p className="text-sm text-red-600">{preview.message}</p>
                )}

                {preview.status === 'ready' && preview.source === 'no_policy' && (
                    <p className="text-sm text-gray-600">
                        No policy assigned for this context.
                    </p>
                )}

                {preview.status === 'ready' && preview.source === 'resolved' && preview.policy && (
                    renderGenericPolicyDetails(preview.policy)
                )}
            </div>
        </Card>
    );
}
