'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import {
    ArrowLeft,
    AlertCircle,
    BookOpen,
    ChevronRight,
    ClipboardList,
    GraduationCap,
    LineChart,
    Settings2,
    Users,
    Calendar,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useAuth } from '@/app/context/AuthContext';
import { usePlugins } from '@/app/core/hooks/usePlugins';
import { useCohortDetail, useCohortSubjects } from '@/app/core/hooks/useAcademic';
import { useAcademicSetupStatus } from '@/app/core/hooks/useAcademicSetupStatus';
import { useCohortEnrolledStudents } from '@/app/core/hooks/useCohortStudents';
import { useCohortSubjectParticipation } from '@/app/core/hooks/useCohortSubjectParticipation';
import { useInstructorCohortAccess } from '@/app/core/hooks/useInstructorCohortAccess';
import { isSafeNextPath } from '@/app/core/auth/navigation';
import { Card } from '@/app/components/ui/Card';
import { Button } from '@/app/components/ui/Button';
import { Badge } from '@/app/components/ui/Badge';
import { LoadingSpinner } from '@/app/components/ui/LoadingSpinner';
import { ErrorState } from '@/app/components/ui/ErrorState';
import { useAssistantPageContext } from '@/app/core/components/assistant/useAssistantPageContext';
import { ManageCohortSubjectsModal } from '@/app/core/components/cohorts/CohortComponents';
import {
    CohortSubjectParticipationSection,
    type CohortSubjectAction,
} from '@/app/core/components/cohorts/CohortSubjectParticipationSection';
import { hasCbcPathwayProfile, isCbcSeniorSchoolEntity } from '@/app/core/lib/cbcSeniorSchool';
import { withAcademicSetupMode } from '@/app/core/lib/academicSetup';
import { getAcademicLevelLabel } from '@/app/core/lib/curriculumLevels';
import { getCurriculumBridgeName, isCambridgeCurriculumType } from '@/app/core/lib/curriculumBridge';
import { isSelfManagedTeachingWorkspace } from '@/app/core/lib/workspaces';
import { isAdminOrAbove } from '@/app/utils/permissions';
import { roleHomeRoute } from '@/app/utils/routeAccess';
import { getCohortDetailCardExtensions } from '@/app/core/registry/cohortDetailCards';
import {
    buildCohortSubjectReturnTo,
    buildCohortSubjectTeachingActions,
    shouldShowCohortSubjectTeachingActions,
} from '@/app/core/components/academic/cohorts/cohortSubjectActions';
import type { CohortSubject } from '@/app/core/types/academic';

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

function buildScopedHref(path: string, params: Record<string, string | number | null | undefined>) {
    const search = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
        if (value === null || value === undefined || value === '') return;
        search.set(key, String(value));
    });
    const query = search.toString();
    return query ? `${path}?${query}` : path;
}

