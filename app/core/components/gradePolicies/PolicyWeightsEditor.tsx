'use client';

import { Input } from '@/app/components/ui/Input';
import { Select } from '@/app/components/ui/Select';
import { Button } from '@/app/components/ui/Button';
import { Trash2, Plus } from 'lucide-react';
import { WeightEntry } from '@/app/core/hooks/useGradePolicies';

const ASSESSMENT_TYPES = [
    'CAT', 'TEST', 'MAIN_EXAM', 'MOCK',
    'PROJECT', 'ASSIGNMENT', 'PRACTICAL', 'COMPETENCY',
];

interface Props {
    entries: WeightEntry[];
    error?: string;
    onAdd: () => void;
    onRemove: (i: number) => void;
    onChange: (i: number, field: keyof WeightEntry, value: string) => void;
}

export function PolicyWeightsEditor({ entries, error, onAdd, onRemove, onChange }: Props) {
    const total = entries.reduce((sum, e) => sum + (parseFloat(e.weight) || 0), 0);
    const isValid = Math.abs(total - 100) <= 0.01;

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <div>
                    <span className="text-sm font-medium text-gray-700">Assessment Weights</span>
                    <span className={`ml-2 text-xs font-semibold ${isValid ? 'text-green-600' : 'text-red-600'}`}>
                        Total: {total}% {isValid ? '✓' : '(must equal 100%)'}
                    </span>
                </div>
                <Button type="button" size="sm" variant="secondary" onClick={onAdd}>
                    <Plus className="h-3 w-3 mr-1" />Add
                </Button>
            </div>

            {entries.map((entry, i) => (
                <div key={i} className="flex items-end gap-3 bg-gray-50 p-3 rounded-lg">
                    <div className="flex-1">
                        <Select
                            label="Assessment Type"
                            value={entry.type}
                            onChange={e => onChange(i, 'type', e.target.value)}
                            options={ASSESSMENT_TYPES.map(t => ({ value: t, label: t }))}
                        />
                    </div>
                    <div className="w-28">
                        <Input
                            label="Weight (%)"
                            type="number"
                            min="0"
                            max="100"
                            value={entry.weight}
                            onChange={e => onChange(i, 'weight', e.target.value)}
                        />
                    </div>
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => onRemove(i)}
                        className="mb-0.5"
                    >
                        <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                </div>
            ))}

            {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
    );
}