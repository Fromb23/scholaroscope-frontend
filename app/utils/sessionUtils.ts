// ============================================================================
// app/utils/sessionUtils.ts
//
// Pure utility functions for session data — no React, no API calls.
// ============================================================================

interface SessionLike {
    status?: string | null;
    schedule_state?: string | null;
    start_time: string | null;
    end_time: string | null;
    attendance_count: {
        total: number;
        present: number;
    };
}

interface AttendanceRecordLike {
    status?: 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED' | 'SICK' | string | null;
}

export type SessionStatus = 'upcoming' | 'ongoing' | 'completed';

export function getSessionStatus(session: SessionLike, currentMinutes: number): SessionStatus {
    if (session.status === 'COMPLETED') return 'completed';
    if (session.status === 'IN_PROGRESS') return 'ongoing';
    if (session.status === 'SCHEDULED') return 'upcoming';

    if (!session.start_time || !session.end_time) return 'upcoming';

    const [startH, startM] = session.start_time.split(':').map(Number);
    const [endH, endM] = session.end_time.split(':').map(Number);
    const start = startH * 60 + startM;
    const end = endH * 60 + endM;

    if (currentMinutes < start) return 'upcoming';
    if (currentMinutes >= start && currentMinutes <= end) return 'ongoing';
    return 'completed';
}

export interface CategorizedSessions<TSession extends SessionLike> {
    ongoing: TSession[];
    upcoming: TSession[];
    completed: TSession[];
}

export function categorizeSessions<TSession extends SessionLike>(
    sessions: TSession[],
    currentMinutes: number
): CategorizedSessions<TSession> {
    return {
        ongoing: sessions.filter(s => getSessionStatus(s, currentMinutes) === 'ongoing'),
        upcoming: sessions.filter(s => getSessionStatus(s, currentMinutes) === 'upcoming'),
        completed: sessions.filter(s => getSessionStatus(s, currentMinutes) === 'completed'),
    };
}

export function calcAvgAttendance(sessions: SessionLike[]): number {
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

export function calcAttendanceStats(records: AttendanceRecordLike[]): AttendanceStats {
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
