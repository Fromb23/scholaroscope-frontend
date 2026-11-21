'use client';

import { Button } from '@/app/components/ui/Button';
import { Card } from '@/app/components/ui/Card';
import { Input } from '@/app/components/ui/Input';
import type { LessonPlanReferenceEditorProps } from '@/app/core/types/lessonPlanCurriculum';
import type { ReferencePageInput } from '@/app/core/types/lessonPlans';

function pageValue(value: string): number | '' {
    if (!value) return '';
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : '';
}

export function CbcReferencePagesEditor({ plannedOutcomes, value, onChange }: LessonPlanReferenceEditorProps) {
    const scope = plannedOutcomes[0];
    const addReference = () => onChange([...value, {
        resource_title: '', chapter: '', topic_label: scope?.sub_strand ?? '', page_start: '', page_end: '',
        notes: '', keywords: [], strand_id: scope?.strand_id ?? null, strand_name: scope?.strand ?? '',
        sub_strand_id: scope?.sub_strand_id ?? null, sub_strand_name: scope?.sub_strand ?? '',
        outcome_id: null, outcome_code: '',
    }]);
    const update = (index: number, patch: Partial<ReferencePageInput>) => onChange(
        value.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item)
    );
    return (
        <Card>
            <div className="space-y-4">
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <h2 className="font-semibold theme-text">References and pages</h2>
                        <p className="mt-1 text-sm theme-muted">Attach resources for the selected sub-strand. Individual outcome links are resolved by the server.</p>
                    </div>
                    <Button type="button" variant="secondary" onClick={addReference}>Add reference</Button>
                </div>
                {value.length === 0 ? <p className="text-sm theme-muted">Add at least one book or resource page range.</p> : null}
                {value.map((reference, index) => (
                    <div key={index} className="grid gap-3 rounded-lg border p-4 theme-border md:grid-cols-2">
                        <Input label="Book or resource" value={reference.resource_title} onChange={(event) => update(index, { resource_title: event.target.value })} />
                        <Input label="Chapter (optional)" value={reference.chapter ?? ''} onChange={(event) => update(index, { chapter: event.target.value })} />
                        <Input label="Page start" type="number" value={reference.page_start} onChange={(event) => update(index, { page_start: pageValue(event.target.value) })} />
                        <Input label="Page end" type="number" value={reference.page_end} onChange={(event) => update(index, { page_end: pageValue(event.target.value) })} />
                        <div className="md:col-span-2"><Input label="Notes (optional)" value={reference.notes ?? ''} onChange={(event) => update(index, { notes: event.target.value })} /></div>
                        <div className="md:col-span-2"><Button type="button" variant="secondary" onClick={() => onChange(value.filter((_, itemIndex) => itemIndex !== index))}>Remove reference</Button></div>
                    </div>
                ))}
            </div>
        </Card>
    );
}
