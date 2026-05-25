// app/plugins/cbc/components/evidence/LearnerEvidenceRow.tsx
import { Plus, Check, FileText } from 'lucide-react';
import { Badge } from '@/app/components/ui/Badge';
import { Button } from '@/app/components/ui/Button';
import { Select } from '@/app/components/ui/Select';
import { Input } from '@/app/components/ui/Input';
import type { SessionLearner, EvidenceRecord, EvaluationType } from '@/app/plugins/cbc/types/cbc';

const EVAL_OPTIONS = [
    { value: 'DESCRIPTIVE', label: 'Descriptive (Observation)' },
    { value: 'NUMERIC', label: 'Numeric Score' },
    { value: 'COMPETENCY', label: 'Competency Check' },
];

const EVALUATION_LABELS: Record<EvaluationType, string> = {
    DESCRIPTIVE: 'Observation',
    NUMERIC: 'Score',
    COMPETENCY: 'Competency Check',
    RUBRIC: 'Performance Level',
};

interface Props {
    learner: SessionLearner;
    evidence: EvidenceRecord[];
    isAdding: boolean;
    isHighlighted: boolean;
    evalType: EvaluationType;
    numericScore: string;
    narrative: string;
    formError: string | null;
    createPending: boolean;
    onStartAdding: () => void;
    onEvalTypeChange: (v: EvaluationType) => void;
    onNumericScoreChange: (v: string) => void;
    onNarrativeChange: (v: string) => void;
    onSubmit: () => void;
    onCancel: () => void;
}

export function LearnerEvidenceRow({
    learner, evidence, isAdding, isHighlighted,
    evalType, numericScore, narrative, formError, createPending,
    onStartAdding, onEvalTypeChange, onNumericScoreChange,
    onNarrativeChange, onSubmit, onCancel,
}: Props) {
    const hasEvidence = evidence.length > 0;

    return (
        <div className={`border rounded-xl overflow-hidden transition-all ${isHighlighted ? 'border-blue-500 shadow-md' :
            hasEvidence ? 'border-emerald-300/70 bg-emerald-500/5' :
                'theme-border theme-surface-muted'
            }`}>
            <div className="theme-surface flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${hasEvidence ? 'bg-emerald-500' : 'bg-slate-400'
                        }`} />
                    <div className="min-w-0">
                        <h3 className="truncate font-semibold theme-text">
                            {learner.first_name} {learner.last_name}
                        </h3>
                        <p className="text-sm theme-muted">{learner.admission_number}</p>
                    </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                    {hasEvidence && (
                        <Badge variant="green" size="sm">
                            {evidence.length} observation{evidence.length !== 1 ? 's' : ''}
                        </Badge>
                    )}
                    {!isAdding && (
                        <Button
                            variant={hasEvidence ? 'ghost' : 'secondary'}
                            size="sm"
                            onClick={onStartAdding}
                        >
                            <Plus className="h-4 w-4 mr-1" />
                            {hasEvidence ? 'Add another observation' : 'Record performance'}
                        </Button>
                    )}
                </div>
            </div>

            {hasEvidence && !isAdding && (
                <div className="theme-surface border-t px-4 pb-3 theme-border">
                    <div className="space-y-2 pt-2">
                        {evidence.map(ev => (
                            <div key={ev.id} className="theme-card-muted rounded-lg p-3 text-sm">
                                <div className="mb-1 flex items-center gap-2">
                                    <Badge variant="blue" size="sm">{EVALUATION_LABELS[ev.evaluation_type]}</Badge>
                                    <span className="text-xs theme-muted">
                                        {new Date(ev.observed_at).toLocaleDateString('en-GB')}
                                    </span>
                                </div>
                                {ev.narrative && <p className="theme-text">{ev.narrative}</p>}
                                {ev.numeric_score !== null && (
                                    <p className="theme-text">Score: {ev.numeric_score}</p>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {isAdding && (
                <div className="border-t border-blue-500/20 bg-blue-500/10 p-4">
                    <h4 className="mb-3 flex items-center gap-2 font-semibold theme-text">
                        <FileText className="h-4 w-4 text-blue-600" />
                        Learner observation
                    </h4>
                    <div className="space-y-3">
                        <Select
                            label="Evaluation Type"
                            value={evalType}
                            onChange={e => onEvalTypeChange(e.target.value as EvaluationType)}
                            options={EVAL_OPTIONS}
                        />
                        {evalType === 'NUMERIC' && (
                            <Input
                                label="Score"
                                type="number"
                                value={numericScore}
                                onChange={e => onNumericScoreChange(e.target.value)}
                                placeholder="Enter score…"
                            />
                        )}
                        <div>
                            <label className="mb-1 block text-sm font-medium theme-text">
                                Observation notes
                                {evalType === 'DESCRIPTIVE' && <span className="text-red-500 ml-1">*</span>}
                            </label>
                            <textarea
                                value={narrative}
                                onChange={e => onNarrativeChange(e.target.value)}
                                rows={3}
                                className="theme-focus-ring theme-input w-full resize-none rounded-lg px-3 py-2 text-sm"
                                placeholder="Describe what this learner demonstrated…"
                            />
                        </div>
                        {formError && (
                            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
                                {formError}
                            </p>
                        )}
                        <div className="flex flex-col gap-2 sm:flex-row">
                            <Button variant="primary" size="sm" className="w-full sm:w-auto"
                                onClick={onSubmit}
                                disabled={createPending || (evalType === 'DESCRIPTIVE' && !narrative.trim())}>
                                <Check className="h-4 w-4 mr-2" />
                                {createPending ? 'Saving…' : 'Record performance'}
                            </Button>
                            <Button variant="ghost" size="sm" className="w-full sm:w-auto" onClick={onCancel}>
                                Cancel
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
