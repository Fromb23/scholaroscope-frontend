'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { FileSpreadsheet, FileText, UserPlus, Users } from 'lucide-react';
import { useStudents, useStudentStats, useStudentsByCohort } from '@/app/core/hooks/useStudents';
import { useCurricula, useCohorts, useCohortSubjects } from '@/app/core/hooks/useAcademic';
import { usePersistedFilters } from '@/app/core/hooks/usePersistedFilters';
import { useInstructorCohortAccess } from '@/app/core/hooks/useInstructorCohortAccess';
import { learnersAPI } from '@/app/core/api/learners';
import type { ApiError } from '@/app/core/types/errors';
import { extractErrorMessage } from '@/app/core/types/errors';
import type { Student } from '@/app/core/types/student';
import { useAuth } from '@/app/context/AuthContext';
import { hasCapability } from '@/app/utils/permissions';
import { Card } from '@/app/components/ui/Card';
import { Button } from '@/app/components/ui/Button';
import { Badge } from '@/app/components/ui/Badge';
import { DataTable, type Column } from '@/app/components/ui/Table';
import { StatsCard } from '@/app/components/dashboard/StatsCard';
import { ErrorBanner } from '@/app/components/ui/ErrorBanner';
import { LoadingSpinner } from '@/app/components/ui/LoadingSpinner';

const STATUS_VARIANTS: Record<string, 'success' | 'warning' | 'danger' | 'info'> = {
    ACTIVE: 'success',
    GRADUATED: 'info',
    TRANSFERRED: 'warning',
    SUSPENDED: 'danger',
    WITHDRAWN: 'danger',
};

type PersistedLearnerFilters = {
    curriculum: number | null;
    cohort: number | null;
    cohort_subject: number | null;
    status: string;
    admission_number: string;
    name: string;
    page: number;
    page_size: number;
};

type LearnerTableRow = Student & Record<string, unknown>;

function normalizeText(value?: string | null): string {
    return (value ?? '').trim().toLowerCase();
}

function studentMatchesLocalFilters(student: Student, filters: PersistedLearnerFilters): boolean {
    if (filters.cohort_subject) {
        const currentSubjectIds = student.current_subject_ids ?? [];
        if (!currentSubjectIds.includes(filters.cohort_subject)) {
            return false;
        }
    }

    if (filters.status && student.status !== filters.status) {
        return false;
    }

    if (
        filters.admission_number
        && !normalizeText(student.admission_number).includes(normalizeText(filters.admission_number))
    ) {
        return false;
    }

    if (filters.name) {
        const fullName = normalizeText(student.full_name);
        const splitTerms = normalizeText(filters.name).split(/\s+/).filter(Boolean);
        if (!splitTerms.every((term) => fullName.includes(term))) {
            return false;
        }
    }

    return true;
}

function compareAdmissionNumbers(left: Student, right: Student): number {
    return left.admission_number.localeCompare(right.admission_number, undefined, {
        numeric: true,
        sensitivity: 'base',
    });
}

