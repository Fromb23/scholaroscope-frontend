'use client';

// ============================================================================
// app/(dashboard)/assessments/[id]/page.tsx
// Responsibility: render only. No logic. No transforms. No API calls.
// ============================================================================

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
    ArrowLeft, Edit, Trash2, Save,
    Calendar, BookOpen, ClipboardList,
    TrendingUp, Award, Download, CheckCircle, PlayCircle,
} from 'lucide-react';
import { Card } from '@/app/components/ui/Card';
import { Button } from '@/app/components/ui/Button';
import { Badge } from '@/app/components/ui/Badge';
import { LoadingSpinner } from '@/app/components/ui/LoadingSpinner';
import { ErrorBanner } from '@/app/components/ui/ErrorBanner';
import { StatsCard } from '@/app/components/dashboard/StatsCard';
import { ExportModal } from '@/app/components/export/ExportModal';
import { AssessmentScoreTable } from '@/app/core/components/assessments/AssessmentScoreTable';
import { AssessmentGradeDistribution } from '@/app/core/components/assessments/AssessmentGradeDistribution';
import { buildExportPayload, buildExportPresets } from '@/app/core/components/assessments/useAssessmentExport';
import {
    useAssessmentDetail,
    useAssessmentScores,
} from '@/app/core/hooks/useAssessments';
import { useAuth } from '@/app/context/AuthContext';
import {
    AssessmentStatus,
    calculateScoreStats,
} from '@/app/core/types/assessment';
import { DesktopOnly } from '@/app/core/components/DesktopOnly';

interface ScoreDraft {
    score?: number | null;
    rubric_level?: number | null;
    comments?: string;
}

