'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { BookOpen, FileText, Target, Users } from 'lucide-react';
import {
    useTeachingSession,
    useSessionLearners,
    useOutcomeSessions,
} from '@/app/plugins/cbc/hooks/useCBC';
import {
    CBCNav,
    CBCBreadcrumb,
    CBCError,
    CBCLoading,
    SessionStatusBadge,
    CBCTeachingSessionNav,
} from '@/app/plugins/cbc/components/CBCComponents';
import { Card } from '@/app/components/ui/Card';
import { Button } from '@/app/components/ui/Button';
import { Badge } from '@/app/components/ui/Badge';

export function CBCSessionLearnersPage() {
    const { sessionId: raw } = useParams<{ sessionId: string }>();
    const sessionId = Number(raw);
    const router = useRouter();

    const { data: session, isLoading: sessionLoading, error: sessionError } = useTeachingSession(sessionId);
    const { data: learners = [], isLoading: learnersLoading } = useSessionLearners(sessionId);
    const { data: links = [] } = useOutcomeSessions(sessionId);

    const learnersWithEvidence = learners.filter(learner => learner.session_evidence_count > 0).length;

    if (sessionLoading) {
        return (
            <div className="space-y-6">
                <CBCNav />
                <CBCLoading message="Loading lesson…" />
            </div>
        );
    }

    if (sessionError || !session) {
        return (
            <div className="space-y-6">
                <CBCNav />
                <CBCError error={sessionError ?? 'Lesson not found'} />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <CBCNav />
            <CBCBreadcrumb segments={[
                { label: 'Teaching', href: '/cbc/teaching' },
                { label: 'Lessons', href: '/cbc/teaching/sessions' },
                { label: session.subject_name ?? 'Lesson', href: `/cbc/teaching/sessions/${sessionId}/outcomes` },
                { label: 'Learners' },
            ]} />
            <CBCTeachingSessionNav sessionId={sessionId} active="learners" />

            <Card>
                <div className="flex flex-col sm:flex-row items-start gap-4">
                    <div className="p-3 bg-purple-50 rounded-xl border border-purple-100 shrink-0">
                        <BookOpen className="h-7 w-7 text-purple-600" />
                    </div>
                    <div className="flex-1">
                        <div className="flex items-center gap-3 flex-wrap mb-1">
                            <h1 className="text-xl font-bold text-gray-900">
                                {session.subject_name ?? 'Lesson'}
                            </h1>
                            <SessionStatusBadge status={session.status} />
                        </div>
                        <p className="text-gray-600 mb-2">{session.cohort_name}</p>
                        <p className="text-sm text-gray-500 mb-2">
                            Learners shown here reflect the session&apos;s active participation scope.
                        </p>
                        <div className="flex items-center gap-4 text-sm text-gray-500 flex-wrap">
                            <span>
                                {new Date(session.session_date).toLocaleDateString('en-GB', {
                                    weekday: 'long',
                                    day: 'numeric',
                                    month: 'long',
                                    year: 'numeric',
                                })}
                            </span>
                            <div className="flex items-center gap-2">
                                <Badge variant="blue" size="sm">{links.length} learning goal{links.length !== 1 ? 's' : ''}</Badge>
                                <Badge variant="purple" size="sm">{learners.length} learners</Badge>
                            </div>
                        </div>
                    </div>
                </div>
            </Card>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                {[
                    { label: 'Total participating learners', value: learners.length, color: 'text-purple-600' },
                    { label: 'Observed', value: learnersWithEvidence, color: 'text-emerald-600' },
                    { label: 'Performance Records', value: learners.reduce((sum, learner) => sum + learner.session_evidence_count, 0), color: 'text-blue-600' },
                ].map(stat => (
                    <Card key={stat.label} className="text-center">
                        <div className={`text-3xl font-bold ${stat.color}`}>{stat.value}</div>
                        <div className="text-sm text-gray-600 mt-1">{stat.label}</div>
                    </Card>
                ))}
            </div>

            <Card>
                <div className="mb-5">
                    <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                        <Users className="h-5 w-5 text-purple-600" />
                        Participating learners
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">See which learners in the active session scope already have observations for this lesson.</p>
                </div>

                {learnersLoading ? (
                    <CBCLoading />
                ) : learners.length === 0 ? (
                    <div className="py-16 text-center">
                        <Users className="mx-auto h-12 w-12 text-gray-300 mb-3" />
                        <p className="text-gray-500">No learners are active in this session scope.</p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {learners.map(learner => (
                            <div
                                key={learner.id}
                                className="flex flex-col gap-4 p-4 border border-gray-200 rounded-xl hover:border-purple-300 hover:bg-purple-50 transition-all sm:flex-row sm:items-center sm:justify-between"
                            >
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

                                <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center sm:gap-4">
                                    <div className="flex items-center justify-between sm:block sm:text-right">
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
                                            className="w-full sm:w-auto"
                                            onClick={() => {
                                                const firstOutcome = links[0].learning_outcome;
                                                router.push(
                                                    `/cbc/teaching/sessions/${sessionId}/outcomes/${firstOutcome}?student=${learner.id}`
                                                );
                                            }}
                                        >
                                            <FileText className="h-4 w-4 mr-2" />
                                            {learner.session_evidence_count > 0 ? 'View' : 'Record'} performance
                                        </Button>
                                    ) : (
                                        <span className="text-xs text-gray-400">Confirm what was taught first</span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {!learnersLoading && learners.length > 0 && links.length === 0 && (
                    <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
                        <div className="flex items-start gap-3">
                            <Target className="h-5 w-5 text-yellow-600 mt-0.5 shrink-0" />
                            <div>
                                <p className="text-sm font-medium text-yellow-900">No taught outcomes have been confirmed yet</p>
                                <p className="text-sm text-yellow-700 mt-1">
                                    Confirm what was taught on the lesson page before recording class performance.
                                </p>
                                <Link href={`/sessions/${sessionId}`}>
                                    <Button variant="primary" size="sm" className="mt-3">Open lesson</Button>
                                </Link>
                            </div>
                        </div>
                    </div>
                )}
            </Card>
        </div>
    );
}
