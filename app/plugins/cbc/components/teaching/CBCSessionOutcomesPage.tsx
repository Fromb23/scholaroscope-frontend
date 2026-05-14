'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Plus, Target } from 'lucide-react';
import { useSessionOutcomes } from '@/app/plugins/cbc/hooks/useSessionOutcomes';
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
                            Review the learning goals covered in this lesson.
                        </p>
                    </div>
                    <Link href={`/cbc/teaching/sessions/${sessionId}/outcomes/add`} className="w-full sm:w-auto">
                        <Button variant="primary" size="md" className="w-full sm:w-auto">
                            <Plus className="h-4 w-4 mr-2" />Add what was taught
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
                        <p className="text-gray-500 mb-1">No learning goals added yet</p>
                        <p className="text-sm text-gray-400 mb-4">
                            Choose learning goals to show what was taught in this lesson.
                        </p>
                        <Link href={`/cbc/teaching/sessions/${sessionId}/outcomes/add`}>
                            <Button variant="primary" size="md">
                                <Plus className="mr-2 h-4 w-4" />Add what was taught
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
