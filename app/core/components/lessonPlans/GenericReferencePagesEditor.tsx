'use client';

import { BookOpen, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/app/components/ui/Button';
import { Card } from '@/app/components/ui/Card';
import { Input } from '@/app/components/ui/Input';
import { Select } from '@/app/components/ui/Select';
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
        <Card className="theme-card-muted">
            <div className="space-y-5">
                <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-sm font-medium theme-text">
                        <BookOpen className="h-4 w-4 theme-subtle" />
                        References and pages
                    </div>
                    <Button type="button" variant="ghost" size="sm" onClick={addReference}>
                        <Plus className="mr-1.5 h-4 w-4" />
                        Add reference
                    </Button>
                </div>

                <p className="text-sm text-amber-700">
                    Reference editing is using the generic editor because the curriculum-specific editor is unavailable.
                </p>

                {value.map((reference, index) => (
                    <div
                        key={`generic-reference-${index}`}
                        className="theme-card space-y-4 rounded-lg p-4"
                    >
                        <div className="flex items-center justify-between gap-3">
                            <p className="text-sm font-medium theme-text">
                                Reference {index + 1}
                            </p>
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
        </Card>
    );
}
