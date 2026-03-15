'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import {
    TrendingUp, Users, BookOpen, CheckCircle,
    Circle, AlertCircle, ChevronDown, ChevronRight, History,
} from 'lucide-react';
import { useAuth } from '@/app/context/AuthContext';
import { useCohorts, useAcademicYears } from '@/app/core/hooks/useAcademic';
import { useCoverageProgress } from '@/app/core/hooks/useTopics';
import { cohortAPI } from '@/app/core/api/academic';
import { Card } from '@/app/components/ui/Card';
import { Badge } from '@/app/components/ui/Badge';
import { Select } from '@/app/components/ui/Select';

// ── Academic nav ──────────────────────────────────────────────────────────

function AcademicNav({ active }: { active: 'browser' | 'progress' | 'authoring' }) {
    const { user } = useAuth();
    const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPERADMIN';

    return (
        <nav className="flex gap-2 bg-white rounded-xl p-1.5 shadow-sm border border-gray-200">
            {isAdmin && (
                <Link
                    href="/academic/topics"
                    className={`flex-1 text-center text-sm font-medium rounded-lg py-2.5 transition-colors ${active === 'authoring'
                        ? 'font-semibold text-white bg-blue-600 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                        }`}
                >
                    Authoring
                </Link>
            )}
            <Link
                href="/academic/topics/browser"
                className={`flex-1 text-center text-sm font-medium rounded-lg py-2.5 transition-colors ${active === 'browser'
                    ? 'font-semibold text-white bg-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }`}
            >
                {isAdmin ? 'Browser' : 'My Topics'}
            </Link>
            <Link
                href="/academic/progress"
                className={`flex-1 text-center text-sm font-medium rounded-lg py-2.5 transition-colors ${active === 'progress'
                    ? 'font-semibold text-white bg-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }`}
            >
                Progress
            </Link>
        </nav>
    );
}

// ── Coverage bar ──────────────────────────────────────────────────────────

function CoverageBar({ percentage }: { percentage: number }) {
    const color =
        percentage >= 80 ? 'bg-green-500' :
            percentage >= 60 ? 'bg-blue-500' :
                percentage >= 40 ? 'bg-yellow-500' :
                    percentage > 0 ? 'bg-red-400' :
                        'bg-gray-200';

    return (
        <div className="flex items-center gap-3">
            <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                    className={`h-full rounded-full transition-all duration-500 ${color}`}
                    style={{ width: `${percentage}%` }}
                />
            </div>
            <span className="text-sm font-semibold text-gray-900 w-12 text-right">
                {percentage}%
            </span>
        </div>
    );
}

function coverageVariant(pct: number): 'green' | 'blue' | 'yellow' | 'red' | 'default' {
    if (pct >= 80) return 'green';
    if (pct >= 60) return 'blue';
    if (pct >= 40) return 'yellow';
    if (pct > 0) return 'red';
    return 'default';
}

// ── CohortSubject coverage card ───────────────────────────────────────────

