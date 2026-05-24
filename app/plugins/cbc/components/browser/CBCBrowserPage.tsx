'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { BookOpen, ChevronRight, Layers, Search } from 'lucide-react';
import { useCBCBrowserPage } from '@/app/plugins/cbc/hooks/useCBCBrowserPage';
import { useAssistantPageContext } from '@/app/core/components/assistant/useAssistantPageContext';
import {
    CBCNav,
    CBCError,
    CBCLoading,
    CBCEmpty,
    SubjectGroupPicker,
} from '@/app/plugins/cbc/components/CBCComponents';
import { GuidedCohortSetupModal } from '@/app/plugins/cbc/components/GuidedCohortSetupModal';
import { Card } from '@/app/components/ui/Card';
import { Input } from '@/app/components/ui/Input';
import { Badge } from '@/app/components/ui/Badge';

function formatLevelLabel(level: string | null | undefined) {
    return (level ?? '')
        .replace('grade', 'Grade ')
        .replace(/(\d+)/, ' $1')
        .replace(/\s+/, ' ')
        .trim();
}

export function CBCBrowserPage() {
    const page = useCBCBrowserPage();
    const firstVisibleStrand = page.visible[0];
    const firstVisibleStrandId = firstVisibleStrand?.id;
    const contextParams = new URLSearchParams();
    if (page.effectiveCohortId) {
        contextParams.set('cohort', String(page.effectiveCohortId));
    }
    if (page.resolvedSubject?.id) {
        contextParams.set('subject', String(page.resolvedSubject.id));
    }
    const contextQuery = contextParams.toString();
    const cbcProgressHref = contextQuery ? `/cbc/progress?${contextQuery}` : '/cbc/progress';
    const selectedSubjectName = page.resolvedSubject?.name ?? '';
    const selectedCohortName = page.effectiveCohort?.name ?? '';
    const hasSubjectFilter = page.subjectsForCurriculum.length > 0;
    const isEmpty = !page.isLoading && page.visible.length === 0;
    const assistantContext = useMemo(() => ({
        pageKey: 'cbc_browser',
        pageTitle: 'Curriculum Browser',
        state: {
            selected_subject: selectedSubjectName,
            selected_cohort: selectedCohortName,
            has_subject_filter: hasSubjectFilter,
            has_cohort_filter: false,
            is_empty: isEmpty,
            is_loading: page.isLoading,
        },
        visibleActions: [
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
                label: 'Open CBC Progress',
                type: 'navigate' as const,
                href: cbcProgressHref,
            },
            {
                label: 'Open CBC Results',
                type: 'navigate' as const,
                href: '/cbc/assessment-results',
            },
            ...(firstVisibleStrandId
                ? [{
                    label: 'Open strand',
                    type: 'navigate' as const,
                    href: `/cbc/browser/strands/${firstVisibleStrandId}`,
                }]
                : []),
        ],
        nextSafeAction: firstVisibleStrandId
            ? {
                label: 'Open strand',
                type: 'navigate' as const,
                href: `/cbc/browser/strands/${firstVisibleStrandId}`,
            }
            : undefined,
        workflowStep: firstVisibleStrandId ? 'browse_strands' : 'resolve_cbc_context',
        emptyStateReason: isEmpty
            ? 'No CBC strands match the current context.'
            : undefined,
    }), [
        cbcProgressHref,
        firstVisibleStrandId,
        hasSubjectFilter,
        isEmpty,
        page.isLoading,
        selectedCohortName,
        selectedSubjectName,
    ]);

    useAssistantPageContext(assistantContext);

    if (page.isLoading) {
        return <CBCLoading message="Loading your assignments…" />;
    }

    return (
        <div className="space-y-6">
            <CBCNav />

            <div className="flex items-center gap-4">
                <div className="theme-info-surface rounded-xl p-3">
                    <BookOpen className="h-8 w-8 text-blue-600" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold theme-text">Curriculum Browser</h1>
                    <p className="mt-1 theme-muted">Explore strands, sub-strands, and learning outcomes</p>
                </div>
            </div>

            {!page.isAdmin && page.hasVisibleProfiles && (
                <Card className="theme-info-surface p-4">
                    <div className="flex flex-wrap items-start gap-6">
                        <div className="space-y-2">
                            <p className="text-xs font-semibold uppercase tracking-wide theme-subtle">
                                Resolved CBC Subject
                            </p>
                            {page.resolvedSubject ? (
                                <div className="flex flex-wrap gap-2">
                                    <Badge variant="purple" size="md">{page.resolvedSubject.name}</Badge>
                                    <Badge variant="blue" size="md">
                                        {formatLevelLabel(page.resolvedSubject.level)}
                                    </Badge>
                                </div>
                            ) : (
                                <p className="text-sm theme-muted">Across assigned CBC subjects</p>
                            )}
                        </div>
                        <div className="space-y-2">
                            <p className="text-xs font-semibold uppercase tracking-wide theme-subtle">
                                Cohort Context
                            </p>
                            {page.effectiveCohort ? (
                                <div className="flex flex-wrap gap-2">
                                    <Badge variant="indigo" size="md">{page.effectiveCohort.name}</Badge>
                                    <Badge variant="default" size="md">Cohort {page.effectiveCohort.id}</Badge>
                                </div>
                            ) : (
                                <p className="text-sm theme-muted">
                                    Across {page.assignedCohorts.length} assigned CBC cohort
                                    {page.assignedCohorts.length !== 1 ? 's' : ''}
                                </p>
                            )}
                        </div>
                    </div>
                </Card>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                <div className="lg:col-span-1">
                    <Card>
                        <div className="flex items-center gap-2 mb-3">
                            <BookOpen className="h-4 w-4 theme-subtle" />
                            <h3 className="text-sm font-semibold theme-text">
                                {page.isAdmin ? 'Subject' : 'My CBC Subject'}
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
                    <div className="flex items-center gap-4">
                        <div className="flex-1">
                            <Input
                                label=""
                                value={page.search}
                                onChange={event => page.setSearch(event.target.value)}
                                placeholder="Search strands…"
                            />
                        </div>
                        <p className="shrink-0 whitespace-nowrap text-sm theme-muted">
                            <span className="font-semibold theme-text">{page.visible.length}</span>{' '}
                            strand{page.visible.length !== 1 ? 's' : ''}
                        </p>
                    </div>

                    {page.error ? (
                        <CBCError
                            error={page.error}
                            onRetry={page.refetch}
                            debugContext={page.error === page.strandsError ? page.strandFetchDebugContext : null}
                        />
                    ) : !page.isAdmin && !page.hasVisibleProfiles ? (
                        <Card>
                            <CBCEmpty
                                icon={BookOpen}
                                title="No CBC Subjects Attached"
                                description="No CBC subjects are attached to your assigned cohorts."
                            />
                        </Card>
                    ) : page.visible.length === 0 ? (
                        <Card>
                            <CBCEmpty
                                icon={Search}
                                title="No Strands Found"
                                description={
                                    page.effectiveCohortId
                                        ? 'No strands are available for the selected cohort.'
                                        : 'No strands match your current filters.'
                                }
                            />
                        </Card>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {page.visible.map(strand => (
                                <Link
                                    key={strand.id}
                                    href={`/cbc/browser/strands/${strand.id}`}
                                    className="block group"
                                >
                                    <Card className="theme-hover-border-strong h-full transition-all duration-200 hover:shadow-md">
                                        <div className="flex flex-col h-full">
                                            <div className="flex items-start justify-between mb-3">
                                                <div className="flex items-center gap-2 min-w-0 flex-1 flex-wrap">
                                                    <Badge variant="blue" size="md" className="font-mono shrink-0">
                                                        {strand.code}
                                                    </Badge>
                                                    {strand.subject_name && (
                                                        <Badge variant="purple" size="sm" className="truncate">
                                                            {strand.subject_name}
                                                        </Badge>
                                                    )}
                                                </div>
                                                <ChevronRight className="h-5 w-5 shrink-0 theme-subtle transition-colors group-hover:text-blue-600" />
                                            </div>
                                            <div className="flex-1">
                                                <h3 className="mb-2 line-clamp-2 font-semibold theme-text transition-colors group-hover:text-blue-600">
                                                    {strand.name}
                                                </h3>
                                                {strand.description && (
                                                    <p className="line-clamp-2 text-sm theme-muted">
                                                        {strand.description}
                                                    </p>
                                                )}
                                            </div>
                                            <div className="mt-4 flex items-center gap-1.5 border-t pt-4 theme-border">
                                                <Layers className="h-4 w-4 theme-subtle" />
                                                <span className="text-sm theme-muted">
                                                    <span className="font-semibold theme-text">
                                                        {strand.sub_strands_count}
                                                    </span>
                                                    {' '}sub-strand{strand.sub_strands_count !== 1 ? 's' : ''}
                                                </span>
                                                {!strand.is_assigned && (
                                                    <button
                                                        onClick={event => {
                                                            event.stopPropagation();
                                                            event.preventDefault();
                                                            page.setSetupStrand(strand);
                                                        }}
                                                        className="ml-auto shrink-0"
                                                    >
                                                        <Badge variant="warning" size="sm" className="cursor-pointer hover:opacity-90">
                                                            No cohort yet — fix
                                                        </Badge>
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </Card>
                                </Link>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {page.setupStrand && (
                <GuidedCohortSetupModal
                    strand={page.setupStrand}
                    subjectLevel={page.setupStrand.subject_level ?? ''}
                    onComplete={page.refetch}
                    onClose={() => page.setSetupStrand(null)}
                />
            )}
        </div>
    );
}
