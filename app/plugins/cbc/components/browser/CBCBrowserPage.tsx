'use client';

import Link from 'next/link';
import { BookOpen, ChevronRight, Layers, Search } from 'lucide-react';
import { useCBCBrowserPage } from '@/app/plugins/cbc/hooks/useCBCBrowserPage';
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

    if (page.isLoading) {
        return <CBCLoading message="Loading your assignments…" />;
    }

    return (
        <div className="space-y-6">
            <CBCNav />

            <div className="flex items-center gap-4">
                <div className="p-3 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-xl">
                    <BookOpen className="h-8 w-8 text-blue-600" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Curriculum Browser</h1>
                    <p className="text-gray-500 mt-1">Explore strands, sub-strands, and learning outcomes</p>
                </div>
            </div>

            {!page.isAdmin && page.hasVisibleProfiles && (
                <Card className="border-blue-100 bg-blue-50 p-4">
                    <div className="flex flex-wrap items-start gap-6">
                        <div className="space-y-2">
                            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
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
                                <p className="text-sm text-gray-600">Across assigned CBC subjects</p>
                            )}
                        </div>
                        <div className="space-y-2">
                            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                                Cohort Context
                            </p>
                            {page.effectiveCohort ? (
                                <div className="flex flex-wrap gap-2">
                                    <Badge variant="indigo" size="md">{page.effectiveCohort.name}</Badge>
                                    <Badge variant="default" size="md">Cohort {page.effectiveCohort.id}</Badge>
                                </div>
                            ) : (
                                <p className="text-sm text-gray-600">
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
                            <BookOpen className="h-4 w-4 text-gray-400" />
                            <h3 className="text-sm font-semibold text-gray-900">
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
                        <p className="text-sm text-gray-500 whitespace-nowrap shrink-0">
                            <span className="font-semibold text-gray-900">{page.visible.length}</span>{' '}
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
                                    <Card className="h-full hover:shadow-md hover:border-blue-200 transition-all duration-200">
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
                                                <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-blue-600 shrink-0 transition-colors" />
                                            </div>
                                            <div className="flex-1">
                                                <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2 group-hover:text-blue-600 transition-colors">
                                                    {strand.name}
                                                </h3>
                                                {strand.description && (
                                                    <p className="text-sm text-gray-600 line-clamp-2">
                                                        {strand.description}
                                                    </p>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-1.5 mt-4 pt-4 border-t border-gray-100">
                                                <Layers className="h-4 w-4 text-gray-400" />
                                                <span className="text-sm text-gray-600">
                                                    <span className="font-semibold text-gray-900">
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
                                                        <Badge variant="warning" size="sm" className="cursor-pointer hover:bg-yellow-100">
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
