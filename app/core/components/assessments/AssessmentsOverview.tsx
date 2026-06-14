'use client';

import { useCallback, useEffect, useMemo, useState, type ComponentProps } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Award, ClipboardList, FileText, Filter, Plus, TrendingUp } from 'lucide-react';
import { Card } from '@/app/components/ui/Card';
import { Button } from '@/app/components/ui/Button';
import { Badge } from '@/app/components/ui/Badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/app/components/ui/Table';
import { Select } from '@/app/components/ui/Select';
import { StatsCard } from '@/app/components/dashboard/StatsCard';
import { useAssessments } from '@/app/core/hooks/useAssessments';
import { useCurricula, useTerms } from '@/app/core/hooks/useAcademic';
import { useCohorts } from '@/app/core/hooks/useCohorts';
import { useCohortSubjectsByCohorts } from '@/app/core/hooks/useCohortSubjects';
import { useInstructorCohortAccess } from '@/app/core/hooks/useInstructorCohortAccess';
import { useInstructors } from '@/app/core/hooks/useInstructors';
import { canCreateCurriculumWork, resolveCurriculumForType } from '@/app/core/lib/curriculumLifecycle';
import {
    canCreateTeachingRecord,
    canShowAdminMyTeaching,
    isSupervisionOnlyAdmin,
} from '@/app/core/lib/workspaces';
import { ASSESSMENT_TYPE_OPTIONS, type Assessment } from '@/app/core/types/assessment';
import type { AdminWorkViewMode } from '@/app/core/types/adminWorkViews';
import { useAuth } from '@/app/context/AuthContext';
import { useAssistantPageContext } from '@/app/core/components/assistant/useAssistantPageContext';

type BadgeVariant = NonNullable<ComponentProps<typeof Badge>['variant']>;
type GroupView = 'class' | 'subject' | 'instructor';

interface AssessmentSubgroup {
    key: string;
    label: string;
    description: string;
    items: Assessment[];
}

interface AssessmentGroup {
    key: string;
    label: string;
    description: string;
    subgroups: AssessmentSubgroup[];
}

function normalizeText(value: string | null | undefined): string {
    return (value ?? '').trim().toLowerCase();
}

