'use client';

import type { FormEvent, ReactNode } from 'react';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Eye, FileText, Plus, RotateCcw } from 'lucide-react';
import { Badge } from '@/app/components/ui/Badge';
import { Button } from '@/app/components/ui/Button';
import { Card } from '@/app/components/ui/Card';
import { CurriculumLifecycleNotice } from '@/app/core/components/curriculum/CurriculumLifecycleNotice';
import { ErrorBanner } from '@/app/components/ui/ErrorBanner';
import { ErrorState } from '@/app/components/ui/ErrorState';
import { Input } from '@/app/components/ui/Input';
import { LoadingSpinner } from '@/app/components/ui/LoadingSpinner';
import Modal from '@/app/components/ui/Modal';
import { Select } from '@/app/components/ui/Select';
import { LessonPlanStatusBadge } from '@/app/core/components/lessonPlans/LessonPlanStatusBadge';
import { useLessonPlans } from '@/app/core/hooks/useLessonPlans';
import { useCurricula, useTerms, useSubjects } from '@/app/core/hooks/useAcademic';
import { canCreateCurriculumWork } from '@/app/core/lib/curriculumLifecycle';
import { useCohorts } from '@/app/core/hooks/useCohorts';
import { useModalState } from '@/app/core/hooks/useModalState';
import type { LessonPlan, LessonPlanStatus } from '@/app/core/types/lessonPlans';
import {
    LESSON_PLAN_STATUS_OPTIONS,
    canArchiveLessonPlan,
    canMarkLessonPlanReviewed,
    canMarkLessonPlanUsed,
    canRestoreLessonPlan,
} from '@/app/core/types/lessonPlans';
import { useAuth } from '@/app/context/AuthContext';

function formatDate(value: string | null): string {
    if (!value) {
        return 'Not scheduled';
    }

    return new Date(value).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    });
}

function getLessonDate(lessonPlan: LessonPlan): string | null {
    return lessonPlan.session_date ?? lessonPlan.planned_date;
}

function getLessonStatusLabel(lessonPlan: LessonPlan): string {
    if (lessonPlan.session_title?.trim()) {
        return lessonPlan.session_title;
    }

    if (lessonPlan.session) {
        return `Lesson ${lessonPlan.session}`;
    }

    return 'Not scheduled yet';
}

