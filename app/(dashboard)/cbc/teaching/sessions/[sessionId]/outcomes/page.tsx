// ============================================================================
// app/(dashboard)/cbc/teaching/sessions/[sessionId]/outcomes/page.tsx
// Manage Outcomes for Session - Core Teaching Page
// ============================================================================

'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
    ArrowLeft,
    Plus,
    CheckCircle,
    Circle,
    Trash2,
    FileText,
    Target,
    BookOpen
} from 'lucide-react';
import { useTeachingSession, useOutcomeSessions } from '@/app/plugins/cbc/hooks/useCBC';
import { Card } from '@/app/components/ui/Card';
import { Button } from '@/app/components/ui/Button';
import { Badge } from '@/app/components/ui/Badge';
import { Input } from '@/app/components/ui/Input';

export default function SessionOutcomesPage() {
    const params = useParams();
    const router = useRouter();
    const sessionId = Number(params.sessionId);
    console.log("Rendering session id from params", sessionId);

    const { session, loading: sessionLoading } = useTeachingSession(sessionId);
    const { links, loading: linksLoading, markCovered, removeLink } = useOutcomeSessions(sessionId);
    console.log("Viewing content of links", links);

    const [marking, setMarking] = useState<number | null>(null);
    const [removing, setRemoving] = useState<number | null>(null);
    const [editingNotes, setEditingNotes] = useState<number | null>(null);
    const [notesValue, setNotesValue] = useState('');

    const handleToggleCovered = async (linkId: number, currentStatus: boolean, currentNotes: string) => {
        if (currentStatus) {
            // Already covered - optionally show notes editor
            setEditingNotes(linkId);
            setNotesValue(currentNotes);
            return;
        }

        setMarking(linkId);
        try {
            await markCovered(linkId);
        } catch (err) {
            console.error('Failed to mark covered:', err);
        } finally {
            setMarking(null);
        }
    };

    const handleSaveNotes = async (linkId: number) => {
        setMarking(linkId);
        try {
            await markCovered(linkId, notesValue);
            setEditingNotes(null);
            setNotesValue('');
        } catch (err) {
            console.error('Failed to save notes:', err);
        } finally {
            setMarking(null);
        }
    };

    const handleRemoveLink = async (linkId: number) => {
        if (!confirm('Remove this outcome from the session?')) return;

        setRemoving(linkId);
        try {
            await removeLink(linkId);
        } catch (err) {
            console.error('Failed to remove link:', err);
        } finally {
            setRemoving(null);
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
            year: 'numeric'
        });
    };

    if (sessionLoading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="flex flex-col items-center gap-3">
                    <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
                    <p className="text-sm text-gray-500">Loading session...</p>
                </div>
            </div>
        );
    }

    if (!session) {
        return (
            <div className="py-20 text-center">
                <p className="text-gray-500">Session not found</p>
                <Link href="/cbc/teaching">
                    <Button variant="primary" size="sm" className="mt-4">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Teaching
                    </Button>
                </Link>
            </div>
        );
    }

    const coveredCount = links.filter(l => l.covered).length;
    const pendingCount = links.length - coveredCount;

    return (
        <div className="space-y-6 max-w-7xl mx-auto">
            {/* CBC nav */}
            <nav className="flex gap-2 bg-white rounded-xl p-1.5 shadow-sm border border-gray-200">
                <Link href="/cbc/authoring" className="flex-1 text-center text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg py-2.5 transition-colors">
                    Authoring
                </Link>
                <Link href="/cbc/browser" className="flex-1 text-center text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg py-2.5 transition-colors">
                    Browser
                </Link>
                <Link href="/cbc/progress" className="flex-1 text-center text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg py-2.5 transition-colors">
                    Progress
                </Link>
                <Link href="/cbc/teaching" className="flex-1 text-center text-sm font-semibold text-white bg-blue-600 rounded-lg py-2.5 shadow-sm">
                    Teaching
                </Link>
            </nav>

            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-sm text-gray-500">
                <Link href="/cbc/teaching" className="hover:text-blue-600">Teaching</Link>
                <span>→</span>
                <Link href="/cbc/teaching/sessions" className="hover:text-blue-600">Sessions</Link>
                <span>→</span>
                <Link href={`/cbc/teaching/sessions/${sessionId}`} className="hover:text-blue-600">
                    {session.subject_name}
                </Link>
                <span>→</span>
                <span className="text-gray-900 font-medium">Outcomes</span>
            </div>

            {/* Session Header */}
            <Card className="shadow-sm">
                <div className="flex items-start gap-4">
                    <div className="p-3 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border border-blue-100">
                        <BookOpen className="h-7 w-7 text-blue-600" />
                    </div>
                    <div className="flex-1">
                        <h1 className="text-xl font-bold text-gray-900 mb-1">
                            {session.subject_name || 'General Session'}
                        </h1>
                        <p className="text-gray-600 mb-2">{session.cohort_name}</p>
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                            <span>{formatDate(session.session_date)}</span>
                            <span>•</span>
                            <div className="flex items-center gap-2">
                                <Badge variant="blue" size="sm">{links.length} outcomes</Badge>
                                <Badge variant="green" size="sm">{coveredCount} covered</Badge>
                                {pendingCount > 0 && (
                                    <Badge variant="default" size="sm">{pendingCount} pending</Badge>
                                )}
                            </div>
                        </div>
                    </div>
                    <Link href={`/cbc/teaching/sessions/${sessionId}`}>
                        <Button variant="ghost" size="sm">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back to Session
                        </Button>
                    </Link>
                </div>
            </Card>

            {/* Outcomes List */}
            <Card className="shadow-sm">
                <div className="flex items-center justify-between mb-5">
                    <div>
                        <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                            <Target className="h-5 w-5 text-blue-600" />
                            Linked Outcomes
                        </h2>
                        <p className="text-sm text-gray-500 mt-1">
                            Mark outcomes as covered and add session notes
                        </p>
                    </div>
                    <Link href={`/cbc/teaching/sessions/${sessionId}/outcomes/add`}>
                        <Button variant="primary" size="md">
                            <Plus className="h-4 w-4 mr-2" />
                            Add Outcomes
                        </Button>
                    </Link>
                </div>

                {linksLoading ? (
                    <div className="py-12 text-center">
                        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
                        <p className="mt-2 text-sm text-gray-500">Loading outcomes...</p>
                    </div>
                ) : links.length === 0 ? (
                    <div className="py-16 text-center">
                        <Target className="mx-auto h-12 w-12 text-gray-300 mb-3" />
                        <p className="text-gray-500 mb-1">No outcomes linked yet</p>
                        <p className="text-sm text-gray-400 mb-4">
                            Start by adding curriculum outcomes to this session
                        </p>
                        <Link href={`/cbc/teaching/sessions/${sessionId}/outcomes/add`}>
                            <Button variant="primary" size="md">
                                <Plus className="mr-2 h-4 w-4" />
                                Add Outcomes
                            </Button>
                        </Link>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {links.map((link) => (
                            <div
                                key={link.id}
                                className={`border rounded-xl p-5 transition-all ${link.covered
                                    ? 'border-green-200 bg-green-50'
                                    : 'border-gray-200 bg-white hover:border-blue-200'
                                    }`}
                            >
                                <div className="flex items-start gap-4">
                                    {/* Coverage Toggle */}
                                    <button
                                        onClick={() => handleToggleCovered(link.id, link.covered, link.notes)}
                                        disabled={marking === link.id}
                                        className="mt-1 shrink-0"
                                        title={link.covered ? 'Covered' : 'Mark as covered'}
                                    >
                                        {link.covered ? (
                                            <CheckCircle className="h-6 w-6 text-green-600" />
                                        ) : (
                                            <Circle className="h-6 w-6 text-gray-300 hover:text-blue-600 transition-colors" />
                                        )}
                                    </button>

                                    {/* Outcome Details */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-start justify-between gap-4 mb-2">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <Badge variant="purple" size="md" className="font-mono font-semibold">
                                                    {link.learning_outcome_code}
                                                </Badge>
                                                <span className="text-xs text-gray-500">
                                                    {link.strand_name} → {link.sub_strand_name}
                                                </span>
                                            </div>
                                            <button
                                                onClick={() => handleRemoveLink(link.id)}
                                                disabled={removing === link.id}
                                                className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                title="Remove from session"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>

                                        <p className="text-sm text-gray-700 mb-3">
                                            {link.learning_outcome_description}
                                        </p>

                                        {/* Notes Section */}
                                        {editingNotes === link.id ? (
                                            <div className="space-y-2">
                                                <Input
                                                    label="Session Notes"
                                                    value={notesValue}
                                                    onChange={(e) => setNotesValue(e.target.value)}
                                                    placeholder="Add notes about how this outcome was covered..."
                                                />
                                                <div className="flex gap-2">
                                                    <Button
                                                        variant="primary"
                                                        size="sm"
                                                        onClick={() => handleSaveNotes(link.id)}
                                                        disabled={marking === link.id}
                                                    >
                                                        Save Notes
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => {
                                                            setEditingNotes(null);
                                                            setNotesValue('');
                                                        }}
                                                    >
                                                        Cancel
                                                    </Button>
                                                </div>
                                            </div>
                                        ) : link.notes ? (
                                            <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                                                <p className="text-sm text-gray-700 italic">
                                                    {link.notes}
                                                </p>
                                                <button
                                                    onClick={() => {
                                                        setEditingNotes(link.id);
                                                        setNotesValue(link.notes);
                                                    }}
                                                    className="text-xs text-blue-600 hover:underline mt-1"
                                                >
                                                    Edit notes
                                                </button>
                                            </div>
                                        ) : link.covered && (
                                            <button
                                                onClick={() => {
                                                    setEditingNotes(link.id);
                                                    setNotesValue('');
                                                }}
                                                className="text-sm text-blue-600 hover:underline"
                                            >
                                                + Add session notes
                                            </button>
                                        )}

                                        {/* Evidence Link */}
                                        <div className="mt-3 pt-3 border-t border-gray-100">
                                            <Link
                                                href={`/cbc/teaching/sessions/${sessionId}/outcomes/${link.learning_outcome}`}
                                                className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700"
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