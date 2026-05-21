'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
    ArrowLeft,
    BookOpen,
    ChevronDown,
    ChevronRight,
    FileText,
    Layers,
    Target,
} from 'lucide-react';
import { useLearningOutcomes } from '@/app/plugins/cbc/hooks/useCBC';
import { useCBCBrowserStrandPage } from '@/app/plugins/cbc/hooks/useCBCBrowserStrandPage';
import {
    CBCNav,
    CBCBreadcrumb,
    CBCError,
    CBCLoading,
} from '@/app/plugins/cbc/components/CBCComponents';
import { Card } from '@/app/components/ui/Card';
import { Button } from '@/app/components/ui/Button';
import { Badge } from '@/app/components/ui/Badge';
import type { SubStrand } from '@/app/plugins/cbc/types/cbc';

function learningGoalsLabel(count: number) {
    return `${count} learning goal${count !== 1 ? 's' : ''}`;
}

function SubStrandOutcomes({ subStrand }: { subStrand: SubStrand }) {
    const { data: outcomes = [], isLoading } = useLearningOutcomes({ sub_strand: subStrand.id });

    if (isLoading) {
        return (
            <div className="py-6 text-center">
                <div className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
            </div>
        );
    }

    if (outcomes.length === 0) {
        return (
            <div className="px-4 py-6 text-center sm:px-5">
                <FileText className="mx-auto mb-2 h-8 w-8 theme-subtle" />
                <p className="text-sm theme-muted">No learning goals added yet</p>
            </div>
        );
    }

    return (
                <div className="divide-y divide-gray-200">
            {outcomes.map(outcome => (
                <div
                    key={outcome.id}
                    className="theme-hover-surface px-4 py-4 transition-colors sm:px-5"
                >
                    <div className="space-y-2">
                        <Badge
                            variant="indigo"
                            size="sm"
                            className="inline-flex max-w-full whitespace-normal break-all font-mono"
                            title={outcome.code}
                        >
                            {outcome.code}
                        </Badge>
                        <p className="break-words text-sm leading-6 theme-text">{outcome.description}</p>
                        <div className="flex flex-wrap gap-2">
                            {outcome.grade_name && (
                                <Badge variant="blue" size="sm">
                                    {outcome.grade_name}
                                </Badge>
                            )}
                            {outcome.evidence_count > 0 && (
                                <Badge variant="green" size="sm">
                                    {outcome.evidence_count} evidence
                                </Badge>
                            )}
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}

export function CBCBrowserStrandPage() {
    const { strandId: raw } = useParams<{ strandId: string }>();
    const strandId = Number(raw);
    const page = useCBCBrowserStrandPage(strandId);

    if (page.isLoading) {
        return (
            <div className="space-y-6">
                <CBCNav />
                <CBCLoading message="Loading strand…" />
            </div>
        );
    }

    if (page.error || !page.strand) {
        return (
            <div className="space-y-6">
                <CBCNav />
                <CBCError error={page.error ?? 'Strand not found'} onRetry={page.refetch} />
            </div>
        );
    }

    return (
        <div className="w-full max-w-full space-y-6 overflow-x-hidden">
            <CBCNav />
            <CBCBreadcrumb segments={[
                { label: 'CBC', href: '/cbc/browser' },
                { label: page.strand.name },
            ]} />

            <Link href="/cbc/browser">
                <Button variant="ghost" size="md">
                    <ArrowLeft className="mr-2 h-4 w-4" />Back to CBC
                </Button>
            </Link>

            <Card className="p-4 sm:p-6">
                <div className="flex flex-col items-start gap-4 sm:flex-row">
                    <div className="theme-info-surface w-full rounded-xl px-3 py-3 sm:w-auto sm:max-w-xs sm:shrink-0 sm:px-3.5 sm:py-3.5">
                        <span
                            className="block break-all text-lg font-mono font-bold text-blue-700 sm:text-xl"
                            title={page.strand.code}
                        >
                            {page.strand.code}
                        </span>
                    </div>
                    <div className="flex-1 min-w-0">
                        <h1 className="mb-2 text-2xl font-bold theme-text">{page.strand.name}</h1>
                        {page.strand.description && (
                            <p className="mb-3 theme-muted">{page.strand.description}</p>
                        )}
                        <div className="flex flex-wrap gap-x-4 gap-y-2 border-t pt-3 text-sm theme-muted theme-border">
                            <div className="flex items-center gap-1.5">
                                <BookOpen className="h-4 w-4 theme-subtle" />
                                <span>Curriculum: <span className="font-medium theme-text">
                                    {page.strand.curriculum_name}
                                </span></span>
                            </div>
                            {page.strand.subject_name && (
                                <div className="flex items-center gap-1.5">
                                    <Target className="h-4 w-4 theme-subtle" />
                                    <span>Subject: <span className="font-medium theme-text">
                                        {page.strand.subject_name}
                                    </span></span>
                                </div>
                            )}
                            <div className="flex items-center gap-1.5">
                                <Layers className="h-4 w-4 theme-subtle" />
                                <Badge variant="blue" size="sm">
                                    {page.strand.sub_strands.length} learning area
                                    {page.strand.sub_strands.length !== 1 ? 's' : ''}
                                </Badge>
                            </div>
                        </div>
                    </div>
                </div>
            </Card>

            <Card className="p-4 sm:p-6">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                    <Layers className="h-5 w-5 text-blue-600" />
                    <h2 className="text-lg font-semibold theme-text">Learning areas and goals</h2>
                    <Badge variant="blue" size="sm">
                        {page.strand.sub_strands.length} learning area
                        {page.strand.sub_strands.length !== 1 ? 's' : ''}
                    </Badge>
                </div>
                <p className="mb-5 text-sm theme-muted">
                    Open a learning area to see its goals.
                </p>

                <div className="space-y-3">
                    {page.strand.sub_strands.map(subStrand => {
                        const isOpen = page.expandedSubStrands.has(subStrand.id);
                        const actionLabel = isOpen ? 'Close' : 'Open';

                        return (
                            <div
                                key={subStrand.id}
                                className="theme-hover-border-strong overflow-hidden rounded-xl border theme-border transition-colors"
                            >
                                <button
                                    type="button"
                                    onClick={() => page.toggleSubStrand(subStrand.id)}
                                    aria-expanded={isOpen}
                                    aria-controls={`sub-strand-${subStrand.id}-goals`}
                                    aria-label={`${actionLabel} learning area ${subStrand.name}`}
                                    className="theme-surface-muted theme-hover-surface w-full px-4 py-4 text-left transition-all sm:px-5 sm:py-4"
                                >
                                    <div className="flex items-start gap-3">
                                        <div className="shrink-0 pt-0.5">
                                            {isOpen
                                                ? <ChevronDown className="h-5 w-5 text-blue-600" />
                                                : <ChevronRight className="h-5 w-5 theme-subtle" />
                                            }
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="text-sm font-medium theme-muted sm:hidden">
                                                {learningGoalsLabel(subStrand.outcomes_count)}
                                            </div>
                                            <div className="mt-3 flex flex-col gap-3 sm:mt-0 sm:flex-row sm:items-start sm:justify-between">
                                                <div className="min-w-0 flex-1 space-y-2">
                                                    <Badge
                                                        variant="purple"
                                                        size="md"
                                                        className="inline-flex max-w-full whitespace-normal break-all font-mono"
                                                        title={subStrand.code}
                                                    >
                                                        {subStrand.code}
                                                    </Badge>
                                                    <div className="min-w-0">
                                                        <p className="break-words text-base font-semibold leading-6 theme-text">
                                                            {subStrand.name}
                                                        </p>
                                                        {subStrand.description && (
                                                            <p className="mt-1 break-words text-sm leading-6 theme-muted">
                                                                {subStrand.description}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                                <Badge
                                                    variant="default"
                                                    size="sm"
                                                    className="hidden shrink-0 self-start sm:inline-flex"
                                                >
                                                    {learningGoalsLabel(subStrand.outcomes_count)}
                                                </Badge>
                                            </div>
                                        </div>
                                    </div>
                                </button>

                                <div
                                    id={`sub-strand-${subStrand.id}-goals`}
                                    className="theme-surface border-t theme-border"
                                    hidden={!isOpen}
                                >
                                    {isOpen && (
                                        <SubStrandOutcomes subStrand={subStrand} />
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </Card>
        </div>
    );
}
