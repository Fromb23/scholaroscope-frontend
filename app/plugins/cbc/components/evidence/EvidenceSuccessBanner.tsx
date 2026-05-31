// app/plugins/cbc/components/evidence/EvidenceSuccessBanner.tsx
import Link from 'next/link';
import { CheckCircle, X } from 'lucide-react';
import type { BulkClassEvidenceResult } from '@/app/plugins/cbc/types/cbc';

function getAttendanceCounts(result: BulkClassEvidenceResult) {
    const summary = result.attendance_summary?.summary;
    const counts = result.attendance ?? result.attendance_counts ?? summary;

    return {
        present: result.present_count ?? result.attendance_summary?.present_count ?? counts?.present,
        absent: result.absent_count ?? counts?.absent,
        excused: result.excused_count ?? counts?.excused,
        sick: result.sick_count ?? counts?.sick,
        unmarked: result.unmarked_count ?? counts?.unmarked,
        late: result.late_count ?? counts?.late,
    };
}

interface Props {
    sessionId: number;
    result: BulkClassEvidenceResult;
    onContinueRecording: () => void;
    onDismiss: () => void;
}

export function EvidenceSuccessBanner({
    sessionId,
    result,
    onContinueRecording,
    onDismiss,
}: Props) {
    const attendance = getAttendanceCounts(result);
    const attendanceParts = [
        typeof attendance.present === 'number' ? `${attendance.present} present` : null,
        attendance.absent ? `${attendance.absent} absent` : null,
        attendance.excused ? `${attendance.excused} excused` : null,
        attendance.sick ? `${attendance.sick} sick` : null,
        attendance.unmarked ? `${attendance.unmarked} unmarked` : null,
        attendance.late ? `${attendance.late} late` : null,
    ].filter(Boolean);

    return (
        <div className="flex items-start gap-3 p-4 bg-green-50 border border-green-200 rounded-xl">
            <CheckCircle className="h-5 w-5 text-green-600 shrink-0" />
            <div className="flex-1 space-y-1">
                <p className="text-sm text-green-700 font-medium">
                    Class performance recorded. Add a short reflection next, keep recording, or return to the completed lesson summary.
                </p>
                <p className="text-xs text-green-700/80">
                    New records created for {result.created_count} of {result.eligible_count} eligible learner{result.eligible_count !== 1 ? 's' : ''}.
                </p>
                {attendanceParts.length > 0 && (
                    <p className="text-xs text-green-700/80">
                        Attendance: {attendanceParts.join(' · ')}
                    </p>
                )}
                <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:flex-wrap">
                    <button
                        type="button"
                        onClick={onContinueRecording}
                        className="theme-focus-ring inline-flex items-center justify-center rounded-lg border border-green-300 bg-white px-3 py-1.5 text-sm font-medium text-green-800 transition-colors hover:bg-green-100"
                    >
                        Continue recording evidence
                    </button>
                    <Link
                        href={`/sessions/${sessionId}`}
                        className="theme-focus-ring inline-flex items-center justify-center rounded-lg border border-green-300 px-3 py-1.5 text-sm font-medium text-green-800 transition-colors hover:bg-green-100"
                    >
                        Back to completed lesson
                    </Link>
                </div>
            </div>
            <button
                onClick={onDismiss}
                className="text-green-400 hover:text-green-600"
                aria-label="Dismiss success message"
            >
                <X className="h-4 w-4" />
            </button>
        </div>
    );
}
