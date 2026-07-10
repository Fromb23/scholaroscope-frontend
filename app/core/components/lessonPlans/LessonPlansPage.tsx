'use client';

import type { FormEvent, ReactNode } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Eye, FileText, Plus, RotateCcw } from 'lucide-react';
import { Badge } from '@/app/components/ui/Badge';
import { Button } from '@/app/components/ui/Button';
import { Card } from '@/app/components/ui/Card';
import { CurriculumLifecycleNotice } from '@/app/core/components/curriculum/CurriculumLifecycleNotice';
import { ErrorBanner } from '@/app/components/ui/ErrorBanner';
import { ErrorState } from '@/app/components/ui/ErrorState';
import { Input } from '@/app/components/ui/Input';
import { LoadingSpinner } from '@/app/components/ui/LoadingSpinner';
import Modal from '@/app/components/ui/Modal';
import { Select } from '@/app/components/ui/Select';
import { LessonPlanStatusBadge } from '@/app/core/components/lessonPlans/LessonPlanStatusBadge';
import { useInstructors } from '@/app/core/hooks/useInstructors';
import { useAcademicTodayMode } from '@/app/core/hooks/useAcademicTodayMode';
import { useInstructorCohortAccess } from '@/app/core/hooks/useInstructorCohortAccess';
import { useLessonPlans } from '@/app/core/hooks/useLessonPlans';
import { useCurricula, useTerms, useSubjects } from '@/app/core/hooks/useAcademic';
import { canCreateCurriculumWork } from '@/app/core/lib/curriculumLifecycle';
import {
    canCreateTeachingRecord,
    canShowAdminMyTeaching,
    isSelfManagedTeachingWorkspace,
    isSupervisionOnlyAdmin,
} from '@/app/core/lib/workspaces';
import { getReturnBackLabel } from '@/app/core/lib/workspaceReturn';
import { useCohorts } from '@/app/core/hooks/useCohorts';
import { useModalState } from '@/app/core/hooks/useModalState';
import type { AdminGroupingMode, AdminWorkViewMode } from '@/app/core/types/adminWorkViews';
import type { LessonPlan, LessonPlanStatus } from '@/app/core/types/lessonPlans';
import {
    LESSON_PLAN_STATUS_OPTIONS,
    canArchiveLessonPlan,
    canMarkLessonPlanReviewed,
    canMarkLessonPlanUsed,
    canRestoreLessonPlan,
} from '@/app/core/types/lessonPlans';
import { useAuth } from '@/app/context/AuthContext';

function formatDate(value: string | null): string {
    if (!value) {
        return 'Not scheduled';
    }

    return new Date(value).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    });
}

function getLessonDate(lessonPlan: LessonPlan): string | null {
    return lessonPlan.session_date ?? lessonPlan.planned_date;
}

function getLessonStatusLabel(lessonPlan: LessonPlan): string {
    if (lessonPlan.session_title?.trim()) {
        return lessonPlan.session_title;
    }

    if (lessonPlan.session) {
        return `Lesson ${lessonPlan.session}`;
    }

    return 'Not scheduled yet';
}

function formatUpdatedAt(value: string): string {
    return new Date(value).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
    });
}

function actionKey(lessonPlanId: number, action: string): string {
    return `${lessonPlanId}:${action}`;
}

function sortLessonPlans(items: LessonPlan[]): LessonPlan[] {
    return [...items].sort((left, right) => {
        const leftTimestamp = new Date(left.session_date ?? left.updated_at).getTime();
        const rightTimestamp = new Date(right.session_date ?? right.updated_at).getTime();

        if (leftTimestamp !== rightTimestamp) {
            return leftTimestamp - rightTimestamp;
        }

        return new Date(right.updated_at).getTime() - new Date(left.updated_at).getTime();
    });
}

function teacherLabel(lessonPlan: LessonPlan): string {
    return lessonPlan.teacher_name?.trim() || 'Unassigned teacher';
}

function normalizeText(value: string | null | undefined): string | null {
    if (typeof value !== 'string') {
        return null;
    }

    const normalized = value.replace(/\s+/g, ' ').trim();
    return normalized.length > 0 ? normalized : null;
}

function getLessonSummary(lessonPlan: LessonPlan): string | null {
    const objective = lessonPlan.objectives.find((value) => normalizeText(value));
    const firstOutcome = lessonPlan.planned_outcomes.find((outcome) => normalizeText(outcome.text));

    return (
        normalizeText(lessonPlan.introduction)
        || normalizeText(lessonPlan.prior_knowledge)
        || normalizeText(objective)
        || normalizeText(firstOutcome?.text)
    );
}

function LessonPlanMetaItem({ label, value }: { label: string; value: ReactNode }) {
    return (
        <div className="min-w-0 rounded-lg bg-gray-50 px-3 py-2">
            <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</dt>
            <dd className="mt-1 min-w-0 text-sm text-gray-900">{value}</dd>
        </div>
    );
}

