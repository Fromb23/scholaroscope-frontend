export type AttendanceStatus =
    | 'PRESENT'
    | 'LATE'
    | 'ABSENT'
    | 'EXCUSED'
    | 'SICK'
    | 'UNMARKED'
    | null
    | undefined;

export function isEvidenceEligible(status: AttendanceStatus): boolean {
    return status === 'PRESENT' || status === 'LATE';
}

export function isEvidenceIneligible(status: AttendanceStatus): boolean {
    return status === 'ABSENT' || status === 'EXCUSED' || status === 'SICK';
}

export function isAttendanceBlocking(status: AttendanceStatus): boolean {
    return status === null || status === undefined || status === 'UNMARKED';
}

export function attendanceStatusLabel(
    status: AttendanceStatus,
    display?: string | null,
): string {
    if (display) return display;
    if (!status) return 'Unmarked';
    return status;
}
