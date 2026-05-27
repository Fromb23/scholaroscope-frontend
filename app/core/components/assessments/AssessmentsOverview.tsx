'use client';

import { useMemo, useState, type ComponentProps } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ClipboardList, Plus, Filter, TrendingUp, Award, FileText } from 'lucide-react';
import { Card } from '@/app/components/ui/Card';
import { Button } from '@/app/components/ui/Button';
import { Badge } from '@/app/components/ui/Badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/app/components/ui/Table';
import { Select } from '@/app/components/ui/Select';
import { StatsCard } from '@/app/components/dashboard/StatsCard';
import { useAssessments } from '@/app/core/hooks/useAssessments';
import { useCurricula, useTerms } from '@/app/core/hooks/useAcademic';
import { useCohorts } from '@/app/core/hooks/useCohorts';
import { useCohortSubjectsByCohorts } from '@/app/core/hooks/useCohortSubjects';
import { useInstructorCohortAccess } from '@/app/core/hooks/useInstructorCohortAccess';
import { canCreateCurriculumWork, resolveCurriculumForType } from '@/app/core/lib/curriculumLifecycle';
import { ASSESSMENT_TYPE_OPTIONS, type Assessment } from '@/app/core/types/assessment';
import { useAuth } from '@/app/context/AuthContext';
import { useAssistantPageContext } from '@/app/core/components/assistant/useAssistantPageContext';

type BadgeVariant = NonNullable<ComponentProps<typeof Badge>['variant']>;
type GroupView = 'cohort' | 'subject';

interface AssessmentSubgroup {
    key: string;
    label: string;
    items: Assessment[];
}

interface AssessmentGroup {
    key: string;
    label: string;
    subgroups: AssessmentSubgroup[];
}