interface LessonPlanActionsProps {
    lessonPlan: LessonPlan;
    canCreateTeachingRecord: boolean;
    pendingActionKey: string | null;
    onView: (lessonPlan: LessonPlan) => void;
    onMarkReviewed: (lessonPlan: LessonPlan) => void;
    onMarkUsed: (lessonPlan: LessonPlan) => void;
    onArchive: (lessonPlan: LessonPlan) => void;
    onRestore: (lessonPlan: LessonPlan) => void;
    className?: string;
    buttonClassName?: string;
}

interface RowActionFeedback {
    action: 'reviewed' | 'used' | 'archived' | 'restored';
    message: string;
    variant: 'error' | 'success';
}

interface LessonPlanInstructorOption {
    value: string;
    label: string;
}

interface LessonPlanGroupSection {
    key: string;
    label: string;
    description: string;
    items: LessonPlan[];
}

interface LessonPlanGroup {
    key: string;
    label: string;
    description: string;
    itemCount: number;
    sections: LessonPlanGroupSection[];
}

function toOptionalNumber(value: string): number | undefined {
    if (!value) {
        return undefined;
    }

    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
}

function buildLessonPlanGroups(
    lessonPlans: LessonPlan[],
    groupingMode: AdminGroupingMode,
    showInstructorContext = true,
): LessonPlanGroup[] {
    const groups = new Map<string, {
        label: string;
        description: string;
        itemCount: number;
        sections: Map<string, LessonPlanGroupSection>;
    }>();

    lessonPlans.forEach((lessonPlan) => {
        const cohortLabel = lessonPlan.cohort_name?.trim() || 'Unassigned class';
        const subjectLabel = lessonPlan.subject_name?.trim() || 'Unassigned subject';
        const instructorLabel = teacherLabel(lessonPlan);
        let groupKey = `cohort:${lessonPlan.cohort ?? cohortLabel}`;
        let groupLabel = cohortLabel;
        let groupDescription = "Class view starts from learners' classroom context.";
        let sectionKey = `subject:${lessonPlan.subject ?? subjectLabel}`;
        let sectionLabel = subjectLabel;
        let sectionDescription = showInstructorContext
            ? `${instructorLabel} ownership stays visible on each lesson plan card.`
            : 'Lesson plans for this class subject.';

        if (groupingMode === 'instructor') {
            groupKey = `teacher:${lessonPlan.teacher ?? instructorLabel}`;
            groupLabel = instructorLabel;
            groupDescription = 'Instructor view starts from teacher workload.';
            sectionKey = `class-subject:${lessonPlan.cohort ?? cohortLabel}:${lessonPlan.subject ?? subjectLabel}`;
            sectionLabel = `${cohortLabel} · ${subjectLabel}`;
            sectionDescription = 'Class and subject context for this instructor.';
        } else if (groupingMode === 'subject') {
            groupKey = `subject:${lessonPlan.subject ?? subjectLabel}`;
            groupLabel = subjectLabel;
            groupDescription = 'Subject view highlights where the teaching load sits across classes.';
            sectionKey = `class-teacher:${lessonPlan.cohort ?? cohortLabel}:${lessonPlan.teacher ?? instructorLabel}`;
            sectionLabel = `${cohortLabel} · ${instructorLabel}`;
            sectionDescription = showInstructorContext
                ? 'Class and instructor context for this subject.'
                : 'Class context for this subject.';
        }

        if (!groups.has(groupKey)) {
            groups.set(groupKey, {
                label: groupLabel,
                description: groupDescription,
                itemCount: 0,
                sections: new Map<string, LessonPlanGroupSection>(),
            });
        }

        const group = groups.get(groupKey);
        if (!group) {
            return;
        }

        group.itemCount += 1;

        if (!group.sections.has(sectionKey)) {
            group.sections.set(sectionKey, {
                key: sectionKey,
                label: sectionLabel,
                description: sectionDescription,
                items: [],
            });
        }

        const section = group.sections.get(sectionKey);
        if (!section) {
            return;
        }

        section.items.push(lessonPlan);
    });

    return Array.from(groups.entries())
        .map(([key, group]) => ({
            key,
            label: group.label,
            description: group.description,
            itemCount: group.itemCount,
            sections: Array.from(group.sections.values())
                .map((section) => ({
                    ...section,
                    items: sortLessonPlans(section.items),
                }))
                .sort((left, right) => left.label.localeCompare(right.label)),
        }))
        .sort((left, right) => left.label.localeCompare(right.label));
}

