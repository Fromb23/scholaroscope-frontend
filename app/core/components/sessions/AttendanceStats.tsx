'use client';

// ============================================================================
// app/core/components/sessions/AttendanceStats.tsx
//
// Renders the 4-stat strip for a session's attendance summary.
// Receives pre-computed stats — no logic inside.
// ============================================================================

import { Card } from '@/app/components/ui/Card';
import type { AttendanceStats } from '@/app/utils/sessionUtils';

interface AttendanceStatsProps {
    stats: AttendanceStats;
}

export function AttendanceStatsStrip({ stats }: AttendanceStatsProps) {
    const items = [
        { label: 'Recorded', value: stats.total, color: 'text-gray-900' },
        { label: 'Present', value: stats.present, color: 'text-green-600' },
        { label: 'Absent', value: stats.absent, color: 'text-red-600' },
        { label: 'Rate', value: `${stats.attendancePercent}%`, color: 'text-blue-600' },
    ];

    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {items.map(item => (
                <Card key={item.label}>
                    <div className="p-4">
                        <p className="text-xs text-gray-500">{item.label}</p>
                        <p className={`text-2xl font-semibold mt-1 ${item.color}`}>
                            {item.value}
                        </p>
                    </div>
                </Card>
            ))}
        </div>
    );
}