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
import { LoadingSpinner } from '@/app/components/ui/LoadingSpinner';
import { ErrorBanner } from '@/app/components/ui/ErrorBanner';
import { StatsCard } from '@/app/components/dashboard/StatsCard';
import { AssessmentDetailHeader } from '@/app/core/components/assessments/AssessmentDetailHeader';
import { AssessmentInfoCard } from '@/app/core/components/assessments/AssessmentInfoCard';
import { AssessmentScoreEntryCard } from '@/app/core/components/assessments/AssessmentScoreEntryCard';
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
        draft,
        saving,
        saveError,
        deleteError,
        exportError,
        searchQuery,
        downloadingPdf,
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
        setDeleteError,
        setExportError,
        setSearchQuery,
        handleScoreChange,
        handleSaveScores,
        handleDownloadPdf,
        handleDelete,
        handleActivate,
        handleFinalize,
    } = useAssessmentDetailPage();

    if (loading && !assessment) return <LoadingSpinner />;
    if (error) return <ErrorBanner message={error} onDismiss={() => { }} />;
    if (!assessment) return <div className="p-10 text-gray-500">Assessment not found.</div>;

    return (
        <div className="space-y-6">
            <AssessmentDetailHeader
                assessment={assessment}
                assessmentId={assessmentId}
                isDraft={isDraft}
                isActive={isActive}
                isFinalized={isFinalized}
                canUpdate={Boolean(canUpdate)}
                canDelete={Boolean(canDelete)}
                canActivate={Boolean(canActivate)}
                canFinalize={Boolean(canFinalize)}
                canExportPdf={Boolean(canExportPdf)}
                finalizing={finalizing}
                deleting={deleting}
                downloadingPdf={downloadingPdf}
                onActivate={handleActivate}
                onFinalize={handleFinalize}
                onDownloadPdf={handleDownloadPdf}
                onDelete={handleDelete}
            />

            {/* Error banners */}
            {saveError && <ErrorBanner message={saveError} onDismiss={() => setSaveError(null)} />}
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

            {/* Stats — desktop only */}
            {assessment.evaluation_type === 'NUMERIC' && (
                <DesktopOnly>
                    <div className="grid gap-4 md:grid-cols-5">
                        <StatsCard title="Scored" value={`${stats.scored}/${stats.total}`} icon={ClipboardList} color="blue" />
                        <StatsCard title="Average" value={stats.average.toFixed(1)} icon={TrendingUp} color="green" />
                        <StatsCard title="Highest" value={stats.highest} icon={Award} color="yellow" />
                        <StatsCard title="Lowest" value={stats.lowest} icon={TrendingUp} color="red" />
                        <StatsCard title="Completion" value={`${stats.completion}%`} icon={ClipboardList} color="purple" />
                    </div>
                </DesktopOnly>
            )}

            <AssessmentScoreEntryCard
                assessment={assessment}
                scores={scores}
                draft={draft}
                loading={scoresLoading}
                readOnly={isFinalized || !canScore}
                canSave={Boolean(canScore)}
                saving={saving}
                searchQuery={searchQuery}
                visibleLearnerCount={visibleLearnerCount}
                totalLearnerCount={totalLearnerCount}
                onSearchQueryChange={setSearchQuery}
                onSave={handleSaveScores}
                onScoreChange={handleScoreChange}
            />
        </div>
    );
}
