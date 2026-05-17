'use client';

import type { FormEvent } from 'react';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import {
    ArrowLeft,
    CheckCircle2,
    Clock3,
    Edit,
    Printer,
    RotateCcw,
} from 'lucide-react';
import { Button } from '@/app/components/ui/Button';
import { Card } from '@/app/components/ui/Card';
import { ErrorBanner } from '@/app/components/ui/ErrorBanner';
import { ErrorState } from '@/app/components/ui/ErrorState';
import { LoadingSpinner } from '@/app/components/ui/LoadingSpinner';
import Modal from '@/app/components/ui/Modal';
import { LessonPlanReferences } from '@/app/core/components/lessonPlans/LessonPlanReferences';
import { LessonPlanSections } from '@/app/core/components/lessonPlans/LessonPlanSections';
import { LessonPlanStatusBadge } from '@/app/core/components/lessonPlans/LessonPlanStatusBadge';
import { useLessonPlanDetail } from '@/app/core/hooks/useLessonPlans';
import {
    canArchiveLessonPlan,
    canMarkLessonPlanReviewed,
    canMarkLessonPlanUsed,
    canRestoreLessonPlan,
} from '@/app/core/types/lessonPlans';

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
    } = useLessonPlanDetail(lessonPlanId);
    const [pendingActionKey, setPendingActionKey] = useState<string | null>(null);
    const [actionError, setActionError] = useState<string | null>(null);
    const [actionSuccess, setActionSuccess] = useState<string | null>(null);
    const [markUsedOpen, setMarkUsedOpen] = useState(false);
    const [reflection, setReflection] = useState('');

    const noticeMessage = useMemo(() => {
        const notice = searchParams.get('notice');
        const referencesCount = Number(searchParams.get('references') ?? '0');

        if (notice === 'generated') {
            return `Lesson plan generated. ${referencesCount} reference${
                referencesCount === 1 ? '' : 's'
            } selected.`;
        }

        if (notice === 'existing') {
            return `Existing lesson plan found. ${referencesCount} reference${
                referencesCount === 1 ? '' : 's'
            } selected.`;
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
                            {lessonPlan.session_title || `Session ${lessonPlan.session}`}
                        </p>
                    </div>

                    <div className="flex flex-wrap gap-2 print:hidden">
                        <Link href={`/lesson-plans/${lessonPlan.id}/edit`}>
                            <Button variant="secondary" size="sm">
                                <Edit className="mr-1.5 h-4 w-4" />
                                Edit
                            </Button>
                        </Link>

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

                        <Button type="button" size="sm" variant="secondary" onClick={() => window.print()}>
                            <Printer className="mr-1.5 h-4 w-4" />
                            Print
                        </Button>
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

            {lessonPlan.status === 'ARCHIVED' ? (
                <div className="rounded-xl border border-orange-200 bg-orange-50 p-3 text-sm text-orange-700">
                    This lesson plan is archived. Restore it to continue using it in active workflows.
                </div>
            ) : null}

            <Card>
                <div className="grid grid-cols-1 gap-4 text-sm md:grid-cols-2 xl:grid-cols-4">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Subject</p>
                        <p className="mt-1 font-medium text-gray-900">{lessonPlan.subject_name || 'Not set'}</p>
                    </div>
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Cohort</p>
                        <p className="mt-1 font-medium text-gray-900">{lessonPlan.cohort_name || 'Not set'}</p>
                    </div>
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Session Date</p>
                        <p className="mt-1 font-medium text-gray-900">{formatDate(lessonPlan.session_date)}</p>
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
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Linked Session</p>
                        <p className="mt-1 font-medium text-gray-900">
                            <Link href={`/sessions/${lessonPlan.session}`} className="text-blue-600 hover:underline">
                                {lessonPlan.session_title || `Session ${lessonPlan.session}`}
                            </Link>
                        </p>
                    </div>
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
        </div>
    );
}
