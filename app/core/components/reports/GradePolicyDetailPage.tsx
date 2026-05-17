'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, Edit } from 'lucide-react';
import { Badge } from '@/app/components/ui/Badge';
import { Button } from '@/app/components/ui/Button';
import { Card } from '@/app/components/ui/Card';
import { ErrorBanner } from '@/app/components/ui/ErrorBanner';
import { LoadingSpinner } from '@/app/components/ui/LoadingSpinner';
import { PolicyFormModal } from '@/app/core/components/gradePolicies/PolicyFormModal';
import { gradePolicyAPI } from '@/app/core/api/gradePolicy';
import { useCurricula } from '@/app/core/hooks/useAcademic';
import { useCohorts, useCohortSubjects } from '@/app/core/hooks/useCohorts';
import { useCohortSubjectsByCohorts } from '@/app/core/hooks/useCohortSubjects';
import { useAuth } from '@/app/context/AuthContext';
import { isAdminOrAbove } from '@/app/utils/permissions';
import {
    isCbcCurriculum,
    isGenericPolicyCurriculum,
} from '@/app/core/lib/policySurfaces';
import type { GradePolicy } from '@/app/core/types/gradePolicy';
import type { ApiError } from '@/app/core/types/errors';
import { extractErrorMessage } from '@/app/core/types/errors';

const CBC_REJECTION_MESSAGE = 'CBC uses CbcReportPolicy. Use CBC report policy endpoints.';

