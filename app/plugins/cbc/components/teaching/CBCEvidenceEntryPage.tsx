'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import {
    AlertCircle,
    ChevronDown,
    ChevronRight,
    Layers,
    ShieldAlert,
    Target,
    Users,
} from 'lucide-react';
import { useEvidenceEntry } from '@/app/plugins/cbc/hooks/useEvidenceEntry';
import { useAssistantPageContext } from '@/app/core/components/assistant/useAssistantPageContext';
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
import { ErrorBanner } from '@/app/components/ui/ErrorBanner';
import { sessionAPI } from '@/app/core/api/sessions';
import { extractErrorMessage, type ApiError } from '@/app/core/types/errors';
import { attendanceStatusLabel } from '@/app/plugins/cbc/lib/evidenceEligibility';

interface WorkflowNotice {
    message: string;
    variant: 'info' | 'success';
}

function withQueryParams(href: string, params: Record<string, string | null | undefined>) {
    const [basePath, existingQuery = ''] = href.split('?', 2);
    const searchParams = new URLSearchParams(existingQuery);

    Object.entries(params).forEach(([key, value]) => {
        if (value) {
            searchParams.set(key, value);
        } else {
            searchParams.delete(key);
        }
    });

    if (searchParams.size === 0) {
        return basePath;
    }

    return `${basePath}?${searchParams.toString()}`;
}

function buildLessonWorkspaceHref(
    sessionId: number,
    canOfferEndSession: boolean,
    returnTo?: string | null,
) {
    const baseHref = returnTo || `/sessions/${sessionId}`;

    if (!canOfferEndSession) {
        return baseHref;
    }

    return withQueryParams(baseHref, {
        notice: 'evidence-recorded-next-close',
        section: 'complete',
    });
}

