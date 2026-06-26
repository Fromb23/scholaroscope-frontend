'use client';

import Link from 'next/link';
import { BookOpen } from 'lucide-react';
import { Badge } from '@/app/components/ui/Badge';
import { Button } from '@/app/components/ui/Button';
import { Card } from '@/app/components/ui/Card';
import { ActionMenu, type ActionMenuItem } from '@/app/components/ui/ActionMenu';
import type { CohortSubject } from '@/app/core/types/academic';
import type { CohortSubjectParticipationSummary } from '@/app/core/hooks/useCohortSubjectParticipation';

export interface CohortSubjectAction {
    label: string;
    href: string;
    variant?: 'primary' | 'secondary';
}

interface CohortSubjectParticipationSectionProps {
    cohortSubjects: CohortSubject[];
    summaries: Record<number, CohortSubjectParticipationSummary>;
    loading: boolean;
    error?: string | null;
    emptyMessage?: string;
    canManageInstructors?: boolean;
    canLinkSubjects?: boolean;
    linkSubjectsLabel?: string;
    linkSubjectsDisabledReason?: string | null;
    onLinkSubjects?: () => void;
    buildInstructorHref?: (subject: CohortSubject) => string;
    buildSubjectLearnersHref?: (subject: CohortSubject) => string;
    showInstructorColumn?: boolean;
    buildSubjectActions?: (subject: CohortSubject) => CohortSubjectAction[];
}

function getInstructorLabel(summary: CohortSubjectParticipationSummary | undefined) {
  if (!summary) {
    return 'Loading instructor...';
  }

  if (summary.instructorState === 'assigned') {
    return summary.instructorName ?? 'Assigned';
  }

  if (summary.instructorState === 'unassigned') {
    return 'No instructor assigned';
  }

  return 'Instructor unavailable';
}

function getParticipationCount(summary: CohortSubjectParticipationSummary | undefined) {
    if (!summary) {
        return 'Loading cohort subject participation...';
    }

    if (!summary.counts) {
        return 'Unavailable';
    }

    return String(summary.counts.enrolled);
}

export function buildCohortSubjectActionMenuItems({
    subjectLearnersHref,
    subjectActions,
    instructorHref,
}: {
    subjectLearnersHref: string;
    subjectActions: CohortSubjectAction[];
    instructorHref?: string | null;
}): ActionMenuItem[] {
    return [
        {
            label: 'Manage Subject Learners',
            href: subjectLearnersHref,
        },
        ...subjectActions.map((action) => ({
            label: action.label,
            href: action.href,
        })),
        ...(instructorHref ? [{
            label: 'Assign/Manage Instructor',
            href: instructorHref,
        }] : []),
    ];
}