export function GradePolicyDetailPage() {
    const params = useParams();
    const policyId = Number(params.id);
    const { user, activeRole } = useAuth();
    const canManagePolicies = isAdminOrAbove(user, activeRole);
    const [policy, setPolicy] = useState<GradePolicy | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showEditModal, setShowEditModal] = useState(false);
    const [selectedCohort, setSelectedCohort] = useState<number | null>(null);

    const { curricula } = useCurricula();
    const { cohorts } = useCohorts();
    const cohortIds = useMemo(() => cohorts.map((cohort) => cohort.id), [cohorts]);
    const { subjects: allCohortSubjects } = useCohortSubjectsByCohorts(cohortIds);
    const { subjects: scopedSubjects } = useCohortSubjects(selectedCohort ?? undefined);

    const genericCurricula = useMemo(
        () => curricula.filter((curriculum) => isGenericPolicyCurriculum(curriculum)),
        [curricula],
    );
    const genericCohorts = useMemo(
        () => cohorts.filter((cohort) => isGenericPolicyCurriculum(cohort)),
        [cohorts],
    );
    const genericScopedSubjects = useMemo(
        () => scopedSubjects.filter((subject) => isGenericPolicyCurriculum(subject)),
        [scopedSubjects],
    );
    const curriculaById = useMemo(
        () => new Map(curricula.map((curriculum) => [curriculum.id, curriculum])),
        [curricula],
    );
    const cohortsById = useMemo(
        () => new Map(cohorts.map((cohort) => [cohort.id, cohort])),
        [cohorts],
    );
    const allCohortSubjectsById = useMemo(
        () => new Map(allCohortSubjects.map((subject) => [subject.id, subject])),
        [allCohortSubjects],
    );

    const validateScope = useCallback((form: { cohort: number | null; cohort_subject: number | null; curriculum: number | null }) => {
        if (form.curriculum != null) {
            const curriculum = curriculaById.get(form.curriculum);
            if (curriculum && isCbcCurriculum(curriculum)) {
                return CBC_REJECTION_MESSAGE;
            }
        }

        if (form.cohort != null) {
            const cohort = cohortsById.get(form.cohort);
            if (cohort && isCbcCurriculum(cohort)) {
                return CBC_REJECTION_MESSAGE;
            }
        }

        if (form.cohort_subject != null) {
            const subject = allCohortSubjectsById.get(form.cohort_subject);
            if (subject && isCbcCurriculum(subject)) {
                return CBC_REJECTION_MESSAGE;
            }
        }

        return null;
    }, [allCohortSubjectsById, cohortsById, curriculaById]);

    const isGenericPolicy = useMemo(() => {
        if (!policy) return false;

        if (policy.curriculum != null) {
            const curriculum = curriculaById.get(policy.curriculum);
            return curriculum ? isGenericPolicyCurriculum(curriculum) : !isCbcCurriculum({ name: policy.curriculum_name ?? '' });
        }

        if (policy.cohort != null) {
            const cohort = cohortsById.get(policy.cohort);
            return cohort ? isGenericPolicyCurriculum(cohort) : true;
        }

        if (policy.cohort_subject != null) {
            const subject = allCohortSubjectsById.get(policy.cohort_subject);
            return subject ? isGenericPolicyCurriculum(subject) : true;
        }

        return true;
    }, [allCohortSubjectsById, cohortsById, curriculaById, policy]);

    const loadPolicy = useCallback(async () => {
        if (!Number.isFinite(policyId)) {
            setError('Grade policy not found.');
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            const nextPolicy = await gradePolicyAPI.getById(policyId);
            setPolicy(nextPolicy);
            setSelectedCohort(nextPolicy.cohort ?? null);
            setError(null);
        } catch (requestError) {
            setError(extractErrorMessage(requestError as ApiError, 'Failed to load grade policy.'));
        } finally {
            setLoading(false);
        }
    }, [policyId]);

    useEffect(() => {
        void loadPolicy();
    }, [loadPolicy]);

    if (loading) {
        return <LoadingSpinner />;
    }

    if (error || !policy) {
        return <ErrorBanner message={error ?? 'Grade policy not found.'} onDismiss={() => {}} />;
    }

    if (!isGenericPolicy) {
        return (
            <div className="space-y-6">
                <ErrorBanner
                    message="This policy scope is managed by the CBC module. Open CBC Report Policies instead."
                    onDismiss={() => {}}
                />
                <Link href="/cbc/report-policies">
                    <Button>Open CBC Report Policies</Button>
                </Link>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-start justify-between gap-4">
                <div className="space-y-3">
                    <Link href="/reports/grade-policies">
                        <Button variant="ghost" size="sm">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back to Generic Grade Policies
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-2xl font-semibold text-gray-900">{policy.name}</h1>
                        <div className="mt-2 flex flex-wrap gap-2">
                            <Badge variant="blue">Kernel-owned</Badge>
                            {policy.is_default && <Badge variant="orange">Default</Badge>}
                            <Badge variant={policy.is_active ? 'green' : 'red'}>
                                {policy.is_active ? 'Active' : 'Inactive'}
                            </Badge>
                        </div>
                    </div>
                    {policy.description && <p className="max-w-3xl text-sm text-gray-600">{policy.description}</p>}
                </div>
                {canManagePolicies && (
                    <Button onClick={() => setShowEditModal(true)}>
                        <Edit className="mr-1.5 h-4 w-4" />
                        Edit Generic Grade Policy
                    </Button>
                )}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
                <Card>
                    <h2 className="text-lg font-semibold text-gray-900">Scope</h2>
                    <div className="mt-4 space-y-2 text-sm text-gray-700">
                        <p><span className="font-medium text-gray-900">Curriculum:</span> {policy.curriculum_name ?? 'Any'}</p>
                        <p><span className="font-medium text-gray-900">Cohort:</span> {policy.cohort_name ?? 'Any'}</p>
                        <p><span className="font-medium text-gray-900">Subject:</span> {policy.cohort_subject_name ?? 'Any'}</p>
                        <p><span className="font-medium text-gray-900">Term:</span> {policy.term_name ?? 'Any'}</p>
                    </div>
                </Card>

                <Card>
                    <h2 className="text-lg font-semibold text-gray-900">Computation</h2>
                    <div className="mt-4 space-y-3">
                        <Badge variant="purple">{policy.aggregation_method}</Badge>
                        <div className="flex flex-wrap gap-2">
                            {Object.entries(policy.default_weighting).map(([type, weight]) => (
                                <Badge key={type} variant="blue">{type} {weight}%</Badge>
                            ))}
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {(policy.required_components.length > 0 ? policy.required_components : ['None']).map((entry) => (
                                <Badge key={entry} variant="green">{entry}</Badge>
                            ))}
                        </div>
                    </div>
                </Card>
            </div>

            <Card>
                <h2 className="text-lg font-semibold text-gray-900">Generic Grading Scale</h2>
                <div className="mt-4 overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 text-sm">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-4 py-2 text-left font-medium text-gray-500">Min</th>
                                <th className="px-4 py-2 text-left font-medium text-gray-500">Max</th>
                                <th className="px-4 py-2 text-left font-medium text-gray-500">Grade</th>
                                <th className="px-4 py-2 text-left font-medium text-gray-500">Label</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {policy.grading_scale.map((band) => (
                                <tr key={`${band.grade}-${band.min}`}>
                                    <td className="px-4 py-3">{band.min}</td>
                                    <td className="px-4 py-3">{band.max ?? '—'}</td>
                                    <td className="px-4 py-3">{band.grade}</td>
                                    <td className="px-4 py-3">{band.label ?? '—'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>

            {showEditModal && (
                <PolicyFormModal
                    editingPolicy={policy}
                    cohorts={genericCohorts}
                    cohortSubjects={genericScopedSubjects}
                    curricula={genericCurricula}
                    selectedCohort={selectedCohort}
                    onCohortChange={setSelectedCohort}
                    onSuccess={async () => {
                        await loadPolicy();
                        setShowEditModal(false);
                    }}
                    onClose={() => setShowEditModal(false)}
                    validateScope={validateScope}
                />
            )}
        </div>
    );
}
