'use client';

import type { FormEvent } from 'react';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Bot, BookOpen, CalendarClock, CheckCircle2 } from 'lucide-react';
import { Button } from '@/app/components/ui/Button';
import { Card } from '@/app/components/ui/Card';
import { ErrorBanner } from '@/app/components/ui/ErrorBanner';
import { ErrorState } from '@/app/components/ui/ErrorState';
import { Input } from '@/app/components/ui/Input';
import { LoadingSpinner } from '@/app/components/ui/LoadingSpinner';
import { Select } from '@/app/components/ui/Select';
import { lessonPlanAPI } from '@/app/core/api/lessonPlans';
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

function emptyReferencePage(): ReferencePageInput {
    return {
        resource_title: '',
        chapter: '',
        topic_label: '',
        page_start: 1,
        page_end: 1,
        notes: '',
        keywords: [],
        strand_id: null,
        strand_name: '',
        sub_strand_id: null,
        sub_strand_name: '',
        outcome_id: null,
        outcome_code: '',
    };
}

function normalizeReferencePage(
    reference: ReferencePageInput,
    plannedOutcomes: Map<number, PlannedOutcome>,
): ReferencePageInput {
    const selectedOutcome = reference.outcome_id
        ? plannedOutcomes.get(reference.outcome_id)
        : undefined;

    return {
        ...reference,
        resource_title: reference.resource_title.trim(),
        chapter: reference.chapter?.trim() || '',
        topic_label: (
            reference.topic_label?.trim()
            || reference.sub_strand_name?.trim()
            || selectedOutcome?.sub_strand
            || selectedOutcome?.text
            || ''
        ),
        notes: reference.notes?.trim() || '',
        keywords: [],
        strand_name: reference.strand_name?.trim() || selectedOutcome?.strand || '',
        sub_strand_name: reference.sub_strand_name?.trim() || selectedOutcome?.sub_strand || '',
        outcome_code: reference.outcome_code?.trim() || selectedOutcome?.code || '',
        strand_id: reference.strand_id ?? selectedOutcome?.strand_id ?? null,
        sub_strand_id: reference.sub_strand_id ?? selectedOutcome?.sub_strand_id ?? null,
        outcome_id: reference.outcome_id ?? null,
    };
}

