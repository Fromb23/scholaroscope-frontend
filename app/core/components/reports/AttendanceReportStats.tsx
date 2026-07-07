'use client';

import { Activity, Calendar, TrendingUp, Users } from 'lucide-react';
import { StatsCard } from '@/app/components/dashboard/StatsCard';
import { StatStrip } from '@/app/components/dashboard/StatStrip';

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
        <StatStrip mdColumns={2} lgColumns={4}>
            <StatsCard title="Records" value={records} icon={Users} color="blue" mobile="hide" />
            <StatsCard title="Avg Attendance" value={`${avgAttendance.toFixed(1)}%`} icon={Activity} color="green" mobile="compact" />
            <StatsCard title="Total Sessions" value={totalSessions} icon={TrendingUp} color="purple" mobile="hide" />
            <StatsCard title="At Risk (<75%)" value={atRisk} icon={Calendar} color="red" mobile="compact" />
        </StatStrip>
    );
}
