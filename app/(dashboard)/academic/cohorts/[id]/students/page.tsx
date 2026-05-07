'use client';

// ============================================================================
// app/(dashboard)/academic/cohorts/[id]/students/page.tsx
//
// Responsibility: fetch via hook, handle selection state, compose components.
// No alert(). No direct API calls. No any.
// ============================================================================

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Users, UserPlus, CheckSquare } from 'lucide-react';
import { useAuth } from '@/app/context/AuthContext';
import { useCohortDetail } from '@/app/core/hooks/useAcademic';
import { getCohortSubjectLearners } from '@/app/core/api/academic';
import { isCambridgeCurriculumType } from '@/app/core/lib/curriculumBridge';
import { isAdminOrAbove } from '@/app/utils/permissions';
import { Button } from '@/app/components/ui/Button';
import { Card } from '@/app/components/ui/Card';
import { Badge } from '@/app/components/ui/Badge';
import { StatsCard } from '@/app/components/dashboard/StatsCard';
import { ErrorBanner } from '@/app/components/ui/ErrorBanner';
import { ManageCohortSubjectsModal } from '@/app/core/components/cohorts/CohortComponents';
import { EnrolledPanel, AvailablePanel, EnrollModal, UnenrollModal } from '@/app/core/components/cohorts/CohortStudentComponents';
import { useCohortStudents } from '@/app/core/hooks/useCohortStudents';
import type { CohortSubjectLearnerCounts } from '@/app/core/types/academic';

