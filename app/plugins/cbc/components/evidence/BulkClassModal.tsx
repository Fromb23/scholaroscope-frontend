// app/plugins/cbc/components/evidence/BulkClassModal.tsx
'use client';

import { useReducer } from 'react';
import { Layers, X, Check } from 'lucide-react';
import { useSessionRubricScale, useBulkCreateClassEvidence } from '@/app/plugins/cbc/hooks/useCBC';
import { Badge } from '@/app/components/ui/Badge';
import { Button } from '@/app/components/ui/Button';
import { Select } from '@/app/components/ui/Select';
import { resolveErrorMessage } from '@/app/plugins/cbc/components/CBCComponents';
import type {
    SessionLearner,
    BulkClassEvidenceData,
    BulkClassEvidenceResult,
    StudentEntry,
} from '@/app/plugins/cbc/types/cbc';

const BULK_EVAL_OPTIONS = [
    { value: 'DESCRIPTIVE', label: 'Descriptive (Observation)' },
    { value: 'RUBRIC', label: 'Performance Level' },
];

interface EvidenceFormState {
    evalType: 'RUBRIC' | 'DESCRIPTIVE';
    defaultNarrative: string;
    defaultRubricLevel: number | null;
    exceptions: Map<number, StudentEntry>;
    error: string | null;
}

type EvidenceFormAction =
    | { type: 'set_eval_type'; payload: 'RUBRIC' | 'DESCRIPTIVE' }
    | { type: 'set_default_narrative'; payload: string }
    | { type: 'set_default_rubric'; payload: number | null }
    | { type: 'toggle_exception'; studentId: number }
    | { type: 'update_exception'; studentId: number; field: keyof StudentEntry; value: string | number | null }
    | { type: 'set_error'; payload: string | null }
    | { type: 'reset' };

const initialFormState: EvidenceFormState = {
    evalType: 'DESCRIPTIVE',
    defaultNarrative: '',
    defaultRubricLevel: null,
    exceptions: new Map(),
    error: null,
};

function evidenceFormReducer(state: EvidenceFormState, action: EvidenceFormAction): EvidenceFormState {
    switch (action.type) {
        case 'set_eval_type':
            return { ...state, evalType: action.payload, defaultNarrative: '', defaultRubricLevel: null, exceptions: new Map() };
        case 'set_default_narrative':
            return { ...state, defaultNarrative: action.payload };
        case 'set_default_rubric':
            return { ...state, defaultRubricLevel: action.payload };
        case 'toggle_exception': {
            const next = new Map(state.exceptions);
            if (next.has(action.studentId)) {
                next.delete(action.studentId);
            } else {
                next.set(action.studentId, { student_id: action.studentId });
            }
            return { ...state, exceptions: next };
        }
        case 'update_exception': {
            const next = new Map(state.exceptions);
            const existing = next.get(action.studentId) ?? { student_id: action.studentId };
            next.set(action.studentId, { ...existing, [action.field]: action.value });
            return { ...state, exceptions: next };
        }
        case 'set_error':
            return { ...state, error: action.payload };
        case 'reset':
            return initialFormState;
        default:
            return state;
    }
}

interface Props {
    sessionId: number;
    learningOutcomeId: number;
    learners: SessionLearner[];
    observedAt: string;
    onClose: (
        result?: BulkClassEvidenceResult,
        context?: { evaluationType: 'RUBRIC' | 'DESCRIPTIVE' }
    ) => void;
}

