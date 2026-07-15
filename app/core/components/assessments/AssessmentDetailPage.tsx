'use client';

// ============================================================================
// app/(dashboard)/assessments/[id]/page.tsx
// Responsibility: render only. No logic. No transforms. No API calls.
// ============================================================================

import {
    ClipboardList,
    TrendingUp,
    Award,
    CheckCircle,
    UserPlus,
    RotateCcw,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { LoadingSpinner } from '@/app/components/ui/LoadingSpinner';
import { ErrorBanner } from '@/app/components/ui/ErrorBanner';
import { Card } from '@/app/components/ui/Card';
import { StatsCard } from '@/app/components/dashboard/StatsCard';
import { StatStrip } from '@/app/components/dashboard/StatStrip';
import { useAssistantPageContext } from '@/app/core/components/assistant/useAssistantPageContext';
import { AssessmentDetailHeader } from '@/app/core/components/assessments/AssessmentDetailHeader';
import { AssessmentInfoCard } from '@/app/core/components/assessments/AssessmentInfoCard';
import { AssessmentParticipationSection } from '@/app/core/components/assessments/AssessmentParticipationSection';
import { AssessmentScoreEntryCard } from '@/app/core/components/assessments/AssessmentScoreEntryCard';
import {
    AssessmentStageActionCard,
    getAssessmentCurrentStage,
} from '@/app/core/components/assessments/AssessmentStageActionCard';
import { useAssessmentDetailPage } from '@/app/core/hooks/assessments/useAssessmentDetailPage';
import { ContextualApprovalRequestButton } from '@/app/core/components/approvals/ApprovalIntentComponents';
import { buildContextualRequestKey } from '@/app/core/lib/approvalIntents';
import { useAuth } from '@/app/context/AuthContext';
import { supportsInternalRequests } from '@/app/core/lib/workspaceGovernance';
import { isLearnerAssessmentDetail } from '@/app/core/types/assessment';

export function AssessmentDetailPage() {
    const { capabilities } = useAuth();
    const showInternalRequestActions = supportsInternalRequests(capabilities);
    const {
        assessmentId,
        assessment,
        learnerScore,
        learnerParticipation,
        loading,
        error,
        finalizing,
        reopening,
        deleting,
        scores,
        scoresLoading,
        participationSummary,
        participationRecords,
        participationByStudentId,
        participationLoaded,
        participationLoading,
        participationSaving,
        participationError,
        makeupSavingStudentId,
        draft,
        saving,
        saveError,
        saveSuccess,
        deleteError,
        exportError,
        searchQuery,
        downloadingPdf,
        focusTarget,
        scoreEntryFocusRequest,
        visibleLearnerCount,
        totalLearnerCount,
        stats,
        isFinalized,
        isDraft,
        isActive,
        canUpdate,
        canDelete,
        canActivate,
        canFinalize,
        canReopen,
        canScore,
        canExportPdf,
        setSaveError,
        setSaveSuccess,
        setDeleteError,
        setExportError,
        setSearchQuery,
        loadParticipationRoster,
        handleSaveParticipation,
        handleMarkMakeupCompleted,
        handleScoreChange,
        handleSaveScores,
        handleDownloadPdf,
        handleDelete,
        handleActivate,
        handleFinalize,
        handleReopenAssessment,
        isTrackedParticipation,
    } = useAssessmentDetailPage();
    const focusedScoreEntryRef = useRef<string | null>(null);
    const focusedStageActionRef = useRef<string | null>(null);
    const unscoredCount = Math.max(totalLearnerCount - stats.scored, 0);
    const pendingMakeupCount = participationSummary?.pending_makeup_count ?? 0;
    const scrollToScoreEntry = useCallback(() => {
        document.getElementById('assessment-score-entry')?.scrollIntoView({
            behavior: 'smooth',
            block: 'start',
        });
    }, []);
    const scrollToResultsSummary = useCallback(() => {
        document.getElementById('assessment-results-summary')?.scrollIntoView({
            behavior: 'smooth',
            block: 'start',
        });
    }, []);
    const scrollToParticipation = useCallback(() => {
        if (isTrackedParticipation && !participationLoaded && !participationLoading) {
            void loadParticipationRoster();
        }

        document.getElementById('assessment-participation')?.scrollIntoView({
            behavior: 'smooth',
            block: 'start',
        });
    }, [
        isTrackedParticipation,
        loadParticipationRoster,
        participationLoaded,
        participationLoading,
    ]);
    const currentAssessmentStage = useMemo(() => getAssessmentCurrentStage({
        isDraft,
        isActive,
        isFinalized,
        scoredCount: stats.scored,
        unscoredCount,
        canFinalize: Boolean(canFinalize),
    }), [
        canFinalize,
        isActive,
        isDraft,
        isFinalized,
        stats.scored,
        unscoredCount,
    ]);
    const primaryAssessmentActionLabel = useMemo(() => {
        if (isFinalized && canReopen) return 'Reopen assessment';
        if (isFinalized) return 'View finalized results';
        if (pendingMakeupCount > 0 && canScore) return 'Review missing learners';
        if (isActive && canScore && unscoredCount > 0) return 'Record scores';
        if (isActive && canFinalize) return 'Finalize assessment';
        if (isDraft && canActivate) return 'Prepare assessment';
        if (!isFinalized && canScore) return 'Record scores';
        return 'View results';
    }, [
        canActivate,
        canFinalize,
        canReopen,
        canScore,
        isActive,
        isDraft,
        isFinalized,
        pendingMakeupCount,
        unscoredCount,
    ]);
    const hiddenAssessmentActions = useMemo(() => ([
        canExportPdf ? 'Download PDF' : null,
        !isFinalized && canUpdate ? 'Edit assessment' : null,
        isDraft && canActivate && primaryAssessmentActionLabel !== 'Prepare assessment' ? 'Prepare assessment' : null,
        isActive && canScore && primaryAssessmentActionLabel !== 'Record scores' ? 'Record scores' : null,
        isActive && canFinalize && primaryAssessmentActionLabel !== 'Finalize assessment' ? 'Finalize assessment' : null,
        isFinalized && canReopen ? 'View finalized results' : null,
        canDelete ? 'Delete assessment' : null,
    ].filter((item): item is string => Boolean(item))), [
        canActivate,
        canDelete,
        canExportPdf,
        canFinalize,
        canReopen,
        canScore,
        canUpdate,
        isActive,
        isDraft,
        isFinalized,
        primaryAssessmentActionLabel,
    ]);
    useEffect(() => {
        if (!scoreEntryFocusRequest || loading || scoresLoading || !assessment) {
            return;
        }

        if (focusedScoreEntryRef.current === scoreEntryFocusRequest) {
            return;
        }

        focusedScoreEntryRef.current = scoreEntryFocusRequest;
        window.requestAnimationFrame(() => {
            document.getElementById('assessment-score-entry')?.scrollIntoView({
                behavior: 'smooth',
                block: 'start',
            });
        });
    }, [assessment, loading, scoreEntryFocusRequest, scoresLoading]);
    useEffect(() => {
        if (!focusTarget || focusTarget === 'score-entry' || loading || !assessment) {
            return;
        }

        if (!['finalize', 'prepare', 'review'].includes(focusTarget)) {
            return;
        }

        const focusKey = `${assessmentId}:${focusTarget}`;
        if (focusedStageActionRef.current === focusKey) {
            return;
        }

        focusedStageActionRef.current = focusKey;
        window.requestAnimationFrame(() => {
            document.getElementById('assessment-stage-action')?.scrollIntoView({
                behavior: 'smooth',
                block: 'start',
            });
        });
    }, [assessment, assessmentId, focusTarget, loading]);
    const assistantContext = useMemo(() => ({
        pageKey: 'assessment_detail',
        pageTitle: assessment?.name ?? 'Assessment Detail',
        state: {
            assessment_id: assessmentId,
            status: assessment?.status ?? null,
            is_finalized: isFinalized,
            learner_count: totalLearnerCount,
            scored_count: stats.scored,
            unscored_count: unscoredCount,
            can_grade: Boolean(canScore),
            can_finalize: Boolean(canFinalize),
            can_reopen: Boolean(canReopen),
            has_results: totalLearnerCount > 0 && stats.scored > 0,
            is_loading: loading || scoresLoading,
            current_stage: currentAssessmentStage,
            primary_next_action: primaryAssessmentActionLabel,
            hidden_secondary_actions: hiddenAssessmentActions,
            unfinished_work_count: isFinalized ? 0 : 1,
        },
        visibleActions: [
            ...(!isFinalized && canScore
                ? [{
                    label: 'Record scores',
                    type: 'page_action' as const,
                    target: 'grade_assessment_learners',
                    handler: scrollToScoreEntry,
                }]
                : []),
            ...(totalLearnerCount > 0 && stats.scored > 0
                ? [{
                    label: 'View results',
                    type: 'page_action' as const,
                    target: 'view_assessment_results',
                    handler: scrollToResultsSummary,
                }]
                : []),
            {
                label: 'Back to assessments',
                type: 'navigate' as const,
                href: '/assessments',
            },
        ],
        nextSafeAction: primaryAssessmentActionLabel === 'Record scores'
            ? {
                label: 'Record scores',
                type: 'page_action' as const,
                target: 'grade_assessment_learners',
                handler: scrollToScoreEntry,
            }
            : primaryAssessmentActionLabel === 'Review missing learners'
                ? {
                    label: 'Review missing learners',
                    type: 'page_action' as const,
                    target: 'review_missing_assessment_learners',
                    handler: scrollToParticipation,
                }
            : primaryAssessmentActionLabel === 'Finalize assessment'
                    ? {
                        label: 'Finalize assessment',
                        type: 'page_action' as const,
                        target: 'finalize_assessment',
                    }
                    : primaryAssessmentActionLabel === 'Reopen assessment'
                        ? {
                            label: 'Reopen assessment',
                            type: 'page_action' as const,
                            target: 'reopen_assessment',
                        }
                    : (totalLearnerCount > 0 && stats.scored > 0
                ? {
                    label: 'View results',
                    type: 'page_action' as const,
                    target: 'view_assessment_results',
                    handler: scrollToResultsSummary,
                }
                : {
                    label: 'Back to assessments',
                    type: 'navigate' as const,
                    href: '/assessments',
                }),
        workflowStep: `assessment_${currentAssessmentStage.toLowerCase()}`,
        emptyStateReason: !loading && !assessment
            ? 'This assessment could not be loaded.'
            : undefined,
    }), [
        assessment,
        assessmentId,
        canFinalize,
        canReopen,
        canScore,
        currentAssessmentStage,
        hiddenAssessmentActions,
        isFinalized,
        loading,
        primaryAssessmentActionLabel,
        scoresLoading,
        scrollToParticipation,
        scrollToResultsSummary,
        scrollToScoreEntry,
        stats.scored,
        totalLearnerCount,
        unscoredCount,
    ]);

    useAssistantPageContext(assistantContext);

    if (loading && !assessment) return <LoadingSpinner message="Loading assessment details..." />;
    if (error) return <ErrorBanner message={error} onDismiss={() => { }} />;
    if (!assessment) return <div className="p-10 text-gray-500">Assessment not found.</div>;

    if (isLearnerAssessmentDetail(assessment)) {
        const result = learnerScore
            ? assessment.evaluation_type === 'NUMERIC'
                ? learnerScore.score == null
                    ? 'Not scored yet'
                    : `${learnerScore.score}${assessment.total_marks ? ` / ${assessment.total_marks}` : ''}`
                : learnerScore.rubric_level_label ?? learnerScore.status_display
            : 'No result recorded';

        return (
            <div className="space-y-6">
                <AssessmentDetailHeader
                    assessment={assessment}
                    isDraft={isDraft}
                    isActive={isActive}
                    isFinalized={isFinalized}
                />

                <Card>
                    <div className="grid gap-4 p-4 sm:grid-cols-3">
                        <div>
                            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Assessment date</p>
                            <p className="mt-1 text-sm text-gray-900">
                                {assessment.assessment_date
                                    ? new Date(assessment.assessment_date).toLocaleDateString()
                                    : 'Date not set'}
                            </p>
                        </div>
                        <div>
                            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Participation</p>
                            <p className="mt-1 text-sm text-gray-900">
                                {learnerParticipation?.participation_status_display ?? 'Not recorded'}
                            </p>
                        </div>
                        <div>
                            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Your result</p>
                            <p className="mt-1 text-sm font-medium text-gray-900">{result}</p>
                        </div>
                    </div>
                </Card>

                {assessment.description ? (
                    <Card>
                        <div className="p-4">
                            <h2 className="text-sm font-semibold text-gray-900">Assessment details</h2>
                            <p className="mt-2 text-sm text-gray-600">{assessment.description}</p>
                        </div>
                    </Card>
                ) : null}

                {learnerScore?.comments ? (
                    <Card>
                        <div className="p-4">
                            <h2 className="text-sm font-semibold text-gray-900">Feedback</h2>
                            <p className="mt-2 text-sm text-gray-600">{learnerScore.comments}</p>
                        </div>
                    </Card>
                ) : null}
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <AssessmentDetailHeader
                assessment={assessment}
                isDraft={isDraft}
                isActive={isActive}
                isFinalized={isFinalized}
            />

            <div id="assessment-stage-action">
                <AssessmentStageActionCard
                    assessment={assessment}
                    assessmentId={assessmentId}
                    isDraft={isDraft}
                    isActive={isActive}
                    isFinalized={isFinalized}
                    canUpdate={Boolean(canUpdate)}
                    canDelete={Boolean(canDelete)}
                    canActivate={Boolean(canActivate)}
                    canFinalize={Boolean(canFinalize)}
                    canReopen={Boolean(canReopen)}
                    canScore={Boolean(canScore)}
                    canExportPdf={Boolean(canExportPdf)}
                    finalizing={finalizing}
                    reopening={reopening}
                    deleting={deleting}
                    downloadingPdf={downloadingPdf}
                    saving={saving}
                    scoredCount={stats.scored}
                    unscoredCount={unscoredCount}
                    pendingMakeupCount={pendingMakeupCount}
                    onActivate={handleActivate}
                    onFinalize={handleFinalize}
                    onReopen={handleReopenAssessment}
                    onDownloadPdf={handleDownloadPdf}
                    onDelete={handleDelete}
                    onRecordScores={scrollToScoreEntry}
                    onViewResults={scrollToResultsSummary}
                    onReviewMissingLearners={scrollToParticipation}
                />
            </div>

            {/* Error banners */}
            {deleteError && <ErrorBanner message={deleteError} onDismiss={() => setDeleteError(null)} />}
            {exportError && <ErrorBanner message={exportError} onDismiss={() => setExportError(null)} />}

            {/* Finalized notice */}
            {isFinalized && (
                <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-xl text-sm text-green-700">
                    <CheckCircle className="h-4 w-4 shrink-0" />
                    This assessment is finalized. Scores are locked and grades have been queued for computation.
                </div>
            )}

            {!isFinalized && !canScore && showInternalRequestActions && (
                <div className="space-y-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
                    <p>This assessment is read-only for your account.</p>
                    <div className="flex flex-wrap gap-2">
                        <ContextualApprovalRequestButton
                            intent={{
                                actionKey: 'RESOURCE_REQUEST',
                                title: `Request missing learner be added to ${assessment.name}`,
                                targetType: 'assessment',
                                targetId: assessmentId,
                                returnTo: `/assessments/${assessmentId}`,
                                requestKey: buildContextualRequestKey(['assessment', assessmentId, 'missing-learner']),
                                referenceData: {
                                    contextual_action: 'missing_learner_marking_list',
                                    assessment_id: assessmentId,
                                    assessment_name: assessment.name,
                                },
                            }}
                        >
                            <UserPlus className="h-4 w-4" />
                            Ask admin to add learner
                        </ContextualApprovalRequestButton>
                        <ContextualApprovalRequestButton
                            intent={{
                                actionKey: 'RESOURCE_REQUEST',
                                title: `Request late score entry for ${assessment.name}`,
                                targetType: 'assessment',
                                targetId: assessmentId,
                                returnTo: `/assessments/${assessmentId}`,
                                requestKey: buildContextualRequestKey(['assessment', assessmentId, 'late-score-entry']),
                                referenceData: {
                                    contextual_action: 'late_score_entry',
                                    assessment_id: assessmentId,
                                    assessment_name: assessment.name,
                                },
                            }}
                        >
                            <ClipboardList className="h-4 w-4" />
                            Ask admin for late score entry
                        </ContextualApprovalRequestButton>
                    </div>
                </div>
            )}

            {isFinalized && !canReopen && showInternalRequestActions ? (
                <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm text-blue-700">
                    <ContextualApprovalRequestButton
                        intent={{
                            actionKey: 'OTHER',
                            title: `Request reopen finalized assessment ${assessment.name}`,
                            targetType: 'assessment',
                            targetId: assessmentId,
                            returnTo: `/assessments/${assessmentId}`,
                            requestKey: buildContextualRequestKey(['assessment', assessmentId, 'reopen-finalized']),
                            referenceData: {
                                contextual_action: 'reopen_finalized_assessment',
                                assessment_id: assessmentId,
                                assessment_name: assessment.name,
                            },
                        }}
                    >
                        <RotateCcw className="h-4 w-4" />
                        Ask admin to reopen
                    </ContextualApprovalRequestButton>
                </div>
            ) : null}

            <AssessmentInfoCard assessment={assessment} />

            {isTrackedParticipation && (
                <div id="assessment-participation">
                    <AssessmentParticipationSection
                        summary={participationSummary}
                        records={participationRecords}
                        loaded={participationLoaded}
                        loading={participationLoading}
                        saving={participationSaving}
                        error={participationError}
                        makeupSavingStudentId={makeupSavingStudentId}
                        readOnly={isFinalized || !canScore}
                        onLoad={() => { void loadParticipationRoster(); }}
                        onSave={(records) => { void handleSaveParticipation(records); }}
                        onMarkMakeup={(studentId, completed) => { void handleMarkMakeupCompleted(studentId, completed); }}
                        onJumpToScoreEntry={scrollToScoreEntry}
                    />
                </div>
            )}

            {/* Stats */}
            {assessment.evaluation_type === 'NUMERIC' && (
                <StatStrip id="assessment-results-summary" mdColumns={5}>
                    <StatsCard title="Scored" value={`${stats.scored}/${stats.total}`} icon={ClipboardList} color="blue" mobile="compact" />
                    <StatsCard title="Average" value={stats.average.toFixed(1)} icon={TrendingUp} color="green" mobile="hide" />
                    <StatsCard title="Highest" value={stats.highest} icon={Award} color="yellow" mobile="hide" />
                    <StatsCard title="Lowest" value={stats.lowest} icon={TrendingUp} color="red" mobile="hide" />
                    <StatsCard title="Completion" value={`${stats.completion}%`} icon={ClipboardList} color="purple" mobile="compact" />
                </StatStrip>
            )}

            {assessment.evaluation_type !== 'NUMERIC' && (
                <div id="assessment-results-summary" />
            )}

            {isTrackedParticipation && pendingMakeupCount > 0 && !isFinalized && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
                    {pendingMakeupCount} learners missed this assessment and have not completed makeup.
                </div>
            )}

            <div id="assessment-score-entry">
                <AssessmentScoreEntryCard
                    assessment={assessment}
                    scores={scores}
                    participationByStudentId={participationByStudentId}
                    draft={draft}
                    loading={scoresLoading}
                    readOnly={isFinalized || !canScore}
                    canSave={Boolean(canScore)}
                    saving={saving}
                    saveError={saveError}
                    saveSuccess={saveSuccess}
                    searchQuery={searchQuery}
                    visibleLearnerCount={visibleLearnerCount}
                    totalLearnerCount={totalLearnerCount}
                    onSearchQueryChange={setSearchQuery}
                    onSave={handleSaveScores}
                    onScoreChange={handleScoreChange}
                    onDismissSaveError={() => setSaveError(null)}
                    onDismissSaveSuccess={() => setSaveSuccess(null)}
                />
            </div>
        </div>
    );
}
