'use client';

// ============================================================================
// app/(dashboard)/academic/progress/page.tsx
//
// Responsibility: fetch via hooks, manage filter state, compose components.
// No direct API calls. No any casts.
// ============================================================================

import { useState, useMemo, useEffect } from 'react';
import { TrendingUp, Users, BookOpen, AlertCircle, History } from 'lucide-react';
import { useAuth } from '@/app/context/AuthContext';
import { useCohorts, useAcademicYears, useCohortDetail } from '@/app/core/hooks/useAcademic';
import { Card } from '@/app/components/ui/Card';
import { Badge } from '@/app/components/ui/Badge';
import { Select } from '@/app/components/ui/Select';
import { LoadingSpinner } from '@/app/components/ui/LoadingSpinner';
import {
    AcademicNav,
    CoverageLegend,
    CohortSubjectCard,
} from '@/app/core/components/academic/AcademicProgressComponents';

export default function AcademicProgressPage() {
    const { user, activeRole } = useAuth();
    const isAdmin = activeRole === 'ADMIN' || user?.is_superadmin;

    const { academicYears } = useAcademicYears();
    const currentYear = useMemo(() => academicYears.find(y => y.is_current), [academicYears]);

    const [selectedYearId, setSelectedYearId] = useState<number | undefined>(undefined);
    const [selectedCohortId, setSelectedCohortId] = useState<number | null>(null);

    // Default to current year once loaded
    useEffect(() => {
        if (currentYear && selectedYearId === undefined) {
            setSelectedYearId(currentYear.id);
        }
    }, [currentYear, selectedYearId]);

    // Reset cohort when year changes
    useEffect(() => {
        setSelectedCohortId(null);
    }, [selectedYearId]);

    // Non-CBC cohorts — Cohort type has no curriculum_type field,
    // filter by curriculum_name not containing 'CBC' or 'CBE'
    const { cohorts: allCohorts, loading: cohortsLoading } = useCohorts(
        selectedYearId ? { academic_year: selectedYearId } : undefined
    );
    const cohorts = allCohorts.filter(c => !c.curriculum_name?.includes('CBC') && !c.curriculum_name?.includes('CBE'));

    // Auto-select first cohort for instructors
    useEffect(() => {
        if (!isAdmin && cohorts.length > 0 && !selectedCohortId) {
            setSelectedCohortId(cohorts[0].id);
        }
    }, [cohorts, isAdmin, selectedCohortId]);

    // Load cohort detail via hook — replaces direct cohortAPI.getById() call
    const { cohort: cohortDetail, loading: csLoading } = useCohortDetail(selectedCohortId);

    // Extract cohort subject IDs — CohortDetail.subjects is CohortSubject[] (typed)
    const cohortSubjectIds = useMemo(
        () => cohortDetail?.subjects?.map(cs => cs.id) ?? [],
        [cohortDetail]
    );

    const selectedCohort = cohorts.find(c => c.id === selectedCohortId);
    const isHistoricalView = selectedCohort ? !selectedCohort.is_current_year : false;

    // ── Render ────────────────────────────────────────────────────────────

    return (
        <div className="space-y-6 max-w-5xl mx-auto">
            <AcademicNav active="progress" />

            <div className="flex items-center gap-4">
                <div className="p-3 bg-gradient-to-br from-green-100 to-teal-100 rounded-xl">
                    <TrendingUp className="h-8 w-8 text-green-600" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Topic Coverage Progress</h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Track which subtopics have been covered per cohort and subject
                    </p>
                </div>
            </div>

            {/* Filters */}
            <Card>
                <div className="space-y-4">
                    {isAdmin && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Academic Year
                            </label>
                            <Select
                                value={selectedYearId?.toString() ?? ''}
                                onChange={e => setSelectedYearId(e.target.value ? Number(e.target.value) : undefined)}
                                options={[
                                    { value: '', label: 'All Years' },
                                    ...academicYears.map(y => ({
                                        value: String(y.id),
                                        label: y.is_current ? `${y.name} (Current)` : `${y.name} — Historical`,
                                    })),
                                ]}
                            />
                        </div>
                    )}

                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <Users className="h-4 w-4 text-gray-400" />
                            <label className="text-sm font-medium text-gray-700">Cohort</label>
                        </div>
                        <Select
                            value={selectedCohortId?.toString() ?? ''}
                            onChange={e => setSelectedCohortId(e.target.value ? Number(e.target.value) : null)}
                            disabled={cohortsLoading || cohorts.length === 0}
                            options={[
                                {
                                    value: '',
                                    label: cohortsLoading
                                        ? 'Loading cohorts...'
                                        : cohorts.length === 0
                                            ? 'No cohorts available'
                                            : 'Select a cohort',
                                },
                                ...cohorts.map(c => ({ value: String(c.id), label: c.name })),
                            ]}
                        />
                    </div>
                </div>
            </Card>

            {/* Historical notice */}
            {isHistoricalView && selectedCohortId && (
                <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-700">
                    <History className="h-4 w-4 shrink-0" />
                    Viewing historical progress for a past academic year — read only.
                </div>
            )}

            {/* Coverage legend */}
            {selectedCohortId && (
                <Card className="bg-gray-50">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                        Coverage guide
                    </p>
                    <CoverageLegend />
                </Card>
            )}

            {/* Main content */}
            {!selectedCohortId ? (
                <Card>
                    <div className="py-16 text-center">
                        <div className="p-4 bg-blue-50 rounded-full inline-flex mb-4">
                            <BookOpen className="h-12 w-12 text-blue-400" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-1">Select a Cohort</h3>
                        <p className="text-sm text-gray-500 max-w-sm mx-auto">
                            Choose a cohort above to see topic coverage progress for each subject.
                        </p>
                    </div>
                </Card>
            ) : csLoading ? (
                <LoadingSpinner fullScreen={false} message="Loading subjects..." />
            ) : cohortSubjectIds.length === 0 ? (
                <Card>
                    <div className="py-12 text-center">
                        <AlertCircle className="mx-auto h-10 w-10 text-gray-300 mb-3" />
                        <p className="text-sm text-gray-500">No subjects assigned to this cohort yet.</p>
                    </div>
                </Card>
            ) : (
                <div className="space-y-4">
                    <div className="flex items-center justify-between px-1">
                        <h2 className="text-base font-semibold text-gray-900">
                            {selectedCohort?.name} — Subject Coverage
                        </h2>
                        <Badge variant="info" size="sm">
                            {cohortSubjectIds.length} subject{cohortSubjectIds.length !== 1 ? 's' : ''}
                        </Badge>
                    </div>
                    {cohortSubjectIds.map(csId => (
                        <CohortSubjectCard
                            key={csId}
                            cohortSubjectId={csId}
                            isHistorical={isHistoricalView}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}