function formatUpdatedAt(value: string): string {
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

function sortLessonPlans(items: LessonPlan[]): LessonPlan[] {
    return [...items].sort((left, right) => {
        const leftTimestamp = new Date(left.session_date ?? left.updated_at).getTime();
        const rightTimestamp = new Date(right.session_date ?? right.updated_at).getTime();

        if (leftTimestamp !== rightTimestamp) {
            return leftTimestamp - rightTimestamp;
        }

        return new Date(right.updated_at).getTime() - new Date(left.updated_at).getTime();
    });
}

function teacherLabel(lessonPlan: LessonPlan): string {
    return lessonPlan.teacher_name?.trim() || 'Unassigned teacher';
}

function normalizeText(value: string | null | undefined): string | null {
    if (typeof value !== 'string') {
        return null;
    }

    const normalized = value.replace(/\s+/g, ' ').trim();
    return normalized.length > 0 ? normalized : null;
}

function getLessonSummary(lessonPlan: LessonPlan): string | null {
    const objective = lessonPlan.objectives.find((value) => normalizeText(value));
    const firstOutcome = lessonPlan.planned_outcomes.find((outcome) => normalizeText(outcome.text));

    return (
        normalizeText(lessonPlan.introduction)
        || normalizeText(lessonPlan.prior_knowledge)
        || normalizeText(objective)
        || normalizeText(firstOutcome?.text)
    );
}

function LessonPlanMetaItem({ label, value }: { label: string; value: ReactNode }) {
    return (
        <div className="min-w-0 rounded-lg bg-gray-50 px-3 py-2">
            <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</dt>
            <dd className="mt-1 min-w-0 text-sm text-gray-900">{value}</dd>
        </div>
    );
}

interface LessonPlanActionsProps {
    lessonPlan: LessonPlan;
    pendingActionKey: string | null;
    onView: (lessonPlan: LessonPlan) => void;
    onMarkReviewed: (lessonPlan: LessonPlan) => void;
    onMarkUsed: (lessonPlan: LessonPlan) => void;
    onArchive: (lessonPlan: LessonPlan) => void;
    onRestore: (lessonPlan: LessonPlan) => void;
    className?: string;
    buttonClassName?: string;
}

interface RowActionFeedback {
    action: 'reviewed' | 'used' | 'archived' | 'restored';
    message: string;
    variant: 'error' | 'success';
}

function LessonPlanActions({
    lessonPlan,
    pendingActionKey,
    onView,
    onMarkReviewed,
    onMarkUsed,
    onArchive,
    onRestore,
    className = '',
    buttonClassName = '',
}: LessonPlanActionsProps) {
    const isPending = (action: string) => pendingActionKey === actionKey(lessonPlan.id, action);

    return (
        <div className={`flex flex-wrap gap-2 ${className}`}>
            <Button
                type="button"
                size="sm"
                onClick={() => onView(lessonPlan)}
                className={buttonClassName}
            >
                <Eye className="mr-1.5 h-4 w-4" />
                View
            </Button>

            {canMarkLessonPlanReviewed(lessonPlan.status) ? (
                <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => onMarkReviewed(lessonPlan)}
                    disabled={isPending('reviewed')}
                    className={buttonClassName}
                >
                    Mark Reviewed
                </Button>
            ) : null}

            {canMarkLessonPlanUsed(lessonPlan.status) ? (
                <Button
                    type="button"
                    size="sm"
                    onClick={() => onMarkUsed(lessonPlan)}
                    disabled={isPending('used')}
                    className={buttonClassName}
                >
                    Mark Used
                </Button>
            ) : null}

            {canArchiveLessonPlan(lessonPlan.status) ? (
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => onArchive(lessonPlan)}
                    disabled={isPending('archived')}
                    className={`text-red-600 hover:bg-red-50 focus:ring-red-500 ${buttonClassName}`}
                >
                    Archive
                </Button>
            ) : null}

            {canRestoreLessonPlan(lessonPlan.status) ? (
                <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => onRestore(lessonPlan)}
                    disabled={isPending('restored')}
                    className={buttonClassName}
                >
                    <RotateCcw className="mr-1.5 h-4 w-4" />
                    Restore
                </Button>
            ) : null}
        </div>
    );
}

