'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import {
    ArrowLeft,
    BookOpen,
    ChevronRight,
    Filter,
    Target,
    TrendingUp,
    Users,
} from 'lucide-react';
import { useCBCProgressPage } from '@/app/plugins/cbc/hooks/useCBCProgressPage';
import { useAssistantPageContext } from '@/app/core/components/assistant/useAssistantPageContext';
import {
    CBCNav,
    CBCError,
    CBCLoading,
    CBCEmpty,
    SubjectGroupPicker,
} from '@/app/plugins/cbc/components/CBCComponents';
import { Card } from '@/app/components/ui/Card';
import { Badge } from '@/app/components/ui/Badge';
import { StatsCard } from '@/app/components/dashboard/StatsCard';
import { Button } from '@/app/components/ui/Button';
import { Select } from '@/app/components/ui/Select';
import { getAcademicLevelLabel } from '@/app/core/lib/curriculumLevels';
import { CBCProgressSkeleton } from './CBCProgressSkeleton';
import {
    buildCbcPath,
    buildCurrentCbcWorkspaceHref,
    getCbcBackLabel,
    sanitizeInternalReturnTo,
} from '@/app/plugins/cbc/lib/navigation';
import type { Cohort } from '@/app/core/types/academic';

function formatLevelLabel(level: string | null | undefined) {
    return (level ?? '')
        .replace('grade', 'Grade ')
        .replace(/(\d+)/, ' $1')
        .replace(/\s+/, ' ')
        .trim();
}

function getCohortDisplayLabel(cohort: { name?: string | null } | null | undefined) {
    const name = cohort?.name?.trim();
    return name || 'Selected class';
}

function getCohortMetaBadges(cohort: unknown) {
    const value = (cohort ?? null) as {
        level?: string | null;
        curriculum_type?: string | null;
        academic_year_name?: string | null;
    } | null;
    if (!value) return [];

    const items: string[] = [];
    const levelLabel = value.level
        ? getAcademicLevelLabel(value.level, value.curriculum_type ?? 'CBE')
        : null;

    if (levelLabel) items.push(levelLabel);
    if (value.academic_year_name) items.push(value.academic_year_name);

    return items;
}

function getSubStrandCount(strand: {
    sub_strands?: Array<{ outcomes_count?: number | null }>;
    sub_strands_count?: number | null;
}) {
    const explicitCount = strand.sub_strands_count ?? 0;
    const nestedCount = strand.sub_strands?.length ?? 0;
    return Math.max(explicitCount, nestedCount);
}

function getOutcomeCount(strand: {
    sub_strands?: Array<{ outcomes_count?: number | null }>;
}) {
    return strand.sub_strands?.reduce(
        (sum, subStrand) => sum + (subStrand.outcomes_count ?? 0),
        0
    ) ?? 0;
}