export default function AssessmentDetailPage() {
    const params = useParams();
    const router = useRouter();
    const assessmentId = Number(params.id);
    const { user } = useAuth();

    const {
        assessment, loading, error,
        finalizing, deleting,
        refetch,
        activateAssessment,
        finalizeAssessment,
        deleteAssessment,
    } = useAssessmentDetail(assessmentId);

    const [searchQuery, setSearchQuery] = useState('');
    const { scores, loading: scoresLoading, bulkEntry } = useAssessmentScores({
        assessment: assessmentId,
        search: searchQuery || undefined,
    });

    const [draft, setDraft] = useState<Record<number, ScoreDraft>>({});
    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);
    const [deleteError, setDeleteError] = useState<string | null>(null);
    const [exportOpen, setExportOpen] = useState(false);

    const isFinalized = assessment?.status === AssessmentStatus.FINALIZED;
    const isDraft = assessment?.status === AssessmentStatus.DRAFT;
    const isActive = assessment?.status === AssessmentStatus.ACTIVE;

    const handleScoreChange = (
        studentId: number,
        field: keyof ScoreDraft,
        value: number | string | null
    ) => setDraft(prev => ({ ...prev, [studentId]: { ...prev[studentId], [field]: value } }));

    const handleSaveScores = async () => {
        if (!assessment) return;
        setSaving(true); setSaveError(null);
        try {
            await bulkEntry({
                assessment: assessmentId,
                scores: scores.map(s => ({
                    student_id: s.student,
                    score: assessment.evaluation_type === 'NUMERIC'
                        ? (draft[s.student]?.score ?? s.score ?? undefined) : undefined,
                    rubric_level_id: assessment.evaluation_type === 'RUBRIC'
                        ? (draft[s.student]?.rubric_level ?? s.rubric_level ?? undefined) : undefined,
                    comments: draft[s.student]?.comments ?? s.comments ?? '',
                })),
                scored_by: user?.email ?? 'system',
            });
            setDraft({});
            refetch();
        } catch (err) {
            setSaveError(err instanceof Error ? err.message : 'Failed to save scores');
        } finally { setSaving(false); }
    };

    const handleDelete = async () => {
        setDeleteError(null);
        try { await deleteAssessment(); router.push('/assessments'); }
        catch (err) { setDeleteError(err instanceof Error ? err.message : 'Failed to delete'); }
    };

    const handleActivate = async () => {
        try { await activateAssessment(); }
        catch (err) { setSaveError(err instanceof Error ? err.message : 'Failed to activate'); }
    };

    const handleFinalize = async () => {
        try { await finalizeAssessment(); }
        catch (err) { setSaveError(err instanceof Error ? err.message : 'Failed to finalize'); }
    };

    if (loading && !assessment) return <LoadingSpinner />;
    if (error) return <ErrorBanner message={error} onDismiss={() => { }} />;
    if (!assessment) return <div className="p-10 text-gray-500">Assessment not found.</div>;

    const stats = calculateScoreStats(scores);

    return (
        <div className="space-y-6">

            {/* Header */}
            <div className="space-y-3">
                {/* Back */}
                <Link href="/assessments">
                    <Button variant="ghost" size="sm">
                        <ArrowLeft className="mr-2 h-4 w-4" />Back
                    </Button>
                </Link>

                {/* Title + status badges */}
                <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                        <h1 className="text-xl font-semibold flex items-center gap-2 flex-wrap">
                            <span className="truncate">{assessment.name}</span>
                            <Badge variant="blue">{assessment.assessment_type_display}</Badge>
                            <Badge variant="purple">{assessment.evaluation_type_display}</Badge>
                        </h1>
                        <p className="text-sm text-gray-500 mt-0.5 truncate">
                            {assessment.subject_name} — {assessment.cohort_name}
                        </p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
                        {isDraft && <Badge variant="default">Draft</Badge>}
                        {isActive && <Badge variant="yellow">Active</Badge>}
                        {isFinalized && <Badge variant="green">Finalized</Badge>}
                    </div>
                </div>

                {/* Action buttons — own row */}
                <div className="flex items-center gap-2 flex-wrap">
                    {isDraft && (
                        <Button variant="secondary" size="sm" onClick={handleActivate}>
                            <PlayCircle className="h-4 w-4 mr-1.5" />Activate
                        </Button>
                    )}
                    {isActive && (
                        <Button variant="primary" size="sm" onClick={handleFinalize} disabled={finalizing}>
                            <CheckCircle className="h-4 w-4 mr-1.5" />
                            {finalizing ? 'Finalizing…' : 'Finalize'}
                        </Button>
                    )}
                    {!isFinalized && (
                        <Link href={`/assessments/${assessmentId}/edit`}>
                            <Button variant="secondary" size="sm">
                                <Edit className="h-4 w-4 mr-1.5" />Edit
                            </Button>
                        </Link>
                    )}
                    <Button variant="ghost" size="sm" onClick={handleDelete} disabled={deleting}>
                        <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                </div>
            </div>

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

            {/* Assessment info */}
            <Card>
                <div className="p-4 flex flex-col sm:flex-row sm:flex-wrap gap-3">
                    <div className="flex items-center gap-2 text-sm text-gray-700">
                        <Calendar className="h-4 w-4 text-gray-400 shrink-0" />
                        {assessment.assessment_date
                            ? new Date(assessment.assessment_date).toLocaleDateString()
                            : 'Date not set'}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-700">
                        <BookOpen className="h-4 w-4 text-gray-400 shrink-0" />
                        {assessment.term_name ?? 'Year-round'}
                    </div>
                    {assessment.total_marks && (
                        <div className="flex items-center gap-2 text-sm text-gray-700">
                            <ClipboardList className="h-4 w-4 text-gray-400 shrink-0" />
                            Total marks: {assessment.total_marks}
                        </div>
                    )}
                    {assessment.description && (
                        <p className="text-sm text-gray-600 w-full pt-3 border-t border-gray-100">
                            {assessment.description}
                        </p>
                    )}
                </div>
            </Card>

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

            {/* Score entry */}
            <Card>
                <div className="p-4">
                    <div className="flex items-center justify-between mb-4 gap-3">
                        <h2 className="text-base font-semibold text-gray-900">
                            {isFinalized ? 'Scores' : 'Enter Scores'}
                        </h2>
                        <div className="flex gap-2 shrink-0">
                            <Button variant="secondary" size="sm"
                                onClick={() => setExportOpen(true)}
                                disabled={scores.length === 0}>
                                <Download className="w-4 h-4 sm:mr-1.5" />
                                <span className="hidden sm:inline">Export</span>
                            </Button>
                            {!isFinalized && (
                                <Button size="sm" onClick={handleSaveScores} disabled={saving}>
                                    <Save className="w-4 h-4 sm:mr-1.5" />
                                    <span className="hidden sm:inline">{saving ? 'Saving…' : 'Save Scores'}</span>
                                </Button>
                            )}
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <div className="min-w-[480px]">
                            <AssessmentScoreTable
                                assessment={assessment}
                                scores={scores}
                                draft={draft}
                                loading={scoresLoading}
                                readOnly={isFinalized}
                                onScoreChange={handleScoreChange}
                                onSearch={setSearchQuery}
                            />
                        </div>
                    </div>
                </div>
            </Card>

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

            {scores.length > 0 && (
                <ExportModal
                    open={exportOpen}
                    onClose={() => setExportOpen(false)}
                    payload={buildExportPayload(assessment, scores, user?.email ?? 'System')}
                    presets={buildExportPresets(assessment)}
                    defaultFormat="excel"
                    title="Export Assessment Scores"
                />
            )}
        </div>
    );
}