export function AssessmentsOverview() {
    const router = useRouter();
    const { user, activeRole } = useAuth();
    const isInstructor = activeRole === 'INSTRUCTOR';
    const [selectedTerm, setSelectedTerm] = useState<number | undefined>();
    const [selectedCohortSubject, setSelectedCohortSubject] = useState<number | undefined>();
    const [selectedType, setSelectedType] = useState<string | undefined>();
    const [selectedEvalType, setSelectedEvalType] = useState<string | undefined>();
    const [groupView, setGroupView] = useState<GroupView>('cohort');
    const instructorAccess = useInstructorCohortAccess();
    const { curricula } = useCurricula();
    const { cohorts } = useCohorts();
    const cohortIds = useMemo(() => cohorts.map((cohort) => cohort.id), [cohorts]);
    const { subjects: cohortSubjects } = useCohortSubjectsByCohorts(cohortIds);
    const isAdminLike = Boolean(user?.is_superadmin) || activeRole === 'ADMIN';
    const hasWritableAssessmentCurriculum = useMemo(() => {
        if (isAdminLike) {
            return curricula.some((curriculum) => canCreateCurriculumWork(curriculum));
        }

        return instructorAccess.assignments.some((assignment) => {
            const curriculum = typeof assignment.curriculum_id === 'number'
                ? (curricula.find((entry) => entry.id === assignment.curriculum_id) ?? null)
                : resolveCurriculumForType(curricula, assignment.curriculum_type ?? null);
            return canCreateCurriculumWork(curriculum);
        });
    }, [curricula, instructorAccess.assignments, isAdminLike]);
    const canCreateAssessment = hasWritableAssessmentCurriculum && (
        isAdminLike || (activeRole === 'INSTRUCTOR' && instructorAccess.hasAssignedCohortSubjects)
    );

    const { assessments, loading } = useAssessments({
        term: selectedTerm,
        cohort_subject: selectedCohortSubject,
        assessment_type: selectedType,
        evaluation_type: selectedEvalType
    });

    const { terms } = useTerms();

    const availableCohortSubjects = useMemo(() => {
        if (activeRole === 'INSTRUCTOR') {
            const items = instructorAccess.assignments
                .filter((assignment) => typeof assignment.cohort_subject_id === 'number')
                .map((assignment) => ({
                    id: assignment.cohort_subject_id as number,
                    label: `${assignment.subject_code ?? assignment.subject_name} — ${assignment.subject_name}`,
                    cohortName: assignment.cohort_name,
                }));

            return Array.from(
                new Map(items.map((item) => [item.id, item])).values()
            ).sort((left, right) => left.label.localeCompare(right.label));
        }

        return cohortSubjects
            .map((subject) => ({
                id: subject.id,
                label: `${subject.subject_code} — ${subject.subject_name}`,
                cohortName: subject.cohort_name,
            }))
            .sort((left, right) => left.label.localeCompare(right.label));
    }, [activeRole, cohortSubjects, instructorAccess.assignments]);

    const assessmentTypes = [
        { value: '', label: 'All Types' },
        ...ASSESSMENT_TYPE_OPTIONS,
    ];

    const evaluationTypes = [
        { value: '', label: 'All Evaluation Types' },
        { value: 'NUMERIC', label: 'Numeric' },
        { value: 'RUBRIC', label: 'Rubric' },
        { value: 'DESCRIPTIVE', label: 'Descriptive' },
        { value: 'COMPETENCY', label: 'Competency' }
    ];

    const getEvaluationBadge = (type: string) => {
        const variants: Record<string, BadgeVariant> = {
            NUMERIC: 'blue',
            RUBRIC: 'purple',
            DESCRIPTIVE: 'green',
            COMPETENCY: 'orange'
        };
        return variants[type] || 'default';
    };

    // Calculate statistics
    const totalAssessments = assessments.length;
    const numericAssessments = assessments.filter(a => a.evaluation_type === 'NUMERIC').length;
    const rubricAssessments = assessments.filter(a => a.evaluation_type === 'RUBRIC').length;
    const totalScored = assessments.reduce((sum, a) => sum + a.scores_count, 0);
    const groupedAssessments = useMemo<AssessmentGroup[]>(() => {
        const groups = new Map<string, {
            label: string;
            subgroups: Map<string, AssessmentSubgroup>;
        }>();

        assessments.forEach((assessment) => {
            const majorKey = groupView === 'cohort'
                ? `cohort:${assessment.cohort_id}`
                : `subject:${assessment.subject_id}`;
            const majorLabel = groupView === 'cohort'
                ? assessment.cohort_name
                : `${assessment.subject_code} — ${assessment.subject_name}`;
            const subgroupKey = groupView === 'cohort'
                ? `subject:${assessment.subject_id}`
                : `cohort:${assessment.cohort_id}`;
            const subgroupLabel = groupView === 'cohort'
                ? `${assessment.subject_code} — ${assessment.subject_name}`
                : assessment.cohort_name;

            if (!groups.has(majorKey)) {
                groups.set(majorKey, {
                    label: majorLabel,
                    subgroups: new Map<string, AssessmentSubgroup>(),
                });
            }

            const group = groups.get(majorKey)!;
            if (!group.subgroups.has(subgroupKey)) {
                group.subgroups.set(subgroupKey, {
                    key: subgroupKey,
                    label: subgroupLabel,
                    items: [],
                });
            }

            group.subgroups.get(subgroupKey)!.items.push(assessment);
        });

        return Array.from(groups.entries())
            .map(([key, group]) => ({
                key,
                label: group.label,
                subgroups: Array.from(group.subgroups.values())
                    .map((subgroup) => ({
                        ...subgroup,
                        items: [...subgroup.items].sort((left, right) => {
                            const leftDate = left.assessment_date ?? '';
                            const rightDate = right.assessment_date ?? '';
                            return rightDate.localeCompare(leftDate) || left.name.localeCompare(right.name);
                        }),
                    }))
                    .sort((left, right) => left.label.localeCompare(right.label)),
            }))
            .sort((left, right) => left.label.localeCompare(right.label));
    }, [assessments, groupView]);
    const assistantContext = useMemo(() => ({
        pageKey: 'assessments_overview',
        pageTitle: isInstructor ? 'Assessments & Grading' : 'Assessments',
        state: {
            is_loading: loading,
            total_assessments: totalAssessments,
            no_results: !loading && assessments.length === 0,
            can_create_assessment: canCreateAssessment,
            has_assigned_cohort_subjects: instructorAccess.hasAssignedCohortSubjects,
        },
        visibleActions: [
            ...(canCreateAssessment
                ? [{ label: 'Create Assessment', type: 'navigate' as const, href: '/assessments/new' }]
                : []),
        ],
        nextSafeAction: canCreateAssessment
            ? { label: 'Create Assessment', type: 'navigate' as const, href: '/assessments/new' }
            : undefined,
        workflowStep: 'assessment_overview',
        emptyStateReason: !loading && assessments.length === 0
            ? 'No assessments are visible with the current filters.'
            : undefined,
    }), [
        assessments.length,
        canCreateAssessment,
        instructorAccess.hasAssignedCohortSubjects,
        isInstructor,
        loading,
        totalAssessments,
    ]);

    useAssistantPageContext(assistantContext);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-semibold text-gray-900">
                        {isInstructor ? 'Assessments & Grading' : 'Assessments'}
                    </h1>
                    <p className="text-gray-600 mt-1">
                        {isInstructor ? 'Create, review, and grade class work.' : 'Manage assessments and grading'}
                    </p>
                </div>
                {canCreateAssessment && (
                    <Link href="/assessments/new">
                        <Button>
                            <Plus className="w-4 h-4 mr-2" />
                            Create Assessment
                        </Button>
                    </Link>
                )}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <StatsCard
                    title="Total Assessments"
                    value={totalAssessments}
                    icon={ClipboardList}
                    color="blue"
                />
                <StatsCard
                    title="Numeric"
                    value={numericAssessments}
                    icon={TrendingUp}
                    color="green"
                />
                <StatsCard
                    title="Rubric-based"
                    value={rubricAssessments}
                    icon={Award}
                    color="purple"
                />
                <StatsCard
                    title="Total Scored"
                    value={totalScored}
                    icon={FileText}
                    color="orange"
                />
            </div>

            {/* Filters */}
            <Card>
                <div className="p-4">
                    <div className="flex items-center gap-4">
                        <Filter className="w-5 h-5 text-gray-400" />
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 flex-1">
                            <Select
                                label=""
                                value={selectedTerm?.toString() || ''}
                                onChange={(e) => setSelectedTerm(e.target.value ? Number(e.target.value) : undefined)} options={[]}                            >
                                <option value="">All Terms</option>
                                {terms.map(t => (
                                    <option key={t.id} value={t.id}>
                                        {t.name}
                                    </option>
                                ))}
                            </Select>

                            <Select
                                label=""
                                value={selectedCohortSubject?.toString() || ''}
                                onChange={(e) => setSelectedCohortSubject(e.target.value ? Number(e.target.value) : undefined)} options={[]}                            >
                                <option value="">All Cohort Subjects</option>
                                {availableCohortSubjects.map(subject => (
                                    <option key={subject.id} value={subject.id}>
                                        {subject.label} {subject.cohortName ? `(${subject.cohortName})` : ''}
                                    </option>
                                ))}
                            </Select>

                            <Select
                                label=""
                                value={selectedType || ''}
                                onChange={(e) => setSelectedType(e.target.value || undefined)} options={[]}                            >
                                {assessmentTypes.map(type => (
                                    <option key={type.value} value={type.value}>
                                        {type.label}
                                    </option>
                                ))}
                            </Select>

                            <Select
                                label=""
                                value={selectedEvalType || ''}
                                onChange={(e) => setSelectedEvalType(e.target.value || undefined)} options={[]}                            >
                                {evaluationTypes.map(type => (
                                    <option key={type.value} value={type.value}>
                                        {type.label}
                                    </option>
                                ))}
                            </Select>
                        </div>
                    </div>
                </div>
            </Card>

            {/* Assessments Table */}
            <Card>
                {loading ? (
                    <div className="py-12 text-center">
                        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
                        <p className="mt-2 text-gray-600">Loading assessments...</p>
                    </div>
                ) : assessments.length === 0 ? (
                    <div className="py-12 text-center">
                        <ClipboardList className="mx-auto h-12 w-12 text-gray-400" />
                        <h3 className="mt-2 text-sm font-medium text-gray-900">
                            {isInstructor ? 'No assessments yet' : 'No assessments found'}
                        </h3>
                        <p className="mt-1 text-sm text-gray-500">
                            {isInstructor && !instructorAccess.hasAssignedCohortSubjects
                                ? 'Your teaching load is not assigned yet. Assessments will appear once your classes and subjects are assigned.'
                                : selectedTerm || selectedCohortSubject || selectedType || selectedEvalType
                                    ? 'Try adjusting your filters.'
                                    : isInstructor
                                        ? 'Create or review assessments once learners have started class work.'
                                        : 'Get started by creating a new assessment.'}
                        </p>
                        {canCreateAssessment && !selectedTerm && !selectedCohortSubject && !selectedType && !selectedEvalType && (
                            <Link href="/assessments/new">
                                <Button className="mt-4">
                                    <Plus className="mr-2 h-4 w-4" />
                                    Create Assessment
                                </Button>
                            </Link>
                        )}
                    </div>
                ) : (
                    <div className="space-y-6 p-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                                <h2 className="text-base font-semibold text-gray-900">Assessment Groups</h2>
                                <p className="mt-1 text-sm text-gray-500">
                                    Default view groups by cohort, then subject.
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                <Button
                                    type="button"
                                    size="sm"
                                    variant={groupView === 'cohort' ? 'secondary' : 'ghost'}
                                    onClick={() => setGroupView('cohort')}
                                >
                                    View by Cohort
                                </Button>
                                <Button
                                    type="button"
                                    size="sm"
                                    variant={groupView === 'subject' ? 'secondary' : 'ghost'}
                                    onClick={() => setGroupView('subject')}
                                >
                                    View by Subject
                                </Button>
                            </div>
                        </div>

                        {groupedAssessments.map((group) => (
                            <div key={group.key} className="rounded-lg border border-gray-200">
                                <div className="border-b border-gray-200 bg-gray-50 px-4 py-3">
                                    <h3 className="text-sm font-semibold text-gray-900">{group.label}</h3>
                                </div>

                                <div className="space-y-4 p-4">
                                    {group.subgroups.map((subgroup) => (
                                        <div key={subgroup.key} className="overflow-hidden rounded-lg border border-gray-200">
                                            <div className="bg-white px-4 py-3">
                                                <p className="text-sm font-medium text-gray-900">{subgroup.label}</p>
                                            </div>
                                            <Table>
                                                <TableHeader>
                                                    <TableRow>
                                                        <TableHead>Assessment</TableHead>
                                                        <TableHead>Term</TableHead>
                                                        <TableHead>Type</TableHead>
                                                        <TableHead>Evaluation</TableHead>
                                                        <TableHead>Date</TableHead>
                                                        <TableHead>Scores</TableHead>
                                                        <TableHead>Actions</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {subgroup.items.map((assessment) => (
                                                        <TableRow
                                                            key={assessment.id}
                                                            onClick={() => router.push(`/assessments/${assessment.id}`)}
                                                        >
                                                            <TableCell>
                                                                <div className="font-medium text-gray-900">{assessment.name}</div>
                                                            </TableCell>
                                                            <TableCell>
                                                                <span className="text-sm text-gray-600">
                                                                    {assessment.term_name ?? '-'}
                                                                </span>
                                                            </TableCell>
                                                            <TableCell>
                                                                <Badge variant="blue">{assessment.assessment_type_display}</Badge>
                                                            </TableCell>
                                                            <TableCell>
                                                                <Badge variant={getEvaluationBadge(assessment.evaluation_type)}>
                                                                    {assessment.evaluation_type_display}
                                                                </Badge>
                                                            </TableCell>
                                                            <TableCell>
                                                                <span className="text-sm text-gray-600">
                                                                    {assessment.assessment_date
                                                                        ? new Date(assessment.assessment_date).toLocaleDateString()
                                                                        : '-'}
                                                                </span>
                                                            </TableCell>
                                                            <TableCell>
                                                                <Badge variant="purple">{assessment.scores_count}</Badge>
                                                            </TableCell>
                                                            <TableCell>
                                                                <Button
                                                                    variant="primary"
                                                                    size="sm"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        router.push(`/assessments/${assessment.id}`);
                                                                    }}
                                                                >
                                                                    View Details
                                                                </Button>
                                                            </TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </Card>

            {/* Pagination info */}
            {assessments.length > 0 && (
                <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-600">
                        Showing <span className="font-medium">{assessments.length}</span> assessments
                    </p>
                </div>
            )}
        </div>
    );
}
