'use client';

import { BookOpen, Plus, Trash2 } from 'lucide-react';
import { Badge } from '@/app/components/ui/Badge';
import { Button } from '@/app/components/ui/Button';
import { Card } from '@/app/components/ui/Card';
import { Input } from '@/app/components/ui/Input';
import { Select } from '@/app/components/ui/Select';
import { isReferencePageComplete } from '@/app/core/lib/lessonPlanReferences';
import type { LessonPlanReferenceEditorProps } from '@/app/core/types/lessonPlanCurriculum';
import type { PlannedOutcome, ReferencePageInput } from '@/app/core/types/lessonPlans';

function parsePageInputValue(value: string): number | '' {
    if (value === '') {
        return '';
    }

    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : '';
}

function emptyReference(): ReferencePageInput {
    return {
        resource_title: '',
        author: '',
        publisher: '',
        edition: '',
        year: null,
        resource_type: '',
        chapter: '',
        topic_label: '',
        page_start: '',
        page_end: '',
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

function applyOutcome(reference: ReferencePageInput, outcome: PlannedOutcome | undefined): ReferencePageInput {
    if (!outcome) {
        return {
            ...reference,
            strand_id: null,
            strand_name: '',
            sub_strand_id: null,
            sub_strand_name: '',
            outcome_id: null,
            outcome_code: '',
        };
    }

    return {
        ...reference,
        strand_id: outcome.strand_id ?? null,
        strand_name: outcome.strand,
        sub_strand_id: outcome.sub_strand_id ?? null,
        sub_strand_name: outcome.sub_strand,
        outcome_id: outcome.outcome_id,
        outcome_code: outcome.code,
        topic_label: reference.topic_label || outcome.sub_strand || outcome.text,
    };
}

export function GenericReferencePagesEditor({
    context,
    plannedOutcomes,
    value,
    onChange,
}: LessonPlanReferenceEditorProps) {
    const outcomeOptions = plannedOutcomes.map((outcome) => ({
        value: String(outcome.outcome_id),
        label: `${outcome.code} - ${outcome.text}`,
    }));
    const outcomeMap = new Map(plannedOutcomes.map((outcome) => [outcome.outcome_id, outcome]));
    const outcomeEntries = value.map((reference, index) => ({ index, reference }));
    const unassignedReferences = outcomeEntries.filter(({ reference }) => (
        !reference.outcome_id || !outcomeMap.has(reference.outcome_id)
    ));

    const updateReference = (index: number, nextReference: ReferencePageInput) => {
        onChange(value.map((reference, currentIndex) => (
            currentIndex === index ? nextReference : reference
        )));
    };

    const addReferenceForOutcome = (outcome: PlannedOutcome) => {
        onChange([...value, applyOutcome(emptyReference(), outcome)]);
    };

    const removeReference = (index: number) => {
        const nextValue = value.filter((_, currentIndex) => currentIndex !== index);
        onChange(nextValue.length > 0 ? nextValue : [emptyReference()]);
    };

    return (
        <Card className="theme-card-muted">
            <div className="space-y-5">
                <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-sm font-medium theme-text">
                        <BookOpen className="h-4 w-4 theme-subtle" />
                        References and pages
                    </div>
                    <Badge variant="info" size="sm">
                        {plannedOutcomes.length} outcome{plannedOutcomes.length === 1 ? '' : 's'}
                    </Badge>
                </div>

                <p className="text-sm text-amber-700">
                    Reference editing is using the generic editor because the curriculum-specific editor is unavailable.
                </p>

                {plannedOutcomes.length === 0 ? (
                    <p className="text-sm theme-muted">
                        Choose at least one learning outcome before adding references.
                    </p>
                ) : (
                    <div className="space-y-4">
                        {plannedOutcomes.map((outcome) => {
                            const outcomeReferences = outcomeEntries.filter(({ reference }) => (
                                reference.outcome_id === outcome.outcome_id
                            ));
                            const attachedCount = outcomeReferences.filter(({ reference }) => (
                                isReferencePageComplete(reference)
                            )).length;

                            return (
                                <div
                                    key={`generic-outcome-${outcome.outcome_id}`}
                                    className="rounded-lg border theme-border p-4"
                                >
                                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                        <div className="space-y-2">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <span className="rounded-full bg-blue-100 px-2.5 py-1 text-xs font-medium text-blue-700">
                                                    {outcome.code}
                                                </span>
                                                <Badge variant={attachedCount > 0 ? 'green' : 'warning'} size="sm">
                                                    {attachedCount > 0
                                                        ? `${attachedCount} reference${attachedCount === 1 ? '' : 's'} attached`
                                                        : 'Reference needed'}
                                                </Badge>
                                            </div>
                                            <p className="text-sm font-medium theme-text">{outcome.text}</p>
                                            <p className="text-xs theme-muted">
                                                {outcome.strand} · {outcome.sub_strand}
                                            </p>
                                        </div>

                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            className="w-full sm:w-auto"
                                            onClick={() => addReferenceForOutcome(outcome)}
                                        >
                                            <Plus className="mr-1.5 h-4 w-4" />
                                            Add reference for this outcome
                                        </Button>
                                    </div>

                                    {outcomeReferences.length === 0 ? (
                                        <div className="mt-4 rounded-lg border border-dashed theme-border px-4 py-3 text-sm theme-muted">
                                            No reference attached yet for this outcome.
                                        </div>
                                    ) : (
                                        <div className="mt-4 space-y-3">
                                            {outcomeReferences.map(({ index, reference }, referencePosition) => (
                                                <div
                                                    key={`generic-reference-${outcome.outcome_id}-${index}`}
                                                    className="theme-card space-y-4 rounded-lg p-4"
                                                >
                                                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                                        <p className="text-sm font-medium theme-text">
                                                            Reference {referencePosition + 1}
                                                        </p>
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="sm"
                                                            className="w-full sm:w-auto"
                                                            onClick={() => removeReference(index)}
                                                        >
                                                            <Trash2 className="mr-1.5 h-4 w-4" />
                                                            Remove
                                                        </Button>
                                                    </div>

                                                    <div className="grid gap-3 md:grid-cols-2">
                                                        <Input
                                                            label={context.reference_language.resource_label}
                                                            value={reference.resource_title}
                                                            onChange={(event) => updateReference(index, {
                                                                ...reference,
                                                                resource_title: event.target.value,
                                                            })}
                                                            placeholder="Resource title"
                                                        />

                                                        <Select
                                                            label={context.reference_language.outcome_label ?? 'Learning outcome'}
                                                            value={reference.outcome_id ? String(reference.outcome_id) : ''}
                                                            onChange={(event) => {
                                                                const outcomeId = event.target.value ? Number(event.target.value) : null;
                                                                updateReference(
                                                                    index,
                                                                    applyOutcome(reference, outcomeId ? outcomeMap.get(outcomeId) : undefined),
                                                                );
                                                            }}
                                                            options={[
                                                                { value: '', label: 'Choose learning outcome' },
                                                                ...outcomeOptions,
                                                            ]}
                                                        />

                                                        <Input
                                                            label={context.reference_language.pages_label === 'Pages' ? 'Page start' : context.reference_language.pages_label}
                                                            type="number"
                                                            min={1}
                                                            step={1}
                                                            value={reference.page_start === '' ? '' : String(reference.page_start)}
                                                            onChange={(event) => updateReference(index, {
                                                                ...reference,
                                                                page_start: parsePageInputValue(event.target.value),
                                                            })}
                                                        />

                                                        <Input
                                                            label="Page end"
                                                            type="number"
                                                            min={1}
                                                            step={1}
                                                            value={reference.page_end === '' ? '' : String(reference.page_end)}
                                                            onChange={(event) => updateReference(index, {
                                                                ...reference,
                                                                page_end: parsePageInputValue(event.target.value),
                                                            })}
                                                        />

                                                        <Input
                                                            label={context.reference_language.chapter_label}
                                                            value={reference.chapter || ''}
                                                            onChange={(event) => updateReference(index, {
                                                                ...reference,
                                                                chapter: event.target.value,
                                                            })}
                                                            placeholder="Optional chapter"
                                                        />

                                                        <Input
                                                            label={context.reference_language.notes_label}
                                                            value={reference.notes || ''}
                                                            onChange={(event) => updateReference(index, {
                                                                ...reference,
                                                                notes: event.target.value,
                                                            })}
                                                            placeholder="Optional notes"
                                                        />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}

                {unassignedReferences.length > 0 ? (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                        <div className="space-y-1">
                            <p className="text-sm font-medium text-amber-800">Unassigned references</p>
                            <p className="text-sm text-amber-700">
                                Assign these references to one of the selected outcomes so coverage stays clear.
                            </p>
                        </div>

                        <div className="mt-4 space-y-3">
                            {unassignedReferences.map(({ index, reference }, referencePosition) => (
                                <div
                                    key={`generic-unassigned-reference-${index}`}
                                    className="theme-card space-y-4 rounded-lg p-4"
                                >
                                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                        <p className="text-sm font-medium theme-text">
                                            Unassigned reference {referencePosition + 1}
                                        </p>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            className="w-full sm:w-auto"
                                            onClick={() => removeReference(index)}
                                        >
                                            <Trash2 className="mr-1.5 h-4 w-4" />
                                            Remove
                                        </Button>
                                    </div>

                                    <div className="grid gap-3 md:grid-cols-2">
                                        <Input
                                            label={context.reference_language.resource_label}
                                            value={reference.resource_title}
                                            onChange={(event) => updateReference(index, {
                                                ...reference,
                                                resource_title: event.target.value,
                                            })}
                                            placeholder="Resource title"
                                        />

                                        <Select
                                            label={context.reference_language.outcome_label ?? 'Learning outcome'}
                                            value={reference.outcome_id ? String(reference.outcome_id) : ''}
                                            onChange={(event) => {
                                                const outcomeId = event.target.value ? Number(event.target.value) : null;
                                                updateReference(
                                                    index,
                                                    applyOutcome(reference, outcomeId ? outcomeMap.get(outcomeId) : undefined),
                                                );
                                            }}
                                            options={[
                                                { value: '', label: 'Choose learning outcome' },
                                                ...outcomeOptions,
                                            ]}
                                            disabled={plannedOutcomes.length === 0}
                                        />

                                        <Input
                                            label={context.reference_language.pages_label === 'Pages' ? 'Page start' : context.reference_language.pages_label}
                                            type="number"
                                            min={1}
                                            step={1}
                                            value={reference.page_start === '' ? '' : String(reference.page_start)}
                                            onChange={(event) => updateReference(index, {
                                                ...reference,
                                                page_start: parsePageInputValue(event.target.value),
                                            })}
                                        />

                                        <Input
                                            label="Page end"
                                            type="number"
                                            min={1}
                                            step={1}
                                            value={reference.page_end === '' ? '' : String(reference.page_end)}
                                            onChange={(event) => updateReference(index, {
                                                ...reference,
                                                page_end: parsePageInputValue(event.target.value),
                                            })}
                                        />

                                        <Input
                                            label={context.reference_language.chapter_label}
                                            value={reference.chapter || ''}
                                            onChange={(event) => updateReference(index, {
                                                ...reference,
                                                chapter: event.target.value,
                                            })}
                                            placeholder="Optional chapter"
                                        />

                                        <Input
                                            label={context.reference_language.notes_label}
                                            value={reference.notes || ''}
                                            onChange={(event) => updateReference(index, {
                                                ...reference,
                                                notes: event.target.value,
                                            })}
                                            placeholder="Optional notes"
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : null}
            </div>
        </Card>
    );
}
