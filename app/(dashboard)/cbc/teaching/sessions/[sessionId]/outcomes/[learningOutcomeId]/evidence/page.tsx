'use client';

import { useState, useMemo } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import {
    Target, Users, FileText, Plus, Check, AlertCircle,
    Layers, ChevronDown, ChevronUp, X,
} from 'lucide-react';
import {
    useTeachingSession, useSessionLearners, useLearningOutcomeDetail,
    useEvidence, useCreateEvidence,
    useSessionRubricScale, useBulkCreateClassEvidence,
} from '@/app/plugins/cbc/hooks/useCBC';
import {
    CBCNav, CBCBreadcrumb, CBCError, CBCLoading, extractErrorMessage,
} from '@/app/plugins/cbc/components/CBCComponents';
import { Card } from '@/app/components/ui/Card';
import { Button } from '@/app/components/ui/Button';
import { Badge } from '@/app/components/ui/Badge';
import { Select } from '@/app/components/ui/Select';
import { Input } from '@/app/components/ui/Input';
import type {
    EvaluationType, SessionLearner, EvidenceRecord,
    BulkClassEvidenceData, StudentEntry,
} from '@/app/plugins/cbc/types/cbc';

type ApiList<T> = T[] | { results: T[]; count: number };

const EVAL_OPTIONS = [
    { value: 'DESCRIPTIVE', label: 'Descriptive (Observation)' },
    { value: 'NUMERIC', label: 'Numeric Score' },
    { value: 'COMPETENCY', label: 'Competency Check' },
];

const BULK_EVAL_OPTIONS = [
    { value: 'DESCRIPTIVE', label: 'Descriptive (Observation)' },
    { value: 'RUBRIC', label: 'Rubric Level' },
];

// ─── Bulk Class Modal ────────────────────────────────────────────────────────

interface BulkClassModalProps {
    sessionId: number;
    learningOutcomeId: number;
    learners: SessionLearner[];
    observedAt: string;
    onClose: () => void;
}

