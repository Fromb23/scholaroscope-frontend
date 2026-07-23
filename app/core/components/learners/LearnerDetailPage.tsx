'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useParams, useRouter, useSearchParams, type ReadonlyURLSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
    ArrowLeft, Edit, Mail, Phone,
    ChevronDown, ChevronRight, ClipboardList, FileBarChart, FileText, GraduationCap,
    Archive, ArrowRightLeft, Trash2, UserPlus, UserMinus, Users, BookOpen,
} from 'lucide-react';
import { useStudent } from '@/app/core/hooks/useStudents';
import { useCohorts } from '@/app/core/hooks/useCohorts';
import { useCohortSubjectsByCohort } from '@/app/core/hooks/useCohortSubjects';
import { useStudentAttendanceHistory } from '@/app/core/hooks/useSessions';
import { useLearnerAvailableReportScopes } from '@/app/core/hooks/useReporting';
import { useOpenAssessmentsForStudent } from '@/app/core/hooks/useAssessments';
import { useAuth } from '@/app/context/AuthContext';
import { hasCapability, isAdminOrAbove } from '@/app/utils/permissions';
import {
    buildLearnerOverviewReportHref,
    buildLearnerSubjectReportHref,
} from '@/app/core/lib/learnerReportingRoutes';
import { Card } from '@/app/components/ui/Card';
import { ActionMenu } from '@/app/components/ui/ActionMenu';
import { Button } from '@/app/components/ui/Button';
import { Badge } from '@/app/components/ui/Badge';
import { DataTable, Column } from '@/app/components/ui/Table';
import { ErrorBanner } from '@/app/components/ui/ErrorBanner';
import { LoadingSpinner } from '@/app/components/ui/LoadingSpinner';
import {
    StatusModal, EnrollModal, TransferLearnerModal, UnenrollModal, DeleteStudentModal,
} from '@/app/core/components/learners/LearnerModals';
import { LearnerAssessmentPickerModal } from '@/app/core/components/learners/LearnerAssessmentPickerModal';
import { LearnerIdentityHeader } from '@/app/core/components/learners/LearnerIdentityHeader';
import type { StudentCohortEnrollment } from '@/app/core/types/student';
import { isManagementStudentDetail } from '@/app/core/types/student';
import { isSelfManagedTeachingWorkspace } from '@/app/core/lib/workspaces';
import {
    buildLearnerPortfolioHref,
    getLearnerProfileBackTarget,
} from '@/app/core/components/learners/learnerProfileNavigation';
import { getLearnerProfileExtensions } from '@/app/core/registry/learnerSlot';
import { ContextualApprovalRequestButton } from '@/app/core/components/approvals/ApprovalIntentComponents';
import { buildContextualRequestKey } from '@/app/core/lib/approvalIntents';

const STATUS_VARIANTS: Record<string, 'success' | 'warning' | 'danger' | 'info'> = {
    ACTIVE: 'success', GRADUATED: 'info', TRANSFERRED: 'warning',
    SUSPENDED: 'danger', WITHDRAWN: 'danger', ARCHIVED: 'warning',
};

const ENROLLMENT_TYPE_VARIANTS: Record<string, 'default' | 'info' | 'warning' | 'success'> = {
    PRIMARY: 'default', ELECTIVE: 'info', REMEDIAL: 'warning',
    ADVANCED: 'success', TRANSFER: 'info',
};

const END_REASON_VARIANTS: Record<string, 'success' | 'info' | 'warning' | 'danger' | 'default'> = {
    COMPLETED: 'success', GRADUATED: 'success', TRANSFERRED: 'info',
    WRONG_ASSIGNMENT: 'warning', WITHDRAWN: 'danger', PROMOTED: 'success',
};

const END_REASON_LABELS: Record<string, string> = {
    COMPLETED: 'Completed', GRADUATED: 'Graduated', TRANSFERRED: 'Transferred',
    WRONG_ASSIGNMENT: 'Wrong Assignment', WITHDRAWN: 'Withdrawn', PROMOTED: 'Promoted',
};

function calculateAge(dob?: string): string {
    if (!dob) return 'N/A';
    const today = new Date();
    const birth = new Date(dob);
    let age = today.getFullYear() - birth.getFullYear();
    if (today.getMonth() < birth.getMonth() ||
        (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate())) age--;
    return `${age} years`;
}

type LearnerSectionKey =
    | 'reports'
    | 'enrollments'
    | 'contact'
    | 'subjectParticipation'
    | 'attendance'
    | 'assessment'
    | 'cbc'
    | 'history';

const DEFAULT_SECTION_STATE: Record<LearnerSectionKey, boolean> = {
    reports: false,
    enrollments: false,
    contact: false,
    subjectParticipation: false,
    attendance: false,
    assessment: false,
    cbc: false,
    history: false,
};

function parseLearnerSection(value: string | null): LearnerSectionKey | null {
    if (!value) {
        return null;
    }

    const normalized = value as LearnerSectionKey;
    return normalized in DEFAULT_SECTION_STATE ? normalized : null;
}

function buildLearnerDetailHref(
    learnerId: number,
    searchParams: ReadonlyURLSearchParams,
    section?: LearnerSectionKey,
): string {
    const nextSearchParams = new URLSearchParams(searchParams.toString());

    if (section) {
        nextSearchParams.set('section', section);
    } else {
        nextSearchParams.delete('section');
    }

    const nextQuery = nextSearchParams.toString();

    return nextQuery
        ? `/learners/${learnerId}?${nextQuery}`
        : `/learners/${learnerId}`;
}

function LearnerSectionCard({
    sectionId,
    title,
    summary,
    open,
    badge,
    onToggle,
    children,
}: {
    sectionId: string;
    title: string;
    summary: string;
    open: boolean;
    badge?: ReactNode;
    onToggle: () => void;
    children: ReactNode;
}) {
    return (
        <div id={sectionId} className="scroll-mt-24">
            <Card className="overflow-hidden p-0">
                <button
                    type="button"
                    onClick={onToggle}
                    className="theme-focus-ring flex w-full items-start gap-3 px-5 py-4 text-left transition-colors theme-hover-surface"
                >
                    <div className="theme-surface-elevated mt-0.5 shrink-0 rounded-lg border p-1.5 theme-border">
                        {open ? (
                            <ChevronDown className="h-4 w-4 text-blue-600" />
                        ) : (
                            <ChevronRight className="h-4 w-4 theme-subtle" />
                        )}
                    </div>
                    <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                            <h2 className="text-base font-semibold theme-text sm:text-lg">{title}</h2>
                            {badge}
                        </div>
                        <p className="mt-1 text-sm theme-muted">{summary}</p>
                    </div>
                </button>
                {open ? (
                    <div className="border-t px-5 py-5 theme-border">
                        {children}
                    </div>
                ) : null}
            </Card>
        </div>
    );
}

