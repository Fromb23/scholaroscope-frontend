'use client';

import type { FormEvent } from 'react';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Bot, BookOpen, CalendarClock, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/app/components/ui/Button';
import { Card } from '@/app/components/ui/Card';
import { ErrorBanner } from '@/app/components/ui/ErrorBanner';
import { ErrorState } from '@/app/components/ui/ErrorState';
import { Input } from '@/app/components/ui/Input';
import { LoadingSpinner } from '@/app/components/ui/LoadingSpinner';
import { Select } from '@/app/components/ui/Select';
import { apiClient } from '@/app/core/api/client';
import { useGenerateLessonPlan, useLessonPlans } from '@/app/core/hooks/useLessonPlans';
import { useTerms } from '@/app/core/hooks/useAcademic';
import { useInstructorCohortAccess } from '@/app/core/hooks/useInstructorCohortAccess';
import type { PlannedOutcome, ReferencePageInput } from '@/app/core/types/lessonPlans';

interface ManualOutcomeDraft {
    code: string;
    text: string;
    strand: string;
    sub_strand: string;
}

interface LearningOutcomeOption {
    id: number;
    code: string;
    description: string;
    strand_name: string;
    sub_strand_name: string;
}

function emptyReference(): ReferencePageInput {
    return {
        resource_title: '',
        chapter: '',
        topic_label: '',
        page_start: 1,
        page_end: 1,
        notes: '',
        keywords: [],
    };
}

function emptyManualOutcome(): ManualOutcomeDraft {
    return {
        code: '',
        text: '',
        strand: '',
        sub_strand: '',
    };
}

async function fetchLearningOutcomesByLevel(level: string): Promise<LearningOutcomeOption[]> {
    const response = await apiClient.get<LearningOutcomeOption[]>('/cbc/learning-outcomes/', {
        params: { level },
    });
    return response.data;
}

function toPlannedOutcome(outcome: LearningOutcomeOption): PlannedOutcome {
    return {
        plugin: 'cbc',
        outcome_id: outcome.id,
        code: outcome.code,
        text: outcome.description,
        strand: outcome.strand_name,
        sub_strand: outcome.sub_strand_name,
    };
}

