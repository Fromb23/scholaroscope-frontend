// ============================================================================
// app/(dashboard)/cbc/teaching/page.tsx
// Teaching Entry - Today's sessions and quick access
// ============================================================================

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
    Calendar,
    Clock,
    BookOpen,
    Users,
    Target,
    Plus,
    ArrowRight,
    FileText
} from 'lucide-react';
import { useTodaySessions, useTeachingSessions } from '@/app/plugins/cbc/hooks/useCBC';
import { Card } from '@/app/components/ui/Card';
import { Button } from '@/app/components/ui/Button';
import { Badge } from '@/app/components/ui/Badge';

export default function TeachingHomePage() {
    const router = useRouter();
    const { sessions: todaySessions, loading: loadingToday } = useTodaySessions();
    const { sessions: recentSessions, loading: loadingRecent } = useTeachingSessions({
        recent: true,
        days: 7
    });
    console.log("TEaching sessions in teaching page", todaySessions);
    console.log("Recent sessions in teaching sessions", recentSessions);

    const formatTime = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric'
        });
    };

    return (
        <div className="space-y-6 max-w-7xl mx-auto">
            {/* CBC nav */}
            <nav className="flex gap-2 bg-white rounded-xl p-1.5 shadow-sm border border-gray-200">
                <Link
                    href="/cbc/authoring"
                    className="flex-1 text-center text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg py-2.5 transition-colors"
                >
                    Authoring
                </Link>
                <Link
                    href="/cbc/browser"
                    className="flex-1 text-center text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg py-2.5 transition-colors"
                >
                    Browser
                </Link>
                <Link
                    href="/cbc/progress"
                    className="flex-1 text-center text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg py-2.5 transition-colors"
                >
                    Progress
                </Link>
                <Link
                    href="/cbc/teaching"
                    className="flex-1 text-center text-sm font-semibold text-white bg-blue-600 rounded-lg py-2.5 shadow-sm"
                >
                    Teaching
                </Link>
            </nav>

            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Teaching Workspace</h1>
                    <p className="text-gray-500 mt-1">
                        Manage sessions, link outcomes, and record evidence
                    </p>
                </div>
                <Link href="/cbc/teaching/sessions">
                    <Button variant="primary" size="md">
                        <Calendar className="mr-2 h-4 w-4" />
                        All Sessions
                    </Button>
                </Link>
            </div>

            {/* Today's Sessions */}
            <Card className="shadow-sm">
                <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-blue-100 rounded-lg">
                            <Clock className="h-6 w-6 text-blue-600" />
                        </div>
                        <div>
                            <h2 className="text-xl font-semibold text-gray-900">Today's Sessions</h2>
                            <p className="text-sm text-gray-500">
                                {new Date().toLocaleDateString('en-US', {
                                    weekday: 'long',
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric'
                                })}
                            </p>
                        </div>
                    </div>
                    <Badge variant="blue" size="lg">
                        {todaySessions.length} session{todaySessions.length !== 1 ? 's' : ''}
                    </Badge>
                </div>

                {loadingToday ? (
                    <div className="py-12 text-center">
                        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
                        <p className="mt-2 text-sm text-gray-500">Loading sessions...</p>
                    </div>
                ) : todaySessions.length === 0 ? (
                    <div className="py-12 text-center">
                        <Calendar className="mx-auto h-12 w-12 text-gray-300 mb-3" />
                        <p className="text-gray-500 mb-4">No sessions scheduled for today</p>
                        <Link href="/sessions">
                            <Button variant="primary" size="sm">
                                <Plus className="mr-2 h-4 w-4" />
                                Schedule Session
                            </Button>
                        </Link>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {todaySessions.map((session) => (
                            <button
                                key={session.id}
                                onClick={() => router.push(`/cbc/teaching/sessions/${session.id}`)}
                                className="w-full flex items-center justify-between p-4 border border-gray-200 rounded-xl hover:border-blue-300 hover:bg-blue-50 transition-all text-left"
                            >
                                <div className="flex items-center gap-4 min-w-0 flex-1">
                                    <div className="p-3 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border border-blue-100">
                                        <BookOpen className="h-5 w-5 text-blue-600" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <h3 className="font-semibold text-gray-900 truncate">
                                            {session.subject_name || 'General Session'}
                                        </h3>
                                        <p className="text-sm text-gray-500 truncate">
                                            {session.cohort_name}
                                        </p>
                                        <div className="flex items-center gap-4 mt-2">
                                            <div className="flex items-center gap-1.5 text-xs text-gray-500">
                                                <Target className="h-3.5 w-3.5" />
                                                <span>{session.outcome_links_count} outcomes</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <ArrowRight className="h-5 w-5 text-gray-400" />
                            </button>
                        ))}
                    </div>
                )}
            </Card>

            {/* Recent Sessions */}
            <Card className="shadow-sm">
                <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-purple-100 rounded-lg">
                            <FileText className="h-6 w-6 text-purple-600" />
                        </div>
                        <div>
                            <h2 className="text-xl font-semibold text-gray-900">Recent Sessions</h2>
                            <p className="text-sm text-gray-500">Last 7 days</p>
                        </div>
                    </div>
                </div>

                {loadingRecent ? (
                    <div className="py-8 text-center">
                        <div className="inline-block h-6 w-6 animate-spin rounded-full border-4 border-purple-600 border-t-transparent" />
                    </div>
                ) : recentSessions.length === 0 ? (
                    <div className="py-8 text-center">
                        <p className="text-sm text-gray-500">No recent sessions</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {recentSessions.slice(0, 6).map((session) => (
                            <Link
                                key={session.id}
                                href={`/cbc/teaching/sessions/${session.id}`}
                                className="block p-4 border border-gray-200 rounded-lg hover:border-purple-300 hover:bg-purple-50 transition-all"
                            >
                                <div className="flex items-start justify-between mb-2">
                                    <Badge variant="purple" size="sm">
                                        {formatTime(session.session_date)}
                                    </Badge>
                                    <Badge variant="default" size="sm">
                                        {session.outcome_links_count}
                                    </Badge>
                                </div>
                                <h3 className="font-medium text-gray-900 mb-1 truncate">
                                    {session.subject_name || 'General'}
                                </h3>
                                <p className="text-sm text-gray-500 truncate">
                                    {session.cohort_name}
                                </p>
                            </Link>
                        ))}
                    </div>
                )}
            </Card>
        </div>
    );
}