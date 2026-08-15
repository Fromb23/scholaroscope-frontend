'use client';

import { resolveErrorMessage } from '@/app/core/errors';

import type { FormEvent, ReactNode } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams, usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
    AlertTriangle,
    ArrowLeft,
    CalendarDays,
    ChevronDown,
    ChevronRight,
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
    getLessonGenerationBadge,
    getStructuredLessonDraft,
} from '@/app/core/lib/lessonPlanGeneration';
import { getLessonPlanScheduleExtensions } from '@/app/core/registry/lessonPlanScheduleExtensions';
import {
    usePrepareAssignmentFromLessonPlan,
    usePreparedAssignmentsForLessonPlan,
} from '@/app/core/hooks/useAssignments';
import {
    useAvailableLessonPlanParticipatingCohortSubjects,
    useLessonPlanDetail,
} from '@/app/core/hooks/useLessonPlans';
import { useReportExport } from '@/app/core/hooks/reports/useReportExport';
import {
    canMarkLessonPlanUsed,
    type ScheduleLessonFormData,
    SCHEDULE_LESSON_SESSION_TYPE_OPTIONS,
    type AvailableLessonPlanParticipatingCohortSubject,
    type LessonPlan,
    type ScheduleLessonSessionType,
} from '@/app/core/types/lessonPlans';
import { resolveLessonPlanLifecycleActions } from '@/app/core/lib/lessonPlanLifecycleActions';

import { canCreateTeachingRecord } from '@/app/core/lib/workspaces';
import { useAuth } from '@/app/context/AuthContext';
import { useAssistantPageContext } from '@/app/core/components/assistant/useAssistantPageContext';
import { parseAppDestination } from '@/app/core/auth/navigation';
import {
    getLessonPlanDetailInitialSectionState,
    shouldOpenLearnerTaskFromQuery,
    shouldShowLearnerTaskSection,
} from '@/app/core/components/lessonPlans/lessonPlanDetailVisibility';

function getLessonPlanId(params: ReturnType<typeof useParams>): number | null {
    const rawId = params.id;
    const resolvedId = Array.isArray(rawId) ? rawId[0] : rawId;
    const numericId = Number(resolvedId);

    return Number.isFinite(numericId) ? numericId : null;
}

