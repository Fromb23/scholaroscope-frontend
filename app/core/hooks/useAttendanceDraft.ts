// ============================================================================
// app/core/hooks/useAttendanceDraft.ts
//
// Owns the local attendance draft state for a session.
// Handles per-student status/notes edits and bulk mark-all operations.
// Submits via useSessionDetail.markAttendance — no direct API calls.
// ============================================================================

import { useState, useEffect } from 'react';
import type { AttendanceRecord } from '@/app/core/types/session';
import type { ApiError } from '@/app/core/types/errors';
import { extractErrorMessage } from '@/app/core/types/errors';

export interface AttendanceDraftEntry {
    status: string;
    notes: string;
}

export type AttendanceDraft = Record<number, AttendanceDraftEntry>;

interface UseAttendanceDraftProps {
    records: AttendanceRecord[];
    onSave: (payload: { attendance_records: { student_id: number; status: string; notes: string }[] }) => Promise<void>;
    readOnly?: boolean;
}

export function useAttendanceDraft({ records, onSave, readOnly = false }: UseAttendanceDraftProps) {
    const [draft, setDraft] = useState<AttendanceDraft>({});
    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);

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

    const save = async () => {
        if (readOnly) return;
        setSaving(true);
        setSaveError(null);
        try {
            const payload = Object.entries(draft).map(([studentId, entry]) => ({
                student_id: Number(studentId),
                status: entry.status,
                notes: entry.notes,
            }));
            await onSave({ attendance_records: payload });
        } catch (err) {
            setSaveError(extractErrorMessage(err as ApiError, 'Failed to save attendance.'));
        } finally {
            setSaving(false);
        }
    };

    return {
        draft,
        saving,
        saveError,
        dismissError: () => setSaveError(null),
        updateStatus,
        updateNotes,
        markAll,
        save,
    };
}