'use client';

// ============================================================================
// app/(dashboard)/academic/cohorts/[id]/students/page.tsx
//
// Responsibility: fetch via hook, handle selection state, compose components.
// No alert(). No direct API calls. No any.
// ============================================================================

import { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Users, UserPlus, CheckSquare } from 'lucide-react';
import { useAuth } from '@/app/context/AuthContext';
import { useCohortDetail, useCohortSubjects } from '@/app/core/hooks/useAcademic';
import { useCohortSubjectParticipation } from '@/app/core/hooks/useCohortSubjectParticipation';
import { isAdminOrAbove } from '@/app/utils/permissions';
import { Button } from '@/app/components/ui/Button';
import { StatsCard } from '@/app/components/dashboard/StatsCard';
import { ErrorBanner } from '@/app/components/ui/ErrorBanner';
import { ManageCohortSubjectsModal } from '@/app/core/components/cohorts/CohortComponents';
import { CohortSubjectParticipationSection } from '@/app/core/components/cohorts/CohortSubjectParticipationSection';
import { EnrolledPanel, AvailablePanel, EnrollModal, UnenrollModal } from '@/app/core/components/cohorts/CohortStudentComponents';
import { useCohortStudents } from '@/app/core/hooks/useCohortStudents';

export default function CohortStudentsPage() {
    const params = useParams();
    const cohortId = Number(params.id);
    const { user, activeRole } = useAuth();

    const {
        cohortName, enrolled, enrolledCount, available, availableCount,
        loading, error, clearError,
        bulkEnroll, bulkUnenroll,
    } = useCohortStudents(cohortId);
    const { cohort, refetch: refetchCohort } = useCohortDetail(Number.isFinite(cohortId) && cohortId > 0 ? cohortId : null);
    const {
        cohortSubjects,
        loading: cohortSubjectsLoading,
        error: cohortSubjectsError,
        refetch: refetchCohortSubjects,
    } = useCohortSubjects(Number.isFinite(cohortId) && cohortId > 0 ? cohortId : undefined);

    const [selectedEnrolled, setSelectedEnrolled] = useState<Set<number>>(new Set());
    const [selectedAvailable, setSelectedAvailable] = useState<Set<number>>(new Set());
    const [searchEnrolled, setSearchEnrolled] = useState('');
    const [searchAvailableStr, setSearchAvailableStr] = useState('');
    const [showEnrollModal, setShowEnrollModal] = useState(false);
    const [showUnenrollModal, setShowUnenrollModal] = useState(false);
    const [actionError, setActionError] = useState<string | null>(null);
    const [assignSubjectsOpen, setAssignSubjectsOpen] = useState(false);
    const canManageInstructors = Boolean(user?.is_superadmin || activeRole === 'ADMIN');
    const canLinkSubjects = isAdminOrAbove(user, activeRole);
    const subjectParticipationQuery = useCohortSubjectParticipation(
        cohort?.id ?? null,
        cohortSubjects,
        { includeInstructor: canManageInstructors }
    );

    // ── Filter enrolled client-side ───────────────────────────────────────

    const filteredEnrolled = enrolled.filter(s =>
        s.full_name.toLowerCase().includes(searchEnrolled.toLowerCase()) ||
        s.admission_number.toLowerCase().includes(searchEnrolled.toLowerCase())
    );

    const filteredAvailable = available.filter(s =>
        s.full_name.toLowerCase().includes(searchAvailableStr.toLowerCase()) ||
        s.admission_number.toLowerCase().includes(searchAvailableStr.toLowerCase())
    );

    // ── Selection helpers ─────────────────────────────────────────────────

    const toggleEnrolled = (id: number) => {
        setSelectedEnrolled(prev => {
            const s = new Set(prev);
            if (s.has(id)) {
                s.delete(id);
            } else {
                s.add(id);
            }
            return s;
        });
    };

    const toggleAvailable = (id: number) => {
        setSelectedAvailable(prev => {
            const s = new Set(prev);
            if (s.has(id)) {
                s.delete(id);
            } else {
                s.add(id);
            }
            return s;
        });
    };

    const selectAllEnrolled = () => setSelectedEnrolled(
        selectedEnrolled.size === filteredEnrolled.length
            ? new Set()
            : new Set(filteredEnrolled.map(s => s.id))
    );

    const selectAllAvailable = () => setSelectedAvailable(
        selectedAvailable.size === filteredAvailable.length
            ? new Set()
            : new Set(filteredAvailable.map(s => s.id))
    );

    // ── Action handlers ───────────────────────────────────────────────────

    const handleEnroll = async (enrollmentType: string, notes: string) => {
        const result = await bulkEnroll(Array.from(selectedAvailable), enrollmentType, notes);
        setSelectedAvailable(new Set());
        setActionError(
            `Enrolled ${result.created} new · ${result.reactivated} reactivated · ${result.already_active} already active`
        );
    };

    const handleUnenroll = async (notes: string) => {
        const result = await bulkUnenroll(Array.from(selectedEnrolled), notes);
        setSelectedEnrolled(new Set());
        if (result.primary_cleared > 0) {
            setActionError(`Removed ${result.unenrolled} · Primary cohort cleared for ${result.primary_cleared} student(s)`);
        }
    };

    // ── Render ────────────────────────────────────────────────────────────

    return (
        <div className="space-y-6 max-w-6xl mx-auto">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="flex items-center gap-4">
                    <Link href={`/academic/cohorts/${cohortId}`}>
                        <Button variant="ghost" size="sm">
                            <ArrowLeft className="mr-2 h-4 w-4" />Back to Cohort
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Manage Cohort Placement</h1>
                        {(cohortName || cohort?.name) && <p className="text-sm text-gray-500 mt-0.5">{cohortName || cohort?.name}</p>}
                    </div>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                    {canLinkSubjects ? (
                        <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            className="w-full sm:w-auto"
                            onClick={() => setAssignSubjectsOpen(true)}
                        >
                            Link Subject to Cohort
                        </Button>
                    ) : null}
                    <Link href="/assessments" className="w-full sm:w-auto">
                        <Button variant="secondary" size="sm" className="w-full sm:w-auto">View Assessments</Button>
                    </Link>
                </div>
            </div>

            {(error || actionError) && (
                <ErrorBanner
                    message={error ?? actionError ?? ''}
                    onDismiss={() => { clearError(); setActionError(null); }}
                />
            )}

            <CohortSubjectParticipationSection
                cohortSubjects={cohortSubjects}
                summaries={subjectParticipationQuery.summaries}
                loading={cohortSubjectsLoading || subjectParticipationQuery.loading}
                error={cohortSubjectsError ?? subjectParticipationQuery.error}
                canManageInstructors={canManageInstructors}
                canLinkSubjects={canLinkSubjects}
                onLinkSubjects={() => setAssignSubjectsOpen(true)}
            />

            <div className="grid gap-4 md:grid-cols-3">
                <StatsCard title="Enrolled" value={enrolledCount} icon={Users} color="blue" />
                <StatsCard title="Available" value={availableCount} icon={UserPlus} color="green" />
                <StatsCard title="Selected" value={selectedEnrolled.size + selectedAvailable.size} icon={CheckSquare} color="yellow" />
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
                <EnrolledPanel
                    students={filteredEnrolled}
                    selected={selectedEnrolled}
                    searchValue={searchEnrolled}
                    loading={loading}
                    onSearchChange={setSearchEnrolled}
                    onToggle={toggleEnrolled}
                    onSelectAll={selectAllEnrolled}
                    onRemoveClick={() => setShowUnenrollModal(true)}
                />

                <AvailablePanel
                    students={filteredAvailable}
                    selected={selectedAvailable}
                    searchValue={searchAvailableStr}
                    loading={loading}
                    onSearchChange={setSearchAvailableStr}
                    onToggle={toggleAvailable}
                    onSelectAll={selectAllAvailable}
                    onEnrollClick={() => setShowEnrollModal(true)}
                />
            </div>

            <EnrollModal
                isOpen={showEnrollModal}
                count={selectedAvailable.size}
                cohortName={cohortName}
                onClose={() => setShowEnrollModal(false)}
                onConfirm={handleEnroll}
            />

            <UnenrollModal
                isOpen={showUnenrollModal}
                count={selectedEnrolled.size}
                onClose={() => setShowUnenrollModal(false)}
                onConfirm={handleUnenroll}
            />

            {cohort && canLinkSubjects ? (
                <ManageCohortSubjectsModal
                    isOpen={assignSubjectsOpen}
                    onClose={() => setAssignSubjectsOpen(false)}
                    cohort={cohort}
                    onSubjectsChanged={async () => {
                        await refetchCohort();
                        await refetchCohortSubjects();
                    }}
                />
            ) : null}
        </div>
    );
}