function actionKey(lessonPlanId: number, action: string): string {
    return `${lessonPlanId}:${action}`;
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

function getOriginatingSchemeId(lessonPlan: LessonPlan): number | null {
    const context = lessonPlan.generated_context;
    const rawId = context?.scheme_id ?? context?.scheme;
    const schemeId = typeof rawId === 'number'
        ? rawId
        : typeof rawId === 'string'
            ? Number(rawId)
            : Number.NaN;

    return Number.isInteger(schemeId) && schemeId > 0 ? schemeId : null;
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

const INITIAL_SECTION_STATE = getLessonPlanDetailInitialSectionState();

function CollapsibleDetailSection({
    title,
    summary,
    open,
    onToggle,
    children,
}: {
    title: string;
    summary: string;
    open: boolean;
    onToggle: () => void;
    children: ReactNode;
}) {
    return (
        <Card className="overflow-hidden p-0">
            <button
                type="button"
                onClick={onToggle}
                className="theme-focus-ring flex w-full items-start gap-3 px-6 py-4 text-left transition-colors theme-hover-surface"
            >
                <div className="theme-surface-elevated mt-0.5 shrink-0 rounded-lg border p-1.5 theme-border">
                    {open ? (
                        <ChevronDown className="h-4 w-4 text-[color:var(--color-primary)]" />
                    ) : (
                        <ChevronRight className="h-4 w-4 theme-subtle" />
                    )}
                </div>
                <div className="min-w-0 flex-1">
                    <h2 className="text-base font-semibold theme-text">{title}</h2>
                    <p className="mt-1 text-sm theme-muted">{summary}</p>
                </div>
                <span className="shrink-0 text-sm font-medium theme-link">
                    {open ? 'Collapse' : 'Expand'}
                </span>
            </button>
            {open ? (
                <div className="border-t px-6 py-6 theme-border">
                    {children}
                </div>
            ) : null}
        </Card>
    );
}

export function LessonPlanDetailPage() {
    const params = useParams();
    const pathname = usePathname();
    const router = useRouter();
    const searchParams = useSearchParams();
    const { activeOrg, activeOperatingContext, capabilities } = useAuth();
    const teachingSurface = activeOperatingContext === 'MY_TEACHING' && Boolean(capabilities.can_teach);
    const requestedAuthorityMode = searchParams.get('authority_mode');
    const authorityMode = requestedAuthorityMode === 'teaching' || requestedAuthorityMode === 'supervision'
        ? requestedAuthorityMode
        : null;
    const safeReturnTo = useMemo(() => {
        const value = searchParams.get('returnTo');
        return parseAppDestination(value);
    }, [searchParams]);
    const currentReturnTo = useMemo(() => {
        const query = searchParams.toString();
        const candidate = query ? `${pathname}?${query}` : pathname;
        return candidate.startsWith('/lesson-plans/') ? candidate : '/lesson-plans';
    }, [pathname, searchParams]);
    const canCreateTeachingRecords = canCreateTeachingRecord({
        orgType: activeOrg?.org_type,
        isSuperadmin: false,
        capabilities,
    });
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
    } = useLessonPlanDetail(lessonPlanId, { authorityMode });
    const { handleExport: handleLessonPlanExport, exporting } = useReportExport(
        () => exportPdf(),
        'lesson plan PDF',
    );
    const prepareAssignmentMutation = usePrepareAssignmentFromLessonPlan();
    const {
        assignments: preparedAssignments,
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
    const [reviewOpen, setReviewOpen] = useState(false);
    const [reviewError, setReviewError] = useState<string | null>(null);
    const [scheduleOpen, setScheduleOpen] = useState(false);
    const [scheduleError, setScheduleError] = useState<string | null>(null);
    const [scheduleFieldErrors, setScheduleFieldErrors] = useState<Record<string, string>>({});
    const [transientNotice, setTransientNotice] = useState<string | null>(null);
    const learnerTaskSectionRef = useRef<HTMLDivElement | null>(null);
    const [learnerTaskOpen, setLearnerTaskOpen] = useState(false);
    const [planningSourcesOpen, setPlanningSourcesOpen] = useState(INITIAL_SECTION_STATE.outcomesOpen);
    const [learnerTaskChoice, setLearnerTaskChoice] = useState<'none' | 'prepare' | 'existing'>('none');
    const [learnerTaskType, setLearnerTaskType] = useState<'class_exercise' | 'homework' | 'group_activity'>('class_exercise');
    const [learnerTaskTitle, setLearnerTaskTitle] = useState('');
    const [learnerTaskInstructions, setLearnerTaskInstructions] = useState('');
    const [learnerTaskDueAt, setLearnerTaskDueAt] = useState('');
    const [learnerTaskError, setLearnerTaskError] = useState<string | null>(null);
    const [learnerTaskSuccess, setLearnerTaskSuccess] = useState<string | null>(null);
    const [highlightedAssignmentId, setHighlightedAssignmentId] = useState<number | null>(null);
    const [preparedAssignmentPreviewId, setPreparedAssignmentPreviewId] = useState<number | null>(null);
    const [scheduleForm, setScheduleForm] = useState<ScheduleLessonFormData>({
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
    const scheduleExtensionContext = useMemo(
        () => (lessonPlan ? { lessonPlan, scheduleForm } : null),
        [lessonPlan, scheduleForm],
    );
    const scheduleExtensions = useMemo(
        () => (
            scheduleExtensionContext
                ? getLessonPlanScheduleExtensions(scheduleExtensionContext)
                : []
        ),
        [scheduleExtensionContext],
    );

    const handleScheduleFormPatch = useCallback((patch: Partial<ScheduleLessonFormData>) => {
        setScheduleForm((current) => ({
            ...current,
            ...patch,
            ...(
                patch.session_type && patch.session_type !== 'PRACTICAL'
                    ? { practical_context: undefined }
                    : {}
            ),
        }));
        setScheduleFieldErrors((current) => {
            const next = { ...current };
            Object.keys(patch).forEach((key) => {
                delete next[key];
            });
            if (patch.session_type && patch.session_type !== 'PRACTICAL') {
                delete next.practical_context;
            }
            return next;
        });
        setScheduleError(null);
    }, []);

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
                ? `AI draft generated from selected outcomes and references. ${referencesLabel}`
                : mode === 'ai_repaired'
                    ? `AI-assisted draft generated and validated from selected outcomes and references. ${referencesLabel}`
                : mode === 'fallback'
                    ? `Basic curriculum-based draft generated because AI assistance was unavailable or invalid. ${referencesLabel}`
                    : `Rule-based draft generated from selected outcomes and references. ${referencesLabel}`;
        }

        if (notice === 'existing') {
            return mode === 'ai'
                ? `Existing AI draft opened. ${referencesLabel}`
                : mode === 'ai_repaired'
                    ? `Existing validated AI-assisted draft opened. ${referencesLabel}`
                : mode === 'fallback'
                    ? `Existing basic curriculum-based draft opened. ${referencesLabel}`
                    : `Existing rule-based draft opened. ${referencesLabel}`;
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
    const activePreparedAssignment = useMemo(() => (
        preparedAssignments.find((assignment) => assignment.id === preparedAssignmentPreviewId)
        ?? latestPreparedAssignment
    ), [latestPreparedAssignment, preparedAssignmentPreviewId, preparedAssignments]);
    const hasPreparedAssignment = Boolean(activePreparedAssignment);
    const lifecycleActions = useMemo(
        () => lessonPlan
            ? resolveLessonPlanLifecycleActions({
                status: lessonPlan.status,
                canCreateTeachingRecords,
                hasScheduledSession: Boolean(lessonPlan.session),
            })
            : null,
        [canCreateTeachingRecords, lessonPlan],
    );
    const showLearnerTaskSection = shouldShowLearnerTaskSection({
        status: lessonPlan?.status,
        canPrepareLearnerTask: Boolean(lifecycleActions?.canPrepareLearnerTask),
        hasPreparedAssignment,
    });

    useEffect(() => {
        setPreparedAssignmentPreviewId(latestPreparedAssignment?.id ?? null);
    }, [latestPreparedAssignment?.id]);

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
                setLearnerTaskOpen(shouldOpenLearnerTaskFromQuery({
                    section: searchParams.get('section'),
                    showLearnerTaskSection,
                }));
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
        setLearnerTaskOpen(shouldOpenLearnerTaskFromQuery({
            section: searchParams.get('section'),
            showLearnerTaskSection,
        }));
    }, [
        hasPreparedAssignment,
        learnerTaskStorageKey,
        lessonPlan,
        preparedAssignmentDraft?.delivery_mode,
        preparedAssignmentDraft?.due_at,
        preparedAssignmentDraft?.instructions,
        preparedAssignmentDraft?.title,
        searchParams,
        showLearnerTaskSection,
    ]);

    useEffect(() => {
        if (!learnerTaskStorageKey || !lessonPlan || !showLearnerTaskSection) {
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
        showLearnerTaskSection,
    ]);

    useEffect(() => {
        const section = searchParams.get('section');
        if (!shouldOpenLearnerTaskFromQuery({ section, showLearnerTaskSection })) {
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
    }, [searchParams, showLearnerTaskSection]);

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
        if (!showLearnerTaskSection) {
            return;
        }
        setLearnerTaskChoice(hasPreparedAssignment ? 'existing' : 'prepare');
        setLearnerTaskOpen(true);
        setTimeout(() => {
            learnerTaskSectionRef.current?.scrollIntoView({
                behavior: 'smooth',
                block: 'start',
            });
        }, 50);
    }, [hasPreparedAssignment, showLearnerTaskSection]);
    const closeLearnerTaskSection = useCallback(() => {
        setLearnerTaskOpen(false);
        setLearnerTaskError(null);
        setLearnerTaskSuccess(null);
    }, []);

    const handleOpenReview = useCallback(() => {
        if (!lessonPlan) return;
        setReviewError(null);
        setReviewOpen(true);
    }, [lessonPlan]);

    const handleSubmitReview = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!lessonPlan) return;
        setPendingActionKey(actionKey(lessonPlan.id, 'reviewed'));
        setReviewError(null);
        try {
            await markReviewed();
            await refetch();
            setReviewOpen(false);
            setActionSuccess('Lesson plan reviewed. Scheduling is now available.');
        } catch (err) {
            setReviewError(resolveErrorMessage(err, 'Lesson review could not be completed.'));
        } finally {
            setPendingActionKey(null);
        }
    };

    const handleSimpleAction = async (action: 'reviewed' | 'archived' | 'restored') => {
        if (!lessonPlan) {
            return;
        }

        setPendingActionKey(actionKey(lessonPlan.id, action));
        setActionError(null);
        setActionSuccess(null);

        try {
            if (action === 'reviewed') {
                handleOpenReview();
            } else if (action === 'archived') {
                await archive();
                setActionSuccess('Lesson plan archived.');
            } else {
                await restore();
                setActionSuccess('Lesson plan restored.');
            }
        } catch (err) {
            setActionError(resolveErrorMessage(err, 'Action failed.'));
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
        setScheduleFieldErrors({});
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
            setPreparedAssignmentPreviewId(response.assignment.id);
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
            setMarkUsedError(resolveErrorMessage(err, 'Action failed.'));
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
        setScheduleFieldErrors({});

        if (scheduleExtensionContext) {
            const extensionErrors = scheduleExtensions.reduce<Record<string, string>>((result, extension) => {
                Object.assign(result, extension.validate?.(scheduleExtensionContext) ?? {});
                return result;
            }, {});

            if (Object.keys(extensionErrors).length > 0) {
                setScheduleFieldErrors(extensionErrors);
                setPendingActionKey(null);
                return;
            }
        }

        try {
            const response = await scheduleLesson({
                session_date: scheduleForm.session_date,
                start_time: scheduleForm.start_time,
                end_time: scheduleForm.end_time,
                session_type: scheduleForm.session_type,
                venue: scheduleForm.venue.trim() || undefined,
                description: scheduleForm.description.trim() || undefined,
                participating_cohort_subject_ids: scheduleForm.participating_cohort_subject_ids,
                practical_context: scheduleForm.practical_context,
            });
            await refetch();
            setScheduleOpen(false);
            setActionSuccess(
                response.session.id
                    ? 'Lesson scheduled. The lesson link and participating classes have been refreshed.'
                    : 'Lesson scheduled.'
            );
        } catch (err) {
            setScheduleError(resolveErrorMessage(err, 'Action failed.'));
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
    const canShowReviewAction = Boolean(lifecycleActions?.canReview);
    const canShowScheduleLessonAction = Boolean(lifecycleActions?.canSchedule);
    const canShowOpenScheduledLessonAction = Boolean(lifecycleActions?.canOpenScheduledLesson);
    const canPrepareLearnerTask = Boolean(lifecycleActions?.canPrepareLearnerTask);
    const learnerTaskActionLabel = hasPreparedAssignment
        ? 'Review learner task'
        : 'Prepare learner task';
    const assistantContext = useMemo(() => {
        const visibleActions = [
            ...(canShowScheduleLessonAction
                ? [{
                    label: 'Schedule this lesson',
                    type: 'page_action' as const,
                    target: 'open_schedule_modal',
                    handler: handleOpenSchedule,
                }]
                : []),
            ...(canShowReviewAction
                ? [{
                    label: 'Review lesson plan',
                    type: 'page_action' as const,
                    target: 'open_review_modal',
                    handler: handleOpenReview,
                }]
                : []),
            ...(canShowOpenScheduledLessonAction
                ? [{
                    label: 'Open scheduled lesson',
                    type: 'navigate' as const,
                    href: `/sessions/${lessonPlan?.session}`,
                }]
                : []),
            ...(showLearnerTaskSection
                ? [{
                    label: learnerTaskActionLabel,
                    type: 'page_action' as const,
                    target: 'open_learner_task_section',
                    handler: openLearnerTaskSection,
                }]
                : []),
        ];

        const nextSafeAction = canShowReviewAction
            ? {
                label: 'Review lesson plan',
                type: 'page_action' as const,
                target: 'open_review_modal',
                handler: handleOpenReview,
            }
            : canShowScheduleLessonAction
            ? {
                label: 'Schedule this lesson',
                type: 'page_action' as const,
                target: 'open_schedule_modal',
                handler: handleOpenSchedule,
            }
            : canShowOpenScheduledLessonAction
                ? {
                    label: 'Open scheduled lesson',
                    type: 'navigate' as const,
                    href: `/sessions/${lessonPlan?.session}`,
                }
                : showLearnerTaskSection
                    ? {
                        label: learnerTaskActionLabel,
                        type: 'page_action' as const,
                        target: 'open_learner_task_section',
                        handler: openLearnerTaskSection,
                    }
                    : undefined;

        return {
            pageKey: 'lesson_plan_detail',
            pageTitle: teachingSurface ? 'Lesson Preparation' : 'Lesson Plan',
            state: {
                is_loading: loading,
                status: lessonPlan?.status ?? null,
                has_session: Boolean(lessonPlan?.session),
                can_review: Boolean(lifecycleActions?.canReview),
                can_schedule: Boolean(lifecycleActions?.canSchedule),
                has_prepared_task: hasPreparedAssignment,
            },
            visibleActions,
            nextSafeAction,
            workflowStep: lessonPlan?.session ? 'scheduled' : 'lesson_preparation',
            emptyStateReason: !loading && !lessonPlan
                ? 'This lesson plan could not be loaded.'
                : undefined,
        };
    }, [
        canShowOpenScheduledLessonAction,
        canShowReviewAction,
        canShowScheduleLessonAction,
        handleOpenReview,
        handleOpenSchedule,
        hasPreparedAssignment,
        lifecycleActions?.canReview,
        lifecycleActions?.canSchedule,
        teachingSurface,
        learnerTaskActionLabel,
        lessonPlan,
        loading,
        openLearnerTaskSection,
        showLearnerTaskSection,
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

    const learnerTaskReturnTo = activePreparedAssignment
        ? `/lesson-plans/${lessonPlan.id}?section=learner-task&highlightAssignment=${activePreparedAssignment.id}`
        : `/lesson-plans/${lessonPlan.id}?section=learner-task`;
    const preparedAssignmentDetailHref = activePreparedAssignment
        ? `/academic/cohorts/${activePreparedAssignment.cohort_id}/assignments/${activePreparedAssignment.id}?${new URLSearchParams({
            returnTo: learnerTaskReturnTo,
        }).toString()}`
        : null;
    const preparedAssignmentWorkspaceHref = activePreparedAssignment
        ? `/academic/cohorts/${activePreparedAssignment.cohort_id}/assignments?${new URLSearchParams({
            cohort_subject: String(activePreparedAssignment.cohort_subject),
            status: activePreparedAssignment.status,
            highlightAssignment: String(activePreparedAssignment.id),
        }).toString()}`
        : null;
    type NextActionButton = {
        key: string;
        label: string;
        icon: ReactNode;
        href?: string;
        onClick?: () => void;
        disabled?: boolean;
        variant: 'primary' | 'secondary';
    };
    const reviewAction: NextActionButton | null = canShowReviewAction
        ? {
            key: 'review-lesson-plan',
            label: 'Review lesson plan',
            onClick: handleOpenReview,
            disabled: pendingActionKey === actionKey(lessonPlan.id, 'reviewed'),
            icon: <Edit className="mr-1.5 h-4 w-4" />,
            variant: 'primary',
        }
        : null;
    const scheduleAction: NextActionButton | null = canShowScheduleLessonAction
        ? {
            key: 'schedule-lesson',
            label: 'Schedule this lesson',
            onClick: handleOpenSchedule,
            disabled: pendingActionKey === actionKey(lessonPlan.id, 'scheduled'),
            icon: <CalendarDays className="mr-1.5 h-4 w-4" />,
            variant: 'primary',
        }
        : canShowOpenScheduledLessonAction
            ? {
                key: 'open-scheduled-lesson',
                label: 'Open scheduled lesson',
                href: `/sessions/${lessonPlan.session}`,
                icon: <Link2 className="mr-1.5 h-4 w-4" />,
                variant: 'primary',
            }
            : null;
    const learnerTaskAction: NextActionButton | null = canPrepareLearnerTask
        ? {
            key: hasPreparedAssignment ? 'review-learner-task' : 'prepare-learner-task',
            label: learnerTaskActionLabel,
            onClick: openLearnerTaskSection,
            icon: <FilePlus2 className="mr-1.5 h-4 w-4" />,
            variant: 'secondary',
        }
        : null;
    const nextStepActions: NextActionButton[] = [
        ...(reviewAction ? [reviewAction] : []),
        ...(scheduleAction ? [scheduleAction] : []),
        ...(learnerTaskAction ? [learnerTaskAction] : []),
    ];
    const nextStepHeading = reviewAction
        ? 'Next step: review this lesson'
        : scheduleAction
        ? canShowScheduleLessonAction
            ? 'Next step: schedule this lesson'
            : 'Scheduled lesson is ready'
        : learnerTaskAction
            ? 'Optional: learner task'
            : lessonPlan.status === 'USED'
                ? 'Post-lesson follow-up'
                : 'Lesson preparation is ready';
    const nextStepDescription = reviewAction
        ? 'Inspect the generated lesson plan and explicitly accept it. Editing is optional and becomes available after review.'
        : scheduleAction
        ? canShowScheduleLessonAction
            ? learnerTaskAction
                ? 'Choose when this lesson should happen. A learner task can be prepared separately whenever you need one.'
                : 'Choose when this lesson should happen so it appears in your teaching day.'
            : learnerTaskAction
                ? 'This lesson preparation is already linked to a scheduled lesson. Open it when you are ready to teach, or review the learner task separately.'
                : 'This lesson preparation is already linked to a scheduled lesson. Open it when you are ready to teach.'
        : learnerTaskAction
            ? hasPreparedAssignment
                ? 'Scheduling is handled separately. Review the learner task whenever you need to inspect or update it.'
                : 'A learner task is optional for this lesson. Prepare one if you want learners to have follow-up work.'
            : lessonPlan.status === 'USED'
                ? 'This lesson preparation has already been used in class. Reopen the lesson or download the plan for follow-up work.'
                : 'Review the plan, then continue with your next teaching action.';
    const learnerTaskStatus = activePreparedAssignment
        ? activePreparedAssignment.status === 'DRAFT'
            ? 'Prepared'
            : 'Issued'
        : learnerTaskChoice === 'prepare'
            ? 'Draft in progress'
            : 'Not prepared';
    const canEditLessonPlan = Boolean(lifecycleActions?.canEdit);
    const postLessonReflection = lessonPlan.status === 'USED'
        ? lessonPlan.reflection?.trim() ?? ''
        : '';
    const generationBadge = getLessonGenerationBadge(lessonPlan);
    const generationBadgeClassName = generationBadge.tone === 'purple'
        ? 'bg-purple-50 text-purple-700'
        : generationBadge.tone === 'green'
            ? 'bg-emerald-50 text-emerald-700'
            : generationBadge.tone === 'amber'
                ? 'bg-amber-50 text-amber-700'
                : 'bg-gray-100 text-gray-700';
    const structuredDraft = getStructuredLessonDraft(lessonPlan);
    const originatingSchemeId = getOriginatingSchemeId(lessonPlan);
    const originatingSchemeHref = originatingSchemeId
        ? `/schemes/${originatingSchemeId}?${new URLSearchParams({ returnTo: currentReturnTo }).toString()}`
        : null;
    const compactContextParts = [
        [lessonPlan.cohort_name, lessonPlan.subject_name].filter(Boolean).join(' · '),
        lessonPlan.curriculum_name,
        lessonPlan.term_name,
    ].filter(Boolean);
    return (
        <div className="space-y-6">
            <div className="space-y-3">
                <Link href={safeReturnTo ?? '/lesson-plans'}>
                    <Button variant="ghost" size="sm">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        {safeReturnTo ? 'Back' : (teachingSurface ? 'Back to Lesson Preparation' : 'Back')}
                    </Button>
                </Link>

                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                            <h1 className="text-2xl font-semibold text-gray-900">{lessonPlan.title}</h1>
                            <LessonPlanStatusBadge status={lessonPlan.status} />
                            <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${generationBadgeClassName}`}>
                                {generationBadge.label}
                            </span>
                        </div>
                        <p className="text-gray-600">
                            {compactContextParts.join(' · ')}
                        </p>
                        <p className="text-sm text-gray-500">
                            {getLinkedLessonLabel(lessonPlan)}
                        </p>
                        {generationBadge.source === 'fallback' ? (
                            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                                <span className="font-medium">Basic draft.</span>{' '}
                                {generationBadge.description}
                            </div>
                        ) : null}
                    </div>

                    <div className="print:hidden">
                        <ActionMenu
                            items={[
                                ...(canEditLessonPlan ? [{
                                    label: 'Edit',
                                    href: `/lesson-plans/${lessonPlan.id}/edit`,
                                    icon: <Edit className="h-4 w-4" />,
                                }] : []),
                                ...(originatingSchemeHref ? [{
                                    label: 'Open scheme',
                                    href: originatingSchemeHref,
                                    icon: <Link2 className="h-4 w-4" />,
                                }] : []),
                                {
                                    label: exporting
                                        ? 'Downloading...'
                                        : teachingSurface
                                            ? 'Download lesson plan'
                                            : 'Download PDF',
                                    onSelect: () => {
                                        void handleLessonPlanExport('pdf');
                                    },
                                    disabled: exporting,
                                    icon: <Download className="h-4 w-4" />,
                                },
                                ...(canCreateTeachingRecords && canMarkLessonPlanUsed(lessonPlan.status) ? [{
                                    label: 'Close lesson and record reflection',
                                    onSelect: handleOpenMarkUsed,
                                    disabled: pendingActionKey === actionKey(lessonPlan.id, 'used'),
                                }] : []),
                                ...(lifecycleActions?.canArchive ? [{
                                    label: 'Archive',
                                    onSelect: () => {
                                        void handleSimpleAction('archived');
                                    },
                                    disabled: pendingActionKey === actionKey(lessonPlan.id, 'archived'),
                                    destructive: true,
                                }] : []),
                                ...(lifecycleActions?.canRestore ? [{
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
                        <h2 className="text-lg font-semibold text-gray-900">{nextStepHeading}</h2>
                        <p className="text-sm text-gray-600">{nextStepDescription}</p>
                    </div>

                    {nextStepActions.length > 0 ? (
                        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:justify-end">
                            {nextStepActions.map((action) => (
                                action.href ? (
                                    <Link href={action.href} key={action.key} className="w-full sm:w-auto">
                                        <Button
                                            variant={action.variant}
                                            className="w-full sm:w-auto"
                                        >
                                            {action.icon}
                                            {action.label}
                                        </Button>
                                    </Link>
                                ) : (
                                    <Button
                                        key={action.key}
                                        variant={action.variant}
                                        className="w-full sm:w-auto"
                                        onClick={action.onClick}
                                        disabled={action.disabled}
                                    >
                                        {action.icon}
                                        {action.label}
                                    </Button>
                                )
                            ))}
                        </div>
                    ) : null}
                </div>
            </Card>

            <section className="space-y-3">
                <div className="space-y-1">
                    <h2 className="text-lg font-semibold text-gray-900">Lesson plan</h2>
                    <p className="text-sm text-gray-600">
                        Objectives, prior knowledge, resources, lesson flow, activities, assessment, and differentiation.
                    </p>
                </div>
                <LessonPlanSections lessonPlan={lessonPlan} />
            </section>

            {showLearnerTaskSection ? (
            <div ref={learnerTaskSectionRef} id="learner-task" className="scroll-mt-24">
                <Card className={highlightedAssignmentId && activePreparedAssignment?.id === highlightedAssignmentId ? 'border-blue-300 bg-blue-50/50' : undefined}>
                    <div className="space-y-5">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div className="space-y-2">
                                <div className="flex flex-wrap items-center gap-2">
                                    <h2 className="text-base font-semibold text-gray-900">Optional follow-up</h2>
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
                                    {activePreparedAssignment
                                        ? activePreparedAssignment.status === 'DRAFT'
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
                                    {learnerTaskOpen ? 'Collapse' : activePreparedAssignment ? 'Review' : 'Expand'}
                                </Button>
                                {preparedAssignmentDetailHref ? (
                                    <Link href={preparedAssignmentDetailHref} className="w-full sm:w-auto">
                                        <Button variant="ghost" size="sm" className="w-full sm:w-auto">
                                            <Link2 className="mr-1.5 h-4 w-4" />
                                            Open assignment
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

                        {activePreparedAssignment ? (
                            <div className={`rounded-xl border px-4 py-4 sm:px-5 ${
                                activePreparedAssignment.status === 'DRAFT'
                                    ? 'border-blue-200 bg-blue-50/80'
                                    : 'border-green-200 bg-green-50/80'
                            }`}>
                                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                                    <div className="space-y-3">
                                        <div className="space-y-1">
                                            <div className="text-xs font-medium uppercase tracking-wide text-gray-500">
                                                Prepared assignment
                                            </div>
                                            <h3 className="text-lg font-semibold text-gray-900">
                                                {activePreparedAssignment.title}
                                            </h3>
                                            <p className="text-sm text-gray-600">
                                                {activePreparedAssignment.status === 'DRAFT'
                                                    ? 'This draft is now in the class assignment workspace and is ready for issue when the lesson is complete.'
                                                    : 'This assignment is already part of the learner follow-up flow for this lesson.'}
                                            </p>
                                        </div>

                                        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                                            <div className="rounded-lg border border-white/70 bg-white/70 px-3 py-3">
                                                <div className="text-xs font-medium uppercase tracking-wide text-gray-500">Status</div>
                                                <div className="mt-1 text-sm font-semibold text-gray-900">
                                                    {activePreparedAssignment.status === 'DRAFT' ? 'Preparing' : 'Issued'}
                                                </div>
                                            </div>
                                            <div className="rounded-lg border border-white/70 bg-white/70 px-3 py-3">
                                                <div className="text-xs font-medium uppercase tracking-wide text-gray-500">Cohort</div>
                                                <div className="mt-1 text-sm font-semibold text-gray-900">
                                                    {activePreparedAssignment.cohort_name}
                                                </div>
                                            </div>
                                            <div className="rounded-lg border border-white/70 bg-white/70 px-3 py-3">
                                                <div className="text-xs font-medium uppercase tracking-wide text-gray-500">Subject</div>
                                                <div className="mt-1 text-sm font-semibold text-gray-900">
                                                    {activePreparedAssignment.subject_name}
                                                </div>
                                            </div>
                                            <div className="rounded-lg border border-white/70 bg-white/70 px-3 py-3">
                                                <div className="text-xs font-medium uppercase tracking-wide text-gray-500">Workspace</div>
                                                <div className="mt-1 text-sm font-semibold text-gray-900">
                                                    Class assignments
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex w-full flex-col gap-2 lg:w-auto">
                                        {preparedAssignmentDetailHref ? (
                                            <Link href={preparedAssignmentDetailHref} className="w-full lg:w-auto">
                                                <Button className="w-full lg:w-auto">
                                                    Open assignment
                                                </Button>
                                            </Link>
                                        ) : null}
                                        {preparedAssignmentWorkspaceHref ? (
                                            <Link href={preparedAssignmentWorkspaceHref} className="w-full lg:w-auto">
                                                <Button variant="secondary" className="w-full lg:w-auto">
                                                    View in assignment workspace
                                                </Button>
                                            </Link>
                                        ) : null}
                                    </div>
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
                                        { value: 'prepare', label: 'Prepare learner task', disabled: !canPrepareLearnerTask },
                                        { value: 'existing', label: hasPreparedAssignment ? 'Review prepared task' : 'No prepared task yet', disabled: !hasPreparedAssignment },
                                    ]}
                                />

                                {learnerTaskChoice === 'prepare' && canPrepareLearnerTask ? (
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
                                    {learnerTaskChoice === 'prepare' && canPrepareLearnerTask ? (
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
            ) : null}

            {lessonPlan.status === 'ARCHIVED' ? (
                <div className="rounded-xl border border-orange-200 bg-orange-50 p-3 text-sm text-orange-700">
                    This lesson plan is archived. Restore it to continue using it in active workflows.
                </div>
            ) : null}

            {postLessonReflection ? (
                <Card>
                    <div className="space-y-3">
                        <div className="space-y-1">
                            <h2 className="text-base font-semibold text-gray-900">
                                Post-lesson reflection
                            </h2>
                            <p className="text-sm text-gray-500">
                                Recorded after the lesson was taught.
                            </p>
                        </div>
                        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                            <p className="whitespace-pre-wrap text-sm leading-6 text-gray-800">
                                {postLessonReflection}
                            </p>
                        </div>
                    </div>
                </Card>
            ) : null}

            <CollapsibleDetailSection
                title="Planning basis"
                summary={`${lessonPlan.planned_outcomes.length} outcome${lessonPlan.planned_outcomes.length === 1 ? '' : 's'} and ${lessonPlan.selected_references.length} reference${lessonPlan.selected_references.length === 1 ? '' : 's'} attached.`}
                open={planningSourcesOpen}
                onToggle={() => setPlanningSourcesOpen((current) => !current)}
            >
                <div className="space-y-6">
                    <div className="space-y-1">
                        <h2 className="text-base font-semibold text-gray-900">Learning outcomes</h2>
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
                                        <span className="text-xs text-gray-500">
                                            {[outcome.strand, outcome.sub_strand].filter(Boolean).join(' · ')}
                                        </span>
                                    </div>
                                    <p className="mt-2 text-sm text-gray-800">{outcome.text}</p>
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="border-t border-gray-100 pt-5">
                        <LessonPlanReferences lessonPlan={lessonPlan} />
                    </div>
                </div>
            </CollapsibleDetailSection>

            <Modal
                isOpen={reviewOpen}
                onClose={() => {
                    setReviewOpen(false);
                    setReviewError(null);
                }}
                title="Review generated lesson plan"
                size="lg"
            >
                <form onSubmit={handleSubmitReview} className="space-y-4">
                    <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
                        Scholaroscope-generated lesson plans are system drafts. Inspect the preparation below, then explicitly accept it to make scheduling available.
                    </div>

                    <div className="rounded-xl border theme-border bg-gray-50 px-4 py-3 text-sm theme-muted">
                        <p className="font-medium theme-text">Edits are optional</p>
                        <p className="mt-1">
                            You can schedule immediately after review, or use Edit from the More menu after review if the preparation needs changes.
                        </p>
                    </div>

                    {structuredDraft ? (
                        <div className="space-y-4 rounded-xl border theme-border bg-white px-4 py-4">
                            <div className="space-y-1">
                                <p className="text-sm font-semibold theme-text">Structured lesson draft</p>
                                <p className="text-sm theme-muted">
                                    Review the generated phases before accepting this lesson preparation.
                                </p>
                            </div>
                            <div className="space-y-4">
                                {structuredDraft.phases.map((phase, index) => (
                                    <div key={`${phase.phase_type}-${index}`} className="rounded-lg border theme-border bg-gray-50 p-3">
                                        <div className="flex flex-wrap items-center justify-between gap-2">
                                            <div>
                                                <p className="text-sm font-semibold theme-text">
                                                    {phase.phase_type.replaceAll('_', ' ')}
                                                </p>
                                                <p className="text-xs theme-muted">{phase.title}</p>
                                            </div>
                                            {phase.duration_minutes > 0 ? (
                                                <span className="rounded-full bg-white px-2.5 py-1 text-xs font-medium theme-muted">
                                                    {phase.duration_minutes} min
                                                </span>
                                            ) : null}
                                        </div>
                                        <div className="mt-3 grid gap-3 md:grid-cols-2">
                                            <div>
                                                <p className="text-xs font-semibold uppercase tracking-wide theme-muted">Teacher actions</p>
                                                <ul className="mt-1 list-disc space-y-1 pl-4 text-sm theme-text">
                                                    {phase.teacher_actions.map((item, itemIndex) => (
                                                        <li key={`teacher-${itemIndex}`}>{item}</li>
                                                    ))}
                                                </ul>
                                            </div>
                                            <div>
                                                <p className="text-xs font-semibold uppercase tracking-wide theme-muted">Learner actions</p>
                                                <ul className="mt-1 list-disc space-y-1 pl-4 text-sm theme-text">
                                                    {phase.learner_actions.map((item, itemIndex) => (
                                                        <li key={`learner-${itemIndex}`}>{item}</li>
                                                    ))}
                                                </ul>
                                            </div>
                                            <div className="md:col-span-2">
                                                <p className="text-xs font-semibold uppercase tracking-wide theme-muted">Assessment / evidence</p>
                                                <ul className="mt-1 list-disc space-y-1 pl-4 text-sm theme-text">
                                                    {[...phase.assessment_checks, ...phase.evidence_expected].map((item, itemIndex) => (
                                                        <li key={`evidence-${itemIndex}`}>{item}</li>
                                                    ))}
                                                </ul>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="grid gap-3 md:grid-cols-2">
                                <div className="rounded-lg border theme-border bg-gray-50 p-3">
                                    <p className="text-xs font-semibold uppercase tracking-wide theme-muted">Differentiation support</p>
                                    <ul className="mt-1 list-disc space-y-1 pl-4 text-sm theme-text">
                                        {structuredDraft.differentiation.support.map((item, index) => (
                                            <li key={`support-${index}`}>{item}</li>
                                        ))}
                                    </ul>
                                </div>
                                <div className="rounded-lg border theme-border bg-gray-50 p-3">
                                    <p className="text-xs font-semibold uppercase tracking-wide theme-muted">Differentiation extension</p>
                                    <ul className="mt-1 list-disc space-y-1 pl-4 text-sm theme-text">
                                        {structuredDraft.differentiation.extension.map((item, index) => (
                                            <li key={`extension-${index}`}>{item}</li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <LessonPlanSections lessonPlan={lessonPlan} />
                    )}

                    {reviewError ? (
                        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                            {reviewError}
                        </div>
                    ) : null}

                    <div className="flex flex-wrap justify-end gap-3">
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={() => setReviewOpen(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={pendingActionKey === actionKey(lessonPlan.id, 'reviewed')}
                        >
                            Complete review
                        </Button>
                    </div>
                </form>
            </Modal>

            <Modal
                isOpen={markUsedOpen}
                onClose={() => {
                    setMarkUsedOpen(false);
                    setReflection('');
                    setMarkUsedError(null);
                }}
                title="Post-lesson closure"
                size="md"
            >
                <form onSubmit={handleSubmitMarkUsed} className="space-y-4">
                    <p className="text-sm text-gray-600">
                        Record the post-lesson reflection after teaching. The lesson plan will refresh after this closure action is saved.
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
                            Save closure
                        </Button>
                    </div>
                </form>
            </Modal>

            <Modal
                isOpen={scheduleOpen}
                onClose={() => {
                    setScheduleOpen(false);
                    setScheduleError(null);
                    setScheduleFieldErrors({});
                }}
                title={teachingSurface ? 'Schedule This Lesson' : 'Schedule Lesson'}
                size="lg"
            >
                <form onSubmit={handleSubmitSchedule} className="space-y-4">
                    <p className="text-sm text-gray-600">
                        {teachingSurface
                            ? 'Choose when you want to teach this lesson.'
                            : 'Choose when this lesson should take place.'}
                    </p>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <Input
                            label="Date"
                            type="date"
                            value={scheduleForm.session_date}
                            onChange={(event) => handleScheduleFormPatch({
                                session_date: event.target.value,
                            })}
                            required
                        />
                        <Input
                            label="Venue"
                            value={scheduleForm.venue}
                            onChange={(event) => handleScheduleFormPatch({
                                venue: event.target.value,
                            })}
                            placeholder="Optional venue"
                        />
                        <Select
                            label="Session category"
                            value={scheduleForm.session_type}
                            onChange={(event) => handleScheduleFormPatch({
                                session_type: event.target.value as ScheduleLessonSessionType,
                            })}
                            options={SCHEDULE_LESSON_SESSION_TYPE_OPTIONS}
                        />
                        <Input
                            label="Start time"
                            type="time"
                            value={scheduleForm.start_time}
                            onChange={(event) => handleScheduleFormPatch({
                                start_time: event.target.value,
                            })}
                            required
                        />
                        <Input
                            label="End time"
                            type="time"
                            value={scheduleForm.end_time}
                            onChange={(event) => handleScheduleFormPatch({
                                end_time: event.target.value,
                            })}
                            required
                        />
                    </div>

                    {scheduleExtensionContext ? scheduleExtensions.map((extension) => {
                        const ExtensionComponent = extension.Component;
                        return (
                            <ExtensionComponent
                                key={extension.key}
                                {...scheduleExtensionContext}
                                errors={scheduleFieldErrors}
                                onChange={handleScheduleFormPatch}
                            />
                        );
                    }) : null}

                    <div className="space-y-1">
                        <label className="block text-sm font-medium text-gray-700">Notes</label>
                        <textarea
                            value={scheduleForm.description}
                            onChange={(event) => handleScheduleFormPatch({
                                description: event.target.value,
                            })}
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
                            {teachingSurface ? 'Schedule this lesson' : 'Schedule lesson'}
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
