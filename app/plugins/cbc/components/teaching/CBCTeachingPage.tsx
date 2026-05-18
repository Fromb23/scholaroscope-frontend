'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
    BookOpen,
    Calendar,
    Clock,
    FileText,
    Plus,
    Target,
    ArrowRight,
} from 'lucide-react';
import { useTodaySessions, useRecentSessions } from '@/app/plugins/cbc/hooks/useCBC';
import {
    CBCNav,
    CBCError,
    CBCLoading,
    SessionStatusBadge,
} from '@/app/plugins/cbc/components/CBCComponents';
import { Card } from '@/app/components/ui/Card';
import { Button } from '@/app/components/ui/Button';
import { Badge } from '@/app/components/ui/Badge';

function formatDate(value: string) {
    return new Date(value).toLocaleDateString('en-GB', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
    });
}

export function CBCTeachingPage() {
    const router = useRouter();
    const { data: todaySessions = [], isLoading: loadingToday, error: todayError } = useTodaySessions();
    const { data: recentSessions = [], isLoading: loadingRecent } = useRecentSessions(7);

    return (
        <div className="space-y-6">
            <CBCNav />

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Teaching Workspace</h1>
                    <p className="text-gray-500 mt-1">
                        Manage lessons, record what was taught, and track class performance
                    </p>
                </div>
                <Link href="/cbc/teaching/sessions" className="w-full sm:w-auto">
                    <Button variant="primary" size="md" className="w-full sm:w-auto">
                        <Calendar className="mr-2 h-4 w-4" />All Lessons
                    </Button>
                </Link>
            </div>

            {todayError && <CBCError error={todayError} />}

            <Card>
                <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-blue-100 rounded-lg">
                            <Clock className="h-6 w-6 text-blue-600" />
                        </div>
                        <div>
                            <h2 className="text-xl font-semibold text-gray-900">Today&apos;s Lessons</h2>
                            <p className="text-sm text-gray-500">
                                {new Date().toLocaleDateString('en-GB', {
                                    weekday: 'long',
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric',
                                })}
                            </p>
                        </div>
                    </div>
                    <Badge variant="blue" size="lg">
                        {todaySessions.length} lesson{todaySessions.length !== 1 ? 's' : ''}
                    </Badge>
                </div>

                {loadingToday ? (
                    <CBCLoading message="Loading today's lessons…" />
                ) : todaySessions.length === 0 ? (
                    <div className="py-12 text-center">
                        <Calendar className="mx-auto h-12 w-12 text-gray-300 mb-3" />
                        <p className="text-gray-500 mb-4">No lessons scheduled for today</p>
                        <Link href="/lesson-plans/new">
                            <Button variant="primary" size="sm">
                                <Plus className="mr-2 h-4 w-4" />Plan a lesson
                            </Button>
                        </Link>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {todaySessions.map(session => (
                            <button
                                key={session.id}
                                onClick={() => router.push(`/cbc/teaching/sessions/${session.id}/outcomes`)}
                                className="w-full flex items-center justify-between p-4 border border-gray-200 rounded-xl hover:border-blue-300 hover:bg-blue-50 transition-all text-left"
                            >
                                <div className="flex items-center gap-4 min-w-0 flex-1">
                                    <div className="p-3 bg-blue-50 rounded-lg border border-blue-100 shrink-0">
                                        <BookOpen className="h-5 w-5 text-blue-600" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <h3 className="font-semibold text-gray-900 truncate">
                                            {session.subject_name ?? 'Lesson'}
                                        </h3>
                                        <p className="text-sm text-gray-500 truncate">{session.cohort_name}</p>
                                        <div className="flex items-center gap-3 mt-1.5">
                                            <SessionStatusBadge status={session.status} />
                                            {(session.outcome_links_count ?? 0) > 0 && (
                                                <span className="text-xs text-gray-500 flex items-center gap-1">
                                                    <Target className="h-3.5 w-3.5" />
                                                    {session.outcome_links_count} learning goal{session.outcome_links_count !== 1 ? 's' : ''}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <ArrowRight className="h-5 w-5 text-gray-400 shrink-0" />
                            </button>
                        ))}
                    </div>
                )}
            </Card>

            <Card>
                <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-purple-100 rounded-lg">
                            <FileText className="h-6 w-6 text-purple-600" />
                        </div>
                        <div>
                            <h2 className="text-xl font-semibold text-gray-900">Recent Lessons</h2>
                            <p className="text-sm text-gray-500">Last 7 days</p>
                        </div>
                    </div>
                </div>

                {loadingRecent ? (
                    <CBCLoading />
                ) : recentSessions.length === 0 ? (
                    <div className="py-8 text-center">
                        <p className="text-sm text-gray-500">No recent lessons</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {recentSessions.slice(0, 6).map(session => (
                            <Link
                                key={session.id}
                                href={`/cbc/teaching/sessions/${session.id}/outcomes`}
                                className="block p-4 border border-gray-200 rounded-xl hover:border-purple-300 hover:bg-purple-50 transition-all"
                            >
                                <div className="flex items-start justify-between mb-2">
                                    <Badge variant="purple" size="sm">{formatDate(session.session_date)}</Badge>
                                    <SessionStatusBadge status={session.status} />
                                </div>
                                <h3 className="font-medium text-gray-900 mb-1 truncate">
                                    {session.subject_name ?? 'General'}
                                </h3>
                                <p className="text-sm text-gray-500 truncate">{session.cohort_name}</p>
                            </Link>
                        ))}
                    </div>
                )}
            </Card>
        </div>
    );
}
