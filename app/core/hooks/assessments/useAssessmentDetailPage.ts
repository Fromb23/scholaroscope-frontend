'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { assessmentAPI } from '@/app/core/api/assessments';
import { useAssessmentDetail, useAssessmentScores } from '@/app/core/hooks/useAssessments';
import { useInstructorCohortAccess } from '@/app/core/hooks/useInstructorCohortAccess';
import { useAuth } from '@/app/context/AuthContext';
import {
    AssessmentScoreStatus,
    AssessmentStatus,
    calculateScoreStats,
    hasAssessmentScoreDraftField,
    type AssessmentScore,
    type AssessmentScoreDraft,
    getAssessmentScoreDraftValue,
    sortAssessmentScores,
} from '@/app/core/types/assessment';
import { extractErrorMessage, type ApiError } from '@/app/core/types/errors';

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
    const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
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
            const currentStatus = getAssessmentScoreDraftValue(
                scoreDraft,
                'status',
                score.status
            );
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
                currentStatus,
                score.status_display,
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
        setSaveSuccess(null);
        setDraft((previous) => {
            const nextDraft = {
                ...(previous[studentId] ?? {}),
                [field]: value,
            };

            if (field === 'status') {
                const nextStatus = value as AssessmentScoreStatus | null;
                if (
                    nextStatus != null
                    && nextStatus !== AssessmentScoreStatus.PENDING_REVIEW
                ) {
                    nextDraft.score = null;
                    nextDraft.rubric_level = null;
                }
            }

            if (
                (field === 'score' || field === 'rubric_level')
                && value != null
                && hasAssessmentScoreDraftField(nextDraft, 'status')
            ) {
                delete nextDraft.status;
            }

            return {
                ...previous,
                [studentId]: nextDraft,
            };
        });
    };

    const handleSaveScores = async () => {
        if (!assessment || !canScore) {
            setSaveError('You do not have permission to save scores for this assessment.');
            return;
        }

        setSaving(true);
        setSaveError(null);
        setSaveSuccess(null);
        try {
            const nonGradedStatuses = new Set<AssessmentScoreStatus>([
                AssessmentScoreStatus.ABSENT,
                AssessmentScoreStatus.EXCUSED,
                AssessmentScoreStatus.NOT_ASSIGNED,
                AssessmentScoreStatus.NOT_ADMITTED_YET,
                AssessmentScoreStatus.LATE_ENROLLED,
            ]);
            const editedRows = sortedScores.flatMap((score: AssessmentScore) => {
                const scoreDraft = draft[score.student];
                if (!scoreDraft) {
                    return [];
                }

                const scoreWasEdited = hasAssessmentScoreDraftField(scoreDraft, 'score');
                const rubricWasEdited = hasAssessmentScoreDraftField(scoreDraft, 'rubric_level');
                const statusWasEdited = hasAssessmentScoreDraftField(scoreDraft, 'status');
                const commentsWasEdited = hasAssessmentScoreDraftField(scoreDraft, 'comments');
                const statusNoteWasEdited = hasAssessmentScoreDraftField(scoreDraft, 'status_note');
                if (
                    !scoreWasEdited
                    && !rubricWasEdited
                    && !statusWasEdited
                    && !commentsWasEdited
                    && !statusNoteWasEdited
                ) {
                    return [];
                }

                const resolvedStatus = getAssessmentScoreDraftValue(
                    scoreDraft,
                    'status',
                    score.status
                );
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

                const hasGradeForValidation = assessment.evaluation_type === 'NUMERIC'
                    ? (scoreWasEdited ? resolvedScore : score.score) != null
                    : (rubricWasEdited ? resolvedRubricLevel : score.rubric_level) != null;
                if (statusWasEdited && resolvedStatus === AssessmentScoreStatus.GRADED && !hasGradeForValidation) {
                    throw new Error(`Learner ${score.student_admission || score.student_name} needs a score or rubric level for GRADED status.`);
                }

                const row: {
                    student_id: number;
                    score?: number | null;
                    rubric_level_id?: number | null;
                    status?: AssessmentScoreStatus;
                    comments?: string;
                    status_note?: string;
                } = {
                    student_id: score.student,
                };

                if (assessment.evaluation_type === 'NUMERIC') {
                    if (scoreWasEdited) {
                        row.score = resolvedScore ?? null;
                    } else if (statusWasEdited && resolvedStatus && nonGradedStatuses.has(resolvedStatus)) {
                        row.score = null;
                    }
                } else if (assessment.evaluation_type === 'RUBRIC') {
                    if (rubricWasEdited) {
                        row.rubric_level_id = resolvedRubricLevel ?? null;
                    } else if (statusWasEdited && resolvedStatus && nonGradedStatuses.has(resolvedStatus)) {
                        row.rubric_level_id = null;
                    }
                }

                if (statusWasEdited && resolvedStatus != null) {
                    row.status = resolvedStatus;
                }
                if (commentsWasEdited) {
                    const resolvedComments = getAssessmentScoreDraftValue(
                        scoreDraft,
                        'comments',
                        score.comments ?? ''
                    );
                    row.comments = resolvedComments ?? '';
                }
                if (statusNoteWasEdited) {
                    const resolvedStatusNote = getAssessmentScoreDraftValue(
                        scoreDraft,
                        'status_note',
                        score.status_note ?? ''
                    );
                    row.status_note = resolvedStatusNote ?? '';
                }

                return [row];
            });

            if (editedRows.length === 0) {
                return;
            }

            await bulkEntry({
                assessment: assessmentId,
                scores: editedRows,
                scored_by: scoredBy,
            });
            setDraft({});
            setSaveSuccess('Scores updated successfully.');
            refetch();
        } catch (error) {
            setSaveError(extractErrorMessage(error as ApiError, 'Failed to save scores'));
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
        saveSuccess,
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
        setSaveSuccess,
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