function CbcSeniorSetupSection({
    ready,
    hasCBCPlugin,
    canConfigure,
    manageSubjectsLabel,
    pathwayName,
    trackName,
    combinationCode,
    combinationName,
    subjectCount,
    onManageSubjects,
}: {
    ready: boolean;
    hasCBCPlugin: boolean;
    canConfigure: boolean;
    manageSubjectsLabel: string;
    pathwayName?: string;
    trackName?: string;
    combinationCode?: string;
    combinationName?: string;
    subjectCount: number;
    onManageSubjects: () => void;
}) {
    return (
        <section className="space-y-4">
            <div className="space-y-1">
                <h2 className="text-xl font-semibold text-gray-900">Class Subject Setup</h2>
                <p className="text-sm text-gray-500">Choose the subjects this class will offer.</p>
            </div>

            <Card>
                <div className="space-y-5">
                    <div className="flex items-start gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                            <Settings2 className="h-5 w-5" />
                        </div>
                        <div className="space-y-2">
                            <div className="flex flex-wrap items-center gap-2">
                                <h3 className="text-base font-semibold text-gray-900">
                                    Status: {ready ? 'Ready' : 'Needs setup'}
                                </h3>
                                <Badge variant={ready ? 'green' : 'warning'}>
                                    {ready ? 'Ready' : 'Needs setup'}
                                </Badge>
                            </div>

                            {!pathwayName ? (
                                <p className="text-sm text-gray-600">
                                    Choose the class pathway and the subjects this class will offer.
                                </p>
                            ) : !ready ? (
                                <p className="text-sm text-gray-600">
                                    This class belongs to {pathwayName}. Add the subjects this class will learn.
                                </p>
                            ) : (
                                <p className="text-sm text-gray-600">
                                    Required subjects are added. {subjectCount} subjects are available for teaching.
                                </p>
                            )}

                            {pathwayName ? (
                                <p className="text-sm font-medium text-gray-900">This class follows {pathwayName}.</p>
                            ) : null}

                            {pathwayName || trackName || combinationCode || combinationName ? (
                                <details className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                                    <summary className="cursor-pointer list-none text-sm font-medium text-gray-800">
                                        Advanced details
                                    </summary>
                                    <div className="mt-3 grid gap-3 text-sm text-gray-700 sm:grid-cols-3">
                                        {pathwayName ? (
                                            <div>
                                                <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Pathway</p>
                                                <p className="mt-1 font-semibold text-gray-900">{pathwayName}</p>
                                            </div>
                                        ) : null}
                                        {trackName ? (
                                            <div>
                                                <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Track</p>
                                                <p className="mt-1 font-semibold text-gray-900">{trackName}</p>
                                            </div>
                                        ) : null}
                                        {combinationCode || combinationName ? (
                                            <div>
                                                <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Official grouping</p>
                                                <p className="mt-1 font-semibold text-gray-900">
                                                    {combinationName || combinationCode}
                                                </p>
                                            </div>
                                        ) : null}
                                    </div>
                                </details>
                            ) : null}

                            {!hasCBCPlugin ? (
                                <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                                    <p>CBC tools are not available for this organization yet.</p>
                                </div>
                            ) : null}
                        </div>
                    </div>

                    {canConfigure && hasCBCPlugin ? (
                        <div className="flex flex-wrap gap-3 border-t border-gray-100 pt-4">
                            <Button onClick={onManageSubjects}>
                                {manageSubjectsLabel}
                            </Button>
                        </div>
                    ) : null}
                </div>
            </Card>
        </section>
    );
}

function StandardClassSetupSection({
    ready,
    isCbcLowerLevel,
    canConfigure,
    manageSubjectsLabel,
    subjectCount,
    onManageSubjects,
}: {
    ready: boolean;
    isCbcLowerLevel: boolean;
    canConfigure: boolean;
    manageSubjectsLabel: string;
    subjectCount: number;
    onManageSubjects: () => void;
}) {
    return (
        <section className="space-y-4">
            <div className="space-y-1">
                <h2 className="text-xl font-semibold text-gray-900">Class Subject Setup</h2>
                <p className="text-sm text-gray-500">Link the subjects this class will offer.</p>
            </div>

            <Card>
                <div className="space-y-5">
                    <div className="flex items-start gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                            <Settings2 className="h-5 w-5" />
                        </div>
                        <div className="space-y-2">
                            <div className="flex flex-wrap items-center gap-2">
                                <h3 className="text-base font-semibold text-gray-900">
                                    Status: {ready ? 'Ready' : 'Needs setup'}
                                </h3>
                                <Badge variant={ready ? 'green' : 'warning'}>
                                    {ready ? 'Ready' : 'Needs setup'}
                                </Badge>
                            </div>

                            <p className="text-sm text-gray-600">
                                {ready
                                    ? `This class has ${subjectCount} linked subject${subjectCount === 1 ? '' : 's'} and is ready for delivery workflows.`
                                    : 'Choose the subjects this class will offer before moving into delivery workflows.'}
                            </p>

                            {isCbcLowerLevel ? (
                                <div className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-3 text-sm text-blue-800">
                                    Pathway setup only applies to Grade 10, Grade 11, and Grade 12.
                                </div>
                            ) : null}
                            {/* TODO: Enforce lower CBC class subjects against the grade-level catalogue once that workflow is finalized. */}
                        </div>
                    </div>

                    {canConfigure ? (
                        <div className="flex flex-wrap gap-3 border-t border-gray-100 pt-4">
                            <Button onClick={onManageSubjects}>
                                {manageSubjectsLabel}
                            </Button>
                        </div>
                    ) : null}
                </div>
            </Card>
        </section>
    );
}

