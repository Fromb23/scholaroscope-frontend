'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { useParams } from 'next/navigation';
import { Target } from 'lucide-react';
import { useSessionOutcomes } from '@/app/plugins/cbc/hooks/useSessionOutcomes';
import { useAssistantPageContext } from '@/app/core/components/assistant/useAssistantPageContext';
import { SessionHeader } from '@/app/plugins/cbc/components/outcomes/SessionHeader';
import { OutcomeRow } from '@/app/plugins/cbc/components/outcomes/OutcomeRow';
import { OutcomeFilterToggle } from '@/app/plugins/cbc/components/outcomes/OutcomeFilterToggle';
import {
    CBCNav,
    CBCBreadcrumb,
    CBCError,
    CBCLoading,
    CBCTeachingSessionNav,
} from '@/app/plugins/cbc/components/CBCComponents';
import { Card } from '@/app/components/ui/Card';
import { Button } from '@/app/components/ui/Button';
import { Badge } from '@/app/components/ui/Badge';

export function CBCSessionOutcomesPage() {
    const { sessionId: raw } = useParams<{ sessionId: string }>();
    const sessionId = Number(raw);
    const page = useSessionOutcomes(sessionId);
    const addOutcomesHref = `/cbc/teaching/sessions/${sessionId}/outcomes/add`;
    const learnersHref = `/cbc/teaching/sessions/${sessionId}/learners`;
    const assistantContext = useMemo(() => ({
        pageKey: 'cbc_session_outcomes',
        pageTitle: 'CBC Session Outcomes',
        state: {
            is_loading: page.sessionLoading || page.linksLoading,
            is_empty: !page.sessionLoading && !page.linksLoading && page.links.length === 0,
            has_sessions: Boolean(page.session),
            session_status: page.session?.status ?? null,
            has_subject_filter: false,
            has_cohort_filter: false,
            has_taught_outcomes: page.links.length > 0,
            has_learner_evidence: page.withEvidenceCount > 0,
            coverage_percentage: page.progress,
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
                label: 'Add taught outcomes',
                type: 'navigate' as const,
                href: addOutcomesHref,
            },
            {
                label: 'Record learner evidence',
                type: 'navigate' as const,
                href: learnersHref,
            },
        ],
        nextSafeAction: page.links.length === 0
            ? {
                label: 'Add taught outcomes',
                type: 'navigate' as const,
                href: addOutcomesHref,
            }
            : (page.progress === 100
                ? {
                    label: 'Record learner evidence',
                    type: 'navigate' as const,
                    href: learnersHref,
                }
                : undefined),
        workflowStep: page.links.length === 0 ? 'confirm_taught_outcomes' : 'record_cbc_evidence',
        emptyStateReason: !page.sessionLoading && !page.linksLoading && page.links.length === 0
            ? 'No taught outcomes are confirmed for this CBC session yet.'
            : undefined,
    }), [addOutcomesHref, learnersHref, page.links.length, page.linksLoading, page.progress, page.session, page.sessionLoading, page.withEvidenceCount]);

    useAssistantPageContext(assistantContext);

    if (page.sessionLoading) {
        return (
            <div className="space-y-6">
                <CBCNav />
                <CBCLoading message="Loading lesson…" />
            </div>
        );
    }

    if (page.sessionError || !page.session) {
        return (
            <div className="space-y-6">
                <CBCNav />
                <CBCError error={page.sessionError ?? 'Lesson not found'} />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <CBCNav />
            <CBCBreadcrumb segments={[
                { label: 'Teaching', href: '/cbc/teaching' },
                { label: 'Lessons', href: '/cbc/teaching/sessions' },
                { label: page.session.subject_name ?? 'Lesson', href: `/cbc/teaching/sessions/${sessionId}/outcomes` },
                { label: 'What Was Taught' },
            ]} />
            <CBCTeachingSessionNav sessionId={sessionId} active="outcomes" />

            <SessionHeader
                session={page.session}
                links={page.links}
                summary={page.summary}
                coveredCount={page.coveredCount}
                progress={page.progress}
                withEvidenceCount={page.withEvidenceCount}
            />

            {page.linksError && <CBCError error={page.linksError} onRetry={page.refetch} />}

            <Card>
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                            <Target className="h-5 w-5 text-blue-600" />
                            What was taught
                            {page.links.length > 0 && <Badge variant="blue" size="sm">{page.links.length}</Badge>}
                        </h2>
                        <p className="mt-1 text-sm text-gray-500">
                            Review the outcomes confirmed from the lesson plan for this lesson.
                        </p>
                    </div>
                    <Link href={`/sessions/${sessionId}`} className="w-full sm:w-auto">
                        <Button variant="secondary" size="md" className="w-full sm:w-auto">
                            Open lesson
                        </Button>
                    </Link>
                </div>

                {page.links.length > 0 && (
                    <OutcomeFilterToggle
                        filter={page.filter}
                        onChange={page.setFilter}
                        total={page.links.length}
                        needsEvidence={page.needsEvidenceCount}
                        covered={page.coveredCount}
                    />
                )}

                {page.linksLoading ? (
                    <CBCLoading message="Loading learning goals…" />
                ) : page.links.length === 0 ? (
                    <div className="py-16 text-center">
                        <Target className="mx-auto h-12 w-12 text-gray-300 mb-3" />
                        <p className="text-gray-500 mb-1">No taught outcomes have been confirmed yet</p>
                        <p className="text-sm text-gray-400 mb-4">
                            Open the lesson to confirm what was taught from the lesson plan first.
                        </p>
                        <Link href={`/sessions/${sessionId}`}>
                            <Button variant="primary" size="md">
                                Open lesson
                            </Button>
                        </Link>
                    </div>
                ) : page.filteredLinks.length === 0 ? (
                    <div className="py-8 text-center text-gray-500 text-sm">
                        No learning goals match this view
                    </div>
                ) : (
                    <div className="space-y-3 mt-4">
                        {page.filteredLinks.map(link => (
                            <OutcomeRow
                                key={link.id}
                                link={link}
                                sessionId={sessionId}
                                editingNotes={page.editingNotes}
                                notesValue={page.notesValue}
                                markCoveredPending={page.markCoveredPending}
                                removeLinkPending={page.removeLinkPending}
                                onToggleCovered={page.handleToggleCovered}
                                onRemove={page.handleRemove}
                                onEditNotes={(id, notes) => {
                                    page.setEditingNotes(id);
                                    page.setNotesValue(notes);
                                }}
                                onSaveNotes={page.handleSaveNotes}
                                onCancelNotes={() => page.setEditingNotes(null)}
                                onNotesChange={page.setNotesValue}
                            />
                        ))}
                    </div>
                )}
            </Card>
        </div>
    );
}