function LessonPlanActions({
    lessonPlan,
    canCreateTeachingRecord,
    pendingActionKey,
    onView,
    onMarkReviewed,
    onMarkUsed,
    onArchive,
    onRestore,
    className = '',
    buttonClassName = '',
}: LessonPlanActionsProps) {
    const isPending = (action: string) => pendingActionKey === actionKey(lessonPlan.id, action);

    return (
        <div className={`flex flex-wrap gap-2 ${className}`}>
            <Button
                type="button"
                size="sm"
                onClick={() => onView(lessonPlan)}
                className={buttonClassName}
            >
                <Eye className="mr-1.5 h-4 w-4" />
                View
            </Button>

            {canMarkLessonPlanReviewed(lessonPlan.status) ? (
                <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => onMarkReviewed(lessonPlan)}
                    disabled={isPending('reviewed')}
                    className={buttonClassName}
                >
                    Mark Reviewed
                </Button>
            ) : null}

            {canCreateTeachingRecord && canMarkLessonPlanUsed(lessonPlan.status) ? (
                <Button
                    type="button"
                    size="sm"
                    onClick={() => onMarkUsed(lessonPlan)}
                    disabled={isPending('used')}
                    className={buttonClassName}
                >
                    Close Lesson
                </Button>
            ) : null}

            {canArchiveLessonPlan(lessonPlan.status) ? (
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => onArchive(lessonPlan)}
                    disabled={isPending('archived')}
                    className={`text-red-600 hover:bg-red-50 focus:ring-red-500 ${buttonClassName}`}
                >
                    Archive
                </Button>
            ) : null}

            {canRestoreLessonPlan(lessonPlan.status) ? (
                <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => onRestore(lessonPlan)}
                    disabled={isPending('restored')}
                    className={buttonClassName}
                >
                    <RotateCcw className="mr-1.5 h-4 w-4" />
                    Restore
                </Button>
            ) : null}
        </div>
    );
}

