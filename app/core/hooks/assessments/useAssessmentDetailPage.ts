'use client';

import { useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { buildExportPayload, buildExportPresets } from '@/app/core/components/assessments/useAssessmentExport';
import { useAssessmentDetail, useAssessmentScores } from '@/app/core/hooks/useAssessments';
import { useAuth } from '@/app/context/AuthContext';
import {
    AssessmentStatus,
    calculateScoreStats,
} from '@/app/core/types/assessment';

export interface ScoreDraft {
    score?: number | null;
    rubric_level?: number | null;
    comments?: string;
}

export function useAssessmentDetailPage() {
    const params = useParams();
    const router = useRouter();
    const { user } = useAuth();
    const assessmentId = Number(params.id);

    const {
        assessment,
        loading,
        error,
        finalizing,
        deleting,
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
    const stats = useMemo(() => calculateScoreStats(scores), [scores]);
    const scoredBy = user?.email ?? 'system';
    const exportRequestedBy = user?.email ?? 'System';

    const handleScoreChange = (
        studentId: number,
        field: keyof ScoreDraft,
        value: number | string | null
    ) => {
        setDraft((previous) => ({
            ...previous,
            [studentId]: { ...previous[studentId], [field]: value },
        }));
    };

    const handleSaveScores = async () => {
        if (!assessment) return;

        setSaving(true);
        setSaveError(null);
        try {
            await bulkEntry({
                assessment: assessmentId,
                scores: scores.map((score) => ({
                    student_id: score.student,
                    score: assessment.evaluation_type === 'NUMERIC'
                        ? (draft[score.student]?.score ?? score.score ?? undefined)
                        : undefined,
                    rubric_level_id: assessment.evaluation_type === 'RUBRIC'
                        ? (draft[score.student]?.rubric_level ?? score.rubric_level ?? undefined)
                        : undefined,
                    comments: draft[score.student]?.comments ?? score.comments ?? '',
                })),
                scored_by: scoredBy,
            });
            setDraft({});
            refetch();
        } catch (error) {
            setSaveError(error instanceof Error ? error.message : 'Failed to save scores');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        setDeleteError(null);
        try {
            await deleteAssessment();
            router.push('/assessments');
        } catch (error) {
            setDeleteError(error instanceof Error ? error.message : 'Failed to delete');
        }
    };

    const handleActivate = async () => {
        try {
            await activateAssessment();
        } catch (error) {
            setSaveError(error instanceof Error ? error.message : 'Failed to activate');
        }
    };

    const handleFinalize = async () => {
        try {
            await finalizeAssessment();
        } catch (error) {
            setSaveError(error instanceof Error ? error.message : 'Failed to finalize');
        }
    };

    const exportPayload = assessment && scores.length > 0
        ? buildExportPayload(assessment, scores, exportRequestedBy)
        : null;
    const exportPresets = assessment ? buildExportPresets(assessment) : undefined;

    return {
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
    };
}
