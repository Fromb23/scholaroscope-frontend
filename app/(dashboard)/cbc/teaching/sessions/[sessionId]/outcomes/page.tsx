// app/(dashboard)/cbc/teaching/sessions/[sessionId]/outcomes/page.tsx
'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Target, Plus } from 'lucide-react';
import { useSessionOutcomes } from '@/app/plugins/cbc/hooks/useSessionOutcomes';
import { SessionHeader } from '@/app/plugins/cbc/components/outcomes/SessionHeader';
import { OutcomeRow } from '@/app/plugins/cbc/components/outcomes/OutcomeRow';
import { OutcomeFilterToggle } from '@/app/plugins/cbc/components/outcomes/OutcomeFilterToggle';
import { CBCNav, CBCBreadcrumb, CBCError, CBCLoading } from '@/app/plugins/cbc/components/CBCComponents';
import { Card } from '@/app/components/ui/Card';
import { Button } from '@/app/components/ui/Button';
import { Badge } from '@/app/components/ui/Badge';

export default function SessionOutcomesPage() {
    const { sessionId: raw } = useParams<{ sessionId: string }>();
    const sessionId = Number(raw);

    const {
        session, sessionLoading, sessionError,
        links, filteredLinks, linksLoading, linksError, refetch,
        summary,
        filter, setFilter,
        coveredCount, withEvidenceCount, needsEvidenceCount, progress,
        editingNotes, setEditingNotes,
        notesValue, setNotesValue,
        markCoveredPending, removeLinkPending,
        handleToggleCovered, handleSaveNotes, handleRemove,
    } = useSessionOutcomes(sessionId);

    if (sessionLoading) return <CBCLoading />;
    if (sessionError || !session) return (
        <div className="space-y-6">
            <CBCNav />
            <CBCError error={sessionError ?? 'Session not found'} />
        </div>
    );

    return (
        <div className="space-y-6">
            <CBCNav />
            <CBCBreadcrumb segments={[
                { label: 'Teaching', href: '/cbc/teaching' },
                { label: 'Sessions', href: '/cbc/teaching/sessions' },
                { label: session.subject_name ?? 'Session', href: `/cbc/teaching/sessions/${sessionId}` },
                { label: 'Outcomes' },
            ]} />

            <SessionHeader
                session={session}
                links={links}
                summary={summary}
                coveredCount={coveredCount}
                progress={progress}
                withEvidenceCount={withEvidenceCount}
            />

            {linksError && <CBCError error={linksError} onRetry={refetch} />}

            <Card>
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                        <Target className="h-5 w-5 text-blue-600" />
                        Linked Outcomes
                        {links.length > 0 && <Badge variant="blue" size="sm">{links.length}</Badge>}
                    </h2>
                    <Link href={`/cbc/teaching/sessions/${sessionId}/outcomes/add`}>
                        <Button variant="primary" size="md">
                            <Plus className="h-4 w-4 mr-2" />Add Outcomes
                        </Button>
                    </Link>
                </div>

                {links.length > 0 && (
                    <OutcomeFilterToggle
                        filter={filter}
                        onChange={setFilter}
                        total={links.length}
                        needsEvidence={needsEvidenceCount}
                        covered={coveredCount}
                    />
                )}

                {linksLoading ? (
                    <CBCLoading message="Loading outcomes…" />
                ) : links.length === 0 ? (
                    <div className="py-16 text-center">
                        <Target className="mx-auto h-12 w-12 text-gray-300 mb-3" />
                        <p className="text-gray-500 mb-1">No outcomes linked yet</p>
                        <p className="text-sm text-gray-400 mb-4">
                            Add curriculum outcomes to track what was taught
                        </p>
                        <Link href={`/cbc/teaching/sessions/${sessionId}/outcomes/add`}>
                            <Button variant="primary" size="md">
                                <Plus className="mr-2 h-4 w-4" />Add Outcomes
                            </Button>
                        </Link>
                    </div>
                ) : filteredLinks.length === 0 ? (
                    <div className="py-8 text-center text-gray-500 text-sm">
                        No outcomes match this filter
                    </div>
                ) : (
                    <div className="space-y-3 mt-4">
                        {filteredLinks.map(link => (
                            <OutcomeRow
                                key={link.id}
                                link={link}
                                sessionId={sessionId}
                                editingNotes={editingNotes}
                                notesValue={notesValue}
                                markCoveredPending={markCoveredPending}
                                removeLinkPending={removeLinkPending}
                                onToggleCovered={handleToggleCovered}
                                onRemove={handleRemove}
                                onEditNotes={(id, notes) => { setEditingNotes(id); setNotesValue(notes); }}
                                onSaveNotes={handleSaveNotes}
                                onCancelNotes={() => setEditingNotes(null)}
                                onNotesChange={setNotesValue}
                            />
                        ))}
                    </div>
                )}
            </Card>
        </div>
    );
}