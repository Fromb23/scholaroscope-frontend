'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
    ArrowLeft,
    BookOpen,
    ChevronRight,
    ClipboardList,
    GraduationCap,
    LineChart,
    Users,
    Calendar,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useAuth } from '@/app/context/AuthContext';
import { usePlugins } from '@/app/core/hooks/usePlugins';
import { useCohortDetail, useCohortSubjects } from '@/app/core/hooks/useAcademic';
import { useCohortEnrolledStudents } from '@/app/core/hooks/useCohortStudents';
import { useCohortSubjectParticipation } from '@/app/core/hooks/useCohortSubjectParticipation';
import { useInstructorCohortAccess } from '@/app/core/hooks/useInstructorCohortAccess';
import { Card } from '@/app/components/ui/Card';
import { Button } from '@/app/components/ui/Button';
import { Badge } from '@/app/components/ui/Badge';
import { LoadingSpinner } from '@/app/components/ui/LoadingSpinner';
import { ErrorState } from '@/app/components/ui/ErrorState';
import { useAssistantPageContext } from '@/app/core/components/assistant/useAssistantPageContext';
import { ManageCohortSubjectsModal } from '@/app/core/components/cohorts/CohortComponents';
import { CohortSubjectParticipationSection } from '@/app/core/components/cohorts/CohortSubjectParticipationSection';
import { getCurriculumBridgeName, isCambridgeCurriculumType } from '@/app/core/lib/curriculumBridge';
import { isAdminOrAbove } from '@/app/utils/permissions';
import { roleHomeRoute } from '@/app/utils/routeAccess';
import { useCambridgeCohortSubjects } from '@/app/plugins/cambridge/hooks';

interface MetadataItemProps {
    label: string;
    value: string;
}

interface ActionCardProps {
    title: string;
    description: string;
    icon: LucideIcon;
    href?: string;
    onClick?: () => void;
    disabledReason?: string;
    footerLabel?: string;
}

function MetadataItem({ label, value }: MetadataItemProps) {
    return (
        <div className="space-y-1">
            <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</dt>
            <dd className="text-sm font-medium text-gray-900 break-words">{value}</dd>
        </div>
    );
}

function ActionCard({
    title,
    description,
    icon: Icon,
    href,
    onClick,
    disabledReason,
    footerLabel,
}: ActionCardProps) {
    const content = (
        <>
            <div className="space-y-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                    <Icon className="h-5 w-5" />
                </div>
                <div className="space-y-1">
                    <h2 className="text-base font-semibold text-gray-900">{title}</h2>
                    <p className="text-sm text-gray-600">{description}</p>
                    {disabledReason ? (
                        <p className="text-sm font-medium text-amber-700">{disabledReason}</p>
                    ) : null}
                </div>
            </div>
            <div className="mt-6 flex items-center justify-between">
                <span className={`text-sm font-semibold ${href || onClick ? 'text-blue-600' : 'text-gray-400'}`}>
                    {footerLabel ?? (href || onClick ? 'Open' : 'Unavailable')}
                </span>
                {href || onClick ? <ChevronRight className="h-5 w-5 text-blue-600" /> : null}
            </div>
        </>
    );

    if (!href && !onClick) {
        return (
            <div
                aria-disabled="true"
                className="flex min-h-[208px] flex-col justify-between rounded-lg border border-dashed border-gray-300 bg-gray-50 p-5 opacity-80"
            >
                {content}
            </div>
        );
    }

    const className = 'flex min-h-[208px] flex-col justify-between rounded-lg border border-gray-200 bg-white p-5 text-left shadow-sm transition-all hover:border-blue-300 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2';

    if (href) {
        return (
            <Link href={href} className={className}>
                {content}
            </Link>
        );
    }

    return (
        <button type="button" onClick={onClick} className={className}>
            {content}
        </button>
    );
}

function buildInstructorManagementHref(cohortId: number, cohortName: string, subject: {
    id: number;
    subject_name: string;
    curriculum_type: string;
}) {
    const subjectSource = subject.curriculum_type === 'CBE'
        ? 'cbc'
        : isCambridgeCurriculumType(subject.curriculum_type)
            ? 'cambridge'
            : 'kernel';
    const params = new URLSearchParams({
        cohort_subject_id: String(subject.id),
        cohort_id: String(cohortId),
        cohort_name: cohortName,
        subject_name: subject.subject_name,
        subject_source: subjectSource,
        returnTo: `/academic/cohorts/${cohortId}`,
        open: 'teaching',
    });

    return `/admin/instructors?${params.toString()}`;
}