export function GenerateLessonPlanPage() {
    const router = useRouter();
    const { terms } = useTerms();
    const { assignments, isLoading: assignmentsLoading, error: assignmentsError } = useInstructorCohortAccess();
    const { createLessonPlan } = useLessonPlans();
    const { generateLessonPlan, submitting, error, clearError } = useGenerateLessonPlan();

    const [cohortSubjectId, setCohortSubjectId] = useState('');
    const [termId, setTermId] = useState('');
    const [title, setTitle] = useState('');
    const [referencePages, setReferencePages] = useState<ReferencePageInput[]>([emptyReference()]);
    const [useAi, setUseAi] = useState(true);
    const [outcomesLoading, setOutcomesLoading] = useState(false);
    const [outcomesError, setOutcomesError] = useState<string | null>(null);
    const [availableOutcomes, setAvailableOutcomes] = useState<LearningOutcomeOption[]>([]);
    const [selectedOutcomeIds, setSelectedOutcomeIds] = useState<number[]>([]);
    const [outcomeSearch, setOutcomeSearch] = useState('');
    const [manualOutcomes, setManualOutcomes] = useState<ManualOutcomeDraft[]>([emptyManualOutcome()]);
    const [submittingError, setSubmittingError] = useState<string | null>(null);

    const assignmentOptions = useMemo(
        () =>
            assignments
                .filter((assignment) => assignment.cohort_subject_id)
                .map((assignment) => ({
                    value: String(assignment.cohort_subject_id),
                    label: `${assignment.cohort_name} • ${assignment.subject_name}`,
                    assignment,
                })),
        [assignments]
    );

    const selectedAssignment = useMemo(
        () =>
            assignmentOptions.find((option) => option.value === cohortSubjectId)?.assignment ?? null,
        [assignmentOptions, cohortSubjectId]
    );

    useEffect(() => {
        if (!selectedAssignment || selectedAssignment.curriculum_type !== 'CBE' || !selectedAssignment.level) {
            setAvailableOutcomes([]);
            setSelectedOutcomeIds([]);
            return;
        }

        let cancelled = false;
        const fetchOutcomes = async () => {
            try {
                setOutcomesLoading(true);
                setOutcomesError(null);
                const response = await fetchLearningOutcomesByLevel(selectedAssignment.level);
                if (!cancelled) {
                    setAvailableOutcomes(response);
                }
            } catch {
                if (!cancelled) {
                    setAvailableOutcomes([]);
                    setOutcomesError('We could not load learning outcomes for this class subject.');
                }
            } finally {
                if (!cancelled) {
                    setOutcomesLoading(false);
                }
            }
        };

        void fetchOutcomes();
        return () => {
            cancelled = true;
        };
    }, [selectedAssignment]);

    const filteredOutcomes = useMemo(() => {
        const search = outcomeSearch.trim().toLowerCase();
        if (!search) {
            return availableOutcomes;
        }

        return availableOutcomes.filter((outcome) =>
            `${outcome.code} ${outcome.description} ${outcome.strand_name} ${outcome.sub_strand_name}`
                .toLowerCase()
                .includes(search)
        );
    }, [availableOutcomes, outcomeSearch]);

    const addReference = () => {
        setReferencePages((current) => [...current, emptyReference()]);
    };

    const updateReference = (index: number, field: keyof ReferencePageInput, value: string) => {
        setReferencePages((current) =>
            current.map((reference, currentIndex) =>
                currentIndex === index
                    ? {
                        ...reference,
                        [field]: field === 'page_start' || field === 'page_end'
                            ? Number(value)
                            : value,
                    }
                    : reference
            )
        );
    };

    const removeReference = (index: number) => {
        setReferencePages((current) => current.filter((_, currentIndex) => currentIndex !== index));
    };

    const addManualOutcome = () => {
        setManualOutcomes((current) => [...current, emptyManualOutcome()]);
    };

    const updateManualOutcome = (
        index: number,
        field: keyof ManualOutcomeDraft,
        value: string,
    ) => {
        setManualOutcomes((current) =>
            current.map((outcome, currentIndex) =>
                currentIndex === index
                    ? { ...outcome, [field]: value }
                    : outcome
            )
        );
    };

    const removeManualOutcome = (index: number) => {
        setManualOutcomes((current) => current.filter((_, currentIndex) => currentIndex !== index));
    };

    const buildPlannedOutcomes = (): PlannedOutcome[] => {
        const selectedOutcomes = availableOutcomes
            .filter((outcome) => selectedOutcomeIds.includes(outcome.id))
            .map(toPlannedOutcome);

        if (selectedOutcomes.length > 0) {
            return selectedOutcomes;
        }

        return manualOutcomes
            .map((outcome, index) => ({
                plugin: 'manual',
                outcome_id: -(index + 1),
                code: outcome.code.trim(),
                text: outcome.text.trim(),
                strand: outcome.strand.trim(),
                sub_strand: outcome.sub_strand.trim(),
            }))
            .filter((outcome) => outcome.code && outcome.text && outcome.strand && outcome.sub_strand);
    };

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setSubmittingError(null);
        clearError();

        if (!cohortSubjectId || !termId) {
            setSubmittingError('Choose the class subject and term before continuing.');
            return;
        }

        const plannedOutcomes = buildPlannedOutcomes();
        if (plannedOutcomes.length === 0) {
            setSubmittingError('Choose learning outcomes before generating the lesson plan.');
            return;
        }

        const cleanedReferences = referencePages
            .map((reference) => ({
                ...reference,
                resource_title: reference.resource_title.trim(),
                chapter: reference.chapter?.trim() || '',
                topic_label: reference.topic_label?.trim() || '',
                notes: reference.notes?.trim() || '',
                keywords: [],
            }))
            .filter((reference) => reference.resource_title && reference.page_start && reference.page_end);

        if (cleanedReferences.length === 0) {
            setSubmittingError('Add reference pages before generating the lesson plan.');
            return;
        }

        try {
            const lessonPlan = await createLessonPlan({
                cohort_subject: Number(cohortSubjectId),
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

            {error || submittingError ? (
                <ErrorBanner
                    message={submittingError || error || 'We could not generate the lesson plan.'}
                    onDismiss={() => {
                        setSubmittingError(null);
                        clearError();
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
                                    ...assignmentOptions.map((option) => ({
                                        value: option.value,
                                        label: option.label,
                                    })),
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

                <Card>
                    <div className="space-y-5">
                        <div className="flex items-center gap-2 text-sm font-medium text-gray-900">
                            <BookOpen className="h-4 w-4 text-gray-500" />
                            Choose learning outcomes
                        </div>

                        {selectedAssignment?.curriculum_type === 'CBE' ? (
                            <>
                                <Input
                                    label="Search outcomes"
                                    value={outcomeSearch}
                                    onChange={(event) => setOutcomeSearch(event.target.value)}
                                    placeholder="Search by code or description"
                                />

                                {outcomesLoading ? (
                                    <LoadingSpinner message="Loading learning outcomes..." fullScreen={false} />
                                ) : null}

                                {outcomesError ? (
                                    <p className="text-sm text-red-600">{outcomesError}</p>
                                ) : null}

                                <div className="max-h-72 space-y-2 overflow-y-auto rounded-lg border border-gray-200 p-3">
                                    {filteredOutcomes.map((outcome) => (
                                        <label
                                            key={outcome.id}
                                            className="flex items-start gap-3 rounded-lg border border-gray-200 p-3"
                                        >
                                            <input
                                                type="checkbox"
                                                checked={selectedOutcomeIds.includes(outcome.id)}
                                                onChange={(event) => {
                                                    setSelectedOutcomeIds((current) =>
                                                        event.target.checked
                                                            ? [...current, outcome.id]
                                                            : current.filter((id) => id !== outcome.id)
                                                    );
                                                }}
                                                className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600"
                                            />
                                            <div className="text-sm">
                                                <p className="font-medium text-gray-900">{outcome.code}</p>
                                                <p className="text-gray-700">{outcome.description}</p>
                                                <p className="mt-1 text-xs text-gray-500">
                                                    {outcome.strand_name} · {outcome.sub_strand_name}
                                                </p>
                                            </div>
                                        </label>
                                    ))}
                                </div>
                            </>
                        ) : null}

                        <div className="space-y-3">
                            <div className="flex items-center justify-between gap-3">
                                <p className="text-sm font-medium text-gray-900">Manual outcomes</p>
                                <Button type="button" variant="ghost" size="sm" onClick={addManualOutcome}>
                                    <Plus className="mr-1.5 h-4 w-4" />
                                    Add outcome
                                </Button>
                            </div>

                            {manualOutcomes.map((outcome, index) => (
                                <div key={`manual-outcome-${index}`} className="grid gap-3 rounded-lg border border-gray-200 p-3 md:grid-cols-2">
                                    <Input
                                        label="Code"
                                        value={outcome.code}
                                        onChange={(event) => updateManualOutcome(index, 'code', event.target.value)}
                                        placeholder="Outcome code"
                                    />
                                    <Input
                                        label="Strand"
                                        value={outcome.strand}
                                        onChange={(event) => updateManualOutcome(index, 'strand', event.target.value)}
                                        placeholder="Strand"
                                    />
                                    <Input
                                        label="Sub-strand"
                                        value={outcome.sub_strand}
                                        onChange={(event) => updateManualOutcome(index, 'sub_strand', event.target.value)}
                                        placeholder="Sub-strand"
                                    />
                                    <Input
                                        label="Outcome text"
                                        value={outcome.text}
                                        onChange={(event) => updateManualOutcome(index, 'text', event.target.value)}
                                        placeholder="Describe the learning outcome"
                                    />
                                    <div className="md:col-span-2 flex justify-end">
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => removeManualOutcome(index)}
                                            disabled={manualOutcomes.length === 1}
                                        >
                                            <Trash2 className="mr-1.5 h-4 w-4" />
                                            Remove
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </Card>

                <Card>
                    <div className="space-y-5">
                        <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2 text-sm font-medium text-gray-900">
                                <BookOpen className="h-4 w-4 text-gray-500" />
                                Add reference pages
                            </div>
                            <Button type="button" variant="ghost" size="sm" onClick={addReference}>
                                <Plus className="mr-1.5 h-4 w-4" />
                                Add reference
                            </Button>
                        </div>

                        {referencePages.map((reference, index) => (
                            <div key={`reference-${index}`} className="grid gap-3 rounded-lg border border-gray-200 p-3 md:grid-cols-2">
                                <Input
                                    label="Book or resource"
                                    value={reference.resource_title}
                                    onChange={(event) => updateReference(index, 'resource_title', event.target.value)}
                                    placeholder="Resource title"
                                />
                                <Input
                                    label="Chapter"
                                    value={reference.chapter || ''}
                                    onChange={(event) => updateReference(index, 'chapter', event.target.value)}
                                    placeholder="Chapter"
                                />
                                <Input
                                    label="Topic"
                                    value={reference.topic_label || ''}
                                    onChange={(event) => updateReference(index, 'topic_label', event.target.value)}
                                    placeholder="Topic"
                                />
                                <Input
                                    label="Notes"
                                    value={reference.notes || ''}
                                    onChange={(event) => updateReference(index, 'notes', event.target.value)}
                                    placeholder="Optional notes"
                                />
                                <Input
                                    label="Page start"
                                    type="number"
                                    value={String(reference.page_start)}
                                    onChange={(event) => updateReference(index, 'page_start', event.target.value)}
                                />
                                <Input
                                    label="Page end"
                                    type="number"
                                    value={String(reference.page_end)}
                                    onChange={(event) => updateReference(index, 'page_end', event.target.value)}
                                />
                                <div className="md:col-span-2 flex justify-end">
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => removeReference(index)}
                                        disabled={referencePages.length === 1}
                                    >
                                        <Trash2 className="mr-1.5 h-4 w-4" />
                                        Remove
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                </Card>

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
                    <Button type="submit" disabled={submitting}>
                        {submitting ? 'Generating...' : 'Generate lesson plan'}
                    </Button>
                </div>
            </form>
        </div>
    );
}
