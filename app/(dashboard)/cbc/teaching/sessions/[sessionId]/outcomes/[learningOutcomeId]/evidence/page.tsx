// app/(dashboard)/cbc/teaching/sessions/[sessionId]/outcomes/[learningOutcomeId]/evidence/page.tsx
'use client';

import { useParams, useSearchParams } from 'next/navigation';
import { Target, Users, Layers, AlertCircle } from 'lucide-react';
import { useEvidenceEntry } from '@/app/plugins/cbc/hooks/useEvidenceEntry';
import { LearnerEvidenceRow } from '@/app/plugins/cbc/components/evidence/LearnerEvidenceRow';
import { BulkClassModal } from '@/app/plugins/cbc/components/evidence/BulkClassModal';
import { EvidenceSuccessBanner } from '@/app/plugins/cbc/components/evidence/EvidenceSuccessBanner';
import { CBCNav, CBCBreadcrumb, CBCError, CBCLoading } from '@/app/plugins/cbc/components/CBCComponents';
import { Card } from '@/app/components/ui/Card';
import { Button } from '@/app/components/ui/Button';
import { Badge } from '@/app/components/ui/Badge';

export default function EvidenceEntryPage() {
    const { sessionId: sRaw, learningOutcomeId: oRaw } =
        useParams<{ sessionId: string; learningOutcomeId: string }>();
    const sessionId = Number(sRaw);
    const learningOutcomeId = Number(oRaw);
    const searchParams = useSearchParams();
    const highlightStudentId = searchParams.get('student');

    const {
        session, sessionError,
        outcome, outcomeError,
        sortedLearners, withoutEvidence,
        evidenceByStudent,
        isPageLoading,
        addingFor, setAddingFor,
        evalType, setEvalType,
        numericScore, setNumericScore,
        narrative, setNarrative,
        formError,
        showBulk, setShowBulk,
        bulkSuccess, setBulkSuccess,
        createEvidencePending,
        resetForm, handleSubmit, handleBulkClose,
    } = useEvidenceEntry(sessionId, learningOutcomeId);

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
                { label: outcome.code },
                { label: 'Evidence' },
            ]} />

            {bulkSuccess !== null && (
                <EvidenceSuccessBanner
                    count={bulkSuccess}
                    onDismiss={() => setBulkSuccess(null)}
                />
            )}

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

            <div className="grid grid-cols-3 gap-4">
                {[
                    { label: 'Total Learners', value: sortedLearners.length, color: 'text-blue-600' },
                    { label: 'With Evidence', value: sortedLearners.length - withoutEvidence.length, color: 'text-emerald-600' },
                    { label: 'Needs Evidence', value: withoutEvidence.length, color: 'text-red-500' },
                ].map(s => (
                    <Card key={s.label} className="text-center">
                        <div className={`text-3xl font-bold ${s.color}`}>{s.value}</div>
                        <div className="text-sm text-gray-600 mt-1">{s.label}</div>
                    </Card>
                ))}
            </div>

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
                        disabled={sortedLearners.length === 0}
                    >
                        <Layers className="h-4 w-4 mr-2" />
                        Record for Class
                    </Button>
                </div>

                {sortedLearners.length === 0 ? (
                    <div className="py-12 text-center">
                        <AlertCircle className="mx-auto h-12 w-12 text-gray-300 mb-3" />
                        <p className="text-gray-500">No learners in this cohort</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {withoutEvidence.length > 0 && (
                            <p className="text-xs font-semibold text-red-500 uppercase tracking-wide mb-2">
                                🔴 Needs Evidence ({withoutEvidence.length})
                            </p>
                        )}
                        {sortedLearners.map(learner => (
                            <LearnerEvidenceRow
                                key={learner.id}
                                learner={learner}
                                evidence={evidenceByStudent.get(learner.id) ?? []}
                                isAdding={addingFor === learner.id}
                                isHighlighted={highlightStudentId === String(learner.id)}
                                evalType={evalType}
                                numericScore={numericScore}
                                narrative={narrative}
                                formError={formError}
                                createPending={createEvidencePending}
                                onStartAdding={() => setAddingFor(learner.id)}
                                onEvalTypeChange={setEvalType}
                                onNumericScoreChange={setNumericScore}
                                onNarrativeChange={setNarrative}
                                onSubmit={() => handleSubmit(learner.id)}
                                onCancel={resetForm}
                            />
                        ))}
                    </div>
                )}
            </Card>

            {showBulk && session && (
                <BulkClassModal
                    sessionId={sessionId}
                    learningOutcomeId={learningOutcomeId}
                    learners={sortedLearners}
                    observedAt={session.session_date}
                    onClose={handleBulkClose}
                />
            )}
        </div>
    );
}