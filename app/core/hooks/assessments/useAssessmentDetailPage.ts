'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { assessmentAPI } from '@/app/core/api/assessments';
import { resolveAssessmentError } from '@/app/core/errors';
import { useAssessmentDetail, useAssessmentScores } from '@/app/core/hooks/useAssessments';
import { useInstructorCohortAccess } from '@/app/core/hooks/useInstructorCohortAccess';
import { tracksAssessmentParticipation } from '@/app/core/lib/assessmentParticipation';
import { useAuth } from '@/app/context/AuthContext';
import {
    AssessmentParticipationRecord,
    AssessmentParticipationStatus,
    AssessmentParticipationSummary,
    AssessmentScoreStatus,
    AssessmentStatus,
    calculateScoreStats,
    hasAssessmentScoreDraftField,
    type AssessmentScore,
    type AssessmentScoreDraft,
    getAssessmentScoreDraftValue,
    isLearnerAssessmentDetail,
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
    const { activeRole, capabilities } = useAuth();
    const instructorAccess = useInstructorCohortAccess();
    const assessmentId = Number(params.id);
    const focusTarget = searchParams.get('focus');
    const requestedStudentParam = searchParams.get('student');
    const parsedStudentId = requestedStudentParam ? Number(requestedStudentParam) : NaN;
    const focusedStudentId = Number.isInteger(parsedStudentId) && parsedStudentId > 0
        ? parsedStudentId
        : null;
    const isStaffAcademicViewer = Boolean(
        instructorAccess.isTeachingActor || capabilities.can_manage_assessments
    );

    const {
        assessment,
        loading,
        error,
        finalizing,
        reopening,
        deleting,
        refetch,
        activateAssessment,
        finalizeAssessment,
        reopenAssessment,
        deleteAssessment,
    } = useAssessmentDetail(assessmentId);

    const { scores, loading: scoresLoading, bulkEntry, refetch: refetchScores } = useAssessmentScores({
        assessment: assessmentId,
        page_size: 1000,
        enabled: isStaffAcademicViewer,
    });

    const [draft, setDraft] = useState<Record<number, AssessmentScoreDraft>>({});
    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);
    const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
    const [deleteError, setDeleteError] = useState<string | null>(null);
    const [exportError, setExportError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [downloadingPdf, setDownloadingPdf] = useState(false);
    const [participationSummary, setParticipationSummary] = useState<AssessmentParticipationSummary | null>(null);
    const [participationRecords, setParticipationRecords] = useState<AssessmentParticipationRecord[]>([]);
    const [participationLoaded, setParticipationLoaded] = useState(false);
    const [participationLoading, setParticipationLoading] = useState(false);
    const [participationSaving, setParticipationSaving] = useState(false);
    const [participationError, setParticipationError] = useState<string | null>(null);
    const [makeupSavingStudentId, setMakeupSavingStudentId] = useState<number | null>(null);
    const seededStudentFilterRef = useRef<string | null>(null);

    const learnerAssessment = assessment && isLearnerAssessmentDetail(assessment)
        ? assessment
        : null;
    const staffAssessment = assessment && !isLearnerAssessmentDetail(assessment)
        ? assessment
        : null;
    const isFinalized = assessment?.status === AssessmentStatus.FINALIZED;
    const isDraft = assessment?.status === AssessmentStatus.DRAFT;
    const isActive = assessment?.status === AssessmentStatus.ACTIVE;
    const isTrackedParticipation = tracksAssessmentParticipation(assessment?.participation_mode);
    const isAdminLike = activeRole === 'ADMIN';
    const isAssignedInstructor = Boolean(
        activeRole === 'INSTRUCTOR'
        && assessment
        && instructorAccess.cohortSubjectIds.includes(assessment.cohort_subject)
    );
    const canManageAssessment = isAdminLike || isAssignedInstructor;
    const canUpdate = staffAssessment?.can_update ?? (Boolean(staffAssessment) && canManageAssessment && !isFinalized);
    const canDelete = staffAssessment?.can_delete ?? (Boolean(staffAssessment) && isAdminLike);
    const canActivate = staffAssessment?.can_activate ?? (Boolean(staffAssessment) && canManageAssessment && isDraft);
    const canFinalize = staffAssessment?.can_finalize ?? (Boolean(staffAssessment) && canManageAssessment && (isDraft || isActive));
    const canReopen = staffAssessment?.can_reopen ?? false;
    const canScore = staffAssessment?.can_score ?? (Boolean(staffAssessment) && canManageAssessment && !isFinalized);
    const canExportPdf = canManageAssessment;
    const sortedScores = useMemo(() => sortAssessmentScores(scores), [scores]);
    const participationByStudentId = useMemo(
        () => new Map(participationRecords.map((record) => [record.student, record])),
        [participationRecords]
    );
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
    const scoreEntryFocusRequest = focusTarget === 'score-entry'
        ? `${assessmentId}:${focusedStudentId ?? 'all'}`
        : null;

    useEffect(() => {
        if (!assessment) {
            setParticipationSummary(null);
            setParticipationRecords([]);
            setParticipationLoaded(false);
            setParticipationError(null);
            return;
        }

        setParticipationSummary(staffAssessment?.participation_summary ?? null);
        if (!tracksAssessmentParticipation(assessment.participation_mode)) {
            setParticipationRecords([]);
            setParticipationLoaded(false);
            setParticipationError(null);
        }
    }, [assessment, staffAssessment]);

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

    const loadParticipationRoster = useCallback(async (force = false) => {
        if (!assessmentId || !isTrackedParticipation || !canManageAssessment) {
            return;
        }
        if (!force && participationLoaded) {
            return;
        }

        setParticipationLoading(true);
        setParticipationError(null);
        try {
            const data = await assessmentAPI.getParticipationRoster(assessmentId);
            setParticipationRecords(data.records);
            setParticipationSummary(data.summary);
            setParticipationLoaded(true);
        } catch (error) {
            const appError = resolveAssessmentError(error, {
                action: 'load',
                entityLabel: 'assessment participation roster',
            });
            setParticipationError(appError.message);
        } finally {
            setParticipationLoading(false);
        }
    }, [assessmentId, canManageAssessment, isTrackedParticipation, participationLoaded]);

    useEffect(() => {
        if (
            searchParams.get('section') === 'participation'
            && isTrackedParticipation
            && !participationLoaded
            && !participationLoading
        ) {
            void loadParticipationRoster();
        }
    }, [
        isTrackedParticipation,
        loadParticipationRoster,
        participationLoaded,
        participationLoading,
        searchParams,
    ]);

    const handleSaveParticipation = async (
        records: {
            student_id: number;
            participation_status: AssessmentParticipationStatus;
        }[]
    ) => {
        if (!assessmentId) {
            return;
        }
        setParticipationSaving(true);
        setParticipationError(null);
        try {
            await assessmentAPI.markParticipation(assessmentId, { records });
            await Promise.all([
                loadParticipationRoster(true),
                refetch(),
                refetchScores(),
            ]);
        } catch (error) {
            setParticipationError(
                extractErrorMessage(error as ApiError, 'Failed to update assessment participation')
            );
        } finally {
            setParticipationSaving(false);
        }
    };

    const handleMarkMakeupCompleted = async (
        studentId: number,
        completed = true,
    ) => {
        if (!assessmentId) {
            return;
        }
        setMakeupSavingStudentId(studentId);
        setParticipationError(null);
        try {
            await assessmentAPI.markMakeupCompleted(assessmentId, {
                student_id: studentId,
                completed,
                makeup_note: completed ? 'Completed during supervised makeup.' : '',
            });
            await Promise.all([
                loadParticipationRoster(true),
                refetch(),
                refetchScores(),
            ]);
        } catch (error) {
            setParticipationError(
                extractErrorMessage(error as ApiError, 'Failed to update makeup completion')
            );
        } finally {
            setMakeupSavingStudentId(null);
        }
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
            if (
                isTrackedParticipation
                && (participationSummary?.pending_makeup_count ?? 0) > 0
            ) {
                const confirmFinalize = window.confirm(
                    `${participationSummary?.pending_makeup_count ?? 0} learners missed this assessment and have not completed makeup. Finalize them as absent?`
                );
                if (!confirmFinalize) {
                    return;
                }
                await finalizeAssessment({ finalize_unresolved_absent: true });
            } else {
                await finalizeAssessment();
            }
        } catch (error) {
            setSaveError(error instanceof Error ? error.message : 'Failed to finalize');
        }
    };

    const handleReopenAssessment = async () => {
        if (!canReopen) {
            setSaveError('You do not have permission to reopen this assessment.');
            return;
        }

        try {
            await reopenAssessment();
            await Promise.all([
                refetch(),
                refetchScores(),
                isTrackedParticipation ? loadParticipationRoster(true) : Promise.resolve(),
            ]);
        } catch (error) {
            setSaveError(extractErrorMessage(error as ApiError, 'Failed to reopen assessment'));
            throw error;
        }
    };

    return {
        assessmentId,
        assessment,
        learnerScore: learnerAssessment?.own_score ?? null,
        learnerParticipation: learnerAssessment?.own_participation ?? null,
        isLearnerAssessment: Boolean(learnerAssessment),
        isStaffAcademicViewer,
        loading,
        error,
        finalizing,
        reopening,
        deleting,
        scores: filteredScores,
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
    };
}