export function CBCProgressPage() {
    const page = useCBCProgressPage();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const firstVisibleStrand = page.visibleStrands[0];
    const firstVisibleStrandId = firstVisibleStrand?.id ?? null;
    const firstVisibleStrandSubjectId = firstVisibleStrand?.subject_org_id
        ?? firstVisibleStrand?.subject
        ?? null;
    const resolvedInstructorSubjectId = page.resolvedInstructorSubjectSelection?.subject_ids[0] ?? null;
    const currentWorkspaceHref = buildCurrentCbcWorkspaceHref(pathname, searchParams);
    const safeReturnTo = sanitizeInternalReturnTo(searchParams.get('returnTo'));
    const backLabel = getCbcBackLabel(safeReturnTo, 'Back');
    const cbcBrowserHref = buildCbcPath('/cbc/browser', {
        cohort: page.effectiveCohortId,
        subject: page.resolvedSubject?.id ?? null,
        cohortSubjectId: page.resolvedInstructorSubjectSelection?.cohort_subject_id ?? null,
        returnTo: safeReturnTo,
    });
    const assistantContext = useMemo(() => ({
        pageKey: 'cbc_progress',
        pageTitle: 'Learning Progress',
        state: {
            selected_subject: page.resolvedSubject?.name ?? '',
            selected_cohort: page.effectiveCohort?.name ?? '',
            has_subject_filter: page.subjectsForCurriculum.length > 0,
            has_cohort_filter: (page.isAdmin ? page.cohorts.length : page.assignedCohorts.length) > 0,
            is_empty: !page.isLoading && page.visibleStrands.length === 0,
            is_loading: page.isLoading,
            mastery_summary: page.selectedCurriculumId ? page.stats : undefined,
        },
        visibleActions: [
            {
                label: 'Browse CBC',
                type: 'navigate' as const,
                href: cbcBrowserHref,
            },
            {
                label: 'Open CBC Teaching',
                type: 'navigate' as const,
                href: '/cbc/teaching',
            },
            {
                label: 'Open CBC Sessions',
                type: 'navigate' as const,
                href: '/cbc/teaching/sessions',
            },
            {
                label: 'Open CBC Results',
                type: 'navigate' as const,
                href: '/cbc/assessment-results',
            },
            ...(firstVisibleStrandId
                ? [{
                    label: 'Open progress strand',
                    type: 'navigate' as const,
                    href: buildCbcPath(`/cbc/progress/strand/${firstVisibleStrandId}`, {
                        cohort: page.effectiveCohortId,
                        subject: page.isAdmin
                            ? firstVisibleStrandSubjectId
                            : (
                                resolvedInstructorSubjectId
                                ?? firstVisibleStrandSubjectId
                            ),
                        cohortSubjectId: page.resolvedInstructorSubjectSelection?.cohort_subject_id ?? null,
                        returnTo: currentWorkspaceHref,
                    }),
                }]
                : []),
        ],
        nextSafeAction: firstVisibleStrandId
            ? {
                label: 'Open progress strand',
                type: 'navigate' as const,
                href: buildCbcPath(`/cbc/progress/strand/${firstVisibleStrandId}`, {
                    cohort: page.effectiveCohortId,
                    subject: page.isAdmin
                        ? firstVisibleStrandSubjectId
                        : (
                            resolvedInstructorSubjectId
                            ?? firstVisibleStrandSubjectId
                        ),
                    cohortSubjectId: page.resolvedInstructorSubjectSelection?.cohort_subject_id ?? null,
                    returnTo: currentWorkspaceHref,
                }),
            }
            : undefined,
        workflowStep: firstVisibleStrandId ? 'review_cbc_progress' : 'resolve_progress_context',
        emptyStateReason: !page.isLoading && page.visibleStrands.length === 0
            ? 'No CBC progress strands match the current context.'
            : undefined,
    }), [
        cbcBrowserHref,
        currentWorkspaceHref,
        firstVisibleStrandId,
        firstVisibleStrandSubjectId,
        page.assignedCohorts.length,
        page.cohorts.length,
        page.effectiveCohortId,
        page.effectiveCohort?.name,
        page.isAdmin,
        page.isLoading,
        page.resolvedInstructorSubjectSelection?.cohort_subject_id,
        resolvedInstructorSubjectId,
        page.resolvedSubject?.name,
        page.selectedCurriculumId,
        page.stats,
        page.subjectsForCurriculum.length,
        page.visibleStrands.length,
    ]);

    useAssistantPageContext(assistantContext);

    if (page.isLoading) {
        return (
            <div className="space-y-6">
                <CBCNav />
                <CBCLoading message="Loading CBC progress for your teaching context..." />
                <CBCProgressSkeleton />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <CBCNav />

            {safeReturnTo ? (
                <div>
                    <Link href={safeReturnTo}>
                        <Button variant="ghost" size="sm">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            {backLabel}
                        </Button>
                    </Link>
                </div>
            ) : null}

            <div className="flex items-center gap-4">
                <div className="p-3 bg-gradient-to-br from-purple-100 to-pink-100 rounded-xl">
                    <TrendingUp className="h-8 w-8 text-purple-600" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Learning Progress</h1>
                    <p className="text-gray-500 mt-1">See how learners are progressing across what you teach</p>
                </div>
            </div>

            {!page.isAdmin && page.hasVisibleProfiles && (
                <Card className="border-purple-100 bg-purple-50 p-4">
                    <div className="flex flex-wrap items-start gap-6">
                        <div className="space-y-2">
                            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                                Subject
                            </p>
                            {page.resolvedSubject ? (
                                <div className="flex flex-wrap gap-2">
                                    <Badge variant="purple" size="md">{page.resolvedSubject.name}</Badge>
                                    <Badge variant="blue" size="md">
                                        {formatLevelLabel(page.resolvedSubject.level)}
                                    </Badge>
                                </div>
                            ) : (
                                <p className="text-sm text-gray-600">Across your assigned subjects</p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                                Class
                            </p>
                            {page.effectiveCohort ? (
                                <div className="flex flex-wrap gap-2">
                                    <Badge variant="indigo" size="md">
                                        {getCohortDisplayLabel(page.effectiveCohort)}
                                    </Badge>
                                    {getCohortMetaBadges(page.effectiveCohort).map((item) => (
                                        <Badge key={item} variant="default" size="md">
                                            {item}
                                        </Badge>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-sm text-gray-600">
                                    Across {page.assignedCohorts.length} assigned class
                                    {page.assignedCohorts.length !== 1 ? 's' : ''}
                                </p>
                            )}
                        </div>
                    </div>
                </Card>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                <div className="lg:col-span-1 space-y-4">
                    <Card>
                        <div className="flex items-center gap-2 mb-3">
                            <Filter className="h-4 w-4 text-gray-400" />
                            <h3 className="text-sm font-semibold text-gray-900">Class</h3>
                        </div>
                        <Select
                            label=""
                            value={page.effectiveCohort?.id.toString() ?? page.effectiveCohortId?.toString() ?? ''}
                            onChange={event => page.handleCohortChange(
                                event.target.value ? Number(event.target.value) : null
                            )}
                            options={[
                                { value: '', label: 'All classes' },
                                ...(page.isAdmin ? page.cohorts : page.assignedCohorts).map(
                                    (cohort: Cohort | { id: number; name: string }) => ({
                                        value: String(cohort.id),
                                        label: cohort.name,
                                    })
                                ),
                            ]}
                        />
                    </Card>

                    <Card>
                        <div className="flex items-center gap-2 mb-3">
                            <BookOpen className="h-4 w-4 text-gray-400" />
                            <h3 className="text-sm font-semibold text-gray-900">
                                {page.isAdmin ? 'Subject' : 'My Subject'}
                            </h3>
                        </div>
                        <SubjectGroupPicker
                            subjects={page.subjectsForCurriculum}
                            selectedSubjectId={page.resolvedSubject?.id ?? null}
                            onSelect={page.setSelectedSubjectFilterId}
                            showAllOption={page.isAdmin || page.subjectsForCurriculum.length > 1}
                            autoExpandSelected={!page.isAdmin}
                            mode={page.isAdmin ? 'catalog' : 'instructor'}
                            instructorSelections={page.instructorSubjectSelections}
                        />
                    </Card>
                </div>

                <div className="lg:col-span-3 space-y-4">
                    {page.selectedCurriculumId && !page.error && (
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            <StatsCard title="Strands" value={page.stats.strands} icon={BookOpen} color="blue" />
                            <StatsCard title="Sub-Strands" value={page.stats.subStrands} icon={TrendingUp} color="green" />
                            <StatsCard title="Learning Goals" value={page.stats.outcomes} icon={Target} color="purple" />
                            <StatsCard title="Subjects" value={page.stats.subjects} icon={Users} color="orange" />
                        </div>
                    )}

                    {page.error && <CBCError error={page.error} onRetry={page.refetch} />}

                    <Card>
                        <div className="mb-4">
                            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                                <Target className="h-5 w-5 text-blue-600" />
                                Strands
                                {page.visibleStrands.length > 0 && (
                                    <Badge variant="blue" size="sm">{page.visibleStrands.length}</Badge>
                                )}
                            </h2>
                            <p className="text-sm text-gray-500 mt-1">
                                Open a strand to view sub-strands and learning goals.
                            </p>
                        </div>

                        {!page.isAdmin && !page.hasVisibleProfiles ? (
                            <CBCEmpty
                                icon={BookOpen}
                                title="No class subjects are assigned to you yet."
                                description="Assigned CBC class subjects will appear here."
                            />
                        ) : page.visibleStrands.length === 0 ? (
                            <CBCEmpty
                                icon={Target}
                                title="No Strands Found"
                                description="No strands match the selected filters"
                            />
                        ) : (
                            <div className="space-y-1">
                                {page.visibleStrands.map(strand => {
                                    const subStrandCount = getSubStrandCount(strand);
                                    const outcomeCount = getOutcomeCount(strand);
                                    const subjectParam = page.isAdmin
                                        ? (strand.subject_org_id ?? '')
                                        : (
                                            page.resolvedInstructorSubjectSelection?.subject_ids[0]
                                            ?? strand.subject_org_id
                                            ?? strand.subject
                                            ?? ''
                                        );

                                    return (
                                        <Link
                                            key={strand.id}
                                            href={buildCbcPath(`/cbc/progress/strand/${strand.id}`, {
                                                cohort: page.effectiveCohortId,
                                                subject: subjectParam,
                                                cohortSubjectId: page.resolvedInstructorSubjectSelection?.cohort_subject_id ?? null,
                                                returnTo: currentWorkspaceHref,
                                            })}
                                            className="flex items-center justify-between hover:bg-gray-50 -mx-2 px-2 py-3 rounded-lg transition-colors group"
                                        >
                                            <div className="flex items-center gap-3 min-w-0">
                                                <Badge variant="blue" size="sm" className="font-mono shrink-0">
                                                    {strand.code}
                                                </Badge>
                                                <span className="font-medium text-gray-900 truncate">
                                                    {strand.name}
                                                </span>
                                                {!page.effectiveCohortId && !strand.is_assigned && (
                                                    <Badge variant="warning" size="sm" className="shrink-0">
                                                        No class yet
                                                    </Badge>
                                                )}
                                            </div>

                                            <div className="flex items-center gap-3 shrink-0 ml-4">
                                                <span className="text-sm text-gray-500">
                                                    {subStrandCount} sub-strands · {outcomeCount} learning goals
                                                </span>
                                                <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-blue-600 transition-colors" />
                                            </div>
                                        </Link>
                                    );
                                })}
                            </div>
                        )}
                    </Card>
                </div>
            </div>
        </div>
    );
}
