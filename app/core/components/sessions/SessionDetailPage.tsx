'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
    AlertCircle,
    ArrowLeft,
    BookOpen,
    Calendar,
    CheckCircle2,
    ClipboardCheck,
    Clock,
    Edit,
    FileText,
    Layers,
    MapPin,
    PlayCircle,
    Target,
} from 'lucide-react';
import { Card } from '@/app/components/ui/Card';
import { Button } from '@/app/components/ui/Button';
import { Badge } from '@/app/components/ui/Badge';
import { LoadingSpinner } from '@/app/components/ui/LoadingSpinner';
import { AttendanceStatsStrip } from '@/app/core/components/sessions/AttendanceStats';
import { AttendanceTable } from '@/app/core/components/sessions/AttendanceTable';
import { ParticipatingCohorts } from '@/app/core/components/sessions/ParticipatingCohorts';
import { useSessionDetail, useSessionCohorts } from '@/app/core/hooks/useSessions';
import { useAttendanceDraft } from '@/app/core/hooks/useAttendanceDraft';
import { getCurriculumTypeLabel } from '@/app/core/lib/curriculumBridge';
import { getSessionTeachingWorkflow } from '@/app/core/registry/pluginRoutes';
import { calcAttendanceStats } from '@/app/utils/sessionUtils';

type TaughtStatus = 'TAUGHT' | 'PARTIALLY_TAUGHT' | 'NOT_TAUGHT';

const TAUGHT_STATUS_OPTIONS: Array<{
    value: TaughtStatus;
    label: string;
    description: string;
}> = [
    { value: 'TAUGHT', label: 'Taught', description: 'Fully covered in class' },
    { value: 'PARTIALLY_TAUGHT', label: 'Partially taught', description: 'Started but not fully covered' },
    { value: 'NOT_TAUGHT', label: 'Not taught', description: 'Planned but not covered' },
];

function formatSessionDate(sessionDate: string) {
    return new Date(sessionDate).toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    });
}

function formatTimeLabel(value: string | null) {
    if (!value) {
        return 'Not set';
    }

    const [hours = '0', minutes = '0'] = value.split(':');
    const formatted = new Date();
    formatted.setHours(Number(hours), Number(minutes), 0, 0);

    return formatted.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
    });
}

function formatStartAvailableAt(value: string | null) {
    if (!value) {
        return null;
    }

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
        return null;
    }

    return parsed.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
    });
}

function statusBadgeVariant(status: TaughtStatus) {
    if (status === 'TAUGHT') return 'green';
    if (status === 'PARTIALLY_TAUGHT') return 'yellow';
    return 'default';
}

