'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { FileSpreadsheet, FileText, UserPlus, Users } from 'lucide-react';
import { useStudentStats, useStudentsByCohort } from '@/app/core/hooks/useStudents';
import { useCurricula, useCohorts, useCohortSubjects } from '@/app/core/hooks/useAcademic';
import { usePersistedFilters } from '@/app/core/hooks/usePersistedFilters';
import { useInstructorCohortAccess } from '@/app/core/hooks/useInstructorCohortAccess';
import { learnersAPI } from '@/app/core/api/learners';
import type { ApiError } from '@/app/core/types/errors';
import { extractErrorMessage } from '@/app/core/types/errors';
import { useReportExport } from '@/app/core/hooks/reports/useReportExport';
import type { Student } from '@/app/core/types/student';
import { useAuth } from '@/app/context/AuthContext';
import { hasCapability } from '@/app/utils/permissions';
import { Card } from '@/app/components/ui/Card';
import { Button } from '@/app/components/ui/Button';
import { Badge } from '@/app/components/ui/Badge';
import { DataTable, type Column } from '@/app/components/ui/Table';
import { StatsCard } from '@/app/components/dashboard/StatsCard';
import { StatStrip } from '@/app/components/dashboard/StatStrip';
import { LoadingSpinner } from '@/app/components/ui/LoadingSpinner';
import { useAssistantPageContext } from '@/app/core/components/assistant/useAssistantPageContext';

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
    q: string;
    sort: string;
    page: number;
    page_size: number;
};

type LearnerSortField = 'admission_number' | 'full_name' | 'primary_cohort_name' | 'status';
type LearnerSortDirection = 'asc' | 'desc';
type LearnerSort = {
    field: LearnerSortField;
    direction: LearnerSortDirection;
};

type LearnerTableRow = Student & Record<string, unknown>;

const DEFAULT_SORT = 'admission_number:asc';
const TEXT_COLLATOR = new Intl.Collator(undefined, {
    numeric: true,
    sensitivity: 'base',
});

function normalizeText(value?: string | null): string {
    return (value ?? '').trim().toLowerCase();
}

function matchesLearnerSearch(student: Student, query: string): boolean {
    const normalizedQuery = normalizeText(query);
    if (!normalizedQuery) {
        return true;
    }

    return normalizeText(student.admission_number).includes(normalizedQuery)
        || normalizeText(student.first_name).includes(normalizedQuery)
        || normalizeText(student.middle_name).includes(normalizedQuery)
        || normalizeText(student.last_name).includes(normalizedQuery)
        || normalizeText(student.full_name).includes(normalizedQuery);
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

    if (!matchesLearnerSearch(student, filters.q)) {
        return false;
    }

    return true;
}

function parseSort(value: string): LearnerSort {
    const [field, direction] = value.split(':');
    const resolvedField = (
        field === 'full_name'
        || field === 'primary_cohort_name'
        || field === 'status'
    ) ? field : 'admission_number';

    return {
        field: resolvedField,
        direction: direction === 'desc' ? 'desc' : 'asc',
    };
}

function compareAdmissionNumbers(left: Student, right: Student): number {
    return TEXT_COLLATOR.compare(left.admission_number, right.admission_number);
}

function compareLearners(left: Student, right: Student, sort: LearnerSort): number {
    const direction = sort.direction === 'asc' ? 1 : -1;

    if (sort.field === 'admission_number') {
        return compareAdmissionNumbers(left, right) * direction;
    }

    if (sort.field === 'full_name') {
        return TEXT_COLLATOR.compare(left.full_name, right.full_name) * direction;
    }

    if (sort.field === 'primary_cohort_name') {
        return TEXT_COLLATOR.compare(
            left.primary_cohort_name ?? '',
            right.primary_cohort_name ?? '',
        ) * direction;
    }

    return TEXT_COLLATOR.compare(left.status, right.status) * direction;
}