function CohortSubjectCard({
    cohortSubjectId,
    isHistorical,
}: {
    cohortSubjectId: number;
    isHistorical: boolean;
}) {
    const [open, setOpen] = useState(false);
    const { progress, loading } = useCoverageProgress(cohortSubjectId);

    if (loading || !progress) {
        return (
            <div className="border border-gray-200 rounded-xl p-4 animate-pulse">
                <div className="h-4 bg-gray-100 rounded w-1/3 mb-3" />
                <div className="h-2 bg-gray-100 rounded" />
            </div>
        );
    }

    return (
        <div className={`border rounded-xl overflow-hidden ${isHistorical ? 'border-gray-100 opacity-80' : 'border-gray-200'
            }`}>
            <button
                type="button"
                onClick={() => setOpen(v => !v)}
                className="w-full flex items-center gap-4 px-5 py-4 bg-white hover:bg-gray-50 transition-colors text-left"
            >
                <div className="shrink-0">
                    {open
                        ? <ChevronDown className="h-5 w-5 text-blue-600" />
                        : <ChevronRight className="h-5 w-5 text-gray-400" />
                    }
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <p className="font-semibold text-gray-900">{progress.subject_name}</p>
                        {isHistorical && (
                            <Badge variant="default" size="sm">
                                <History className="h-3 w-3 mr-1" />
                                {progress.academic_year}
                            </Badge>
                        )}
                    </div>
                    <div className="mt-2">
                        <CoverageBar percentage={progress.percentage} />
                    </div>
                </div>
                <div className="text-right shrink-0">
                    <Badge variant={coverageVariant(progress.percentage)} size="md">
                        {progress.covered}/{progress.total}
                    </Badge>
                    <p className="text-xs text-gray-500 mt-1">subtopics covered</p>
                </div>
            </button>

            {open && (
                <div className="border-t border-gray-100 bg-gray-50 px-5 py-4">
                    {progress.uncovered_subtopics.length === 0 ? (
                        <div className="flex items-center gap-2 text-green-600">
                            <CheckCircle className="h-5 w-5" />
                            <span className="text-sm font-medium">
                                All subtopics covered — well done!
                            </span>
                        </div>
                    ) : (
                        <>
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                                Remaining subtopics
                            </p>
                            <div className="space-y-2">
                                {progress.uncovered_subtopics.map(s => (
                                    <div key={s.id} className="flex items-center gap-3">
                                        <Circle className="h-4 w-4 text-gray-300 shrink-0" />
                                        <span className="font-mono text-xs text-gray-400">{s.code}</span>
                                        <span className="text-sm text-gray-700">{s.name}</span>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </div>
            )}
        </div>
    );
}

// ── Page ──────────────────────────────────────────────────────────────────

export default function AcademicProgressPage() {
    const { user } = useAuth();
    const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPERADMIN';

    const { academicYears } = useAcademicYears();
    const currentYear = useMemo(
        () => academicYears.find(y => y.is_current),
        [academicYears]
    );

    // Default to current year, allow switching to historical for reference
    const [selectedYearId, setSelectedYearId] = useState<number | undefined>(undefined);
    useEffect(() => {
        if (currentYear && selectedYearId === undefined) {
            setSelectedYearId(currentYear.id);
        }
    }, [currentYear]);

    // Non-CBC cohorts only — filter by curriculum_type not display name
    const { cohorts: allCohorts, loading: cohortsLoading } = useCohorts(
        selectedYearId ? { academic_year: selectedYearId } : undefined
    );
    const cohorts = allCohorts.filter(
        c => (c as any).curriculum_type !== 'CBE'
    );

    const [selectedCohortId, setSelectedCohortId] = useState<number | null>(null);

    // Auto-select first cohort for instructors when cohorts load
    useEffect(() => {
        if (!isAdmin && cohorts.length > 0 && !selectedCohortId) {
            setSelectedCohortId(cohorts[0].id);
        }
    }, [cohorts, isAdmin]);

    // Reset cohort selection when year changes
    useEffect(() => {
        setSelectedCohortId(null);
        setCohortSubjectIds([]);
    }, [selectedYearId]);

    // Load CohortSubject IDs for the selected cohort
    const [cohortSubjectIds, setCohortSubjectIds] = useState<number[]>([]);
    const [csLoading, setCsLoading] = useState(false);

    useEffect(() => {
        if (!selectedCohortId) {
            setCohortSubjectIds([]);
            return;
        }
        setCsLoading(true);
        cohortAPI.getById(selectedCohortId)
            .then(detail => {
                const ids = (detail.subjects as any[])?.map((cs: any) => cs.id) ?? [];
                setCohortSubjectIds(ids);
            })
            .catch(() => setCohortSubjectIds([]))
            .finally(() => setCsLoading(false));
    }, [selectedCohortId]);

    const selectedCohort = cohorts.find(c => c.id === selectedCohortId);
    const isHistoricalView = selectedCohort ? !selectedCohort.is_current_year : false;

    return (
        <div className="space-y-6 max-w-5xl mx-auto">
            <AcademicNav active="progress" />

            {/* Header */}
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
                    {/* Year filter — admins can look at historical years */}
                    {isAdmin && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Academic Year
                            </label>
                            <Select
                                value={selectedYearId?.toString() ?? ''}
                                onChange={e =>
                                    setSelectedYearId(e.target.value ? Number(e.target.value) : undefined)
                                }
                                options={[
                                    { value: '', label: 'All Years' },
                                    ...academicYears.map(y => ({
                                        value: String(y.id),
                                        label: y.is_current
                                            ? `${y.name} (Current)`
                                            : `${y.name} — Historical`,
                                    })),
                                ]}
                            />
                        </div>
                    )}

                    {/* Cohort selector */}
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <Users className="h-4 w-4 text-gray-400" />
                            <label className="text-sm font-medium text-gray-700">Cohort</label>
                        </div>
                        <Select
                            value={selectedCohortId?.toString() ?? ''}
                            onChange={e =>
                                setSelectedCohortId(e.target.value ? Number(e.target.value) : null)
                            }
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
                                ...cohorts.map(c => ({
                                    value: String(c.id),
                                    label: c.name,
                                })),
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
                    <div className="flex flex-wrap gap-3">
                        {[
                            { label: 'Excellent ≥80%', variant: 'green' },
                            { label: 'Good 60–79%', variant: 'blue' },
                            { label: 'Progressing 40–59%', variant: 'yellow' },
                            { label: 'Behind 1–39%', variant: 'red' },
                            { label: 'Not started', variant: 'default' },
                        ].map(item => (
                            <div key={item.label} className="flex items-center gap-1.5">
                                <Badge variant={item.variant as any} size="sm">•</Badge>
                                <span className="text-xs text-gray-600">{item.label}</span>
                            </div>
                        ))}
                    </div>
                </Card>
            )}

            {/* Main content */}
            {!selectedCohortId ? (
                <Card>
                    <div className="py-16 text-center">
                        <div className="p-4 bg-blue-50 rounded-full inline-flex mb-4">
                            <BookOpen className="h-12 w-12 text-blue-400" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-1">
                            Select a Cohort
                        </h3>
                        <p className="text-sm text-gray-500 max-w-sm mx-auto">
                            Choose a cohort above to see topic coverage progress for each subject.
                        </p>
                    </div>
                </Card>
            ) : csLoading ? (
                <div className="py-16 text-center">
                    <div className="inline-block h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent mb-3" />
                    <p className="text-sm text-gray-500">Loading subjects...</p>
                </div>
            ) : cohortSubjectIds.length === 0 ? (
                <Card>
                    <div className="py-12 text-center">
                        <AlertCircle className="mx-auto h-10 w-10 text-gray-300 mb-3" />
                        <p className="text-sm text-gray-500">
                            No subjects assigned to this cohort yet.
                        </p>
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