'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
    ArrowLeft,
    BookOpen,
    ChevronRight,
    GraduationCap,
    LineChart,
    Users,
    Calendar,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useAuth } from '@/app/context/AuthContext';
import { usePlugins } from '@/app/core/hooks/usePlugins';
import { useCohortDetail } from '@/app/core/hooks/useAcademic';
import { useInstructorCohortAccess } from '@/app/core/hooks/useInstructorCohortAccess';
import { Card } from '@/app/components/ui/Card';
import { Button } from '@/app/components/ui/Button';
import { Badge } from '@/app/components/ui/Badge';
import { LoadingSpinner } from '@/app/components/ui/LoadingSpinner';
import { ErrorState } from '@/app/components/ui/ErrorState';
import { getCurriculumBridgeName, isCambridgeCurriculumType } from '@/app/core/lib/curriculumBridge';
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
                <span className={`text-sm font-semibold ${href ? 'text-blue-600' : 'text-gray-400'}`}>
                    {footerLabel ?? (href ? 'Open' : 'Unavailable')}
                </span>
                {href ? <ChevronRight className="h-5 w-5 text-blue-600" /> : null}
            </div>
        </>
    );

    if (!href) {
        return (
            <div
                aria-disabled="true"
                className="flex min-h-[208px] flex-col justify-between rounded-lg border border-dashed border-gray-300 bg-gray-50 p-5 opacity-80"
            >
                {content}
            </div>
        );
    }

    return (
        <Link
            href={href}
            className="flex min-h-[208px] flex-col justify-between rounded-lg border border-gray-200 bg-white p-5 shadow-sm transition-all hover:border-blue-300 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
            {content}
        </Link>
    );
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

    const cohortId = Number(params.id);
    const isValidCohortId = Number.isFinite(cohortId) && cohortId > 0;
    const { cohort, loading: cohortLoading, error } = useCohortDetail(isValidCohortId ? cohortId : null);

    const isInstructor = activeRole === 'INSTRUCTOR';
    const accessLoading = authLoading || pluginsLoading || (isInstructor && instructorAccess.isLoading);
    const allowed = !user
        ? false
        : user.is_superadmin
            || activeRole === 'ADMIN'
            || (isInstructor && instructorAccess.cohortIds.includes(cohortId));

    useEffect(() => {
        if (accessLoading || allowed || !activeRole) return;
        router.replace(roleHomeRoute[activeRole]);
    }, [accessLoading, activeRole, allowed, router]);

    if (!isValidCohortId) {
        return <ErrorState fullScreen={false} message="Invalid cohort." />;
    }

    if (accessLoading || cohortLoading) {
        return <LoadingSpinner fullScreen={false} message="Loading cohort hub..." />;
    }

    if (!allowed) return null;

    if (error || !cohort) {
        return (
            <ErrorState
                fullScreen={false}
                message={error ?? 'Failed to load cohort details.'}
            />
        );
    }

    const curriculumName = getCurriculumBridgeName(cohort);
    const isCambridge = isCambridgeCurriculumType(cohort.curriculum_type);
    const isCBC = cohort.curriculum_type === 'CBE';
    const learnerCount = String(cohort.students_count ?? 0);
    const subjectCount = cohort.subjects_count ?? cohort.subjects.length;
    const learnersHref = isInstructor
        ? `/learners?curriculum=${cohort.curriculum}&cohort=${cohort.id}`
        : `/academic/cohorts/${cohort.id}/students`;
    const sessionsHref = `/sessions?cohort=${cohort.id}`;
    const hasCBCPlugin = hasPlugin('cbc');
    const hasCambridgePlugin = hasPlugin('cambridge');
    const unknownCurriculumReason = `No workflow is configured yet for ${curriculumName}.`;

    return (
        <div className="mx-auto max-w-6xl space-y-6">
            <div>
                <Link href="/academic/cohorts">
                    <Button variant="ghost" size="sm">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        {isInstructor ? 'Back to My Cohorts' : 'Back to Cohorts'}
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
                        Use this cohort hub to open learners, sessions, and curriculum workflows for the selected cohort.
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
                    <MetadataItem label="Learners" value={learnerCount} />
                </dl>
            </Card>

            <section className="space-y-4">
                <div className="space-y-1">
                    <h2 className="text-xl font-semibold text-gray-900">Teaching Actions</h2>
                    <p className="text-sm text-gray-500">
                        Choose the workflow you want to open for this cohort.
                    </p>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <ActionCard
                        title="Learners"
                        description="View learners enrolled in this cohort."
                        icon={Users}
                        href={learnersHref}
                        footerLabel={`${learnerCount} learner${learnerCount === '1' ? '' : 's'}`}
                    />
                    <ActionCard
                        title="Sessions"
                        description="Open sessions filtered to this cohort."
                        icon={Calendar}
                        href={sessionsHref}
                        footerLabel="Open sessions"
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
        </div>
    );
}