function CambridgeCurriculumCards({
    cohortId,
}: {
    cohortId: number;
}) {
    const { data: assignments = [], isLoading } = useCambridgeCohortSubjects({
        cohort: cohortId,
        active: true,
    });

    const assignmentCount = assignments.length;
    const hasAssignments = assignmentCount > 0;
    const disabledReason = isLoading
        ? 'Checking Cambridge subject assignments for this cohort...'
        : 'No Cambridge subjects assigned to this cohort yet.';

    return (
        <>
            <ActionCard
                title="Cambridge Subjects"
                description="Open Cambridge subject offerings and cohort delivery for this cohort."
                icon={BookOpen}
                href={hasAssignments ? '/cambridge/subjects' : undefined}
                disabledReason={!hasAssignments ? disabledReason : undefined}
                footerLabel={hasAssignments ? `${assignmentCount} assigned` : undefined}
            />
            <ActionCard
                title="Cambridge Progress"
                description="Review Cambridge subject progress available to this cohort."
                icon={LineChart}
                href={hasAssignments ? '/cambridge/progress' : undefined}
                disabledReason={!hasAssignments ? disabledReason : undefined}
                footerLabel={hasAssignments ? 'View progress' : undefined}
            />
        </>
    );
}

export default function CohortHubPage() {
    const params = useParams<{ id: string }>();
    const router = useRouter();
    const { user, activeRole, loading: authLoading } = useAuth();
    const { hasPlugin, loading: pluginsLoading } = usePlugins();
    const instructorAccess = useInstructorCohortAccess();
    const [assignSubjectsOpen, setAssignSubjectsOpen] = useState(false);

    const cohortId = Number(params.id);
    const isValidCohortId = Number.isFinite(cohortId) && cohortId > 0;
    const {
        cohort,
        loading: cohortLoading,
        error,
        refetch: refetchCohort,
    } = useCohortDetail(isValidCohortId ? cohortId : null);
    const {
        cohortSubjects,
        loading: cohortSubjectsLoading,
        error: cohortSubjectsError,
        refetch: refetchCohortSubjects,
    } = useCohortSubjects(isValidCohortId ? cohortId : undefined);
    const enrolledStudentsQuery = useCohortEnrolledStudents(cohortId);

    const isInstructor = activeRole === 'INSTRUCTOR';
    const accessLoading = authLoading || pluginsLoading || (isInstructor && instructorAccess.isLoading);
    const allowed = !user
        ? false
        : user.is_superadmin
            || activeRole === 'ADMIN'
            || (isInstructor && instructorAccess.cohortIds.includes(cohortId));
    const canManageInstructors = isAdminOrAbove(user, activeRole);
    const canLinkSubjects = isAdminOrAbove(user, activeRole);
    const visibleCohortSubjects = isInstructor
        ? cohortSubjects.filter(subject => instructorAccess.cohortSubjectIds.includes(subject.id))
        : cohortSubjects;
    const subjectParticipationQuery = useCohortSubjectParticipation(
        cohort?.id ?? null,
        visibleCohortSubjects,
        { includeInstructor: canManageInstructors }
    );

    useEffect(() => {
        if (accessLoading || allowed || !activeRole) return;
        router.replace(roleHomeRoute[activeRole]);
    }, [accessLoading, activeRole, allowed, router]);

    const isCambridge = cohort ? isCambridgeCurriculumType(cohort.curriculum_type) : false;
    const isCBC = cohort?.curriculum_type === 'CBE';
    const canViewCohortLearners = isAdminOrAbove(user, activeRole);
    const hasCBCPlugin = hasPlugin('cbc');
    const hasCambridgePlugin = hasPlugin('cambridge');
    const learnerCount = enrolledStudentsQuery.data?.students.length ?? 0;
    const subjectCount = cohortSubjects.length;
    const assignedInstructorCount = Object.values(subjectParticipationQuery.summaries)
        .filter((summary) => summary.instructorState === 'assigned')
        .length;
    const sessionsHref = isValidCohortId ? `/sessions?cohort=${cohortId}` : '/sessions';
    const assistantContext = {
        pageKey: 'cohort_detail',
        pageTitle: cohort?.name ?? 'Cohort',
        state: {
            academic_year: cohort?.academic_year_name ?? null,
            is_empty: !cohort,
            selected_cohort: cohort?.name ?? '',
            subject_count: visibleCohortSubjects.length,
            learner_count: learnerCount,
            instructor_count: assignedInstructorCount,
            role: activeRole ?? null,
        },
        visibleActions: [
            {
                label: 'Back to Cohorts',
                type: 'navigate' as const,
                href: '/academic/cohorts',
            },
            {
                label: 'Open Sessions',
                type: 'navigate' as const,
                href: sessionsHref,
            },
            ...(cohort && isCBC && hasCBCPlugin && subjectCount > 0
                ? [
                    {
                        label: 'Browse CBC',
                        type: 'navigate' as const,
                        href: `/cbc/browser?cohort=${cohort.id}`,
                    },
                    {
                        label: 'Open CBC Progress',
                        type: 'navigate' as const,
                        href: `/cbc/progress?cohort=${cohort.id}`,
                    },
                ]
                : []),
        ],
        nextSafeAction: cohort && isCBC && hasCBCPlugin && subjectCount > 0
            ? {
                label: 'Browse CBC',
                type: 'navigate' as const,
                href: `/cbc/browser?cohort=${cohort.id}`,
            }
            : {
                label: 'Open Sessions',
                type: 'navigate' as const,
                href: sessionsHref,
            },
        workflowStep: cohort && isCBC ? 'cohort_cbc_tools' : 'cohort_actions',
        emptyStateReason: !cohort && !cohortLoading
            ? 'This cohort could not be loaded.'
            : undefined,
    };

    useAssistantPageContext(assistantContext);

    if (!isValidCohortId) {
        return <ErrorState fullScreen={false} message="Invalid cohort." />;
    }

    if (accessLoading || cohortLoading || enrolledStudentsQuery.isLoading) {
        return <LoadingSpinner fullScreen={false} message="Loading cohort hub..." />;
    }

    if (!allowed) return null;

    if (error || enrolledStudentsQuery.error || !cohort) {
        return (
            <ErrorState
                fullScreen={false}
                message={error ?? enrolledStudentsQuery.error?.message ?? 'Failed to load cohort details.'}
            />
        );
    }

    const curriculumName = getCurriculumBridgeName(cohort);
    const learnerCountLabel = String(learnerCount);
    const cohortLearnersHref = `/academic/cohorts/${cohort.id}/students`;
    const unknownCurriculumReason = `No workflow is configured yet for ${curriculumName}.`;

    return (
        <div className="mx-auto max-w-6xl space-y-6">
            <div>
                <Link href="/academic/cohorts">
                    <Button variant="ghost" size="sm">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        {isInstructor ? 'Back to My Teaching Load' : 'Back to Cohorts'}
                    </Button>
                </Link>
            </div>

            <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="info">{curriculumName}</Badge>
                    <Badge variant="default">{cohort.academic_year_name}</Badge>
                </div>
                <div className="space-y-1">
                    <h1 className="text-3xl font-bold text-gray-900">{cohort.name}</h1>
                    <p className="text-sm text-gray-500">
                        {canViewCohortLearners
                            ? 'Use this cohort control center to manage placement, create cohort subject offerings, and open subject-specific learner workflows.'
                            : 'Use this cohort control center to open subject-specific learner workflows for your teaching assignments.'}
                    </p>
                </div>
            </div>

            <Card>
                <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    <MetadataItem label="Cohort" value={cohort.name} />
                    <MetadataItem label="Academic Year" value={cohort.academic_year_name} />
                    <MetadataItem label="Curriculum" value={curriculumName} />
                    <MetadataItem label="Level" value={cohort.level} />
                    <MetadataItem label="Stream" value={cohort.stream || '—'} />
                    <MetadataItem label="Learners" value={learnerCountLabel} />
                </dl>
            </Card>

            <section className="space-y-4">
                <div className="space-y-1">
                    <h2 className="text-xl font-semibold text-gray-900">Cohort Actions</h2>
                    <p className="text-sm text-gray-500">
                        Choose the workflow you want to open for this cohort.
                    </p>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                    {canViewCohortLearners ? (
                        <ActionCard
                            title="Class List"
                            description="Open cohort learners to view enrolled learners and manage cohort placement. Subject participation stays scoped to each cohort subject."
                            icon={Users}
                            href={cohortLearnersHref}
                            footerLabel="View class list"
                        />
                    ) : null}
                    {canLinkSubjects ? (
                        <ActionCard
                            title="Link Subject to Cohort"
                            description="Create or update cohort subject offerings for this cohort."
                            icon={BookOpen}
                            onClick={() => setAssignSubjectsOpen(true)}
                            footerLabel={subjectCount > 0 ? `${subjectCount} linked` : 'Assign subject'}
                        />
                    ) : null}
                    <ActionCard
                        title="Sessions"
                        description="Open sessions filtered to this cohort."
                        icon={Calendar}
                        href={sessionsHref}
                        footerLabel="Open sessions"
                    />
                    <ActionCard
                        title="Assignments"
                        description="Open cohort-scoped assignments while keeping creation authority pinned to cohort subjects."
                        icon={ClipboardList}
                        href={`/academic/cohorts/${cohort.id}/assignments`}
                        footerLabel="Manage assignments"
                    />

                    {isCBC ? (
                        <>
                            <ActionCard
                                title="CBC Subjects & Outcomes"
                                description="Browse strands, sub-strands, and outcomes taught in this cohort."
                                icon={BookOpen}
                                href={hasCBCPlugin && subjectCount > 0 ? `/cbc/browser?cohort=${cohort.id}` : undefined}
                                disabledReason={
                                    !hasCBCPlugin
                                        ? 'CBC tools are not available for this organization yet.'
                                        : subjectCount === 0
                                            ? 'No CBC subjects assigned to this cohort yet.'
                                            : undefined
                                }
                                footerLabel={subjectCount > 0 ? `${subjectCount} subject${subjectCount === 1 ? '' : 's'}` : undefined}
                            />
                            <ActionCard
                                title="CBC Progress"
                                description="Track CBC progress and coverage for this cohort."
                                icon={LineChart}
                                href={hasCBCPlugin && subjectCount > 0 ? `/cbc/progress?cohort=${cohort.id}` : undefined}
                                disabledReason={
                                    !hasCBCPlugin
                                        ? 'CBC tools are not available for this organization yet.'
                                        : subjectCount === 0
                                            ? 'No CBC subjects assigned to this cohort yet.'
                                            : undefined
                                }
                                footerLabel={subjectCount > 0 ? 'View progress' : undefined}
                            />
                        </>
                    ) : isCambridge ? (
                        hasCambridgePlugin ? (
                            <CambridgeCurriculumCards cohortId={cohort.id} />
                        ) : (
                            <>
                                <ActionCard
                                    title="Cambridge Subjects"
                                    description="Open Cambridge subject offerings and cohort delivery for this cohort."
                                    icon={BookOpen}
                                    disabledReason="Cambridge tools are not available for this organization yet."
                                />
                                <ActionCard
                                    title="Cambridge Progress"
                                    description="Review Cambridge subject progress available to this cohort."
                                    icon={LineChart}
                                    disabledReason="Cambridge tools are not available for this organization yet."
                                />
                            </>
                        )
                    ) : (
                        <>
                            <ActionCard
                                title={`${curriculumName} Content`}
                                description="Curriculum content routes are not configured for this cohort yet."
                                icon={BookOpen}
                                disabledReason={unknownCurriculumReason}
                            />
                            <ActionCard
                                title={`${curriculumName} Progress`}
                                description="Curriculum progress routes are not configured for this cohort yet."
                                icon={LineChart}
                                disabledReason={unknownCurriculumReason}
                            />
                        </>
                    )}
                </div>
            </section>

            <CohortSubjectParticipationSection
                cohortSubjects={visibleCohortSubjects}
                summaries={subjectParticipationQuery.summaries}
                loading={cohortSubjectsLoading || subjectParticipationQuery.loading}
                error={cohortSubjectsError ?? subjectParticipationQuery.error}
                emptyMessage={isInstructor
                    ? 'No cohort subjects are assigned to you yet.'
                    : undefined}
                canManageInstructors={canManageInstructors}
                canLinkSubjects={canLinkSubjects}
                onLinkSubjects={() => setAssignSubjectsOpen(true)}
                buildInstructorHref={(subject) => buildInstructorManagementHref(cohort.id, cohort.name, subject)}
            />

            <Card>
                <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                        <GraduationCap className="h-5 w-5" />
                    </div>
                    <div className="space-y-1">
                        <h2 className="text-base font-semibold text-gray-900">Cohort Context</h2>
                        <p className="text-sm text-gray-600">
                            Learners are only one part of this cohort. Use the actions above to move between cohort roster, scheduling, and curriculum delivery without losing context.
                        </p>
                    </div>
                </div>
            </Card>

            {canLinkSubjects ? (
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