export function SessionDetailPage() {
    const params = useParams();
    const sessionId = Number(params.id);

    const [searchQuery, setSearchQuery] = useState('');
    const [workflowError, setWorkflowError] = useState<string | null>(null);
    const [workflowSuccess, setWorkflowSuccess] = useState<string | null>(null);
    const [confirmingTaughtOutcomes, setConfirmingTaughtOutcomes] = useState(false);
    const [taughtSelections, setTaughtSelections] = useState<Record<number, TaughtStatus | ''>>({});
    const {
        session,
        attendanceRecords,
        pagination,
        loading,
        markAttendance,
        refetch,
        startSession,
        completeSession,
        confirmTaughtOutcomes,
    } = useSessionDetail(sessionId, searchQuery);

    const { activeCohorts, historicalCohorts } = useSessionCohorts(sessionId);

    const isHistorical = session ? !session.is_current_year : false;
    const sessionStatus = session?.status ?? 'SCHEDULED';
    const isCompleted = sessionStatus === 'COMPLETED';
    const isInProgress = sessionStatus === 'IN_PROGRESS';
    const isScheduled = sessionStatus === 'SCHEDULED';
    const isReadOnly = isHistorical || isCompleted;
    const teachingWorkflow = getSessionTeachingWorkflow(session);
    const curriculumLabel = session?.curriculum_name || getCurriculumTypeLabel(session?.curriculum_type) || 'General';
    const isMerged = useMemo(
        () => (activeCohorts?.length ?? 0) + (historicalCohorts?.length ?? 0) > 1,
        [activeCohorts, historicalCohorts]
    );

    const attendanceStats = useMemo(
        () => calcAttendanceStats(attendanceRecords),
        [attendanceRecords]
    );

    const hasMarkedAttendance = useMemo(
        () => attendanceRecords.some((record) => record.status !== null),
        [attendanceRecords]
    );

    const hasLessonPlan = Boolean(session?.lesson_plan_id);
    const confirmedTaughtOutcomes = session?.taught_outcomes ?? [];
    const taughtOutcomeCount = confirmedTaughtOutcomes.filter(
        (outcome) => outcome.status === 'TAUGHT' || outcome.status === 'PARTIALLY_TAUGHT'
    ).length;
    const canRecordEvidence = Boolean(
        teachingWorkflow &&
        hasMarkedAttendance &&
        confirmedTaughtOutcomes.length > 0 &&
        taughtOutcomeCount > 0
    );
    const startAvailableAtLabel = formatStartAvailableAt(session?.start_available_at ?? null);

    useEffect(() => {
        if (!session) {
            return;
        }

        const nextSelections: Record<number, TaughtStatus | ''> = {};
        const confirmedStatusByOutcomeId = new Map(
            session.taught_outcomes.map((outcome) => [outcome.outcome_id, outcome.status ?? ''])
        );

        session.planned_outcomes.forEach((outcome) => {
            nextSelections[outcome.outcome_id] = (confirmedStatusByOutcomeId.get(outcome.outcome_id) ?? '') as TaughtStatus | '';
        });

        setTaughtSelections(nextSelections);
    }, [session]);

    const {
        draft,
        saving,
        saveError,
        dismissError,
        updateStatus,
        updateNotes,
        markAll,
        save,
    } = useAttendanceDraft({
        records: attendanceRecords,
        onSave: markAttendance,
        readOnly: isHistorical,
    });

    const workflowSteps = useMemo(() => ([
        {
            title: 'Take attendance',
            icon: ClipboardCheck,
            complete: hasMarkedAttendance,
            description: hasMarkedAttendance
                ? `${attendanceStats.total - attendanceStats.unmarked}/${attendanceStats.total} learners marked.`
                : 'Take attendance first.',
        },
        {
            title: 'Confirm what was taught',
            icon: Target,
            complete: confirmedTaughtOutcomes.length > 0,
            description: confirmedTaughtOutcomes.length > 0
                ? `${confirmedTaughtOutcomes.length} planned outcome${confirmedTaughtOutcomes.length === 1 ? '' : 's'} confirmed.`
                : 'Use the lesson plan outcomes.',
        },
        {
            title: 'Record evidence',
            icon: FileText,
            complete: taughtOutcomeCount > 0,
            description: taughtOutcomeCount > 0
                ? `${taughtOutcomeCount} taught outcome${taughtOutcomeCount === 1 ? '' : 's'} ready for evidence.`
                : 'Evidence opens after taught outcomes are confirmed.',
        },
        {
            title: 'Complete lesson',
            icon: CheckCircle2,
            complete: isCompleted,
            description: isCompleted ? 'Lesson completed.' : 'Finish after class records are updated.',
        },
    ]), [
        attendanceStats.total,
        attendanceStats.unmarked,
        confirmedTaughtOutcomes.length,
        hasMarkedAttendance,
        isCompleted,
        taughtOutcomeCount,
    ]);

    const scrollToAttendance = () => {
        document.getElementById('attendance-section')?.scrollIntoView({
            behavior: 'smooth',
            block: 'start',
        });
    };

    const handleStartLesson = async () => {
        try {
            setWorkflowError(null);
            setWorkflowSuccess(null);
            await startSession();
            setWorkflowSuccess('Lesson started.');
        } catch (error) {
            setWorkflowError(error instanceof Error ? error.message : 'We could not start this lesson.');
        }
    };

    const handleCompleteLesson = async () => {
        try {
            setWorkflowError(null);
            setWorkflowSuccess(null);
            await completeSession();
            setWorkflowSuccess('Lesson completed.');
        } catch (error) {
            setWorkflowError(error instanceof Error ? error.message : 'We could not complete this lesson.');
        }
    };

    const handleConfirmWhatWasTaught = async () => {
        if (!session) {
            return;
        }

        const missingOutcomes = session.planned_outcomes.filter(
            (outcome) => !taughtSelections[outcome.outcome_id]
        );
        if (missingOutcomes.length > 0) {
            setWorkflowError('Confirm every planned outcome before continuing.');
            return;
        }

        try {
            setConfirmingTaughtOutcomes(true);
            setWorkflowError(null);
            setWorkflowSuccess(null);
            await confirmTaughtOutcomes({
                outcomes: session.planned_outcomes.map((outcome) => ({
                    outcome_id: outcome.outcome_id,
                    status: taughtSelections[outcome.outcome_id] as TaughtStatus,
                })),
            });
            setWorkflowSuccess('What was taught has been confirmed.');
        } catch (error) {
            setWorkflowError(error instanceof Error ? error.message : 'We could not confirm what was taught.');
        } finally {
            setConfirmingTaughtOutcomes(false);
        }
    };

    if (loading && !session) {
        return <LoadingSpinner />;
    }

    if (!session) {
        return <div className="p-10 text-gray-500">Lesson not found.</div>;
    }

    return (
        <div className="space-y-6">
            <div className="space-y-3">
                <Link href="/sessions">
                    <Button variant="ghost" size="sm">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back
                    </Button>
                </Link>

                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                        <h1 className="flex flex-wrap items-center gap-2 text-xl font-semibold">
                            <span className="truncate">{session.title || session.subject_name}</span>
                            {isMerged ? (
                                <Badge variant="purple">
                                    <Layers className="mr-1 h-3 w-3" />
                                    Multi-cohort
                                </Badge>
                            ) : null}
                            {isHistorical ? <Badge variant="default">Historical</Badge> : null}
                        </h1>
                        <p className="mt-0.5 text-sm text-gray-500">{session.term_name}</p>
                    </div>

                    <div className="flex flex-wrap items-center justify-end gap-2 shrink-0">
                        <Badge variant="blue">{session.session_type_display}</Badge>
                        {isScheduled ? <Badge variant="default">Scheduled</Badge> : null}
                        {isInProgress ? <Badge variant="yellow">In progress</Badge> : null}
                        {isCompleted ? <Badge variant="green">Completed</Badge> : null}
                    </div>
                </div>

                {!isHistorical ? (
                    <div className="flex flex-wrap items-center gap-2">
                        {isScheduled ? (
                            <Button
                                variant="secondary"
                                size="sm"
                                onClick={handleStartLesson}
                                disabled={!session.can_start_now}
                            >
                                <PlayCircle className="mr-1.5 h-4 w-4" />
                                Start lesson
                            </Button>
                        ) : null}

                        {isInProgress ? (
                            <Button variant="primary" size="sm" onClick={handleCompleteLesson}>
                                <CheckCircle2 className="mr-1.5 h-4 w-4" />
                                Complete lesson
                            </Button>
                        ) : null}

                        {!isCompleted ? (
                            <Link href={`/sessions/${session.id}/edit`}>
                                <Button variant="secondary" size="sm">
                                    <Edit className="mr-1.5 h-4 w-4" />
                                    Edit
                                </Button>
                            </Link>
                        ) : null}
                    </div>
                ) : null}

                {isScheduled && !session.can_start_now && startAvailableAtLabel ? (
                    <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm text-blue-700">
                        You can start this lesson at {startAvailableAtLabel}.
                    </div>
                ) : null}
            </div>

            {workflowError ? (
                <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                    {workflowError}
                </div>
            ) : null}

            {workflowSuccess ? (
                <div className="flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-700">
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    {workflowSuccess}
                </div>
            ) : null}

            {isHistorical ? (
                <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    This lesson is from a past academic year. Attendance records are read-only.
                </div>
            ) : null}

            <Card>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <div className="flex items-center gap-2 text-sm text-gray-700">
                        <Calendar className="h-4 w-4 shrink-0 text-gray-400" />
                        {formatSessionDate(session.session_date)}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-700">
                        <Clock className="h-4 w-4 shrink-0 text-gray-400" />
                        {formatTimeLabel(session.start_time)} - {formatTimeLabel(session.end_time)}
                    </div>
                    {session.venue ? (
                        <div className="flex items-center gap-2 text-sm text-gray-700">
                            <MapPin className="h-4 w-4 shrink-0 text-gray-400" />
                            {session.venue}
                        </div>
                    ) : null}
                </div>
            </Card>

            {hasLessonPlan ? (
                <Card>
                    <div className="space-y-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <h2 className="text-lg font-semibold text-gray-900">Lesson plan</h2>
                                    {session.lesson_plan_status ? (
                                        <Badge variant="blue">{session.lesson_plan_status}</Badge>
                                    ) : null}
                                    <Badge variant="default">{curriculumLabel}</Badge>
                                </div>
                                <p className="mt-1 text-sm text-gray-600">
                                    The outcomes below come from the lesson plan prepared before this lesson was scheduled.
                                </p>
                            </div>

                            <Link href={`/lesson-plans/${session.lesson_plan_id}`} className="w-full sm:w-auto shrink-0">
                                <Button variant="secondary" size="sm" className="w-full sm:w-auto">
                                    <BookOpen className="mr-1.5 h-4 w-4" />
                                    View lesson plan
                                </Button>
                            </Link>
                        </div>

                        {session.planned_outcomes.length === 0 ? (
                            <p className="text-sm text-gray-500">No planned learning outcomes were saved for this lesson.</p>
                        ) : (
                            <div className="space-y-3">
                                {session.planned_outcomes.map((outcome) => (
                                    <div
                                        key={`${session.id}-${outcome.outcome_id}`}
                                        className="rounded-lg border border-gray-200 bg-gray-50 p-4"
                                    >
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className="rounded-full bg-blue-100 px-2.5 py-1 text-xs font-medium text-blue-700">
                                                {outcome.code}
                                            </span>
                                            <span className="text-xs text-gray-500">
                                                {outcome.strand} · {outcome.sub_strand}
                                            </span>
                                        </div>
                                        <p className="mt-2 text-sm text-gray-800">{outcome.text}</p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </Card>
            ) : (
                <Card>
                    <div className="flex items-start gap-3">
                        <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
                        <div className="space-y-1">
                            <h2 className="text-base font-semibold text-gray-900">Lesson plan not linked</h2>
                            <p className="text-sm text-gray-600">
                                This lesson was not scheduled from a lesson plan. It remains readable for compatibility, but the plan-first workflow is not available here.
                            </p>
                        </div>
                    </div>
                </Card>
            )}

            <Card>
                <div className="space-y-4">
                    <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="text-lg font-semibold text-gray-900">Lesson workflow</h2>
                        <Badge variant="blue">{curriculumLabel}</Badge>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                        {workflowSteps.map((step) => {
                            const Icon = step.icon;
                            return (
                                <div key={step.title} className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="rounded-lg bg-white p-2 shadow-sm">
                                            <Icon className="h-4 w-4 text-gray-700" />
                                        </div>
                                        <Badge variant={step.complete ? 'green' : 'default'}>
                                            {step.complete ? 'Done' : 'Pending'}
                                        </Badge>
                                    </div>
                                    <h3 className="mt-3 text-sm font-semibold text-gray-900">{step.title}</h3>
                                    <p className="mt-1 text-sm text-gray-600">{step.description}</p>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </Card>

            <ParticipatingCohorts
                sessionId={sessionId}
                isHistorical={isHistorical}
            />

            <AttendanceStatsStrip stats={attendanceStats} />

            <div id="attendance-section">
                <Card>
                    <div className="space-y-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <h2 className="text-lg font-semibold text-gray-900">Take attendance</h2>
                                <p className="mt-1 text-sm text-gray-600">
                                    Attendance must be recorded before you confirm what was taught.
                                </p>
                            </div>
                        </div>

                        <AttendanceTable
                            records={attendanceRecords}
                            draft={draft}
                            loading={loading}
                            saving={saving}
                            saveError={saveError}
                            pagination={pagination}
                            onUpdateStatus={updateStatus}
                            onUpdateNotes={updateNotes}
                            onMarkAll={markAll}
                            readOnly={isReadOnly}
                            onSave={async () => {
                                await save();
                                refetch();
                                setWorkflowSuccess('Attendance updated.');
                            }}
                            onDismissError={dismissError}
                            onSearch={setSearchQuery}
                        />
                    </div>
                </Card>
            </div>

            {hasLessonPlan ? (
                <Card>
                    <div className="space-y-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                                <h2 className="text-lg font-semibold text-gray-900">Confirm what was taught</h2>
                                <p className="mt-1 text-sm text-gray-600">
                                    Use the planned outcomes from the lesson plan. Do not add new outcomes here.
                                </p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                <Button variant="secondary" size="sm" onClick={scrollToAttendance}>
                                    <ClipboardCheck className="mr-1.5 h-4 w-4" />
                                    Take attendance
                                </Button>
                                <Button
                                    size="sm"
                                    onClick={handleConfirmWhatWasTaught}
                                    disabled={
                                        confirmingTaughtOutcomes ||
                                        !isInProgress ||
                                        !hasMarkedAttendance ||
                                        isHistorical ||
                                        session.planned_outcomes.length === 0
                                    }
                                >
                                    {confirmingTaughtOutcomes ? 'Saving...' : 'Confirm what was taught'}
                                </Button>
                            </div>
                        </div>

                        {!isInProgress ? (
                            <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 text-sm text-gray-600">
                                Start the lesson before confirming what was taught.
                            </div>
                        ) : null}

                        {!hasMarkedAttendance ? (
                            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
                                Take attendance first, then confirm what was taught.
                            </div>
                        ) : null}

                        {confirmedTaughtOutcomes.length > 0 ? (
                            <div className="rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-700">
                                What was taught has been saved for this lesson.
                            </div>
                        ) : null}

                        <div className="space-y-4">
                            {session.planned_outcomes.map((outcome) => (
                                <div
                                    key={`${session.id}-confirm-${outcome.outcome_id}`}
                                    className="rounded-lg border border-gray-200 p-4"
                                >
                                    <div className="space-y-2">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className="rounded-full bg-blue-100 px-2.5 py-1 text-xs font-medium text-blue-700">
                                                {outcome.code}
                                            </span>
                                            <span className="text-xs text-gray-500">
                                                {outcome.strand} · {outcome.sub_strand}
                                            </span>
                                            {taughtSelections[outcome.outcome_id] ? (
                                                <Badge variant={statusBadgeVariant(taughtSelections[outcome.outcome_id] as TaughtStatus)}>
                                                    {
                                                        TAUGHT_STATUS_OPTIONS.find(
                                                            (option) => option.value === taughtSelections[outcome.outcome_id]
                                                        )?.label
                                                    }
                                                </Badge>
                                            ) : null}
                                        </div>
                                        <p className="text-sm text-gray-800">{outcome.text}</p>
                                    </div>

                                    <div className="mt-4 grid gap-3 md:grid-cols-3">
                                        {TAUGHT_STATUS_OPTIONS.map((option) => (
                                            <label
                                                key={`${outcome.outcome_id}-${option.value}`}
                                                className={`cursor-pointer rounded-lg border p-3 text-sm transition-colors ${
                                                    taughtSelections[outcome.outcome_id] === option.value
                                                        ? 'border-blue-500 bg-blue-50'
                                                        : 'border-gray-200 hover:border-blue-300'
                                                }`}
                                            >
                                                <input
                                                    type="radio"
                                                    name={`outcome-${outcome.outcome_id}`}
                                                    value={option.value}
                                                    checked={taughtSelections[outcome.outcome_id] === option.value}
                                                    onChange={() => {
                                                        setTaughtSelections((current) => ({
                                                            ...current,
                                                            [outcome.outcome_id]: option.value,
                                                        }));
                                                    }}
                                                    disabled={!isInProgress || !hasMarkedAttendance || isHistorical}
                                                    className="sr-only"
                                                />
                                                <div className="font-medium text-gray-900">{option.label}</div>
                                                <div className="mt-1 text-xs text-gray-500">{option.description}</div>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </Card>
            ) : null}

            <Card>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                            <h2 className="text-lg font-semibold text-gray-900">Record evidence</h2>
                            <Badge variant="blue">{curriculumLabel}</Badge>
                        </div>
                        <p className="mt-2 text-sm text-gray-600">
                            Record evidence using the outcomes confirmed for this lesson.
                        </p>
                    </div>

                    {teachingWorkflow && canRecordEvidence ? (
                        <Link href={teachingWorkflow.href} className="w-full sm:w-auto shrink-0">
                            <Button className="w-full sm:w-auto" size="sm" disabled={!canRecordEvidence}>
                                {teachingWorkflow.pluginKey === 'cbc' ? 'Record evidence' : teachingWorkflow.actionLabel}
                            </Button>
                        </Link>
                    ) : teachingWorkflow ? (
                        <Button className="w-full sm:w-auto shrink-0" size="sm" disabled>
                            {teachingWorkflow.pluginKey === 'cbc' ? 'Record evidence' : teachingWorkflow.actionLabel}
                        </Button>
                    ) : (
                        <Button size="sm" disabled>
                            Record evidence
                        </Button>
                    )}
                </div>

                {!hasMarkedAttendance ? (
                    <p className="mt-3 text-sm text-amber-700">
                        Take attendance first, then confirm what was taught.
                    </p>
                ) : confirmedTaughtOutcomes.length === 0 ? (
                    <p className="mt-3 text-sm text-gray-600">
                        Confirm what was taught before recording evidence.
                    </p>
                ) : taughtOutcomeCount === 0 ? (
                    <p className="mt-3 text-sm text-gray-600">
                        No outcomes were marked as taught for this lesson.
                    </p>
                ) : teachingWorkflow ? (
                    <p className="mt-3 text-sm text-gray-600">
                        {taughtOutcomeCount} taught outcome{taughtOutcomeCount === 1 ? '' : 's'} ready for evidence.
                    </p>
                ) : (
                    <p className="mt-3 text-sm text-gray-600">
                        No curriculum evidence workflow is available for this lesson.
                    </p>
                )}
            </Card>
        </div>
    );
}
