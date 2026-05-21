'use client';

import { useEffect, useMemo } from 'react';
import { BookOpen, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/app/components/ui/Button';
import { Card } from '@/app/components/ui/Card';
import { Input } from '@/app/components/ui/Input';
import { Select } from '@/app/components/ui/Select';
import type { LessonPlanReferenceEditorProps } from '@/app/core/types/lessonPlanCurriculum';
import type { PlannedOutcome, ReferencePageInput } from '@/app/core/types/lessonPlans';

function hasPositiveInteger(value: number | ''): value is number {
    return typeof value === 'number' && Number.isInteger(value) && value > 0;
}

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
            topic_label: '',
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
        topic_label: outcome.sub_strand || outcome.text,
        strand_id: outcome.strand_id ?? null,
        strand_name: outcome.strand,
        sub_strand_id: outcome.sub_strand_id ?? null,
        sub_strand_name: outcome.sub_strand,
        outcome_id: outcome.outcome_id,
        outcome_code: outcome.code,
    };
}

export function CbcReferencePagesEditor({
    context,
    plannedOutcomes,
    value,
    onChange,
}: LessonPlanReferenceEditorProps) {
    const outcomeMap = useMemo(
        () => new Map(plannedOutcomes.map((outcome) => [outcome.outcome_id, outcome])),
        [plannedOutcomes]
    );

    const outcomeOptions = useMemo(
        () => plannedOutcomes.map((outcome) => ({
            value: String(outcome.outcome_id),
            label: `${outcome.code} - ${outcome.text}`,
        })),
        [plannedOutcomes]
    );
    const completedReferenceCount = useMemo(
        () => value.filter((reference) => (
            reference.resource_title.trim().length > 0
            && hasPositiveInteger(reference.page_start)
            && hasPositiveInteger(reference.page_end)
            && Boolean(reference.outcome_id)
        )).length,
        [value]
    );

    useEffect(() => {
        const normalizedValue = value.map((reference) => {
            if (!reference.outcome_id || !outcomeMap.has(reference.outcome_id)) {
                return applyOutcome(reference, undefined);
            }

            return applyOutcome(reference, outcomeMap.get(reference.outcome_id));
        });

        const changed = JSON.stringify(normalizedValue) !== JSON.stringify(value);
        if (changed) {
            onChange(normalizedValue);
        }
    }, [onChange, outcomeMap, value]);

    const updateReference = (index: number, nextReference: ReferencePageInput) => {
        onChange(value.map((reference, currentIndex) => (
            currentIndex === index ? nextReference : reference
        )));
    };

    const addReference = () => {
        onChange([...value, emptyReference()]);
    };

    const removeReference = (index: number) => {
        const nextValue = value.filter((_, currentIndex) => currentIndex !== index);
        onChange(nextValue.length > 0 ? nextValue : [emptyReference()]);
    };

    return (
        <Card className="border-gray-200 bg-gray-50/60">
            <div className="space-y-5">
                <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-sm font-medium text-gray-900">
                        <BookOpen className="h-4 w-4 text-gray-500" />
                        References and pages
                    </div>
                    <span className="rounded-full border border-gray-200 bg-white px-2.5 py-1 text-xs font-medium text-gray-600">
                        {completedReferenceCount} attached
                    </span>
                </div>

                <p className="text-sm text-gray-600">
                    Add only the references you want this lesson plan to use. Each reference stays linked to one selected outcome.
                </p>

                <div className="flex justify-end">
                    <Button type="button" variant="ghost" size="sm" onClick={addReference}>
                        <Plus className="mr-1.5 h-4 w-4" />
                        Add another reference
                    </Button>
                </div>

                {plannedOutcomes.length === 0 ? (
                    <p className="text-sm text-gray-600">
                        Choose at least one learning outcome before adding book pages.
                    </p>
                ) : null}

                {value.map((reference, index) => (
                    <div
                        key={`cbc-reference-${index}`}
                        className="space-y-4 rounded-lg border border-gray-200 bg-white p-4"
                    >
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div className="space-y-1">
                                <p className="text-sm font-medium text-gray-900">
                                    Reference {index + 1}
                                </p>
                                <p className="text-xs text-gray-500">
                                    Link one page range to one selected outcome.
                                </p>
                            </div>
                            {reference.outcome_id && outcomeMap.get(reference.outcome_id) ? (
                                <span className="rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
                                    {outcomeMap.get(reference.outcome_id)?.code}
                                </span>
                            ) : null}
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
                                disabled={plannedOutcomes.length === 0}
                                options={[
                                    { value: '', label: 'Choose learning outcome' },
                                    ...outcomeOptions,
                                ]}
                            />

                            <Input
                                label={context.reference_language.strand_label ?? 'Strand'}
                                value={reference.strand_name || ''}
                                readOnly
                                placeholder="Auto-filled from the selected learning outcome"
                            />

                            <Input
                                label={context.reference_language.sub_strand_label ?? 'Sub-strand'}
                                value={reference.sub_strand_name || ''}
                                readOnly
                                placeholder="Auto-filled from the selected learning outcome"
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

                        <div className="flex justify-end">
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removeReference(index)}
                                disabled={value.length === 1}
                            >
                                <Trash2 className="mr-1.5 h-4 w-4" />
                                Remove
                            </Button>
                        </div>
                    </div>
                ))}
            </div>
        </Card>
    );
}
