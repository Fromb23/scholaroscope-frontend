'use client';

import Modal from '@/app/components/ui/Modal';
import { Button } from '@/app/components/ui/Button';
import type { Session } from '@/app/core/types/session';

interface EndLessonReviewModalProps {
    isOpen: boolean;
    session: Session | null;
    isSubmitting?: boolean;
    errorMessage?: string | null;
    onClose: () => void;
    onReviewAttendance: (session: Session) => void;
    onConfirm: () => Promise<void> | void;
}

interface StatItemProps {
    label: string;
    value: number;
}

function StatItem({ label, value }: StatItemProps) {
    return (
        <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</p>
            <p className="mt-1 text-xl font-semibold text-gray-900">{value}</p>
        </div>
    );
}

export function EndLessonReviewModal({
    isOpen,
    session,
    isSubmitting = false,
    errorMessage,
    onClose,
    onReviewAttendance,
    onConfirm,
}: EndLessonReviewModalProps) {
    if (!session) return null;

    const attendance = session.attendance_count;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="End lesson?" size="md">
            <div className="space-y-6">
                <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                    <p className="font-semibold text-gray-900">{session.subject_name}</p>
                    <p className="mt-1 text-sm text-gray-600">
                        {session.cohort_name} • {session.session_date}
                    </p>
                </div>

                <section className="space-y-3">
                    <div>
                        <h3 className="text-sm font-semibold text-gray-900">Attendance</h3>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <StatItem label="Present" value={attendance.present} />
                        <StatItem label="Late" value={attendance.late} />
                        <StatItem label="Absent" value={attendance.absent} />
                        <StatItem label="Unmarked" value={attendance.unmarked} />
                    </div>
                </section>

                {attendance.unmarked > 0 && (
                    <section className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                        Some learners are still unmarked. Ending the lesson may mark them absent.
                    </section>
                )}

                <section className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800">
                    Evidence helps confirm learner progress.
                </section>

                {errorMessage && (
                    <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                        {errorMessage}
                    </div>
                )}

                <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                    <Button
                        type="button"
                        variant="ghost"
                        className="w-full sm:w-auto"
                        onClick={onClose}
                        disabled={isSubmitting}
                    >
                        Cancel
                    </Button>
                    <Button
                        type="button"
                        variant="secondary"
                        className="w-full sm:w-auto"
                        onClick={() => onReviewAttendance(session)}
                        disabled={isSubmitting}
                    >
                        Review attendance
                    </Button>
                    <Button
                        type="button"
                        variant="danger"
                        className="w-full sm:w-auto"
                        onClick={() => void onConfirm()}
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? 'Ending lesson...' : 'End lesson'}
                    </Button>
                </div>
            </div>
        </Modal>
    );
}
