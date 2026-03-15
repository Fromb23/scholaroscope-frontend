// ============================================================================
// app/(dashboard)/cbc/teaching/sessions/[sessionId]/learners/page.tsx
// Session Learners - Evidence Overview
// ============================================================================

'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
    ArrowLeft,
    Users,
    FileText,
    Target,
    BookOpen
} from 'lucide-react';
import { useTeachingSession, useSessionLearners, useOutcomeSessions } from '@/app/plugins/cbc/hooks/useCBC';
import { Card } from '@/app/components/ui/Card';
import { Button } from '@/app/components/ui/Button';
import { Badge } from '@/app/components/ui/Badge';

export default function SessionLearnersPage() {
    const params = useParams();
    const sessionId = Number(params.sessionId);

    const { session, loading: sessionLoading } = useTeachingSession(sessionId);
    const { learners, loading: learnersLoading } = useSessionLearners(sessionId);
    const { links } = useOutcomeSessions(sessionId);

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

    const learnersWithEvidence = learners.filter(l => l.session_evidence_count > 0).length;

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
                <span className="text-gray-900 font-medium">Learners</span>
            </div>

            {/* Session Header */}
            <Card className="shadow-sm">
                <div className="flex items-start gap-4">
                    <div className="p-3 bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg border border-purple-100">
                        <BookOpen className="h-7 w-7 text-purple-600" />
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
                                <Badge variant="purple" size="sm">{learners.length} learners</Badge>
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

            {/* Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="shadow-sm">
                    <div className="text-center">
                        <div className="text-3xl font-bold text-purple-600">
                            {learners.length}
                        </div>
                        <div className="text-sm text-gray-600 mt-1">Total Learners</div>
                    </div>
                </Card>
                <Card className="shadow-sm">
                    <div className="text-center">
                        <div className="text-3xl font-bold text-green-600">
                            {learnersWithEvidence}
                        </div>
                        <div className="text-sm text-gray-600 mt-1">With Evidence</div>
                    </div>
                </Card>
                <Card className="shadow-sm">
                    <div className="text-center">
                        <div className="text-3xl font-bold text-blue-600">
                            {learners.reduce((sum, l) => sum + l.session_evidence_count, 0)}
                        </div>
                        <div className="text-sm text-gray-600 mt-1">Total Records</div>
                    </div>
                </Card>
            </div>

            {/* Learners List */}
            <Card className="shadow-sm">
                <div className="mb-5">
                    <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                        <Users className="h-5 w-5 text-purple-600" />
                        Learners
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">
                        Evidence recorded for this session
                    </p>
                </div>

                {learnersLoading ? (
                    <div className="py-12 text-center">
                        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-purple-600 border-t-transparent" />
                        <p className="mt-2 text-sm text-gray-500">Loading learners...</p>
                    </div>
                ) : learners.length === 0 ? (
                    <div className="py-16 text-center">
                        <Users className="mx-auto h-12 w-12 text-gray-300 mb-3" />
                        <p className="text-gray-500">No learners in this cohort</p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {learners.map((learner) => (
                            <div
                                key={learner.id}
                                className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-purple-300 hover:bg-purple-50 transition-all"
                            >
                                <div className="flex items-center gap-4 flex-1">
                                    <div className="p-2.5 bg-purple-100 rounded-lg">
                                        <Users className="h-5 w-5 text-purple-600" />
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="font-semibold text-gray-900">
                                            {learner.first_name} {learner.last_name}
                                        </h3>
                                        <p className="text-sm text-gray-500">
                                            {learner.admission_number}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4">
                                    <div className="text-right">
                                        <div className="text-2xl font-bold text-purple-600">
                                            {learner.session_evidence_count}
                                        </div>
                                        <div className="text-xs text-gray-500">
                                            evidence record{learner.session_evidence_count !== 1 ? 's' : ''}
                                        </div>
                                    </div>

                                    {links.length > 0 ? (
                                        <Button
                                            variant={learner.session_evidence_count > 0 ? 'primary' : 'secondary'}
                                            size="sm"
                                            onClick={() => {
                                                // Navigate to first outcome's evidence page
                                                const firstOutcome = links[0].learning_outcome;
                                                window.location.href = `/cbc/teaching/sessions/${sessionId}/outcomes/${firstOutcome}?student=${learner.id}`;
                                            }}
                                        >
                                            <FileText className="h-4 w-4 mr-2" />
                                            {learner.session_evidence_count > 0 ? 'View' : 'Record'} Evidence
                                        </Button>
                                    ) : (
                                        <div className="text-xs text-gray-400">
                                            Link outcomes first
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* No Outcomes Warning */}
                {!learnersLoading && learners.length > 0 && links.length === 0 && (
                    <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <div className="flex items-start gap-3">
                            <Target className="h-5 w-5 text-yellow-600 mt-0.5 shrink-0" />
                            <div>
                                <p className="text-sm font-medium text-yellow-900">
                                    No outcomes linked yet
                                </p>
                                <p className="text-sm text-yellow-700 mt-1">
                                    Link learning outcomes to this session before recording evidence.
                                </p>
                                <Link href={`/cbc/teaching/sessions/${sessionId}/outcomes/add`}>
                                    <Button variant="primary" size="sm" className="mt-3">
                                        Add Outcomes
                                    </Button>
                                </Link>
                            </div>
                        </div>
                    </div>
                )}
            </Card>
        </div>
    );
}