function CohortSetupModeCard({
    ready,
    isCbcSeniorCohort,
    hasCbcProfile,
    isCbcLowerLevel,
    continueHref,
    continueLabel,
    manageSubjectsLabel,
    onManageSubjects,
}: {
    ready: boolean;
    isCbcSeniorCohort: boolean;
    hasCbcProfile: boolean;
    isCbcLowerLevel: boolean;
    continueHref: string;
    continueLabel: string;
    manageSubjectsLabel: string;
    onManageSubjects: () => void;
}) {
    const setupDescription = ready
        ? 'This cohort is ready. Continue with the next safe setup action.'
        : isCbcSeniorCohort && !hasCbcProfile
            ? 'Finish class subject setup for this CBC senior cohort. Choose the class pathway first, then confirm the class subjects.'
            : isCbcLowerLevel
                ? 'Finish class subject setup for this lower CBC cohort. Lower CBC levels do not need pathway selection.'
                : 'Finish class subject setup for this cohort before moving on.';

    return (
        <Card>
            <div className="space-y-4 p-5">
                <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-semibold theme-text">Academic setup</h2>
                    <Badge variant={ready ? 'green' : 'blue'}>
                        {ready ? 'Ready' : 'Current'}
                    </Badge>
                </div>
                <p className="text-sm theme-muted">{setupDescription}</p>
                <div className="flex flex-wrap gap-3">
                    {ready ? (
                        <Link href={continueHref}>
                            <Button>{continueLabel}</Button>
                        </Link>
                    ) : (
                        <Button onClick={onManageSubjects}>{manageSubjectsLabel}</Button>
                    )}
                </div>
            </div>
        </Card>
    );
}

