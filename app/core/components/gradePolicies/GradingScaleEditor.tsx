'use client';

import { Input } from '@/app/components/ui/Input';
import { Button } from '@/app/components/ui/Button';
import { Trash2, Plus } from 'lucide-react';
import { GradingBandDraft } from '@/app/core/hooks/useGradePolicies';

interface Props {
    bands: GradingBandDraft[];
    error?: string;
    onAdd: () => void;
    onRemove: (i: number) => void;
    onChange: (i: number, field: keyof GradingBandDraft, value: string) => void;
}

export function GradingScaleEditor({ bands, error, onAdd, onRemove, onChange }: Props) {
    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <div>
                    <span className="text-sm font-medium text-gray-700">Grading Scale</span>
                    <span className="ml-2 text-xs text-gray-500">
                        Define grade bands (e.g. 80–100 = A)
                    </span>
                </div>
                <Button type="button" size="sm" variant="secondary" onClick={onAdd}>
                    <Plus className="h-3 w-3 mr-1" />Add Band
                </Button>
            </div>

            {/* Column headers */}
            {bands.length > 0 && (
                <div className="grid grid-cols-5 gap-2 px-3 text-xs text-gray-500 font-medium">
                    <span>Min (%)</span>
                    <span>Max (%)</span>
                    <span>Grade</span>
                    <span>Label</span>
                    <span />
                </div>
            )}

            {bands.map((band, i) => (
                <div key={i} className="grid grid-cols-5 gap-2 items-end bg-gray-50 p-3 rounded-lg">
                    <Input
                        type="number" min="0" max="100"
                        value={band.min}
                        onChange={e => onChange(i, 'min', e.target.value)}
                        placeholder="80"
                    />
                    <Input
                        type="number" min="0" max="100"
                        value={band.max}
                        onChange={e => onChange(i, 'max', e.target.value)}
                        placeholder="100"
                    />
                    <Input
                        value={band.grade}
                        onChange={e => onChange(i, 'grade', e.target.value)}
                        placeholder="A"
                        maxLength={5}
                    />
                    <Input
                        value={band.label}
                        onChange={e => onChange(i, 'label', e.target.value)}
                        placeholder="Excellent"
                    />
                    <Button
                        type="button" variant="ghost" size="sm"
                        onClick={() => onRemove(i)}
                    >
                        <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                </div>
            ))}

            {bands.length === 0 && (
                <p className="text-sm text-gray-400 italic px-1">
                    No custom scale — system default A/B/C/D/E will be used.
                </p>
            )}

            {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
    );
}