'use client';

import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { AlertCircle, Layers, Target, Users } from 'lucide-react';
import { useEvidenceEntry } from '@/app/plugins/cbc/hooks/useEvidenceEntry';
import { LearnerEvidenceRow } from '@/app/plugins/cbc/components/evidence/LearnerEvidenceRow';
import { BulkClassModal } from '@/app/plugins/cbc/components/evidence/BulkClassModal';
import { EvidenceSuccessBanner } from '@/app/plugins/cbc/components/evidence/EvidenceSuccessBanner';
import {
    CBCNav,
    CBCBreadcrumb,
    CBCError,
    CBCLoading,
    CBCTeachingSessionNav,
} from '@/app/plugins/cbc/components/CBCComponents';
import { Card } from '@/app/components/ui/Card';
import { Button } from '@/app/components/ui/Button';
import { Badge } from '@/app/components/ui/Badge';

export function CBCEvidenceEntryPage() {
    const { sessionId: sessionRaw, learningOutcomeId: outcomeRaw } =
        useParams<{ sessionId: string; learningOutcomeId: string }>();
    const sessionId = Number(sessionRaw);
    const learningOutcomeId = Number(outcomeRaw);
    const searchParams = useSearchParams();
    const highlightStudentId = searchParams.get('student');

    const page = useEvidenceEntry(sessionId, learningOutcomeId);

    if (page.isPageLoading) {
        return (
            <div className="space-y-6">
                <CBCNav />
                <CBCLoading message="Loading…" />
            </div>
        );
    }

    if (page.sessionError || !page.session) {
        return (
            <div className="space-y-6">
                <CBCNav />
                <CBCError error={page.sessionError ?? 'Session not found'} />
            </div>
        );
    }

    if (page.outcomeError || !page.outcome) {
        return (
            <div className="space-y-6">
                <CBCNav />
                <CBCError error={page.outcomeError ?? 'Outcome not found'} />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <CBCNav />
            <CBCBreadcrumb segments={[
                { label: 'Teaching', href: '/cbc/teaching' },
                { label: 'Sessions', href: '/cbc/teaching/sessions' },
                { label: page.session.subject_name ?? 'Session', href: `/cbc/teaching/sessions/${sessionId}/outcomes` },
                { label: 'Outcomes', href: `/cbc/teaching/sessions/${sessionId}/outcomes` },
                { label: page.outcome.code },
                { label: 'Evidence' },
            ]} />
            <CBCTeachingSessionNav sessionId={sessionId} active="outcomes" />

            {page.bulkSuccess !== null && (
                <EvidenceSuccessBanner
                    result={page.bulkSuccess}
                    onDismiss={() => page.setBulkSuccess(null)}
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
                                {page.outcome.code}
                            </Badge>
                            <span className="text-xs text-gray-600">
                                {page.outcome.strand_name} → {page.outcome.sub_strand_name}
                            </span>
                        </div>
                        <p className="text-gray-700 font-medium">{page.outcome.description}</p>
                    </div>
                </div>
            </Card>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                {[
                    { label: 'Total Learners', value: page.sortedLearners.length, color: 'text-blue-600' },
                    { label: 'With Evidence', value: page.sortedLearners.length - page.withoutEvidence.length, color: 'text-emerald-600' },
                    { label: 'Needs Evidence', value: page.withoutEvidence.length, color: 'text-red-500' },
                ].map(stat => (
                    <Card key={stat.label} className="text-center">
                        <div className={`text-3xl font-bold ${stat.color}`}>{stat.value}</div>
                        <div className="text-sm text-gray-600 mt-1">{stat.label}</div>
                    </Card>
                ))}
            </div>

            <Card>
                <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                            <Users className="h-5 w-5 text-purple-600" />
                            Evidence Recording
                        </h2>
                        <p className="text-sm text-gray-500 mt-1">
                            Record class performance or individual observations
                        </p>
                    </div>
                    <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                        <Link href={`/cbc/teaching/sessions/${sessionId}/outcomes`} className="w-full sm:w-auto">
                            <Button variant="ghost" size="md" className="w-full sm:w-auto">
                                Back to Outcomes
                            </Button>
                        </Link>
                        <Button
                            variant="primary"
                            size="md"
                            className="w-full sm:w-auto"
                            onClick={() => page.setShowBulk(true)}
                            disabled={page.sortedLearners.length === 0}
                        >
                            <Layers className="h-4 w-4 mr-2" />
                            Record for Class
                        </Button>
                    </div>
                </div>

                {page.sortedLearners.length === 0 ? (
                    <div className="py-12 text-center">
                        <AlertCircle className="mx-auto h-12 w-12 text-gray-300 mb-3" />
                        <p className="text-gray-500">No learners in this cohort</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {page.withoutEvidence.length > 0 && (
                            <p className="text-xs font-semibold text-red-500 uppercase tracking-wide mb-2">
                                🔴 Needs Evidence ({page.withoutEvidence.length})
                            </p>
                        )}
                        {page.sortedLearners.map(learner => (
                            <LearnerEvidenceRow
                                key={learner.id}
                                learner={learner}
                                evidence={page.evidenceByStudent.get(learner.id) ?? []}
                                isAdding={page.addingFor === learner.id}
                                isHighlighted={highlightStudentId === String(learner.id)}
                                evalType={page.evalType}
                                numericScore={page.numericScore}
                                narrative={page.narrative}
                                formError={page.formError}
                                createPending={page.createEvidencePending}
                                onStartAdding={() => page.setAddingFor(learner.id)}
                                onEvalTypeChange={page.setEvalType}
                                onNumericScoreChange={page.setNumericScore}
                                onNarrativeChange={page.setNarrative}
                                onSubmit={() => page.handleSubmit(learner.id)}
                                onCancel={page.resetForm}
                            />
                        ))}
                    </div>
                )}
            </Card>

            {page.showBulk && page.session && (
                <BulkClassModal
                    sessionId={sessionId}
                    learningOutcomeId={learningOutcomeId}
                    learners={page.sortedLearners}
                    observedAt={page.session.session_date}
                    onClose={page.handleBulkClose}
                />
            )}
        </div>
    );
}
