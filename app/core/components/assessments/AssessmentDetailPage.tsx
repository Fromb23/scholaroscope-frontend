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
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { LoadingSpinner } from '@/app/components/ui/LoadingSpinner';
import { ErrorBanner } from '@/app/components/ui/ErrorBanner';
import { StatsCard } from '@/app/components/dashboard/StatsCard';
import { useAssistantPageContext } from '@/app/core/components/assistant/useAssistantPageContext';
import { AssessmentDetailHeader } from '@/app/core/components/assessments/AssessmentDetailHeader';
import { AssessmentInfoCard } from '@/app/core/components/assessments/AssessmentInfoCard';
import { AssessmentParticipationSection } from '@/app/core/components/assessments/AssessmentParticipationSection';
import { AssessmentScoreEntryCard } from '@/app/core/components/assessments/AssessmentScoreEntryCard';
import {
    AssessmentStageActionCard,
    getAssessmentCurrentStage,
} from '@/app/core/components/assessments/AssessmentStageActionCard';
import { DesktopOnly } from '@/app/core/components/DesktopOnly';
import { useAssessmentDetailPage } from '@/app/core/hooks/assessments/useAssessmentDetailPage';

export function AssessmentDetailPage() {
    const {
        assessmentId,
        assessment,
        loading,
        error,
        finalizing,
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
        isTrackedParticipation,
    } = useAssessmentDetailPage();
    const focusedScoreEntryRef = useRef<string | null>(null);
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
        canDelete ? 'Delete assessment' : null,
    ].filter((item): item is string => Boolean(item))), [
        canActivate,
        canDelete,
        canExportPdf,
        canFinalize,
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

    return (
        <div className="space-y-6">
            <AssessmentDetailHeader
                assessment={assessment}
                isDraft={isDraft}
                isActive={isActive}
                isFinalized={isFinalized}
            />

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
                canScore={Boolean(canScore)}
                canExportPdf={Boolean(canExportPdf)}
                finalizing={finalizing}
                deleting={deleting}
                downloadingPdf={downloadingPdf}
                saving={saving}
                scoredCount={stats.scored}
                unscoredCount={unscoredCount}
                pendingMakeupCount={pendingMakeupCount}
                onActivate={handleActivate}
                onFinalize={handleFinalize}
                onDownloadPdf={handleDownloadPdf}
                onDelete={handleDelete}
                onRecordScores={scrollToScoreEntry}
                onViewResults={scrollToResultsSummary}
                onReviewMissingLearners={scrollToParticipation}
            />

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

            {!isFinalized && !canScore && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
                    This assessment is read-only for your account.
                </div>
            )}

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

            {/* Stats — desktop only */}
            {assessment.evaluation_type === 'NUMERIC' && (
                <DesktopOnly>
                    <div id="assessment-results-summary" className="grid gap-4 md:grid-cols-5">
                        <StatsCard title="Scored" value={`${stats.scored}/${stats.total}`} icon={ClipboardList} color="blue" />
                        <StatsCard title="Average" value={stats.average.toFixed(1)} icon={TrendingUp} color="green" />
                        <StatsCard title="Highest" value={stats.highest} icon={Award} color="yellow" />
                        <StatsCard title="Lowest" value={stats.lowest} icon={TrendingUp} color="red" />
                        <StatsCard title="Completion" value={`${stats.completion}%`} icon={ClipboardList} color="purple" />
                    </div>
                </DesktopOnly>
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