export function LessonPlansPage() {
    const router = useRouter();
    const { activeRole } = useAuth();
    const { curricula } = useCurricula();
    const { lessonPlans, loading, error, refetch, markReviewed, markUsed, archive, restore } = useLessonPlans();
    const { terms } = useTerms();
    const { subjects } = useSubjects();
    const { cohorts } = useCohorts();
    const canCreateLessonPlan = useMemo(
        () => curricula.some((curriculum) => canCreateCurriculumWork(curriculum)),
        [curricula]
    );
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<LessonPlanStatus | ''>('');
    const [termFilter, setTermFilter] = useState('');
    const [subjectFilter, setSubjectFilter] = useState('');
    const [cohortFilter, setCohortFilter] = useState('');
    const [pendingActionKey, setPendingActionKey] = useState<string | null>(null);
    const [rowActionFeedback, setRowActionFeedback] = useState<Record<number, RowActionFeedback>>({});
    const [reflection, setReflection] = useState('');
    const [markUsedError, setMarkUsedError] = useState<string | null>(null);
    const {
        target: markUsedTarget,
        isOpen: isMarkUsedOpen,
        open: openMarkUsed,
        close: closeMarkUsed,
    } = useModalState<LessonPlan>();

    const subtitle =
        activeRole === 'INSTRUCTOR'
            ? 'Prepare lessons, review what is ready for class, and schedule the next one.'
            : 'Monitor lesson preparation across the organization.';

    const filteredLessonPlans = useMemo(() => {
        const normalizedSearch = search.trim().toLowerCase();

        return sortLessonPlans(
            lessonPlans.filter((lessonPlan) => {
                if (statusFilter && lessonPlan.status !== statusFilter) {
                    return false;
                }

                if (termFilter && String(lessonPlan.term ?? '') !== termFilter) {
                    return false;
                }

                if (subjectFilter && String(lessonPlan.subject ?? '') !== subjectFilter) {
                    return false;
                }

                if (cohortFilter && String(lessonPlan.cohort ?? '') !== cohortFilter) {
                    return false;
                }

                if (!normalizedSearch) {
                    return true;
                }

                const haystack = [
                    lessonPlan.title,
                    lessonPlan.session_title,
                    lessonPlan.subject_name,
                    lessonPlan.cohort_name,
                    lessonPlan.term_name,
                    lessonPlan.curriculum_name,
                    lessonPlan.teacher_name,
                ]
                    .filter(Boolean)
                    .join(' ')
                    .toLowerCase();

                return haystack.includes(normalizedSearch);
            })
        );
    }, [cohortFilter, lessonPlans, search, statusFilter, subjectFilter, termFilter]);

    const setLessonPlanFeedback = (lessonPlanId: number, feedback: RowActionFeedback | null) => {
        setRowActionFeedback((current) => {
            if (!feedback) {
                if (!(lessonPlanId in current)) {
                    return current;
                }

                const next = { ...current };
                delete next[lessonPlanId];
                return next;
            }

            return {
                ...current,
                [lessonPlanId]: feedback,
            };
        });
    };

    const handleRowAction = async (
        lessonPlan: LessonPlan,
        action: 'reviewed' | 'archived' | 'restored'
    ) => {
        setPendingActionKey(actionKey(lessonPlan.id, action));
        setLessonPlanFeedback(lessonPlan.id, null);

        try {
            if (action === 'reviewed') {
                await markReviewed(lessonPlan.id);
                setLessonPlanFeedback(lessonPlan.id, {
                    action,
                    message: 'Lesson plan marked as reviewed.',
                    variant: 'success',
                });
            } else if (action === 'archived') {
                await archive(lessonPlan.id);
                setLessonPlanFeedback(lessonPlan.id, {
                    action,
                    message: 'Lesson plan archived.',
                    variant: 'success',
                });
            } else {
                await restore(lessonPlan.id);
                setLessonPlanFeedback(lessonPlan.id, {
                    action,
                    message: 'Lesson plan restored.',
                    variant: 'success',
                });
            }
        } catch (err) {
            setLessonPlanFeedback(lessonPlan.id, {
                action,
                message: err instanceof Error ? err.message : 'Action failed.',
                variant: 'error',
            });
        } finally {
            setPendingActionKey(null);
        }
    };

    const handleOpenMarkUsed = (lessonPlan: LessonPlan) => {
        setReflection(lessonPlan.reflection ?? '');
        setLessonPlanFeedback(lessonPlan.id, null);
        setMarkUsedError(null);
        openMarkUsed(lessonPlan);
    };

    const handleSubmitMarkUsed = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (!markUsedTarget) {
            return;
        }

        setPendingActionKey(actionKey(markUsedTarget.id, 'used'));
        setLessonPlanFeedback(markUsedTarget.id, null);
        setMarkUsedError(null);

        try {
            await markUsed(markUsedTarget.id, { reflection: reflection.trim() });
            closeMarkUsed();
            setReflection('');
            setLessonPlanFeedback(markUsedTarget.id, {
                action: 'used',
                message: 'Lesson plan marked as used.',
                variant: 'success',
            });
        } catch (err) {
            setMarkUsedError(err instanceof Error ? err.message : 'Action failed.');
        } finally {
            setPendingActionKey(null);
        }
    };

    if (loading && lessonPlans.length === 0) {
        return <LoadingSpinner message="Loading lesson plans..." fullScreen={false} />;
    }

    if (error && lessonPlans.length === 0) {
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

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                    <h1 className="text-2xl font-semibold text-gray-900">
                        {activeRole === 'INSTRUCTOR' ? 'Lesson Preparation' : 'Lesson Plans'}
                    </h1>
                    <p className="mt-1 text-gray-600">{subtitle}</p>
                </div>

                {canCreateLessonPlan ? (
                    <Link href="/lesson-plans/new">
                        <Button>
                            <Plus className="mr-2 h-4 w-4" />
                            {activeRole === 'INSTRUCTOR' ? 'Prepare a lesson' : 'Plan a lesson'}
                        </Button>
                    </Link>
                ) : (
                    <Button disabled>
                        <Plus className="mr-2 h-4 w-4" />
                        {activeRole === 'INSTRUCTOR' ? 'Prepare a lesson' : 'Plan a lesson'}
                    </Button>
                )}
            </div>

            {!canCreateLessonPlan ? (
                <CurriculumLifecycleNotice
                    status="DISABLED"
                    role={activeRole === 'INSTRUCTOR' ? 'INSTRUCTOR' : 'ADMIN'}
                    title="New lesson plans are blocked"
                    message="All curricula are currently blocked for new work. Historical lesson plans remain available for viewing."
                />
            ) : null}

            <Card>
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
                    <Input
                        label="Search"
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder="Search lesson plans"
                    />

                    <Select
                        label="Status"
                        value={statusFilter}
                        onChange={(event) => setStatusFilter(event.target.value as LessonPlanStatus | '')}
                        options={[
                            { value: '', label: 'All statuses' },
                            ...LESSON_PLAN_STATUS_OPTIONS,
                        ]}
                    />

                    <Select
                        label="Term"
                        value={termFilter}
                        onChange={(event) => setTermFilter(event.target.value)}
                        options={[
                            { value: '', label: 'All terms' },
                            ...terms.map((term) => ({
                                value: String(term.id),
                                label: term.name,
                            })),
                        ]}
                    />

                    <Select
                        label="Subject"
                        value={subjectFilter}
                        onChange={(event) => setSubjectFilter(event.target.value)}
                        options={[
                            { value: '', label: 'All subjects' },
                            ...subjects.map((subject) => ({
                                value: String(subject.id),
                                label: subject.name,
                            })),
                        ]}
                    />

                    <Select
                        label="Cohort"
                        value={cohortFilter}
                        onChange={(event) => setCohortFilter(event.target.value)}
                        options={[
                            { value: '', label: 'All cohorts' },
                            ...cohorts.map((cohort) => ({
                                value: String(cohort.id),
                                label: cohort.name,
                            })),
                        ]}
                    />
                </div>
            </Card>

            {lessonPlans.length === 0 ? (
                <Card>
                    <div className="py-12 text-center">
                        <FileText className="mx-auto h-12 w-12 text-gray-400" />
                        <h2 className="mt-3 text-base font-semibold text-gray-900">
                            {activeRole === 'INSTRUCTOR' ? 'No lesson preparations yet' : 'No lesson plans yet'}
                        </h2>
                        <p className="mt-2 text-sm text-gray-500">
                            {activeRole === 'INSTRUCTOR'
                                ? 'Start by choosing one of your assigned class subjects and the outcomes you want to teach.'
                                : 'No lesson plans yet. Start by planning what you are preparing to teach.'}
                        </p>
                        {canCreateLessonPlan ? (
                            <Link href="/lesson-plans/new">
                                <Button className="mt-4">
                                    <Plus className="mr-2 h-4 w-4" />
                                    {activeRole === 'INSTRUCTOR' ? 'Prepare a lesson' : 'Plan a lesson'}
                                </Button>
                            </Link>
                        ) : (
                            <Button className="mt-4" disabled>
                                <Plus className="mr-2 h-4 w-4" />
                                {activeRole === 'INSTRUCTOR' ? 'Prepare a lesson' : 'Plan a lesson'}
                            </Button>
                        )}
                    </div>
                </Card>
            ) : filteredLessonPlans.length === 0 ? (
                <Card>
                    <div className="py-12 text-center">
                        <FileText className="mx-auto h-12 w-12 text-gray-400" />
                        <h2 className="mt-3 text-base font-semibold text-gray-900">
                            {activeRole === 'INSTRUCTOR' ? 'No matching lesson preparations' : 'No matching lesson plans'}
                        </h2>
                        <p className="mt-2 text-sm text-gray-500">
                            Adjust the search or filters to find a different lesson plan.
                        </p>
                    </div>
                </Card>
            ) : (
                <div className="space-y-4 pb-24">
                    {filteredLessonPlans.map((lessonPlan) => {
                        const lessonSummary = getLessonSummary(lessonPlan);
                        const feedback = rowActionFeedback[lessonPlan.id];

                        return (
                            <Card key={lessonPlan.id} className="p-4 sm:p-5">
                                <div className="flex flex-col gap-5 xl:grid xl:grid-cols-[minmax(0,1.7fr)_minmax(0,1.3fr)_auto] xl:items-start">
                                    <div className="min-w-0 space-y-3">
                                        <div className="space-y-2">
                                            <div className="flex flex-wrap items-start gap-2">
                                                <h2 className="min-w-0 flex-1 text-base font-semibold text-gray-900 line-clamp-2 sm:text-lg">
                                                    {lessonPlan.title}
                                                </h2>
                                                {lessonPlan.generated_by_ai ? (
                                                    <Badge variant="purple" size="sm">
                                                        AI
                                                    </Badge>
                                                ) : null}
                                            </div>
                                            <p className="text-sm text-gray-500">
                                                {getLessonStatusLabel(lessonPlan)}
                                            </p>
                                            {lessonSummary ? (
                                                <p className="text-sm leading-6 text-gray-600 line-clamp-2">
                                                    {lessonSummary}
                                                </p>
                                            ) : null}
                                        </div>
                                    </div>

                                    <dl className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-3">
                                        <LessonPlanMetaItem
                                            label="Status"
                                            value={<LessonPlanStatusBadge status={lessonPlan.status} size="sm" />}
                                        />
                                        <LessonPlanMetaItem
                                            label="Lesson Date"
                                            value={formatDate(getLessonDate(lessonPlan))}
                                        />
                                        <LessonPlanMetaItem
                                            label="Cohort"
                                            value={lessonPlan.cohort_name || '-'}
                                        />
                                        <LessonPlanMetaItem
                                            label="Subject"
                                            value={lessonPlan.subject_name || '-'}
                                        />
                                        <LessonPlanMetaItem
                                            label="Term"
                                            value={lessonPlan.term_name || '-'}
                                        />
                                        <LessonPlanMetaItem
                                            label="Teacher"
                                            value={teacherLabel(lessonPlan)}
                                        />
                                        <LessonPlanMetaItem
                                            label="Updated"
                                            value={formatUpdatedAt(lessonPlan.updated_at)}
                                        />
                                    </dl>

                                    <div className="space-y-3 xl:min-w-[12rem]">
                                        <LessonPlanActions
                                            lessonPlan={lessonPlan}
                                            pendingActionKey={pendingActionKey}
                                            onView={(plan) => router.push(`/lesson-plans/${plan.id}`)}
                                            onMarkReviewed={(plan) => {
                                                void handleRowAction(plan, 'reviewed');
                                            }}
                                            onMarkUsed={handleOpenMarkUsed}
                                            onArchive={(plan) => {
                                                void handleRowAction(plan, 'archived');
                                            }}
                                            onRestore={(plan) => {
                                                void handleRowAction(plan, 'restored');
                                            }}
                                            className="w-full xl:flex-col xl:items-stretch"
                                            buttonClassName="w-full sm:w-auto xl:w-full"
                                        />
                                        {feedback ? (
                                            <ErrorBanner
                                                message={feedback.message}
                                                variant={feedback.variant}
                                                compact
                                                autoDismissMs={feedback.variant === 'error' ? 5000 : 4000}
                                                onDismiss={() => setLessonPlanFeedback(lessonPlan.id, null)}
                                            />
                                        ) : null}
                                    </div>
                                </div>
                            </Card>
                        );
                    })}
                </div>
            )}

            <Modal
                isOpen={isMarkUsedOpen}
                onClose={() => {
                    closeMarkUsed();
                    setReflection('');
                    setMarkUsedError(null);
                }}
                title="Mark Lesson Plan as Used"
                size="md"
            >
                <form onSubmit={handleSubmitMarkUsed} className="space-y-4">
                    <p className="text-sm text-gray-600">
                        Add reflection notes for this lesson. The backend remains authoritative for the final state.
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

                    {markUsedError ? (
                        <ErrorBanner
                            message={markUsedError}
                            onDismiss={() => setMarkUsedError(null)}
                            autoDismissMs={5000}
                            compact
                        />
                    ) : null}

                    <div className="flex flex-wrap justify-end gap-3">
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={() => {
                                closeMarkUsed();
                                setReflection('');
                                setMarkUsedError(null);
                            }}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={!markUsedTarget || pendingActionKey === actionKey(markUsedTarget.id, 'used')}
                        >
                            Mark Used
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
