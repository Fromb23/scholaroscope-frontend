'use client';

import type { FormEvent } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
    AlertCircle,
    ArrowLeft,
    Bot,
    BookOpen,
    CalendarClock,
    CheckCircle2,
    ChevronDown,
    ChevronUp,
    Info,
} from 'lucide-react';
import { Button } from '@/app/components/ui/Button';
import { Card } from '@/app/components/ui/Card';
import { ErrorBanner } from '@/app/components/ui/ErrorBanner';
import { ErrorState } from '@/app/components/ui/ErrorState';
import { Input } from '@/app/components/ui/Input';
import { LoadingSpinner } from '@/app/components/ui/LoadingSpinner';
import { Select } from '@/app/components/ui/Select';
import { lessonPlanAPI } from '@/app/core/api/lessonPlans';
import {
    getReferenceOutcomeCoverage,
    isReferencePageStarted,
    validateReferencePages,
} from '@/app/core/lib/lessonPlanReferences';
import { LessonPlanOutcomeProviderSlot } from '@/app/core/components/lessonPlans/LessonPlanOutcomeProviderSlot';
import { useTerms } from '@/app/core/hooks/useAcademic';
import { useInstructorCohortAccess } from '@/app/core/hooks/useInstructorCohortAccess';
import {
    useCreateLessonPlan,
    useGenerateLessonPlan,
    useLessonPlanCurriculumContext,
} from '@/app/core/hooks/useLessonPlans';
import type { ApiError } from '@/app/core/types/errors';
import { extractErrorMessage } from '@/app/core/types/errors';
import type {
    LessonPlan,
    LessonPlanCreatePayload,
    LessonPlanUpdatePayload,
    PlannedOutcome,
    ReferencePageInput,
} from '@/app/core/types/lessonPlans';