function LearnersPageInner() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { activeRole, capabilities } = useAuth();
    const isInstructor = activeRole === 'INSTRUCTOR';
    const isAdmin = activeRole === 'ADMIN';
    const canCreate = hasCapability(activeRole, 'CREATE_LEARNER', capabilities);
    const legacyQuery = useMemo(() => {
        const directQuery = (searchParams.get('q') ?? '').trim();
        if (directQuery) {
            return directQuery;
        }

        return [
            searchParams.get('admission_number')?.trim(),
            searchParams.get('name')?.trim(),
        ]
            .filter(Boolean)
            .join(' ')
            .trim();
    }, [searchParams]);

    const [filters, updateFilters, backUrl] = usePersistedFilters<PersistedLearnerFilters>('/learners', {
        curriculum: null,
        cohort: null,
        cohort_subject: null,
        status: '',
        q: legacyQuery,
        sort: DEFAULT_SORT,
        page: 1,
        page_size: 20,
    }, {
        numericKeys: ['curriculum', 'cohort', 'cohort_subject', 'page', 'page_size'],
        staleKeys: ['admission_number', 'name'],
    });
    const [exportingFormat, setExportingFormat] = useState<'xlsx' | 'pdf' | null>(null);
    const [instructorStudents, setInstructorStudents] = useState<Student[]>([]);
    const [instructorStudentsLoading, setInstructorStudentsLoading] = useState(false);
    const [instructorStudentsError, setInstructorStudentsError] = useState<string | null>(null);
    const sort = useMemo(() => parseSort(filters.sort), [filters.sort]);

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
    const adminStudentsQuery = useStudentsByCohort(
        isAdmin ? (filters.cohort ?? undefined) : undefined
    );
    const { handleExport: runExport, exporting } = useReportExport((format) => {
        if (format !== 'xlsx' && format !== 'pdf') {
            throw new Error('Learner exports support Excel and PDF only.');
        }

        return learnersAPI.exportStudents({
            cohort: filters.cohort ?? undefined,
            cohort_subject: filters.cohort_subject ?? undefined,
            status: filters.status || undefined,
            q: filters.q || undefined,
            format,
        });
    }, 'learners');

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

    useEffect(() => {
        let cancelled = false;

        if (!isInstructor) {
            setInstructorStudents([]);
            setInstructorStudentsError(null);
            setInstructorStudentsLoading(false);
            return;
        }

        if (!hasInstructorLearnerScope) {
            setInstructorStudents([]);
            setInstructorStudentsError(null);
            setInstructorStudentsLoading(false);
            return;
        }

        setInstructorStudentsLoading(true);
        setInstructorStudentsError(null);

        learnersAPI.getAllStudents({
            cohort: filters.cohort ?? undefined,
            cohort_subject: filters.cohort_subject ?? undefined,
        })
            .then((data) => {
                if (cancelled) {
                    return;
                }
                setInstructorStudents(data);
            })
            .catch((err) => {
                if (cancelled) {
                    return;
                }
                setInstructorStudents([]);
                setInstructorStudentsError(
                    extractErrorMessage(err as ApiError, 'Failed to load learners')
                );
            })
            .finally(() => {
                if (!cancelled) {
                    setInstructorStudentsLoading(false);
                }
            });

        return () => {
            cancelled = true;
        };
    }, [
        filters.cohort,
        filters.cohort_subject,
        hasInstructorLearnerScope,
        isInstructor,
    ]);

    const baseStudents = useMemo(() => {
        if (isInstructor) {
            return instructorStudents;
        }

        if (!isAdmin || !filters.cohort) {
            return [];
        }

        return adminStudentsQuery.students;
    }, [adminStudentsQuery.students, filters.cohort, instructorStudents, isAdmin, isInstructor]);

    const filteredStudents = useMemo(() => (
        [...baseStudents]
            .filter((student) => studentMatchesLocalFilters(student, filters))
            .sort((left, right) => compareLearners(left, right, sort))
    ), [baseStudents, filters, sort]);

    const totalPages = filteredStudents.length > 0
        ? Math.ceil(filteredStudents.length / filters.page_size)
        : 0;
    const currentPage = totalPages === 0
        ? 1
        : Math.min(filters.page, totalPages);
    const visibleStudents = useMemo(() => {
        const startIndex = (currentPage - 1) * filters.page_size;
        return filteredStudents.slice(startIndex, startIndex + filters.page_size);
    }, [currentPage, filteredStudents, filters.page_size]);

    useEffect(() => {
        if (totalPages === 0) {
            if (filters.page !== 1) {
                updateFilters({ page: 1 });
            }
            return;
        }

        if (filters.page > totalPages) {
            updateFilters({ page: totalPages });
        }
    }, [filters.page, totalPages, updateFilters]);

    const displayedPagination = useMemo(() => ({
        currentPage,
        pageSize: filters.page_size,
        totalItems: filteredStudents.length,
        totalPages,
    }), [currentPage, filteredStudents.length, filters.page_size, totalPages]);

    const displayedLoading = isInstructor
        ? (instructorAssignmentsLoading || instructorStudentsLoading)
        : adminStudentsQuery.loading;
    const displayedError = isInstructor
        ? instructorStudentsError
        : adminStudentsQuery.error;
    const hasGeneratedAdminList = isAdmin && Boolean(filters.cohort);
    const currentVisibleCount = filteredStudents.length;

    const columns: Column<LearnerTableRow>[] = [
        {
            key: 'admission_number',
            header: 'Admission No.',
            sortable: true,
            render: (row) => (
                <span className="theme-table-link font-mono text-sm font-medium">
                    {row.admission_number}
                </span>
            ),
        },
        {
            key: 'full_name',
            header: 'Full Name',
            sortable: true,
            render: (row) => row.full_name,
        },
        {
            key: 'primary_cohort_name',
            header: 'Cohort',
            sortable: true,
            render: (row) => (
                <div>
                    <p className="font-medium theme-text">{row.primary_cohort_name ?? '-'}</p>
                    <p className="text-xs theme-subtle">{row.primary_curriculum ?? ''}</p>
                </div>
            ),
        },
        {
            key: 'status',
            header: 'Status',
            sortable: true,
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
                <span className="text-sm theme-muted">
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
        ? 'Track learners in your assigned classes and follow up where support is needed.'
        : 'Generate a cohort learner list, then refine the loaded rows locally.';
    const assistantContext = useMemo(() => ({
        pageKey: 'learners_overview',
        pageTitle,
        state: {
            is_loading: displayedLoading,
            no_results: !displayedLoading && currentVisibleCount === 0 && Boolean(
                filters.q || filters.cohort || filters.cohort_subject || filters.status
            ),
            current_visible_count: currentVisibleCount,
            scope: isInstructor ? 'assigned' : 'school',
        },
        visibleActions: [
            ...(canCreate
                ? [{ label: 'Add Learner', type: 'navigate' as const, href: '/learners/new' }]
                : []),
            ...(isInstructor
                ? [{ label: 'Open Attendance Risk', type: 'navigate' as const, href: '/reports/instructor/attendance-risk' }]
                : []),
        ],
        nextSafeAction: canCreate
            ? { label: 'Add Learner', type: 'navigate' as const, href: '/learners/new' }
            : (isInstructor
                ? {
                    label: 'Open Attendance Risk',
                    type: 'navigate' as const,
                    href: '/reports/instructor/attendance-risk',
                }
                : undefined),
        workflowStep: isInstructor ? 'learner_follow_up' : 'learner_directory',
        emptyStateReason: !displayedLoading && currentVisibleCount === 0
            ? (filters.q || filters.cohort || filters.cohort_subject || filters.status
                ? 'No learners match the current filters.'
                : 'No learners are visible in this scope yet.')
            : undefined,
    }), [
        canCreate,
        currentVisibleCount,
        displayedLoading,
        filters.cohort,
        filters.cohort_subject,
        filters.q,
        filters.status,
        isInstructor,
        pageTitle,
    ]);

    useAssistantPageContext(assistantContext);

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
        try {
            await runExport(format);
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
                            <p className="text-sm font-medium theme-text">Search assigned learners</p>
                            <p className="text-sm theme-muted">
                                Search, filter, and sort within your assigned learner scope.
                            </p>
                        </div>

                        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                            <select
                                value={filters.cohort ?? ''}
                                onChange={(event) => handleCohortChange(event.target.value)}
                                className="theme-input theme-select rounded-lg px-3 py-2 text-sm"
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
                                className="theme-input theme-select rounded-lg px-3 py-2 text-sm"
                            >
                                <option value="">All assigned subjects</option>
                                {instructorSubjectOptions.map((subject) => (
                                    <option key={subject.id} value={subject.id}>{subject.label}</option>
                                ))}
                            </select>

                            <input
                                value={filters.q}
                                onChange={(event) => updateFilters({
                                    q: event.target.value,
                                    page: 1,
                                })}
                                placeholder="Search by admission number or name"
                                className="theme-input rounded-lg px-3 py-2 text-sm"
                            />

                            <select
                                value={filters.status}
                                onChange={(event) => updateFilters({
                                    status: event.target.value,
                                    page: 1,
                                })}
                                className="theme-input theme-select rounded-lg px-3 py-2 text-sm"
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
                        <p className="text-sm font-medium theme-text">Generate learner list</p>
                        <p className="text-sm theme-muted">
                            Select a curriculum and cohort to load the full class list, then refine the loaded rows below.
                        </p>
                    </div>

                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                        <select
                            value={filters.curriculum ?? ''}
                            onChange={(event) => handleCurriculumChange(event.target.value)}
                            className="theme-input theme-select rounded-lg px-3 py-2 text-sm"
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
                            className="theme-input theme-select rounded-lg px-3 py-2 text-sm disabled:opacity-60"
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
                            className="theme-input theme-select rounded-lg px-3 py-2 text-sm disabled:opacity-60"
                        >
                            <option value="">All subjects</option>
                            {cohortSubjects.map((subject) => (
                                <option key={subject.id} value={subject.id}>{subject.subject_name}</option>
                            ))}
                        </select>
                    </div>

                    {hasGeneratedAdminList ? (
                        <div className="space-y-3 border-t theme-border pt-4">
                            <div>
                                <p className="text-sm font-medium theme-text">Refine loaded cohort list</p>
                                <p className="text-sm theme-muted">
                                    These filters work on the rows already loaded for the selected cohort.
                                </p>
                            </div>

                            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                                <input
                                    value={filters.q}
                                    onChange={(event) => updateFilters({
                                        q: event.target.value,
                                        page: 1,
                                    })}
                                    placeholder="Search by admission number or name"
                                    className="theme-input rounded-lg px-3 py-2 text-sm"
                                />

                                <select
                                    value={filters.status}
                                    onChange={(event) => updateFilters({
                                        status: event.target.value,
                                        page: 1,
                                    })}
                                    className="theme-input theme-select rounded-lg px-3 py-2 text-sm"
                                >
                                    <option value="">All status</option>
                                    <option value="ACTIVE">Active</option>
                                    <option value="GRADUATED">Graduated</option>
                                    <option value="TRANSFERRED">Transferred</option>
                                    <option value="SUSPENDED">Suspended</option>
                                    <option value="WITHDRAWN">Withdrawn</option>
                                </select>

                                <div className="theme-surface-muted flex items-center rounded-lg border theme-border px-3 py-2 text-sm theme-muted">
                                    {filteredStudents.length} learner{filteredStudents.length === 1 ? '' : 's'} match
                                </div>
                            </div>
                        </div>
                    ) : null}
                </div>
            </Card>
        );
    };

    return (
        <div className="theme-app-bg space-y-6">
            <div className="flex items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold theme-text">{pageTitle}</h1>
                    <p className="mt-1 text-sm theme-muted">{pageDescription}</p>
                </div>

                <div className="flex items-center gap-2">
                    {(isInstructor || hasGeneratedAdminList) ? (
                        <>
                            <Button
                                type="button"
                                variant="secondary"
                                onClick={() => void handleExport('xlsx')}
                                disabled={currentVisibleCount === 0 || exporting}
                            >
                                <FileSpreadsheet className="mr-2 h-4 w-4" />
                                {exportingFormat === 'xlsx' ? 'Exporting...' : 'Export Excel'}
                            </Button>
                            <Button
                                type="button"
                                variant="secondary"
                                onClick={() => void handleExport('pdf')}
                                disabled={currentVisibleCount === 0 || exporting}
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
                <StatStrip mdColumns={4}>
                    <StatsCard title="Total" value={stats.total} icon={Users} color="blue" mobile="compact" />
                    <StatsCard title="Active" value={stats.active} icon={Users} color="green" mobile="compact" />
                    <StatsCard title="Graduated" value={stats.graduated} icon={Users} color="yellow" mobile="hide" />
                    <StatsCard title="Transferred" value={stats.transferred} icon={Users} color="red" mobile="hide" />
                </StatStrip>
            ) : null}

            {displayedError ? (
                <Card>
                    <p className="text-sm text-[color:var(--color-danger)]">{displayedError}</p>
                </Card>
            ) : null}

            {renderFilterControls()}

            {isInstructor && !instructorAssignmentsLoading && !hasInstructorLearnerScope ? (
                <Card>
                    <p className="py-10 text-center text-sm theme-muted">
                        Your teaching load is not assigned yet. Once your administrator assigns classes or subjects, your learners will appear here.
                    </p>
                </Card>
            ) : isAdmin && !filters.cohort ? (
                <Card>
                    <p className="py-10 text-center text-sm theme-muted">
                        Select a curriculum and cohort to generate the learner list.
                    </p>
                </Card>
            ) : (
                <DataTable
                    data={visibleStudents as LearnerTableRow[]}
                    columns={columns}
                    loading={displayedLoading}
                    loadingMessage="Loading learner records..."
                    loadingVariant="skeleton"
                    isRefreshing={displayedLoading && visibleStudents.length > 0}
                    refreshMessage="Updating learner records..."
                    pagination={displayedPagination}
                    initialSort={{ field: sort.field, direction: sort.direction }}
                    onPaginationChange={(page, pageSize) => updateFilters({ page, page_size: pageSize })}
                    onSort={(field, direction) => updateFilters({
                        sort: `${field}:${direction}`,
                        page: 1,
                    })}
                    emptyMessage={isInstructor
                        ? 'No learners found in your assigned classes. Try clearing filters or contact your administrator if your class assignment is missing.'
                        : 'No learners match the current cohort filters.'}
                    enableSearch={false}
                    enableSort
                    onRowClick={(row) => router.push(`/learners/${row.id}?back=${backUrl}`)}
                />
            )}
        </div>
    );
}

export default function LearnersPage() {
    return (
        <Suspense fallback={<LoadingSpinner message="Preparing learner records..." />}>
            <LearnersPageInner />
        </Suspense>
    );
}
