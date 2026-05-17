'use client';

import { useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { buildExportPayload, buildExportPresets } from '@/app/core/components/assessments/useAssessmentExport';
import { useAssessmentDetail, useAssessmentScores } from '@/app/core/hooks/useAssessments';
import { useInstructorCohortAccess } from '@/app/core/hooks/useInstructorCohortAccess';
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
    const { user, activeRole } = useAuth();
    const instructorAccess = useInstructorCohortAccess();
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

    const { scores, loading: scoresLoading, bulkEntry } = useAssessmentScores({
        assessment: assessmentId,
        page_size: 1000,
    });

    const [draft, setDraft] = useState<Record<number, ScoreDraft>>({});
    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);
    const [deleteError, setDeleteError] = useState<string | null>(null);
    const [exportOpen, setExportOpen] = useState(false);

    const isFinalized = assessment?.status === AssessmentStatus.FINALIZED;
    const isDraft = assessment?.status === AssessmentStatus.DRAFT;
    const isActive = assessment?.status === AssessmentStatus.ACTIVE;
    const isAdminLike = Boolean(user?.is_superadmin) || activeRole === 'ADMIN';
    const isAssignedInstructor = Boolean(
        activeRole === 'INSTRUCTOR'
        && assessment
        && instructorAccess.cohortSubjectIds.includes(assessment.cohort_subject)
    );
    const canManageAssessment = isAdminLike || isAssignedInstructor;
    const canUpdate = assessment?.can_update ?? (Boolean(assessment) && canManageAssessment && !isFinalized);
    const canDelete = assessment?.can_delete ?? (Boolean(assessment) && isAdminLike);
    const canActivate = assessment?.can_activate ?? (Boolean(assessment) && canManageAssessment && isDraft);
    const canFinalize = assessment?.can_finalize ?? (Boolean(assessment) && canManageAssessment && (isDraft || isActive));
    const canScore = assessment?.can_score ?? (Boolean(assessment) && canManageAssessment && !isFinalized);
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
        if (!assessment || !canScore) {
            setSaveError('You do not have permission to save scores for this assessment.');
            return;
        }

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
        if (!canDelete) {
            setDeleteError('You do not have permission to delete this assessment.');
            return;
        }
        setDeleteError(null);
        try {
            await deleteAssessment();
            router.push('/assessments');
        } catch (error) {
            setDeleteError(error instanceof Error ? error.message : 'Failed to delete');
        }
    };

    const handleActivate = async () => {
        if (!canActivate) {
            setSaveError('You do not have permission to activate this assessment.');
            return;
        }
        try {
            await activateAssessment();
        } catch (error) {
            setSaveError(error instanceof Error ? error.message : 'Failed to activate');
        }
    };

    const handleFinalize = async () => {
        if (!canFinalize) {
            setSaveError('You do not have permission to finalize this assessment.');
            return;
        }
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
        canUpdate,
        canDelete,
        canActivate,
        canFinalize,
        canScore,
        setExportOpen,
        setSaveError,
        setDeleteError,
        handleScoreChange,
        handleSaveScores,
        handleDelete,
        handleActivate,
        handleFinalize,
    };
}