export function AssessmentsOverview() {
    const router = useRouter();
    const { activeOrg, user, activeRole } = useAuth();
    const isInstructor = activeRole === 'INSTRUCTOR';
    const isAdminLike = Boolean(user?.is_superadmin) || activeRole === 'ADMIN';
    const canUseMyTeaching = isInstructor || canShowAdminMyTeaching({
        role: activeRole,
        orgType: activeOrg?.org_type,
        isSuperadmin: user?.is_superadmin,
    });
    const canCreateTeachingRecords = canCreateTeachingRecord({
        role: activeRole,
        orgType: activeOrg?.org_type,
        isSuperadmin: user?.is_superadmin,
    });
    const supervisionOnlyAdmin = isSupervisionOnlyAdmin({
        role: activeRole,
        orgType: activeOrg?.org_type,
        isSuperadmin: user?.is_superadmin,
    });
    const [viewMode, setViewMode] = useState<AdminWorkViewMode>('admin_supervision');
    const [selectedTerm, setSelectedTerm] = useState<number | undefined>();
    const [selectedCohort, setSelectedCohort] = useState<number | undefined>();
    const [selectedCohortSubject, setSelectedCohortSubject] = useState<number | undefined>();
    const [selectedType, setSelectedType] = useState<string | undefined>();
    const [selectedEvalType, setSelectedEvalType] = useState<string | undefined>();
    const [selectedInstructorFilter, setSelectedInstructorFilter] = useState('');
    const [groupView, setGroupView] = useState<GroupView>('class');
    const instructorAccess = useInstructorCohortAccess();
    const { curricula } = useCurricula();
    const { cohorts } = useCohorts();
    const cohortIds = useMemo(() => cohorts.map((cohort) => cohort.id), [cohorts]);
    const { subjects: cohortSubjects } = useCohortSubjectsByCohorts(cohortIds);
    const { instructors } = useInstructors({ enabled: isAdminLike });
    const { terms } = useTerms();
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
        canCreateTeachingRecords || (activeRole === 'INSTRUCTOR' && instructorAccess.hasAssignedCohortSubjects)
    );
    const effectiveMyTeachingMode = isInstructor || (canUseMyTeaching && viewMode === 'my_teaching');
    const createButtonLabel = effectiveMyTeachingMode
        ? 'Create my assessment'
        : 'Create assessment';

    useEffect(() => {
        if (!canUseMyTeaching && viewMode === 'my_teaching') {
            setViewMode('admin_supervision');
        }
    }, [canUseMyTeaching, viewMode]);

    const { assessments, loading } = useAssessments({
        term: selectedTerm,
        cohort_subject: selectedCohortSubject,
        assessment_type: selectedType,
        evaluation_type: selectedEvalType,
    });

    const availableCohortSubjects = useMemo(() => {
        if (activeRole === 'INSTRUCTOR') {
            const items = instructorAccess.assignments
                .filter((assignment) => typeof assignment.cohort_subject_id === 'number')
                .map((assignment) => ({
                    id: assignment.cohort_subject_id as number,
                    cohortId: assignment.cohort_id,
                    label: `${assignment.subject_code ?? assignment.subject_name} - ${assignment.subject_name}`,
                    cohortName: assignment.cohort_name,
                }));

            return Array.from(new Map(items.map((item) => [item.id, item])).values())
                .filter((item) => !selectedCohort || item.cohortId === selectedCohort)
                .sort((left, right) => left.label.localeCompare(right.label));
        }

        return cohortSubjects
            .map((subject) => ({
                id: subject.id,
                cohortId: subject.cohort_id,
                label: `${subject.subject_code} - ${subject.subject_name}`,
                cohortName: subject.cohort_name,
            }))
            .filter((subject) => !selectedCohort || subject.cohortId === selectedCohort)
            .sort((left, right) => left.label.localeCompare(right.label));
    }, [activeRole, cohortSubjects, instructorAccess.assignments, selectedCohort]);

    const creatorLabelById = useMemo(() => {
        const labels = new Map<number, string>();
        instructors.forEach((instructor) => {
            labels.set(instructor.id, instructor.full_name || instructor.email);
        });
        return labels;
    }, [instructors]);

    const instructorOptions = useMemo(() => {
        const options = new Map<string, { value: string; label: string }>();

        instructors.forEach((instructor) => {
            options.set(`id:${instructor.id}`, {
                value: `id:${instructor.id}`,
                label: instructor.full_name || instructor.email,
            });
        });

        assessments.forEach((assessment) => {
            if (typeof assessment.created_by !== 'number') {
                return;
            }

            const key = `id:${assessment.created_by}`;
            if (!options.has(key)) {
                options.set(key, {
                    value: key,
                    label: creatorLabelById.get(assessment.created_by) ?? `Instructor #${assessment.created_by}`,
                });
            }
        });

        return Array.from(options.values()).sort((left, right) => left.label.localeCompare(right.label));
    }, [assessments, creatorLabelById, instructors]);

    const getCreatorLabel = useCallback((assessment: Assessment): string => {
        if (typeof assessment.created_by === 'number') {
            return creatorLabelById.get(assessment.created_by) ?? `Instructor #${assessment.created_by}`;
        }

        return 'Unknown instructor';
    }, [creatorLabelById]);

    const visibleAssessments = useMemo(() => assessments.filter((assessment) => {
        if (selectedCohort && assessment.cohort_id !== selectedCohort) {
            return false;
        }

        if (isAdminLike && effectiveMyTeachingMode) {
            return assessment.created_by === user?.id;
        }

        if (isAdminLike && !effectiveMyTeachingMode && selectedInstructorFilter) {
            if (selectedInstructorFilter.startsWith('id:')) {
                return String(assessment.created_by ?? '') === selectedInstructorFilter.slice(3);
            }

            if (selectedInstructorFilter.startsWith('name:')) {
                return normalizeText(getCreatorLabel(assessment)) === selectedInstructorFilter.slice(5);
            }
        }

        return true;
    }), [assessments, effectiveMyTeachingMode, getCreatorLabel, isAdminLike, selectedCohort, selectedInstructorFilter, user?.id]);

    const assessmentTypes = [
        { value: '', label: 'All Types' },
        ...ASSESSMENT_TYPE_OPTIONS,
    ];

    const evaluationTypes = [
        { value: '', label: 'All Evaluation Types' },
        { value: 'NUMERIC', label: 'Numeric' },
        { value: 'RUBRIC', label: 'Rubric' },
        { value: 'DESCRIPTIVE', label: 'Descriptive' },
        { value: 'COMPETENCY', label: 'Competency' },
    ];

    const getEvaluationBadge = (type: string) => {
        const variants: Record<string, BadgeVariant> = {
            NUMERIC: 'blue',
            RUBRIC: 'purple',
            DESCRIPTIVE: 'green',
            COMPETENCY: 'orange',
        };
        return variants[type] || 'default';
    };

    const totalAssessments = visibleAssessments.length;
    const numericAssessments = visibleAssessments.filter((assessment) => assessment.evaluation_type === 'NUMERIC').length;
    const rubricAssessments = visibleAssessments.filter((assessment) => assessment.evaluation_type === 'RUBRIC').length;
    const totalScored = visibleAssessments.reduce((sum, assessment) => sum + assessment.scores_count, 0);
    const supportsInstructorGrouping = isAdminLike && visibleAssessments.some((assessment) => typeof assessment.created_by === 'number');

    const groupedAssessments = useMemo<AssessmentGroup[]>(() => {
        const groups = new Map<string, {
            label: string;
            description: string;
            subgroups: Map<string, AssessmentSubgroup>;
        }>();

        visibleAssessments.forEach((assessment) => {
            const subjectLabel = `${assessment.subject_code} - ${assessment.subject_name}`;
            const cohortLabel = assessment.cohort_name;
            const instructorLabel = getCreatorLabel(assessment);

            let majorKey = `cohort:${assessment.cohort_id}`;
            let majorLabel = cohortLabel;
            let majorDescription = "Class view starts from learners' classroom context.";
            let subgroupKey = `subject:${assessment.subject_id}`;
            let subgroupLabel = subjectLabel;
            let subgroupDescription = 'Subject context within this class.';

            if (groupView === 'subject') {
                majorKey = `subject:${assessment.subject_id}`;
                majorLabel = subjectLabel;
                majorDescription = 'Subject view highlights assessment coverage across classes.';
                subgroupKey = `cohort:${assessment.cohort_id}`;
                subgroupLabel = cohortLabel;
                subgroupDescription = 'Class context for this subject.';
            } else if (groupView === 'instructor') {
                majorKey = `instructor:${assessment.created_by ?? instructorLabel}`;
                majorLabel = instructorLabel;
                majorDescription = 'Instructor view starts from teacher workload.';
                subgroupKey = `class-subject:${assessment.cohort_id}:${assessment.subject_id}`;
                subgroupLabel = `${cohortLabel} - ${subjectLabel}`;
                subgroupDescription = 'Class and subject context for this instructor.';
            }

            if (!groups.has(majorKey)) {
                groups.set(majorKey, {
                    label: majorLabel,
                    description: majorDescription,
                    subgroups: new Map<string, AssessmentSubgroup>(),
                });
            }

            const group = groups.get(majorKey);
            if (!group) {
                return;
            }

            if (!group.subgroups.has(subgroupKey)) {
                group.subgroups.set(subgroupKey, {
                    key: subgroupKey,
                    label: subgroupLabel,
                    description: subgroupDescription,
                    items: [],
                });
            }

            group.subgroups.get(subgroupKey)?.items.push(assessment);
        });

        return Array.from(groups.entries())
            .map(([key, group]) => ({
                key,
                label: group.label,
                description: group.description,
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
    }, [getCreatorLabel, groupView, visibleAssessments]);

    const assistantContext = useMemo(() => ({
        pageKey: 'assessments_overview',
        pageTitle: effectiveMyTeachingMode ? 'Assessments & Grading' : 'Assessment Overview',
        state: {
            is_loading: loading,
            total_assessments: totalAssessments,
            no_results: !loading && visibleAssessments.length === 0,
            can_create_assessment: canCreateAssessment,
            has_assigned_cohort_subjects: instructorAccess.hasAssignedCohortSubjects,
        },
        visibleActions: [
            ...(canCreateAssessment
                ? [{ label: createButtonLabel, type: 'navigate' as const, href: '/assessments/new' }]
                : []),
            ...(supervisionOnlyAdmin
                ? [
                    { label: 'View instructor activity', type: 'navigate' as const, href: '/admin/instructors' },
                    { label: 'Open reports', type: 'navigate' as const, href: '/reports' },
                ]
                : []),
        ],
        nextSafeAction: canCreateAssessment
            ? { label: createButtonLabel, type: 'navigate' as const, href: '/assessments/new' }
            : supervisionOnlyAdmin
                ? { label: 'View instructor activity', type: 'navigate' as const, href: '/admin/instructors' }
            : undefined,
        workflowStep: 'assessment_overview',
        emptyStateReason: !loading && visibleAssessments.length === 0
            ? 'No assessments are visible with the current filters.'
            : undefined,
    }), [
        canCreateAssessment,
        createButtonLabel,
        instructorAccess.hasAssignedCohortSubjects,
        effectiveMyTeachingMode,
        loading,
        supervisionOnlyAdmin,
        totalAssessments,
        visibleAssessments.length,
    ]);

    useAssistantPageContext(assistantContext);

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center gap-4">
                <div>
                    <h1 className="text-2xl font-semibold text-gray-900">
                        {isInstructor ? 'Assessments & Grading' : effectiveMyTeachingMode ? 'My Assessments' : 'Assessment Overview'}
                    </h1>
                    <p className="text-gray-600 mt-1">
                        {isInstructor
                            ? 'Create, review, and grade class work.'
                            : effectiveMyTeachingMode
                                ? 'Use My Teaching to view only your own assessment work.'
                                : 'Admin supervision shows organization work by class, instructor, and subject.'}
                    </p>
                </div>
                {canCreateAssessment ? (
                    <Link href="/assessments/new">
                        <Button>
                            <Plus className="w-4 h-4 mr-2" />
                            {createButtonLabel}
                        </Button>
                    </Link>
                ) : supervisionOnlyAdmin ? (
                    <Link href="/admin/instructors">
                        <Button variant="secondary">View instructor activity</Button>
                    </Link>
                ) : null}
            </div>

            {isAdminLike ? (
                <Card>
                    <div className="space-y-5 p-4">
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                            <div className="space-y-2">
                                <h2 className="text-base font-semibold text-gray-900">Workspace mode</h2>
                                <p className="text-sm text-gray-500">
                                    Admin supervision shows organization work by class, instructor, and subject.
                                </p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                <Button
                                    type="button"
                                    size="sm"
                                    variant={viewMode === 'admin_supervision' ? 'secondary' : 'ghost'}
                                    onClick={() => setViewMode('admin_supervision')}
                                >
                                    Admin supervision
                                </Button>
                                {canUseMyTeaching ? (
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant={viewMode === 'my_teaching' ? 'secondary' : 'ghost'}
                                        onClick={() => setViewMode('my_teaching')}
                                    >
                                        My Teaching
                                    </Button>
                                ) : null}
                            </div>
                        </div>

                        <div className={`grid gap-3 ${canUseMyTeaching ? 'lg:grid-cols-2' : 'lg:grid-cols-1'}`}>
                            <div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800">
                                Admin supervision shows organization work by class, instructor, and subject.
                            </div>
                            {canUseMyTeaching ? (
                                <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700">
                                    Use My Teaching to view only your own teaching work.
                                </div>
                            ) : null}
                        </div>
                    </div>
                </Card>
            ) : null}

            <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
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

            <Card>
                <div className="p-4 space-y-4">
                    <div className="flex items-center gap-3 text-sm text-gray-500">
                        <Filter className="w-5 h-5 text-gray-400" />
                        <span>Class view starts from learners&apos; classroom context.</span>
                    </div>
                    <div className={`grid grid-cols-1 gap-4 ${isAdminLike && !effectiveMyTeachingMode ? 'md:grid-cols-6' : 'md:grid-cols-5'}`}>
                        <Select
                            label="Term"
                            value={selectedTerm?.toString() || ''}
                            onChange={(event) => setSelectedTerm(event.target.value ? Number(event.target.value) : undefined)}
                            options={[
                                { value: '', label: 'All terms' },
                                ...terms.map((term) => ({ value: String(term.id), label: term.name })),
                            ]}
                        />
                        <Select
                            label="Class"
                            value={selectedCohort?.toString() || ''}
                            onChange={(event) => setSelectedCohort(event.target.value ? Number(event.target.value) : undefined)}
                            options={[
                                { value: '', label: 'All classes' },
                                ...cohorts.map((cohort) => ({ value: String(cohort.id), label: cohort.name })),
                            ]}
                        />
                        <Select
                            label="Cohort subject"
                            value={selectedCohortSubject?.toString() || ''}
                            onChange={(event) => setSelectedCohortSubject(event.target.value ? Number(event.target.value) : undefined)}
                            options={[
                                { value: '', label: 'All cohort subjects' },
                                ...availableCohortSubjects.map((subject) => ({
                                    value: String(subject.id),
                                    label: `${subject.label}${subject.cohortName ? ` (${subject.cohortName})` : ''}`,
                                })),
                            ]}
                        />
                        {isAdminLike && !effectiveMyTeachingMode ? (
                            <Select
                                label="Instructor"
                                value={selectedInstructorFilter}
                                onChange={(event) => setSelectedInstructorFilter(event.target.value)}
                                options={[
                                    { value: '', label: 'All instructors' },
                                    ...instructorOptions,
                                ]}
                            />
                        ) : null}
                        <Select
                            label="Assessment type"
                            value={selectedType || ''}
                            onChange={(event) => setSelectedType(event.target.value || undefined)}
                            options={assessmentTypes}
                        />
                        <Select
                            label="Evaluation"
                            value={selectedEvalType || ''}
                            onChange={(event) => setSelectedEvalType(event.target.value || undefined)}
                            options={evaluationTypes}
                        />
                    </div>
                </div>
            </Card>

            <Card>
                {loading ? (
                    <div className="py-12 text-center">
                        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
                        <p className="mt-2 text-gray-600">Loading assessments...</p>
                    </div>
                ) : visibleAssessments.length === 0 ? (
                    <div className="py-12 text-center">
                        <ClipboardList className="mx-auto h-12 w-12 text-gray-400" />
                        <h3 className="mt-2 text-sm font-medium text-gray-900">
                            {effectiveMyTeachingMode ? 'No assessments yet' : 'No assessments found'}
                        </h3>
                        <p className="mt-1 text-sm text-gray-500">
                            {isInstructor && !instructorAccess.hasAssignedCohortSubjects
                                ? 'Your teaching load is not assigned yet. Assessments will appear once your classes and subjects are assigned.'
                                : selectedTerm || selectedCohort || selectedCohortSubject || selectedType || selectedEvalType || selectedInstructorFilter
                                    ? 'Try adjusting your filters.'
                                    : effectiveMyTeachingMode
                                        ? 'Create or review assessments once learners have started class work.'
                                        : 'No assessments are visible in this supervision view yet.'}
                        </p>
                        {canCreateAssessment && !selectedTerm && !selectedCohort && !selectedCohortSubject && !selectedType && !selectedEvalType && !selectedInstructorFilter && (
                            <Link href="/assessments/new">
                                <Button className="mt-4">
                                    <Plus className="mr-2 h-4 w-4" />
                                    {createButtonLabel}
                                </Button>
                            </Link>
                        )}
                    </div>
                ) : (
                    <div className="space-y-6 p-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                                <h2 className="text-base font-semibold text-gray-900">Assessment groups</h2>
                                <p className="mt-1 text-sm text-gray-500">
                                    {groupView === 'instructor'
                                        ? 'Instructor view starts from teacher workload.'
                                        : groupView === 'subject'
                                            ? 'Subject view highlights assessment coverage across classes.'
                                            : "Class view starts from learners' classroom context."}
                                </p>
                            </div>
                            <div className="flex items-center gap-2 flex-wrap">
                                <Button
                                    type="button"
                                    size="sm"
                                    variant={groupView === 'class' ? 'secondary' : 'ghost'}
                                    onClick={() => setGroupView('class')}
                                >
                                    Class view
                                </Button>
                                <Button
                                    type="button"
                                    size="sm"
                                    variant={groupView === 'subject' ? 'secondary' : 'ghost'}
                                    onClick={() => setGroupView('subject')}
                                >
                                    Subject view
                                </Button>
                                {supportsInstructorGrouping ? (
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant={groupView === 'instructor' ? 'secondary' : 'ghost'}
                                        onClick={() => setGroupView('instructor')}
                                    >
                                        Instructor view
                                    </Button>
                                ) : null}
                            </div>
                        </div>

                        {groupedAssessments.map((group) => (
                            <div key={group.key} className="rounded-lg border border-gray-200">
                                <div className="border-b border-gray-200 bg-gray-50 px-4 py-3">
                                    <h3 className="text-sm font-semibold text-gray-900">{group.label}</h3>
                                    <p className="mt-1 text-sm text-gray-500">{group.description}</p>
                                </div>

                                <div className="space-y-4 p-4">
                                    {group.subgroups.map((subgroup) => (
                                        <div key={subgroup.key} className="overflow-hidden rounded-lg border border-gray-200">
                                            <div className="bg-white px-4 py-3">
                                                <p className="text-sm font-medium text-gray-900">{subgroup.label}</p>
                                                <p className="mt-1 text-sm text-gray-500">{subgroup.description}</p>
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
                                                                    onClick={(event) => {
                                                                        event.stopPropagation();
                                                                        router.push(`/assessments/${assessment.id}`);
                                                                    }}
                                                                >
                                                                    View details
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

            {visibleAssessments.length > 0 ? (
                <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-600">
                        Showing <span className="font-medium">{visibleAssessments.length}</span> assessments
                    </p>
                </div>
            ) : null}
        </div>
    );
}
