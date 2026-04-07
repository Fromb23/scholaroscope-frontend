// ============================================================================
// app/(dashboard)/cbc/teaching/sessions/[sessionId]/outcomes/[learningOutcomeId]/page.tsx
// Outcome-in-Session Context - FIXED (Curriculum-semantic URL)
// ============================================================================

'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
    ArrowLeft,
    Target,
    CheckCircle,
    Circle,
    FileText,
    Users,
    BookOpen,
    Calendar
} from 'lucide-react';
import { apiClient } from '@/app/core/api/client';
import { useTeachingSession } from '@/app/plugins/cbc/hooks/useCBC';
import { Card } from '@/app/components/ui/Card';
import { Button } from '@/app/components/ui/Button';
import { Badge } from '@/app/components/ui/Badge';
import { Input } from '@/app/components/ui/Input';

interface LearningOutcome {
    id: number;
    code: string;
    description: string;
    sub_strand: number;
    sub_strand_name?: string;
    strand_name?: string;
}

interface OutcomeSession {
    id: number;
    session: number;
    learning_outcome: number;
    covered: boolean;
    notes: string;
    evidence_count?: number;
    learners_with_evidence?: number;
}

export default function OutcomeInSessionPage() {
    const params = useParams();
    const sessionId = Number(params.sessionId);
    console.log("Session id", sessionId);
    const learningOutcomeId = Number(params.learningOutcomeId);
    console.log("learning outcomeId", learningOutcomeId);

    const { data: session } = useTeachingSession(sessionId);

    // Separate state for curriculum data and session data
    const [learningOutcome, setLearningOutcome] = useState<LearningOutcome | null>(null);
    const [outcomeSession, setOutcomeSession] = useState<OutcomeSession | null>(null);
    const [loading, setLoading] = useState(true);
    const [editingNotes, setEditingNotes] = useState(false);
    const [notes, setNotes] = useState('');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);

                // 1. Fetch the learning outcome (curriculum data)
                const outcomeResponse = await apiClient.get(`/cbc/learning-outcomes/${learningOutcomeId}/`);
                setLearningOutcome(outcomeResponse.data);

                // 2. Fetch all outcome sessions for this session
                const sessionOutcomesResponse = await apiClient.get(
                    `/cbc/outcome-sessions/by_session/?session_id=${sessionId}`
                );

                // 3. Find the specific OutcomeSession that links this learning outcome to this session
                const outcomeSessionLink = sessionOutcomesResponse.data.find(
                    (link: any) => link.learning_outcome === learningOutcomeId
                );

                if (outcomeSessionLink) {
                    setOutcomeSession(outcomeSessionLink);
                    setNotes(outcomeSessionLink.notes || '');
                }
            } catch (err) {
                console.error('Failed to fetch data:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [sessionId, learningOutcomeId]);

    const handleToggleCovered = async () => {
        if (!outcomeSession) return;

        try {
            // CORRECT: Use OutcomeSession endpoint with the join table ID
            const response = await apiClient.patch(
                `/cbc/outcome-sessions/${outcomeSession.id}/mark_covered/`,
                { notes }
            );
            setOutcomeSession(response.data);
        } catch (err) {
            console.error('Failed to toggle covered:', err);
        }
    };

    const handleSaveNotes = async () => {
        if (!outcomeSession) return;

        setSaving(true);
        try {
            // CORRECT: Use OutcomeSession endpoint, NOT learning-outcomes
            const response = await apiClient.patch(
                `/cbc/outcome-sessions/${outcomeSession.id}/mark_covered/`,
                { notes }
            );
            setOutcomeSession(response.data);
            setEditingNotes(false);
        } catch (err) {
            console.error('Failed to save notes:', err);
        } finally {
            setSaving(false);
        }
    };

    if (loading || !session) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="flex flex-col items-center gap-3">
                    <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
                    <p className="text-sm text-gray-500">Loading...</p>
                </div>
            </div>
        );
    }

    if (!learningOutcome || !outcomeSession) {
        return (
            <div className="py-20 text-center max-w-md mx-auto">
                <Target className="mx-auto h-16 w-16 text-gray-300 mb-4" />
                <p className="text-lg font-medium text-gray-900 mb-1">Outcome not found</p>
                <p className="text-sm text-gray-500 mb-4">
                    This learning outcome is not linked to this session.
                </p>
                <Link href={`/cbc/teaching/sessions/${sessionId}/outcomes`}>
                    <Button variant="primary">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Outcomes
                    </Button>
                </Link>
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
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
            <div className="flex flex-wrap items-center gap-2 text-sm text-gray-500">
                <Link href="/cbc/teaching" className="hover:text-blue-600">Teaching</Link>
                <span>→</span>
                <Link href="/cbc/teaching/sessions" className="hover:text-blue-600">Sessions</Link>
                <span>→</span>
                <Link href={`/cbc/teaching/sessions/${sessionId}`} className="hover:text-blue-600 break-words">
                    {session.subject_name}
                </Link>
                <span>→</span>
                <Link href={`/cbc/teaching/sessions/${sessionId}/outcomes`} className="hover:text-blue-600">
                    Outcomes
                </Link>
                <span>→</span>
                <span className="text-gray-900 font-medium break-words">{learningOutcome.code}</span>
            </div>

            {/* Outcome Header */}
            <Card className="shadow-sm">
                <div className="flex flex-col sm:flex-row items-start gap-5">
                    <div className="p-4 bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl border border-purple-100 shrink-0">
                        <Target className="h-8 w-8 text-purple-600" />
                    </div>
                    <div className="flex-1 min-w-0 w-full">
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-3">
                            <div className="flex-1 min-w-0">
                                <div className="flex flex-wrap items-center gap-3 mb-2">
                                    <Badge variant="purple" size="lg" className="font-mono font-semibold">
                                        {learningOutcome.code}
                                    </Badge>
                                    <button
                                        onClick={handleToggleCovered}
                                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all hover:bg-gray-50"
                                    >
                                        {outcomeSession.covered ? (
                                            <>
                                                <CheckCircle className="h-5 w-5 text-green-600" />
                                                <span className="text-sm font-medium text-green-700">Covered</span>
                                            </>
                                        ) : (
                                            <>
                                                <Circle className="h-5 w-5 text-gray-400" />
                                                <span className="text-sm font-medium text-gray-600">Mark as Covered</span>
                                            </>
                                        )}
                                    </button>
                                </div>
                                <p className="text-gray-700 mb-2 break-words">
                                    {learningOutcome.description}
                                </p>
                                {(learningOutcome.strand_name || learningOutcome.sub_strand_name) && (
                                    <div className="flex items-center gap-2 text-sm text-gray-500">
                                        <BookOpen className="h-4 w-4 shrink-0" />
                                        <span className="break-words">
                                            {learningOutcome.strand_name} → {learningOutcome.sub_strand_name}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Session Notes */}
                        <div className="mt-4 pt-4 border-t border-gray-100">
                            <h3 className="text-sm font-semibold text-gray-700 mb-2">Session Notes</h3>
                            {editingNotes ? (
                                <div className="space-y-2">
                                    <textarea
                                        value={notes}
                                        onChange={(e) => setNotes(e.target.value)}
                                        placeholder="Add notes about how this outcome was covered..."
                                        rows={3}
                                        className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                                    />
                                    <div className="flex gap-2">
                                        <Button
                                            variant="primary"
                                            size="sm"
                                            onClick={handleSaveNotes}
                                            disabled={saving}
                                        >
                                            {saving ? 'Saving...' : 'Save Notes'}
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => {
                                                setEditingNotes(false);
                                                setNotes(outcomeSession.notes || '');
                                            }}
                                        >
                                            Cancel
                                        </Button>
                                    </div>
                                </div>
                            ) : outcomeSession.notes ? (
                                <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                                    <p className="text-sm text-gray-700 italic break-words">{outcomeSession.notes}</p>
                                    <button
                                        onClick={() => setEditingNotes(true)}
                                        className="text-xs text-blue-600 hover:underline mt-1"
                                    >
                                        Edit notes
                                    </button>
                                </div>
                            ) : (
                                <button
                                    onClick={() => setEditingNotes(true)}
                                    className="text-sm text-blue-600 hover:underline"
                                >
                                    + Add session notes
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </Card>

            {/* Session Context */}
            <Card className="shadow-sm bg-gray-50">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-gray-600" />
                    Session Context
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                        <span className="text-gray-500">Subject:</span>
                        <p className="font-medium text-gray-900 break-words">{session.subject_name}</p>
                    </div>
                    <div>
                        <span className="text-gray-500">Cohort:</span>
                        <p className="font-medium text-gray-900 break-words">{session.cohort_name}</p>
                    </div>
                    <div>
                        <span className="text-gray-500">Date:</span>
                        <p className="font-medium text-gray-900">
                            {new Date(session.session_date).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric'
                            })}
                        </p>
                    </div>
                </div>
            </Card>

            {/* Primary Action - Record Evidence */}
            <Card className="shadow-sm bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-start gap-4">
                        <div className="p-3 bg-blue-600 rounded-lg shrink-0">
                            <FileText className="h-6 w-6 text-white" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-gray-900 text-lg mb-1">
                                Record Evidence
                            </h3>
                            <p className="text-sm text-gray-600">
                                Document learner demonstrations of this outcome
                            </p>
                            {outcomeSession.evidence_count !== undefined && outcomeSession.evidence_count > 0 && (
                                <Badge variant="blue" size="sm" className="mt-2">
                                    {outcomeSession.evidence_count} evidence record{outcomeSession.evidence_count !== 1 ? 's' : ''}
                                </Badge>
                            )}
                        </div>
                    </div>
                    <Link
                        href={`/cbc/teaching/sessions/${sessionId}/outcomes/${learningOutcomeId}/evidence`}
                        className="w-full sm:w-auto"
                    >
                        <Button variant="primary" size="lg" className="w-full sm:w-auto">
                            <Users className="mr-2 h-5 w-5" />
                            Record Evidence
                        </Button>
                    </Link>
                </div>
            </Card>
        </div>
    );
}