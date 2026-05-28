'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { assessmentAPI } from '@/app/core/api/assessments';
import { useAssessmentDetail, useAssessmentScores } from '@/app/core/hooks/useAssessments';
import { useInstructorCohortAccess } from '@/app/core/hooks/useInstructorCohortAccess';
import { useAuth } from '@/app/context/AuthContext';
import {
    AssessmentStatus,
    calculateScoreStats,
    type AssessmentScore,
    type AssessmentScoreDraft,
    getAssessmentScoreDraftValue,
    sortAssessmentScores,
} from '@/app/core/types/assessment';

function normalizeSearchValue(value: string | number | null | undefined): string {
    return String(value ?? '').trim().toLowerCase();
}

export function useAssessmentDetailPage() {
    const params = useParams();
    const router = useRouter();
    const searchParams = useSearchParams();
    const { user, activeRole } = useAuth();
    const instructorAccess = useInstructorCohortAccess();
    const assessmentId = Number(params.id);
    const focusTarget = searchParams.get('focus');
    const requestedStudentParam = searchParams.get('student');
    const parsedStudentId = requestedStudentParam ? Number(requestedStudentParam) : NaN;
    const focusedStudentId = Number.isInteger(parsedStudentId) && parsedStudentId > 0
        ? parsedStudentId
        : null;

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

    const [draft, setDraft] = useState<Record<number, AssessmentScoreDraft>>({});
    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);
    const [deleteError, setDeleteError] = useState<string | null>(null);
    const [exportError, setExportError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [downloadingPdf, setDownloadingPdf] = useState(false);
    const seededStudentFilterRef = useRef<string | null>(null);

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
    const canExportPdf = canManageAssessment;
    const sortedScores = useMemo(() => sortAssessmentScores(scores), [scores]);
    const rubricLevelById = useMemo(() => new Map(
        (assessment?.rubric_levels ?? []).map((level) => [level.id, level])
    ), [assessment?.rubric_levels]);
    const filteredScores = useMemo(() => {
        const normalizedQuery = normalizeSearchValue(searchQuery);
        if (!normalizedQuery) {
            return sortedScores;
        }

        return sortedScores.filter((score) => {
            const scoreDraft = draft[score.student];
            const currentScore = getAssessmentScoreDraftValue(scoreDraft, 'score', score.score);
            const currentRubricLevelId = getAssessmentScoreDraftValue(
                scoreDraft,
                'rubric_level',
                score.rubric_level
            );
            const currentComments = getAssessmentScoreDraftValue(
                scoreDraft,
                'comments',
                score.comments ?? ''
            ) ?? '';
            const currentRubricLevel = currentRubricLevelId != null
                ? rubricLevelById.get(currentRubricLevelId)
                : null;
            const currentRubricCode = currentRubricLevel?.code ?? score.rubric_level_code ?? '';
            const currentRubricLabel = currentRubricLevel?.label ?? score.rubric_level_label ?? '';
            const currentPercentage = (
                currentScore != null
                && assessment?.total_marks
                && assessment.total_marks > 0
            )
                ? ((currentScore / assessment.total_marks) * 100).toFixed(2)
                : '';

            return [
                score.student_admission,
                score.student_name,
                currentScore,
                currentPercentage,
                currentRubricCode,
                currentRubricLabel,
                currentComments,
            ].some((value) => normalizeSearchValue(value).includes(normalizedQuery));
        });
    }, [assessment?.total_marks, draft, rubricLevelById, searchQuery, sortedScores]);
    const stats = useMemo(() => calculateScoreStats(sortedScores), [sortedScores]);
    const scoredBy = user?.email ?? 'system';
    const scoreEntryFocusRequest = focusTarget === 'score-entry'
        ? `${assessmentId}:${focusedStudentId ?? 'all'}`
        : null;

    useEffect(() => {
        if (!focusedStudentId || scoresLoading) {
            return;
        }

        const seedKey = `${assessmentId}:${focusedStudentId}`;
        if (seededStudentFilterRef.current === seedKey) {
            return;
        }

        seededStudentFilterRef.current = seedKey;
        const targetScore = sortedScores.find((score) => score.student === focusedStudentId);
        if (!targetScore) {
            return;
        }

        const seededQuery = targetScore.student_admission?.trim() || targetScore.student_name;
        if (!seededQuery) {
            return;
        }

        setSearchQuery((current) => current.trim() || seededQuery);
    }, [assessmentId, focusedStudentId, scoresLoading, sortedScores]);

    const handleScoreChange = (
        studentId: number,
        field: keyof AssessmentScoreDraft,
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
                scores: sortedScores.map((score: AssessmentScore) => {
                    const scoreDraft = draft[score.student];
                    const resolvedScore = getAssessmentScoreDraftValue(
                        scoreDraft,
                        'score',
                        score.score
                    );
                    const resolvedRubricLevel = getAssessmentScoreDraftValue(
                        scoreDraft,
                        'rubric_level',
                        score.rubric_level
                    );
                    const resolvedComments = getAssessmentScoreDraftValue(
                        scoreDraft,
                        'comments',
                        score.comments ?? ''
                    );

                    return {
                    student_id: score.student,
                    score: assessment.evaluation_type === 'NUMERIC'
                        ? (resolvedScore ?? undefined)
                        : undefined,
                    rubric_level_id: assessment.evaluation_type === 'RUBRIC'
                        ? (resolvedRubricLevel ?? undefined)
                        : undefined,
                    comments: resolvedComments ?? '',
                };
                }),
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

    const handleDownloadPdf = async () => {
        if (!assessmentId || !canExportPdf) {
            setExportError('Could not export the assessment PDF.');
            return;
        }

        setDownloadingPdf(true);
        setExportError(null);
        try {
            await assessmentAPI.exportPdf(assessmentId);
        } catch {
            setExportError('Could not export the assessment PDF.');
        } finally {
            setDownloadingPdf(false);
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

    return {
        assessmentId,
        assessment,
        loading,
        error,
        finalizing,
        deleting,
        scores: filteredScores,
        scoresLoading,
        draft,
        saving,
        saveError,
        deleteError,
        exportError,
        searchQuery,
        downloadingPdf,
        scoreEntryFocusRequest,
        focusedStudentId,
        visibleLearnerCount: filteredScores.length,
        totalLearnerCount: sortedScores.length,
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
    };
}
