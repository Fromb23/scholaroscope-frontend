'use client';

import type { FormEvent } from 'react';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CheckCircle2, Eye, FileText, Plus, RotateCcw } from 'lucide-react';
import { Button } from '@/app/components/ui/Button';
import { Card } from '@/app/components/ui/Card';
import { ErrorBanner } from '@/app/components/ui/ErrorBanner';
import { ErrorState } from '@/app/components/ui/ErrorState';
import { Input } from '@/app/components/ui/Input';
import { LoadingSpinner } from '@/app/components/ui/LoadingSpinner';
import Modal from '@/app/components/ui/Modal';
import { Select } from '@/app/components/ui/Select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/app/components/ui/Table';
import { LessonPlanStatusBadge } from '@/app/core/components/lessonPlans/LessonPlanStatusBadge';
import { useLessonPlans } from '@/app/core/hooks/useLessonPlans';
import { useTerms, useSubjects } from '@/app/core/hooks/useAcademic';
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

interface LessonPlanActionsProps {
    lessonPlan: LessonPlan;
    pendingActionKey: string | null;
    onView: (lessonPlan: LessonPlan) => void;
    onMarkReviewed: (lessonPlan: LessonPlan) => void;
    onMarkUsed: (lessonPlan: LessonPlan) => void;
    onArchive: (lessonPlan: LessonPlan) => void;
    onRestore: (lessonPlan: LessonPlan) => void;
}

