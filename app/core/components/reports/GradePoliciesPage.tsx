'use client';

// ============================================================================
// app/(dashboard)/reports/grade-policies/page.tsx
// Responsibility: render only. No logic. No transforms. No API calls.
// ============================================================================

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/app/components/ui/Button';
import { LoadingSpinner } from '@/app/components/ui/LoadingSpinner';
import { ErrorBanner } from '@/app/components/ui/ErrorBanner';
import { useGradePolicies } from '@/app/core/hooks/useGradePolicies';
import { GradePoliciesTable } from '@/app/core/components/gradePolicies/GradePoliciesTable';
import { PolicyHelpWidget } from '@/app/core/components/gradePolicies/PolicyHelpWidget';
import { PolicyFormModal } from '@/app/core/components/gradePolicies/PolicyFormModal';
import { useCohorts } from '@/app/core/hooks/useCohorts';
import { useCohortSubjects } from '@/app/core/hooks/useCohorts';
import { useCurricula } from '@/app/core/hooks/useAcademic';
import { GradePolicy } from '@/app/core/types/gradePolicy';
import { ApiError, extractErrorMessage } from '@/app/core/types/errors';

export function GradePoliciesPage() {
    const [showModal, setShowModal] = useState(false);
    const [editingPolicy, setEditingPolicy] = useState<GradePolicy | null>(null);
    const [deleteError, setDeleteError] = useState<string | null>(null);
    const [deletingId, setDeletingId] = useState<number | null>(null);

    const {
        policies, loading, error,
        refetch, deletePolicy,
    } = useGradePolicies();

    const { cohorts } = useCohorts();
    const { curricula } = useCurricula();

    // CohortSubject cascade — driven by form's selected cohort
    const [selectedCohort, setSelectedCohort] = useState<number | null>(null);
    const { subjects: cohortSubjects } = useCohortSubjects(selectedCohort ?? undefined);

    const handleOpen = (policy?: GradePolicy) => {
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

    if (loading && !policies.length) return <LoadingSpinner />;

    return (
        <div className="space-y-6">

            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-semibold text-gray-900">
                        Grade Computation Policies
                    </h1>
                    <p className="text-gray-500 mt-1">
                        Define how final grades are calculated per cohort, subject or curriculum.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <PolicyHelpWidget />
                    <Button onClick={() => handleOpen()}>
                        <Plus className="h-4 w-4 mr-1.5" />New Policy
                    </Button>
                </div>
            </div>

            {error && <ErrorBanner message={error} onDismiss={() => { }} />}
            {deleteError && <ErrorBanner message={deleteError} onDismiss={() => setDeleteError(null)} />}

            <GradePoliciesTable
                policies={policies}
                deletingId={deletingId}
                onCreate={() => handleOpen()}
                onEdit={handleOpen}
                onDelete={handleDelete}
            />

            {showModal && (
                <PolicyFormModal
                    editingPolicy={editingPolicy}
                    cohorts={cohorts}
                    cohortSubjects={cohortSubjects}
                    curricula={curricula}
                    selectedCohort={selectedCohort}
                    onCohortChange={setSelectedCohort}
                    onSuccess={handleSuccess}
                    onClose={handleClose}
                />
            )}
        </div>
    );
}
