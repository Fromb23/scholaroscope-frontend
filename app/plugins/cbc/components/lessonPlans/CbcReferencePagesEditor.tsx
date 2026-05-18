'use client';

import { useEffect, useMemo } from 'react';
import { BookOpen, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/app/components/ui/Button';
import { Card } from '@/app/components/ui/Card';
import { Input } from '@/app/components/ui/Input';
import { Select } from '@/app/components/ui/Select';
import type { LessonPlanReferenceEditorProps } from '@/app/core/types/lessonPlanCurriculum';
import type { PlannedOutcome, ReferencePageInput } from '@/app/core/types/lessonPlans';

function emptyReference(): ReferencePageInput {
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

                {plannedOutcomes.length === 0 ? (
                    <p className="text-sm text-gray-600">
                        Choose at least one learning outcome before adding book pages.
                    </p>
                ) : null}

                {value.map((reference, index) => (
                    <div key={`cbc-reference-${index}`} className="grid gap-3 rounded-lg border border-gray-200 p-3 md:grid-cols-2">
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
                            value={String(reference.page_start)}
                            onChange={(event) => updateReference(index, {
                                ...reference,
                                page_start: Number(event.target.value) || 1,
                            })}
                        />

                        <Input
                            label="Page end"
                            type="number"
                            min={1}
                            value={String(reference.page_end)}
                            onChange={(event) => updateReference(index, {
                                ...reference,
                                page_end: Number(event.target.value) || 1,
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

                        <div className="md:col-span-2 flex justify-end">
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
