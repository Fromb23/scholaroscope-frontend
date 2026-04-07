'use client';
// app/(dashboard)/cbc/teaching/sessions/[sessionId]/outcomes/page.tsx

import { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
    ArrowLeft, Plus, CheckCircle, Circle, Trash2,
    FileText, Target, BookOpen, Users,
} from 'lucide-react';
import {
    useTeachingSession, useOutcomeSessions,
    useMarkOutcomeCovered, useRemoveOutcomeLink, useSessionSummary,
} from '@/app/plugins/cbc/hooks/useCBC';
import {
    CBCNav, CBCBreadcrumb, CBCError, CBCLoading,
    SessionStatusBadge,
} from '@/app/plugins/cbc/components/CBCComponents';
import { Card } from '@/app/components/ui/Card';
import { Button } from '@/app/components/ui/Button';
import { Badge } from '@/app/components/ui/Badge';
import { Input } from '@/app/components/ui/Input';

export default function SessionOutcomesPage() {
    const { sessionId: raw } = useParams<{ sessionId: string }>();
    const sessionId = Number(raw);

    const { data: session, isLoading: sessionLoading, error: sessionError } =
        useTeachingSession(sessionId);
    const { data: links = [], isLoading: linksLoading, error: linksError, refetch } =
        useOutcomeSessions(sessionId);
    const { data: summary } = useSessionSummary(sessionId);

    const markCovered = useMarkOutcomeCovered();
    const removeLink = useRemoveOutcomeLink();

    const [editingNotes, setEditingNotes] = useState<number | null>(null);
    const [notesValue, setNotesValue] = useState('');

    const handleToggleCovered = async (linkId: number, covered: boolean, notes: string) => {
        if (covered) {
            setEditingNotes(linkId);
            setNotesValue(notes);
            return;
        }
        await markCovered.mutateAsync({ id: linkId });
    };

    const handleSaveNotes = async (linkId: number) => {
        await markCovered.mutateAsync({ id: linkId, notes: notesValue });
        setEditingNotes(null);
    };

    const handleRemove = async (linkId: number) => {
        if (!confirm('Remove this outcome from the session?')) return;
        await removeLink.mutateAsync(linkId);
    };

    const coveredCount = links.filter(l => l.covered).length;
    const progress = links.length > 0 ? Math.round((coveredCount / links.length) * 100) : 0;

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

            {/* Session header */}
            <Card className="shadow-sm">
                <div className="flex flex-col sm:flex-row items-start gap-4">
                    <div className="p-3 bg-gradient-to-br from-blue-50 to-indigo-50
            rounded-xl border border-blue-100 shrink-0">
                        <BookOpen className="h-7 w-7 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 flex-wrap mb-1">
                            <h1 className="text-xl font-bold text-gray-900">
                                {session.subject_name ?? 'General Session'}
                            </h1>
                            <SessionStatusBadge status={session.status} />
                        </div>
                        <p className="text-gray-600 mb-2">{session.cohort_name}</p>
                        <p className="text-sm text-gray-500">
                            {new Date(session.session_date).toLocaleDateString('en-GB', {
                                weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
                            })}
                        </p>
                    </div>
                    {/* Tab nav */}
                    <div className="flex gap-2 shrink-0">
                        <span className="px-3 py-1.5 bg-blue-600 text-white text-sm
              font-medium rounded-lg">
                            Outcomes
                        </span>
                        <Link href={`/cbc/teaching/sessions/${sessionId}/learners`}
                            className="px-3 py-1.5 text-gray-600 text-sm font-medium
                hover:bg-gray-100 rounded-lg transition-colors flex items-center gap-1.5">
                            <Users className="h-4 w-4" />
                            Learners
                        </Link>
                    </div>
                </div>

                {/* Coverage progress bar */}
                {links.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-gray-100">
                        <div className="flex items-center justify-between text-sm mb-2">
                            <span className="text-gray-600">
                                {coveredCount} of {links.length} outcomes covered
                            </span>
                            <span className="font-semibold text-blue-600">{progress}%</span>
                        </div>
                        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-blue-500 rounded-full transition-all duration-500"
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                    </div>
                )}

                {/* Summary stats if available */}
                {summary && (
                    <div className="mt-3 flex flex-wrap gap-3">
                        <Badge variant="blue" size="sm">
                            {summary.evidence.total_records} evidence records
                        </Badge>
                        <Badge variant="purple" size="sm">
                            {summary.evidence.students_with_evidence} students observed
                        </Badge>
                    </div>
                )}
            </Card>

            {linksError && <CBCError error={linksError} onRetry={refetch} />}

            {/* Outcomes list */}
            <Card>
                <div className="flex items-center justify-between mb-5">
                    <div>
                        <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                            <Target className="h-5 w-5 text-blue-600" />
                            Linked Outcomes
                            {links.length > 0 && <Badge variant="blue" size="sm">{links.length}</Badge>}
                        </h2>
                        <p className="text-sm text-gray-500 mt-1">
                            Mark outcomes as covered and record evidence per learner
                        </p>
                    </div>
                    <Link href={`/cbc/teaching/sessions/${sessionId}/outcomes/add`}>
                        <Button variant="primary" size="md">
                            <Plus className="h-4 w-4 mr-2" />Add Outcomes
                        </Button>
                    </Link>
                </div>

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
                ) : (
                    <div className="space-y-3">
                        {links.map(link => (
                            <div
                                key={link.id}
                                className={`border rounded-xl p-5 transition-all ${link.covered
                                    ? 'border-green-200 bg-green-50'
                                    : 'border-gray-200 bg-white hover:border-blue-200'
                                    }`}
                            >
                                <div className="flex items-start gap-4">
                                    {/* Toggle */}
                                    <button
                                        onClick={() => handleToggleCovered(link.id, link.covered, link.notes)}
                                        disabled={markCovered.isPending}
                                        className="mt-1 shrink-0"
                                    >
                                        {link.covered
                                            ? <CheckCircle className="h-6 w-6 text-green-600" />
                                            : <Circle className="h-6 w-6 text-gray-300 hover:text-blue-600 transition-colors" />
                                        }
                                    </button>

                                    <div className="flex-1 min-w-0">
                                        {/* Outcome info */}
                                        <div className="flex items-start justify-between gap-4 mb-2">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <Badge variant="purple" size="md" className="font-mono font-semibold">
                                                    {link.learning_outcome_code}
                                                </Badge>
                                                <span className="text-xs text-gray-500 hidden sm:inline">
                                                    {link.strand_name} → {link.sub_strand_name}
                                                </span>
                                            </div>
                                            <button
                                                onClick={() => handleRemove(link.id)}
                                                disabled={removeLink.isPending}
                                                className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors shrink-0"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>

                                        <p className="text-sm text-gray-700 mb-3">
                                            {link.learning_outcome_description}
                                        </p>

                                        {/* Notes */}
                                        {editingNotes === link.id ? (
                                            <div className="space-y-2">
                                                <Input
                                                    label="Session notes"
                                                    value={notesValue}
                                                    onChange={e => setNotesValue(e.target.value)}
                                                    placeholder="How was this outcome covered?"
                                                />
                                                <div className="flex gap-2">
                                                    <Button variant="primary" size="sm"
                                                        onClick={() => handleSaveNotes(link.id)}
                                                        disabled={markCovered.isPending}>
                                                        Save Notes
                                                    </Button>
                                                    <Button variant="ghost" size="sm"
                                                        onClick={() => setEditingNotes(null)}>
                                                        Cancel
                                                    </Button>
                                                </div>
                                            </div>
                                        ) : link.notes ? (
                                            <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                                                <p className="text-sm text-gray-700 italic">{link.notes}</p>
                                                <button
                                                    onClick={() => { setEditingNotes(link.id); setNotesValue(link.notes); }}
                                                    className="text-xs text-blue-600 hover:underline mt-1">
                                                    Edit notes
                                                </button>
                                            </div>
                                        ) : link.covered && (
                                            <button
                                                onClick={() => { setEditingNotes(link.id); setNotesValue(''); }}
                                                className="text-sm text-blue-600 hover:underline">
                                                + Add session notes
                                            </button>
                                        )}

                                        {/* Evidence link */}
                                        <div className="mt-3 pt-3 border-t border-gray-100">
                                            <Link
                                                href={`/cbc/teaching/sessions/${sessionId}/outcomes/${link.learning_outcome}`}
                                                className="inline-flex items-center gap-2 text-sm text-blue-600
                          hover:text-blue-700 font-medium"
                                            >
                                                <FileText className="h-4 w-4" />
                                                Record Evidence
                                            </Link>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </Card>
        </div>
    );
}