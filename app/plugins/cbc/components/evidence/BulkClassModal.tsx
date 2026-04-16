// app/plugins/cbc/components/evidence/BulkClassModal.tsx
'use client';

import { useReducer } from 'react';
import { Layers, X, Check } from 'lucide-react';
import { useSessionRubricScale, useBulkCreateClassEvidence } from '@/app/plugins/cbc/hooks/useCBC';
import { Badge } from '@/app/components/ui/Badge';
import { Button } from '@/app/components/ui/Button';
import { Select } from '@/app/components/ui/Select';
import { extractErrorMessage } from '@/app/plugins/cbc/components/CBCComponents';
import type { SessionLearner, BulkClassEvidenceData, StudentEntry } from '@/app/plugins/cbc/types/cbc';

const BULK_EVAL_OPTIONS = [
    { value: 'DESCRIPTIVE', label: 'Descriptive (Observation)' },
    { value: 'RUBRIC', label: 'Rubric Level' },
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
            next.has(action.studentId) ? next.delete(action.studentId) : next.set(action.studentId, { student_id: action.studentId });
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
    onClose: (recordedCount?: number) => void;
}

export function BulkClassModal({ sessionId, learningOutcomeId, learners, observedAt, onClose }: Props) {
    const { data: rubricScale } = useSessionRubricScale(sessionId);
    const bulkCreate = useBulkCreateClassEvidence();
    const [form, dispatch] = useReducer(evidenceFormReducer, initialFormState);
    const { evalType, defaultNarrative, defaultRubricLevel, exceptions, error } = form;

    const handleSubmit = async () => {
        dispatch({ type: 'set_error', payload: null });
        const studentEntries: StudentEntry[] = learners.map(l => exceptions.get(l.id) ?? { student_id: l.id });
        const payload: BulkClassEvidenceData = {
            learning_outcome: learningOutcomeId,
            session_id: sessionId,
            observed_at: observedAt,
            evaluation_type: evalType,
            default_narrative: evalType === 'DESCRIPTIVE' ? defaultNarrative : undefined,
            default_rubric_level: evalType === 'RUBRIC' ? defaultRubricLevel : undefined,
            student_entries: studentEntries,
        };
        try {
            await bulkCreate.mutateAsync(payload);
            onClose(learners.length);
        } catch (e) {
            dispatch({ type: 'set_error', payload: extractErrorMessage(e) });
        }
    };

    const canProceed = evalType === 'DESCRIPTIVE' ? defaultNarrative.trim().length > 0 : defaultRubricLevel !== null;

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
                <div className="flex items-center justify-between p-6 border-b border-gray-100">
                    <div>
                        <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                            <Layers className="h-5 w-5 text-purple-600" />
                            Record for Class
                        </h2>
                        <p className="text-sm text-gray-500 mt-0.5">
                            {learners.length} learners · set default, add exceptions below
                        </p>
                    </div>
                    <button onClick={() => onClose()} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                        <X className="h-5 w-5 text-gray-400" />
                    </button>
                </div>

                <div className="overflow-y-auto flex-1 p-6 space-y-6">
                    <div className="space-y-4">
                        <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-purple-600 text-white text-xs font-bold flex items-center justify-center">1</div>
                            <h3 className="font-semibold text-gray-900">Class Default</h3>
                        </div>
                        <Select
                            label="Evaluation Type"
                            value={evalType}
                            onChange={e => dispatch({ type: 'set_eval_type', payload: e.target.value as 'RUBRIC' | 'DESCRIPTIVE' })}
                            options={BULK_EVAL_OPTIONS}
                        />
                        {evalType === 'DESCRIPTIVE' && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Class Observation <span className="text-red-500">*</span>
                                </label>
                                <textarea
                                    value={defaultNarrative}
                                    onChange={e => dispatch({ type: 'set_default_narrative', payload: e.target.value })}
                                    rows={3}
                                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                                    placeholder="Describe what the class demonstrated overall…"
                                />
                            </div>
                        )}
                        {evalType === 'RUBRIC' && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Default Rubric Level <span className="text-red-500">*</span>
                                </label>
                                {rubricScale ? (
                                    <div className="grid grid-cols-2 gap-2">
                                        {rubricScale.levels.map(level => (
                                            <button
                                                key={level.id}
                                                onClick={() => dispatch({ type: 'set_default_rubric', payload: level.id })}
                                                className={`p-3 rounded-lg border-2 text-left transition-all ${defaultRubricLevel === level.id ? 'border-purple-600 bg-purple-50' : 'border-gray-200 hover:border-gray-300'}`}
                                            >
                                                <div className="font-semibold text-sm">{level.label}</div>
                                                <div className="text-xs text-gray-500">{level.code}</div>
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
                            <h3 className="font-semibold text-gray-900">Exceptions (optional)</h3>
                            <span className="text-xs text-gray-400">Override for specific learners</span>
                        </div>
                        <div className="space-y-2">
                            {learners.map(learner => {
                                const hasException = exceptions.has(learner.id);
                                const exc = exceptions.get(learner.id);
                                return (
                                    <div key={learner.id} className={`border rounded-lg overflow-hidden transition-all ${hasException ? 'border-amber-300' : 'border-gray-200'}`}>
                                        <div className="flex items-center gap-3 p-3">
                                            <button
                                                onClick={() => dispatch({ type: 'toggle_exception', studentId: learner.id })}
                                                className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-all ${hasException ? 'bg-amber-500 border-amber-500' : 'border-gray-300 hover:border-gray-400'}`}
                                            >
                                                {hasException && <Check className="h-3 w-3 text-white" />}
                                            </button>
                                            <div className="flex-1 min-w-0">
                                                <span className="font-medium text-sm text-gray-900">{learner.first_name} {learner.last_name}</span>
                                                <span className="text-xs text-gray-400 ml-2">{learner.admission_number}</span>
                                            </div>
                                            {hasException && <Badge variant="yellow" size="sm">Exception</Badge>}
                                        </div>
                                        {hasException && (
                                            <div className="px-3 pb-3 bg-amber-50 border-t border-amber-100 space-y-2">
                                                {evalType === 'RUBRIC' && rubricScale && (
                                                    <div className="grid grid-cols-2 gap-1 pt-2">
                                                        {rubricScale.levels.map(level => (
                                                            <button
                                                                key={level.id}
                                                                onClick={() => dispatch({ type: 'update_exception', studentId: learner.id, field: 'rubric_level', value: level.id })}
                                                                className={`p-2 rounded border text-xs text-left transition-all ${exc?.rubric_level === level.id ? 'border-amber-500 bg-amber-100' : 'border-gray-200 bg-white hover:border-gray-300'}`}
                                                            >
                                                                {level.label}
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                                {evalType === 'DESCRIPTIVE' && (
                                                    <textarea
                                                        value={exc?.narrative ?? ''}
                                                        onChange={e => dispatch({ type: 'update_exception', studentId: learner.id, field: 'narrative', value: e.target.value })}
                                                        rows={2}
                                                        className="w-full rounded border border-amber-200 px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-amber-400 resize-none mt-2"
                                                        placeholder="Override observation for this learner…"
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

                <div className="flex items-center justify-between p-6 border-t border-gray-100 bg-gray-50">
                    <p className="text-sm text-gray-500">
                        {exceptions.size > 0
                            ? `${learners.length - exceptions.size} default · ${exceptions.size} exception${exceptions.size !== 1 ? 's' : ''}`
                            : `All ${learners.length} learners get default`}
                    </p>
                    <div className="flex gap-2">
                        <Button variant="ghost" size="md" onClick={() => onClose()}>Cancel</Button>
                        <Button variant="primary" size="md" onClick={handleSubmit} disabled={!canProceed || bulkCreate.isPending}>
                            <Check className="h-4 w-4 mr-2" />
                            {bulkCreate.isPending ? 'Recording…' : `Record for ${learners.length} Learners`}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}