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
import { Button } from '@/app/components/ui/Button';
import { StatsCard } from '@/app/components/dashboard/StatsCard';
import { ErrorBanner } from '@/app/components/ui/ErrorBanner';
import { EnrolledPanel, AvailablePanel, EnrollModal, UnenrollModal } from '@/app/core/components/cohorts/CohortStudentComponents';
import { useCohortStudents } from '@/app/core/hooks/useCohortStudents';

export default function CohortStudentsPage() {
    const params = useParams();
    const cohortId = Number(params.id);

    const {
        cohortName, enrolled, available,
        loading, error, clearError,
        searchAvailable, bulkEnroll, bulkUnenroll,
    } = useCohortStudents(cohortId);

    const [selectedEnrolled, setSelectedEnrolled] = useState<Set<number>>(new Set());
    const [selectedAvailable, setSelectedAvailable] = useState<Set<number>>(new Set());
    const [searchEnrolled, setSearchEnrolled] = useState('');
    const [searchAvailableStr, setSearchAvailableStr] = useState('');
    const [showEnrollModal, setShowEnrollModal] = useState(false);
    const [showUnenrollModal, setShowUnenrollModal] = useState(false);
    const [actionError, setActionError] = useState<string | null>(null);

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
            s.has(id) ? s.delete(id) : s.add(id);
            return s;
        });
    };

    const toggleAvailable = (id: number) => {
        setSelectedAvailable(prev => {
            const s = new Set(prev);
            s.has(id) ? s.delete(id) : s.add(id);
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
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link href="/academic/cohorts">
                        <Button variant="ghost" size="sm">
                            <ArrowLeft className="mr-2 h-4 w-4" />Back to Cohorts
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Manage Students</h1>
                        {cohortName && <p className="text-sm text-gray-500 mt-0.5">{cohortName}</p>}
                    </div>
                </div>
                <Link href="/assessments">
                    <Button variant="secondary" size="sm">View Assessments</Button>
                </Link>
            </div>

            {(error || actionError) && (
                <ErrorBanner
                    message={error ?? actionError ?? ''}
                    onDismiss={() => { clearError(); setActionError(null); }}
                />
            )}

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
        </div>
    );
}