export function LessonPlansPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { activeOrg, activeRole, user, capabilities } = useAuth();
    const instructorAccess = useInstructorCohortAccess();
    const { data: todayMode } = useAcademicTodayMode({ enabled: Boolean(user) });
    const isInstructor = activeRole === 'INSTRUCTOR';
    const isAdminLike = activeRole === 'ADMIN';
    const isSelfManagedTeaching = isSelfManagedTeachingWorkspace({
        orgType: activeOrg?.org_type,
        capabilities,
    });
    const showInstitutionSupervision = isAdminLike && !isSelfManagedTeaching;
    const canUseMyTeaching = isInstructor || canShowAdminMyTeaching({
        role: activeRole,
        orgType: activeOrg?.org_type,
        isSuperadmin: false,
        capabilities,
    });
    const canCreateTeachingRecords = canCreateTeachingRecord({
        role: activeRole,
        orgType: activeOrg?.org_type,
        isSuperadmin: false,
        capabilities,
    });
    const supervisionOnlyAdmin = isSupervisionOnlyAdmin({
        role: activeRole,
        orgType: activeOrg?.org_type,
        isSuperadmin: false,
        capabilities,
    });
    const { curricula } = useCurricula();
    const { terms } = useTerms();
    const { subjects } = useSubjects();
    const { cohorts } = useCohorts();
    const { instructors } = useInstructors({ enabled: showInstitutionSupervision });
    const canCreateLessonPlan = useMemo(
        () => curricula.some((curriculum) => canCreateCurriculumWork(curriculum)),
        [curricula]
    );
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<LessonPlanStatus | ''>('');
    const [termFilter, setTermFilter] = useState('');
    const [cohortSubjectFilter, setCohortSubjectFilter] = useState('');
    const [subjectFilter, setSubjectFilter] = useState('');
    const [cohortFilter, setCohortFilter] = useState('');
    const [instructorFilter, setInstructorFilter] = useState('');
    const [viewMode, setViewMode] = useState<AdminWorkViewMode>('admin_supervision');
    const [groupingMode, setGroupingMode] = useState<AdminGroupingMode>('class');
    const [pendingActionKey, setPendingActionKey] = useState<string | null>(null);
    const [rowActionFeedback, setRowActionFeedback] = useState<Record<number, RowActionFeedback>>({});
    const [reflection, setReflection] = useState('');
    const [markUsedError, setMarkUsedError] = useState<string | null>(null);
    const lessonPlanFilters = useMemo(() => ({
        status: statusFilter || undefined,
        term: toOptionalNumber(termFilter),
        cohort_subject: toOptionalNumber(cohortSubjectFilter),
        subject: cohortSubjectFilter ? undefined : toOptionalNumber(subjectFilter),
        cohort: toOptionalNumber(cohortFilter),
    }), [cohortFilter, cohortSubjectFilter, statusFilter, subjectFilter, termFilter]);
    const {
        lessonPlans,
        loading,
        error,
        refetch,
        markReviewed,
        markUsed,
        archive,
        restore,
    } = useLessonPlans(lessonPlanFilters);
    const {
        target: markUsedTarget,
        isOpen: isMarkUsedOpen,
        open: openMarkUsed,
        close: closeMarkUsed,
    } = useModalState<LessonPlan>();

    const safeReturnTo = useMemo(() => {
        const value = searchParams.get('returnTo');
        return value?.startsWith('/') ? value : null;
    }, [searchParams]);

    useEffect(() => {
        const requestedCohortSubject = searchParams.get('cohort_subject');
        const requestedSubject = searchParams.get('subject');
        const requestedCohort = searchParams.get('cohort');
        if (requestedCohortSubject && requestedCohortSubject !== cohortSubjectFilter) {
            setCohortSubjectFilter(requestedCohortSubject);
        }
        if (!requestedCohortSubject && requestedSubject && requestedSubject !== subjectFilter) {
            setSubjectFilter(requestedSubject);
        }
        if (requestedCohort && requestedCohort !== cohortFilter) {
            setCohortFilter(requestedCohort);
        }
    }, [cohortFilter, cohortSubjectFilter, searchParams, subjectFilter]);

    useEffect(() => {
        if (isSelfManagedTeaching && viewMode !== 'my_teaching') {
            setViewMode('my_teaching');
            return;
        }

        if (!canUseMyTeaching && viewMode === 'my_teaching') {
            setViewMode('admin_supervision');
        }
    }, [canUseMyTeaching, isSelfManagedTeaching, viewMode]);

    const effectiveMyTeachingMode = isInstructor || (canUseMyTeaching && (isSelfManagedTeaching || viewMode === 'my_teaching'));
    const shouldFilterToMyTeaching = showInstitutionSupervision && effectiveMyTeachingMode;
    const useGroupedLessonPlanView = (showInstitutionSupervision && !effectiveMyTeachingMode) || isSelfManagedTeaching;
    const assignedCohortSubjectOptions = useMemo(() => (
        Array.from(
            new Map(
                instructorAccess.assignments
                    .filter((assignment) => (
                        typeof assignment.cohort_subject_id === 'number'
                        && assignment.subject_offering_status !== 'DROPPED_HISTORICAL'
                    ))
                    .map((assignment) => [
                        assignment.cohort_subject_id,
                        {
                            id: assignment.cohort_subject_id as number,
                            cohortId: assignment.cohort_id,
                            cohortName: assignment.cohort_name,
                            subjectName: assignment.subject_name,
                            label: `${assignment.cohort_name} - ${assignment.subject_name}`,
                        },
                    ])
            ).values()
        ).sort((left, right) => left.label.localeCompare(right.label))
    ), [instructorAccess.assignments]);
    const visibleAssignedCohortSubjectOptions = useMemo(
        () => assignedCohortSubjectOptions.filter((option) => (
            !cohortFilter || String(option.cohortId) === cohortFilter
        )),
        [assignedCohortSubjectOptions, cohortFilter]
    );
    const availableCohortOptions = useMemo(() => {
        if (!effectiveMyTeachingMode) {
            return cohorts;
        }

        return Array.from(
            new Map(
                assignedCohortSubjectOptions.map((option) => [
                    option.cohortId,
                    {
                        id: option.cohortId,
                        name: option.cohortName,
                    },
                ])
            ).values()
        ).sort((left, right) => left.name.localeCompare(right.name));
    }, [assignedCohortSubjectOptions, cohorts, effectiveMyTeachingMode]);
    const buildWorkspaceHref = useCallback((overrides?: Partial<{
        term: string;
        cohort_subject: string;
        subject: string;
        cohort: string;
    }>) => {
        const params = new URLSearchParams();
        const resolved = {
            term: overrides?.term ?? termFilter,
            cohort_subject: overrides?.cohort_subject ?? cohortSubjectFilter,
            subject: overrides?.subject ?? subjectFilter,
            cohort: overrides?.cohort ?? cohortFilter,
        };

        if (resolved.term) params.set('term', resolved.term);
        if (resolved.cohort_subject) params.set('cohort_subject', resolved.cohort_subject);
        if (!resolved.cohort_subject && resolved.subject) params.set('subject', resolved.subject);
        if (resolved.cohort) params.set('cohort', resolved.cohort);
        if (safeReturnTo) params.set('returnTo', safeReturnTo);

        const query = params.toString();
        return query ? `/lesson-plans?${query}` : '/lesson-plans';
    }, [cohortFilter, cohortSubjectFilter, safeReturnTo, subjectFilter, termFilter]);
    const createLessonPlanHref = useMemo(() => {
        const params = new URLSearchParams();
        if (cohortSubjectFilter) {
            params.set('cohort_subject', cohortSubjectFilter);
        }
        if (termFilter) {
            params.set('term', termFilter);
        }
        params.set('returnTo', buildWorkspaceHref());
        return `/lesson-plans/new?${params.toString()}`;
    }, [buildWorkspaceHref, cohortSubjectFilter, termFilter]);

    const subtitle =
        isSelfManagedTeaching || isInstructor
            ? 'Prepare lessons, review what is ready for class, and schedule the next one.'
            : viewMode === 'my_teaching' && canUseMyTeaching
                ? 'Use My Teaching to view only lesson plans tied to your own teaching work.'
                : 'Admin supervision shows organization work by class, instructor, and subject.';
    const createButtonLabel = effectiveMyTeachingMode
        ? 'Prepare a lesson'
        : 'Create lesson plan';
    const backLabel = getReturnBackLabel(safeReturnTo);
    const midtermBreakPausesCreation = todayMode?.mode === 'MIDTERM_BREAK' && todayMode.allows_new_teaching === false;

    const instructorOptions = useMemo<LessonPlanInstructorOption[]>(() => {
        const options = new Map<string, LessonPlanInstructorOption>();

        instructors.forEach((instructor) => {
            options.set(`id:${instructor.id}`, {
                value: `id:${instructor.id}`,
                label: instructor.full_name || instructor.email,
            });
        });

        lessonPlans.forEach((lessonPlan) => {
            if (typeof lessonPlan.teacher === 'number' && Number.isFinite(lessonPlan.teacher)) {
                const key = `id:${lessonPlan.teacher}`;
                if (!options.has(key)) {
                    options.set(key, {
                        value: key,
                        label: teacherLabel(lessonPlan),
                    });
                }
                return;
            }

            const teacherName = normalizeText(lessonPlan.teacher_name);
            if (!teacherName) {
                return;
            }

            const key = `name:${teacherName}`;
            if (!options.has(key)) {
                options.set(key, {
                    value: key,
                    label: lessonPlan.teacher_name?.trim() || 'Unnamed instructor',
                });
            }
        });

        return Array.from(options.values()).sort((left, right) => left.label.localeCompare(right.label));
    }, [instructors, lessonPlans]);

    const filteredLessonPlans = useMemo(() => {
        const normalizedSearch = search.trim().toLowerCase();

        return sortLessonPlans(
            lessonPlans.filter((lessonPlan) => {
                if (statusFilter && lessonPlan.status !== statusFilter) {
                    return false;
                }

                if (termFilter && String(lessonPlan.term ?? '') !== termFilter) {
                    return false;
                }

                if (subjectFilter && String(lessonPlan.subject ?? '') !== subjectFilter) {
                    return false;
                }

                if (cohortSubjectFilter && String(lessonPlan.cohort_subject ?? '') !== cohortSubjectFilter) {
                    return false;
                }

                if (cohortFilter && String(lessonPlan.cohort ?? '') !== cohortFilter) {
                    return false;
                }

                if (shouldFilterToMyTeaching) {
                    const matchesTeacherId = typeof lessonPlan.teacher === 'number' && lessonPlan.teacher === user?.id;
                    const matchesTeacherName = normalizeText(lessonPlan.teacher_name) === normalizeText(user?.full_name);

                    if (!matchesTeacherId && !matchesTeacherName) {
                        return false;
                    }
                }

                if (showInstitutionSupervision && viewMode === 'admin_supervision' && instructorFilter) {
                    if (instructorFilter.startsWith('id:')) {
                        if (String(lessonPlan.teacher ?? '') !== instructorFilter.slice(3)) {
                            return false;
                        }
                    } else if (instructorFilter.startsWith('name:')) {
                        if (normalizeText(lessonPlan.teacher_name) !== instructorFilter.slice(5)) {
                            return false;
                        }
                    }
                }

                if (!normalizedSearch) {
                    return true;
                }

                const haystack = [
                    lessonPlan.title,
                    lessonPlan.session_title,
                    lessonPlan.subject_name,
                    lessonPlan.cohort_name,
                    lessonPlan.term_name,
                    lessonPlan.curriculum_name,
                    lessonPlan.teacher_name,
                ]
                    .filter(Boolean)
                    .join(' ')
                    .toLowerCase();

                return haystack.includes(normalizedSearch);
            })
        );
    }, [
        cohortFilter,
        cohortSubjectFilter,
        instructorFilter,
        lessonPlans,
        search,
        shouldFilterToMyTeaching,
        showInstitutionSupervision,
        statusFilter,
        subjectFilter,
        termFilter,
        user?.full_name,
        user?.id,
        viewMode,
    ]);

    const groupedLessonPlans = useMemo(
        () => (
            useGroupedLessonPlanView
                ? buildLessonPlanGroups(filteredLessonPlans, isSelfManagedTeaching ? 'class' : groupingMode, !isSelfManagedTeaching)
                : []
        ),
        [filteredLessonPlans, groupingMode, isSelfManagedTeaching, useGroupedLessonPlanView]
    );
    const hasServerFilters = Boolean(statusFilter || termFilter || cohortSubjectFilter || subjectFilter || cohortFilter);

    const setLessonPlanFeedback = (lessonPlanId: number, feedback: RowActionFeedback | null) => {
        setRowActionFeedback((current) => {
            if (!feedback) {
                if (!(lessonPlanId in current)) {
                    return current;
                }

                const next = { ...current };
                delete next[lessonPlanId];
                return next;
            }

            return {
                ...current,
                [lessonPlanId]: feedback,
            };
        });
    };

    const handleRowAction = async (
        lessonPlan: LessonPlan,
        action: 'reviewed' | 'archived' | 'restored'
    ) => {
        setPendingActionKey(actionKey(lessonPlan.id, action));
        setLessonPlanFeedback(lessonPlan.id, null);

        try {
            if (action === 'reviewed') {
                await markReviewed(lessonPlan.id);
                setLessonPlanFeedback(lessonPlan.id, {
                    action,
                    message: 'Lesson plan marked as reviewed.',
                    variant: 'success',
                });
            } else if (action === 'archived') {
                await archive(lessonPlan.id);
                setLessonPlanFeedback(lessonPlan.id, {
                    action,
                    message: 'Lesson plan archived.',
                    variant: 'success',
                });
            } else {
                await restore(lessonPlan.id);
                setLessonPlanFeedback(lessonPlan.id, {
                    action,
                    message: 'Lesson plan restored.',
                    variant: 'success',
                });
            }
        } catch (err) {
            setLessonPlanFeedback(lessonPlan.id, {
                action,
                message: err instanceof Error ? err.message : 'Action failed.',
                variant: 'error',
            });
        } finally {
            setPendingActionKey(null);
        }
    };

    const handleOpenMarkUsed = (lessonPlan: LessonPlan) => {
        setReflection(lessonPlan.reflection ?? '');
        setLessonPlanFeedback(lessonPlan.id, null);
        setMarkUsedError(null);
        openMarkUsed(lessonPlan);
    };

    const handleSubmitMarkUsed = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (!markUsedTarget) {
            return;
        }

        setPendingActionKey(actionKey(markUsedTarget.id, 'used'));
        setLessonPlanFeedback(markUsedTarget.id, null);
        setMarkUsedError(null);

        try {
            await markUsed(markUsedTarget.id, { reflection: reflection.trim() });
            closeMarkUsed();
            setReflection('');
            setLessonPlanFeedback(markUsedTarget.id, {
                action: 'used',
                message: 'Lesson closure recorded.',
                variant: 'success',
            });
        } catch (err) {
            setMarkUsedError(err instanceof Error ? err.message : 'Action failed.');
        } finally {
            setPendingActionKey(null);
        }
    };

    const renderLessonPlanCard = (lessonPlan: LessonPlan) => {
        const lessonSummary = getLessonSummary(lessonPlan);
        const feedback = rowActionFeedback[lessonPlan.id];

        return (
            <Card key={lessonPlan.id} className="p-4 sm:p-5">
                <div className="flex flex-col gap-5 xl:grid xl:grid-cols-[minmax(0,1.7fr)_minmax(0,1.3fr)_auto] xl:items-start">
                    <div className="min-w-0 space-y-3">
                        <div className="space-y-2">
                            <div className="flex flex-wrap items-start gap-2">
                                <h2 className="min-w-0 flex-1 text-base font-semibold text-gray-900 line-clamp-2 sm:text-lg">
                                    {lessonPlan.title}
                                </h2>
                                {lessonPlan.generated_by_ai ? (
                                    <Badge variant="purple" size="sm">
                                        AI
                                    </Badge>
                                ) : null}
                            </div>
                            <p className="text-sm text-gray-500">
                                {getLessonStatusLabel(lessonPlan)}
                            </p>
                            {lessonSummary ? (
                                <p className="text-sm leading-6 text-gray-600 line-clamp-2">
                                    {lessonSummary}
                                </p>
                            ) : null}
                        </div>
                    </div>

                    <dl className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-3">
                        <LessonPlanMetaItem
                            label="Status"
                            value={<LessonPlanStatusBadge status={lessonPlan.status} size="sm" />}
                        />
                        <LessonPlanMetaItem
                            label="Lesson Date"
                            value={formatDate(getLessonDate(lessonPlan))}
                        />
                        <LessonPlanMetaItem
                            label="Cohort"
                            value={lessonPlan.cohort_name || '-'}
                        />
                        <LessonPlanMetaItem
                            label="Subject"
                            value={lessonPlan.subject_name || '-'}
                        />
                        <LessonPlanMetaItem
                            label="Term"
                            value={lessonPlan.term_name || '-'}
                        />
                        <LessonPlanMetaItem
                            label="Teacher"
                            value={teacherLabel(lessonPlan)}
                        />
                        <LessonPlanMetaItem
                            label="Updated"
                            value={formatUpdatedAt(lessonPlan.updated_at)}
                        />
                    </dl>

                    <div className="space-y-3 xl:min-w-[12rem]">
                        <LessonPlanActions
                            lessonPlan={lessonPlan}
                            canCreateTeachingRecord={canCreateTeachingRecords}
                            pendingActionKey={pendingActionKey}
                            onView={(plan) => router.push(`/lesson-plans/${plan.id}?${new URLSearchParams({
                                returnTo: buildWorkspaceHref(),
                            }).toString()}`)}
                            onMarkReviewed={(plan) => {
                                void handleRowAction(plan, 'reviewed');
                            }}
                            onMarkUsed={handleOpenMarkUsed}
                            onArchive={(plan) => {
                                void handleRowAction(plan, 'archived');
                            }}
                            onRestore={(plan) => {
                                void handleRowAction(plan, 'restored');
                            }}
                            className="w-full xl:flex-col xl:items-stretch"
                            buttonClassName="w-full sm:w-auto xl:w-full"
                        />
                        {feedback ? (
                            <ErrorBanner
                                message={feedback.message}
                                variant={feedback.variant}
                                compact
                                autoDismissMs={feedback.variant === 'error' ? 5000 : 4000}
                                onDismiss={() => setLessonPlanFeedback(lessonPlan.id, null)}
                            />
                        ) : null}
                    </div>
                </div>
            </Card>
        );
    };

    if (loading && lessonPlans.length === 0) {
        return <LoadingSpinner message="Loading lesson plans..." fullScreen={false} />;
    }

    if (error && lessonPlans.length === 0) {
        return (
            <ErrorState
                fullScreen={false}
                message={error}
                onRetry={() => {
                    void refetch();
                }}
            />
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                    <h1 className="text-2xl font-semibold text-gray-900">
                        {effectiveMyTeachingMode ? 'Lesson Preparation' : 'Lesson Plans'}
                    </h1>
                    <p className="mt-1 text-gray-600">{subtitle}</p>
                </div>

                {safeReturnTo ? (
                    <Link href={safeReturnTo}>
                        <Button variant="ghost" size="sm">
                            {backLabel}
                        </Button>
                    </Link>
                ) : null}

                {canCreateLessonPlan && canCreateTeachingRecords && !midtermBreakPausesCreation ? (
                    <Link href={createLessonPlanHref}>
                        <Button>
                            <Plus className="mr-2 h-4 w-4" />
                            {createButtonLabel}
                        </Button>
                    </Link>
                ) : midtermBreakPausesCreation ? (
                    <Button disabled>
                        New normal teaching work resumes after the break.
                    </Button>
                ) : supervisionOnlyAdmin && !isSelfManagedTeaching ? (
                    <Link href="/admin/instructors">
                        <Button variant="secondary">
                            View instructor activity
                        </Button>
                    </Link>
                ) : (
                    <Button disabled>
                        <Plus className="mr-2 h-4 w-4" />
                        {createButtonLabel}
                    </Button>
                )}
            </div>

            {!canCreateLessonPlan ? (
                <CurriculumLifecycleNotice
                    status="DISABLED"
                    role={activeRole === 'INSTRUCTOR' ? 'INSTRUCTOR' : 'ADMIN'}
                    title="New lesson plans are blocked"
                    message="All curricula are currently blocked for new work. Historical lesson plans remain available for viewing."
                />
            ) : null}

            {showInstitutionSupervision ? (
                <Card>
                    <div className="space-y-5">
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

                        {!effectiveMyTeachingMode ? (
                            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                                <div className="space-y-1">
                                    <h3 className="text-sm font-semibold text-gray-900">Grouping</h3>
                                    <p className="text-sm text-gray-500">
                                        {groupingMode === 'instructor'
                                            ? 'Instructor view starts from teacher workload.'
                                            : "Class view starts from learners' classroom context."}
                                    </p>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant={groupingMode === 'class' ? 'secondary' : 'ghost'}
                                        onClick={() => setGroupingMode('class')}
                                    >
                                        Class view
                                    </Button>
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant={groupingMode === 'instructor' ? 'secondary' : 'ghost'}
                                        onClick={() => setGroupingMode('instructor')}
                                    >
                                        Instructor view
                                    </Button>
                                </div>
                            </div>
                        ) : null}
                    </div>
                </Card>
            ) : null}

            <Card>
                <div className={`grid grid-cols-1 gap-4 ${showInstitutionSupervision && viewMode === 'admin_supervision' ? 'lg:grid-cols-6' : 'lg:grid-cols-5'}`}>
                    <Input
                        label="Search"
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder="Search lesson plans"
                    />

                    <Select
                        label="Status"
                        value={statusFilter}
                        onChange={(event) => setStatusFilter(event.target.value as LessonPlanStatus | '')}
                        options={[
                            { value: '', label: 'All statuses' },
                            ...LESSON_PLAN_STATUS_OPTIONS,
                        ]}
                    />

                    <Select
                        label="Term"
                        value={termFilter}
                        onChange={(event) => setTermFilter(event.target.value)}
                        options={[
                            { value: '', label: 'All terms' },
                            ...terms.map((term) => ({
                                value: String(term.id),
                                label: term.name,
                            })),
                        ]}
                    />

                    {effectiveMyTeachingMode ? (
                        <Select
                            label="Class subject"
                            value={cohortSubjectFilter}
                            onChange={(event) => setCohortSubjectFilter(event.target.value)}
                            options={[
                                { value: '', label: 'All class subjects' },
                                ...visibleAssignedCohortSubjectOptions.map((option) => ({
                                    value: String(option.id),
                                    label: option.label,
                                })),
                            ]}
                        />
                    ) : (
                        <Select
                            label="Subject"
                            value={subjectFilter}
                            onChange={(event) => setSubjectFilter(event.target.value)}
                            options={[
                                { value: '', label: 'All subjects' },
                                ...subjects.map((subject) => ({
                                    value: String(subject.id),
                                    label: subject.name,
                                })),
                            ]}
                        />
                    )}

                    <Select
                        label="Cohort"
                        value={cohortFilter}
                        onChange={(event) => setCohortFilter(event.target.value)}
                        options={[
                            { value: '', label: 'All cohorts' },
                            ...availableCohortOptions.map((cohort) => ({
                                value: String(cohort.id),
                                label: cohort.name,
                            })),
                        ]}
                    />

                    {showInstitutionSupervision && viewMode === 'admin_supervision' ? (
                        <Select
                            label="Instructor"
                            value={instructorFilter}
                            onChange={(event) => setInstructorFilter(event.target.value)}
                            options={[
                                { value: '', label: 'All instructors' },
                                ...instructorOptions,
                            ]}
                        />
                    ) : null}
                </div>
            </Card>

            {lessonPlans.length === 0 && !hasServerFilters && !search ? (
                <Card>
                    <div className="py-12 text-center">
                        <FileText className="mx-auto h-12 w-12 text-gray-400" />
                        <h2 className="mt-3 text-base font-semibold text-gray-900">
                            {effectiveMyTeachingMode
                                ? 'No lesson preparations yet'
                                    : supervisionOnlyAdmin && !isSelfManagedTeaching
                                    ? 'No lesson plans have been prepared yet.'
                                    : 'No lesson plans yet'}
                        </h2>
                        <p className="mt-2 text-sm text-gray-500">
                            {effectiveMyTeachingMode
                                ? 'Start by choosing one of your assigned class subjects and the outcomes you want to teach.'
                                : supervisionOnlyAdmin && !isSelfManagedTeaching
                                    ? 'Lesson plans will appear here after instructors prepare them.'
                                    : 'No lesson plans yet. Start by planning what you are preparing to teach.'}
                        </p>
                        {canCreateLessonPlan && canCreateTeachingRecords && !midtermBreakPausesCreation ? (
                            <Link href={createLessonPlanHref}>
                                <Button className="mt-4">
                                    <Plus className="mr-2 h-4 w-4" />
                                    {createButtonLabel}
                                </Button>
                            </Link>
                        ) : midtermBreakPausesCreation ? (
                            <p className="mt-4 text-sm text-gray-500">
                                New normal teaching work resumes after the break.
                            </p>
                        ) : supervisionOnlyAdmin && !isSelfManagedTeaching ? (
                            <p className="mt-4 text-sm text-gray-500">
                                Lesson plans will appear here after instructors prepare them.
                            </p>
                        ) : (
                            <Button className="mt-4" disabled>
                                <Plus className="mr-2 h-4 w-4" />
                                {createButtonLabel}
                            </Button>
                        )}
                    </div>
                </Card>
            ) : filteredLessonPlans.length === 0 ? (
                <Card>
                    <div className="py-12 text-center">
                        <FileText className="mx-auto h-12 w-12 text-gray-400" />
                        <h2 className="mt-3 text-base font-semibold text-gray-900">
                            {effectiveMyTeachingMode ? 'No matching lesson preparations' : 'No matching lesson plans'}
                        </h2>
                        <p className="mt-2 text-sm text-gray-500">
                            {effectiveMyTeachingMode
                                ? 'No lesson plans match your My Teaching view yet.'
                                : 'Adjust the search or filters to find a different lesson plan.'}
                        </p>
                    </div>
                </Card>
            ) : useGroupedLessonPlanView ? (
                <div className="space-y-6 pb-24">
                    {groupedLessonPlans.map((group) => (
                        <section key={group.key} className="space-y-4">
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                                <div>
                                    <h2 className="text-lg font-semibold text-gray-900">{group.label}</h2>
                                    <p className="text-sm text-gray-500">{group.description}</p>
                                </div>
                                <Badge variant="blue" size="sm">
                                    {group.itemCount} lesson plan{group.itemCount === 1 ? '' : 's'}
                                </Badge>
                            </div>

                            {group.sections.map((section) => (
                                <div key={section.key} className="space-y-4 rounded-xl border border-gray-200 bg-gray-50/50 p-4">
                                    <div className="space-y-1">
                                        <h3 className="text-sm font-semibold text-gray-900">{section.label}</h3>
                                        <p className="text-sm text-gray-500">{section.description}</p>
                                    </div>

                                    <div className="space-y-4">
                                        {section.items.map(renderLessonPlanCard)}
                                    </div>
                                </div>
                            ))}
                        </section>
                    ))}
                </div>
            ) : (
                <div className="space-y-4 pb-24">
                    {filteredLessonPlans.map(renderLessonPlanCard)}
                </div>
            )}

            <Modal
                isOpen={isMarkUsedOpen}
                onClose={() => {
                    closeMarkUsed();
                    setReflection('');
                    setMarkUsedError(null);
                }}
                title="Post-lesson closure"
                size="md"
            >
                <form onSubmit={handleSubmitMarkUsed} className="space-y-4">
                    <p className="text-sm text-gray-600">
                        Record the post-lesson reflection after teaching. The backend remains authoritative for the final state.
                    </p>

                    <div className="space-y-1">
                        <label className="block text-sm font-medium text-gray-700">Post-lesson reflection</label>
                        <textarea
                            value={reflection}
                            onChange={(event) => setReflection(event.target.value)}
                            rows={6}
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Reflection after teaching"
                        />
                    </div>

                    {markUsedError ? (
                        <ErrorBanner
                            message={markUsedError}
                            onDismiss={() => setMarkUsedError(null)}
                            autoDismissMs={5000}
                            compact
                        />
                    ) : null}

                    <div className="flex flex-wrap justify-end gap-3">
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={() => {
                                closeMarkUsed();
                                setReflection('');
                                setMarkUsedError(null);
                            }}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={!markUsedTarget || pendingActionKey === actionKey(markUsedTarget.id, 'used')}
                        >
                            Save closure
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
