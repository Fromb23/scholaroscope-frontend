'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { DataTable } from '@/app/components/ui/Table';
import type { Column } from '@/app/components/ui/Table';
import { isSafeNextPath } from '@/app/core/auth/navigation';
import { buildLearnerAssessmentReportHref } from '@/app/core/lib/learnerReportingRoutes';
import { ContextualApprovalRequestButton } from '@/app/core/components/approvals/ApprovalIntentComponents';
import { buildContextualRequestKey } from '@/app/core/lib/approvalIntents';
import {
    AssessmentScore,
    AssessmentDetail,
    AssessmentParticipationRecord,
    AssessmentScoreStatus,
    type AssessmentScoreDraft,
    getAssessmentScoreDraftValue,
} from '@/app/core/types/assessment';

interface Props {
    assessment: AssessmentDetail;
    scores: AssessmentScore[];
    draft: Record<number, AssessmentScoreDraft>;
    loading: boolean;
    readOnly: boolean;
    participationByStudentId?: Map<number, AssessmentParticipationRecord>;
    onScoreChange: (studentId: number, field: keyof AssessmentScoreDraft, value: number | string | null) => void;
}

const fieldClasses = 'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-500';
const sectionLabelClasses = 'text-xs font-medium uppercase tracking-wide text-gray-500';

const STATUS_LABELS: Record<AssessmentScoreStatus, string> = {
    [AssessmentScoreStatus.PENDING_REVIEW]: 'Needs review',
    [AssessmentScoreStatus.GRADED]: 'Graded',
    [AssessmentScoreStatus.ABSENT]: 'Absent',
    [AssessmentScoreStatus.EXCUSED]: 'Excused',
    [AssessmentScoreStatus.NOT_ASSIGNED]: 'Not assigned',
    [AssessmentScoreStatus.NOT_ADMITTED_YET]: 'Not admitted yet',
    [AssessmentScoreStatus.LATE_ENROLLED]: 'Joined after assessment',
    [AssessmentScoreStatus.NOT_ENROLLED_IN_SUBJECT]: 'Not enrolled in subject',
};

const STATUS_OPTIONS = [
    { value: AssessmentScoreStatus.PENDING_REVIEW, label: STATUS_LABELS.PENDING_REVIEW },
    { value: AssessmentScoreStatus.ABSENT, label: STATUS_LABELS.ABSENT },
    { value: AssessmentScoreStatus.EXCUSED, label: STATUS_LABELS.EXCUSED },
    { value: AssessmentScoreStatus.LATE_ENROLLED, label: STATUS_LABELS.LATE_ENROLLED },
    { value: AssessmentScoreStatus.NOT_ENROLLED_IN_SUBJECT, label: STATUS_LABELS.NOT_ENROLLED_IN_SUBJECT },
    { value: AssessmentScoreStatus.NOT_ASSIGNED, label: STATUS_LABELS.NOT_ASSIGNED },
    { value: AssessmentScoreStatus.NOT_ADMITTED_YET, label: STATUS_LABELS.NOT_ADMITTED_YET },
];

