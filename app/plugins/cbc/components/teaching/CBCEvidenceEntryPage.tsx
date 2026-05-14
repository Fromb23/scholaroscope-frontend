'use client';

import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { AlertCircle, Layers, ShieldAlert, Target, Users } from 'lucide-react';
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
    extractErrorMessage,
} from '@/app/plugins/cbc/components/CBCComponents';
import { Card } from '@/app/components/ui/Card';
import { Button } from '@/app/components/ui/Button';
import { Badge } from '@/app/components/ui/Badge';
import { attendanceStatusLabel } from '@/app/plugins/cbc/lib/evidenceEligibility';

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
                <CBCLoading message="Loading class performance…" />
            </div>
        );
    }

    if (page.sessionError || !page.session) {
        return (
            <div className="space-y-6">
                <CBCNav />
                <CBCError error={page.sessionError ?? 'Lesson not found'} />
            </div>
        );
    }

    if (page.outcomeError || !page.outcome) {
        return (
            <div className="space-y-6">
                <CBCNav />
                <CBCError error={page.outcomeError ?? 'Learning goal not found'} />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <CBCNav />
            <CBCBreadcrumb
                segments={[
                    { label: 'Teaching', href: '/cbc/teaching' },
                    { label: 'Lessons', href: '/cbc/teaching/sessions' },
                    {
                        label: page.session.subject_name ?? 'Lesson',
                        href: `/cbc/teaching/sessions/${sessionId}/outcomes`,
                    },
                    { label: 'What Was Taught', href: `/cbc/teaching/sessions/${sessionId}/outcomes` },
                    { label: page.outcome.code },
                    { label: 'Class Performance' },
                ]}
            />
            <CBCTeachingSessionNav sessionId={sessionId} active="outcomes" />

            {page.bulkSuccess !== null && (
                <EvidenceSuccessBanner
                    result={page.bulkSuccess}
                    onDismiss={() => page.setBulkSuccess(null)}
                />
            )}

            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Class performance</h1>
                    <p className="mt-1 text-sm text-gray-500">
                        Record learning observations for this lesson.
                    </p>
                </div>
                <div className="text-sm text-gray-500">
                    <p className="font-medium text-gray-700">
                        {page.session.cohort_name} · {page.session.subject_name}
                    </p>
                    <p>
                        Lesson:{' '}
                        {new Date(page.session.session_date).toLocaleDateString('en-GB', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                        })}
                    </p>
                </div>
            </div>

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

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
                {[
                    { label: 'Total Learners', value: page.learners.length, color: 'text-blue-600' },
                    { label: 'In Lesson', value: page.eligibleLearners.length, color: 'text-indigo-600' },
                    { label: 'Observed', value: page.eligibleWithEvidence.length, color: 'text-emerald-600' },
                    { label: 'Not yet observed', value: page.eligibleWithoutEvidence.length, color: 'text-slate-600' },
                    { label: 'Not part of this lesson', value: page.ineligibleLearners.length, color: 'text-gray-500' },
                ].map(stat => (
                    <Card key={stat.label} className="text-center">
                        <div className={`text-3xl font-bold ${stat.color}`}>
                            {page.isEvidencePanelLoading ? '—' : stat.value}
                        </div>
                        <div className="text-sm text-gray-600 mt-1">{stat.label}</div>
                    </Card>
                ))}
            </div>

            <Card>
                <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                            <Users className="h-5 w-5 text-purple-600" />
                            Learning observations
                        </h2>
                        <p className="text-sm text-gray-500 mt-1">
                            Record class performance or individual observations
                        </p>
                    </div>
                    <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                        <Link href={`/cbc/teaching/sessions/${sessionId}/outcomes`} className="w-full sm:w-auto">
                            <Button variant="ghost" size="md" className="w-full sm:w-auto">
                                Back to what was taught
                            </Button>
                        </Link>
                        <Button
                            variant="primary"
                            size="md"
                            className="w-full sm:w-auto"
                            onClick={() => page.setShowBulk(true)}
                            disabled={page.hasBlockingAttendance || page.eligibleLearners.length === 0}
                        >
                            <Layers className="h-4 w-4 mr-2" />
                            Record class performance
                        </Button>
                    </div>
                </div>

                {page.hasBlockingAttendance && (
                    <div className="mb-5 rounded-lg border border-amber-200 bg-amber-50 p-4">
                        <div className="flex items-start gap-3">
                            <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
                            <div className="space-y-1">
                                <p className="text-sm font-medium text-amber-900">
                                    Attendance must be completed before class performance can be recorded.
                                </p>
                                <p className="text-sm text-amber-800">
                                    {page.unmarkedLearners.length} learner{page.unmarkedLearners.length !== 1 ? 's are' : ' is'} still unmarked for this session.
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {page.learnersError || page.evidenceError ? (
                    <CBCError error={extractErrorMessage(page.learnersError ?? page.evidenceError)} />
                ) : page.isEvidencePanelLoading ? (
                    <CBCLoading message="Loading learners and observations…" />
                ) : page.learners.length === 0 ? (
                    <div className="py-12 text-center">
                        <AlertCircle className="mx-auto h-12 w-12 text-gray-300 mb-3" />
                        <p className="text-gray-500">No learners in this class</p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        <div className="space-y-3">
                            {page.eligibleWithoutEvidence.length > 0 && (
                                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                                    Not yet observed ({page.eligibleWithoutEvidence.length})
                                </p>
                            )}
                            {page.sortedEligibleLearners.length === 0 ? (
                                <div className="py-10 text-center">
                                    <AlertCircle className="mx-auto mb-3 h-10 w-10 text-gray-300" />
                                    <p className="text-gray-600">No learners can be recorded for this lesson yet.</p>
                                </div>
                            ) : page.sortedEligibleLearners.map(learner => (
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

                        {page.ineligibleLearners.length > 0 && (
                            <div className="space-y-3 border-t border-gray-200 pt-6">
                                <div>
                                    <h3 className="text-base font-semibold text-gray-900">
                                        Not part of this lesson
                                    </h3>
                                    <p className="mt-1 text-sm text-gray-500">
                                        These learners were absent, excused, or sick for this lesson and are not counted as not yet observed.
                                    </p>
                                </div>
                                <div className="space-y-2">
                                    {page.ineligibleLearners.map(learner => (
                                        <div
                                            key={learner.id}
                                            className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-gray-50 p-4 sm:flex-row sm:items-center sm:justify-between"
                                        >
                                            <div className="min-w-0">
                                                <p className="font-semibold text-gray-900">
                                                    {learner.first_name} {learner.last_name}
                                                </p>
                                                <p className="text-sm text-gray-500">
                                                    {learner.admission_number}
                                                </p>
                                            </div>
                                            <Badge variant="default" size="sm">
                                                {attendanceStatusLabel(
                                                    learner.attendance_status,
                                                    learner.attendance_status_display,
                                                )}
                                            </Badge>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </Card>

            {page.showBulk && page.session && (
                <BulkClassModal
                    sessionId={sessionId}
                    learningOutcomeId={learningOutcomeId}
                    learners={page.eligibleLearners}
                    observedAt={page.session.session_date}
                    onClose={page.handleBulkClose}
                />
            )}
        </div>
    );
}
