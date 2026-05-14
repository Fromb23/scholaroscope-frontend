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
import { Card } from '@/app/components/ui/Card';
import { LoadingSpinner } from '@/app/components/ui/LoadingSpinner';
import { ErrorBanner } from '@/app/components/ui/ErrorBanner';
import { StatsCard } from '@/app/components/dashboard/StatsCard';
import { ExportModal } from '@/app/components/export/ExportModal';
import { AssessmentDetailHeader } from '@/app/core/components/assessments/AssessmentDetailHeader';
import { AssessmentInfoCard } from '@/app/core/components/assessments/AssessmentInfoCard';
import { AssessmentScoreEntryCard } from '@/app/core/components/assessments/AssessmentScoreEntryCard';
import { AssessmentGradeDistribution } from '@/app/core/components/assessments/AssessmentGradeDistribution';
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
        exportOpen,
        exportPayload,
        exportPresets,
        stats,
        isFinalized,
        isDraft,
        isActive,
        setExportOpen,
        setSearchQuery,
        setSaveError,
        setDeleteError,
        handleScoreChange,
        handleSaveScores,
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
                finalizing={finalizing}
                deleting={deleting}
                onActivate={handleActivate}
                onFinalize={handleFinalize}
                onDelete={handleDelete}
            />

            {/* Error banners */}
            {saveError && <ErrorBanner message={saveError} onDismiss={() => setSaveError(null)} />}
            {deleteError && <ErrorBanner message={deleteError} onDismiss={() => setDeleteError(null)} />}

            {/* Finalized notice */}
            {isFinalized && (
                <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-xl text-sm text-green-700">
                    <CheckCircle className="h-4 w-4 shrink-0" />
                    This assessment is finalized. Scores are locked and grades have been queued for computation.
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
                readOnly={isFinalized}
                saving={saving}
                onExport={() => setExportOpen(true)}
                onSave={handleSaveScores}
                onScoreChange={handleScoreChange}
                onSearch={setSearchQuery}
            />

            {/* Grade distribution */}
            {assessment.evaluation_type === 'NUMERIC' && scores.length > 0 && (
                <Card>
                    <div className="p-4">
                        <h2 className="text-base font-semibold text-gray-900 mb-4">Grade Distribution</h2>
                        <AssessmentGradeDistribution
                            scores={scores}
                            totalMarks={assessment.total_marks ?? 100}
                        />
                    </div>
                </Card>
            )}

            {exportPayload && (
                <ExportModal
                    open={exportOpen}
                    onClose={() => setExportOpen(false)}
                    payload={exportPayload}
                    presets={exportPresets}
                    defaultFormat="excel"
                    title="Export Assessment Scores"
                />
            )}
        </div>
    );
}
