'use client';

import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/app/components/ui/Button';
import { Input } from '@/app/components/ui/Input';
import { Select } from '@/app/components/ui/Select';
import type {
    CbcPolicyLevel,
    CbcPolicyLevelCode,
} from '@/app/plugins/cbc/types/reportPolicy';

export interface CbcLevelScaleDraft {
    min: string;
    max: string;
    level: CbcPolicyLevel;
    code: CbcPolicyLevelCode;
    label: string;
    points: string;
}

const LEVEL_OPTIONS = [
    { value: 'EE', label: 'EE' },
    { value: 'ME', label: 'ME' },
    { value: 'AE', label: 'AE' },
    { value: 'BE', label: 'BE' },
];

const LEVEL_CODE_OPTIONS: Record<CbcPolicyLevel, Array<{ value: CbcPolicyLevelCode; label: CbcPolicyLevelCode }>> = {
    EE: [
        { value: 'EE1', label: 'EE1' },
        { value: 'EE2', label: 'EE2' },
    ],
    ME: [
        { value: 'ME1', label: 'ME1' },
        { value: 'ME2', label: 'ME2' },
    ],
    AE: [
        { value: 'AE1', label: 'AE1' },
        { value: 'AE2', label: 'AE2' },
    ],
    BE: [
        { value: 'BE1', label: 'BE1' },
        { value: 'BE2', label: 'BE2' },
    ],
};

interface CbcLevelScaleEditorProps {
    rows: CbcLevelScaleDraft[];
    error?: string;
    onAdd: () => void;
    onRemove: (index: number) => void;
    onChange: (index: number, field: keyof CbcLevelScaleDraft, value: string) => void;
}

export function CbcLevelScaleEditor({
    rows,
    error,
    onAdd,
    onRemove,
    onChange,
}: CbcLevelScaleEditorProps) {
    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
                <div>
                    <h3 className="text-sm font-medium text-gray-900">CBC Level Scale</h3>
                    <p className="text-xs text-gray-500">
                        Define the performance levels, actual levels, percentage bands, and points.
                    </p>
                </div>
                <Button type="button" variant="secondary" size="sm" onClick={onAdd}>
                    <Plus className="mr-1.5 h-4 w-4" />
                    Add Level Row
                </Button>
            </div>

            <div className="space-y-3">
                {rows.map((row, index) => (
                    <div key={`${row.code}-${index}`} className="grid gap-3 md:grid-cols-[100px_100px_110px_110px_minmax(0,1fr)_110px_auto]">
                        <Input
                            type="number"
                            min="0"
                            max="100"
                            value={row.min}
                            onChange={(event) => onChange(index, 'min', event.target.value)}
                            placeholder="Min"
                        />
                        <Input
                            type="number"
                            min="0"
                            max="100"
                            value={row.max}
                            onChange={(event) => onChange(index, 'max', event.target.value)}
                            placeholder="Max"
                        />
                        <Select
                            value={row.level}
                            onChange={(event) => onChange(index, 'level', event.target.value)}
                            options={LEVEL_OPTIONS}
                        />
                        <Select
                            value={row.code}
                            onChange={(event) => onChange(index, 'code', event.target.value)}
                            options={LEVEL_CODE_OPTIONS[row.level]}
                        />
                        <Input
                            value={row.label}
                            onChange={(event) => onChange(index, 'label', event.target.value)}
                            placeholder="Label"
                        />
                        <Input
                            type="number"
                            min="0"
                            max="10"
                            step="0.5"
                            value={row.points}
                            onChange={(event) => onChange(index, 'points', event.target.value)}
                            placeholder="Points"
                        />
                        <Button type="button" variant="ghost" onClick={() => onRemove(index)}>
                            <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                    </div>
                ))}
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
    );
}
