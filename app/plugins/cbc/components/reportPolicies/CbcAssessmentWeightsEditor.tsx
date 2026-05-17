'use client';

import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/app/components/ui/Button';
import { Input } from '@/app/components/ui/Input';
import { Select } from '@/app/components/ui/Select';
import { ASSESSMENT_TYPE_OPTIONS } from '@/app/core/types/assessment';

export interface CbcAssessmentWeightDraft {
    type: string;
    weight: string;
}

interface CbcAssessmentWeightsEditorProps {
    entries: CbcAssessmentWeightDraft[];
    error?: string;
    onAdd: () => void;
    onRemove: (index: number) => void;
    onChange: (index: number, field: keyof CbcAssessmentWeightDraft, value: string) => void;
}

export function CbcAssessmentWeightsEditor({
    entries,
    error,
    onAdd,
    onRemove,
    onChange,
}: CbcAssessmentWeightsEditorProps) {
    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
                <div>
                    <h3 className="text-sm font-medium text-gray-900">Assessment Weights</h3>
                    <p className="text-xs text-gray-500">
                        Positive contributing weights must total 100. Zero keeps a component available without contributing.
                    </p>
                </div>
                <Button type="button" variant="secondary" size="sm" onClick={onAdd}>
                    <Plus className="mr-1.5 h-4 w-4" />
                    Add Weight
                </Button>
            </div>

            {entries.map((entry, index) => (
                <div key={`${entry.type}-${index}`} className="grid gap-3 md:grid-cols-[minmax(0,1fr)_180px_auto]">
                    <Select
                        value={entry.type}
                        onChange={(event) => onChange(index, 'type', event.target.value)}
                        options={ASSESSMENT_TYPE_OPTIONS}
                    />
                    <Input
                        type="number"
                        min="0"
                        max="100"
                        step="0.5"
                        value={entry.weight}
                        onChange={(event) => onChange(index, 'weight', event.target.value)}
                        placeholder="Weight"
                    />
                    <Button type="button" variant="ghost" onClick={() => onRemove(index)}>
                        <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                </div>
            ))}

            {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
    );
}
