'use client';

import { Activity, Calendar, TrendingUp, Users } from 'lucide-react';
import { StatsCard } from '@/app/components/dashboard/StatsCard';

interface AttendanceReportStatsProps {
    records: number;
    avgAttendance: number;
    totalSessions: number;
    atRisk: number;
}

export function AttendanceReportStats({
    records,
    avgAttendance,
    totalSessions,
    atRisk,
}: AttendanceReportStatsProps) {
    return (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatsCard title="Records" value={records} icon={Users} color="blue" />
            <StatsCard title="Avg Attendance" value={`${avgAttendance.toFixed(1)}%`} icon={Activity} color="green" />
            <StatsCard title="Total Sessions" value={totalSessions} icon={TrendingUp} color="purple" />
            <StatsCard title="At Risk (<75%)" value={atRisk} icon={Calendar} color="red" />
        </div>
    );
}
