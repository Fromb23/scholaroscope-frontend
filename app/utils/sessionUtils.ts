// ============================================================================
// app/utils/sessionUtils.ts
//
// Pure utility functions for session data — no React, no API calls.
// ============================================================================

import type { Session, AttendanceRecord } from '@/app/core/types/session';

export type SessionStatus = 'upcoming' | 'ongoing' | 'completed';

export function getSessionStatus(session: Session, currentMinutes: number): SessionStatus {
    if (!session.start_time || !session.end_time) return 'upcoming';

    const [startH, startM] = session.start_time.split(':').map(Number);
    const [endH, endM] = session.end_time.split(':').map(Number);
    const start = startH * 60 + startM;
    const end = endH * 60 + endM;

    if (currentMinutes < start) return 'upcoming';
    if (currentMinutes >= start && currentMinutes <= end) return 'ongoing';
    return 'completed';
}

export interface CategorizedSessions {
    ongoing: Session[];
    upcoming: Session[];
    completed: Session[];
}

export function categorizeSessions(
    sessions: Session[],
    currentMinutes: number
): CategorizedSessions {
    return {
        ongoing: sessions.filter(s => getSessionStatus(s, currentMinutes) === 'ongoing'),
        upcoming: sessions.filter(s => getSessionStatus(s, currentMinutes) === 'upcoming'),
        completed: sessions.filter(s => getSessionStatus(s, currentMinutes) === 'completed'),
    };
}

export function calcAvgAttendance(sessions: Session[]): number {
    if (sessions.length === 0) return 0;
    return sessions.reduce((sum, s) => {
        const { total, present } = s.attendance_count;
        return sum + (total > 0 ? (present / total) * 100 : 0);
    }, 0) / sessions.length;
}

export interface AttendanceStats {
    total: number;
    present: number;
    absent: number;
    late: number;
    excused: number;
    sick: number;
    unmarked: number;
    attendancePercent: number;
}

export function calcAttendanceStats(records: AttendanceRecord[]): AttendanceStats {
    const total = records.length;
    const present = records.filter(r => r.status === 'PRESENT').length;
    const absent = records.filter(r => r.status === 'ABSENT').length;
    const late = records.filter(r => r.status === 'LATE').length;
    const excused = records.filter(r => r.status === 'EXCUSED').length;
    const sick = records.filter(r => r.status === 'SICK').length;
    const unmarked = records.filter(r => !r.status).length;
    const attendancePercent = total > 0 ? Math.round((present / total) * 100) : 0;

    return { total, present, absent, late, excused, sick, unmarked, attendancePercent };
}