function LessonPlanActions({
    lessonPlan,
    pendingActionKey,
    onView,
    onMarkReviewed,
    onMarkUsed,
    onArchive,
    onRestore,
}: LessonPlanActionsProps) {
    const isPending = (action: string) => pendingActionKey === actionKey(lessonPlan.id, action);

    return (
        <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" size="sm" onClick={() => onView(lessonPlan)}>
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
                >
                    Mark Used
                </Button>
            ) : null}

            {canArchiveLessonPlan(lessonPlan.status) ? (
                <Button
                    type="button"
                    variant="danger"
                    size="sm"
                    onClick={() => onArchive(lessonPlan)}
                    disabled={isPending('archived')}
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
    const { lessonPlans, loading, error, refetch, markReviewed, markUsed, archive, restore } = useLessonPlans();
    const { terms } = useTerms();
    const { subjects } = useSubjects();
    const { cohorts } = useCohorts();
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<LessonPlanStatus | ''>('');
    const [termFilter, setTermFilter] = useState('');
    const [subjectFilter, setSubjectFilter] = useState('');
    const [cohortFilter, setCohortFilter] = useState('');
    const [pendingActionKey, setPendingActionKey] = useState<string | null>(null);
    const [actionError, setActionError] = useState<string | null>(null);
    const [actionSuccess, setActionSuccess] = useState<string | null>(null);
    const [reflection, setReflection] = useState('');
    const {
        target: markUsedTarget,
        isOpen: isMarkUsedOpen,
        open: openMarkUsed,
        close: closeMarkUsed,
    } = useModalState<LessonPlan>();

    const subtitle =
        activeRole === 'INSTRUCTOR'
            ? 'Prepare and review your upcoming lessons.'
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

    const handleRowAction = async (
        lessonPlan: LessonPlan,
        action: 'reviewed' | 'archived' | 'restored'
    ) => {
        setPendingActionKey(actionKey(lessonPlan.id, action));
        setActionError(null);
        setActionSuccess(null);

        try {
            if (action === 'reviewed') {
                await markReviewed(lessonPlan.id);
                setActionSuccess('Lesson plan marked as reviewed.');
            } else if (action === 'archived') {
                await archive(lessonPlan.id);
                setActionSuccess('Lesson plan archived.');
            } else {
                await restore(lessonPlan.id);
                setActionSuccess('Lesson plan restored.');
            }
        } catch (err) {
            setActionError(err instanceof Error ? err.message : 'Action failed.');
        } finally {
            setPendingActionKey(null);
        }
    };

    const handleOpenMarkUsed = (lessonPlan: LessonPlan) => {
        setReflection(lessonPlan.reflection ?? '');
        setActionError(null);
        setActionSuccess(null);
        openMarkUsed(lessonPlan);
    };

    const handleSubmitMarkUsed = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (!markUsedTarget) {
            return;
        }

        setPendingActionKey(actionKey(markUsedTarget.id, 'used'));
        setActionError(null);
        setActionSuccess(null);

        try {
            await markUsed(markUsedTarget.id, { reflection: reflection.trim() });
            closeMarkUsed();
            setReflection('');
            setActionSuccess('Lesson plan marked as used.');
        } catch (err) {
            setActionError(err instanceof Error ? err.message : 'Action failed.');
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
                    <h1 className="text-2xl font-semibold text-gray-900">Lesson Plans</h1>
                    <p className="mt-1 text-gray-600">{subtitle}</p>
                </div>

                <Link href="/lesson-plans/new">
                    <Button>
                        <Plus className="mr-2 h-4 w-4" />
                        Plan a lesson
                    </Button>
                </Link>
            </div>

            {actionError ? (
                <ErrorBanner message={actionError} onDismiss={() => setActionError(null)} />
            ) : null}

            {actionSuccess ? (
                <div className="flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-700">
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    {actionSuccess}
                </div>
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
                        <h2 className="mt-3 text-base font-semibold text-gray-900">No lesson plans yet</h2>
                        <p className="mt-2 text-sm text-gray-500">
                            No lesson plans yet. Start by planning what you are preparing to teach.
                        </p>
                        <Link href="/lesson-plans/new">
                            <Button className="mt-4">
                                <Plus className="mr-2 h-4 w-4" />
                                Plan a lesson
                            </Button>
                        </Link>
                    </div>
                </Card>
            ) : filteredLessonPlans.length === 0 ? (
                <Card>
                    <div className="py-12 text-center">
                        <FileText className="mx-auto h-12 w-12 text-gray-400" />
                        <h2 className="mt-3 text-base font-semibold text-gray-900">No matching lesson plans</h2>
                        <p className="mt-2 text-sm text-gray-500">
                            Adjust the search or filters to find a different lesson plan.
                        </p>
                    </div>
                </Card>
            ) : (
                <>
                    <div className="hidden lg:block">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Lesson Plan</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Lesson Date</TableHead>
                                    <TableHead>Cohort</TableHead>
                                    <TableHead>Subject</TableHead>
                                    <TableHead>Term</TableHead>
                                    <TableHead>Teacher</TableHead>
                                    <TableHead>Updated</TableHead>
                                    <TableHead>Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredLessonPlans.map((lessonPlan) => (
                                    <TableRow key={lessonPlan.id}>
                                        <TableCell>
                                            <div className="space-y-1">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <span className="font-medium text-gray-900">{lessonPlan.title}</span>
                                                    {lessonPlan.generated_by_ai ? (
                                                        <span className="rounded-full bg-purple-50 px-2.5 py-1 text-xs font-medium text-purple-700">
                                                            AI
                                                        </span>
                                                    ) : null}
                                                </div>
                                                <div className="text-xs text-gray-500">
                                                    {getLessonStatusLabel(lessonPlan)}
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <LessonPlanStatusBadge status={lessonPlan.status} />
                                        </TableCell>
                                        <TableCell>{formatDate(getLessonDate(lessonPlan))}</TableCell>
                                        <TableCell>{lessonPlan.cohort_name || '-'}</TableCell>
                                        <TableCell>{lessonPlan.subject_name || '-'}</TableCell>
                                        <TableCell>{lessonPlan.term_name || '-'}</TableCell>
                                        <TableCell>{teacherLabel(lessonPlan)}</TableCell>
                                        <TableCell>{formatUpdatedAt(lessonPlan.updated_at)}</TableCell>
                                        <TableCell>
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
                                            />
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>

                    <div className="space-y-4 lg:hidden">
                        {filteredLessonPlans.map((lessonPlan) => (
                            <Card key={lessonPlan.id} className="p-4">
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <h2 className="text-base font-semibold text-gray-900">{lessonPlan.title}</h2>
                                            <LessonPlanStatusBadge status={lessonPlan.status} size="sm" />
                                            {lessonPlan.generated_by_ai ? (
                                                <span className="rounded-full bg-purple-50 px-2.5 py-1 text-xs font-medium text-purple-700">
                                                    AI
                                                </span>
                                            ) : null}
                                        </div>
                                        <p className="text-sm text-gray-500">
                                            {getLessonStatusLabel(lessonPlan)}
                                        </p>
                                    </div>

                                    <div className="grid grid-cols-1 gap-2 text-sm text-gray-700">
                                        <div>
                                            <span className="text-gray-500">Lesson Date:</span> {formatDate(getLessonDate(lessonPlan))}
                                        </div>
                                        <div>
                                            <span className="text-gray-500">Cohort:</span> {lessonPlan.cohort_name || '-'}
                                        </div>
                                        <div>
                                            <span className="text-gray-500">Subject:</span> {lessonPlan.subject_name || '-'}
                                        </div>
                                        <div>
                                            <span className="text-gray-500">Term:</span> {lessonPlan.term_name || '-'}
                                        </div>
                                        <div>
                                            <span className="text-gray-500">Teacher:</span> {teacherLabel(lessonPlan)}
                                        </div>
                                        <div>
                                            <span className="text-gray-500">Updated:</span> {formatUpdatedAt(lessonPlan.updated_at)}
                                        </div>
                                    </div>

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
                                    />
                                </div>
                            </Card>
                        ))}
                    </div>
                </>
            )}

            <Modal
                isOpen={isMarkUsedOpen}
                onClose={() => {
                    closeMarkUsed();
                    setReflection('');
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

                    <div className="flex flex-wrap justify-end gap-3">
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={() => {
                                closeMarkUsed();
                                setReflection('');
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