export function AssessmentScoreTable({
    assessment, scores, draft, loading, readOnly, participationByStudentId, onScoreChange,
}: Props) {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const returnTo = useMemo(() => {
        const query = searchParams.toString();
        const candidate = query ? `${pathname}?${query}` : pathname;
        return isSafeNextPath(candidate) ? candidate : `/assessments/${assessment.id}`;
    }, [assessment.id, pathname, searchParams]);

    const buildLearnerHref = (learnerId: number) => buildLearnerAssessmentReportHref(
        learnerId,
        {
            cohortSubjectId: assessment.cohort_subject,
            termId: assessment.term,
            subjectId: assessment.subject_id,
            cohortId: assessment.cohort_id,
            returnTo,
        },
    );

    const resolveRowValues = (row: AssessmentScore) => {
        const scoreDraft = draft[row.student];
        const currentScore = getAssessmentScoreDraftValue(scoreDraft, 'score', row.score);
        const currentRubricLevel = getAssessmentScoreDraftValue(
            scoreDraft,
            'rubric_level',
            row.rubric_level
        );
        const currentStatus = getAssessmentScoreDraftValue(
            scoreDraft,
            'status',
            row.status
        ) ?? AssessmentScoreStatus.PENDING_REVIEW;
        const hasRecordedGrade = currentScore != null || currentRubricLevel != null;

        return {
            currentScore,
            currentRubricLevel,
            currentStatus,
            hasRecordedGrade,
        };
    };

    const renderNumericScoreInput = (row: AssessmentScore, stacked = false) => {
        const { currentScore: current } = resolveRowValues(row);
        const percentage = (
            current != null
            && assessment.total_marks
            && assessment.total_marks > 0
        )
            ? ((current / assessment.total_marks) * 100).toFixed(1)
            : null;

        return (
            <div className={stacked ? 'space-y-2' : 'flex items-center gap-2'}>
                <input
                    type="number"
                    min={0}
                    max={assessment.total_marks ?? 100}
                    step={0.5}
                    value={current ?? ''}
                    disabled={readOnly}
                    onChange={(event) => onScoreChange(
                        row.student,
                        'score',
                        event.target.value ? parseFloat(event.target.value) : null
                    )}
                    placeholder="Score"
                    className={`${fieldClasses} ${stacked ? '' : 'max-w-[8rem]'}`}
                />
                {percentage !== null && (
                    <span className="text-xs text-gray-500">
                        {percentage}%
                    </span>
                )}
            </div>
        );
    };

    const renderRubricLevelSelect = (row: AssessmentScore) => (
        <select
            value={(resolveRowValues(row).currentRubricLevel)?.toString() ?? ''}
            disabled={readOnly}
            onChange={(event) => onScoreChange(
                row.student,
                'rubric_level',
                event.target.value ? Number(event.target.value) : null
            )}
            className={fieldClasses}
        >
            <option value="">Select level</option>
            {(assessment.rubric_levels ?? []).map((level) => (
                <option key={level.id} value={level.id}>
                    {`${level.label} - ${level.code}`}
                </option>
            ))}
        </select>
    );

    const renderCommentsInput = (row: AssessmentScore) => (
        <input
            type="text"
            value={getAssessmentScoreDraftValue(draft[row.student], 'comments', row.comments ?? '') ?? ''}
            disabled={readOnly}
            onChange={(event) => onScoreChange(row.student, 'comments', event.target.value)}
            className={fieldClasses}
            placeholder="Add notes"
        />
    );

    const renderStatusSelect = (row: AssessmentScore) => {
        const { currentStatus, hasRecordedGrade } = resolveRowValues(row);
        const statusLabel = STATUS_LABELS[currentStatus] ?? row.status_display ?? 'Needs review';
        const participationRecord = participationByStudentId?.get(row.student);

        if (assessment.participation_mode === 'TRACKED') {
            if (hasRecordedGrade) {
                return (
                    <span className="inline-flex rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-700">
                        {STATUS_LABELS.GRADED}
                    </span>
                );
            }

            if (currentStatus === AssessmentScoreStatus.ABSENT) {
                return (
                    <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                        {statusLabel}
                    </span>
                );
            }

            return (
                <span className={[
                    'inline-flex rounded-full px-2.5 py-1 text-xs font-medium',
                    participationRecord?.makeup_completed_at
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-amber-100 text-amber-700',
                ].join(' ')}>
                    {participationRecord?.makeup_completed_at ? 'Makeup completed' : 'Ready for grading'}
                </span>
            );
        }

        if (hasRecordedGrade) {
            return (
                <span className="inline-flex rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-700">
                    {STATUS_LABELS.GRADED}
                </span>
            );
        }

        if (readOnly) {
            return (
                <span className={[
                    'inline-flex rounded-full px-2.5 py-1 text-xs font-medium',
                    currentStatus === AssessmentScoreStatus.PENDING_REVIEW
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-slate-100 text-slate-700',
                ].join(' ')}>
                    {statusLabel}
                </span>
            );
        }

        return (
            <select
                value={currentStatus}
                onChange={(event) => onScoreChange(
                    row.student,
                    'status',
                    event.target.value as AssessmentScoreStatus
                )}
                className={fieldClasses}
            >
                {STATUS_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                        {option.label}
                    </option>
                ))}
            </select>
        );
    };

    const columns: Column<AssessmentScore>[] = [
        {
            key: 'student_name', header: 'Student', sortable: true,
            render: row => (
                <div>
                    <Link href={buildLearnerHref(row.student)}
                        className="font-medium text-blue-600 hover:underline">
                        {row.student_name}
                    </Link>
                    {participationByStudentId?.get(row.student)?.makeup_completed_at ? (
                        <div className="mt-1">
                            <span className="inline-flex rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                                Makeup completed
                            </span>
                        </div>
                    ) : null}
                </div>
            ),
        },
        {
            key: 'student_admission', header: 'Admission No.', sortable: true,
            render: row => <span className="text-gray-600">{row.student_admission}</span>,
        },
        {
            key: 'status',
            header: 'Status',
            render: row => renderStatusSelect(row),
        },
    ];

    if (assessment.evaluation_type === 'NUMERIC') {
        columns.push({
            key: 'score', header: `Score (out of ${assessment.total_marks})`, sortable: true,
            render: row => renderNumericScoreInput(row),
        });
    }

    if (assessment.evaluation_type === 'RUBRIC') {
        columns.push({
            key: 'rubric_level', header: 'Rubric Level',
            render: row => renderRubricLevelSelect(row),
        });
    }

    columns.push({
        key: 'comments', header: 'Comments',
        render: row => renderCommentsInput(row),
    });

    if (readOnly) {
        columns.push({
            key: 'id',
            header: 'Requests',
            render: row => (
                <ContextualApprovalRequestButton
                    variant="ghost"
                    intent={{
                        actionKey: 'RESOURCE_REQUEST',
                        title: `Request score correction for ${row.student_name}`,
                        targetType: 'assessment_score',
                        targetId: row.id || row.student,
                        returnTo,
                        requestKey: buildContextualRequestKey(['assessment', assessment.id, 'score', row.id || row.student, 'correction']),
                        referenceData: {
                            contextual_action: 'wrong_score_correction',
                            assessment_id: assessment.id,
                            score_id: row.id,
                            student_id: row.student,
                            student_name: row.student_name,
                            current_score: row.score,
                            current_rubric_level: row.rubric_level,
                        },
                    }}
                >
                    Request correction
                </ContextualApprovalRequestButton>
            ),
        });
    }

    return (
        <div className="space-y-4">
            <div className="space-y-3 md:hidden">
                {loading && scores.length === 0 ? (
                    <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-8 text-center">
                        <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
                        <p className="mt-3 text-sm text-gray-500">Loading scores...</p>
                    </div>
                ) : scores.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-4 py-8 text-center text-sm text-gray-500">
                        {assessment.participation_mode === 'TRACKED'
                            ? 'No learners are ready for grading yet'
                            : 'No students enrolled in this assessment'}
                    </div>
                ) : (
                    scores.map((row) => (
                        <div
                            key={row.id || row.student}
                            className="rounded-lg border border-gray-200 bg-white p-4"
                        >
                            <div>
                                <Link
                                    href={buildLearnerHref(row.student)}
                                    className="font-medium text-blue-600 hover:underline"
                                >
                                    {row.student_name}
                                </Link>
                                <p className="mt-1 text-sm text-gray-500">
                                    Admission No. {row.student_admission || '—'}
                                </p>
                                {participationByStudentId?.get(row.student)?.makeup_completed_at ? (
                                    <div className="mt-2">
                                        <span className="inline-flex rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                                            Makeup completed
                                        </span>
                                    </div>
                                ) : null}
                            </div>

                            <div className="mt-4 space-y-4">
                                {assessment.evaluation_type === 'NUMERIC' && (
                                    <div className="space-y-1.5">
                                        <p className={sectionLabelClasses}>Score</p>
                                        {renderNumericScoreInput(row, true)}
                                    </div>
                                )}

                                {assessment.evaluation_type === 'RUBRIC' && (
                                    <div className="space-y-1.5">
                                        <p className={sectionLabelClasses}>Rubric Level</p>
                                        {renderRubricLevelSelect(row)}
                                    </div>
                                )}

                                <div className="space-y-1.5">
                                    <p className={sectionLabelClasses}>Status</p>
                                    {renderStatusSelect(row)}
                                </div>

                                <div className="space-y-1.5">
                                    <p className={sectionLabelClasses}>Comments</p>
                                    {renderCommentsInput(row)}
                                </div>

                                {readOnly ? (
                                    <ContextualApprovalRequestButton
                                        intent={{
                                            actionKey: 'RESOURCE_REQUEST',
                                            title: `Request score correction for ${row.student_name}`,
                                            targetType: 'assessment_score',
                                            targetId: row.id || row.student,
                                            returnTo,
                                            requestKey: buildContextualRequestKey(['assessment', assessment.id, 'score', row.id || row.student, 'correction']),
                                            referenceData: {
                                                contextual_action: 'wrong_score_correction',
                                                assessment_id: assessment.id,
                                                score_id: row.id,
                                                student_id: row.student,
                                                student_name: row.student_name,
                                                current_score: row.score,
                                                current_rubric_level: row.rubric_level,
                                            },
                                        }}
                                    >
                                        Request correction
                                    </ContextualApprovalRequestButton>
                                ) : null}
                            </div>
                        </div>
                    ))
                )}
            </div>

            <div className="hidden overflow-x-auto md:block">
                <div className="min-w-[760px]">
                    <DataTable
                        data={scores as (AssessmentScore & Record<string, unknown>)[]}
                        columns={columns}
                        loading={loading}
                        loadingMessage="Loading assessment score entries..."
                        loadingVariant="skeleton"
                        enableSearch={false}
                        enableSort={false}
                        emptyMessage={
                            assessment.participation_mode === 'TRACKED'
                                ? 'No learners are ready for grading yet'
                                : 'No students enrolled in this assessment'
                        }
                    />
                </div>
            </div>
        </div>
    );
}
