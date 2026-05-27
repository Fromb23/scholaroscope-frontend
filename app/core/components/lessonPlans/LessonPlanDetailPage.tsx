'use client';

import type { FormEvent } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams, usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
    AlertTriangle,
    ArrowLeft,
    CalendarDays,
    Clock3,
    Download,
    Edit,
    FilePlus2,
    Link2,
    RotateCcw,
    Users,
} from 'lucide-react';
import { ActionMenu } from '@/app/components/ui/ActionMenu';
import { Badge } from '@/app/components/ui/Badge';
import { Button } from '@/app/components/ui/Button';
import { Card } from '@/app/components/ui/Card';
import { ErrorBanner } from '@/app/components/ui/ErrorBanner';
import { ErrorState } from '@/app/components/ui/ErrorState';
import { LoadingSpinner } from '@/app/components/ui/LoadingSpinner';
import Modal from '@/app/components/ui/Modal';
import { Input } from '@/app/components/ui/Input';
import { Select } from '@/app/components/ui/Select';
import { LessonPlanReferences } from '@/app/core/components/lessonPlans/LessonPlanReferences';
import { LessonPlanSections } from '@/app/core/components/lessonPlans/LessonPlanSections';
import { LessonPlanStatusBadge } from '@/app/core/components/lessonPlans/LessonPlanStatusBadge';
import {
    usePrepareAssignmentFromLessonPlan,
    usePreparedAssignmentsForLessonPlan,
} from '@/app/core/hooks/useAssignments';
import {
    useAvailableLessonPlanParticipatingCohortSubjects,
    useLessonPlanDetail,
} from '@/app/core/hooks/useLessonPlans';
import {
    canArchiveLessonPlan,
    canMarkLessonPlanReviewed,
    canMarkLessonPlanUsed,
    canPrepareAssignmentDraft,
    canScheduleLesson,
    canRestoreLessonPlan,
    SCHEDULE_LESSON_SESSION_TYPE_OPTIONS,
    type AvailableLessonPlanParticipatingCohortSubject,
    type LessonPlan,
    type ScheduleLessonSessionType,
} from '@/app/core/types/lessonPlans';
import { useAuth } from '@/app/context/AuthContext';
import { useAssistantPageContext } from '@/app/core/components/assistant/useAssistantPageContext';

function getLessonPlanId(params: ReturnType<typeof useParams>): number | null {
    const rawId = params.id;
    const resolvedId = Array.isArray(rawId) ? rawId[0] : rawId;
    const numericId = Number(resolvedId);

    return Number.isFinite(numericId) ? numericId : null;
}

function formatDate(value: string | null): string {
    if (!value) {
        return 'Not scheduled';
    }

    return new Date(value).toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    });
}

function formatTime(value: string | null): string {
    if (!value) {
        return 'Not set';
    }

    const [hours = '0', minutes = '0'] = value.split(':');
    const formatted = new Date();
    formatted.setHours(Number(hours), Number(minutes), 0, 0);

    return formatted.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
    });
}

