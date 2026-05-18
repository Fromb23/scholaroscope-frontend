'use client';

import type { FormEvent } from 'react';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Bot, BookOpen, CalendarClock } from 'lucide-react';
import { Button } from '@/app/components/ui/Button';
import { Card } from '@/app/components/ui/Card';
import { ErrorBanner } from '@/app/components/ui/ErrorBanner';
import { ErrorState } from '@/app/components/ui/ErrorState';
import { Input } from '@/app/components/ui/Input';
import { LoadingSpinner } from '@/app/components/ui/LoadingSpinner';
import { Select } from '@/app/components/ui/Select';
import { LessonPlanOutcomeProviderSlot } from '@/app/core/components/lessonPlans/LessonPlanOutcomeProviderSlot';
import { useTerms } from '@/app/core/hooks/useAcademic';
import { useInstructorCohortAccess } from '@/app/core/hooks/useInstructorCohortAccess';
import {
    useCreateLessonPlan,
    useGenerateLessonPlan,
    useLessonPlanCurriculumContext,
} from '@/app/core/hooks/useLessonPlans';
import type { PlannedOutcome, ReferencePageInput } from '@/app/core/types/lessonPlans';

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

    useEffect(() => {
        setPlannedOutcomes([]);
        setReferencePages([emptyReferencePage()]);
    }, [cohortSubjectId]);

    useEffect(() => {
        setSubmittingError(null);
        clearCreateError();
        clearGenerateError();
    }, [clearCreateError, clearGenerateError, cohortSubjectId]);

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setSubmittingError(null);
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
            const lessonPlan = await createLessonPlan({
                cohort_subject: selectedCohortSubjectId,
                term: Number(termId),
                title: title.trim() || undefined,
                planned_outcomes: plannedOutcomes,
                reference_pages: cleanedReferences,
            });

            const generated = await generateLessonPlan(lessonPlan.id, {
                force_regenerate: false,
                use_ai: useAi,
            });

            router.push(
                `/lesson-plans/${generated.lesson_plan.id}?notice=${generated.created ? 'generated' : 'existing'}&references=${generated.selected_references_count}`
            );
        } catch (submitError) {
            setSubmittingError(
                submitError instanceof Error
                    ? submitError.message
                    : 'We could not generate the lesson plan.'
            );
        }
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
                        What are you preparing to teach?
                    </p>
                </div>
            </div>

            {createError || generateError || submittingError ? (
                <ErrorBanner
                    message={submittingError || createError || generateError || 'We could not generate the lesson plan.'}
                    onDismiss={() => {
                        setSubmittingError(null);
                        clearCreateError();
                        clearGenerateError();
                    }}
                />
            ) : null}

            <form onSubmit={handleSubmit} className="space-y-6">
                <Card>
                    <div className="space-y-5">
                        <div className="flex items-center gap-2 text-sm font-medium text-gray-900">
                            <BookOpen className="h-4 w-4 text-gray-500" />
                            What are you preparing to teach?
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

                <Card>
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 text-sm font-medium text-gray-900">
                            <CalendarClock className="h-4 w-4 text-gray-500" />
                            Generate lesson plan
                        </div>
                        <label className="flex items-start gap-3 rounded-lg border border-gray-200 p-4">
                            <input
                                type="checkbox"
                                checked={useAi}
                                onChange={(event) => setUseAi(event.target.checked)}
                                className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600"
                            />
                            <span className="space-y-1 text-sm text-gray-700">
                                <span className="flex items-center gap-2 font-medium text-gray-900">
                                    <Bot className="h-4 w-4 text-gray-500" />
                                    Use AI drafting
                                </span>
                                <span className="block text-gray-500">
                                    AI uses only the selected outcomes and the reference pages you added.
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
