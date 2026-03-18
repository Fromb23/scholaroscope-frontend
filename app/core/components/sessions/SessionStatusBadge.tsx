'use client';

// ============================================================================
// app/core/components/sessions/SessionStatusBadge.tsx
//
// Renders a status badge for a session based on current time vs start/end time.
// Also renders an attendance badge based on attendance counts.
// ============================================================================

import { CheckCircle, Clock } from 'lucide-react';
import { Badge } from '@/app/components/ui/Badge';
import type { Session } from '@/app/core/types/session';

type SessionStatus = 'upcoming' | 'ongoing' | 'completed';

function getSessionStatus(session: Session, currentMinutes: number): SessionStatus {
    if (!session.start_time || !session.end_time) return 'upcoming';

    const [startH, startM] = session.start_time.split(':').map(Number);
    const [endH, endM] = session.end_time.split(':').map(Number);
    const start = startH * 60 + startM;
    const end = endH * 60 + endM;

    if (currentMinutes < start) return 'upcoming';
    if (currentMinutes >= start && currentMinutes <= end) return 'ongoing';
    return 'completed';
}

interface SessionStatusBadgeProps {
    session: Session;
    currentMinutes: number;
}

export function SessionStatusBadge({ session, currentMinutes }: SessionStatusBadgeProps) {
    const status = getSessionStatus(session, currentMinutes);

    const config = {
        upcoming: { label: 'Upcoming', variant: 'info' as const, Icon: Clock },
        ongoing: { label: 'Ongoing', variant: 'success' as const, Icon: CheckCircle },
        completed: { label: 'Completed', variant: 'default' as const, Icon: CheckCircle },
    }[status];

    return <Badge variant={config.variant}>{config.label}</Badge>;
}

interface AttendanceBadgeProps {
    counts: Session['attendance_count'];
}

export function AttendanceBadge({ counts }: AttendanceBadgeProps) {
    const { total, present, unmarked } = counts;

    if (unmarked === total) {
        return <Badge variant="warning" size="sm">Not Marked</Badge>;
    }

    const pct = total > 0 ? Math.round((present / total) * 100) : 0;
    const variant = pct >= 80 ? 'success' : pct >= 60 ? 'warning' : 'danger';

    return <Badge variant={variant} size="sm">{pct}%</Badge>;
}

export { getSessionStatus };
export type { SessionStatus };