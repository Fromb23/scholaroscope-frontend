'use client';

import type { FormEvent } from 'react';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import {
    ArrowLeft,
    CalendarDays,
    CheckCircle2,
    Clock3,
    Download,
    Edit,
    FilePlus2,
    Link2,
    RotateCcw,
} from 'lucide-react';
import { Button } from '@/app/components/ui/Button';
import { Card } from '@/app/components/ui/Card';
import { ErrorBanner } from '@/app/components/ui/ErrorBanner';
import { ErrorState } from '@/app/components/ui/ErrorState';
import { LoadingSpinner } from '@/app/components/ui/LoadingSpinner';
import Modal from '@/app/components/ui/Modal';
import { Input } from '@/app/components/ui/Input';
import { Select } from '@/app/components/ui/Select';
import { LessonPlanReferences } from '@/app/core/components/lessonPlans/LessonPlanReferences';
import { LessonPlanSections } from '@/app/core/components/lessonPlans/LessonPlanSections';
import { LessonPlanStatusBadge } from '@/app/core/components/lessonPlans/LessonPlanStatusBadge';
import { useLessonPlanDetail } from '@/app/core/hooks/useLessonPlans';
import {
    canArchiveLessonPlan,
    canMarkLessonPlanReviewed,
    canMarkLessonPlanUsed,
    canPrepareAssignmentDraft,
    canScheduleLesson,
    canRestoreLessonPlan,
    SCHEDULE_LESSON_SESSION_TYPE_OPTIONS,
    type LessonPlan,
    type ScheduleLessonSessionType,
} from '@/app/core/types/lessonPlans';
import type { Assignment } from '@/app/core/types/assignments';

function getLessonPlanId(params: ReturnType<typeof useParams>): number | null {
    const rawId = params.id;
    const resolvedId = Array.isArray(rawId) ? rawId[0] : rawId;
    const numericId = Number(resolvedId);

    return Number.isFinite(numericId) ? numericId : null;
}

function formatDate(value: string | null): string {
    if (!value) {
        return 'Not scheduled';
    }

    return new Date(value).toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    });
}

function formatTime(value: string | null): string {
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

function formatTimestamp(value: string | null): string {
    if (!value) {
        return 'Not recorded';
    }

    return new Date(value).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
    });
}

function actionKey(lessonPlanId: number, action: string): string {
    return `${lessonPlanId}:${action}`;
}

function getScheduledDateValue(lessonPlan: LessonPlan): string | null {
    return lessonPlan.session_date ?? lessonPlan.planned_date;
}

function getLinkedLessonLabel(lessonPlan: LessonPlan): string {
    if (lessonPlan.session_title?.trim()) {
        return lessonPlan.session_title;
    }

    if (lessonPlan.session) {
        return `Lesson ${lessonPlan.session}`;
    }

    return 'Not scheduled yet';
}