export function GenerateLessonPlanPage() {
    const router = useRouter();
    const errorContainerRef = useRef<HTMLDivElement | null>(null);
    const { terms } = useTerms();
    const { assignments, isLoading: assignmentsLoading, error: assignmentsError } = useInstructorCohortAccess();
    const {
        createLessonPlan,
        submitting: creatingLessonPlan,
        error: createError,
        clearError: clearCreateError,
    } = useCreateLessonPlan();
    const {
        generateLessonPlan,
        submitting: generatingLessonPlan,
        error: generateError,
        clearError: clearGenerateError,
    } = useGenerateLessonPlan();

    const [cohortSubjectId, setCohortSubjectId] = useState('');
    const [termId, setTermId] = useState('');
    const [title, setTitle] = useState('');
    const [plannedOutcomes, setPlannedOutcomes] = useState<PlannedOutcome[]>([]);
    const [referencePages, setReferencePages] = useState<ReferencePageInput[]>([]);
    const [useAi, setUseAi] = useState(true);
    const [submittingError, setSubmittingError] = useState<string | null>(null);
    const [showRetryWithoutAi, setShowRetryWithoutAi] = useState(false);
    const [guidanceOpen, setGuidanceOpen] = useState(false);
    const [draftLessonPlan, setDraftLessonPlan] = useState<{
        id: number;
        cohortSubjectId: number;
        termId: number;
    } | null>(null);

    const selectedCohortSubjectId = cohortSubjectId ? Number(cohortSubjectId) : null;
    const {
        curriculumContext,
        loading: curriculumLoading,
        error: curriculumError,
    } = useLessonPlanCurriculumContext(selectedCohortSubjectId);

    const assignmentOptions = useMemo(
        () =>
            assignments
                .filter((assignment) => assignment.cohort_subject_id)
                .map((assignment) => ({
                    value: String(assignment.cohort_subject_id),
                    label: `${assignment.cohort_name} • ${assignment.subject_name}`,
                })),
        [assignments]
    );

    const submitting = creatingLessonPlan || generatingLessonPlan;
    const plannedOutcomeMap = useMemo(
        () => new Map(plannedOutcomes.map((outcome) => [outcome.outcome_id, outcome])),
        [plannedOutcomes]
    );
    const referenceCoverage = useMemo(
        () => getReferenceOutcomeCoverage(referencePages, plannedOutcomes),
        [plannedOutcomes, referencePages]
    );
    const completedReferenceCount = referenceCoverage.completeReferenceCount;
    const aiGenerationAvailability = selectedCohortSubjectId && curriculumLoading
        ? null
        : curriculumContext?.ai_generation_available ?? null;
    const aiGenerationAvailable = aiGenerationAvailability === true;
    const activeErrorMessage = submittingError || createError || generateError || null;
    const showMissingReferenceWarning = (
        plannedOutcomes.length > 0
        && referenceCoverage.missingOutcomes.length > 0
        && referencePages.some((reference) => isReferencePageStarted(reference))
    );
    const guidanceSteps = [
        {
            step: 'Step 1',
            title: 'Choose the lesson context',
            detail: selectedCohortSubjectId && termId
                ? 'Ready'
                : 'Choose the lesson context first.',
            complete: Boolean(selectedCohortSubjectId && termId),
        },
        {
            step: 'Step 2',
            title: 'Select learning outcomes',
            detail: plannedOutcomes.length > 0
                ? `${plannedOutcomes.length} selected`
                : 'Choose the outcomes to teach.',
            complete: plannedOutcomes.length > 0,
        },
        {
            step: 'Step 3',
            title: 'Attach references and pages',
            detail: completedReferenceCount > 0
                ? `${referenceCoverage.coveredOutcomeIds.size} of ${plannedOutcomes.length} outcomes referenced`
                : 'Attach the pages the draft may use.',
            complete: completedReferenceCount > 0,
        },
        {
            step: 'Step 4',
            title: 'Generate the draft',
            detail: !selectedCohortSubjectId
                ? 'Choose the lesson context first.'
                : curriculumLoading || aiGenerationAvailability === null
                    ? 'Checking AI availability.'
                    : useAi && aiGenerationAvailable
                        ? 'AI-assisted draft'
                        : 'Rule-based draft',
            complete: false,
        },
    ];

    useEffect(() => {
        setPlannedOutcomes([]);
        setReferencePages([]);
    }, [cohortSubjectId]);

    useEffect(() => {
        setSubmittingError(null);
        setShowRetryWithoutAi(false);
        clearCreateError();
        clearGenerateError();
    }, [clearCreateError, clearGenerateError, cohortSubjectId, termId]);

    useEffect(() => {
        if (aiGenerationAvailability === null) {
            return;
        }

        setUseAi(aiGenerationAvailability);
    }, [aiGenerationAvailability]);

    useEffect(() => {
        if (!activeErrorMessage && !showRetryWithoutAi) {
            return;
        }

        const node = errorContainerRef.current;
        if (!node) {
            return;
        }

        requestAnimationFrame(() => {
            node.scrollIntoView({ behavior: 'smooth', block: 'center' });
            node.focus({ preventScroll: true });
        });
    }, [activeErrorMessage, showRetryWithoutAi]);

    const submitButtonDisabled = submitting || curriculumLoading;

    const clearVisibleErrors = () => {
        setSubmittingError(null);
        clearCreateError();
        clearGenerateError();
        setShowRetryWithoutAi(false);
    };

    const upsertDraftLessonPlan = async (
        payload: LessonPlanCreatePayload,
    ): Promise<LessonPlan> => {
        if (
            draftLessonPlan
            && draftLessonPlan.cohortSubjectId === payload.cohort_subject
            && draftLessonPlan.termId === payload.term
        ) {
            try {
                const updatePayload: LessonPlanUpdatePayload = {
                    title: payload.title,
                    planned_outcomes: payload.planned_outcomes,
                    reference_pages: payload.reference_pages,
                };
                return await lessonPlanAPI.update(draftLessonPlan.id, updatePayload);
            } catch (err) {
                throw new Error(
                    extractErrorMessage(
                        err as ApiError,
                        'Failed to update the draft lesson plan.'
                    )
                );
            }
        }

        const lessonPlan = await createLessonPlan(payload);
        setDraftLessonPlan({
            id: lessonPlan.id,
            cohortSubjectId: payload.cohort_subject,
            termId: payload.term,
        });
        return lessonPlan;
    };

    const submitGeneration = async (requestedUseAi: boolean) => {
        setSubmittingError(null);
        setShowRetryWithoutAi(false);
        clearCreateError();
        clearGenerateError();

        if (!selectedCohortSubjectId || !termId) {
            setSubmittingError('Choose the class subject and term before continuing.');
            return;
        }

        if (!curriculumContext || !curriculumContext.supports_outcome_selection) {
            setSubmittingError('Lesson planning is not configured for this curriculum yet.');
            return;
        }

        if (plannedOutcomes.length === 0) {
            setSubmittingError('Choose at least one learning outcome before generating the lesson plan.');
            return;
        }

        const validatedReferences = validateReferencePages(referencePages, plannedOutcomeMap, {
            requireAtLeastOne: true,
        });
        if (validatedReferences.error) {
            setSubmittingError(validatedReferences.error);
            return;
        }

        try {
            const lessonPlan = await upsertDraftLessonPlan({
                cohort_subject: selectedCohortSubjectId,
                term: Number(termId),
                title: title.trim() || undefined,
                planned_outcomes: plannedOutcomes,
                reference_pages: validatedReferences.payload,
            });

            const generated = await generateLessonPlan(lessonPlan.id, {
                force_regenerate: false,
                use_ai: requestedUseAi,
            });

            router.push(
                `/lesson-plans/${generated.lesson_plan.id}?notice=${generated.created ? 'generated' : 'existing'}&mode=${generated.lesson_plan.generated_by_ai ? 'ai' : 'standard'}&references=${generated.selected_references_count}`
            );
        } catch (submitError) {
            const status = (submitError as Error & { status?: number }).status;
            if (status === 503 && requestedUseAi) {
                setShowRetryWithoutAi(true);
            }
            setSubmittingError(
                submitError instanceof Error
                    ? submitError.message
                    : 'We could not generate the lesson plan.'
            );
        }
    };

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        await submitGeneration(useAi && aiGenerationAvailable);
    };

    if (assignmentsLoading) {
        return <LoadingSpinner message="Loading teaching assignments..." fullScreen={false} />;
    }

    if (assignmentsError) {
        return (
            <ErrorState
                fullScreen={false}
                message={assignmentsError.message}
            />
        );
    }

    return (
        <div className="space-y-6 pb-32 md:pb-0">
            <div className="space-y-3">
                <Link href="/lesson-plans">
                    <Button variant="ghost" size="sm">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back
                    </Button>
                </Link>

                <div>
                    <h1 className="text-2xl font-semibold theme-text">Plan a lesson</h1>
                    <p className="mt-1 theme-muted">
                        Prepare an editable draft using teacher-selected outcomes and reference pages.
                    </p>
                </div>

                <div className="theme-warning-surface overflow-hidden rounded-xl">
                    <button
                        type="button"
                        onClick={() => setGuidanceOpen((current) => !current)}
                        className="flex w-full items-start justify-between gap-3 px-4 py-3 text-left"
                    >
                        <div className="flex min-w-0 items-start gap-3">
                            <div className="theme-surface-elevated rounded-full border p-2 text-[color:var(--color-warning)] theme-border">
                                <Info className="h-4 w-4" />
                            </div>
                            <div className="min-w-0 space-y-1">
                                <p className="text-sm font-medium theme-text">
                                    How to generate a lesson plan
                                </p>
                                <p className="text-sm theme-muted">
                                    Open the quick guide when you want the teacher checklist.
                                </p>
                            </div>
                        </div>
                        {guidanceOpen ? (
                            <ChevronUp className="mt-0.5 h-4 w-4 shrink-0 text-[color:var(--color-warning)]" />
                        ) : (
                            <ChevronDown className="mt-0.5 h-4 w-4 shrink-0 text-[color:var(--color-warning)]" />
                        )}
                    </button>

                    {guidanceOpen ? (
                        <div className="border-t px-4 py-4 theme-border">
                            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                                {guidanceSteps.map((item) => (
                                    <div
                                        key={item.step}
                                        className={`rounded-lg border p-4 ${
                                            item.complete
                                                ? 'theme-info-surface-strong'
                                                : 'theme-border theme-surface-elevated'
                                        }`}
                                    >
                                        <div className="flex items-center justify-between gap-3">
                                            <span className="text-xs font-semibold uppercase tracking-wide theme-subtle">
                                                {item.step}
                                            </span>
                                            {item.complete ? (
                                                <CheckCircle2 className="h-4 w-4 text-blue-600" />
                                            ) : null}
                                        </div>
                                        <p className="mt-2 text-sm font-medium theme-text">{item.title}</p>
                                        <p className="mt-1 text-sm theme-muted">{item.detail}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : null}
                </div>
            </div>

            <div
                ref={errorContainerRef}
                tabIndex={-1}
                className="space-y-3 outline-none"
                aria-live="assertive"
            >
                {activeErrorMessage && !showRetryWithoutAi ? (
                    <ErrorBanner
                        message={activeErrorMessage || 'We could not generate the lesson plan.'}
                        onDismiss={clearVisibleErrors}
                    />
                ) : null}

                {showRetryWithoutAi ? (
                    <div className="theme-warning-surface rounded-xl p-4 text-sm">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div className="space-y-1">
                                <p className="font-medium theme-text">
                                    AI-assisted drafting is unavailable for this lesson right now.
                                </p>
                                <p className="theme-muted">
                                    You can generate the same lesson plan without AI. The draft will still use the outcomes and references you selected.
                                </p>
                            </div>
                            <Button
                                type="button"
                                variant="secondary"
                                onClick={() => {
                                    setUseAi(false);
                                    void submitGeneration(false);
                                }}
                                disabled={submitting}
                            >
                                Generate without AI
                            </Button>
                        </div>
                    </div>
                ) : null}

                {showMissingReferenceWarning ? (
                    <div className="theme-warning-surface rounded-xl p-4 text-sm">
                        You selected {plannedOutcomes.length} outcome{plannedOutcomes.length === 1 ? '' : 's'}, but{' '}
                        {referenceCoverage.missingOutcomes.length} {referenceCoverage.missingOutcomes.length === 1 ? 'still needs' : 'still need'} a reference.
                        Add one for each outcome, or continue if that is intentional.
                    </div>
                ) : null}
            </div>

            <form id="generate-lesson-plan-form" onSubmit={handleSubmit} className="space-y-6 pb-24 md:pb-0">
                <Card className="theme-card-muted">
                    <div className="space-y-5">
                        <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2 text-sm font-medium theme-text">
                                <BookOpen className="h-4 w-4 theme-subtle" />
                                Lesson context
                            </div>
                            <span className="theme-surface-elevated rounded-full border px-2.5 py-1 text-xs font-medium theme-border theme-muted">
                                {selectedCohortSubjectId && termId ? 'Ready' : 'Required'}
                            </span>
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                            <Select
                                label="Class subject"
                                value={cohortSubjectId}
                                onChange={(event) => setCohortSubjectId(event.target.value)}
                                options={[
                                    { value: '', label: 'Choose class subject' },
                                    ...assignmentOptions,
                                ]}
                            />

                            <Select
                                label="Term"
                                value={termId}
                                onChange={(event) => setTermId(event.target.value)}
                                options={[
                                    { value: '', label: 'Choose term' },
                                    ...terms.map((term) => ({
                                        value: String(term.id),
                                        label: term.name,
                                    })),
                                ]}
                            />
                        </div>

                        <Input
                            label="Lesson title"
                            value={title}
                            onChange={(event) => setTitle(event.target.value)}
                            placeholder="Optional title"
                        />
                    </div>
                </Card>

                {selectedCohortSubjectId ? (
                    curriculumLoading ? (
                        <Card>
                            <LoadingSpinner message="Loading lesson planning setup..." fullScreen={false} />
                        </Card>
                    ) : curriculumError ? (
                        <Card className="theme-danger-surface">
                            <p className="text-sm theme-text">{curriculumError}</p>
                        </Card>
                    ) : curriculumContext ? (
                        <LessonPlanOutcomeProviderSlot
                            cohortSubjectId={selectedCohortSubjectId}
                            context={curriculumContext}
                            plannedOutcomes={plannedOutcomes}
                            onPlannedOutcomesChange={setPlannedOutcomes}
                            referencePages={referencePages}
                            onReferencePagesChange={setReferencePages}
                        />
                    ) : null
                ) : null}

                <Card className="theme-card-muted">
                    <div className="space-y-5">
                        <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2 text-sm font-medium theme-text">
                                <CalendarClock className="h-4 w-4 theme-subtle" />
                                Generate draft
                            </div>
                            <span className="theme-surface-elevated rounded-full border px-2.5 py-1 text-xs font-medium theme-border theme-muted">
                                {completedReferenceCount} reference{completedReferenceCount === 1 ? '' : 's'}
                            </span>
                        </div>

                        <div className="theme-info-surface rounded-lg p-4 text-sm theme-muted">
                            AI creates a draft, not a final lesson plan. The plan stays editable, and the outcomes and references you choose constrain what the draft may use.
                        </div>

                        <label className="theme-card flex items-start gap-3 rounded-lg p-4">
                            <input
                                type="checkbox"
                                checked={useAi}
                                onChange={(event) => setUseAi(event.target.checked)}
                                disabled={
                                    !selectedCohortSubjectId
                                    || curriculumLoading
                                    || !aiGenerationAvailable
                                }
                                className="theme-checkbox theme-border mt-1 h-4 w-4 rounded"
                            />
                            <span className="space-y-1 text-sm theme-text">
                                <span className="flex items-center gap-2 font-medium theme-text">
                                    <Bot className="h-4 w-4 theme-subtle" />
                                    Use AI-assisted drafting
                                </span>
                                <span className="block theme-muted">
                                    {!selectedCohortSubjectId
                                        ? 'Choose a class subject to check whether AI-assisted drafting is available.'
                                        : curriculumLoading || aiGenerationAvailability === null
                                            ? 'Checking AI-assisted drafting availability for this class subject.'
                                            : aiGenerationAvailable
                                        ? 'AI uses only the selected outcomes and reference pages you attached.'
                                        : 'AI-assisted drafting is not configured right now. You can still generate a lesson plan without AI.'}
                                </span>
                            </span>
                        </label>
                    </div>
                </Card>

                {activeErrorMessage ? (
                    <div className="theme-danger-surface hidden rounded-lg px-4 py-3 text-sm md:flex md:items-start md:gap-3">
                        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-[color:var(--color-danger)]" />
                        <span className="flex-1">{activeErrorMessage}</span>
                    </div>
                ) : null}

                <div className="hidden justify-end md:flex">
                    <Button type="submit" disabled={submitButtonDisabled}>
                        {submitting ? 'Generating...' : 'Generate lesson plan'}
                    </Button>
                </div>
            </form>

            <div className="theme-surface-elevated fixed inset-x-0 bottom-0 z-30 border-t px-4 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-3 shadow-[0_-8px_24px_rgba(15,23,42,0.08)] md:hidden theme-border">
                <div className="mx-auto max-w-6xl space-y-3">
                    {activeErrorMessage ? (
                        <div className="theme-danger-surface rounded-lg px-3 py-2 text-sm">
                            {activeErrorMessage}
                        </div>
                    ) : null}
                    <Button
                        type="submit"
                        form="generate-lesson-plan-form"
                        className="w-full"
                        disabled={submitButtonDisabled}
                    >
                        {submitting ? 'Generating...' : 'Generate lesson plan'}
                    </Button>
                </div>
            </div>
        </div>
    );
}
