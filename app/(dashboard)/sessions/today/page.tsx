'use client';

// ============================================================================
// app/(dashboard)/sessions/today/page.tsx
// ============================================================================

import Link from 'next/link';
import { ArrowLeft, Calendar, Clock, CheckCircle, Users, AlertCircle } from 'lucide-react';
import { Card } from '@/app/components/ui/Card';
import { Button } from '@/app/components/ui/Button';
import { Badge } from '@/app/components/ui/Badge';
import { StatsCard } from '@/app/components/dashboard/StatsCard';
import { SessionCard } from '@/app/core/components/sessions/SessionCard';
import { getSessionStatus } from '@/app/core/components/sessions/SessionStatusBadge';
import { useTodaySessions } from '@/app/core/hooks/useSessions';

export default function TodaySessionsPage() {
    const { sessions, loading, error } = useTodaySessions();

    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    const ongoing = sessions.filter(s => getSessionStatus(s, currentMinutes) === 'ongoing');
    const upcoming = sessions.filter(s => getSessionStatus(s, currentMinutes) === 'upcoming');
    const completed = sessions.filter(s => getSessionStatus(s, currentMinutes) === 'completed');

    const totalMarked = sessions.filter(
        s => s.attendance_count.total > 0 && s.attendance_count.unmarked === 0
    ).length;

    const avgAttendance = sessions.length > 0
        ? sessions.reduce((sum, s) => {
            const { total, present } = s.attendance_count;
            return sum + (total > 0 ? (present / total) * 100 : 0);
        }, 0) / sessions.length
        : 0;

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex h-screen items-center justify-center">
                <div className="text-center">
                    <AlertCircle className="mx-auto h-12 w-12 text-red-500" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">Error loading sessions</h3>
                    <p className="mt-1 text-sm text-gray-500">{error}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Link href="/sessions">
                    <Button variant="ghost" size="sm">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Sessions
                    </Button>
                </Link>
            </div>

            <div>
                <h1 className="text-3xl font-bold text-gray-900">Today&apos;s Sessions</h1>
                <p className="text-gray-600 mt-1">
                    {now.toLocaleDateString('en-US', {
                        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
                    })}
                </p>
            </div>

            {/* Stats */}
            <div className="grid gap-4 md:grid-cols-4">
                <StatsCard title="Total Sessions" value={sessions.length} icon={Calendar} color="blue" />
                <StatsCard title="Ongoing" value={ongoing.length} icon={CheckCircle} color="green" />
                <StatsCard title="Attendance Marked" value={totalMarked} icon={Users} color="purple" />
                <StatsCard title="Avg Attendance" value={`${avgAttendance.toFixed(1)}%`} icon={Users} color="orange" />
            </div>

            {/* No sessions */}
            {sessions.length === 0 && (
                <Card>
                    <div className="py-12 text-center">
                        <Calendar className="mx-auto h-12 w-12 text-gray-400" />
                        <h3 className="mt-2 text-sm font-medium text-gray-900">No sessions today</h3>
                        <p className="mt-1 text-sm text-gray-500">There are no scheduled sessions for today</p>
                    </div>
                </Card>
            )}

            {/* Ongoing */}
            {ongoing.length > 0 && (
                <Card>
                    <div className="p-6">
                        <div className="flex items-center gap-2 mb-4">
                            <CheckCircle className="h-5 w-5 text-green-600" />
                            <h2 className="text-lg font-semibold text-gray-900">Ongoing Sessions</h2>
                            <Badge variant="success">{ongoing.length}</Badge>
                        </div>
                        <div className="space-y-3">
                            {ongoing.map(session => (
                                <SessionCard
                                    key={session.id}
                                    session={session}
                                    variant="ongoing"
                                    currentMinutes={currentMinutes}
                                />
                            ))}
                        </div>
                    </div>
                </Card>
            )}

            {/* Upcoming */}
            {upcoming.length > 0 && (
                <Card>
                    <div className="p-6">
                        <div className="flex items-center gap-2 mb-4">
                            <Clock className="h-5 w-5 text-blue-600" />
                            <h2 className="text-lg font-semibold text-gray-900">Upcoming Sessions</h2>
                            <Badge variant="info">{upcoming.length}</Badge>
                        </div>
                        <div className="space-y-3">
                            {upcoming.map(session => (
                                <SessionCard
                                    key={session.id}
                                    session={session}
                                    variant="upcoming"
                                    currentMinutes={currentMinutes}
                                />
                            ))}
                        </div>
                    </div>
                </Card>
            )}

            {/* Completed */}
            {completed.length > 0 && (
                <Card>
                    <div className="p-6">
                        <div className="flex items-center gap-2 mb-4">
                            <CheckCircle className="h-5 w-5 text-gray-600" />
                            <h2 className="text-lg font-semibold text-gray-900">Completed Sessions</h2>
                            <Badge variant="default">{completed.length}</Badge>
                        </div>
                        <div className="space-y-3">
                            {completed.map(session => (
                                <SessionCard
                                    key={session.id}
                                    session={session}
                                    variant="completed"
                                    currentMinutes={currentMinutes}
                                />
                            ))}
                        </div>
                    </div>
                </Card>
            )}

            {/* Summary */}
            {sessions.length > 0 && (
                <Card>
                    <div className="p-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">Summary</h2>
                        <div className="grid gap-4 md:grid-cols-3">
                            <div className="text-center p-4 bg-blue-50 rounded-lg">
                                <p className="text-3xl font-bold text-blue-600">{upcoming.length}</p>
                                <p className="text-sm text-gray-600 mt-1">Upcoming</p>
                            </div>
                            <div className="text-center p-4 bg-green-50 rounded-lg">
                                <p className="text-3xl font-bold text-green-600">{ongoing.length}</p>
                                <p className="text-sm text-gray-600 mt-1">In Progress</p>
                            </div>
                            <div className="text-center p-4 bg-gray-50 rounded-lg">
                                <p className="text-3xl font-bold text-gray-600">{completed.length}</p>
                                <p className="text-sm text-gray-600 mt-1">Completed</p>
                            </div>
                        </div>
                    </div>
                </Card>
            )}
        </div>
    );
}