function BulkClassModal({
    sessionId, learningOutcomeId, learners, observedAt, onClose,
}: BulkClassModalProps) {
    const { data: rubricScale } = useSessionRubricScale(sessionId);
    const bulkCreate = useBulkCreateClassEvidence();

    const [evalType, setEvalType] = useState<'RUBRIC' | 'DESCRIPTIVE'>('DESCRIPTIVE');
    const [defaultNarrative, setDefaultNarrative] = useState('');
    const [defaultRubricLevel, setDefaultRubricLevel] = useState<number | null>(null);
    const [exceptions, setExceptions] = useState<Map<number, StudentEntry>>(new Map());
    const [step, setStep] = useState<1 | 2>(1);
    const [error, setError] = useState<string | null>(null);

    const toggleException = (studentId: number) => {
        setExceptions(prev => {
            const next = new Map(prev);
            if (next.has(studentId)) {
                next.delete(studentId);
            } else {
                next.set(studentId, { student_id: studentId });
            }
            return next;
        });
    };

    const updateException = (studentId: number, field: keyof StudentEntry, value: string | number | null) => {
        setExceptions(prev => {
            const next = new Map(prev);
            const existing = next.get(studentId) ?? { student_id: studentId };
            next.set(studentId, { ...existing, [field]: value });
            return next;
        });
    };

    const handleSubmit = async () => {
        setError(null);
        const studentEntries: StudentEntry[] = learners.map(l => {
            const exc = exceptions.get(l.id);
            return exc ?? { student_id: l.id };
        });

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
            onClose();
        } catch (e) {
            setError(extractErrorMessage(e));
        }
    };

    const canProceed = evalType === 'DESCRIPTIVE'
        ? defaultNarrative.trim().length > 0
        : defaultRubricLevel !== null;

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
                {/* Header */}
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
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                        <X className="h-5 w-5 text-gray-400" />
                    </button>
                </div>

                <div className="overflow-y-auto flex-1 p-6 space-y-6">
                    {/* Step 1 — Default */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-purple-600 text-white text-xs font-bold flex items-center justify-center">1</div>
                            <h3 className="font-semibold text-gray-900">Class Default</h3>
                        </div>

                        <Select
                            label="Evaluation Type"
                            value={evalType}
                            onChange={e => setEvalType(e.target.value as 'RUBRIC' | 'DESCRIPTIVE')}
                            options={BULK_EVAL_OPTIONS}
                        />

                        {evalType === 'DESCRIPTIVE' && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Class Observation <span className="text-red-500">*</span>
                                </label>
                                <textarea
                                    value={defaultNarrative}
                                    onChange={e => setDefaultNarrative(e.target.value)}
                                    rows={3}
                                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm
                                        focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
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
                                                onClick={() => setDefaultRubricLevel(level.id)}
                                                className={`p-3 rounded-lg border-2 text-left transition-all ${defaultRubricLevel === level.id
                                                        ? 'border-purple-600 bg-purple-50'
                                                        : 'border-gray-200 hover:border-gray-300'
                                                    }`}
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

                    {/* Step 2 — Exceptions */}
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
                                    <div key={learner.id} className={`border rounded-lg overflow-hidden transition-all ${hasException ? 'border-amber-300' : 'border-gray-200'
                                        }`}>
                                        <div className="flex items-center gap-3 p-3">
                                            <button
                                                onClick={() => toggleException(learner.id)}
                                                className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-all ${hasException
                                                        ? 'bg-amber-500 border-amber-500'
                                                        : 'border-gray-300 hover:border-gray-400'
                                                    }`}
                                            >
                                                {hasException && <Check className="h-3 w-3 text-white" />}
                                            </button>
                                            <div className="flex-1 min-w-0">
                                                <span className="font-medium text-sm text-gray-900">
                                                    {learner.first_name} {learner.last_name}
                                                </span>
                                                <span className="text-xs text-gray-400 ml-2">{learner.admission_number}</span>
                                            </div>
                                            {hasException && (
                                                <Badge variant="yellow" size="sm">Exception</Badge>
                                            )}
                                        </div>

                                        {hasException && (
                                            <div className="px-3 pb-3 bg-amber-50 border-t border-amber-100 space-y-2">
                                                {evalType === 'RUBRIC' && rubricScale && (
                                                    <div className="grid grid-cols-2 gap-1 pt-2">
                                                        {rubricScale.levels.map(level => (
                                                            <button
                                                                key={level.id}
                                                                onClick={() => updateException(learner.id, 'rubric_level', level.id)}
                                                                className={`p-2 rounded border text-xs text-left transition-all ${exc?.rubric_level === level.id
                                                                        ? 'border-amber-500 bg-amber-100'
                                                                        : 'border-gray-200 bg-white hover:border-gray-300'
                                                                    }`}
                                                            >
                                                                {level.label}
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                                {evalType === 'DESCRIPTIVE' && (
                                                    <textarea
                                                        value={exc?.narrative ?? ''}
                                                        onChange={e => updateException(learner.id, 'narrative', e.target.value)}
                                                        rows={2}
                                                        className="w-full rounded border border-amber-200 px-2 py-1.5 text-xs
                                                            focus:outline-none focus:ring-1 focus:ring-amber-400 resize-none mt-2"
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
                        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
                            {error}
                        </p>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between p-6 border-t border-gray-100 bg-gray-50">
                    <p className="text-sm text-gray-500">
                        {exceptions.size > 0
                            ? `${learners.length - exceptions.size} default · ${exceptions.size} exception${exceptions.size !== 1 ? 's' : ''}`
                            : `All ${learners.length} learners get default`}
                    </p>
                    <div className="flex gap-2">
                        <Button variant="ghost" size="md" onClick={onClose}>Cancel</Button>
                        <Button
                            variant="primary" size="md"
                            onClick={handleSubmit}
                            disabled={!canProceed || bulkCreate.isPending}
                        >
                            <Check className="h-4 w-4 mr-2" />
                            {bulkCreate.isPending ? 'Recording…' : `Record for ${learners.length} Learners`}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function EvidenceEntryPage() {
    const { sessionId: sRaw, learningOutcomeId: oRaw } =
        useParams<{ sessionId: string; learningOutcomeId: string }>();
    const sessionId = Number(sRaw);
    const learningOutcomeId = Number(oRaw);
    const searchParams = useSearchParams();
    const highlightStudentId = searchParams.get('student');

    const { data: session, isLoading: sessionLoading, error: sessionError } = useTeachingSession(sessionId);
    const { data: outcome, isLoading: outcomeLoading, error: outcomeError } = useLearningOutcomeDetail(learningOutcomeId);
    const { data: learners = [], isLoading: learnersLoading } = useSessionLearners(sessionId);
    const { data: allEvidenceRaw, isLoading: evidenceLoading } = useEvidence({
        learning_outcome: learningOutcomeId,
        source_type: 'SESSION',
        source_id: sessionId,
    });

    const allEvidence: EvidenceRecord[] = useMemo(() => {
        if (!allEvidenceRaw) return [];
        const raw = allEvidenceRaw as ApiList<EvidenceRecord>;
        return Array.isArray(raw) ? raw : raw.results ?? [];
    }, [allEvidenceRaw]);

    const createEvidence = useCreateEvidence();

    const evidenceByStudent = useMemo(() => {
        const map = new Map<number, EvidenceRecord[]>();
        for (const rec of allEvidence) {
            if (!map.has(rec.student)) map.set(rec.student, []);
            map.get(rec.student)!.push(rec);
        }
        return map;
    }, [allEvidence]);

    const [addingFor, setAddingFor] = useState<number | null>(null);
    const [evalType, setEvalType] = useState<EvaluationType>('DESCRIPTIVE');
    const [numericScore, setNumericScore] = useState('');
    const [narrative, setNarrative] = useState('');
    const [formError, setFormError] = useState<string | null>(null);
    const [showBulk, setShowBulk] = useState(false);

    const resetForm = () => {
        setAddingFor(null);
        setNarrative('');
        setNumericScore('');
        setEvalType('DESCRIPTIVE');
        setFormError(null);
    };

    const handleSubmit = async (studentId: number) => {
        if (!session) return;
        setFormError(null);
        try {
            await createEvidence.mutateAsync({
                student: studentId,
                learning_outcome: learningOutcomeId,
                source_type: 'SESSION',
                source_id: sessionId,
                evaluation_type: evalType,
                numeric_score: evalType === 'NUMERIC' ? parseFloat(numericScore) : null,
                narrative: narrative.trim(),
                observed_at: session.session_date,
            });
            resetForm();
        } catch (e) {
            setFormError(extractErrorMessage(e));
        }
    };

    const isPageLoading = sessionLoading || outcomeLoading || learnersLoading || evidenceLoading;

    if (isPageLoading) return (
        <div className="space-y-6"><CBCNav /><CBCLoading message="Loading…" /></div>
    );
    if (sessionError || !session) return (
        <div className="space-y-6"><CBCNav /><CBCError error={sessionError ?? 'Session not found'} /></div>
    );
    if (outcomeError || !outcome) return (
        <div className="space-y-6"><CBCNav /><CBCError error={outcomeError ?? 'Outcome not found'} /></div>
    );

    const withEvidence = learners.filter(l => evidenceByStudent.has(l.id));
    const withoutEvidence = learners.filter(l => !evidenceByStudent.has(l.id));

    return (
        <div className="space-y-6">
            <CBCNav />
            <CBCBreadcrumb segments={[
                { label: 'Teaching', href: '/cbc/teaching' },
                { label: session.subject_name ?? 'Session', href: `/cbc/teaching/sessions/${sessionId}` },
                { label: 'Outcomes', href: `/cbc/teaching/sessions/${sessionId}/outcomes` },
                { label: outcome.code, href: `/cbc/teaching/sessions/${sessionId}/outcomes/${learningOutcomeId}` },
                { label: 'Evidence' },
            ]} />

            {/* Outcome header */}
            <Card className="bg-purple-50 border-purple-200">
                <div className="flex items-start gap-4">
                    <div className="p-3 bg-purple-600 rounded-lg shrink-0">
                        <Target className="h-6 w-6 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                            <Badge variant="purple" size="lg" className="font-mono font-semibold">
                                {outcome.code}
                            </Badge>
                            <span className="text-xs text-gray-600">
                                {outcome.strand_name} → {outcome.sub_strand_name}
                            </span>
                        </div>
                        <p className="text-gray-700 font-medium">{outcome.description}</p>
                    </div>
                </div>
            </Card>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
                {[
                    { label: 'Total Learners', value: learners.length, color: 'text-blue-600' },
                    { label: 'With Evidence', value: evidenceByStudent.size, color: 'text-emerald-600' },
                    { label: 'Needs Evidence', value: withoutEvidence.length, color: 'text-red-500' },
                ].map(s => (
                    <Card key={s.label} className="text-center">
                        <div className={`text-3xl font-bold ${s.color}`}>{s.value}</div>
                        <div className="text-sm text-gray-600 mt-1">{s.label}</div>
                    </Card>
                ))}
            </div>

            {/* Actions */}
            <Card>
                <div className="flex items-center justify-between mb-5">
                    <div>
                        <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                            <Users className="h-5 w-5 text-purple-600" />
                            Evidence Recording
                        </h2>
                        <p className="text-sm text-gray-500 mt-1">
                            Record class performance or individual observations
                        </p>
                    </div>
                    <Button
                        variant="primary" size="md"
                        onClick={() => setShowBulk(true)}
                        disabled={learners.length === 0}
                    >
                        <Layers className="h-4 w-4 mr-2" />
                        Record for Class
                    </Button>
                </div>

                {learners.length === 0 ? (
                    <div className="py-12 text-center">
                        <AlertCircle className="mx-auto h-12 w-12 text-gray-300 mb-3" />
                        <p className="text-gray-500">No learners in this cohort</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {/* Needs evidence first */}
                        {withoutEvidence.length > 0 && (
                            <div className="mb-2">
                                <p className="text-xs font-semibold text-red-500 uppercase tracking-wide mb-2">
                                    🔴 Needs Evidence ({withoutEvidence.length})
                                </p>
                            </div>
                        )}
                        {learners.map(learner => {
                            const existing = evidenceByStudent.get(learner.id) ?? [];
                            const isAdding = addingFor === learner.id;
                            const isHighlighted = highlightStudentId === String(learner.id);
                            const hasEvidence = existing.length > 0;

                            return (
                                <div key={learner.id}
                                    className={`border rounded-xl overflow-hidden transition-all ${isHighlighted ? 'border-blue-500 shadow-md' :
                                            hasEvidence ? 'border-emerald-200 bg-emerald-50/30' :
                                                'border-red-100 bg-red-50/20'
                                        }`}>

                                    <div className="flex items-center justify-between p-4 bg-white">
                                        <div className="flex items-center gap-4 flex-1 min-w-0">
                                            <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${hasEvidence ? 'bg-emerald-500' : 'bg-red-400'
                                                }`} />
                                            <div className="min-w-0">
                                                <h3 className="font-semibold text-gray-900 truncate">
                                                    {learner.first_name} {learner.last_name}
                                                </h3>
                                                <p className="text-sm text-gray-500">{learner.admission_number}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3 shrink-0">
                                            {hasEvidence && (
                                                <Badge variant="green" size="sm">
                                                    {existing.length} record{existing.length !== 1 ? 's' : ''}
                                                </Badge>
                                            )}
                                            {!isAdding && (
                                                <Button
                                                    variant={hasEvidence ? 'ghost' : 'secondary'}
                                                    size="sm"
                                                    onClick={() => setAddingFor(learner.id)}
                                                >
                                                    <Plus className="h-4 w-4 mr-1" />
                                                    {hasEvidence ? 'Add More' : 'Add Evidence'}
                                                </Button>
                                            )}
                                        </div>
                                    </div>

                                    {/* Existing evidence */}
                                    {hasEvidence && !isAdding && (
                                        <div className="px-4 pb-3 bg-white border-t border-gray-100">
                                            <div className="space-y-2 pt-2">
                                                {existing.map(ev => (
                                                    <div key={ev.id} className="p-3 bg-gray-50 rounded-lg text-sm">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <Badge variant="blue" size="sm">{ev.evaluation_type}</Badge>
                                                            <span className="text-xs text-gray-500">
                                                                {new Date(ev.observed_at).toLocaleDateString('en-GB')}
                                                            </span>
                                                        </div>
                                                        {ev.narrative && <p className="text-gray-700">{ev.narrative}</p>}
                                                        {ev.numeric_score !== null && (
                                                            <p className="text-gray-700">Score: {ev.numeric_score}</p>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Per-learner form (secondary/exception workflow) */}
                                    {isAdding && (
                                        <div className="p-4 bg-blue-50 border-t border-blue-200">
                                            <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                                <FileText className="h-4 w-4 text-blue-600" />
                                                Individual Evidence
                                            </h4>
                                            <div className="space-y-3">
                                                <Select
                                                    label="Evaluation Type"
                                                    value={evalType}
                                                    onChange={e => setEvalType(e.target.value as EvaluationType)}
                                                    options={EVAL_OPTIONS}
                                                />
                                                {evalType === 'NUMERIC' && (
                                                    <Input
                                                        label="Score"
                                                        type="number"
                                                        value={numericScore}
                                                        onChange={e => setNumericScore(e.target.value)}
                                                        placeholder="Enter score…"
                                                    />
                                                )}
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                                        Observation Notes
                                                        {evalType === 'DESCRIPTIVE' && <span className="text-red-500 ml-1">*</span>}
                                                    </label>
                                                    <textarea
                                                        value={narrative}
                                                        onChange={e => setNarrative(e.target.value)}
                                                        rows={3}
                                                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm
                                                            focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                                                        placeholder="Describe what this learner demonstrated…"
                                                    />
                                                </div>
                                                {formError && (
                                                    <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
                                                        {formError}
                                                    </p>
                                                )}
                                                <div className="flex gap-2">
                                                    <Button variant="primary" size="sm"
                                                        onClick={() => handleSubmit(learner.id)}
                                                        disabled={
                                                            createEvidence.isPending ||
                                                            (evalType === 'DESCRIPTIVE' && !narrative.trim())
                                                        }>
                                                        <Check className="h-4 w-4 mr-2" />
                                                        {createEvidence.isPending ? 'Saving…' : 'Record Evidence'}
                                                    </Button>
                                                    <Button variant="ghost" size="sm" onClick={resetForm}>
                                                        Cancel
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </Card>

            {/* Bulk class modal */}
            {showBulk && session && (
                <BulkClassModal
                    sessionId={sessionId}
                    learningOutcomeId={learningOutcomeId}
                    learners={learners}
                    observedAt={session.session_date}
                    onClose={() => setShowBulk(false)}
                />
            )}
        </div>
    );
}