export default function CohortStudentsPage() {
    const params = useParams();
    const cohortId = Number(params.id);
    const { user, activeRole } = useAuth();

    const {
        cohortName, enrolled, available,
        loading, error, clearError,
        searchAvailable, bulkEnroll, bulkUnenroll,
    } = useCohortStudents(cohortId);
    const { cohort, refetch: refetchCohort } = useCohortDetail(Number.isFinite(cohortId) && cohortId > 0 ? cohortId : null);

    const [selectedEnrolled, setSelectedEnrolled] = useState<Set<number>>(new Set());
    const [selectedAvailable, setSelectedAvailable] = useState<Set<number>>(new Set());
    const [searchEnrolled, setSearchEnrolled] = useState('');
    const [searchAvailableStr, setSearchAvailableStr] = useState('');
    const [showEnrollModal, setShowEnrollModal] = useState(false);
    const [showUnenrollModal, setShowUnenrollModal] = useState(false);
    const [actionError, setActionError] = useState<string | null>(null);
    const [assignSubjectsOpen, setAssignSubjectsOpen] = useState(false);
    const [subjectCounts, setSubjectCounts] = useState<Record<number, CohortSubjectLearnerCounts>>({});
    const showKernelSubjectParticipation = Boolean(
        cohort
        && cohort.curriculum_type !== 'CBE'
        && !isCambridgeCurriculumType(cohort.curriculum_type)
    );
    const cohortSubjects = useMemo(
        () => (showKernelSubjectParticipation ? cohort?.subjects ?? [] : []),
        [cohort?.subjects, showKernelSubjectParticipation]
    );
    const canManageSubjectParticipation = isAdminOrAbove(user, activeRole);
    const canLinkSubjects = isAdminOrAbove(user, activeRole);

    useEffect(() => {
        let active = true;

        if (!showKernelSubjectParticipation || cohortSubjects.length === 0) {
            setSubjectCounts({});
            return () => {
                active = false;
            };
        }

        const loadCounts = async () => {
            const entries = await Promise.all(
                cohortSubjects.map(async (subject) => {
                    try {
                        const data = await getCohortSubjectLearners(subject.id);
                        return [subject.id, data.counts] as const;
                    } catch {
                        return null;
                    }
                })
            );

            if (!active) return;

            setSubjectCounts(
                entries.reduce<Record<number, CohortSubjectLearnerCounts>>((acc, entry) => {
                    if (!entry) return acc;
                    acc[entry[0]] = entry[1];
                    return acc;
                }, {})
            );
        };

        void loadCounts();

        return () => {
            active = false;
        };
    }, [cohortSubjects, showKernelSubjectParticipation]);

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
                        {cohortName && <p className="text-sm text-gray-500 mt-0.5">{cohortName}</p>}
                    </div>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                    {showKernelSubjectParticipation && canLinkSubjects ? (
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

            <Card className="space-y-4">
                <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-700">
                    This page manages cohort placement only. Subject participation is managed per cohort subject.
                </div>

                {showKernelSubjectParticipation ? (
                    <>
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                            <div className="space-y-1">
                                <h2 className="text-base font-semibold text-gray-900">
                                    {canManageSubjectParticipation ? 'Assign learners to subjects' : 'Subject Participation'}
                                </h2>
                                <p className="text-sm text-gray-500">
                                    {canManageSubjectParticipation
                                        ? 'Open the correct cohort subject learner page for each subject offering in this cohort.'
                                        : 'Read-only subject participation summary for the cohort subjects in this cohort.'}
                                </p>
                            </div>
                            {canLinkSubjects ? (
                                <Button
                                    type="button"
                                    className="w-full sm:w-auto"
                                    onClick={() => setAssignSubjectsOpen(true)}
                                >
                                    Link Subject to Cohort
                                </Button>
                            ) : null}
                        </div>

                        {cohortSubjects.length > 0 ? (
                            <div className="grid gap-3 md:grid-cols-2">
                                {cohortSubjects.map((subject) => {
                                    const counts = subjectCounts[subject.id];

                                    return (
                                        <div key={subject.id} className="rounded-xl border border-gray-200 p-4">
                                            <div className="space-y-4">
                                                <div className="space-y-2">
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <h3 className="text-sm font-semibold text-gray-900">{subject.subject_name}</h3>
                                                        <Badge variant="info">{subject.subject_code}</Badge>
                                                        {subject.is_compulsory ? <Badge variant="default">Compulsory</Badge> : null}
                                                    </div>
                                                    {counts ? (
                                                        <div className="flex flex-wrap gap-3 text-sm text-gray-500">
                                                            <span>Enrolled: {counts.enrolled}</span>
                                                            <span>Available: {counts.available}</span>
                                                        </div>
                                                    ) : (
                                                        <p className="text-sm text-gray-500">
                                                            {canManageSubjectParticipation
                                                                ? 'Cohort subject counts load when available from the learner management endpoint.'
                                                                : 'View-only status for this cohort subject.'}
                                                        </p>
                                                    )}
                                                </div>
                                                {canManageSubjectParticipation ? (
                                                    <Link
                                                        href={`/academic/cohort-subjects/${subject.id}/learners`}
                                                        className="w-full sm:w-auto"
                                                    >
                                                        <Button size="sm" className="w-full sm:w-auto">
                                                            Manage {subject.subject_name} Learners
                                                        </Button>
                                                    </Link>
                                                ) : null}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-4 py-8 text-center">
                                <p className="text-sm text-gray-500">No subjects are linked to this cohort yet.</p>
                                {canLinkSubjects ? (
                                    <div className="mt-4 flex justify-center">
                                        <Button type="button" onClick={() => setAssignSubjectsOpen(true)}>
                                            Link Subject to Cohort
                                        </Button>
                                    </div>
                                ) : null}
                            </div>
                        )}
                    </>
                ) : (
                    <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-4 py-8 text-center text-sm text-gray-500">
                        Subject participation for this cohort is managed through curriculum-specific tools.
                    </div>
                )}
            </Card>

            <div className="grid gap-4 md:grid-cols-3">
                <StatsCard title="Enrolled" value={enrolled.length} icon={Users} color="blue" />
                <StatsCard title="Available" value={available.length} icon={UserPlus} color="green" />
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
                    onSearch={() => searchAvailable(searchAvailableStr)}
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

            {cohort && showKernelSubjectParticipation && canLinkSubjects ? (
                <ManageCohortSubjectsModal
                    isOpen={assignSubjectsOpen}
                    onClose={() => setAssignSubjectsOpen(false)}
                    cohort={cohort}
                    onSubjectsChanged={async () => {
                        await refetchCohort();
                    }}
                />
            ) : null}
        </div>
    );
}
