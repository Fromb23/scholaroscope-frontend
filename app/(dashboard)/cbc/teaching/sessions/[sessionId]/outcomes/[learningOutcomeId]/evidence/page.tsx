'use client';
// app/(dashboard)/cbc/teaching/sessions/[sessionId]/outcomes/[learningOutcomeId]/evidence/page.tsx

import { useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
    ArrowLeft, Target, Users, FileText, Plus, Check, AlertCircle,
} from 'lucide-react';
import {
    useTeachingSession, useSessionLearners, useLearningOutcomeDetail,
    useOutcomeSessions, useEvidence, useCreateEvidence,
} from '@/app/plugins/cbc/hooks/useCBC';
import {
    CBCNav, CBCBreadcrumb, CBCError, CBCLoading, extractErrorMessage,
} from '@/app/plugins/cbc/components/CBCComponents';
import { Card } from '@/app/components/ui/Card';
import { Button } from '@/app/components/ui/Button';
import { Badge } from '@/app/components/ui/Badge';
import { Select } from '@/app/components/ui/Select';
import { Input } from '@/app/components/ui/Input';
import type { EvaluationType } from '@/app/plugins/cbc/types/cbc';

const EVAL_OPTIONS = [
    { value: 'DESCRIPTIVE', label: 'Descriptive (Observation)' },
    { value: 'NUMERIC', label: 'Numeric Score' },
    { value: 'COMPETENCY', label: 'Competency Check' },
];

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
    const { data: links = [] } = useOutcomeSessions(sessionId);

    // All evidence for this outcome + session
    const { data: allEvidence = [], isLoading: evidenceLoading } = useEvidence({
        learning_outcome: learningOutcomeId,
        source_type: 'SESSION',
        source_id: sessionId,
    });

    const createEvidence = useCreateEvidence();

    // Group evidence by student id
    const evidenceByStudent = new Map<number, typeof allEvidence>();
    for (const rec of allEvidence) {
        if (!evidenceByStudent.has(rec.student)) evidenceByStudent.set(rec.student, []);
        evidenceByStudent.get(rec.student)!.push(rec);
    }

    const [addingFor, setAddingFor] = useState<number | null>(null);
    const [evalType, setEvalType] = useState<EvaluationType>('DESCRIPTIVE');
    const [numericScore, setNumericScore] = useState('');
    const [narrative, setNarrative] = useState('');
    const [formError, setFormError] = useState<string | null>(null);

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
                // recorded_by intentionally absent — set from request.user on server
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
                    { label: 'Total Records', value: allEvidence.length, color: 'text-purple-600' },
                ].map(s => (
                    <Card key={s.label} className="text-center">
                        <div className={`text-3xl font-bold ${s.color}`}>{s.value}</div>
                        <div className="text-sm text-gray-600 mt-1">{s.label}</div>
                    </Card>
                ))}
            </div>

            {/* Learner list */}
            <Card>
                <div className="mb-5">
                    <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                        <Users className="h-5 w-5 text-purple-600" />
                        Record Evidence by Learner
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">Document observations for each learner</p>
                </div>

                {learners.length === 0 ? (
                    <div className="py-12 text-center">
                        <AlertCircle className="mx-auto h-12 w-12 text-gray-300 mb-3" />
                        <p className="text-gray-500">No learners in this cohort</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {learners.map(learner => {
                            const existing = evidenceByStudent.get(learner.id) ?? [];
                            const isAdding = addingFor === learner.id;
                            const isHighlighted = highlightStudentId === String(learner.id);

                            return (
                                <div key={learner.id}
                                    className={`border rounded-xl overflow-hidden transition-all ${isHighlighted ? 'border-blue-500 shadow-md' :
                                        existing.length > 0 ? 'border-emerald-200 bg-emerald-50/30' :
                                            'border-gray-200'
                                        }`}>

                                    {/* Learner row */}
                                    <div className="flex items-center justify-between p-4 bg-white">
                                        <div className="flex items-center gap-4 flex-1 min-w-0">
                                            <div className="p-2 bg-purple-100 rounded-lg shrink-0">
                                                <Users className="h-5 w-5 text-purple-600" />
                                            </div>
                                            <div className="min-w-0">
                                                <h3 className="font-semibold text-gray-900 truncate">
                                                    {learner.first_name} {learner.last_name}
                                                </h3>
                                                <p className="text-sm text-gray-500">{learner.admission_number}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3 shrink-0">
                                            {existing.length > 0 && (
                                                <Badge variant="green" size="sm">
                                                    {existing.length} record{existing.length !== 1 ? 's' : ''}
                                                </Badge>
                                            )}
                                            {!isAdding && (
                                                <Button variant={existing.length > 0 ? 'ghost' : 'primary'} size="sm"
                                                    onClick={() => setAddingFor(learner.id)}>
                                                    <Plus className="h-4 w-4 mr-1" />Add Evidence
                                                </Button>
                                            )}
                                        </div>
                                    </div>

                                    {/* Existing evidence records */}
                                    {existing.length > 0 && (
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

                                    {/* Add form */}
                                    {isAdding && (
                                        <div className="p-4 bg-blue-50 border-t border-blue-200">
                                            <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                                <FileText className="h-4 w-4 text-blue-600" />
                                                Record New Evidence
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
                                                        placeholder="Describe what the learner demonstrated…"
                                                    />
                                                </div>
                                                {formError && (
                                                    <p className="text-sm text-red-600 bg-red-50 border border-red-200
                            rounded-lg p-3">
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
        </div>
    );
}