export function CohortSubjectParticipationSection({
    cohortSubjects,
    summaries,
    loading,
    error,
    emptyMessage = 'No cohort subjects have been configured for this cohort yet. Add cohort subjects before managing subject participation.',
    canManageInstructors = false,
    canLinkSubjects = false,
    linkSubjectsLabel = 'Link Subject to Cohort',
    linkSubjectsDisabledReason = null,
    onLinkSubjects,
    buildInstructorHref,
    buildSubjectLearnersHref,
    showInstructorColumn = true,
    buildSubjectActions,
}: CohortSubjectParticipationSectionProps) {
    const linkSubjectsDisabled = Boolean(linkSubjectsDisabledReason);

    return (
        <section className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div className="space-y-1">
                    <h2 className="text-xl font-semibold text-gray-900">Subject Participation</h2>
                    <p className="text-sm text-gray-500">
                        {showInstructorColumn
                            ? 'Manage learner participation per cohort subject. Cohort placement only puts learners in the class; subject participation controls which subject sessions, attendance, assessments, and instructors apply to them.'
                            : 'Manage learner participation per cohort subject. Cohort placement only puts learners in the class; subject participation controls which subject sessions, attendance, and assessments apply to them.'}
                    </p>
                </div>
                {canLinkSubjects && onLinkSubjects ? (
                    <Button
                        type="button"
                        variant="secondary"
                        onClick={onLinkSubjects}
                        disabled={linkSubjectsDisabled}
                        title={linkSubjectsDisabledReason ?? undefined}
                        className="w-full sm:w-auto"
                    >
                        {linkSubjectsLabel}
                    </Button>
                ) : null}
            </div>

            <Card className="space-y-4">
                <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-700">
                    Cohort placement manages class membership only. Subject participation is managed per cohort subject below.
                </div>

                {linkSubjectsDisabledReason ? (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                        {linkSubjectsDisabledReason}
                    </div>
                ) : null}

                {error ? (
                    <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                        {error}
                    </div>
                ) : null}

                {loading ? (
                    <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-4 py-8 text-center text-sm text-gray-500">
                        Loading cohort subjects...
                    </div>
                ) : null}

                {!loading && cohortSubjects.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-4 py-8 text-center">
                        <p className="text-sm text-gray-500">
                            {emptyMessage}
                        </p>
                        {canLinkSubjects && onLinkSubjects && !linkSubjectsDisabled ? (
                            <div className="mt-4 flex justify-center">
                                <Button type="button" onClick={onLinkSubjects}>
                                    {linkSubjectsLabel}
                                </Button>
                            </div>
                        ) : null}
                    </div>
                ) : null}

                {!loading && cohortSubjects.length > 0 ? (
                    <div className="grid gap-4 md:grid-cols-2">
                        {cohortSubjects.map((subject) => {
                            const summary = summaries[subject.id];
                            const subjectActions = buildSubjectActions?.(subject) ?? [];
                            const subjectLearnersHref = buildSubjectLearnersHref?.(subject) ?? `/academic/cohort-subjects/${subject.id}/learners`;
                            const instructorHref = canManageInstructors && buildInstructorHref
                                ? buildInstructorHref(subject)
                                : null;
                            const mobileActionItems = buildCohortSubjectActionMenuItems({
                                subjectLearnersHref,
                                subjectActions,
                                instructorHref,
                            });

                            return (
                                <div
                                    key={subject.id}
                                    id={`subject-${subject.id}`}
                                    className="rounded-xl border border-gray-200 p-4"
                                >
                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <h3 className="text-base font-semibold text-gray-900">{subject.subject_name}</h3>
                                                <Badge variant="info">{subject.subject_code}</Badge>
                                                {subject.is_compulsory ? <Badge variant="default">Compulsory</Badge> : null}
                                            </div>

                                            <div className={`grid gap-2 text-sm text-gray-600 ${showInstructorColumn ? 'sm:grid-cols-2' : ''}`}>
                                                <div>
                                                    <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Participating Learners</p>
                                                    <p className="mt-1 font-semibold text-gray-900">{getParticipationCount(summary)}</p>
                                                </div>
                                                {showInstructorColumn ? (
                                                    <div>
                                                        <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Current Instructor</p>
                                                        <p className="mt-1 font-medium text-gray-900">{getInstructorLabel(summary)}</p>
                                                    </div>
                                                ) : null}
                                            </div>
                                        </div>

                                        <div className="sm:hidden">
                                            <ActionMenu
                                                items={mobileActionItems}
                                                buttonLabel="More"
                                                ariaLabel={`Open ${subject.subject_name} actions`}
                                                align="left"
                                                hideLabelOnMobile={false}
                                                menuClassName="min-w-[16rem]"
                                            />
                                        </div>

                                        <div className="hidden flex-wrap gap-2 sm:flex">
                                            <Link
                                                href={subjectLearnersHref}
                                                className="w-auto"
                                            >
                                                <Button>
                                                    <BookOpen className="mr-2 h-4 w-4" />
                                                    Manage Subject Learners
                                                </Button>
                                            </Link>
                                            {subjectActions.map((action) => (
                                                <Link
                                                    key={`${subject.id}:${action.href}`}
                                                    href={action.href}
                                                    className="w-auto"
                                                >
                                                    <Button
                                                        variant={action.variant === 'primary' ? 'primary' : 'secondary'}
                                                    >
                                                        {action.label}
                                                    </Button>
                                                </Link>
                                            ))}
                                            {instructorHref ? (
                                                <Link href={instructorHref} className="w-auto">
                                                    <Button variant="secondary">
                                                        Assign/Manage Instructor
                                                    </Button>
                                                </Link>
                                            ) : null}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : null}
            </Card>
        </section>
    );
}