export function GenerateLessonPlanPage() {
    const router = useRouter();
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
    const [referencePages, setReferencePages] = useState<ReferencePageInput[]>([emptyReferencePage()]);
    const [useAi, setUseAi] = useState(true);
    const [submittingError, setSubmittingError] = useState<string | null>(null);
    const [showRetryWithoutAi, setShowRetryWithoutAi] = useState(false);
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
    const completedReferenceCount = useMemo(
        () => referencePages.filter((reference) => (
            reference.resource_title.trim().length > 0
            && reference.page_start > 0
            && reference.page_end > 0
            && Boolean(reference.outcome_id)
        )).length,
        [referencePages]
    );
    const aiGenerationAvailable = Boolean(curriculumContext?.ai_generation_available);
    const stepCards = [
        {
            step: 'Step 1',
            title: 'Class subject and term',
            detail: selectedCohortSubjectId && termId
                ? 'Ready'
                : 'Choose the lesson context first.',
            complete: Boolean(selectedCohortSubjectId && termId),
        },
        {
            step: 'Step 2',
            title: 'Learning outcomes',
            detail: plannedOutcomes.length > 0
                ? `${plannedOutcomes.length} selected`
                : 'Choose the outcomes to teach.',
            complete: plannedOutcomes.length > 0,
        },
        {
            step: 'Step 3',
            title: 'References and pages',
            detail: completedReferenceCount > 0
                ? `${completedReferenceCount} attached`
                : 'Attach the pages the draft may use.',
            complete: completedReferenceCount > 0,
        },
        {
            step: 'Step 4',
            title: 'Generate draft',
            detail: useAi && aiGenerationAvailable
                ? 'AI-assisted draft'
                : 'Rule-based draft',
            complete: false,
        },
    ];

    useEffect(() => {
        setPlannedOutcomes([]);
        setReferencePages([emptyReferencePage()]);
    }, [cohortSubjectId]);

    useEffect(() => {
        setSubmittingError(null);
        setShowRetryWithoutAi(false);
        clearCreateError();
        clearGenerateError();
    }, [clearCreateError, clearGenerateError, cohortSubjectId, termId]);

    useEffect(() => {
        if (!curriculumContext) {
            return;
        }

        setUseAi(Boolean(curriculumContext.ai_generation_available));
    }, [curriculumContext]);

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

        const cleanedReferences = referencePages
            .map((reference) => normalizeReferencePage(reference, plannedOutcomeMap))
            .filter((reference) => (
                reference.resource_title
                && reference.page_start > 0
                && reference.page_end > 0
                && reference.outcome_id
            ));

        if (cleanedReferences.length === 0) {
            setSubmittingError('Add at least one book page before generating the lesson plan.');
            return;
        }

        try {
            const lessonPlan = await upsertDraftLessonPlan({
                cohort_subject: selectedCohortSubjectId,
                term: Number(termId),
                title: title.trim() || undefined,
                planned_outcomes: plannedOutcomes,
                reference_pages: cleanedReferences,
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
        <div className="space-y-6">
            <div className="space-y-3">
                <Link href="/lesson-plans">
                    <Button variant="ghost" size="sm">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back
                    </Button>
                </Link>

                <div>
                    <h1 className="text-2xl font-semibold text-gray-900">Plan a lesson</h1>
                    <p className="mt-1 text-gray-600">
                        Prepare an editable draft using teacher-selected outcomes and reference pages.
                    </p>
                </div>
            </div>

            <div className="grid gap-3 md:grid-cols-4">
                {stepCards.map((item) => (
                    <div
                        key={item.step}
                        className={`rounded-lg border p-4 ${
                            item.complete
                                ? 'border-blue-200 bg-blue-50/70'
                                : 'border-gray-200 bg-gray-50'
                        }`}
                    >
                        <div className="flex items-center justify-between gap-3">
                            <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                                {item.step}
                            </span>
                            {item.complete ? (
                                <CheckCircle2 className="h-4 w-4 text-blue-600" />
                            ) : null}
                        </div>
                        <p className="mt-2 text-sm font-medium text-gray-900">{item.title}</p>
                        <p className="mt-1 text-sm text-gray-600">{item.detail}</p>
                    </div>
                ))}
            </div>

            {(createError || generateError || submittingError) && !showRetryWithoutAi ? (
                <ErrorBanner
                    message={submittingError || createError || generateError || 'We could not generate the lesson plan.'}
                    onDismiss={() => {
                        setSubmittingError(null);
                        clearCreateError();
                        clearGenerateError();
                    }}
                />
            ) : null}

            {showRetryWithoutAi ? (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="space-y-1">
                            <p className="font-medium text-amber-900">
                                AI-assisted drafting is unavailable for this lesson right now.
                            </p>
                            <p>
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
                            className="bg-white"
                        >
                            Generate without AI
                        </Button>
                    </div>
                </div>
            ) : null}

            <form onSubmit={handleSubmit} className="space-y-6">
                <Card className="border-gray-200 bg-gray-50/60">
                    <div className="space-y-5">
                        <div className="flex items-center justify-between gap-3">
                            <div className="space-y-1">
                                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                                    Step 1
                                </p>
                                <div className="flex items-center gap-2 text-sm font-medium text-gray-900">
                                    <BookOpen className="h-4 w-4 text-gray-500" />
                                    Select class subject and term
                                </div>
                            </div>
                            <span className="rounded-full border border-gray-200 bg-white px-2.5 py-1 text-xs font-medium text-gray-600">
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
                        <Card>
                            <p className="text-sm text-red-600">{curriculumError}</p>
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

                <Card className="border-gray-200 bg-gray-50/60">
                    <div className="space-y-5">
                        <div className="flex items-center justify-between gap-3">
                            <div className="space-y-1">
                                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                                    Step 4
                                </p>
                                <div className="flex items-center gap-2 text-sm font-medium text-gray-900">
                                    <CalendarClock className="h-4 w-4 text-gray-500" />
                                    Generate lesson plan
                                </div>
                            </div>
                            <span className="rounded-full border border-gray-200 bg-white px-2.5 py-1 text-xs font-medium text-gray-600">
                                {completedReferenceCount} reference{completedReferenceCount === 1 ? '' : 's'}
                            </span>
                        </div>

                        <div className="rounded-lg border border-gray-200 bg-white p-4 text-sm text-gray-600">
                            AI creates a draft, not a final lesson plan. The plan stays editable, and the outcomes and references you choose constrain what the draft may use.
                        </div>

                        <label className="flex items-start gap-3 rounded-lg border border-gray-200 bg-white p-4">
                            <input
                                type="checkbox"
                                checked={useAi}
                                onChange={(event) => setUseAi(event.target.checked)}
                                disabled={!aiGenerationAvailable}
                                className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600"
                            />
                            <span className="space-y-1 text-sm text-gray-700">
                                <span className="flex items-center gap-2 font-medium text-gray-900">
                                    <Bot className="h-4 w-4 text-gray-500" />
                                    Use AI-assisted drafting
                                </span>
                                <span className="block text-gray-500">
                                    {aiGenerationAvailable
                                        ? 'AI uses only the selected outcomes and reference pages you attached.'
                                        : 'AI-assisted drafting is not configured right now. You can still generate a lesson plan without AI.'}
                                </span>
                            </span>
                        </label>
                    </div>
                </Card>

                <div className="flex justify-end">
                    <Button type="submit" disabled={submitting || curriculumLoading}>
                        {submitting ? 'Generating...' : 'Generate lesson plan'}
                    </Button>
                </div>
            </form>
        </div>
    );
}