function formatTimestamp(value: string | null): string {
    if (!value) {
        return 'Not recorded';
    }

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

function getScheduledDateValue(lessonPlan: LessonPlan): string | null {
    return lessonPlan.session_date ?? lessonPlan.planned_date;
}

function getLinkedLessonLabel(lessonPlan: LessonPlan): string {
    if (lessonPlan.session_title?.trim()) {
        return lessonPlan.session_title;
    }

    if (lessonPlan.session) {
        return `Lesson ${lessonPlan.session}`;
    }

    return 'Not scheduled yet';
}

function formatLearnerCount(count: number): string {
    return `${count} learner${count === 1 ? '' : 's'}`;
}

function buildLessonTaskTitle(lessonPlan: LessonPlan): string {
    const baseTitle = lessonPlan.title?.trim() || 'Lesson task';
    return `${baseTitle} Learner Task`;
}

function buildLessonTaskInstructions(lessonPlan: LessonPlan): string {
    const sections: string[] = [];

    if (lessonPlan.objectives.length > 0) {
        sections.push(
            `Objectives:\n${lessonPlan.objectives.map((objective) => `- ${objective}`).join('\n')}`
        );
    }

    if (lessonPlan.assessment_strategy?.trim()) {
        sections.push(`Assessment strategy:\n${lessonPlan.assessment_strategy.trim()}`);
    }

    return sections.join('\n\n').trim();
}

export function LessonPlanDetailPage() {
    const params = useParams();
    const pathname = usePathname();
    const router = useRouter();
    const searchParams = useSearchParams();
    const { activeRole } = useAuth();
    const isInstructor = activeRole === 'INSTRUCTOR';
    const lessonPlanId = getLessonPlanId(params);
    const {
        lessonPlan,
        loading,
        error,
        refetch,
        markReviewed,
        markUsed,
        archive,
        restore,
        scheduleLesson,
        exportPdf,
    } = useLessonPlanDetail(lessonPlanId);
    const prepareAssignmentMutation = usePrepareAssignmentFromLessonPlan();
    const {
        draft: preparedAssignmentDraft,
        issued: issuedAssignments,
    } = usePreparedAssignmentsForLessonPlan(lessonPlanId, {
        enabled: Boolean(lessonPlanId),
    });
    const [pendingActionKey, setPendingActionKey] = useState<string | null>(null);
    const [actionError, setActionError] = useState<string | null>(null);
    const [actionSuccess, setActionSuccess] = useState<string | null>(null);
    const [markUsedOpen, setMarkUsedOpen] = useState(false);
    const [markUsedError, setMarkUsedError] = useState<string | null>(null);
    const [reflection, setReflection] = useState('');
    const [scheduleOpen, setScheduleOpen] = useState(false);
    const [scheduleError, setScheduleError] = useState<string | null>(null);
    const [transientNotice, setTransientNotice] = useState<string | null>(null);
    const learnerTaskSectionRef = useRef<HTMLDivElement | null>(null);
    const [learnerTaskOpen, setLearnerTaskOpen] = useState(false);
    const [learnerTaskChoice, setLearnerTaskChoice] = useState<'none' | 'prepare' | 'existing'>('none');
    const [learnerTaskType, setLearnerTaskType] = useState<'class_exercise' | 'homework' | 'group_activity'>('class_exercise');
    const [learnerTaskTitle, setLearnerTaskTitle] = useState('');
    const [learnerTaskInstructions, setLearnerTaskInstructions] = useState('');
    const [learnerTaskDueAt, setLearnerTaskDueAt] = useState('');
    const [learnerTaskError, setLearnerTaskError] = useState<string | null>(null);
    const [learnerTaskSuccess, setLearnerTaskSuccess] = useState<string | null>(null);
    const [highlightedAssignmentId, setHighlightedAssignmentId] = useState<number | null>(null);
    const [scheduleForm, setScheduleForm] = useState<{
        session_date: string;
        start_time: string;
        end_time: string;
        session_type: ScheduleLessonSessionType;
        venue: string;
        description: string;
        participating_cohort_subject_ids: number[];
    }>({
        session_date: '',
        start_time: '',
        end_time: '',
        session_type: 'LESSON',
        venue: '',
        description: '',
        participating_cohort_subject_ids: [],
    });
    const learnerTaskStorageKey = lessonPlanId ? `lesson-plan-learner-task:${lessonPlanId}` : null;
    const {
        data: availableParticipatingCohortData,
        cohortSubjects: availableParticipatingCohortSubjects,
        loading: participatingCohortsLoading,
        error: participatingCohortsError,
        refetch: refetchParticipatingCohorts,
    } = useAvailableLessonPlanParticipatingCohortSubjects(
        lessonPlanId,
        scheduleOpen && Boolean(lessonPlan) && !lessonPlan?.session,
    );
    const availableParticipatingCohortIds = useMemo(
        () => new Set(availableParticipatingCohortSubjects.map((item) => item.cohort_subject_id)),
        [availableParticipatingCohortSubjects]
    );
    const selectedParticipatingCohortSubjects = useMemo(
        () => availableParticipatingCohortSubjects.filter((item) => (
            scheduleForm.participating_cohort_subject_ids.includes(item.cohort_subject_id)
        )),
        [availableParticipatingCohortSubjects, scheduleForm.participating_cohort_subject_ids]
    );

    useEffect(() => {
        setScheduleForm((current) => {
            const nextSelectedIds = current.participating_cohort_subject_ids.filter((id) => (
                availableParticipatingCohortIds.has(id)
            ));

            if (nextSelectedIds.length === current.participating_cohort_subject_ids.length) {
                return current;
            }

            return {
                ...current,
                participating_cohort_subject_ids: nextSelectedIds,
            };
        });
    }, [availableParticipatingCohortIds]);

    const noticeMessage = useMemo(() => {
        const notice = searchParams.get('notice');
        const mode = searchParams.get('mode');
        const referencesCount = Number(searchParams.get('references') ?? '0');
        const referencesLabel = `${referencesCount} reference${
            referencesCount === 1 ? '' : 's'
        } selected.`;

        if (notice === 'generated') {
            return mode === 'ai'
                ? `AI-assisted lesson plan generated from selected outcomes and references. ${referencesLabel}`
                : `Lesson plan generated from selected outcomes and references. ${referencesLabel}`;
        }

        if (notice === 'existing') {
            return mode === 'ai'
                ? `Existing AI-assisted lesson plan opened. ${referencesLabel}`
                : `Existing lesson plan opened. ${referencesLabel}`;
        }

        if (notice === 'updated') {
            return 'Lesson plan updated.';
        }

        return null;
    }, [searchParams]);

    useEffect(() => {
        if (!noticeMessage) {
            return;
        }

        setTransientNotice(noticeMessage);
        const timer = window.setTimeout(() => {
            setTransientNotice(null);
        }, 4000);

        return () => {
            window.clearTimeout(timer);
        };
    }, [noticeMessage]);

    useEffect(() => {
        const notice = searchParams.get('notice');
        if (!notice || !pathname) {
            return;
        }

        const nextSearchParams = new URLSearchParams(searchParams.toString());
        nextSearchParams.delete('notice');

        if (notice === 'generated' || notice === 'existing') {
            nextSearchParams.delete('mode');
            nextSearchParams.delete('references');
        }

        const nextUrl = nextSearchParams.toString()
            ? `${pathname}?${nextSearchParams.toString()}`
            : pathname;

        router.replace(nextUrl, { scroll: false });
    }, [pathname, router, searchParams]);

    const latestPreparedAssignment = preparedAssignmentDraft ?? issuedAssignments[0] ?? null;
    const hasPreparedAssignment = Boolean(latestPreparedAssignment);

    useEffect(() => {
        if (!lessonPlan) {
            return;
        }

        const storedDraft = learnerTaskStorageKey
            ? window.sessionStorage.getItem(learnerTaskStorageKey)
            : null;

        if (storedDraft) {
            try {
                const parsed = JSON.parse(storedDraft) as {
                    title?: string;
                    instructions?: string;
                    dueAt?: string;
                    type?: 'class_exercise' | 'homework' | 'group_activity';
                    choice?: 'none' | 'prepare' | 'existing';
                    open?: boolean;
                };
                setLearnerTaskTitle(parsed.title ?? buildLessonTaskTitle(lessonPlan));
                setLearnerTaskInstructions(parsed.instructions ?? buildLessonTaskInstructions(lessonPlan));
                setLearnerTaskDueAt(parsed.dueAt ?? '');
                setLearnerTaskType(parsed.type ?? 'class_exercise');
                setLearnerTaskChoice(
                    parsed.choice ?? (hasPreparedAssignment ? 'existing' : 'none')
                );
                setLearnerTaskOpen(searchParams.get('section') === 'learner-task');
                return;
            } catch {
                window.sessionStorage.removeItem(learnerTaskStorageKey ?? '');
            }
        }

        setLearnerTaskTitle(preparedAssignmentDraft?.title ?? buildLessonTaskTitle(lessonPlan));
        setLearnerTaskInstructions(
            preparedAssignmentDraft?.instructions ?? buildLessonTaskInstructions(lessonPlan)
        );
        setLearnerTaskDueAt(preparedAssignmentDraft?.due_at ? preparedAssignmentDraft.due_at.slice(0, 16) : '');
        setLearnerTaskType(preparedAssignmentDraft?.delivery_mode === 'GROUP' ? 'group_activity' : 'class_exercise');
        setLearnerTaskChoice(hasPreparedAssignment ? 'existing' : 'none');
        setLearnerTaskOpen(searchParams.get('section') === 'learner-task');
    }, [
        hasPreparedAssignment,
        learnerTaskStorageKey,
        lessonPlan,
        preparedAssignmentDraft?.delivery_mode,
        preparedAssignmentDraft?.due_at,
        preparedAssignmentDraft?.instructions,
        preparedAssignmentDraft?.title,
        searchParams,
    ]);

    useEffect(() => {
        if (!learnerTaskStorageKey || !lessonPlan) {
            return;
        }

        window.sessionStorage.setItem(
            learnerTaskStorageKey,
            JSON.stringify({
                choice: learnerTaskChoice,
                open: learnerTaskOpen,
                title: learnerTaskTitle,
                instructions: learnerTaskInstructions,
                dueAt: learnerTaskDueAt,
                type: learnerTaskType,
            })
        );
    }, [
        learnerTaskChoice,
        learnerTaskDueAt,
        learnerTaskInstructions,
        learnerTaskOpen,
        learnerTaskStorageKey,
        learnerTaskTitle,
        learnerTaskType,
        lessonPlan,
    ]);

    useEffect(() => {
        const section = searchParams.get('section');
        if (section !== 'learner-task') {
            return;
        }

        setLearnerTaskOpen(true);
        const timer = window.setTimeout(() => {
            learnerTaskSectionRef.current?.scrollIntoView({
                behavior: 'smooth',
                block: 'start',
            });
        }, 100);

        return () => window.clearTimeout(timer);
    }, [searchParams]);

    useEffect(() => {
        const highlightValue = Number(searchParams.get('highlightAssignment') ?? '');
        if (!Number.isFinite(highlightValue) || highlightValue <= 0) {
            return;
        }

        setHighlightedAssignmentId(highlightValue);
        const timer = window.setTimeout(() => {
            setHighlightedAssignmentId(null);
        }, 5000);

        return () => window.clearTimeout(timer);
    }, [searchParams]);

    const openLearnerTaskSection = useCallback(() => {
        setLearnerTaskChoice(hasPreparedAssignment ? 'existing' : 'prepare');
        setLearnerTaskOpen(true);
        setTimeout(() => {
            learnerTaskSectionRef.current?.scrollIntoView({
                behavior: 'smooth',
                block: 'start',
            });
        }, 50);
    }, [hasPreparedAssignment]);
    const closeLearnerTaskSection = useCallback(() => {
        setLearnerTaskOpen(false);
        setLearnerTaskError(null);
        setLearnerTaskSuccess(null);
    }, []);

    const handleSimpleAction = async (action: 'reviewed' | 'archived' | 'restored') => {
        if (!lessonPlan) {
            return;
        }

        setPendingActionKey(actionKey(lessonPlan.id, action));
        setActionError(null);
        setActionSuccess(null);

        try {
            if (action === 'reviewed') {
                await markReviewed();
                setActionSuccess('Lesson plan marked as reviewed.');
            } else if (action === 'archived') {
                await archive();
                setActionSuccess('Lesson plan archived.');
            } else {
                await restore();
                setActionSuccess('Lesson plan restored.');
            }
        } catch (err) {
            setActionError(err instanceof Error ? err.message : 'Action failed.');
        } finally {
            setPendingActionKey(null);
        }
    };

    const handleOpenMarkUsed = () => {
        if (!lessonPlan) {
            return;
        }

        setReflection(lessonPlan.reflection ?? '');
        setActionError(null);
        setActionSuccess(null);
        setMarkUsedError(null);
        setMarkUsedOpen(true);
    };

    const handleOpenSchedule = useCallback(() => {
        if (!lessonPlan) {
            return;
        }

        setScheduleForm({
            session_date: lessonPlan.planned_date ?? lessonPlan.session_date ?? '',
            start_time: lessonPlan.planned_start_time ?? '',
            end_time: lessonPlan.planned_end_time ?? '',
            session_type: 'LESSON',
            venue: '',
            description: '',
            participating_cohort_subject_ids: [],
        });
        setActionError(null);
        setActionSuccess(null);
        setScheduleError(null);
        setScheduleOpen(true);
    }, [lessonPlan]);

    const handleSaveLearnerTask = async () => {
        if (!lessonPlan) {
            return;
        }

        setPendingActionKey(actionKey(lessonPlan.id, 'learner-task'));
        setLearnerTaskError(null);
        setLearnerTaskSuccess(null);

        try {
            const response = await prepareAssignmentMutation.mutateAsync({
                lessonPlanId: lessonPlan.id,
                data: {
                    title: learnerTaskTitle.trim() || undefined,
                    instructions: learnerTaskInstructions.trim() || undefined,
                    due_at: learnerTaskDueAt ? new Date(learnerTaskDueAt).toISOString() : null,
                    delivery_mode: learnerTaskType === 'group_activity' ? 'GROUP' : 'INDIVIDUAL',
                },
            });
            setLearnerTaskChoice('existing');
            setLearnerTaskOpen(false);
            setLearnerTaskSuccess(
                `${response.detail} It can be issued at the end of the lesson.`
            );
            setHighlightedAssignmentId(response.assignment.id);
            if (learnerTaskStorageKey) {
                window.sessionStorage.removeItem(learnerTaskStorageKey);
            }
        } catch (err) {
            setLearnerTaskError(
                err instanceof Error
                    ? err.message
                    : 'We could not prepare a learner task for this lesson.'
            );
        } finally {
            setPendingActionKey(null);
        }
    };

    const handleExportPdf = async () => {
        if (!lessonPlan) {
            return;
        }

        setPendingActionKey(actionKey(lessonPlan.id, 'export-pdf'));
        setActionError(null);
        setActionSuccess(null);

        try {
            await exportPdf();
        } catch (err) {
            setActionError(
                err instanceof Error
                    ? err.message
                    : 'Could not export the lesson plan PDF.'
            );
        } finally {
            setPendingActionKey(null);
        }
    };

    const handleSubmitMarkUsed = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (!lessonPlan) {
            return;
        }

        setPendingActionKey(actionKey(lessonPlan.id, 'used'));
        setActionSuccess(null);
        setMarkUsedError(null);

        try {
            await markUsed({ reflection: reflection.trim() });
            setMarkUsedOpen(false);
            setReflection('');
            setActionSuccess('Lesson plan marked as used.');
        } catch (err) {
            setMarkUsedError(err instanceof Error ? err.message : 'Action failed.');
        } finally {
            setPendingActionKey(null);
        }
    };

    const handleSubmitSchedule = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (!lessonPlan) {
            return;
        }

        setPendingActionKey(actionKey(lessonPlan.id, 'scheduled'));
        setActionSuccess(null);
        setScheduleError(null);

        try {
            const response = await scheduleLesson({
                session_date: scheduleForm.session_date,
                start_time: scheduleForm.start_time,
                end_time: scheduleForm.end_time,
                session_type: scheduleForm.session_type,
                venue: scheduleForm.venue.trim() || undefined,
                description: scheduleForm.description.trim() || undefined,
                participating_cohort_subject_ids: scheduleForm.participating_cohort_subject_ids,
            });
            await refetch();
            setScheduleOpen(false);
            setActionSuccess(
                response.session.id
                    ? 'Lesson scheduled. The lesson link and participating classes have been refreshed.'
                    : 'Lesson scheduled.'
            );
        } catch (err) {
            setScheduleError(err instanceof Error ? err.message : 'Action failed.');
        } finally {
            setPendingActionKey(null);
        }
    };

    const toggleParticipatingCohortSelection = (
        cohortSubject: AvailableLessonPlanParticipatingCohortSubject
    ) => {
        setScheduleForm((current) => {
            const alreadySelected = current.participating_cohort_subject_ids.includes(
                cohortSubject.cohort_subject_id
            );

            return {
                ...current,
                participating_cohort_subject_ids: alreadySelected
                    ? current.participating_cohort_subject_ids.filter(
                        (id) => id !== cohortSubject.cohort_subject_id
                    )
                    : [...current.participating_cohort_subject_ids, cohortSubject.cohort_subject_id],
            };
        });
    };
    const assistantContext = useMemo(() => ({
        pageKey: 'lesson_plan_detail',
        pageTitle: isInstructor ? 'Lesson Preparation' : 'Lesson Plan',
        state: {
            is_loading: loading,
            status: lessonPlan?.status ?? null,
            has_session: Boolean(lessonPlan?.session),
            can_schedule: lessonPlan ? canScheduleLesson(lessonPlan.status) : false,
            has_prepared_task: hasPreparedAssignment,
        },
        visibleActions: [
            ...(lessonPlan && canPrepareAssignmentDraft(lessonPlan.status)
                ? [{
                    label: 'Prepare learner task',
                    type: 'page_action' as const,
                    target: 'open_learner_task_section',
                    handler: openLearnerTaskSection,
                }]
                : []),
            ...(lessonPlan && canScheduleLesson(lessonPlan.status) && !lessonPlan.session
                ? [{
                    label: 'Schedule this lesson',
                    type: 'page_action' as const,
                    target: 'open_schedule_modal',
                    handler: handleOpenSchedule,
                }]
                : []),
            ...(lessonPlan?.session
                ? [{
                    label: 'Open linked lesson',
                    type: 'navigate' as const,
                    href: `/sessions/${lessonPlan.session}`,
                }]
                : []),
        ],
        nextSafeAction: lessonPlan && canPrepareAssignmentDraft(lessonPlan.status) && !hasPreparedAssignment
            ? {
                label: 'Prepare learner task',
                type: 'page_action' as const,
                target: 'open_learner_task_section',
                handler: openLearnerTaskSection,
            }
            : lessonPlan && canScheduleLesson(lessonPlan.status) && !lessonPlan.session
            ? {
                label: 'Schedule this lesson',
                type: 'page_action' as const,
                target: 'open_schedule_modal',
                handler: handleOpenSchedule,
            }
            : (lessonPlan?.session
                ? {
                    label: 'Open linked lesson',
                    type: 'navigate' as const,
                    href: `/sessions/${lessonPlan.session}`,
                }
                : undefined),
        workflowStep: lessonPlan?.session ? 'scheduled' : 'lesson_preparation',
        emptyStateReason: !loading && !lessonPlan
            ? 'This lesson plan could not be loaded.'
            : undefined,
    }), [
        handleOpenSchedule,
        hasPreparedAssignment,
        isInstructor,
        lessonPlan,
        loading,
        openLearnerTaskSection,
    ]);

    useAssistantPageContext(assistantContext);

    if (loading && !lessonPlan) {
        return <LoadingSpinner message="Loading lesson plan..." fullScreen={false} />;
    }

    if (error) {
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

    if (!lessonPlan) {
        return (
            <ErrorState
                fullScreen={false}
                message="This lesson plan could not be found."
            />
        );
    }

    const learnerTaskReturnTo = latestPreparedAssignment
        ? `/lesson-plans/${lessonPlan.id}?section=learner-task&highlightAssignment=${latestPreparedAssignment.id}`
        : `/lesson-plans/${lessonPlan.id}?section=learner-task`;
    const currentActionPrimary = !hasPreparedAssignment && canPrepareAssignmentDraft(lessonPlan.status)
        ? {
            label: 'Prepare learner task',
            onClick: openLearnerTaskSection,
            icon: <FilePlus2 className="mr-1.5 h-4 w-4" />,
        }
        : canScheduleLesson(lessonPlan.status)
            ? {
                label: 'Schedule this lesson',
                onClick: handleOpenSchedule,
                icon: <CalendarDays className="mr-1.5 h-4 w-4" />,
            }
            : lessonPlan.session
                ? {
                    label: 'Open scheduled lesson',
                    href: `/sessions/${lessonPlan.session}`,
                    icon: <Link2 className="mr-1.5 h-4 w-4" />,
                }
                : hasPreparedAssignment && canPrepareAssignmentDraft(lessonPlan.status)
                    ? {
                        label: 'Review learner task',
                        onClick: openLearnerTaskSection,
                        icon: <FilePlus2 className="mr-1.5 h-4 w-4" />,
                    }
                    : null;
    const learnerTaskStatus = latestPreparedAssignment
        ? latestPreparedAssignment.status === 'DRAFT'
            ? 'Prepared'
            : 'Issued'
        : learnerTaskChoice === 'prepare'
            ? 'Draft in progress'
            : 'Not prepared';

    return (
        <div className="space-y-6">
            <div className="space-y-3">
                <Link href="/lesson-plans">
                    <Button variant="ghost" size="sm">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        {isInstructor ? 'Back to Lesson Preparation' : 'Back'}
                    </Button>
                </Link>

                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                            <h1 className="text-2xl font-semibold text-gray-900">{lessonPlan.title}</h1>
                            <LessonPlanStatusBadge status={lessonPlan.status} />
                            {lessonPlan.generated_by_ai ? (
                                <span className="rounded-full bg-purple-50 px-2.5 py-1 text-xs font-medium text-purple-700">
                                    AI generated
                                </span>
                            ) : null}
                        </div>
                        <p className="text-gray-600">
                            {getLinkedLessonLabel(lessonPlan)}
                        </p>
                    </div>

                    <div className="print:hidden">
                        <ActionMenu
                            items={[
                                {
                                    label: 'Edit',
                                    href: `/lesson-plans/${lessonPlan.id}/edit`,
                                    icon: <Edit className="h-4 w-4" />,
                                },
                                {
                                    label: pendingActionKey === actionKey(lessonPlan.id, 'export-pdf')
                                        ? 'Downloading...'
                                        : isInstructor
                                            ? 'Download lesson plan'
                                            : 'Download PDF',
                                    onSelect: () => {
                                        void handleExportPdf();
                                    },
                                    disabled: pendingActionKey === actionKey(lessonPlan.id, 'export-pdf'),
                                    icon: <Download className="h-4 w-4" />,
                                },
                                ...(canMarkLessonPlanReviewed(lessonPlan.status) ? [{
                                    label: 'Mark Reviewed',
                                    onSelect: () => {
                                        void handleSimpleAction('reviewed');
                                    },
                                    disabled: pendingActionKey === actionKey(lessonPlan.id, 'reviewed'),
                                }] : []),
                                ...(canMarkLessonPlanUsed(lessonPlan.status) ? [{
                                    label: 'Mark Used',
                                    onSelect: handleOpenMarkUsed,
                                    disabled: pendingActionKey === actionKey(lessonPlan.id, 'used'),
                                }] : []),
                                ...(canArchiveLessonPlan(lessonPlan.status) ? [{
                                    label: 'Archive',
                                    onSelect: () => {
                                        void handleSimpleAction('archived');
                                    },
                                    disabled: pendingActionKey === actionKey(lessonPlan.id, 'archived'),
                                    destructive: true,
                                }] : []),
                                ...(canRestoreLessonPlan(lessonPlan.status) ? [{
                                    label: 'Restore',
                                    onSelect: () => {
                                        void handleSimpleAction('restored');
                                    },
                                    disabled: pendingActionKey === actionKey(lessonPlan.id, 'restored'),
                                    icon: <RotateCcw className="h-4 w-4" />,
                                }] : []),
                            ]}
                        />
                    </div>
                </div>
            </div>

            {transientNotice ? (
                <ErrorBanner
                    message={transientNotice}
                    variant="success"
                    autoDismissMs={4000}
                    onDismiss={() => setTransientNotice(null)}
                />
            ) : null}

            {actionError ? (
                <ErrorBanner
                    message={actionError}
                    onDismiss={() => setActionError(null)}
                    autoDismissMs={5000}
                />
            ) : null}

            {actionSuccess ? (
                <ErrorBanner
                    message={actionSuccess}
                    variant="success"
                    onDismiss={() => setActionSuccess(null)}
                    autoDismissMs={4000}
                />
            ) : null}

            <Card>
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-2">
                        <h2 className="text-lg font-semibold text-gray-900">
                            {!hasPreparedAssignment && canPrepareAssignmentDraft(lessonPlan.status)
                                ? 'Next step: prepare learner task'
                                : canScheduleLesson(lessonPlan.status)
                                    ? 'Next step: schedule this lesson'
                                    : lessonPlan.status === 'USED'
                                        ? 'Post-lesson follow-up'
                                        : lessonPlan.session
                                            ? 'Next step: use this plan in class'
                                            : 'Lesson preparation is ready'}
                        </h2>
                        <p className="text-sm text-gray-600">
                            {!hasPreparedAssignment && canPrepareAssignmentDraft(lessonPlan.status)
                                ? 'Plan the learner task now so class time stays focused on attendance, teaching, and the final issue step.'
                                : canScheduleLesson(lessonPlan.status)
                                    ? 'Choose when this lesson should happen so it appears in your teaching day.'
                                    : lessonPlan.status === 'USED'
                                        ? 'This lesson preparation has already been used in class. Reopen the lesson or download the plan for follow-up work.'
                                        : lessonPlan.session
                                            ? 'This lesson preparation is already linked to a scheduled lesson. Open it when you are ready to teach.'
                                            : 'Review the plan, then continue with your next teaching action.'}
                        </p>
                    </div>

                    {currentActionPrimary ? (
                        'href' in currentActionPrimary && currentActionPrimary.href ? (
                            <Link href={currentActionPrimary.href} className="w-full lg:w-auto">
                                <Button className="w-full lg:w-auto">
                                    {currentActionPrimary.icon}
                                    {currentActionPrimary.label}
                                </Button>
                            </Link>
                        ) : (
                            <Button
                                className="w-full lg:w-auto"
                                onClick={currentActionPrimary.onClick}
                                disabled={currentActionPrimary.label === 'Schedule this lesson' && pendingActionKey === actionKey(lessonPlan.id, 'scheduled')}
                            >
                                {currentActionPrimary.icon}
                                {currentActionPrimary.label}
                            </Button>
                        )
                    ) : null}
                </div>
            </Card>

            <div ref={learnerTaskSectionRef} id="learner-task" className="scroll-mt-24">
                <Card className={highlightedAssignmentId && latestPreparedAssignment?.id === highlightedAssignmentId ? 'border-blue-300 bg-blue-50/50' : undefined}>
                    <div className="space-y-5">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div className="space-y-2">
                                <div className="flex flex-wrap items-center gap-2">
                                    <h2 className="text-lg font-semibold text-gray-900">Learner task</h2>
                                    <Badge
                                        variant={
                                            learnerTaskStatus === 'Issued'
                                                ? 'green'
                                                : learnerTaskStatus === 'Prepared'
                                                    ? 'blue'
                                                    : learnerTaskStatus === 'Draft in progress'
                                                        ? 'yellow'
                                                        : 'default'
                                        }
                                    >
                                        {learnerTaskStatus}
                                    </Badge>
                                </div>
                                <p className="text-sm text-gray-600">
                                    {latestPreparedAssignment
                                        ? latestPreparedAssignment.status === 'DRAFT'
                                            ? 'Prepared now and ready to issue after the lesson.'
                                            : 'Already part of the learner follow-up flow.'
                                        : learnerTaskChoice === 'prepare'
                                            ? 'A draft is in progress for this lesson.'
                                            : 'No learner task is prepared for this lesson yet.'}
                                </p>
                            </div>

                            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                                <Button
                                    type="button"
                                    variant="secondary"
                                    size="sm"
                                    className="w-full sm:w-auto"
                                    onClick={() => {
                                        if (learnerTaskOpen) {
                                            closeLearnerTaskSection();
                                        } else {
                                            openLearnerTaskSection();
                                        }
                                    }}
                                >
                                    {learnerTaskOpen ? 'Collapse' : latestPreparedAssignment ? 'Review' : 'Expand'}
                                </Button>
                                {latestPreparedAssignment ? (
                                    <Link
                                        href={`/academic/cohorts/${latestPreparedAssignment.cohort_id}/assignments/${latestPreparedAssignment.id}?${new URLSearchParams({
                                            returnTo: learnerTaskReturnTo,
                                        }).toString()}`}
                                        className="w-full sm:w-auto"
                                    >
                                        <Button variant="ghost" size="sm" className="w-full sm:w-auto">
                                            <Link2 className="mr-1.5 h-4 w-4" />
                                            Open learner task
                                        </Button>
                                    </Link>
                                ) : null}
                            </div>
                        </div>

                        {learnerTaskError ? (
                            <ErrorBanner
                                message={learnerTaskError}
                                onDismiss={() => setLearnerTaskError(null)}
                                autoDismissMs={5000}
                            />
                        ) : null}

                        {learnerTaskSuccess ? (
                            <ErrorBanner
                                message={learnerTaskSuccess}
                                variant="success"
                                onDismiss={() => setLearnerTaskSuccess(null)}
                                autoDismissMs={4000}
                            />
                        ) : null}

                        {latestPreparedAssignment ? (
                            <div className={`rounded-lg border px-4 py-3 text-sm ${
                                latestPreparedAssignment.status === 'DRAFT'
                                    ? 'border-blue-200 bg-blue-50 text-blue-800'
                                    : 'border-green-200 bg-green-50 text-green-800'
                            }`}>
                                <div className="font-medium">
                                    {latestPreparedAssignment.status === 'DRAFT'
                                        ? 'Learner task prepared'
                                        : 'Learner task already issued'}
                                </div>
                                <div className="mt-1">
                                    {latestPreparedAssignment.title}
                                    {latestPreparedAssignment.status === 'DRAFT'
                                        ? ' can be issued at the end of the lesson.'
                                        : ' is already part of the learner follow-up flow.'}
                                </div>
                            </div>
                        ) : null}

                        {learnerTaskOpen ? (
                            <div className="space-y-4 rounded-lg border border-gray-200 p-4">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="space-y-1">
                                        <h3 className="text-sm font-semibold text-gray-900">Review learner task setup</h3>
                                        <p className="text-sm text-gray-600">
                                            Keep this compact until you choose to prepare or review the task details.
                                        </p>
                                    </div>
                                    <Button type="button" variant="ghost" size="sm" onClick={closeLearnerTaskSection}>
                                        Collapse
                                    </Button>
                                </div>

                                <Select
                                    label="Learner task"
                                    value={learnerTaskChoice}
                                    onChange={(event) => setLearnerTaskChoice(event.target.value as 'none' | 'prepare' | 'existing')}
                                    options={[
                                        { value: 'none', label: 'Not for this lesson' },
                                        { value: 'prepare', label: 'Prepare learner task' },
                                        { value: 'existing', label: hasPreparedAssignment ? 'Review prepared task' : 'No prepared task yet', disabled: !hasPreparedAssignment },
                                    ]}
                                />

                                {learnerTaskChoice === 'prepare' ? (
                                    <>
                                        <div className="grid gap-4 md:grid-cols-2">
                                            <Input
                                                label="Learner task title"
                                                value={learnerTaskTitle}
                                                onChange={(event) => setLearnerTaskTitle(event.target.value)}
                                                placeholder="Learner task title"
                                            />
                                            <Select
                                                label="Task type"
                                                value={learnerTaskType}
                                                onChange={(event) => setLearnerTaskType(event.target.value as 'class_exercise' | 'homework' | 'group_activity')}
                                                options={[
                                                    { value: 'class_exercise', label: 'Plan class exercise' },
                                                    { value: 'homework', label: 'Plan homework' },
                                                    { value: 'group_activity', label: 'Plan group activity' },
                                                ]}
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <label className="block text-sm font-medium text-gray-700">What should learners do?</label>
                                            <textarea
                                                value={learnerTaskInstructions}
                                                onChange={(event) => setLearnerTaskInstructions(event.target.value)}
                                                rows={5}
                                                placeholder="Describe the learner task."
                                                className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            />
                                        </div>

                                        <div className="grid gap-4 md:grid-cols-2">
                                            <Input
                                                label="Due date"
                                                type="datetime-local"
                                                value={learnerTaskDueAt}
                                                onChange={(event) => setLearnerTaskDueAt(event.target.value)}
                                            />
                                            <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">
                                                Outcomes, class subject, and curriculum context will be attached from this lesson preparation automatically.
                                            </div>
                                        </div>
                                    </>
                                ) : null}

                                <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        onClick={() => {
                                            setLearnerTaskChoice('none');
                                            closeLearnerTaskSection();
                                        }}
                                    >
                                        Not for this lesson
                                    </Button>
                                    {learnerTaskChoice === 'prepare' ? (
                                        <Button
                                            type="button"
                                            onClick={() => {
                                                void handleSaveLearnerTask();
                                            }}
                                            disabled={pendingActionKey === actionKey(lessonPlan.id, 'learner-task')}
                                        >
                                            {pendingActionKey === actionKey(lessonPlan.id, 'learner-task')
                                                ? 'Saving...'
                                                : 'Save learner task'}
                                        </Button>
                                    ) : null}
                                </div>
                            </div>
                        ) : null}
                    </div>
                </Card>
            </div>

            {lessonPlan.status === 'ARCHIVED' ? (
                <div className="rounded-xl border border-orange-200 bg-orange-50 p-3 text-sm text-orange-700">
                    This lesson plan is archived. Restore it to continue using it in active workflows.
                </div>
            ) : null}

            <Card>
                <div className="grid grid-cols-1 gap-4 text-sm md:grid-cols-2 xl:grid-cols-4">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Class Subject</p>
                        <p className="mt-1 font-medium text-gray-900">{lessonPlan.cohort_subject_name || 'Not set'}</p>
                    </div>
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Subject</p>
                        <p className="mt-1 font-medium text-gray-900">{lessonPlan.subject_name || 'Not set'}</p>
                    </div>
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Cohort</p>
                        <p className="mt-1 font-medium text-gray-900">{lessonPlan.cohort_name || 'Not set'}</p>
                    </div>
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Planned For</p>
                        <p className="mt-1 font-medium text-gray-900">
                            {formatDate(getScheduledDateValue(lessonPlan))}
                        </p>
                    </div>
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Term</p>
                        <p className="mt-1 font-medium text-gray-900">{lessonPlan.term_name || 'Not set'}</p>
                    </div>
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Curriculum</p>
                        <p className="mt-1 font-medium text-gray-900">{lessonPlan.curriculum_name || 'Not set'}</p>
                    </div>
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Teacher</p>
                        <p className="mt-1 font-medium text-gray-900">{lessonPlan.teacher_name || 'Not set'}</p>
                    </div>
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Academic Year</p>
                        <p className="mt-1 font-medium text-gray-900">{lessonPlan.academic_year_name || 'Not set'}</p>
                    </div>
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Planned Time</p>
                        <p className="mt-1 font-medium text-gray-900">
                            {lessonPlan.planned_start_time || lessonPlan.planned_end_time
                                ? `${formatTime(lessonPlan.planned_start_time)} - ${formatTime(lessonPlan.planned_end_time)}`
                                : 'Not set'}
                        </p>
                    </div>
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Scheduled Lesson</p>
                        <p className="mt-1 font-medium text-gray-900">
                            {lessonPlan.session ? (
                                <Link href={`/sessions/${lessonPlan.session}`} className="inline-flex items-center gap-1 text-blue-600 hover:underline">
                                    <Link2 className="h-3.5 w-3.5" />
                                    {getLinkedLessonLabel(lessonPlan)}
                                </Link>
                            ) : (
                                'Not scheduled yet'
                            )}
                        </p>
                    </div>
                </div>
            </Card>

            <Card>
                <div className="space-y-4">
                    <div className="space-y-1">
                        <h2 className="text-base font-semibold text-gray-900">
                            {isInstructor ? 'Chosen learning outcomes' : 'Chosen Learning Outcomes'}
                        </h2>
                        <p className="text-sm text-gray-500">
                            These outcomes guide the objectives, lesson flow, and evidence recorded for this lesson.
                        </p>
                    </div>

                    {lessonPlan.planned_outcomes.length === 0 ? (
                        <p className="text-sm text-gray-500">No learning outcomes have been added yet.</p>
                    ) : (
                        <div className="space-y-3">
                            {lessonPlan.planned_outcomes.map((outcome) => (
                                <div
                                    key={`${lessonPlan.id}-${outcome.outcome_id}`}
                                    className="rounded-lg border border-gray-200 bg-gray-50 p-4"
                                >
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className="rounded-full bg-blue-100 px-2.5 py-1 text-xs font-medium text-blue-700">
                                            {outcome.code}
                                        </span>
                                        <span className="text-xs text-gray-500">
                                            {outcome.strand} · {outcome.sub_strand}
                                        </span>
                                    </div>
                                    <p className="mt-2 text-sm text-gray-800">{outcome.text}</p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </Card>

            <Card>
                <div className="grid grid-cols-1 gap-4 text-sm md:grid-cols-2 xl:grid-cols-4">
                    <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Created</p>
                        <p className="mt-2 text-gray-900">{formatTimestamp(lessonPlan.created_at)}</p>
                    </div>
                    <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Updated</p>
                        <p className="mt-2 text-gray-900">{formatTimestamp(lessonPlan.updated_at)}</p>
                    </div>
                    <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Generated</p>
                        <p className="mt-2 text-gray-900">{formatTimestamp(lessonPlan.generated_at)}</p>
                    </div>
                    <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Reviewed</p>
                        <p className="mt-2 text-gray-900">{formatTimestamp(lessonPlan.reviewed_at)}</p>
                    </div>
                    <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Used</p>
                        <p className="mt-2 text-gray-900">{formatTimestamp(lessonPlan.used_at)}</p>
                    </div>
                    <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 md:col-span-2 xl:col-span-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Generation Metadata</p>
                        <div className="mt-2 flex flex-wrap items-center gap-3 text-gray-900">
                            <span>{lessonPlan.generated_by_ai ? 'AI-assisted' : 'Rule-based generation'}</span>
                            {lessonPlan.ai_provider ? <span>Provider: {lessonPlan.ai_provider}</span> : null}
                            {lessonPlan.ai_model ? <span>Model: {lessonPlan.ai_model}</span> : null}
                        </div>
                    </div>
                </div>
            </Card>

            <LessonPlanSections lessonPlan={lessonPlan} />
            <LessonPlanReferences lessonPlan={lessonPlan} />

            <Modal
                isOpen={markUsedOpen}
                onClose={() => {
                    setMarkUsedOpen(false);
                    setReflection('');
                    setMarkUsedError(null);
                }}
                title="Mark Lesson Plan as Used"
                size="md"
            >
                <form onSubmit={handleSubmitMarkUsed} className="space-y-4">
                    <p className="text-sm text-gray-600">
                        Add reflection notes for this lesson. The returned lesson plan will refresh this page after the update.
                    </p>

                    <div className="space-y-1">
                        <label className="block text-sm font-medium text-gray-700">Reflection</label>
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
                                setMarkUsedOpen(false);
                                setReflection('');
                                setMarkUsedError(null);
                            }}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={pendingActionKey === actionKey(lessonPlan.id, 'used')}
                        >
                            <Clock3 className="mr-1.5 h-4 w-4" />
                            Mark Used
                        </Button>
                    </div>
                </form>
            </Modal>

            <Modal
                isOpen={scheduleOpen}
                onClose={() => {
                    setScheduleOpen(false);
                    setScheduleError(null);
                }}
                title={isInstructor ? 'Schedule This Lesson' : 'Schedule Lesson'}
                size="lg"
            >
                <form onSubmit={handleSubmitSchedule} className="space-y-4">
                    <p className="text-sm text-gray-600">
                        {isInstructor
                            ? 'Choose when you want to teach this lesson.'
                            : 'Choose when this lesson should take place.'}
                    </p>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <Input
                            label="Date"
                            type="date"
                            value={scheduleForm.session_date}
                            onChange={(event) => setScheduleForm((current) => ({
                                ...current,
                                session_date: event.target.value,
                            }))}
                            required
                        />
                        <Input
                            label="Venue"
                            value={scheduleForm.venue}
                            onChange={(event) => setScheduleForm((current) => ({
                                ...current,
                                venue: event.target.value,
                            }))}
                            placeholder="Optional venue"
                        />
                        <Select
                            label="Session category"
                            value={scheduleForm.session_type}
                            onChange={(event) => setScheduleForm((current) => ({
                                ...current,
                                session_type: event.target.value as ScheduleLessonSessionType,
                            }))}
                            options={SCHEDULE_LESSON_SESSION_TYPE_OPTIONS}
                        />
                        <Input
                            label="Start time"
                            type="time"
                            value={scheduleForm.start_time}
                            onChange={(event) => setScheduleForm((current) => ({
                                ...current,
                                start_time: event.target.value,
                            }))}
                            required
                        />
                        <Input
                            label="End time"
                            type="time"
                            value={scheduleForm.end_time}
                            onChange={(event) => setScheduleForm((current) => ({
                                ...current,
                                end_time: event.target.value,
                            }))}
                            required
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="block text-sm font-medium text-gray-700">Notes</label>
                        <textarea
                            value={scheduleForm.description}
                            onChange={(event) => setScheduleForm((current) => ({
                                ...current,
                                description: event.target.value,
                            }))}
                            rows={4}
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Optional lesson notes"
                        />
                    </div>

                    <div className="space-y-3 rounded-xl border border-gray-200 bg-gray-50 p-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                    <Users className="h-4 w-4 text-blue-600" />
                                    <h3 className="text-sm font-semibold text-gray-900">
                                        Participating classes
                                    </h3>
                                </div>
                                <p className="text-sm text-gray-600">
                                    Use this when another class is joining this lesson. You can
                                    still adjust it later from the lesson page.
                                </p>
                            </div>

                            <Badge variant="blue" size="sm">
                                {selectedParticipatingCohortSubjects.length} selected
                            </Badge>
                        </div>

                        <div className="rounded-lg border border-blue-200 bg-white p-4">
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="text-sm font-semibold text-gray-900">
                                    Primary class
                                </span>
                                <Badge variant="default" size="sm">Included</Badge>
                            </div>
                            <div className="mt-2 text-sm text-gray-700">
                                {lessonPlan.cohort_subject_name || lessonPlan.cohort_name || 'Current class'}
                            </div>
                            <div className="mt-1 text-xs text-gray-500">
                                {lessonPlan.subject_name || 'Subject'} ·{' '}
                                {lessonPlan.cohort_name || 'Cohort'}
                                {lessonPlan.academic_year_name
                                    ? ` · ${lessonPlan.academic_year_name}`
                                    : ''}
                                {availableParticipatingCohortData
                                    ? ` · ${formatLearnerCount(
                                        availableParticipatingCohortData.source_learner_count
                                    )}`
                                    : ''}
                            </div>
                        </div>

                        {participatingCohortsError ? (
                            <ErrorBanner
                                message={participatingCohortsError}
                                onDismiss={() => {
                                    void refetchParticipatingCohorts();
                                }}
                            />
                        ) : null}

                        {participatingCohortsLoading ? (
                            <div className="rounded-lg border border-dashed border-gray-200 bg-white px-4 py-6">
                                <LoadingSpinner
                                    fullScreen={false}
                                    message="Loading compatible participating classes..."
                                />
                            </div>
                        ) : null}

                        {!participatingCohortsLoading && !participatingCohortsError ? (
                            availableParticipatingCohortSubjects.length > 0 ? (
                                <div className="space-y-3">
                                    {availableParticipatingCohortSubjects.map((cohortSubject) => {
                                        const selected = scheduleForm.participating_cohort_subject_ids.includes(
                                            cohortSubject.cohort_subject_id
                                        );

                                        return (
                                            <label
                                                key={cohortSubject.cohort_subject_id}
                                                className={`flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition ${
                                                    selected
                                                        ? 'border-blue-300 bg-blue-50'
                                                        : 'border-gray-200 bg-white hover:border-blue-200 hover:bg-blue-50/40'
                                                }`}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={selected}
                                                    onChange={() => toggleParticipatingCohortSelection(cohortSubject)}
                                                    className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                                />
                                                <div className="min-w-0 flex-1 space-y-2">
                                                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                                        <div className="min-w-0">
                                                            <div className="text-sm font-semibold text-gray-900">
                                                                {cohortSubject.cohort_name}
                                                            </div>
                                                            <div className="text-xs text-gray-500">
                                                                {cohortSubject.subject_name}
                                                                {cohortSubject.academic_year
                                                                    ? ` · ${cohortSubject.academic_year}`
                                                                    : ''}
                                                            </div>
                                                        </div>
                                                        <Badge
                                                            variant={selected ? 'blue' : 'default'}
                                                            size="sm"
                                                            className="self-start"
                                                        >
                                                            {formatLearnerCount(cohortSubject.learner_count)}
                                                        </Badge>
                                                    </div>
                                                    <div className="text-xs text-gray-500">
                                                        {cohortSubject.cohort_level || 'Class level'}
                                                    </div>
                                                </div>
                                            </label>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="rounded-lg border border-dashed border-gray-200 bg-white px-4 py-4 text-sm text-gray-600">
                                    No additional compatible classes are available for this lesson
                                    yet. You can still schedule the lesson and adjust participating
                                    classes later from the lesson page.
                                </div>
                            )
                        ) : null}

                        {selectedParticipatingCohortSubjects.length > 0 ? (
                            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                                <div className="flex items-start gap-2">
                                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                                    <div>
                                        Attendance will be seeded for the primary class and the
                                        selected participating classes as soon as this lesson is
                                        scheduled.
                                    </div>
                                </div>
                            </div>
                        ) : null}
                    </div>

                    {scheduleError ? (
                        <ErrorBanner
                            message={scheduleError}
                            onDismiss={() => setScheduleError(null)}
                            autoDismissMs={5000}
                            compact
                        />
                    ) : null}

                    <div className="flex flex-wrap justify-end gap-3">
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={() => {
                                setScheduleOpen(false);
                                setScheduleError(null);
                            }}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={pendingActionKey === actionKey(lessonPlan.id, 'scheduled')}
                        >
                            <CalendarDays className="mr-1.5 h-4 w-4" />
                            {isInstructor ? 'Schedule this lesson' : 'Schedule lesson'}
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
