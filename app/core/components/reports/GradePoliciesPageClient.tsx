'use client';

// ============================================================================
// Client island for generic report policy authoring.
// ============================================================================

import Link from 'next/link';
import { useCallback, useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/app/components/ui/Button';
import { Card } from '@/app/components/ui/Card';
import { LoadingSpinner } from '@/app/components/ui/LoadingSpinner';
import { ErrorBanner } from '@/app/components/ui/ErrorBanner';
import { AppErrorBanner } from '@/app/components/ui/errors';
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
import { resolveReportError, type AppError } from '@/app/core/errors';
import { useAuth } from '@/app/context/AuthContext';
import { PolicyAdminOnlyState } from '@/app/core/components/reports/PolicyAdminOnlyState';
import { canManageInstitutionReportPolicy } from '@/app/core/components/reports/reportAccessPolicy';

const CBC_REJECTION_MESSAGE = 'CBC uses CbcReportPolicy. Use CBC report policy endpoints.';

export function GradePoliciesPageClient() {
    const { user, capabilities, loading: authLoading } = useAuth();
    const [showModal, setShowModal] = useState(false);
    const [editingPolicy, setEditingPolicy] = useState<GradePolicy | null>(null);
    const [templatePolicy, setTemplatePolicy] = useState<GradePolicy | null>(null);
    const [deleteError, setDeleteError] = useState<AppError | null>(null);
    const [deletingId, setDeletingId] = useState<number | null>(null);
    const [activatingId, setActivatingId] = useState<number | null>(null);
    const canManagePolicies = canManageInstitutionReportPolicy({ user, capabilities });

    const {
        policies, loading, error,
        refetch, updatePolicy, deletePolicy,
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
        setTemplatePolicy(null);
        setSelectedCohort(policy?.cohort ?? null);
        setShowModal(true);
    };

    const handleCreateActiveCopy = (policy: GradePolicy) => {
        if (!canManagePolicies) return;
        setEditingPolicy(null);
        setTemplatePolicy(policy);
        setSelectedCohort(policy.cohort ?? null);
        setShowModal(true);
    };

    const handleClose = () => {
        setShowModal(false);
        setEditingPolicy(null);
        setTemplatePolicy(null);
        setSelectedCohort(null);
    };

    const handleActivate = async (policy: GradePolicy) => {
        setActivatingId(policy.id);
        setDeleteError(null);
        try {
            await updatePolicy(policy.id, { is_active: true });
            await refetch();
        } catch (err) {
            setDeleteError(resolveReportError(err, {
                action: 'update',
                entityLabel: 'grade policy',
                role: 'ADMIN',
            }));
        } finally {
            setActivatingId(null);
        }
    };

    const handleDelete = async (id: number) => {
        setDeletingId(id);
        setDeleteError(null);
        try {
            await deletePolicy(id);
        } catch (err) {
            setDeleteError(resolveReportError(err, {
                action: 'delete',
                entityLabel: 'grade policy',
                role: 'ADMIN',
            }));
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

                <GenericPolicyUnavailableState cbcHref={cbcSurface?.href ?? null} />
            </div>
        );
    }

    return (
        <div className="space-y-6">

            {/* Header */}
            <GenericPoliciesHeader
                canManagePolicies={canManagePolicies}
                onCreate={() => handleOpen()}
            />

            <div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800">
                CBC/CBE reporting is managed separately in CBC Academic Policies. This page only handles the generic report policy surface.
            </div>

            {error && <ErrorBanner message={error} onDismiss={() => { }} />}
            {deleteError && (
                <AppErrorBanner error={deleteError} onDismiss={() => setDeleteError(null)} />
            )}

            <GradePoliciesTable
                policies={visiblePolicies}
                deletingId={deletingId}
                canManage={canManagePolicies}
                onCreate={() => handleOpen()}
                onEdit={handleOpen}
                onActivate={(policy) => {
                    if (activatingId !== policy.id) void handleActivate(policy);
                }}
                onCreateActiveCopy={handleCreateActiveCopy}
                onDelete={handleDelete}
            />

            {showModal && (
                <PolicyFormModal
                    editingPolicy={editingPolicy}
                    templatePolicy={templatePolicy}
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

function GenericPolicyUnavailableState({ cbcHref }: { cbcHref: string | null }) {
    return (
        <Card className="max-w-3xl">
            <div className="space-y-4">
                <div>
                    <h2 className="text-lg font-semibold text-gray-900">
                        This organization does not currently use the generic policy surface.
                    </h2>
                    <p className="mt-1 text-sm text-gray-600">
                        CBC/CBE reporting is governed by CBC Academic Policies. Open the policy hub to choose an
                        available reporting surface for this organization.
                    </p>
                </div>
                <div className="flex flex-wrap gap-3">
                    <Link href="/reports/policies">
                        <Button variant="secondary">Open Policy Hub</Button>
                    </Link>
                    {cbcHref ? (
                        <Link href={cbcHref}>
                            <Button>Open CBC Academic Policies</Button>
                        </Link>
                    ) : null}
                </div>
            </div>
        </Card>
    );
}

function GenericPoliciesHeader({
    canManagePolicies,
    onCreate,
}: {
    canManagePolicies: boolean;
    onCreate: () => void;
}) {
    return (
        <div className="flex items-center justify-between">
            <div>
                <h1 className="text-2xl font-semibold text-gray-900">
                    Generic Grade Policies
                </h1>
                <p className="text-gray-500 mt-1">
                    Core report policy authoring for generic-compatible reporting flows.
                </p>
            </div>
            <div className="flex items-center gap-3">
                <PolicyHelpWidget />
                {canManagePolicies && (
                    <Button onClick={onCreate}>
                        <Plus className="h-4 w-4 mr-1.5" />New Generic Policy
                    </Button>
                )}
            </div>
        </div>
    );
}