export function LessonPlanDetailPage() {
    const params = useParams();
    const searchParams = useSearchParams();
    const lessonPlanId = getLessonPlanId(params);
    const {
        lessonPlan,
        loading,
        error,
        refetch,
        markReviewed,
        markUsed,
        archive,
        restore,
        scheduleLesson,
        createAssignmentDraft,
        exportPdf,
    } = useLessonPlanDetail(lessonPlanId);
    const [pendingActionKey, setPendingActionKey] = useState<string | null>(null);
    const [actionError, setActionError] = useState<string | null>(null);
    const [actionSuccess, setActionSuccess] = useState<string | null>(null);
    const [markUsedOpen, setMarkUsedOpen] = useState(false);
    const [reflection, setReflection] = useState('');
    const [scheduleOpen, setScheduleOpen] = useState(false);
    const [preparedAssignment, setPreparedAssignment] = useState<Assignment | null>(null);
    const [scheduleForm, setScheduleForm] = useState<{
        session_date: string;
        start_time: string;
        end_time: string;
        session_type: ScheduleLessonSessionType;
        venue: string;
        description: string;
    }>({
        session_date: '',
        start_time: '',
        end_time: '',
        session_type: 'LESSON',
        venue: '',
        description: '',
    });

    const noticeMessage = useMemo(() => {
        const notice = searchParams.get('notice');
        const mode = searchParams.get('mode');
        const referencesCount = Number(searchParams.get('references') ?? '0');
        const referencesLabel = `${referencesCount} reference${
            referencesCount === 1 ? '' : 's'
        } selected.`;

        if (notice === 'generated') {
            return mode === 'ai'
                ? `AI-assisted lesson plan generated from selected outcomes and references. ${referencesLabel}`
                : `Lesson plan generated from selected outcomes and references. ${referencesLabel}`;
        }

        if (notice === 'existing') {
            return mode === 'ai'
                ? `Existing AI-assisted lesson plan opened. ${referencesLabel}`
                : `Existing lesson plan opened. ${referencesLabel}`;
        }

        if (notice === 'updated') {
            return 'Lesson plan updated.';
        }

        return null;
    }, [searchParams]);

    const handleSimpleAction = async (action: 'reviewed' | 'archived' | 'restored') => {
        if (!lessonPlan) {
            return;
        }

        setPendingActionKey(actionKey(lessonPlan.id, action));
        setActionError(null);
        setActionSuccess(null);

        try {
            if (action === 'reviewed') {
                await markReviewed();
                setActionSuccess('Lesson plan marked as reviewed.');
            } else if (action === 'archived') {
                await archive();
                setActionSuccess('Lesson plan archived.');
            } else {
                await restore();
                setActionSuccess('Lesson plan restored.');
            }
        } catch (err) {
            setActionError(err instanceof Error ? err.message : 'Action failed.');
        } finally {
            setPendingActionKey(null);
        }
    };

    const handleOpenMarkUsed = () => {
        if (!lessonPlan) {
            return;
        }

        setReflection(lessonPlan.reflection ?? '');
        setActionError(null);
        setActionSuccess(null);
        setMarkUsedOpen(true);
    };

    const handleOpenSchedule = () => {
        if (!lessonPlan) {
            return;
        }

        setScheduleForm({
            session_date: lessonPlan.planned_date ?? lessonPlan.session_date ?? '',
            start_time: lessonPlan.planned_start_time ?? '',
            end_time: lessonPlan.planned_end_time ?? '',
            session_type: 'LESSON',
            venue: '',
            description: '',
        });
        setActionError(null);
        setActionSuccess(null);
        setScheduleOpen(true);
    };

    const handleCreateAssignmentDraft = async () => {
        if (!lessonPlan) {
            return;
        }

        setPendingActionKey(actionKey(lessonPlan.id, 'assignment-draft'));
        setActionError(null);
        setActionSuccess(null);

        try {
            const response = await createAssignmentDraft();
            setPreparedAssignment(response.assignment);
            setActionSuccess(response.detail);
        } catch (err) {
            setActionError(err instanceof Error ? err.message : 'Action failed.');
        } finally {
            setPendingActionKey(null);
        }
    };

    const handleExportPdf = async () => {
        if (!lessonPlan) {
            return;
        }

        setPendingActionKey(actionKey(lessonPlan.id, 'export-pdf'));
        setActionError(null);
        setActionSuccess(null);

        try {
            await exportPdf();
        } catch (err) {
            setActionError(
                err instanceof Error
                    ? err.message
                    : 'Could not export the lesson plan PDF.'
            );
        } finally {
            setPendingActionKey(null);
        }
    };

    const handleSubmitMarkUsed = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (!lessonPlan) {
            return;
        }

        setPendingActionKey(actionKey(lessonPlan.id, 'used'));
        setActionError(null);
        setActionSuccess(null);

        try {
            await markUsed({ reflection: reflection.trim() });
            setMarkUsedOpen(false);
            setReflection('');
            setActionSuccess('Lesson plan marked as used.');
        } catch (err) {
            setActionError(err instanceof Error ? err.message : 'Action failed.');
        } finally {
            setPendingActionKey(null);
        }
    };

    const handleSubmitSchedule = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (!lessonPlan) {
            return;
        }

        setPendingActionKey(actionKey(lessonPlan.id, 'scheduled'));
        setActionError(null);
        setActionSuccess(null);

        try {
            await scheduleLesson({
                session_date: scheduleForm.session_date,
                start_time: scheduleForm.start_time,
                end_time: scheduleForm.end_time,
                session_type: scheduleForm.session_type,
                venue: scheduleForm.venue.trim() || undefined,
                description: scheduleForm.description.trim() || undefined,
            });
            setScheduleOpen(false);
            setActionSuccess('Lesson scheduled.');
        } catch (err) {
            setActionError(err instanceof Error ? err.message : 'Action failed.');
        } finally {
            setPendingActionKey(null);
        }
    };

    if (loading && !lessonPlan) {
        return <LoadingSpinner message="Loading lesson plan..." fullScreen={false} />;
    }

    if (error) {
        return (
            <ErrorState
                fullScreen={false}
                message={error}
                onRetry={() => {
                    void refetch();
                }}
            />
        );
    }

    if (!lessonPlan) {
        return (
            <ErrorState
                fullScreen={false}
                message="This lesson plan could not be found."
            />
        );
    }

    return (
        <div className="space-y-6">
            <div className="space-y-3">
                <Link href="/lesson-plans">
                    <Button variant="ghost" size="sm">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back
                    </Button>
                </Link>

                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                            <h1 className="text-2xl font-semibold text-gray-900">{lessonPlan.title}</h1>
                            <LessonPlanStatusBadge status={lessonPlan.status} />
                            {lessonPlan.generated_by_ai ? (
                                <span className="rounded-full bg-purple-50 px-2.5 py-1 text-xs font-medium text-purple-700">
                                    AI generated
                                </span>
                            ) : null}
                        </div>
                        <p className="text-gray-600">
                            {getLinkedLessonLabel(lessonPlan)}
                        </p>
                    </div>

                    <div className="flex flex-wrap gap-2 print:hidden">
                        {canScheduleLesson(lessonPlan.status) ? (
                            <Button
                                size="sm"
                                onClick={handleOpenSchedule}
                                disabled={pendingActionKey === actionKey(lessonPlan.id, 'scheduled')}
                            >
                                <CalendarDays className="mr-1.5 h-4 w-4" />
                                Schedule lesson
                            </Button>
                        ) : null}

                        <Link href={`/lesson-plans/${lessonPlan.id}/edit`}>
                            <Button variant="secondary" size="sm">
                                <Edit className="mr-1.5 h-4 w-4" />
                                Edit
                            </Button>
                        </Link>

                        <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            onClick={() => {
                                void handleExportPdf();
                            }}
                            disabled={pendingActionKey === actionKey(lessonPlan.id, 'export-pdf')}
                        >
                            <Download className="mr-1.5 h-4 w-4" />
                            {pendingActionKey === actionKey(lessonPlan.id, 'export-pdf')
                                ? 'Downloading...'
                                : 'Download PDF'}
                        </Button>

                        {canMarkLessonPlanReviewed(lessonPlan.status) ? (
                            <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => {
                                    void handleSimpleAction('reviewed');
                                }}
                                disabled={pendingActionKey === actionKey(lessonPlan.id, 'reviewed')}
                            >
                                Mark Reviewed
                            </Button>
                        ) : null}

                        {canMarkLessonPlanUsed(lessonPlan.status) ? (
                            <Button
                                size="sm"
                                onClick={handleOpenMarkUsed}
                                disabled={pendingActionKey === actionKey(lessonPlan.id, 'used')}
                            >
                                Mark Used
                            </Button>
                        ) : null}

                        {canPrepareAssignmentDraft(lessonPlan.status) ? (
                            <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => {
                                    void handleCreateAssignmentDraft();
                                }}
                                disabled={pendingActionKey === actionKey(lessonPlan.id, 'assignment-draft')}
                            >
                                <FilePlus2 className="mr-1.5 h-4 w-4" />
                                Prepare assignment draft
                            </Button>
                        ) : null}

                        {canArchiveLessonPlan(lessonPlan.status) ? (
                            <Button
                                size="sm"
                                variant="danger"
                                onClick={() => {
                                    void handleSimpleAction('archived');
                                }}
                                disabled={pendingActionKey === actionKey(lessonPlan.id, 'archived')}
                            >
                                Archive
                            </Button>
                        ) : null}

                        {canRestoreLessonPlan(lessonPlan.status) ? (
                            <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => {
                                    void handleSimpleAction('restored');
                                }}
                                disabled={pendingActionKey === actionKey(lessonPlan.id, 'restored')}
                            >
                                <RotateCcw className="mr-1.5 h-4 w-4" />
                                Restore
                            </Button>
                        ) : null}
                    </div>
                </div>
            </div>

            {noticeMessage ? (
                <div className="flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-700">
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    {noticeMessage}
                </div>
            ) : null}

            {actionError ? (
                <ErrorBanner message={actionError} onDismiss={() => setActionError(null)} />
            ) : null}

            {actionSuccess ? (
                <div className="flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-700">
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    {actionSuccess}
                </div>
            ) : null}

            {preparedAssignment ? (
                <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm text-blue-700">
                    <span className="font-medium">Assignment draft ready.</span>{' '}
                    <Link
                        href={`/academic/cohorts/${preparedAssignment.cohort_id}/assignments/${preparedAssignment.id}?returnTo=/lesson-plans/${lessonPlan.id}`}
                        className="font-medium underline underline-offset-2"
                    >
                        Open assignment
                    </Link>
                </div>
            ) : null}

            {lessonPlan.status === 'ARCHIVED' ? (
                <div className="rounded-xl border border-orange-200 bg-orange-50 p-3 text-sm text-orange-700">
                    This lesson plan is archived. Restore it to continue using it in active workflows.
                </div>
            ) : null}

            <Card>
                <div className="grid grid-cols-1 gap-4 text-sm md:grid-cols-2 xl:grid-cols-4">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Class Subject</p>
                        <p className="mt-1 font-medium text-gray-900">{lessonPlan.cohort_subject_name || 'Not set'}</p>
                    </div>
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Subject</p>
                        <p className="mt-1 font-medium text-gray-900">{lessonPlan.subject_name || 'Not set'}</p>
                    </div>
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Cohort</p>
                        <p className="mt-1 font-medium text-gray-900">{lessonPlan.cohort_name || 'Not set'}</p>
                    </div>
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Planned For</p>
                        <p className="mt-1 font-medium text-gray-900">
                            {formatDate(getScheduledDateValue(lessonPlan))}
                        </p>
                    </div>
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Term</p>
                        <p className="mt-1 font-medium text-gray-900">{lessonPlan.term_name || 'Not set'}</p>
                    </div>
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Curriculum</p>
                        <p className="mt-1 font-medium text-gray-900">{lessonPlan.curriculum_name || 'Not set'}</p>
                    </div>
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Teacher</p>
                        <p className="mt-1 font-medium text-gray-900">{lessonPlan.teacher_name || 'Not set'}</p>
                    </div>
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Academic Year</p>
                        <p className="mt-1 font-medium text-gray-900">{lessonPlan.academic_year_name || 'Not set'}</p>
                    </div>
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Planned Time</p>
                        <p className="mt-1 font-medium text-gray-900">
                            {lessonPlan.planned_start_time || lessonPlan.planned_end_time
                                ? `${formatTime(lessonPlan.planned_start_time)} - ${formatTime(lessonPlan.planned_end_time)}`
                                : 'Not set'}
                        </p>
                    </div>
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Scheduled Lesson</p>
                        <p className="mt-1 font-medium text-gray-900">
                            {lessonPlan.session ? (
                                <Link href={`/sessions/${lessonPlan.session}`} className="inline-flex items-center gap-1 text-blue-600 hover:underline">
                                    <Link2 className="h-3.5 w-3.5" />
                                    {getLinkedLessonLabel(lessonPlan)}
                                </Link>
                            ) : (
                                'Not scheduled yet'
                            )}
                        </p>
                    </div>
                </div>
            </Card>

            <Card>
                <div className="space-y-4">
                    <div className="space-y-1">
                        <h2 className="text-base font-semibold text-gray-900">Chosen Learning Outcomes</h2>
                        <p className="text-sm text-gray-500">
                            These outcomes guide the objectives, lesson flow, and evidence recorded for this lesson.
                        </p>
                    </div>

                    {lessonPlan.planned_outcomes.length === 0 ? (
                        <p className="text-sm text-gray-500">No learning outcomes have been added yet.</p>
                    ) : (
                        <div className="space-y-3">
                            {lessonPlan.planned_outcomes.map((outcome) => (
                                <div
                                    key={`${lessonPlan.id}-${outcome.outcome_id}`}
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

            <Card>
                <div className="grid grid-cols-1 gap-4 text-sm md:grid-cols-2 xl:grid-cols-4">
                    <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Created</p>
                        <p className="mt-2 text-gray-900">{formatTimestamp(lessonPlan.created_at)}</p>
                    </div>
                    <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Updated</p>
                        <p className="mt-2 text-gray-900">{formatTimestamp(lessonPlan.updated_at)}</p>
                    </div>
                    <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Generated</p>
                        <p className="mt-2 text-gray-900">{formatTimestamp(lessonPlan.generated_at)}</p>
                    </div>
                    <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Reviewed</p>
                        <p className="mt-2 text-gray-900">{formatTimestamp(lessonPlan.reviewed_at)}</p>
                    </div>
                    <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Used</p>
                        <p className="mt-2 text-gray-900">{formatTimestamp(lessonPlan.used_at)}</p>
                    </div>
                    <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 md:col-span-2 xl:col-span-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Generation Metadata</p>
                        <div className="mt-2 flex flex-wrap items-center gap-3 text-gray-900">
                            <span>{lessonPlan.generated_by_ai ? 'AI-assisted' : 'Rule-based generation'}</span>
                            {lessonPlan.ai_provider ? <span>Provider: {lessonPlan.ai_provider}</span> : null}
                            {lessonPlan.ai_model ? <span>Model: {lessonPlan.ai_model}</span> : null}
                        </div>
                    </div>
                </div>
            </Card>

            <LessonPlanSections lessonPlan={lessonPlan} />
            <LessonPlanReferences lessonPlan={lessonPlan} />

            <Modal
                isOpen={markUsedOpen}
                onClose={() => {
                    setMarkUsedOpen(false);
                    setReflection('');
                }}
                title="Mark Lesson Plan as Used"
                size="md"
            >
                <form onSubmit={handleSubmitMarkUsed} className="space-y-4">
                    <p className="text-sm text-gray-600">
                        Add reflection notes for this lesson. The returned lesson plan will refresh this page after the update.
                    </p>

                    <div className="space-y-1">
                        <label className="block text-sm font-medium text-gray-700">Reflection</label>
                        <textarea
                            value={reflection}
                            onChange={(event) => setReflection(event.target.value)}
                            rows={6}
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Reflection after teaching"
                        />
                    </div>

                    <div className="flex flex-wrap justify-end gap-3">
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={() => {
                                setMarkUsedOpen(false);
                                setReflection('');
                            }}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={pendingActionKey === actionKey(lessonPlan.id, 'used')}
                        >
                            <Clock3 className="mr-1.5 h-4 w-4" />
                            Mark Used
                        </Button>
                    </div>
                </form>
            </Modal>

            <Modal
                isOpen={scheduleOpen}
                onClose={() => setScheduleOpen(false)}
                title="Schedule Lesson"
                size="md"
            >
                <form onSubmit={handleSubmitSchedule} className="space-y-4">
                    <p className="text-sm text-gray-600">
                        Choose when this lesson should take place.
                    </p>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <Input
                            label="Date"
                            type="date"
                            value={scheduleForm.session_date}
                            onChange={(event) => setScheduleForm((current) => ({
                                ...current,
                                session_date: event.target.value,
                            }))}
                            required
                        />
                        <Input
                            label="Venue"
                            value={scheduleForm.venue}
                            onChange={(event) => setScheduleForm((current) => ({
                                ...current,
                                venue: event.target.value,
                            }))}
                            placeholder="Optional venue"
                        />
                        <Select
                            label="Session category"
                            value={scheduleForm.session_type}
                            onChange={(event) => setScheduleForm((current) => ({
                                ...current,
                                session_type: event.target.value as ScheduleLessonSessionType,
                            }))}
                            options={SCHEDULE_LESSON_SESSION_TYPE_OPTIONS}
                        />
                        <Input
                            label="Start time"
                            type="time"
                            value={scheduleForm.start_time}
                            onChange={(event) => setScheduleForm((current) => ({
                                ...current,
                                start_time: event.target.value,
                            }))}
                            required
                        />
                        <Input
                            label="End time"
                            type="time"
                            value={scheduleForm.end_time}
                            onChange={(event) => setScheduleForm((current) => ({
                                ...current,
                                end_time: event.target.value,
                            }))}
                            required
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="block text-sm font-medium text-gray-700">Notes</label>
                        <textarea
                            value={scheduleForm.description}
                            onChange={(event) => setScheduleForm((current) => ({
                                ...current,
                                description: event.target.value,
                            }))}
                            rows={4}
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Optional lesson notes"
                        />
                    </div>

                    <div className="flex flex-wrap justify-end gap-3">
                        <Button type="button" variant="secondary" onClick={() => setScheduleOpen(false)}>
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={pendingActionKey === actionKey(lessonPlan.id, 'scheduled')}
                        >
                            <CalendarDays className="mr-1.5 h-4 w-4" />
                            Schedule lesson
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