export function BulkClassModal({ sessionId, learningOutcomeId, learners, observedAt, onClose }: Props) {
    const { data: rubricScale, isLoading: rubricScaleLoading } = useSessionRubricScale(sessionId);
    const bulkCreate = useBulkCreateClassEvidence();
    const [form, dispatch] = useReducer(evidenceFormReducer, initialFormState);
    const { evalType, defaultNarrative, defaultRubricLevel, exceptions, error } = form;

    const handleSubmit = async () => {
        dispatch({ type: 'set_error', payload: null });
        const exceptionEntries = Array.from(exceptions.values());
        const payload: BulkClassEvidenceData = {
            learning_outcome: learningOutcomeId,
            session_id: sessionId,
            observed_at: observedAt,
            evaluation_type: evalType,
            default_narrative: evalType === 'DESCRIPTIVE' ? defaultNarrative : undefined,
            default_rubric_level: evalType === 'RUBRIC' ? defaultRubricLevel : undefined,
            exceptions: exceptionEntries.length > 0 ? exceptionEntries : undefined,
        };
        try {
            const result = await bulkCreate.mutateAsync(payload);
            onClose(result, { evaluationType: evalType });
        } catch (e) {
            dispatch({ type: 'set_error', payload: resolveErrorMessage(e) });
        }
    };

    const canProceed = evalType === 'DESCRIPTIVE' ? defaultNarrative.trim().length > 0 : defaultRubricLevel !== null;

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="theme-card flex max-h-[95vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl shadow-2xl">
                <div className="theme-border flex items-start justify-between gap-4 border-b p-4 sm:p-6">
                    <div>
                        <h2 className="flex items-center gap-2 text-lg font-bold theme-text">
                            <Layers className="h-5 w-5 text-purple-600" />
                            Record class performance
                        </h2>
                        <p className="mt-0.5 text-sm theme-muted">
                            This will apply to learners marked present or late.
                        </p>
                    </div>
                    <button
                        onClick={() => onClose()}
                        className="theme-focus-ring rounded-lg p-2 transition-colors theme-hover-surface"
                        aria-label="Close class performance form"
                    >
                        <X className="h-5 w-5 theme-subtle" />
                    </button>
                </div>

                <div className="overflow-y-auto flex-1 p-4 sm:p-6 space-y-6">
                    <div className="space-y-4">
                        <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-purple-600 text-white text-xs font-bold flex items-center justify-center">1</div>
                            <h3 className="font-semibold theme-text">Overall class performance</h3>
                        </div>
                        <p className="text-sm theme-muted">
                            Set the overall class performance for learners marked present or late in this lesson.
                        </p>
                        <Select
                            label="Evaluation Type"
                            value={evalType}
                            onChange={e => dispatch({ type: 'set_eval_type', payload: e.target.value as 'RUBRIC' | 'DESCRIPTIVE' })}
                            options={BULK_EVAL_OPTIONS}
                        />
                        {evalType === 'DESCRIPTIVE' && (
                            <div>
                                <label className="mb-1 block text-sm font-medium theme-text">
                                    Overall class observation <span className="text-red-500">*</span>
                                </label>
                                <textarea
                                    value={defaultNarrative}
                                    onChange={e => dispatch({ type: 'set_default_narrative', payload: e.target.value })}
                                    rows={3}
                                    className="theme-focus-ring theme-input w-full resize-none rounded-lg px-3 py-2 text-sm"
                                    placeholder="Describe what the class demonstrated overall…"
                                />
                            </div>
                        )}
                        {evalType === 'RUBRIC' && (
                            <div>
                                <label className="mb-2 block text-sm font-medium theme-text">
                                    Overall performance level <span className="text-red-500">*</span>
                                </label>
                                {rubricScaleLoading ? (
                                    <p className="theme-card-muted rounded-lg p-3 text-sm theme-muted">
                                        Loading rubric scale…
                                    </p>
                                ) : rubricScale ? (
                                    <div className="grid grid-cols-2 gap-2">
                                        {rubricScale.levels.map(level => (
                                            <button
                                                key={level.id}
                                                onClick={() => dispatch({ type: 'set_default_rubric', payload: level.id })}
                                                className={`rounded-lg border-2 p-3 text-left transition-all ${defaultRubricLevel === level.id ? 'border-purple-600 bg-purple-500/10' : 'theme-border theme-surface theme-hover-border-strong'}`}
                                            >
                                                <div className="text-sm font-semibold theme-text">{level.label}</div>
                                                <div className="text-xs theme-muted">{level.code}</div>
                                            </button>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-sm text-amber-600 bg-amber-50 p-3 rounded-lg">
                                        No rubric scale configured for this curriculum.
                                    </p>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="space-y-3">
                        <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-purple-600 text-white text-xs font-bold flex items-center justify-center">2</div>
                            <h3 className="font-semibold theme-text">Learner adjustments</h3>
                            <span className="text-xs theme-subtle">Optional</span>
                        </div>
                        <p className="text-sm theme-muted">
                            Use adjustments only where a learner performed differently from the class.
                        </p>
                        <div className="space-y-2">
                            {learners.map(learner => {
                                const hasException = exceptions.has(learner.id);
                                const exc = exceptions.get(learner.id);
                                return (
                                    <div key={learner.id} className={`overflow-hidden rounded-lg border transition-all ${hasException ? 'border-amber-400/70 bg-amber-500/5' : 'theme-border'}`}>
                                        <div className="flex items-center gap-3 p-3">
                                            <button
                                                onClick={() => dispatch({ type: 'toggle_exception', studentId: learner.id })}
                                                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition-all ${hasException ? 'border-amber-500 bg-amber-500' : 'theme-border theme-surface theme-hover-border-strong'}`}
                                            >
                                                {hasException && <Check className="h-3 w-3 text-white" />}
                                            </button>
                                            <div className="flex-1 min-w-0">
                                                <span className="text-sm font-medium theme-text">{learner.first_name} {learner.last_name}</span>
                                                <span className="ml-2 text-xs theme-subtle">{learner.admission_number}</span>
                                            </div>
                                            {hasException && <Badge variant="yellow" size="sm">Adjustment</Badge>}
                                        </div>
                                        {hasException && (
                                            <div className="space-y-2 border-t border-amber-400/30 bg-amber-500/10 px-3 pb-3">
                                                {evalType === 'RUBRIC' && rubricScale && (
                                                    <div className="grid grid-cols-2 gap-1 pt-2">
                                                        {rubricScale.levels.map(level => (
                                                            <button
                                                                key={level.id}
                                                                onClick={() => dispatch({ type: 'update_exception', studentId: learner.id, field: 'rubric_level', value: level.id })}
                                                                className={`rounded border p-2 text-left text-xs transition-all ${exc?.rubric_level === level.id ? 'border-amber-500 bg-amber-500/15' : 'theme-border theme-surface theme-hover-border-strong'}`}
                                                            >
                                                                <span className="theme-text">{level.label}</span>
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                                {evalType === 'DESCRIPTIVE' && (
                                                    <textarea
                                                        value={exc?.narrative ?? ''}
                                                        onChange={e => dispatch({ type: 'update_exception', studentId: learner.id, field: 'narrative', value: e.target.value })}
                                                        rows={2}
                                                        className="theme-focus-ring theme-input mt-2 w-full resize-none rounded border border-amber-400/40 px-2 py-1.5 text-xs"
                                                        placeholder="Adjust the observation for this learner…"
                                                    />
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {error && (
                        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">{error}</p>
                    )}
                </div>

                <div className="theme-surface-muted theme-border flex flex-col gap-3 border-t p-4 sm:flex-row sm:items-center sm:justify-between sm:p-6">
                    <p className="text-sm theme-muted">
                        {exceptions.size > 0
                            ? `Overall class performance for this lesson · ${exceptions.size} adjustment${exceptions.size !== 1 ? 's' : ''}`
                            : 'Overall class performance will apply to learners in this lesson'}
                    </p>
                    <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                        <Button variant="ghost" size="md" className="w-full sm:w-auto" onClick={() => onClose()}>Cancel</Button>
                        <Button
                            variant="primary"
                            size="md"
                            className="w-full sm:w-auto"
                            onClick={handleSubmit}
                            disabled={!canProceed || bulkCreate.isPending}
                        >
                            <Check className="h-4 w-4 mr-2" />
                            {bulkCreate.isPending ? 'Recording…' : 'Record class performance'}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