export function CBCEvidenceEntryPage() {
    const { sessionId: sessionRaw, learningOutcomeId: outcomeRaw } =
        useParams<{ sessionId: string; learningOutcomeId: string }>();
    const sessionId = Number(sessionRaw);
    const learningOutcomeId = Number(outcomeRaw);
    const router = useRouter();
    const searchParams = useSearchParams();
    const highlightStudentId = searchParams.get('highlightStudent') ?? searchParams.get('student');
    const section = searchParams.get('section');
    const action = searchParams.get('action');
    const notice = searchParams.get('notice');
    const returnTo = searchParams.get('returnTo');

    const page = useEvidenceEntry(sessionId, learningOutcomeId);
    const isLoading = page.isPageLoading || page.isEvidencePanelLoading;
    const learnerCount = page.learners.length;
    const eligibleLearnerCount = page.eligibleLearners.length;
    const eligibleWithEvidenceCount = page.eligibleWithEvidence.length;
    const eligibleWithoutEvidenceCount = page.eligibleWithoutEvidence.length;
    const isEmpty = !page.isPageLoading && !page.isEvidencePanelLoading && learnerCount === 0;
    const canRecordEvidence = !page.hasBlockingAttendance && eligibleLearnerCount > 0;
    const hasSession = Boolean(page.session);
    const hasOutcome = Boolean(page.outcome);
    const sessionStatus = page.session?.status ?? null;
    const coveragePercentage = eligibleLearnerCount > 0
        ? Math.round((eligibleWithEvidenceCount / eligibleLearnerCount) * 100)
        : 0;
    const workflowStep = page.hasBlockingAttendance ? 'complete_attendance_first' : 'record_cbc_evidence';
    const hasWorkflowIntent = (
        section === 'evidence'
        || section === 'learning-observations'
        || action === 'record-evidence'
        || Boolean(highlightStudentId)
    );
    const hasRecordedEvidence = eligibleWithEvidenceCount > 0 || page.bulkSuccess !== null;
    const canOfferEndSession = page.session?.status === 'IN_PROGRESS' && hasRecordedEvidence;
    const lessonWorkspaceHref = buildLessonWorkspaceHref(sessionId, canOfferEndSession, returnTo);
    const completedLessonWorkspaceHref = withQueryParams(
        returnTo || `/sessions/${sessionId}`,
        { notice: 'lesson-closed' }
    );
    const [observationsOpen, setObservationsOpen] = useState(() => hasWorkflowIntent);
    const [completionPending, setCompletionPending] = useState(false);
    const [completionError, setCompletionError] = useState<string | null>(null);
    const [workflowNotice, setWorkflowNotice] = useState<WorkflowNotice | null>(null);
    const setShowBulk = page.setShowBulk;
    const setBulkSuccess = page.setBulkSuccess;
    const bulkActionLabel = eligibleLearnerCount > 0 && eligibleWithoutEvidenceCount === 0
        ? 'Add another observation'
        : 'Record class performance';

    const workflowNoticeConfig = useMemo<WorkflowNotice | null>(() => {
        if (notice === 'closure-evidence-required') {
            return {
                message: 'Learner performance is required before this lesson can be closed.',
                variant: 'info',
            };
        }

        if (action === 'record-evidence') {
            return {
                message: 'You were brought here to record learner performance for this lesson outcome.',
                variant: 'info',
            };
        }

        if (section === 'evidence' || section === 'learning-observations') {
            return {
                message: 'Learning observations are open so you can continue recording learner performance.',
                variant: 'info',
            };
        }

        if (highlightStudentId) {
            return {
                message: 'This learner is highlighted so you can review or add observations quickly.',
                variant: 'info',
            };
        }

        return null;
    }, [action, highlightStudentId, notice, section]);

    useEffect(() => {
        if (hasWorkflowIntent) {
            setObservationsOpen(true);
        }
    }, [hasWorkflowIntent]);

    useEffect(() => {
        if (!workflowNoticeConfig) {
            return;
        }

        setWorkflowNotice(workflowNoticeConfig);
    }, [workflowNoticeConfig]);

    const scrollToObservations = useCallback(() => {
        document.getElementById('learning-observations-section')?.scrollIntoView({
            behavior: 'smooth',
            block: 'start',
        });
    }, []);

    const openBulkEvidenceModal = useCallback(() => {
        setCompletionError(null);
        setObservationsOpen(true);
        setShowBulk(true);
    }, [setShowBulk]);

    const continueRecordingEvidence = useCallback(() => {
        setCompletionError(null);
        setObservationsOpen(true);
        scrollToObservations();
    }, [scrollToObservations]);

    const handleOpenObservations = useCallback(() => {
        setObservationsOpen(true);
        scrollToObservations();
    }, [scrollToObservations]);

    const handleEndSession = useCallback(async () => {
        if (!page.session || page.session.status !== 'IN_PROGRESS') {
            router.push(lessonWorkspaceHref);
            return;
        }

        try {
            setCompletionPending(true);
            setCompletionError(null);

            const completedSession = await sessionAPI.complete(sessionId);

            if (completedSession.status === 'COMPLETED') {
                router.push(completedLessonWorkspaceHref);
                return;
            }

            router.push(lessonWorkspaceHref);
        } catch (error) {
            const apiError = error as ApiError;
            const status = apiError.response?.status;

            if (typeof status === 'number' && status >= 400 && status < 500) {
                router.push(lessonWorkspaceHref);
                return;
            }

            setCompletionError(
                extractErrorMessage(apiError, 'We could not close the lesson record.'),
            );
        } finally {
            setCompletionPending(false);
        }
    }, [completedLessonWorkspaceHref, lessonWorkspaceHref, page.session, router, sessionId]);

    const assistantContext = useMemo(() => ({
        pageKey: 'cbc_evidence_entry',
        pageTitle: 'CBC Evidence Entry',
        state: {
            is_loading: isLoading,
            is_empty: isEmpty,
            has_sessions: hasSession,
            session_status: sessionStatus,
            has_subject_filter: false,
            has_cohort_filter: false,
            has_taught_outcomes: hasOutcome,
            has_learner_evidence: eligibleWithEvidenceCount > 0,
            coverage_percentage: coveragePercentage,
        },
        visibleActions: [
            {
                label: 'Open CBC Sessions',
                type: 'navigate' as const,
                href: '/cbc/teaching/sessions',
            },
            {
                label: 'Back to what was taught',
                type: 'navigate' as const,
                href: `/cbc/teaching/sessions/${sessionId}/outcomes`,
            },
            ...(canRecordEvidence
                ? [{
                    label: 'Record learner evidence',
                    type: 'page_action' as const,
                    target: 'open_bulk_evidence_modal',
                    handler: openBulkEvidenceModal,
                }]
                : []),
        ],
        nextSafeAction: canRecordEvidence
            ? {
                label: 'Record learner evidence',
                type: 'page_action' as const,
                target: 'open_bulk_evidence_modal',
                handler: openBulkEvidenceModal,
            }
            : {
                label: 'Back to what was taught',
                type: 'navigate' as const,
                href: `/cbc/teaching/sessions/${sessionId}/outcomes`,
            },
        workflowStep,
        emptyStateReason: isEmpty
            ? 'No learners are available for evidence entry on this lesson outcome.'
            : undefined,
    }), [
        canRecordEvidence,
        coveragePercentage,
        eligibleWithEvidenceCount,
        hasOutcome,
        hasSession,
        isEmpty,
        isLoading,
        openBulkEvidenceModal,
        sessionStatus,
        sessionId,
        workflowStep,
    ]);

    useAssistantPageContext(assistantContext);

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

            {workflowNotice ? (
                <ErrorBanner
                    message={workflowNotice.message}
                    variant={workflowNotice.variant}
                    autoDismissMs={4000}
                    onDismiss={() => setWorkflowNotice(null)}
                />
            ) : null}

            {page.bulkSuccess !== null ? (
                <EvidenceSuccessBanner
                    sessionId={sessionId}
                    result={page.bulkSuccess}
                    workspaceHref={lessonWorkspaceHref}
                    canEndSession={canOfferEndSession}
                    endingSession={completionPending}
                    onEndSession={() => {
                        void handleEndSession();
                    }}
                    onContinueRecording={continueRecordingEvidence}
                    onDismiss={() => setBulkSuccess(null)}
                />
            ) : null}

            {completionError ? (
                <ErrorBanner
                    message={completionError}
                    variant="error"
                    onDismiss={() => setCompletionError(null)}
                />
            ) : null}

            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold theme-text">Class performance</h1>
                    <p className="mt-1 text-sm theme-muted">
                        Record learning observations for this lesson.
                    </p>
                </div>
                <div className="text-sm theme-muted">
                    <p className="font-medium theme-text">
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

            <Card className="border-purple-500/20 bg-purple-500/10">
                <div className="flex items-start gap-4">
                    <div className="shrink-0 rounded-lg bg-purple-600 p-3">
                        <Target className="h-6 w-6 text-white" />
                    </div>
                    <div className="min-w-0 flex-1">
                        <div className="mb-2 flex items-center gap-2 flex-wrap">
                            <Badge variant="purple" size="lg" className="font-mono font-semibold">
                                {page.outcome.code}
                            </Badge>
                            <span className="text-xs theme-muted">
                                {page.outcome.strand_name} → {page.outcome.sub_strand_name}
                            </span>
                        </div>
                        <p className="font-medium theme-text">{page.outcome.description}</p>
                    </div>
                </div>
            </Card>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
                {[
                    { label: 'Total Learners', value: page.learners.length, color: 'text-blue-600' },
                    { label: 'In Lesson', value: page.eligibleLearners.length, color: 'text-indigo-600' },
                    { label: 'Observed', value: page.eligibleWithEvidence.length, color: 'text-emerald-600' },
                    { label: 'Not yet observed', value: page.eligibleWithoutEvidence.length, color: 'text-slate-600' },
                    { label: 'Not part of this lesson', value: page.ineligibleLearners.length, color: 'theme-subtle' },
                ].map(stat => (
                    <Card key={stat.label} className="text-center">
                        <div className={`text-3xl font-bold ${stat.color}`}>
                            {page.isEvidencePanelLoading ? '—' : stat.value}
                        </div>
                        <div className="mt-1 text-sm theme-muted">{stat.label}</div>
                    </Card>
                ))}
            </div>

            <div id="learning-observations-section">
                <Card className="overflow-hidden p-0">
                    <button
                        type="button"
                        onClick={() => setObservationsOpen((current) => !current)}
                        className="theme-focus-ring flex w-full items-start gap-3 px-5 py-4 text-left transition-colors theme-hover-surface"
                    >
                        <div className="theme-surface-muted mt-0.5 rounded-lg border p-1.5 theme-border">
                            {observationsOpen ? (
                                <ChevronDown className="h-4 w-4 text-purple-600" />
                            ) : (
                                <ChevronRight className="h-4 w-4 theme-subtle" />
                            )}
                        </div>
                        <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                                <Users className="h-5 w-5 text-purple-600" />
                                <h2 className="text-xl font-semibold theme-text">
                                    Learning observations
                                </h2>
                            </div>
                            <p className="mt-1 text-sm theme-muted">
                                {observationsOpen
                                    ? 'Record class performance or individual learner observations. Existing evidence stays visible and you can keep adding more.'
                                    : `${learnerCount} learners · ${eligibleWithEvidenceCount} observed · ${eligibleWithoutEvidenceCount} not yet observed`}
                            </p>
                        </div>
                    </button>

                    <div className="space-y-4 border-t px-5 py-4 theme-border">
                        {page.hasBlockingAttendance ? (
                            <div className="theme-warning-surface rounded-lg p-4">
                                <div className="flex items-start gap-3">
                                    <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-[color:var(--color-warning)]" />
                                    <div className="space-y-1">
                                        <p className="text-sm font-medium theme-text">
                                            Attendance must be completed before class performance can be recorded.
                                        </p>
                                        <p className="text-sm theme-muted">
                                            {page.unmarkedLearners.length} learner{page.unmarkedLearners.length !== 1 ? 's are' : ' is'} still unmarked for this session.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ) : null}

                        {observationsOpen ? (
                            <>
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                    <p className="text-sm theme-muted">
                                        Keep recording class-wide or learner-specific observations for this lesson outcome.
                                    </p>
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
                                            onClick={openBulkEvidenceModal}
                                            disabled={page.hasBlockingAttendance || page.eligibleLearners.length === 0}
                                        >
                                            <Layers className="mr-2 h-4 w-4" />
                                            {bulkActionLabel}
                                        </Button>
                                    </div>
                                </div>

                                {page.learnersError || page.evidenceError ? (
                                    <CBCError error={page.learnersError ?? page.evidenceError} />
                                ) : page.isEvidencePanelLoading ? (
                                    <CBCLoading message="Loading learners and observations…" />
                                ) : page.learners.length === 0 ? (
                                    <div className="py-12 text-center">
                                        <AlertCircle className="mx-auto mb-3 h-12 w-12 theme-subtle" />
                                        <p className="theme-muted">No learners in this class</p>
                                    </div>
                                ) : (
                                    <div className="space-y-6">
                                        <div className="space-y-3">
                                            {page.eligibleWithoutEvidence.length > 0 ? (
                                                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                                                    Not yet observed ({page.eligibleWithoutEvidence.length})
                                                </p>
                                            ) : null}
                                            {page.sortedEligibleLearners.length === 0 ? (
                                                <div className="py-10 text-center">
                                                    <AlertCircle className="mx-auto mb-3 h-10 w-10 theme-subtle" />
                                                    <p className="theme-muted">
                                                        No learners can be recorded for this lesson yet.
                                                    </p>
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

                                        {page.ineligibleLearners.length > 0 ? (
                                            <div className="space-y-3 border-t pt-6 theme-border">
                                                <div>
                                                    <h3 className="text-base font-semibold theme-text">
                                                        Not part of this lesson
                                                    </h3>
                                                    <p className="mt-1 text-sm theme-muted">
                                                        These learners were absent, excused, or sick for this lesson and are not counted as not yet observed.
                                                    </p>
                                                </div>
                                                <div className="space-y-2">
                                                    {page.ineligibleLearners.map(learner => (
                                                        <div
                                                            key={learner.id}
                                                            className="theme-surface-muted flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between theme-border"
                                                        >
                                                            <div className="min-w-0">
                                                                <p className="font-semibold theme-text">
                                                                    {learner.first_name} {learner.last_name}
                                                                </p>
                                                                <p className="text-sm theme-muted">
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
                                        ) : null}
                                    </div>
                                )}
                            </>
                        ) : page.learnersError || page.evidenceError ? (
                            <CBCError error={page.learnersError ?? page.evidenceError} />
                        ) : page.isEvidencePanelLoading ? (
                            <CBCLoading message="Loading learners and observations…" />
                        ) : (
                            <div className="space-y-4">
                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                                    {[
                                        { label: 'Total learners', value: learnerCount },
                                        { label: 'Observed', value: eligibleWithEvidenceCount },
                                        { label: 'Not yet observed', value: eligibleWithoutEvidenceCount },
                                    ].map((summary) => (
                                        <div key={summary.label} className="theme-card-muted rounded-xl p-4">
                                            <p className="text-xs font-semibold uppercase tracking-wide theme-muted">
                                                {summary.label}
                                            </p>
                                            <p className="mt-1 text-2xl font-semibold theme-text">
                                                {summary.value}
                                            </p>
                                        </div>
                                    ))}
                                </div>

                                <div className="flex flex-col gap-2 sm:flex-row">
                                    <Button type="button" variant="secondary" size="md" onClick={handleOpenObservations}>
                                        Open learner observations
                                    </Button>
                                    <Button
                                        type="button"
                                        size="md"
                                        onClick={openBulkEvidenceModal}
                                        disabled={page.hasBlockingAttendance || page.eligibleLearners.length === 0}
                                    >
                                        <Layers className="mr-2 h-4 w-4" />
                                        {bulkActionLabel}
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                </Card>
            </div>

            {canOfferEndSession ? (
                <Card className="theme-info-surface">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="space-y-1">
                            <h2 className="text-lg font-semibold theme-text">Close lesson record</h2>
                            <p className="text-sm theme-muted">
                                Class performance has been recorded. You can keep adding observations or return to the lesson workspace to close the lesson.
                            </p>
                        </div>
                        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap">
                            <Button type="button" variant="secondary" onClick={continueRecordingEvidence}>
                                Continue recording evidence
                            </Button>
                            <Button
                                type="button"
                                onClick={() => {
                                    void handleEndSession();
                                }}
                                disabled={completionPending}
                            >
                                {completionPending ? 'Ending…' : 'End session'}
                            </Button>
                            <Link
                                href={lessonWorkspaceHref}
                                className="theme-button-secondary theme-focus-ring inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium transition-colors"
                            >
                                Back to lesson workspace
                            </Link>
                        </div>
                    </div>
                </Card>
            ) : null}

            {page.showBulk && page.session ? (
                <BulkClassModal
                    sessionId={sessionId}
                    learningOutcomeId={learningOutcomeId}
                    learners={page.eligibleLearners}
                    observedAt={page.session.session_date}
                    onClose={page.handleBulkClose}
                />
            ) : null}
        </div>
    );
}
