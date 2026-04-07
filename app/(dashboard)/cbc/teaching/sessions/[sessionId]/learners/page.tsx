'use client';
// app/(dashboard)/cbc/teaching/sessions/[sessionId]/learners/page.tsx

import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Users, FileText, Target, BookOpen } from 'lucide-react';
import {
    useTeachingSession, useSessionLearners, useOutcomeSessions,
} from '@/app/plugins/cbc/hooks/useCBC';
import {
    CBCNav, CBCBreadcrumb, CBCError, CBCLoading, SessionStatusBadge,
} from '@/app/plugins/cbc/components/CBCComponents';
import { Card } from '@/app/components/ui/Card';
import { Button } from '@/app/components/ui/Button';
import { Badge } from '@/app/components/ui/Badge';

export default function SessionLearnersPage() {
    const { sessionId: raw } = useParams<{ sessionId: string }>();
    const sessionId = Number(raw);
    const router = useRouter();

    const { data: session, isLoading: sessionLoading, error: sessionError } =
        useTeachingSession(sessionId);
    const { data: learners = [], isLoading: learnersLoading } = useSessionLearners(sessionId);
    const { data: links = [] } = useOutcomeSessions(sessionId);

    const learnersWithEvidence = learners.filter(l => l.session_evidence_count > 0).length;

    if (sessionLoading) return (
        <div className="space-y-6"><CBCNav /><CBCLoading message="Loading session…" /></div>
    );

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
                { label: 'Learners' },
            ]} />

            {/* Session header */}
            <Card>
                <div className="flex flex-col sm:flex-row items-start gap-4">
                    <div className="p-3 bg-purple-50 rounded-xl border border-purple-100 shrink-0">
                        <BookOpen className="h-7 w-7 text-purple-600" />
                    </div>
                    <div className="flex-1">
                        <div className="flex items-center gap-3 flex-wrap mb-1">
                            <h1 className="text-xl font-bold text-gray-900">
                                {session.subject_name ?? 'General Session'}
                            </h1>
                            <SessionStatusBadge status={session.status} />
                        </div>
                        <p className="text-gray-600 mb-2">{session.cohort_name}</p>
                        <div className="flex items-center gap-4 text-sm text-gray-500 flex-wrap">
                            <span>
                                {new Date(session.session_date).toLocaleDateString('en-GB', {
                                    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
                                })}
                            </span>
                            <div className="flex items-center gap-2">
                                <Badge variant="blue" size="sm">{links.length} outcomes</Badge>
                                <Badge variant="purple" size="sm">{learners.length} learners</Badge>
                            </div>
                        </div>
                    </div>
                    {/* Tab nav */}
                    <div className="flex gap-2 shrink-0">
                        <Link href={`/cbc/teaching/sessions/${sessionId}/outcomes`}
                            className="px-3 py-1.5 text-gray-600 text-sm font-medium
                hover:bg-gray-100 rounded-lg transition-colors">
                            Outcomes
                        </Link>
                        <span className="px-3 py-1.5 bg-purple-600 text-white text-sm
              font-medium rounded-lg flex items-center gap-1.5">
                            <Users className="h-4 w-4" />
                            Learners
                        </span>
                    </div>
                </div>
            </Card>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
                {[
                    { label: 'Total Learners', value: learners.length, color: 'text-purple-600' },
                    { label: 'With Evidence', value: learnersWithEvidence, color: 'text-emerald-600' },
                    { label: 'Total Records', value: learners.reduce((s, l) => s + l.session_evidence_count, 0), color: 'text-blue-600' },
                ].map(s => (
                    <Card key={s.label} className="text-center">
                        <div className={`text-3xl font-bold ${s.color}`}>{s.value}</div>
                        <div className="text-sm text-gray-600 mt-1">{s.label}</div>
                    </Card>
                ))}
            </div>

            {/* Learners list */}
            <Card>
                <div className="mb-5">
                    <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                        <Users className="h-5 w-5 text-purple-600" />
                        Learners
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">Evidence recorded for this session</p>
                </div>

                {learnersLoading ? (
                    <CBCLoading />
                ) : learners.length === 0 ? (
                    <div className="py-16 text-center">
                        <Users className="mx-auto h-12 w-12 text-gray-300 mb-3" />
                        <p className="text-gray-500">No learners in this cohort</p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {learners.map(learner => (
                            <div key={learner.id}
                                className="flex items-center justify-between p-4 border border-gray-200
                  rounded-xl hover:border-purple-300 hover:bg-purple-50 transition-all">
                                <div className="flex items-center gap-4 flex-1 min-w-0">
                                    <div className="p-2.5 bg-purple-100 rounded-lg shrink-0">
                                        <Users className="h-5 w-5 text-purple-600" />
                                    </div>
                                    <div className="min-w-0">
                                        <h3 className="font-semibold text-gray-900 truncate">
                                            {learner.first_name} {learner.last_name}
                                        </h3>
                                        <p className="text-sm text-gray-500">{learner.admission_number}</p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4 shrink-0">
                                    <div className="text-right">
                                        <div className="text-2xl font-bold text-purple-600">
                                            {learner.session_evidence_count}
                                        </div>
                                        <div className="text-xs text-gray-500">
                                            record{learner.session_evidence_count !== 1 ? 's' : ''}
                                        </div>
                                    </div>

                                    {links.length > 0 ? (
                                        <Button
                                            variant={learner.session_evidence_count > 0 ? 'primary' : 'secondary'}
                                            size="sm"
                                            onClick={() => {
                                                // Navigate to first linked outcome's evidence page
                                                const firstOutcome = links[0].learning_outcome;
                                                router.push(
                                                    `/cbc/teaching/sessions/${sessionId}/outcomes/${firstOutcome}?student=${learner.id}`
                                                );
                                            }}
                                        >
                                            <FileText className="h-4 w-4 mr-2" />
                                            {learner.session_evidence_count > 0 ? 'View' : 'Record'} Evidence
                                        </Button>
                                    ) : (
                                        <span className="text-xs text-gray-400">Link outcomes first</span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* No outcomes warning */}
                {!learnersLoading && learners.length > 0 && links.length === 0 && (
                    <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
                        <div className="flex items-start gap-3">
                            <Target className="h-5 w-5 text-yellow-600 mt-0.5 shrink-0" />
                            <div>
                                <p className="text-sm font-medium text-yellow-900">No outcomes linked yet</p>
                                <p className="text-sm text-yellow-700 mt-1">
                                    Link learning outcomes before recording evidence.
                                </p>
                                <Link href={`/cbc/teaching/sessions/${sessionId}/outcomes/add`}>
                                    <Button variant="primary" size="sm" className="mt-3">Add Outcomes</Button>
                                </Link>
                            </div>
                        </div>
                    </div>
                )}
            </Card>
        </div>
    );
}