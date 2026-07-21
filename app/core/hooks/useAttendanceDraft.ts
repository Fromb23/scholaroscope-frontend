// ============================================================================
// app/core/hooks/useAttendanceDraft.ts
//
// Owns the local attendance draft state for a session.
// Handles per-student status/notes edits and bulk mark-all operations.
// Submits via useSessionDetail.markAttendance — no direct API calls.
// ============================================================================

import { useState, useEffect, useMemo } from 'react';
import type { AttendanceRecord } from '@/app/core/types/session';
import type { ApiError } from '@/app/core/types/errors';
import { resolveErrorMessage } from '@/app/core/types/errors';

export interface AttendanceDraftEntry {
    status: string;
    notes: string;
}

export type AttendanceDraft = Record<number, AttendanceDraftEntry>;

interface UseAttendanceDraftProps {
    records: AttendanceRecord[];
    onSave: (payload: { attendance_records: { student_id: number; status: string; notes: string }[] }) => Promise<unknown>;
    readOnly?: boolean;
}

export function useAttendanceDraft({ records, onSave, readOnly = false }: UseAttendanceDraftProps) {
    const [draft, setDraft] = useState<AttendanceDraft>({});
    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);
    const unmarkedLearners = useMemo(
        () => records.filter((record) => !draft[record.student]?.status),
        [draft, records]
    );
    const isComplete = unmarkedLearners.length === 0;

    // Sync draft when records load or change
    useEffect(() => {
        const initial: AttendanceDraft = {};
        records.forEach(r => {
            initial[r.student] = {
                status: r.status ?? '',
                notes: r.notes ?? '',
            };
        });
        setDraft(initial);
    }, [records]);

    const updateStatus = (studentId: number, status: string) => {
        if (readOnly) return;
        setDraft(prev => ({
            ...prev,
            [studentId]: { ...prev[studentId], status },
        }));
    };

    const updateNotes = (studentId: number, notes: string) => {
        if (readOnly) return;
        setDraft(prev => ({
            ...prev,
            [studentId]: { ...prev[studentId], notes },
        }));
    };

    const markAll = (status: string) => {
        if (readOnly) return;
        const next: AttendanceDraft = {};
        records.forEach(r => {
            next[r.student] = { status, notes: draft[r.student]?.notes ?? '' };
        });
        setDraft(next);
    };

    const save = async (): Promise<{ ok: true } | { ok: false; error: string }> => {
        if (readOnly) return { ok: false, error: 'Attendance is read-only.' };
        if (!isComplete) {
            const names = unmarkedLearners
                .slice(0, 5)
                .map((record) => record.student_name)
                .filter(Boolean)
                .join(', ');
            const message = names
                ? `Mark attendance for every learner. Unmarked: ${names}${unmarkedLearners.length > 5 ? ', …' : ''}.`
                : 'Mark attendance for every learner before continuing.';
            setSaveError(message);
            return { ok: false, error: message };
        }
        setSaving(true);
        setSaveError(null);
        try {
            const payload = Object.entries(draft).map(([studentId, entry]) => ({
                student_id: Number(studentId),
                status: entry.status,
                notes: entry.notes,
            }));
            await onSave({ attendance_records: payload });
            return { ok: true };
        } catch (err) {
            const message = resolveErrorMessage(
                err as ApiError,
                'Failed to save attendance.',
            );
            setSaveError(message);
            return { ok: false, error: message };
        } finally {
            setSaving(false);
        }
    };

    return {
        draft,
        saving,
        saveError,
        isComplete,
        unmarkedLearners,
        dismissError: () => setSaveError(null),
        updateStatus,
        updateNotes,
        markAll,
        save,
    };
}
