'use client';

// ============================================================================
// app/(dashboard)/reports/grade-policies/page.tsx
// Responsibility: render only. No logic. No transforms. No API calls.
// ============================================================================

import Link from 'next/link';
import { useCallback, useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/app/components/ui/Button';
import { Card } from '@/app/components/ui/Card';
import { LoadingSpinner } from '@/app/components/ui/LoadingSpinner';
import { ErrorBanner } from '@/app/components/ui/ErrorBanner';
import { useGradePolicies } from '@/app/core/hooks/useGradePolicies';
import { GradePoliciesTable } from '@/app/core/components/gradePolicies/GradePoliciesTable';
import { PolicyHelpWidget } from '@/app/core/components/gradePolicies/PolicyHelpWidget';
import { PolicyFormModal } from '@/app/core/components/gradePolicies/PolicyFormModal';
import { useCohorts } from '@/app/core/hooks/useCohorts';
import { useCohortSubjects } from '@/app/core/hooks/useCohorts';
import { useCohortSubjectsByCohorts } from '@/app/core/hooks/useCohortSubjects';
import { useCurricula, useTerms } from '@/app/core/hooks/useAcademic';
import { usePlugins } from '@/app/core/hooks/usePlugins';
import {
    getAvailablePolicySurfaces,
    isCbcCurriculum,
    isGenericPolicyCurriculum,
} from '@/app/core/lib/policySurfaces';
import { GradePolicy } from '@/app/core/types/gradePolicy';
import { ApiError, extractErrorMessage } from '@/app/core/types/errors';
import { useAuth } from '@/app/context/AuthContext';
import { isAdminOrAbove } from '@/app/utils/permissions';
import { PolicyAdminOnlyState } from '@/app/core/components/reports/PolicyAdminOnlyState';

const CBC_REJECTION_MESSAGE = 'CBC uses CbcReportPolicy. Use CBC report policy endpoints.';

export function GradePoliciesPage() {
    const { user, activeRole, loading: authLoading } = useAuth();
    const [showModal, setShowModal] = useState(false);
    const [editingPolicy, setEditingPolicy] = useState<GradePolicy | null>(null);
    const [deleteError, setDeleteError] = useState<string | null>(null);
    const [deletingId, setDeletingId] = useState<number | null>(null);
    const canManagePolicies = isAdminOrAbove(user, activeRole);

    const {
        policies, loading, error,
        refetch, deletePolicy,
    } = useGradePolicies(undefined, { enabled: canManagePolicies });

    const { cohorts } = useCohorts();
    const { curricula } = useCurricula();
    const { terms } = useTerms();
    const { plugins } = usePlugins();
    const cohortIds = useMemo(() => cohorts.map((cohort) => cohort.id), [cohorts]);
    const { subjects: allCohortSubjects } = useCohortSubjectsByCohorts(cohortIds);

    // CohortSubject cascade — driven by form's selected cohort
    const [selectedCohort, setSelectedCohort] = useState<number | null>(null);
    const { subjects: cohortSubjects } = useCohortSubjects(selectedCohort ?? undefined);

    const availableSurfaces = useMemo(() => (
        getAvailablePolicySurfaces({
            curricula,
            installedPlugins: plugins,
        })
    ), [curricula, plugins]);

    const genericSurfaceAvailable = availableSurfaces.some((surface) => surface.key === 'generic');
    const cbcSurface = availableSurfaces.find((surface) => surface.key === 'cbc') ?? null;

    const genericCurricula = useMemo(
        () => curricula.filter((curriculum) => isGenericPolicyCurriculum(curriculum)),
        [curricula],
    );
    const genericCohorts = useMemo(
        () => cohorts.filter((cohort) => isGenericPolicyCurriculum(cohort)),
        [cohorts],
    );
    const genericCohortSubjects = useMemo(
        () => cohortSubjects.filter((subject) => isGenericPolicyCurriculum(subject)),
        [cohortSubjects],
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

    const visiblePolicies = useMemo(() => (
        policies.filter((policy) => {
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
        })
    ), [allCohortSubjectsById, cohortsById, curriculaById, policies]);

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

    const handleOpen = (policy?: GradePolicy) => {
        if (!canManagePolicies) return;
        setEditingPolicy(policy ?? null);
        if (policy?.cohort) setSelectedCohort(policy.cohort);
        setShowModal(true);
    };

    const handleClose = () => {
        setShowModal(false);
        setEditingPolicy(null);
        setSelectedCohort(null);
    };

    const handleDelete = async (id: number) => {
        setDeletingId(id);
        setDeleteError(null);
        try {
            await deletePolicy(id);
        } catch (err) {
            setDeleteError(extractErrorMessage(err as ApiError, 'Failed to delete policy'));
        } finally {
            setDeletingId(null);
        }
    };

    const handleSuccess = () => {
        refetch();
        handleClose();
    };

    if (authLoading) return <LoadingSpinner message="Checking grade policy access..." />;
    if (!canManagePolicies) return <PolicyAdminOnlyState title="Generic Grade Policies" />;
    if (loading && !policies.length) return <LoadingSpinner message="Loading grade policies..." />;

    if (!genericSurfaceAvailable) {
        return (
            <div className="space-y-6">
                <div>
                    <h1 className="text-2xl font-semibold text-gray-900">Generic Grade Policies</h1>
                    <p className="mt-1 text-gray-500">
                        Generic grade policies are only available for generic-compatible curricula.
                    </p>
                </div>

                <Card className="max-w-3xl">
                    <div className="space-y-4">
                        <div>
                            <h2 className="text-lg font-semibold text-gray-900">
                                This organization does not currently use the generic policy surface.
                            </h2>
                            <p className="mt-1 text-sm text-gray-600">
                                CBC/CBE reporting is owned by the CBC module. Open the policy hub to choose an
                                available reporting surface for this organization.
                            </p>
                        </div>
                        <div className="flex flex-wrap gap-3">
                            <Link href="/reports/policies">
                                <Button variant="secondary">Open Policy Hub</Button>
                            </Link>
                            {cbcSurface && (
                                <Link href={cbcSurface.href}>
                                    <Button>Open CBC Report Policies</Button>
                                </Link>
                            )}
                        </div>
                    </div>
                </Card>
            </div>
        );
    }

    return (
        <div className="space-y-6">

            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-semibold text-gray-900">
                        Generic Grade Policies
                    </h1>
                    <p className="text-gray-500 mt-1">
                        Kernel-owned policy authoring for generic-compatible reporting flows.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <PolicyHelpWidget />
                    {canManagePolicies && (
                        <Button onClick={() => handleOpen()}>
                            <Plus className="h-4 w-4 mr-1.5" />New Generic Policy
                        </Button>
                    )}
                </div>
            </div>

            <div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800">
                CBC/CBE reporting is managed separately in CBC Report Policies. This page only handles the generic kernel policy surface.
            </div>

            {error && <ErrorBanner message={error} onDismiss={() => { }} />}
            {deleteError && <ErrorBanner message={deleteError} onDismiss={() => setDeleteError(null)} />}

            <GradePoliciesTable
                policies={visiblePolicies}
                deletingId={deletingId}
                canManage={canManagePolicies}
                onCreate={() => handleOpen()}
                onEdit={handleOpen}
                onDelete={handleDelete}
            />

            {showModal && (
                <PolicyFormModal
                    editingPolicy={editingPolicy}
                    cohorts={genericCohorts}
                    cohortSubjects={genericCohortSubjects}
                    curricula={genericCurricula}
                    terms={terms}
                    selectedCohort={selectedCohort}
                    onCohortChange={setSelectedCohort}
                    onSuccess={handleSuccess}
                    onClose={handleClose}
                    validateScope={validateScope}
                />
            )}
        </div>
    );
}