export default function CohortHubPage() {
    const params = useParams<{ id: string }>();
    const router = useRouter();
    const searchParams = useSearchParams();
    const { user, activeRole, activeOrg, capabilities, loading: authLoading } = useAuth();
    const { hasPlugin, loading: pluginsLoading } = usePlugins();
    const instructorAccess = useInstructorCohortAccess();
    const [assignSubjectsOpen, setAssignSubjectsOpen] = useState(false);
    const setupMode = searchParams.get('setup') === '1';
    const rawReturnTo = searchParams.get('returnTo');
    const safeReturnTo = isSafeNextPath(rawReturnTo)
        ? rawReturnTo
        : null;
    const setupStatusQuery = useAcademicSetupStatus({
        enabled: setupMode && isAdminOrAbove(user, activeRole),
    });
    const setupIncomplete = Boolean(setupStatusQuery.data && !setupStatusQuery.data.complete);
    const effectiveSetupMode = setupMode && setupIncomplete;

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

    const isPersonalTeachingWorkspace = isSelfManagedTeachingWorkspace({
        orgType: activeOrg?.org_type,
        capabilities,
    });
    const isTeachingActor = instructorAccess.isTeachingActor;
    const isInstitutionAdminView = Boolean(user?.is_superadmin) || (activeRole === 'ADMIN' && !isTeachingActor);
    const accessLoading = authLoading || pluginsLoading || (isTeachingActor && instructorAccess.isLoading);
    const allowed = !user
        ? false
        : isInstitutionAdminView
            || (isTeachingActor && instructorAccess.cohortIds.includes(cohortId))
            || (isPersonalTeachingWorkspace && activeRole === 'ADMIN');
    const canManageInstructors = isAdminOrAbove(user, activeRole) && !isPersonalTeachingWorkspace;
    const canLinkSubjects = isAdminOrAbove(user, activeRole);
    const visibleCohortSubjects = isTeachingActor
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
    const isCbcSeniorCohort = isCbcSeniorSchoolEntity(cohort);
    const isCbcLowerLevel = Boolean(isCBC && !isCbcSeniorCohort);
    const hasCbcProfile = hasCbcPathwayProfile(cohort);
    const canViewCohortLearners = isAdminOrAbove(user, activeRole);
    const hasCBCPlugin = hasPlugin('cbc');
    const hasCambridgePlugin = hasPlugin('cambridge');
    const cohortDetailCardExtensions = cohort
        ? getCohortDetailCardExtensions({
            cohortId: cohort.id,
            curriculumType: cohort.curriculum_type,
        })
        : [];
    const learnerCount = enrolledStudentsQuery.data?.students.length ?? 0;
    const subjectCount = cohortSubjects.length;
    const isClassSetupReady = subjectCount > 0;
    const isCbcSetupReady = isCbcSeniorCohort && hasCbcProfile && subjectCount > 0;
    const cohortSetupReady = isCbcSeniorCohort ? isCbcSetupReady : isClassSetupReady;
    const assignedInstructorCount = Object.values(subjectParticipationQuery.summaries)
        .filter((summary) => summary.instructorState === 'assigned')
        .length;
    const sessionsHref = isValidCohortId ? `/sessions?cohort=${cohortId}` : '/sessions';
    const defaultCohortHref = cohort ? `/academic/cohorts/${cohort.id}` : `/academic/cohorts/${cohortId}`;
    const cohortReturnParams = new URLSearchParams();
    if (effectiveSetupMode) {
        cohortReturnParams.set('setup', '1');
    }
    if (safeReturnTo) {
        cohortReturnParams.set('returnTo', safeReturnTo);
    }
    const cohortReturnTo = cohortReturnParams.toString()
        ? `${defaultCohortHref}?${cohortReturnParams.toString()}`
        : defaultCohortHref;
    const backHref = safeReturnTo
        ?? (effectiveSetupMode ? withAcademicSetupMode('/academic/cohorts') : '/academic/cohorts');
    const backLabel = safeReturnTo
        ? 'Back'
        : (isTeachingActor ? 'Back to My Teaching Load' : 'Back to Cohorts');
    const cbcBrowserHref = `${'/cbc/browser'}?${new URLSearchParams({
        cohort: String(cohortId),
        returnTo: cohortReturnTo,
    }).toString()}`;
    const cbcProgressHref = `${'/cbc/progress'}?${new URLSearchParams({
        cohort: String(cohortId),
        returnTo: cohortReturnTo,
    }).toString()}`;
    const classReportSetupHref = buildScopedHref(`/academic/cohorts/${cohortId}/report-setup`, {
        source: 'class_configuration',
        cohort: cohortId,
        returnTo: cohortReturnTo,
    });
    const classReportComputationHref = buildScopedHref(`/academic/cohorts/${cohortId}/report-computation`, {
        source: 'class_configuration',
        cohort: cohortId,
        returnTo: cohortReturnTo,
    });
    const showSubjectTeachingActions = shouldShowCohortSubjectTeachingActions({
        isTeachingActor,
    });
    const workflowSubjectCount = isTeachingActor ? visibleCohortSubjects.length : subjectCount;
    const buildSubjectReturnTo = useCallback(
        (subjectId: number) => buildCohortSubjectReturnTo(cohortReturnTo, subjectId),
        [cohortReturnTo]
    );
    const buildSubjectLearnersHref = useCallback(
        (subject: CohortSubject) => buildScopedHref(`/academic/cohort-subjects/${subject.id}/learners`, {
            returnTo: buildSubjectReturnTo(subject.id),
        }),
        [buildSubjectReturnTo]
    );
    const buildSubjectActions = useCallback((subject: CohortSubject): CohortSubjectAction[] => {
        return buildCohortSubjectTeachingActions({
            cohortId,
            cohortReturnTo,
            subject,
            isCBC,
            hasCBCPlugin,
            isClassConfigurationWorkspace: isPersonalTeachingWorkspace,
        });
    }, [cohortId, cohortReturnTo, hasCBCPlugin, isCBC, isPersonalTeachingWorkspace]);
    const linkSubjectsDisabledReason = !hasCBCPlugin && isCbcSeniorCohort
        ? 'CBC tools are not available for this organization yet.'
        : null;
    const classSubjectsLabel = cohortSetupReady ? 'Manage Class Subjects' : 'Set Up Class Subjects';
    const personalSubjectsLabel = cohortSetupReady ? 'Manage subjects' : 'Set up subjects';
    const linkSubjectsLabel = isPersonalTeachingWorkspace
        ? personalSubjectsLabel
        : classSubjectsLabel;
    const setupCardSubjectsLabel = isPersonalTeachingWorkspace && !isCbcSeniorCohort
        ? personalSubjectsLabel
        : classSubjectsLabel;
    const setupContinueHref = withAcademicSetupMode(setupStatusQuery.data?.next_action.href ?? '/dashboard/admin');
    const setupContinueLabel = setupStatusQuery.data?.next_action.label ?? 'Continue setup';
    const assistantContext = useMemo(() => ({
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
                label: backLabel,
                type: 'navigate' as const,
                href: backHref,
            },
            ...(cohort && canLinkSubjects && !linkSubjectsDisabledReason && (!effectiveSetupMode || !cohortSetupReady)
                ? [{
                    label: linkSubjectsLabel,
                    type: 'page_action' as const,
                    handler: () => setAssignSubjectsOpen(true),
                }]
                : []),
            ...(effectiveSetupMode && cohortSetupReady
                ? [{
                    label: setupContinueLabel,
                    type: 'navigate' as const,
                    href: setupContinueHref,
                }]
                : []),
            ...(showSubjectTeachingActions
                ? [{
                    label: 'Open Sessions',
                    type: 'navigate' as const,
                    href: sessionsHref,
                }]
                : []),
            ...(showSubjectTeachingActions && cohort && isCBC && hasCBCPlugin && workflowSubjectCount > 0
                ? [
                    {
                        label: 'Browse CBC',
                        type: 'navigate' as const,
                        href: cbcBrowserHref,
                    },
                    {
                        label: 'Open CBC Progress',
                        type: 'navigate' as const,
                        href: cbcProgressHref,
                    },
                ]
                : []),
        ],
        nextSafeAction: effectiveSetupMode && cohortSetupReady
            ? {
                label: setupContinueLabel,
                type: 'navigate' as const,
                href: setupContinueHref,
            }
            : cohort && canLinkSubjects && !linkSubjectsDisabledReason
            ? {
                label: linkSubjectsLabel,
                type: 'page_action' as const,
                handler: () => setAssignSubjectsOpen(true),
            }
            : showSubjectTeachingActions && cohort && isCBC && hasCBCPlugin && workflowSubjectCount > 0
                ? {
                    label: 'Browse CBC',
                    type: 'navigate' as const,
                    href: cbcBrowserHref,
                }
                : {
                    label: showSubjectTeachingActions ? 'Open Sessions' : 'Review class subjects',
                    type: 'navigate' as const,
                    href: showSubjectTeachingActions ? sessionsHref : cohortReturnTo,
                },
        workflowStep: cohort && isCBC ? 'cohort_cbc_tools' : 'cohort_actions',
        emptyStateReason: !cohort && !cohortLoading
            ? 'This cohort could not be loaded.'
            : undefined,
    }), [
        activeRole,
        assignedInstructorCount,
        canLinkSubjects,
        cohort,
        cohortLoading,
        hasCBCPlugin,
        isCBC,
        learnerCount,
        linkSubjectsDisabledReason,
        linkSubjectsLabel,
        cbcBrowserHref,
        cbcProgressHref,
        backHref,
        cohortSetupReady,
        cohortReturnTo,
        backLabel,
        setupContinueHref,
        setupContinueLabel,
        effectiveSetupMode,
        sessionsHref,
        showSubjectTeachingActions,
        visibleCohortSubjects.length,
        workflowSubjectCount,
    ]);

    useEffect(() => {
        if (cohortSubjectsLoading || subjectParticipationQuery.loading) {
            return;
        }
        if (typeof window === 'undefined') {
            return;
        }

        const targetId = window.location.hash.slice(1);
        if (!/^subject-\d+$/.test(targetId)) {
            return;
        }

        window.requestAnimationFrame(() => {
            document.getElementById(targetId)?.scrollIntoView({
                block: 'center',
            });
        });
    }, [
        cohortSubjectsLoading,
        subjectParticipationQuery.loading,
        visibleCohortSubjects.length,
    ]);

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
    const cbcWorkflowDisabledReason = !hasCBCPlugin
        ? 'CBC tools are not available for this organization yet.'
        : workflowSubjectCount === 0
            ? 'No CBC subjects assigned to this cohort yet.'
            : undefined;
    const openAssignSubjects = () => setAssignSubjectsOpen(true);
    const handleCohortSubjectsChanged = async () => {
        await refetchCohort();
        await refetchCohortSubjects();
    };

    return (
        <div className="mx-auto max-w-6xl space-y-6">
            <div>
                <Link href={backHref}>
                    <Button variant="ghost" size="sm">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        {backLabel}
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
                    <MetadataItem label="Level" value={getAcademicLevelLabel(cohort.level, cohort.curriculum_type)} />
                    <MetadataItem label="Stream" value={cohort.stream || '—'} />
                    <MetadataItem label="Learners" value={learnerCountLabel} />
                </dl>
            </Card>

            {effectiveSetupMode ? (
                <CohortSetupModeCard
                    ready={cohortSetupReady}
                    isCbcSeniorCohort={isCbcSeniorCohort}
                    hasCbcProfile={hasCbcProfile}
                    isCbcLowerLevel={isCbcLowerLevel}
                    continueHref={setupContinueHref}
                    continueLabel={setupContinueLabel}
                    manageSubjectsLabel={setupCardSubjectsLabel}
                    onManageSubjects={openAssignSubjects}
                />
            ) : null}

            {isCbcSeniorCohort ? (
                <CbcSeniorSetupSection
                    ready={isCbcSetupReady}
                    hasCBCPlugin={hasCBCPlugin}
                    canConfigure={canLinkSubjects}
                    manageSubjectsLabel={classSubjectsLabel}
                    pathwayName={cohort.cbc_profile?.pathway_name}
                    trackName={cohort.cbc_profile?.track_name ?? undefined}
                    combinationCode={cohort.cbc_profile?.combination_code ?? undefined}
                    combinationName={cohort.cbc_profile?.combination_name ?? undefined}
                    subjectCount={subjectCount}
                    onManageSubjects={openAssignSubjects}
                />
            ) : (
                <StandardClassSetupSection
                    ready={isClassSetupReady}
                    isCbcLowerLevel={isCbcLowerLevel}
                    canConfigure={canLinkSubjects}
                    manageSubjectsLabel={linkSubjectsLabel}
                    subjectCount={subjectCount}
                    onManageSubjects={openAssignSubjects}
                />
            )}

            <section className="space-y-4">
                <div className="space-y-1">
                    <h2 className="text-xl font-semibold text-gray-900">Cohort Actions</h2>
                    <p className="text-sm text-gray-500">
                        {isCbcSeniorCohort
                            ? 'Use the class list and delivery tools after class subject setup.'
                            : 'Choose the workflow you want to open for this cohort.'}
                    </p>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                    {isCbcSeniorCohort ? (
                        <>
                            {canViewCohortLearners ? (
                                <ActionCard
                                    title="Class List"
                                    description="Open cohort learners to view enrolled learners and manage cohort placement. Subject participation stays scoped to each cohort subject."
                                    icon={Users}
                                    href={cohortLearnersHref}
                                    footerLabel="View class list"
                                />
                            ) : null}
                        </>
                    ) : (
                        <>
                            {canViewCohortLearners ? (
                                <ActionCard
                                    title="Class List"
                                    description="Open cohort learners to view enrolled learners and manage cohort placement. Subject participation stays scoped to each cohort subject."
                                    icon={Users}
                                    href={cohortLearnersHref}
                                    footerLabel="View class list"
                                />
                            ) : null}
                            {showSubjectTeachingActions ? (
                                <>
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
                                </>
                            ) : null}

                            {showSubjectTeachingActions && isCBC ? (
                                <>
                                    {isPersonalTeachingWorkspace && hasCBCPlugin ? (
                                        <>
                                            <ActionCard
                                                title="Configure class report policy"
                                                description="Class configuration for CBC report interpretation."
                                                icon={Settings2}
                                                href={classReportSetupHref}
                                                footerLabel="Open setup"
                                            />
                                            <ActionCard
                                                title="Compute class results"
                                                description="Run CBC report computation for this class scope."
                                                icon={LineChart}
                                                href={classReportComputationHref}
                                                footerLabel="Compute"
                                            />
                                        </>
                                    ) : null}
                                    <ActionCard
                                        title="CBC Subjects & Outcomes"
                                        description="Browse strands, sub-strands, and outcomes taught in this cohort."
                                        icon={BookOpen}
                                        href={hasCBCPlugin && workflowSubjectCount > 0 ? cbcBrowserHref : undefined}
                                        disabledReason={cbcWorkflowDisabledReason}
                                        footerLabel={workflowSubjectCount > 0 ? `${workflowSubjectCount} subject${workflowSubjectCount === 1 ? '' : 's'}` : undefined}
                                    />
                                    <ActionCard
                                        title="CBC Progress"
                                        description="Track CBC progress and coverage for this cohort."
                                        icon={LineChart}
                                        href={hasCBCPlugin && workflowSubjectCount > 0 ? cbcProgressHref : undefined}
                                        disabledReason={cbcWorkflowDisabledReason}
                                        footerLabel={workflowSubjectCount > 0 ? 'View progress' : undefined}
                                    />
                                </>
                            ) : showSubjectTeachingActions && isCambridge ? (
                                hasCambridgePlugin && cohortDetailCardExtensions.length > 0 ? (
                                    cohortDetailCardExtensions.map((extension) => (
                                        <extension.Component key={extension.key} cohortId={cohort.id} />
                                    ))
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
                            ) : showSubjectTeachingActions ? (
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
                            ) : null}
                        </>
                    )}
                </div>
            </section>

            <CohortSubjectParticipationSection
                cohortSubjects={visibleCohortSubjects}
                summaries={subjectParticipationQuery.summaries}
                loading={cohortSubjectsLoading || subjectParticipationQuery.loading}
                error={cohortSubjectsError ?? subjectParticipationQuery.error}
                emptyMessage={isTeachingActor
                    ? 'No class subjects are assigned to you yet.'
                    : subjectCount === 0
                        ? 'No class subjects have been added yet. Start with class subject setup.'
                        : undefined}
                canManageInstructors={canManageInstructors}
                canLinkSubjects={canLinkSubjects}
                linkSubjectsLabel={linkSubjectsLabel}
                linkSubjectsDisabledReason={linkSubjectsDisabledReason}
                onLinkSubjects={openAssignSubjects}
                buildInstructorHref={canManageInstructors
                    ? (subject) => buildInstructorManagementHref(cohort.id, cohort.name, subject)
                    : undefined}
                buildSubjectLearnersHref={buildSubjectLearnersHref}
                buildSubjectActions={showSubjectTeachingActions ? buildSubjectActions : undefined}
                showInstructorColumn={!isPersonalTeachingWorkspace}
            />

            {isCbcSeniorCohort && showSubjectTeachingActions ? (
                <section className="space-y-4">
                    <div className="space-y-1">
                        <h2 className="text-xl font-semibold text-gray-900">Delivery Workflows</h2>
                        <p className="text-sm text-gray-500">
                            Open teaching, assignments, and CBC tracking after class subject setup.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                        {isPersonalTeachingWorkspace && hasCBCPlugin ? (
                            <>
                                <ActionCard
                                    title="Configure class report policy"
                                    description="Class configuration for CBC report interpretation."
                                    icon={Settings2}
                                    href={classReportSetupHref}
                                    footerLabel="Open setup"
                                />
                                <ActionCard
                                    title="Compute class results"
                                    description="Run CBC report computation for this class scope."
                                    icon={LineChart}
                                    href={classReportComputationHref}
                                    footerLabel="Compute"
                                />
                            </>
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
                        <ActionCard
                            title="CBC Subjects & Outcomes"
                            description="Browse strands, sub-strands, and outcomes taught in this cohort."
                            icon={BookOpen}
                            href={hasCBCPlugin && workflowSubjectCount > 0 ? cbcBrowserHref : undefined}
                            disabledReason={cbcWorkflowDisabledReason}
                            footerLabel={workflowSubjectCount > 0 ? `${workflowSubjectCount} subject${workflowSubjectCount === 1 ? '' : 's'}` : undefined}
                        />
                        <ActionCard
                            title="CBC Progress"
                            description="Track CBC progress and coverage for this cohort."
                            icon={LineChart}
                            href={hasCBCPlugin && workflowSubjectCount > 0 ? cbcProgressHref : undefined}
                            disabledReason={cbcWorkflowDisabledReason}
                            footerLabel={workflowSubjectCount > 0 ? 'View progress' : undefined}
                        />
                    </div>
                </section>
            ) : null}

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
                    onSubjectsChanged={handleCohortSubjectsChanged}
                />
            ) : null}
        </div>
    );
}
