'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, BookOpen, ExternalLink, Plus } from 'lucide-react';
import { getSubjectProfileExtensions, SubjectSlotContext } from '@/app/core/registry/subjectSlot';
import { useSubjectDetail } from '@/app/core/hooks/useAcademic';
import { useAuth } from '@/app/context/AuthContext';
import { isAdminOrAbove } from '@/app/utils/permissions';
import { LoadingSpinner } from '@/app/components/ui/LoadingSpinner';
import { ErrorBanner } from '@/app/components/ui/ErrorBanner';
import { Card } from '@/app/components/ui/Card';
import { Badge } from '@/app/components/ui/Badge';
import { Button } from '@/app/components/ui/Button';
import { AssignSubjectToCohortModal } from '@/app/core/components/academic/AssignSubjectToCohortModal';

export function SubjectDetailPage() {
    const params = useParams();
    const router = useRouter();
    const { user, activeRole } = useAuth();
    const [assignOpen, setAssignOpen] = useState(false);

    const rawId = params?.id;
    const subjectId = Array.isArray(rawId)
        ? parseInt(rawId[0], 10)
        : parseInt(rawId as string, 10);

    const { subject, loading, error, refetch } = useSubjectDetail(
        Number.isFinite(subjectId) && subjectId > 0 ? subjectId : null
    );
    const canManageSubjectLinks = isAdminOrAbove(user, activeRole);
    const canManageSubjectParticipation = isAdminOrAbove(user, activeRole);

    if (loading) return <LoadingSpinner message="Loading subject..." />;

    if (error) {
        return (
            <ErrorBanner
                onDismiss={() => router.back()}
                message={error}
            />
        );
    }

    if (isNaN(subjectId) || !subject) {
        return (
            <ErrorBanner
                onDismiss={() => router.back()}
                message="Subject not found"
            />
        );
    }

    const ctx: SubjectSlotContext = {
        subjectId: subject.id,
        curriculum_type: subject.curriculum_type,
    };

    const extensions = getSubjectProfileExtensions(ctx);

    return (
        <div className="mx-auto max-w-5xl space-y-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-3">
                    <Link href="/academic/subjects" className="inline-flex">
                        <Button variant="ghost" size="sm">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back to Subjects
                        </Button>
                    </Link>

                    <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="info">{subject.code}</Badge>
                            <Badge variant="default">{subject.level}</Badge>
                            <Badge variant="default">{subject.curriculum_name}</Badge>
                        </div>
                        <div className="flex items-center gap-3">
                            <BookOpen className="h-6 w-6 text-blue-600" />
                            <h1 className="text-3xl font-bold text-gray-900">{subject.name}</h1>
                        </div>
                    </div>
                </div>

                {canManageSubjectLinks ? (
                    <Button type="button" onClick={() => setAssignOpen(true)} className="w-full lg:w-auto">
                        <Plus className="mr-2 h-4 w-4" />
                        Link Subject to Cohort
                    </Button>
                ) : null}
            </div>

            <Card>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <div>
                        <p className="text-sm text-gray-500">Curriculum</p>
                        <p className="mt-1 font-semibold text-gray-900">{subject.curriculum_name}</p>
                    </div>
                    <div>
                        <p className="text-sm text-gray-500">Level</p>
                        <p className="mt-1 font-semibold text-gray-900">{subject.level}</p>
                    </div>
                    <div>
                        <p className="text-sm text-gray-500">Code</p>
                        <p className="mt-1 font-semibold text-gray-900">{subject.code}</p>
                    </div>
                    <div>
                        <p className="text-sm text-gray-500">Linked Cohorts</p>
                        <p className="mt-1 font-semibold text-gray-900">{subject.cohorts_offering.length}</p>
                    </div>
                </div>

                {subject.description ? (
                    <div className="mt-6 border-t border-gray-100 pt-6">
                        <p className="text-sm text-gray-500">Description</p>
                        <p className="mt-2 text-sm text-gray-700">{subject.description}</p>
                    </div>
                ) : null}
            </Card>

            <section className="space-y-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                    <div className="space-y-1">
                        <h2 className="text-xl font-semibold text-gray-900">Cohort Offerings</h2>
                        <p className="text-sm text-gray-500">
                            {canManageSubjectParticipation
                                ? 'Each linked cohort creates a cohort subject offering that can manage its own learners.'
                                : 'Read-only summary of the cohort subject offerings linked to this subject.'}
                        </p>
                    </div>
                    {canManageSubjectLinks ? (
                        <Button type="button" variant="secondary" onClick={() => setAssignOpen(true)} className="w-full sm:w-auto">
                            Link Subject to Cohort
                        </Button>
                    ) : null}
                </div>

                {subject.cohorts_offering.length === 0 ? (
                    <Card>
                        <div className="space-y-4 rounded-lg border border-dashed border-gray-200 bg-gray-50 px-4 py-8 text-center">
                            <p className="text-sm text-gray-500">This subject is not linked to any cohort yet.</p>
                            {canManageSubjectLinks ? (
                                <div className="flex justify-center">
                                    <Button type="button" onClick={() => setAssignOpen(true)}>
                                        Link Subject to Cohort
                                    </Button>
                                </div>
                            ) : null}
                        </div>
                    </Card>
                ) : (
                    <div className="grid gap-4 md:grid-cols-2">
                        {subject.cohorts_offering.map((offering) => (
                            <Card key={`${offering.cohort_id}-${offering.cohort_subject_id ?? 'offering'}`} className="space-y-4">
                                <div className="space-y-2">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <h3 className="text-base font-semibold text-gray-900">{offering.cohort_name}</h3>
                                        <Badge variant={offering.is_compulsory ? 'default' : 'info'}>
                                            {offering.is_compulsory ? 'Compulsory' : 'Optional'}
                                        </Badge>
                                        {offering.academic_year_name ? (
                                            <Badge variant="default">{offering.academic_year_name}</Badge>
                                        ) : null}
                                    </div>
                                    {typeof offering.learner_count === 'number' || typeof offering.available_count === 'number' ? (
                                        <div className="flex flex-wrap gap-3 text-sm text-gray-500">
                                            {typeof offering.learner_count === 'number' ? (
                                                <span>Enrolled: {offering.learner_count}</span>
                                            ) : null}
                                            {typeof offering.available_count === 'number' ? (
                                                <span>Available: {offering.available_count}</span>
                                            ) : null}
                                        </div>
                                    ) : null}
                                </div>

                                <div className="flex flex-col gap-2 sm:flex-row">
                                    {offering.cohort_subject_id && canManageSubjectParticipation ? (
                                        <Link
                                            href={`/academic/cohort-subjects/${offering.cohort_subject_id}/learners`}
                                            className="w-full sm:w-auto"
                                        >
                                            <Button className="w-full sm:w-auto">
                                                Manage Learners
                                            </Button>
                                        </Link>
                                    ) : null}
                                    <Link href={`/academic/cohorts/${offering.cohort_id}`} className="w-full sm:w-auto">
                                        <Button variant="secondary" className="w-full sm:w-auto">
                                            Open Cohort
                                            <ExternalLink className="ml-2 h-4 w-4" />
                                        </Button>
                                    </Link>
                                </div>
                            </Card>
                        ))}
                    </div>
                )}
            </section>

            {extensions.length > 0 ? (
                <section className="space-y-3">
                    <div className="space-y-1">
                        <h2 className="text-xl font-semibold text-gray-900">Curriculum Tools</h2>
                        <p className="text-sm text-gray-500">Open any subject-specific curriculum workflows registered for this subject.</p>
                    </div>
                    <div className="flex flex-wrap gap-3">
                        {extensions.map((ext) => (
                            <a
                                key={ext.key}
                                href={ext.href(ctx)}
                                className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
                            >
                                {ext.label}
                            </a>
                        ))}
                    </div>
                </section>
            ) : null}

            <AssignSubjectToCohortModal
                isOpen={assignOpen}
                onClose={() => setAssignOpen(false)}
                subject={subject}
                onAssigned={async () => {
                    await refetch();
                }}
            />
        </div>
    );
}
