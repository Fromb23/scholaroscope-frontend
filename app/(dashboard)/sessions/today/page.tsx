'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Clock, Calendar, MapPin, Users, CheckCircle, AlertCircle } from 'lucide-react';
import { Card } from '@/app/components/ui/Card';
import { Button } from '@/app/components/ui/Button';
import { Badge } from '@/app/components/ui/Badge';
import { StatsCard } from '@/app/components/dashboard/StatsCard';
import { useTodaySessions } from '@/app/core/hooks/useSessions';

export default function TodaySessionsPage() {
    const router = useRouter();
    const { sessions, loading, error } = useTodaySessions();

    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();

    // Categorize sessions
    const upcomingSessions = sessions.filter(session => {
        const [hours, minutes] = session.start_time.split(':').map(Number);
        const sessionTime = hours * 60 + minutes;
        return sessionTime > currentTime;
    });

    const ongoingSessions = sessions.filter(session => {
        const [startHours, startMinutes] = session.start_time.split(':').map(Number);
        const [endHours, endMinutes] = session.end_time.split(':').map(Number);
        const startTime = startHours * 60 + startMinutes;
        const endTime = endHours * 60 + endMinutes;
        return currentTime >= startTime && currentTime <= endTime;
    });

    const completedSessions = sessions.filter(session => {
        const [hours, minutes] = session.end_time.split(':').map(Number);
        const sessionTime = hours * 60 + minutes;
        return sessionTime < currentTime;
    });

    // Calculate statistics
    const totalAttendanceMarked = sessions.filter(s => s.attendance_count.total > 0 && s.attendance_count.unmarked === 0).length;
    const avgAttendance = sessions.length > 0
        ? sessions.reduce((sum, s) => {
            const total = s.attendance_count.total;
            const present = s.attendance_count.present;
            return sum + (total > 0 ? (present / total) * 100 : 0);
        }, 0) / sessions.length
        : 0;

    const getSessionStatus = (session: typeof sessions[0]) => {
        const [startHours, startMinutes] = session.start_time.split(':').map(Number);
        const [endHours, endMinutes] = session.end_time.split(':').map(Number);
        const startTime = startHours * 60 + startMinutes;
        const endTime = endHours * 60 + endMinutes;

        if (currentTime < startTime) {
            return { label: 'Upcoming', variant: 'info' as const, icon: Clock };
        } else if (currentTime >= startTime && currentTime <= endTime) {
            return { label: 'Ongoing', variant: 'success' as const, icon: CheckCircle };
        } else {
            return { label: 'Completed', variant: 'default' as const, icon: CheckCircle };
        }
    };

    const getAttendanceStatus = (session: typeof sessions[0]) => {
        const { total, present, unmarked } = session.attendance_count;
        if (unmarked === total) {
            return { label: 'Not Marked', variant: 'warning' as const };
        }
        const percentage = total > 0 ? Math.round((present / total) * 100) : 0;
        if (percentage >= 80) {
            return { label: `${percentage}%`, variant: 'success' as const };
        } else if (percentage >= 60) {
            return { label: `${percentage}%`, variant: 'warning' as const };
        } else {
            return { label: `${percentage}%`, variant: 'danger' as const };
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center h-screen">
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
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link href="/sessions">
                        <Button variant="ghost" size="sm">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back to Sessions
                        </Button>
                    </Link>
                </div>
            </div>

            {/* Title */}
            <div>
                <h1 className="text-3xl font-bold text-gray-900">Today's Sessions</h1>
                <p className="text-gray-600 mt-1">
                    {new Date().toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                    })}
                </p>
            </div>

            {/* Stats */}
            <div className="grid gap-4 md:grid-cols-4">
                <StatsCard
                    title="Total Sessions"
                    value={sessions.length}
                    icon={Calendar}
                    color="blue"
                />
                <StatsCard
                    title="Ongoing"
                    value={ongoingSessions.length}
                    icon={CheckCircle}
                    color="green"
                />
                <StatsCard
                    title="Attendance Marked"
                    value={totalAttendanceMarked}
                    icon={Users}
                    color="purple"
                />
                <StatsCard
                    title="Avg Attendance"
                    value={`${avgAttendance.toFixed(1)}%`}
                    icon={Users}
                    color="orange"
                />
            </div>

            {/* No Sessions */}
            {sessions.length === 0 && (
                <Card>
                    <div className="py-12 text-center">
                        <Calendar className="mx-auto h-12 w-12 text-gray-400" />
                        <h3 className="mt-2 text-sm font-medium text-gray-900">No sessions today</h3>
                        <p className="mt-1 text-sm text-gray-500">There are no scheduled sessions for today</p>
                    </div>
                </Card>
            )}

            {/* Ongoing Sessions */}
            {ongoingSessions.length > 0 && (
                <Card>
                    <div className="p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <CheckCircle className="h-5 w-5 text-green-600" />
                                <h2 className="text-lg font-semibold text-gray-900">Ongoing Sessions</h2>
                                <Badge variant="success">{ongoingSessions.length}</Badge>
                            </div>
                        </div>
                        <div className="space-y-3">
                            {ongoingSessions.map(session => {
                                const status = getSessionStatus(session);
                                const attendance = getAttendanceStatus(session);
                                const Icon = status.icon;

                                return (
                                    <div
                                        key={session.id}
                                        className="flex items-center justify-between p-4 bg-green-50 border-l-4 border-green-600 rounded-lg cursor-pointer hover:bg-green-100 transition-colors"
                                        onClick={() => router.push(`/sessions/${session.id}`)}
                                    >
                                        <div className="flex items-center gap-4 flex-1">
                                            <div className="text-center min-w-[80px]">
                                                <div className="text-sm font-semibold text-gray-900">
                                                    {session.start_time}
                                                </div>
                                                <div className="text-xs text-gray-500">
                                                    {session.end_time}
                                                </div>
                                            </div>
                                            <div className="flex-1">
                                                <div className="font-medium text-gray-900">
                                                    {session.subject_name}
                                                </div>
                                                <div className="flex items-center gap-2 mt-1 text-sm text-gray-600">
                                                    <span>{session.cohort_name}</span>
                                                    <span>•</span>
                                                    <span>{session.session_type_display}</span>
                                                    {session.venue && (
                                                        <>
                                                            <span>•</span>
                                                            <MapPin className="h-3 w-3" />
                                                            <span>{session.venue}</span>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <div className="text-right">
                                                <div className="text-sm font-medium text-gray-900">
                                                    {session.attendance_count.present}/{session.attendance_count.total}
                                                </div>
                                                <Badge variant={attendance.variant} size="sm">
                                                    {attendance.label}
                                                </Badge>
                                            </div>
                                            <Button
                                                variant="primary"
                                                size="sm"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    router.push(`/sessions/${session.id}`);
                                                }}
                                            >
                                                Mark Attendance
                                            </Button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </Card>
            )}

            {/* Upcoming Sessions */}
            {upcomingSessions.length > 0 && (
                <Card>
                    <div className="p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <Clock className="h-5 w-5 text-blue-600" />
                                <h2 className="text-lg font-semibold text-gray-900">Upcoming Sessions</h2>
                                <Badge variant="info">{upcomingSessions.length}</Badge>
                            </div>
                        </div>
                        <div className="space-y-3">
                            {upcomingSessions.map(session => {
                                const status = getSessionStatus(session);
                                const attendance = getAttendanceStatus(session);

                                return (
                                    <div
                                        key={session.id}
                                        className="flex items-center justify-between p-4 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors"
                                        onClick={() => router.push(`/sessions/${session.id}`)}
                                    >
                                        <div className="flex items-center gap-4 flex-1">
                                            <div className="text-center min-w-[80px]">
                                                <div className="text-sm font-semibold text-gray-900">
                                                    {session.start_time}
                                                </div>
                                                <div className="text-xs text-gray-500">
                                                    {session.end_time}
                                                </div>
                                            </div>
                                            <div className="flex-1">
                                                <div className="font-medium text-gray-900">
                                                    {session.subject_name}
                                                </div>
                                                <div className="flex items-center gap-2 mt-1 text-sm text-gray-600">
                                                    <span>{session.cohort_name}</span>
                                                    <span>•</span>
                                                    <span>{session.session_type_display}</span>
                                                    {session.venue && (
                                                        <>
                                                            <span>•</span>
                                                            <MapPin className="h-3 w-3" />
                                                            <span>{session.venue}</span>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <Badge variant={status.variant}>{status.label}</Badge>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    router.push(`/sessions/${session.id}`);
                                                }}
                                            >
                                                View Details
                                            </Button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </Card>
            )}

            {/* Completed Sessions */}
            {completedSessions.length > 0 && (
                <Card>
                    <div className="p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <CheckCircle className="h-5 w-5 text-gray-600" />
                                <h2 className="text-lg font-semibold text-gray-900">Completed Sessions</h2>
                                <Badge variant="default">{completedSessions.length}</Badge>
                            </div>
                        </div>
                        <div className="space-y-3">
                            {completedSessions.map(session => {
                                const attendance = getAttendanceStatus(session);

                                return (
                                    <div
                                        key={session.id}
                                        className="flex items-center justify-between p-4 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors opacity-75"
                                        onClick={() => router.push(`/sessions/${session.id}`)}
                                    >
                                        <div className="flex items-center gap-4 flex-1">
                                            <div className="text-center min-w-[80px]">
                                                <div className="text-sm font-semibold text-gray-900">
                                                    {session.start_time}
                                                </div>
                                                <div className="text-xs text-gray-500">
                                                    {session.end_time}
                                                </div>
                                            </div>
                                            <div className="flex-1">
                                                <div className="font-medium text-gray-900">
                                                    {session.subject_name}
                                                </div>
                                                <div className="flex items-center gap-2 mt-1 text-sm text-gray-600">
                                                    <span>{session.cohort_name}</span>
                                                    <span>•</span>
                                                    <span>{session.session_type_display}</span>
                                                    {session.venue && (
                                                        <>
                                                            <span>•</span>
                                                            <MapPin className="h-3 w-3" />
                                                            <span>{session.venue}</span>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <div className="text-right">
                                                <div className="text-sm font-medium text-gray-900">
                                                    {session.attendance_count.present}/{session.attendance_count.total}
                                                </div>
                                                <Badge variant={attendance.variant} size="sm">
                                                    {attendance.label}
                                                </Badge>
                                            </div>
                                            {session.attendance_count.unmarked > 0 && (
                                                <Button
                                                    variant="primary"
                                                    size="sm"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        router.push(`/sessions/${session.id}`);
                                                    }}
                                                >
                                                    Mark Attendance
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </Card>
            )}

            {/* Quick Summary */}
            {sessions.length > 0 && (
                <Card>
                    <div className="p-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">Summary</h2>
                        <div className="grid gap-4 md:grid-cols-3">
                            <div className="text-center p-4 bg-blue-50 rounded-lg">
                                <p className="text-3xl font-bold text-blue-600">{upcomingSessions.length}</p>
                                <p className="text-sm text-gray-600 mt-1">Upcoming</p>
                            </div>
                            <div className="text-center p-4 bg-green-50 rounded-lg">
                                <p className="text-3xl font-bold text-green-600">{ongoingSessions.length}</p>
                                <p className="text-sm text-gray-600 mt-1">In Progress</p>
                            </div>
                            <div className="text-center p-4 bg-gray-50 rounded-lg">
                                <p className="text-3xl font-bold text-gray-600">{completedSessions.length}</p>
                                <p className="text-sm text-gray-600 mt-1">Completed</p>
                            </div>
                        </div>
                    </div>
                </Card>
            )}
        </div>
    );
}