function LearnersPageInner() {
    const router = useRouter();
    const { activeRole } = useAuth();
    const isInstructor = activeRole === 'INSTRUCTOR';
    const isAdmin = activeRole === 'ADMIN';
    const canCreate = hasCapability(activeRole, 'CREATE_LEARNER');

    const [filters, updateFilters, backUrl] = usePersistedFilters<PersistedLearnerFilters>('/learners', {
        curriculum: null,
        cohort: null,
        cohort_subject: null,
        status: '',
        admission_number: '',
        name: '',
        page: 1,
        page_size: 20,
    }, {
        numericKeys: ['curriculum', 'cohort', 'cohort_subject', 'page', 'page_size'],
    });
    const [exportingFormat, setExportingFormat] = useState<'xlsx' | 'pdf' | null>(null);
    const [exportError, setExportError] = useState<string | null>(null);

    const { stats } = useStudentStats();

    const { curricula } = useCurricula();
    const { cohorts } = useCohorts(
        isAdmin && filters.curriculum
            ? { curriculum: filters.curriculum }
            : undefined,
        { enabled: isAdmin && Boolean(filters.curriculum) }
    );
    const { cohortSubjects } = useCohortSubjects(
        isAdmin ? (filters.cohort ?? undefined) : undefined
    );

    const {
        cohortAssignments,
        assignments,
        hasAssignedCohorts,
        isLoading: instructorAssignmentsLoading,
    } = useInstructorCohortAccess({ enabled: isInstructor });

    const instructorStudentsQuery = useStudents(
        {
            cohort: filters.cohort ?? undefined,
            cohort_subject: filters.cohort_subject ?? undefined,
            status: filters.status || undefined,
            admission_number: filters.admission_number || undefined,
            name: filters.name || undefined,
            page: filters.page,
            page_size: filters.page_size,
        },
        { enabled: isInstructor }
    );
    const adminStudentsQuery = useStudentsByCohort(
        isAdmin ? (filters.cohort ?? undefined) : undefined
    );

    const instructorCohortOptions = useMemo<Array<{ id: number; label: string }>>(() => (
        Array.from(
            new Map(
                [
                    ...cohortAssignments.map((assignment) => [
                        assignment.cohort_id,
                        {
                            id: assignment.cohort_id,
                            label: assignment.cohort_name,
                        },
                    ] as const),
                    ...assignments
                        .filter((assignment) => (
                            typeof assignment.cohort_id === 'number'
                            && Number.isFinite(assignment.cohort_id)
                            && Boolean(assignment.cohort_name)
                        ))
                        .map((assignment) => [
                            assignment.cohort_id as number,
                            {
                                id: assignment.cohort_id as number,
                                label: assignment.cohort_name,
                            },
                        ] as const),
                ]
            ).values()
        ).sort((left, right) => left.label.localeCompare(right.label))
    ), [assignments, cohortAssignments]);

    const instructorSubjectOptions = useMemo<Array<{ id: number; label: string }>>(() => (
        Array.from(
            new Map(
                assignments
                    .filter((assignment) => (
                        typeof assignment.cohort_subject_id === 'number'
                        && Number.isFinite(assignment.cohort_subject_id)
                        && (!filters.cohort || assignment.cohort_id === filters.cohort)
                    ))
                    .map((assignment) => [
                        assignment.cohort_subject_id as number,
                        {
                            id: assignment.cohort_subject_id as number,
                            label: filters.cohort
                                ? assignment.subject_name
                                : `${assignment.subject_name} • ${assignment.cohort_name}`,
                        },
                    ])
            ).values()
        ).sort((left, right) => left.label.localeCompare(right.label))
    ), [assignments, filters.cohort]);
    const hasInstructorLearnerScope = hasAssignedCohorts || assignments.length > 0;

    useEffect(() => {
        if (!filters.cohort_subject) {
            return;
        }

        const validSubjectIds = new Set(
            (isInstructor ? instructorSubjectOptions : cohortSubjects).map((subject) => subject.id)
        );

        if (!validSubjectIds.has(filters.cohort_subject)) {
            updateFilters({ cohort_subject: null, page: 1 });
        }
    }, [
        cohortSubjects,
        filters.cohort_subject,
        instructorSubjectOptions,
        isInstructor,
        updateFilters,
    ]);

    const adminFilteredStudents = useMemo(() => {
        if (!isAdmin || !filters.cohort) {
            return [];
        }

        return [...adminStudentsQuery.students]
            .filter((student) => studentMatchesLocalFilters(student, filters))
            .sort(compareAdmissionNumbers);
    }, [adminStudentsQuery.students, filters, isAdmin]);

    const adminTotalPages = adminFilteredStudents.length > 0
        ? Math.ceil(adminFilteredStudents.length / filters.page_size)
        : 0;
    const adminCurrentPage = adminTotalPages === 0
        ? 1
        : Math.min(filters.page, adminTotalPages);
    const adminVisibleStudents = useMemo(() => {
        if (!isAdmin) {
            return [];
        }

        const startIndex = (adminCurrentPage - 1) * filters.page_size;
        return adminFilteredStudents.slice(startIndex, startIndex + filters.page_size);
    }, [adminCurrentPage, adminFilteredStudents, filters.page_size, isAdmin]);

    useEffect(() => {
        if (!isAdmin || adminTotalPages === 0 || filters.page <= adminTotalPages) {
            return;
        }

        updateFilters({ page: adminTotalPages });
    }, [adminTotalPages, filters.page, isAdmin, updateFilters]);

    const adminPagination = useMemo(() => ({
        currentPage: adminCurrentPage,
        pageSize: filters.page_size,
        totalItems: adminFilteredStudents.length,
        totalPages: adminTotalPages,
    }), [adminCurrentPage, adminFilteredStudents.length, adminTotalPages, filters.page_size]);

    const displayedStudents = isInstructor
        ? instructorStudentsQuery.students
        : adminVisibleStudents;
    const displayedPagination = isInstructor
        ? instructorStudentsQuery.pagination
        : adminPagination;
    const displayedLoading = isInstructor
        ? (instructorAssignmentsLoading || instructorStudentsQuery.loading)
        : adminStudentsQuery.loading;
    const displayedError = isInstructor
        ? instructorStudentsQuery.error
        : adminStudentsQuery.error;
    const hasGeneratedAdminList = isAdmin && Boolean(filters.cohort);
    const currentVisibleCount = isInstructor
        ? instructorStudentsQuery.pagination.totalItems
        : adminFilteredStudents.length;

    const columns: Column<LearnerTableRow>[] = [
        {
            key: 'admission_number',
            header: 'Adm No.',
            render: (row) => (
                <span className="font-mono text-sm font-medium text-blue-700">
                    {row.admission_number}
                </span>
            ),
        },
        {
            key: 'full_name',
            header: 'Full Name',
            render: (row) => row.full_name,
        },
        {
            key: 'primary_cohort_name',
            header: 'Primary Cohort',
            render: (row) => (
                <div>
                    <p className="font-medium text-gray-900">{row.primary_cohort_name ?? '-'}</p>
                    <p className="text-xs text-gray-500">{row.primary_curriculum ?? ''}</p>
                </div>
            ),
        },
        {
            key: 'status',
            header: 'Status',
            render: (row) => (
                <Badge variant={STATUS_VARIANTS[row.status] ?? 'default'}>
                    {row.status}
                </Badge>
            ),
        },
        {
            key: 'email',
            header: 'Email',
            render: (row) => (
                <span className="text-sm text-gray-600">
                    {row.email || '-'}
                </span>
            ),
        },
        {
            key: 'actions',
            header: '',
            render: (row) => (
                <Button
                    size="sm"
                    variant="ghost"
                    onClick={(event) => {
                        event.stopPropagation();
                        router.push(`/learners/${row.id}?back=${backUrl}`);
                    }}
                >
                    View
                </Button>
            ),
        },
    ];

    const pageTitle = isInstructor ? 'My Learners' : 'Learners';
    const pageDescription = isInstructor
        ? 'Search learners across your assigned cohorts and class subjects.'
        : 'Generate a cohort learner list, then refine the loaded rows locally.';

    const handleCurriculumChange = (value: string) => {
        updateFilters({
            curriculum: value ? Number(value) : null,
            cohort: null,
            cohort_subject: null,
            page: 1,
        });
    };

    const handleCohortChange = (value: string) => {
        updateFilters({
            cohort: value ? Number(value) : null,
            cohort_subject: null,
            page: 1,
        });
    };

    const handleExport = async (format: 'xlsx' | 'pdf') => {
        setExportingFormat(format);
        setExportError(null);

        try {
            await learnersAPI.exportStudents({
                cohort: filters.cohort ?? undefined,
                cohort_subject: filters.cohort_subject ?? undefined,
                status: filters.status || undefined,
                admission_number: filters.admission_number || undefined,
                name: filters.name || undefined,
                format,
            });
        } catch (err) {
            setExportError(
                extractErrorMessage(err as ApiError, `Failed to export learners as ${format.toUpperCase()}.`)
            );
        } finally {
            setExportingFormat(null);
        }
    };

    const renderFilterControls = () => {
        if (isInstructor) {
            return (
                <Card>
                    <div className="space-y-4">
                        <div>
                            <p className="text-sm font-medium text-gray-900">Search assigned learners</p>
                            <p className="text-sm text-gray-500">
                                Cohort and subject filters only narrow within your assigned teaching load.
                            </p>
                        </div>

                        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                            <select
                                value={filters.cohort ?? ''}
                                onChange={(event) => handleCohortChange(event.target.value)}
                                className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="">All assigned cohorts</option>
                                {instructorCohortOptions.map((cohort) => (
                                    <option key={cohort.id} value={cohort.id}>{cohort.label}</option>
                                ))}
                            </select>

                            <select
                                value={filters.cohort_subject ?? ''}
                                onChange={(event) => updateFilters({
                                    cohort_subject: event.target.value ? Number(event.target.value) : null,
                                    page: 1,
                                })}
                                className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="">All assigned subjects</option>
                                {instructorSubjectOptions.map((subject) => (
                                    <option key={subject.id} value={subject.id}>{subject.label}</option>
                                ))}
                            </select>

                            <input
                                value={filters.admission_number}
                                onChange={(event) => updateFilters({
                                    admission_number: event.target.value,
                                    page: 1,
                                })}
                                placeholder="Admission number"
                                className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />

                            <input
                                value={filters.name}
                                onChange={(event) => updateFilters({
                                    name: event.target.value,
                                    page: 1,
                                })}
                                placeholder="Learner name"
                                className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />

                            <select
                                value={filters.status}
                                onChange={(event) => updateFilters({
                                    status: event.target.value,
                                    page: 1,
                                })}
                                className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="">All status</option>
                                <option value="ACTIVE">Active</option>
                                <option value="GRADUATED">Graduated</option>
                                <option value="TRANSFERRED">Transferred</option>
                                <option value="SUSPENDED">Suspended</option>
                                <option value="WITHDRAWN">Withdrawn</option>
                            </select>
                        </div>
                    </div>
                </Card>
            );
        }

        return (
            <Card>
                <div className="space-y-4">
                    <div>
                        <p className="text-sm font-medium text-gray-900">Generate learner list</p>
                        <p className="text-sm text-gray-500">
                            Select a curriculum and cohort to load the full class list, then refine the loaded rows below.
                        </p>
                    </div>

                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                        <select
                            value={filters.curriculum ?? ''}
                            onChange={(event) => handleCurriculumChange(event.target.value)}
                            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="">Select curriculum</option>
                            {curricula.map((curriculum) => (
                                <option key={curriculum.id} value={curriculum.id}>{curriculum.name}</option>
                            ))}
                        </select>

                        <select
                            value={filters.cohort ?? ''}
                            onChange={(event) => handleCohortChange(event.target.value)}
                            disabled={!filters.curriculum}
                            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-500"
                        >
                            <option value="">Select cohort</option>
                            {cohorts.map((cohort) => (
                                <option key={cohort.id} value={cohort.id}>{cohort.name}</option>
                            ))}
                        </select>

                        <select
                            value={filters.cohort_subject ?? ''}
                            onChange={(event) => updateFilters({
                                cohort_subject: event.target.value ? Number(event.target.value) : null,
                                page: 1,
                            })}
                            disabled={!filters.cohort}
                            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-500"
                        >
                            <option value="">All subjects</option>
                            {cohortSubjects.map((subject) => (
                                <option key={subject.id} value={subject.id}>{subject.subject_name}</option>
                            ))}
                        </select>
                    </div>

                    {hasGeneratedAdminList ? (
                        <div className="space-y-3 border-t border-gray-200 pt-4">
                            <div>
                                <p className="text-sm font-medium text-gray-900">Refine loaded cohort list</p>
                                <p className="text-sm text-gray-500">
                                    These filters work on the rows already loaded for the selected cohort.
                                </p>
                            </div>

                            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                                <input
                                    value={filters.admission_number}
                                    onChange={(event) => updateFilters({
                                        admission_number: event.target.value,
                                        page: 1,
                                    })}
                                    placeholder="Admission number"
                                    className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />

                                <input
                                    value={filters.name}
                                    onChange={(event) => updateFilters({
                                        name: event.target.value,
                                        page: 1,
                                    })}
                                    placeholder="Learner name"
                                    className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />

                                <select
                                    value={filters.status}
                                    onChange={(event) => updateFilters({
                                        status: event.target.value,
                                        page: 1,
                                    })}
                                    className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="">All status</option>
                                    <option value="ACTIVE">Active</option>
                                    <option value="GRADUATED">Graduated</option>
                                    <option value="TRANSFERRED">Transferred</option>
                                    <option value="SUSPENDED">Suspended</option>
                                    <option value="WITHDRAWN">Withdrawn</option>
                                </select>

                                <div className="flex items-center rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-600">
                                    {adminFilteredStudents.length} learner{adminFilteredStudents.length === 1 ? '' : 's'} match
                                </div>
                            </div>
                        </div>
                    ) : null}
                </div>
            </Card>
        );
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">{pageTitle}</h1>
                    <p className="mt-1 text-sm text-gray-500">{pageDescription}</p>
                </div>

                <div className="flex items-center gap-2">
                    {(isInstructor || hasGeneratedAdminList) ? (
                        <>
                            <Button
                                type="button"
                                variant="secondary"
                                onClick={() => void handleExport('xlsx')}
                                disabled={currentVisibleCount === 0 || exportingFormat !== null}
                            >
                                <FileSpreadsheet className="mr-2 h-4 w-4" />
                                {exportingFormat === 'xlsx' ? 'Exporting...' : 'Export Excel'}
                            </Button>
                            <Button
                                type="button"
                                variant="secondary"
                                onClick={() => void handleExport('pdf')}
                                disabled={currentVisibleCount === 0 || exportingFormat !== null}
                            >
                                <FileText className="mr-2 h-4 w-4" />
                                {exportingFormat === 'pdf' ? 'Preparing...' : 'Download PDF'}
                            </Button>
                        </>
                    ) : null}

                    {canCreate ? (
                        <Link href="/learners/new">
                            <Button>
                                <UserPlus className="mr-2 h-4 w-4" />
                                Add Learner
                            </Button>
                        </Link>
                    ) : null}
                </div>
            </div>

            {stats ? (
                <div className="grid gap-4 md:grid-cols-4">
                    <StatsCard title="Total" value={stats.total} icon={Users} color="blue" />
                    <StatsCard title="Active" value={stats.active} icon={Users} color="green" />
                    <StatsCard title="Graduated" value={stats.graduated} icon={Users} color="yellow" />
                    <StatsCard title="Transferred" value={stats.transferred} icon={Users} color="red" />
                </div>
            ) : null}

            {exportError ? (
                <ErrorBanner message={exportError} onDismiss={() => setExportError(null)} />
            ) : null}

            {displayedError ? (
                <Card>
                    <p className="text-sm text-red-700">{displayedError}</p>
                </Card>
            ) : null}

            {renderFilterControls()}

            {isInstructor && !instructorAssignmentsLoading && !hasInstructorLearnerScope ? (
                <Card>
                    <p className="py-10 text-center text-sm text-gray-500">
                        No assigned cohorts or class subjects were found for this instructor.
                    </p>
                </Card>
            ) : isAdmin && !filters.cohort ? (
                <Card>
                    <p className="py-10 text-center text-sm text-gray-500">
                        Select a curriculum and cohort to generate the learner list.
                    </p>
                </Card>
            ) : (
                <DataTable
                    data={displayedStudents as LearnerTableRow[]}
                    columns={columns}
                    loading={displayedLoading}
                    pagination={displayedPagination}
                    onPaginationChange={(page, pageSize) => updateFilters({ page, page_size: pageSize })}
                    emptyMessage={isInstructor
                        ? 'No learners match the current assigned-learner filters.'
                        : 'No learners match the current cohort filters.'}
                    enableSearch={false}
                    enableSort={false}
                    onRowClick={(row) => router.push(`/learners/${row.id}?back=${backUrl}`)}
                />
            )}
        </div>
    );
}

export default function LearnersPage() {
    return (
        <Suspense fallback={<LoadingSpinner message="Loading..." />}>
            <LearnersPageInner />
        </Suspense>
    );
}
