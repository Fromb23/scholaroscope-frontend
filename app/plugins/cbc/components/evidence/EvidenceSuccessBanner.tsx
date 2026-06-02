// app/plugins/cbc/components/evidence/EvidenceSuccessBanner.tsx
import Link from 'next/link';
import { CheckCircle, X } from 'lucide-react';
import { Button } from '@/app/components/ui/Button';
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
    workspaceHref?: string;
    canEndSession?: boolean;
    endingSession?: boolean;
    onEndSession?: () => void;
}

export function EvidenceSuccessBanner({
    sessionId,
    result,
    onContinueRecording,
    onDismiss,
    workspaceHref = `/sessions/${sessionId}`,
    canEndSession = false,
    endingSession = false,
    onEndSession,
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
        <div className="theme-success-surface flex items-start gap-3 rounded-xl p-4">
            <CheckCircle className="h-5 w-5 shrink-0 text-[color:var(--color-success)]" />
            <div className="flex-1 space-y-1">
                <p className="text-sm font-medium theme-text">
                    Class performance recorded. Continue adding observations, or return to the lesson workspace to close the lesson record.
                </p>
                <p className="text-xs theme-muted">
                    New records created for {result.created_count} of {result.eligible_count} eligible learner{result.eligible_count !== 1 ? 's' : ''}.
                </p>
                {attendanceParts.length > 0 && (
                    <p className="text-xs theme-muted">
                        Attendance: {attendanceParts.join(' · ')}
                    </p>
                )}
                <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:flex-wrap">
                    <Button type="button" variant="secondary" size="sm" onClick={onContinueRecording}>
                        Continue recording evidence
                    </Button>
                    {canEndSession && onEndSession ? (
                        <Button
                            type="button"
                            size="sm"
                            onClick={onEndSession}
                            disabled={endingSession}
                        >
                            {endingSession ? 'Ending…' : 'End session'}
                        </Button>
                    ) : null}
                    <Link
                        href={workspaceHref}
                        className="theme-button-secondary theme-focus-ring inline-flex items-center justify-center rounded-lg px-3 py-1.5 text-sm font-medium transition-colors"
                    >
                        Back to lesson workspace
                    </Link>
                </div>
            </div>
            <button
                onClick={onDismiss}
                className="theme-focus-ring theme-subtle shrink-0 rounded-lg p-1 transition-colors hover:text-[color:var(--color-text)]"
                aria-label="Dismiss success message"
            >
                <X className="h-4 w-4" />
            </button>
        </div>
    );
}