export default function LearnerDetailPage() {
    const params = useParams();
    const router = useRouter();
    const searchParams = useSearchParams();
    const { user, activeOrg, activeRole, capabilities } = useAuth();
    const studentId = Number(params.id);
    const selfManagedTeachingWorkspace = isSelfManagedTeachingWorkspace({
        orgType: activeOrg?.org_type ?? null,
        capabilities,
    });
    const backTarget = useMemo(
        () => getLearnerProfileBackTarget({
            returnTo: searchParams.get('returnTo'),
            back: searchParams.get('back'),
            isSelfManagedTeachingWorkspace: selfManagedTeachingWorkspace,
        }),
        [searchParams, selfManagedTeachingWorkspace],
    );
    const backHref = backTarget.href;

    const {
        student, loading, error,
        actionLoading, actionError, setActionError,
        updateStatus, reenroll, transfer, unenroll, deleteStudent,
        checkDeleteEligibility, withdraw, graduate, archiveStudent,
    } = useStudent(studentId);

    const [statusOpen, setStatusOpen] = useState(false);
    const [enrollOpen, setEnrollOpen] = useState(false);
    const [transferOpen, setTransferOpen] = useState(false);
    const [unenrollTarget, setUnenrollTarget] = useState<StudentCohortEnrollment | null>(null);
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [assessmentPickerOpen, setAssessmentPickerOpen] = useState(false);
    const [sectionState, setSectionState] = useState<Record<LearnerSectionKey, boolean>>(DEFAULT_SECTION_STATE);
    const sectionStorageKey = useMemo(
        () => `learner-profile-sections:${studentId}`,
        [studentId],
    );
    const scrollStorageKey = useMemo(
        () => `learner-profile-scroll:${studentId}`,
        [studentId],
    );
    const scrollRestoredRef = useRef(false);

    const managementStudent = isManagementStudentDetail(student) ? student : null;
    const canEdit = !!user && Boolean(managementStudent) && hasCapability(activeRole, 'EDIT_LEARNER', capabilities);
    const canManage = !!user && Boolean(managementStudent) && hasCapability(activeRole, 'MANAGE_ENROLLMENT', capabilities);
    const canManageSubjectParticipation = Boolean(managementStudent) && (capabilities.can_manage_learners ?? isAdminOrAbove(user, activeRole));
    const canUseDangerZone = canManageSubjectParticipation;
    const canGenerateOverviewReport = !!user && capabilities.can_view_reports;
    const canGenerateSubjectReport = !!user && capabilities.can_view_reports;
    const canViewPortfolio = canGenerateOverviewReport || canGenerateSubjectReport;
    const canRecordAssessment = capabilities.can_manage_assessments;
    const { data: attendanceData } = useStudentAttendanceHistory(
        sectionState.attendance ? studentId : null,
    );
    const { cohorts } = useCohorts(undefined, { enabled: canManage && enrollOpen });
    const {
        scopes: reportScopes,
        loading: reportScopesLoading,
        error: reportScopesError,
    } = useLearnerAvailableReportScopes(studentId, { enabled: canGenerateSubjectReport && sectionState.reports });
    const {
        assessments: openAssessments,
        loading: openAssessmentsLoading,
        error: openAssessmentsError,
    } = useOpenAssessmentsForStudent(studentId, { enabled: canRecordAssessment && sectionState.assessment });

    const availableCohorts = useMemo(() => {
        if (!cohorts || !managementStudent) return [];
        const enrolled = managementStudent.enrollments.filter(e => e.is_active).map(e => e.cohort);
        return cohorts.filter((c: { id: number }) => !enrolled.includes(c.id));
    }, [cohorts, managementStudent]);

    const activeEnrollments = useMemo(
        () => managementStudent?.enrollments.filter(e => e.is_active) ?? [],
        [managementStudent]
    );
    const historyEnrollments = useMemo(
        () => managementStudent?.enrollments.filter(e => !e.is_active) ?? [],
        [managementStudent]
    );
    const currentEnrollment = useMemo(
        () => (
            activeEnrollments.find((enrollment) => enrollment.cohort === managementStudent?.primary_cohort)
            ?? activeEnrollments[0]
            ?? null
        ),
        [activeEnrollments, managementStudent?.primary_cohort]
    );
    const currentCohortId = currentEnrollment?.cohort ?? null;
    const currentCohortName = currentEnrollment?.cohort_name ?? null;
    const hasActivePrimaryCohort = activeEnrollments.some(enrollment => (
        enrollment.is_active
        && enrollment.enrollment_type === 'PRIMARY'
        && enrollment.cohort === managementStudent?.primary_cohort
    ));
    const activeSubjectNames = useMemo(
        () => (student?.current_subjects ?? []).map(subject => `${subject.code} ${subject.name}`),
        [student?.current_subjects]
    );
    const { subjects: cohortSubjects, loading: cohortSubjectsLoading } = useCohortSubjectsByCohort(
        canManageSubjectParticipation && sectionState.subjectParticipation ? currentCohortId : null
    );
    const currentSubjectIds = useMemo(
        () => new Set((student?.current_subjects ?? []).map(subject => subject.id)),
        [student]
    );
    const reportableSubjectScopes = useMemo(
        () => reportScopes?.subject_scopes ?? [],
        [reportScopes?.subject_scopes]
    );
    const reportableSubjectScopeIds = useMemo(
        () => new Set(reportableSubjectScopes.map((scope) => scope.cohort_subject_id)),
        [reportableSubjectScopes]
    );
    const onlyReportSubject = reportableSubjectScopes.length === 1
        ? reportableSubjectScopes[0]
        : null;
    const defaultSubjectReportHref = buildLearnerSubjectReportHref(
        studentId,
        onlyReportSubject?.cohort_subject_id ?? null,
        {
            returnTo: buildLearnerDetailHref(studentId, searchParams, 'reports'),
        },
    );
    const overviewReportHref = useMemo(
        () => buildLearnerOverviewReportHref(studentId, {
            returnTo: buildLearnerDetailHref(studentId, searchParams, 'reports'),
        }),
        [searchParams, studentId],
    );
    const portfolioHref = useMemo(
        () => buildLearnerPortfolioHref(studentId, {
            returnTo: buildLearnerDetailHref(studentId, searchParams, 'reports'),
        }),
        [searchParams, studentId],
    );
    const reportReturnTo = useMemo(
        () => buildLearnerDetailHref(studentId, searchParams, 'reports'),
        [searchParams, studentId],
    );
    const requestedSection = parseLearnerSection(searchParams.get('section'));
    const learnerReturnTo = useMemo(
        () => buildLearnerDetailHref(studentId, searchParams),
        [searchParams, studentId],
    );
    const learnerApprovalReference = useMemo(() => ({
        student_id: studentId,
        learner_id: studentId,
        learner_name: student?.full_name ?? '',
        current_cohort_id: currentCohortId,
        current_cohort_name: currentCohortName,
    }), [currentCohortId, currentCohortName, student?.full_name, studentId]);


    const curriculaTypes = activeEnrollments.map(
        e => e.curriculum_type ?? ''
    ).filter(Boolean);

    const slotExtensions = getLearnerProfileExtensions({
        studentId,
        curricula: curriculaTypes,
    });
    const hasCbcExtensions = slotExtensions.length > 0;
    const hasAttendanceSummary = Boolean(attendanceData?.statistics);
    const hasAssessmentSummary = Boolean(student?.grade_summary && student.grade_summary.total_assessments > 0);
    const hasHistory = historyEnrollments.length > 0;
    const hasReportActions = canGenerateSubjectReport && reportableSubjectScopes.length > 0;
    const showMobileReportBar = hasReportActions;

    const primaryHeaderAction = useMemo(() => {
        if (hasReportActions) {
            return {
                label: 'Open Report',
                href: defaultSubjectReportHref,
                mobileClassName: 'hidden md:inline-flex',
            };
        }

        if (canEdit) {
            return {
                label: 'Edit',
                href: `/learners/${studentId}/edit`,
                mobileClassName: '',
            };
        }

        return null;
    }, [canEdit, defaultSubjectReportHref, hasReportActions, studentId]);

    const openAssessmentCount = openAssessments.length;
    const hasOpenAssessments = openAssessmentCount > 0;
    const recordAssessmentSummary = !canRecordAssessment
        ? null
        : openAssessmentsLoading
            ? 'Loading open assessments for this learner.'
            : openAssessmentsError
                ? openAssessmentsError
                : hasOpenAssessments
                    ? openAssessmentCount === 1
                        ? 'Open the current scorable assessment for this learner.'
                        : `Choose from ${openAssessmentCount} open assessments for this learner.`
                    : 'No open assessments are available for this learner.';

    const toggleSection = useCallback((section: LearnerSectionKey) => {
        setSectionState((current) => ({
            ...current,
            [section]: !current[section],
        }));
    }, []);

    const navigateToAssessmentScoreEntry = useCallback((assessmentId: number) => {
        router.push(`/assessments/${assessmentId}?student=${studentId}&focus=score-entry`);
    }, [router, studentId]);

    const handleRecordAssessment = useCallback(() => {
        if (openAssessmentsLoading || !hasOpenAssessments) {
            return;
        }

        if (openAssessmentCount === 1) {
            navigateToAssessmentScoreEntry(openAssessments[0].id);
            return;
        }

        setAssessmentPickerOpen(true);
    }, [
        hasOpenAssessments,
        navigateToAssessmentScoreEntry,
        openAssessmentCount,
        openAssessments,
        openAssessmentsLoading,
    ]);

    useEffect(() => {
        const stored = window.sessionStorage.getItem(sectionStorageKey);
        if (!stored) {
            setSectionState(DEFAULT_SECTION_STATE);
            return;
        }

        try {
            const parsed = JSON.parse(stored) as Partial<Record<LearnerSectionKey, boolean>>;
            setSectionState({
                ...DEFAULT_SECTION_STATE,
                ...parsed,
            });
        } catch {
            window.sessionStorage.removeItem(sectionStorageKey);
            setSectionState(DEFAULT_SECTION_STATE);
        }
    }, [sectionStorageKey]);

    useEffect(() => {
        window.sessionStorage.setItem(sectionStorageKey, JSON.stringify(sectionState));
    }, [sectionState, sectionStorageKey]);

    useEffect(() => {
        const scrollRoot = document.getElementById('dashboard-scroll-root');
        if (!scrollRoot) {
            return;
        }

        const handleScroll = () => {
            window.sessionStorage.setItem(scrollStorageKey, String(scrollRoot.scrollTop));
        };

        handleScroll();
        scrollRoot.addEventListener('scroll', handleScroll, { passive: true });

        return () => {
            handleScroll();
            scrollRoot.removeEventListener('scroll', handleScroll);
        };
    }, [scrollStorageKey]);

    useEffect(() => {
        scrollRestoredRef.current = false;
    }, [scrollStorageKey]);

    useEffect(() => {
        if (requestedSection) {
            return;
        }

        if (scrollRestoredRef.current) {
            return;
        }

        const scrollRoot = document.getElementById('dashboard-scroll-root');
        const storedScrollTop = Number(window.sessionStorage.getItem(scrollStorageKey) ?? '');

        if (!scrollRoot || !Number.isFinite(storedScrollTop)) {
            scrollRestoredRef.current = true;
            return;
        }

        scrollRestoredRef.current = true;
        window.requestAnimationFrame(() => {
            scrollRoot.scrollTop = storedScrollTop;
        });
    }, [requestedSection, scrollStorageKey, studentId]);

    useEffect(() => {
        if (!requestedSection) {
            return;
        }

        setSectionState((current) => ({
            ...current,
            [requestedSection]: true,
        }));

        const timer = window.setTimeout(() => {
            document.getElementById(`learner-section-${requestedSection}`)?.scrollIntoView({
                behavior: 'smooth',
                block: 'start',
            });
        }, 100);

        return () => window.clearTimeout(timer);
    }, [requestedSection]);

    useEffect(() => {
        if (!showMobileReportBar) {
            document.documentElement.style.removeProperty('--assistant-widget-offset');
            return;
        }

        document.documentElement.style.setProperty('--assistant-widget-offset', '6rem');

        return () => {
            document.documentElement.style.removeProperty('--assistant-widget-offset');
        };
    }, [showMobileReportBar]);

    const handleDelete = async () => {
        await deleteStudent();
        router.push(backHref);
    };

    const activeColumns: Column<StudentCohortEnrollment>[] = [
        {
            key: 'cohort_name', header: 'Cohort', sortable: true,
            render: row => (
                <div className="flex items-center gap-2">
                    <span className="font-medium">{row.cohort_name}</span>
                    {row.cohort === managementStudent?.primary_cohort && (
                        <Badge variant="default" size="sm">Primary</Badge>
                    )}
                </div>
            ),
        },
        { key: 'cohort_level', header: 'Level', sortable: true },
        { key: 'curriculum_name', header: 'Curriculum', sortable: true },
        {
            key: 'enrollment_type', header: 'Type', sortable: true,
            render: row => (
                <Badge variant={ENROLLMENT_TYPE_VARIANTS[row.enrollment_type] ?? 'default'}>
                    {row.enrollment_type}
                </Badge>
            ),
        },
        {
            key: 'enrolled_date', header: 'Enrolled', sortable: true,
            render: row => new Date(row.enrolled_date).toLocaleDateString(),
        },
        ...(canManage ? [{
            key: 'actions' as keyof StudentCohortEnrollment,
            header: 'Actions',
            render: (row: StudentCohortEnrollment) => (
                <Button size="sm" variant="ghost" onClick={() => setUnenrollTarget(row)}>
                    <UserMinus className="h-4 w-4 text-red-600" />
                </Button>
            ),
        }] : []),
    ];

    const historyColumns: Column<StudentCohortEnrollment>[] = [
        { key: 'cohort_name', header: 'Cohort', sortable: true },
        { key: 'enrollment_type_display', header: 'Type', sortable: true },
        {
            key: 'enrolled_date', header: 'Enrolled', sortable: true,
            render: row => new Date(row.enrolled_date).toLocaleDateString(),
        },
        {
            key: 'completion_date', header: 'Ended', sortable: true,
            render: row => row.completion_date
                ? new Date(row.completion_date).toLocaleDateString() : '-',
        },
        {
            key: 'end_reason', header: 'Reason', sortable: true,
            render: row => row.end_reason ? (
                <Badge variant={END_REASON_VARIANTS[row.end_reason] ?? 'default'}>
                    {END_REASON_LABELS[row.end_reason] ?? row.end_reason}
                </Badge>
            ) : <Badge variant="default">Inactive</Badge>,
        },
    ];
    const currentActionTitle = hasReportActions
        ? 'Current action: open learner reporting'
        : canEdit
            ? 'Current action: update the learner profile'
            : 'Current action: review learner status';
    const currentActionDescription = hasReportActions
        ? 'Open the learner report to review current subject performance and reporting access for this learner.'
        : canEdit
            ? 'Update learner details, enrollment status, or cohort placement from one place.'
            : 'Review the learner summary, current cohort placement, and participation details.';
    const reportsSummary = reportScopesLoading
        ? 'Loading report scopes'
        : hasReportActions
            ? `${reportableSubjectScopes.length} subject report scope${reportableSubjectScopes.length === 1 ? '' : 's'} available`
            : canGenerateSubjectReport
                ? 'No learner report scopes are available'
                : 'Reporting is not available for this role';
    const enrollmentsSummary = activeEnrollments.length > 0
        ? `${activeEnrollments.length} active cohort enrollment${activeEnrollments.length === 1 ? '' : 's'}`
        : 'No active cohort enrollments';
    const contactSummary = managementStudent?.primary_cohort_name
        ? `${managementStudent.primary_cohort_name} · ${managementStudent.primary_curriculum ?? 'Curriculum not set'}`
        : 'No primary cohort assigned';
    const subjectParticipationSummary = currentCohortName
        ? `${currentSubjectIds.size} enrolled cohort subject${currentSubjectIds.size === 1 ? '' : 's'} in ${currentCohortName}`
        : 'Assign this learner to a cohort before managing subject participation.';
    const attendanceSummary = attendanceData?.statistics
        ? `${attendanceData.statistics.attendance_percentage.toFixed(1)}% attendance rate`
        : 'No attendance summary recorded';
    const assessmentSummary = student?.grade_summary
        ? `${student.grade_summary.total_assessments} assessment${student.grade_summary.total_assessments === 1 ? '' : 's'} recorded`
        : 'No assessment summary recorded';
    const cbcSummary = hasCbcExtensions
        ? `${slotExtensions.length} learner insight section${slotExtensions.length === 1 ? '' : 's'}`
        : 'No curriculum insight extensions';
    const historySummary = hasHistory
        ? `${historyEnrollments.length} historical enrollment${historyEnrollments.length === 1 ? '' : 's'}`
        : 'No enrollment history';
    const cohortLifecycleItems = canManage
        ? [
            ...(hasActivePrimaryCohort ? [
                {
                    label: 'Transfer Learner',
                    onSelect: () => setTransferOpen(true),
                    icon: <ArrowRightLeft className="h-4 w-4" />,
                },
                {
                    label: 'Unenroll Learner',
                    onSelect: () => currentEnrollment ? setUnenrollTarget(currentEnrollment) : undefined,
                    disabled: !currentEnrollment,
                    icon: <UserMinus className="h-4 w-4" />,
                },
            ] : [
                {
                    label: 'Re-enroll Learner',
                    onSelect: () => setEnrollOpen(true),
                    icon: <UserPlus className="h-4 w-4" />,
                },
            ]),
            {
                label: 'Update Status',
                onSelect: () => setStatusOpen(true),
                icon: <Users className="h-4 w-4" />,
            },
        ]
        : [];
    const headerMenuItems = [
        ...cohortLifecycleItems,
        ...(canEdit && !hasReportActions ? [] : canEdit ? [{
            label: 'Edit',
            href: `/learners/${studentId}/edit`,
            icon: <Edit className="h-4 w-4" />,
        }] : []),
    ];
    const mobileMoreMenuItems = [
        ...(canViewPortfolio ? [{
            label: 'Open Portfolio',
            href: portfolioHref,
            icon: <BookOpen className="h-4 w-4" />,
        }] : []),
        ...(canGenerateOverviewReport && reportScopes?.can_view_overview ? [{
            label: 'Open Overall Report',
            href: overviewReportHref,
            icon: <FileText className="h-4 w-4" />,
        }] : []),
        ...(canRecordAssessment && hasOpenAssessments && !openAssessmentsLoading && !openAssessmentsError ? [{
            label: 'Record Assessment',
            onSelect: handleRecordAssessment,
            icon: <ClipboardList className="h-4 w-4" />,
        }] : []),
        ...(canEdit ? [{
            label: 'Edit Learner',
            href: `/learners/${studentId}/edit`,
            icon: <Edit className="h-4 w-4" />,
        }] : []),
        ...cohortLifecycleItems,
    ];

    if (loading) return <LoadingSpinner message="Loading student..." />;
    if (error || !student) return (
        <div className="flex items-center justify-center h-64 flex-col gap-3">
            <p className="text-sm text-gray-500">{error ?? 'Student not found'}</p>
            <Link href={backHref}>
                <Button variant="secondary">{backTarget.label}</Button>
            </Link>
        </div>
    );

    return (
        <div className={`space-y-6 ${showMobileReportBar ? 'pb-28 md:pb-0' : ''}`}>
            <div className="flex items-start justify-between gap-3">
                <Link href={backHref}>
                    <Button variant="ghost" size="sm">
                        <ArrowLeft className="mr-2 h-4 w-4" />{backTarget.label}
                    </Button>
                </Link>
                <div className="flex shrink-0 items-center gap-2">
                    {primaryHeaderAction ? (
                        <Link href={primaryHeaderAction.href} className={primaryHeaderAction.mobileClassName}>
                            <Button>
                                {hasReportActions ? (
                                    <FileBarChart className="mr-2 h-4 w-4" />
                                ) : (
                                    <Edit className="mr-2 h-4 w-4" />
                                )}
                                {primaryHeaderAction.label}
                            </Button>
                        </Link>
                    ) : null}
                    {canRecordAssessment ? (
                        <Button
                            variant="secondary"
                            onClick={handleRecordAssessment}
                            disabled={openAssessmentsLoading || !hasOpenAssessments || Boolean(openAssessmentsError)}
                        >
                            <ClipboardList className="h-4 w-4" />
                            {openAssessmentsLoading ? 'Loading…' : 'Record Assessment'}
                        </Button>
                    ) : null}
                    <ActionMenu hideLabelOnMobile items={headerMenuItems} />
                </div>
            </div>

            {actionError && (
                <ErrorBanner message={actionError} onDismiss={() => setActionError(null)} />
            )}

            <Card>
                <div className="space-y-4 p-1">
                    <LearnerIdentityHeader
                        name={student.full_name}
                        admissionNumber={student.admission_number}
                        cohortName={currentCohortName}
                        workspaceName={activeOrg?.name ?? null}
                        badge={(
                            <>
                                <Badge variant={STATUS_VARIANTS[student.status] ?? 'default'}>
                                    {student.status}
                                </Badge>
                                {managementStudent?.gender ? (
                                    <Badge variant={managementStudent.gender.toUpperCase().startsWith('F') ? 'warning' : 'info'}>
                                        {managementStudent.gender}
                                    </Badge>
                                ) : null}
                                {managementStudent && managementStudent.cohort_count > 1 ? (
                                    <Badge variant="info">{managementStudent.cohort_count} Cohorts</Badge>
                                ) : null}
                            </>
                        )}
                    />
                    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                        {[
                            { label: 'Admission Number', value: student.admission_number },
                            ...(managementStudent ? [
                                { label: 'Date of Birth', value: managementStudent.date_of_birth ? new Date(managementStudent.date_of_birth).toLocaleDateString() : 'N/A' },
                                { label: 'Enrollment Date', value: new Date(managementStudent.enrollment_date).toLocaleDateString() },
                                { label: 'Age', value: calculateAge(managementStudent.date_of_birth) },
                            ] : [
                                { label: 'Authorized subjects', value: String(student.current_subjects.length) },
                            ]),
                        ].map(item => (
                            <div key={item.label}>
                                <p className="text-sm text-gray-600">{item.label}</p>
                                <p className="font-semibold text-gray-900">{item.value}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </Card>

            <Card>
                <div className="space-y-2">
                    <h2 className="text-lg font-semibold text-gray-900">{currentActionTitle}</h2>
                    <p className="text-sm text-gray-600">{currentActionDescription}</p>
                    {canRecordAssessment && recordAssessmentSummary ? (
                        <div className="border-t border-gray-200 pt-4">
                            <div className="flex items-start gap-3">
                                <div className="rounded-lg border border-blue-100 bg-blue-50 p-2 text-blue-600">
                                    <ClipboardList className="h-4 w-4" />
                                </div>
                                <div className="space-y-1">
                                    <p className="text-sm font-medium text-gray-900">Assessment scoring</p>
                                    <p className={`text-sm ${openAssessmentsError ? 'text-red-600' : 'text-gray-600'}`}>
                                        {recordAssessmentSummary}
                                    </p>
                                </div>
                            </div>
                        </div>
                    ) : null}
                </div>
            </Card>

            {!canManage ? (
                <Card>
                    <div className="space-y-3">
                        <h2 className="text-lg font-semibold text-gray-900">Requests</h2>
                        <div className="flex flex-wrap gap-2">
                            <ContextualApprovalRequestButton
                                intent={{
                                    actionKey: 'STUDENT_STATUS_UPDATE',
                                    title: `Request learner transfer for ${student.full_name}`,
                                    targetType: 'learner',
                                    targetId: studentId,
                                    returnTo: learnerReturnTo,
                                    requestKey: buildContextualRequestKey(['learner', studentId, 'transfer']),
                                    referenceData: {
                                        ...learnerApprovalReference,
                                        contextual_action: 'transfer',
                                        status: 'TRANSFERRED',
                                    },
                                }}
                            >
                                <ArrowRightLeft className="h-4 w-4" />
                                Ask admin to transfer
                            </ContextualApprovalRequestButton>
                            <ContextualApprovalRequestButton
                                intent={{
                                    actionKey: 'STUDENT_STATUS_UPDATE',
                                    title: `Request learner withdrawal for ${student.full_name}`,
                                    targetType: 'learner',
                                    targetId: studentId,
                                    returnTo: learnerReturnTo,
                                    requestKey: buildContextualRequestKey(['learner', studentId, 'withdraw']),
                                    referenceData: {
                                        ...learnerApprovalReference,
                                        contextual_action: 'withdraw',
                                        status: 'WITHDRAWN',
                                    },
                                }}
                            >
                                <UserMinus className="h-4 w-4" />
                                Ask admin to withdraw
                            </ContextualApprovalRequestButton>
                            <ContextualApprovalRequestButton
                                intent={{
                                    actionKey: 'STUDENT_STATUS_UPDATE',
                                    title: `Request learner archive for ${student.full_name}`,
                                    targetType: 'learner',
                                    targetId: studentId,
                                    returnTo: learnerReturnTo,
                                    requestKey: buildContextualRequestKey(['learner', studentId, 'archive']),
                                    referenceData: {
                                        ...learnerApprovalReference,
                                        contextual_action: 'archive',
                                        status: 'ARCHIVED',
                                    },
                                }}
                            >
                                <Archive className="h-4 w-4" />
                                Ask admin to archive
                            </ContextualApprovalRequestButton>
                            <ContextualApprovalRequestButton
                                intent={{
                                    actionKey: 'STUDENT_STATUS_UPDATE',
                                    title: `Request learner status update for ${student.full_name}`,
                                    targetType: 'learner',
                                    targetId: studentId,
                                    returnTo: learnerReturnTo,
                                    requestKey: buildContextualRequestKey(['learner', studentId, 'status-update']),
                                    referenceData: {
                                        ...learnerApprovalReference,
                                        contextual_action: 'status_update',
                                    },
                                }}
                            >
                                <Users className="h-4 w-4" />
                                Ask admin to update status
                            </ContextualApprovalRequestButton>
                        </div>
                    </div>
                </Card>
            ) : null}

            {canGenerateSubjectReport ? (
                <LearnerSectionCard
                    sectionId="learner-section-reports"
                    title="Reports"
                    summary={reportsSummary}
                    open={sectionState.reports}
                    onToggle={() => toggleSection('reports')}
                >
                    <div className="space-y-4">
                        {reportScopesLoading ? (
                            <div className="rounded-lg border theme-border theme-surface-muted px-4 py-3 text-sm theme-muted">
                                Loading report scopes...
                            </div>
                        ) : reportScopesError ? (
                            <ErrorBanner message={reportScopesError} onDismiss={() => undefined} />
                        ) : reportableSubjectScopes.length === 0 ? (
                            <div className="rounded-lg border theme-border theme-surface-muted px-4 py-3 text-sm theme-muted">
                                No learner report scopes are available for your current reporting permissions.
                            </div>
                        ) : (
                            <>
                                <div className="flex flex-wrap gap-2">
                                    {reportableSubjectScopes.map((scope) => (
                                        <Badge key={scope.cohort_subject_id} variant="info">
                                            {scope.subject_code} · {scope.subject_name}
                                        </Badge>
                                    ))}
                                </div>
                                {canViewPortfolio || (canGenerateOverviewReport && reportScopes?.can_view_overview) ? (
                                    <div className="flex flex-wrap gap-2">
                                        {canViewPortfolio ? (
                                            <Link href={portfolioHref}>
                                                <Button variant="secondary">
                                                    <BookOpen className="mr-2 h-4 w-4" />
                                                    Open Portfolio
                                                </Button>
                                            </Link>
                                        ) : null}
                                        {canGenerateOverviewReport && reportScopes?.can_view_overview ? (
                                            <Link href={overviewReportHref}>
                                                <Button variant="secondary">
                                                    <FileText className="mr-2 h-4 w-4" />
                                                    Open Overall Report
                                                </Button>
                                            </Link>
                                        ) : null}
                                    </div>
                                ) : null}
                            </>
                        )}
                    </div>
                </LearnerSectionCard>
            ) : null}

            {managementStudent ? (
            <LearnerSectionCard
                sectionId="learner-section-enrollments"
                title="Enrollments"
                summary={enrollmentsSummary}
                open={sectionState.enrollments}
                onToggle={() => toggleSection('enrollments')}
            >
                <div className="space-y-4">
                    {canManage ? (
                        <div className="flex justify-end">
                            {hasActivePrimaryCohort ? (
                                <Button size="sm" onClick={() => setTransferOpen(true)}>
                                    <ArrowRightLeft className="mr-2 h-4 w-4" />Transfer Learner
                                </Button>
                            ) : (
                                <Button size="sm" onClick={() => setEnrollOpen(true)}>
                                    <UserPlus className="mr-2 h-4 w-4" />Re-enroll Learner
                                </Button>
                            )}
                        </div>
                    ) : null}
                    {activeEnrollments.length === 0 ? (
                        <p className="py-4 text-center text-sm text-gray-500">No active cohort enrollments</p>
                    ) : (
                        <>
                            <div className="space-y-3 md:hidden">
                                {activeEnrollments.map((row) => (
                                    <div key={`${row.cohort}-${row.enrolled_date}`} className="rounded-xl border border-gray-200 p-4">
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="space-y-2">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <p className="font-semibold text-gray-900">{row.cohort_name}</p>
                                                    {row.cohort === managementStudent.primary_cohort ? (
                                                        <Badge variant="default" size="sm">Primary</Badge>
                                                    ) : null}
                                                    <Badge variant={ENROLLMENT_TYPE_VARIANTS[row.enrollment_type] ?? 'default'}>
                                                        {row.enrollment_type}
                                                    </Badge>
                                                </div>
                                                <p className="text-sm text-gray-500">
                                                    {row.curriculum_name} · {row.cohort_level}
                                                </p>
                                                <p className="text-xs text-gray-500">
                                                    Enrolled {new Date(row.enrolled_date).toLocaleDateString()}
                                                </p>
                                            </div>
                                            {canManage ? (
                                                <Button size="sm" variant="ghost" onClick={() => setUnenrollTarget(row)}>
                                                    <UserMinus className="h-4 w-4 text-red-600" />
                                                </Button>
                                            ) : null}
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="hidden md:block">
                                <DataTable
                                    data={activeEnrollments as unknown as Record<string, unknown>[]}
                                    columns={activeColumns as unknown as Column<Record<string, unknown>>[]}
                                    enableSearch
                                    searchPlaceholder="Search enrollments..."
                                    emptyMessage="No active enrollments"
                                />
                            </div>
                        </>
                    )}
                </div>
            </LearnerSectionCard>
            ) : null}

            {managementStudent ? (
            <LearnerSectionCard
                sectionId="learner-section-contact"
                title="Contact & Primary Cohort"
                summary={contactSummary}
                open={sectionState.contact}
                onToggle={() => toggleSection('contact')}
            >
                <div className="grid gap-4 lg:grid-cols-2">
                    <div className="rounded-xl border border-gray-200 p-4">
                        <h3 className="mb-4 text-base font-semibold text-gray-900">Contact Information</h3>
                        <div className="space-y-3">
                            {managementStudent.email ? (
                                <div className="flex items-center gap-3">
                                    <Mail className="h-5 w-5 text-gray-400" />
                                    <div>
                                        <p className="text-sm text-gray-600">Email</p>
                                        <p className="font-medium text-gray-900">{managementStudent.email}</p>
                                    </div>
                                </div>
                            ) : null}
                            {managementStudent.phone ? (
                                <div className="flex items-center gap-3">
                                    <Phone className="h-5 w-5 text-gray-400" />
                                    <div>
                                        <p className="text-sm text-gray-600">Phone</p>
                                        <p className="font-medium text-gray-900">{managementStudent.phone}</p>
                                    </div>
                                </div>
                            ) : null}
                            {!managementStudent.email && !managementStudent.phone ? (
                                <p className="text-sm text-gray-500">No contact information available</p>
                            ) : null}
                        </div>
                    </div>
                    <div className="rounded-xl border border-gray-200 p-4">
                        <h3 className="mb-4 text-base font-semibold text-gray-900">Primary Cohort</h3>
                        {!managementStudent.primary_cohort ? (
                            <p className="text-sm text-gray-500">No primary cohort assigned</p>
                        ) : (
                            <div className="space-y-3">
                                <div className="flex items-center gap-3">
                                    <GraduationCap className="h-5 w-5 text-gray-400" />
                                    <div>
                                        <p className="text-sm text-gray-600">Cohort</p>
                                        <p className="font-medium text-gray-900">{managementStudent.primary_cohort_name}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <FileText className="h-5 w-5 text-gray-400" />
                                    <div>
                                        <p className="text-sm text-gray-600">Curriculum</p>
                                        <p className="font-medium text-gray-900">{managementStudent.primary_curriculum}</p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </LearnerSectionCard>
            ) : null}

            <LearnerSectionCard
                sectionId="learner-section-subjectParticipation"
                title="Cohort Subject Participation"
                summary={subjectParticipationSummary}
                open={sectionState.subjectParticipation}
                onToggle={() => toggleSection('subjectParticipation')}
            >
                <div className="space-y-4">
                    {canManageSubjectParticipation ? (
                        <>
                            {!currentCohortId ? (
                                <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-4 py-6 text-sm text-gray-500">
                                    Assign this learner to a cohort before managing subject participation.
                                </div>
                            ) : (
                                <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
                                    <p>
                                        This learner belongs to {currentCohortName ?? 'this cohort'}. These are the subjects offered by this cohort.
                                        The learner can only participate in these subjects.
                                    </p>
                                    <p className="mt-2">
                                        To assign another subject, move the learner to a cohort where that subject is offered, or add the subject to this cohort.
                                    </p>
                                </div>
                            )}

                            {!currentCohortId ? null : cohortSubjectsLoading ? (
                                <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-4 py-6 text-sm text-gray-500">
                                    Loading subjects offered by {currentCohortName ?? 'the current cohort'}...
                                </div>
                            ) : cohortSubjects.length === 0 ? (
                                <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-4 py-6 text-sm text-gray-500">
                                    No subjects have been added to this cohort yet.
                                </div>
                            ) : (
                                <div className="grid gap-4 md:grid-cols-2">
                                    {cohortSubjects.map((subject) => {
                                        const isParticipating = currentSubjectIds.has(subject.id);
                                        const isRequired = subject.is_compulsory || subject.subject_category === 'CORE' || subject.locked;

                                        return (
                                            <div key={subject.id} className="rounded-xl border border-gray-200 p-4">
                                                <div className="space-y-4">
                                                    <div className="space-y-2">
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            <h3 className="text-base font-semibold text-gray-900">{subject.subject_name}</h3>
                                                            <Badge variant="info">{subject.subject_code}</Badge>
                                                            <Badge variant={isParticipating ? 'default' : 'warning'}>
                                                                {isParticipating ? 'Participating' : 'Not Participating'}
                                                            </Badge>
                                                            <Badge variant="success">Offered in cohort</Badge>
                                                            {isRequired ? <Badge variant="info">Required</Badge> : null}
                                                        </div>
                                                        <p className="text-sm text-gray-500">
                                                            {isParticipating
                                                                ? 'This learner is enrolled in this cohort subject.'
                                                                : 'Add this learner to this cohort subject from the subject learner page.'}
                                                        </p>
                                                    </div>

                                                    <Link
                                                        href={`/academic/cohort-subjects/${subject.id}/learners`}
                                                        className="w-full sm:w-auto"
                                                    >
                                                        <Button className="w-full sm:w-auto">
                                                            <BookOpen className="mr-2 h-4 w-4" />
                                                            Manage Subject Learners
                                                        </Button>
                                                    </Link>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
                            This section shows the subjects included in your teaching-safe learner profile. Subject enrollment changes require learner-management permission.
                        </div>
                    )}

                    {student.current_subjects && student.current_subjects.length > 0 ? (
                        <div className="space-y-3 border-t border-gray-200 pt-4">
                            <h3 className="text-base font-semibold text-gray-900">Enrolled Cohort Subjects</h3>
                            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                                {student.current_subjects.map(subject => {
                                    const isRequired = subject.is_compulsory || subject.subject_category === 'CORE' || subject.locked;

                                    return (
                                        <div key={`${subject.cohort}-${subject.id}`} className="rounded-lg border border-gray-200 p-3">
                                            <div className="flex items-start justify-between gap-3">
                                                <div>
                                                    <p className="font-medium text-gray-900">{subject.code} — {subject.name}</p>
                                                    <p className="mt-1 text-xs text-gray-500">{subject.cohort}</p>
                                                </div>
                                                <div className="flex flex-col items-end gap-2">
                                                    <Badge variant="success" size="sm">Offered in cohort</Badge>
                                                    {isRequired ? <Badge variant="info" size="sm">Required</Badge> : null}
                                                    {canGenerateSubjectReport && reportableSubjectScopeIds.has(subject.id) ? (
                                                        <Link href={buildLearnerSubjectReportHref(studentId, subject.id, { returnTo: reportReturnTo })}>
                                                            <Button variant="ghost" size="sm">
                                                                <FileBarChart className="h-4 w-4" />
                                                                Subject Report
                                                            </Button>
                                                        </Link>
                                                    ) : null}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ) : null}
                </div>
            </LearnerSectionCard>

            {hasAttendanceSummary ? (
                <LearnerSectionCard
                    sectionId="learner-section-attendance"
                    title="Attendance Summary"
                    summary={attendanceSummary}
                    open={sectionState.attendance}
                    onToggle={() => toggleSection('attendance')}
                >
                    <div className="grid grid-cols-2 gap-4 text-center md:grid-cols-5">
                        {[
                            { label: 'Total Sessions', value: attendanceData?.statistics?.total ?? 0, color: 'text-gray-900' },
                            { label: 'Present', value: attendanceData?.statistics?.present ?? 0, color: 'text-green-600' },
                            { label: 'Absent', value: attendanceData?.statistics?.absent ?? 0, color: 'text-red-600' },
                            { label: 'Late', value: attendanceData?.statistics?.late ?? 0, color: 'text-yellow-600' },
                            { label: 'Attendance Rate', value: `${(attendanceData?.statistics?.attendance_percentage ?? 0).toFixed(1)}%`, color: 'text-blue-600' },
                        ].map(s => (
                            <div key={s.label}>
                                <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                                <p className="text-sm text-gray-600">{s.label}</p>
                            </div>
                        ))}
                    </div>
                </LearnerSectionCard>
            ) : null}

            {hasAssessmentSummary ? (
                <LearnerSectionCard
                    sectionId="learner-section-assessment"
                    title="Assessment Summary"
                    summary={assessmentSummary}
                    open={sectionState.assessment}
                    onToggle={() => toggleSection('assessment')}
                >
                    <div className="space-y-2">
                        <div className="flex justify-between">
                            <span className="text-gray-600">Average Score</span>
                            <span className="font-semibold">{(student.grade_summary?.average_score ?? 0).toFixed(1)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-600">Assessments Recorded</span>
                            <span className="font-semibold">{student.grade_summary?.total_assessments ?? 0}</span>
                        </div>
                    </div>
                </LearnerSectionCard>
            ) : null}

            {hasCbcExtensions ? (
                <LearnerSectionCard
                    sectionId="learner-section-cbc"
                    title="CBC Competency Progress"
                    summary={cbcSummary}
                    open={sectionState.cbc}
                    onToggle={() => toggleSection('cbc')}
                >
                    <div className="space-y-4">
                        {slotExtensions.map(ext => (
                            <ext.component key={ext.key} studentId={studentId} />
                        ))}
                    </div>
                </LearnerSectionCard>
            ) : null}

            {hasHistory ? (
                <LearnerSectionCard
                    sectionId="learner-section-history"
                    title="Enrollment History"
                    summary={historySummary}
                    open={sectionState.history}
                    onToggle={() => toggleSection('history')}
                >
                    <div className="space-y-4">
                        <div className="space-y-3 md:hidden">
                            {historyEnrollments.map((row) => (
                                <div key={`${row.cohort}-${row.enrolled_date}-${row.completion_date ?? 'active'}`} className="rounded-xl border border-gray-200 p-4">
                                    <div className="space-y-2">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <p className="font-semibold text-gray-900">{row.cohort_name}</p>
                                            {row.end_reason ? (
                                                <Badge variant={END_REASON_VARIANTS[row.end_reason] ?? 'default'}>
                                                    {END_REASON_LABELS[row.end_reason] ?? row.end_reason}
                                                </Badge>
                                            ) : (
                                                <Badge variant="default">Inactive</Badge>
                                            )}
                                        </div>
                                        <p className="text-sm text-gray-500">{row.enrollment_type_display}</p>
                                        <p className="text-xs text-gray-500">
                                            Enrolled {new Date(row.enrolled_date).toLocaleDateString()}
                                            {row.completion_date ? ` · Ended ${new Date(row.completion_date).toLocaleDateString()}` : ''}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="hidden md:block">
                            <DataTable
                                data={historyEnrollments as unknown as Record<string, unknown>[]}
                                columns={historyColumns as unknown as Column<Record<string, unknown>>[]}
                                enableSearch
                                searchPlaceholder="Search enrollment history..."
                                emptyMessage="No enrollment history"
                            />
                        </div>
                    </div>
                </LearnerSectionCard>
            ) : null}

            {canUseDangerZone ? (
                <Card className="border border-red-200">
                    <div className="space-y-4">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                                <h2 className="text-lg font-semibold text-red-700">Danger Zone</h2>
                                <p className="mt-1 text-sm text-gray-600">
                                    Use lifecycle actions to preserve academic history. Permanent delete is only for mistaken records with no evidence.
                                </p>
                            </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {canManage && hasActivePrimaryCohort ? (
                                <Button variant="secondary" onClick={() => setTransferOpen(true)} disabled={actionLoading}>
                                    <ArrowRightLeft className="h-4 w-4" />
                                    Transfer Learner
                                </Button>
                            ) : null}
                            <Button variant="secondary" onClick={() => withdraw()} disabled={actionLoading}>
                                <UserMinus className="h-4 w-4" />
                                Withdraw Learner
                            </Button>
                            <Button variant="secondary" onClick={() => graduate()} disabled={actionLoading}>
                                <GraduationCap className="h-4 w-4" />
                                Graduate Learner
                            </Button>
                            <Button variant="secondary" onClick={() => archiveStudent()} disabled={actionLoading}>
                                <Archive className="h-4 w-4" />
                                Archive Learner
                            </Button>
                            <Button variant="danger" onClick={() => setDeleteOpen(true)} disabled={actionLoading}>
                                <Trash2 className="h-4 w-4" />
                                Review Permanent Delete
                            </Button>
                            <ContextualApprovalRequestButton
                                variant="danger"
                                disabled={actionLoading}
                                intent={{
                                    actionKey: 'STUDENT_STATUS_UPDATE',
                                    title: `Request permanent delete for ${student.full_name}`,
                                    targetType: 'learner',
                                    targetId: studentId,
                                    returnTo: learnerReturnTo,
                                    requestKey: buildContextualRequestKey(['learner', studentId, 'permanent-delete']),
                                    referenceData: {
                                        ...learnerApprovalReference,
                                        contextual_action: 'permanent_delete',
                                        confirmed_danger_zone: true,
                                    },
                                }}
                            >
                                <Trash2 className="h-4 w-4" />
                                Request permanent delete
                            </ContextualApprovalRequestButton>
                        </div>
                    </div>
                </Card>
            ) : null}

            {showMobileReportBar ? (
                <div className="theme-surface-elevated fixed inset-x-0 bottom-0 z-30 border-t px-4 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-3 shadow-[0_-8px_24px_rgba(15,23,42,0.08)] md:hidden theme-border">
                    <div className="flex items-center gap-3">
                        <Link href={defaultSubjectReportHref} className="flex-1">
                            <Button className="w-full">
                                <FileBarChart className="mr-2 h-4 w-4" />
                                Open Subject Report
                            </Button>
                        </Link>
                        <ActionMenu
                            items={mobileMoreMenuItems}
                        />
                    </div>
                </div>
            ) : null}

            {/* Modals */}
            <StatusModal
                isOpen={statusOpen}
                onClose={() => setStatusOpen(false)}
                onSubmit={updateStatus}
                loading={actionLoading}
            />
            <EnrollModal
                isOpen={enrollOpen}
                onClose={() => setEnrollOpen(false)}
                onSubmit={reenroll}
                availableCohorts={availableCohorts}
                activeSubjectNames={activeSubjectNames}
                loading={actionLoading}
            />
            <TransferLearnerModal
                isOpen={transferOpen}
                onClose={() => setTransferOpen(false)}
                onSubmit={transfer}
                currentEnrollment={currentEnrollment}
                availableCohorts={availableCohorts}
                activeSubjectNames={activeSubjectNames}
                loading={actionLoading}
            />
            <UnenrollModal
                isOpen={!!unenrollTarget}
                onClose={() => setUnenrollTarget(null)}
                onSubmit={data => unenroll(unenrollTarget!.cohort, data)}
                enrollment={unenrollTarget}
                studentName={student.full_name}
                activeSubjectNames={activeSubjectNames}
                loading={actionLoading}
            />
            <DeleteStudentModal
                isOpen={deleteOpen}
                onClose={() => setDeleteOpen(false)}
                onConfirm={handleDelete}
                onCheckEligibility={checkDeleteEligibility}
                onWithdraw={() => withdraw()}
                onArchive={() => archiveStudent()}
                studentName={student.full_name}
                loading={actionLoading}
            />
            <LearnerAssessmentPickerModal
                isOpen={assessmentPickerOpen}
                onClose={() => setAssessmentPickerOpen(false)}
                assessments={openAssessments}
                onSelect={(assessment) => {
                    setAssessmentPickerOpen(false);
                    navigateToAssessmentScoreEntry(assessment.id);
                }}
            />
        </div>
    );
}
