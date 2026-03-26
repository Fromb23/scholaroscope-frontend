'use client';

import { useState } from 'react';
import Modal from '@/app/components/ui/Modal';
import { Button } from '@/app/components/ui/Button';
import { Select } from '@/app/components/ui/Select';
import { StudentStatuses, EnrollmentTypes, StudentCohortEnrollment } from '@/app/core/types/student';

const END_REASONS = [
    { value: 'COMPLETED', label: 'Completed Cohort' },
    { value: 'GRADUATED', label: 'Graduated' },
    { value: 'TRANSFERRED', label: 'Transferred to Another Cohort' },
    { value: 'WRONG_ASSIGNMENT', label: 'Wrong Assignment (Admin Correction)' },
    { value: 'WITHDRAWN', label: 'Withdrawn from Cohort' },
    { value: 'PROMOTED', label: 'Promoted to Next Level' },
];

// ── Status Modal ──────────────────────────────────────────────────────────

interface StatusModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (status: string, deactivate: boolean, notes: string) => Promise<void>;
    loading: boolean;
}

export function StatusModal({ isOpen, onClose, onSubmit, loading }: StatusModalProps) {
    const [status, setStatus] = useState('');
    const [deactivate, setDeactivate] = useState(false);
    const [notes, setNotes] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        await onSubmit(status, deactivate, notes);
        setStatus(''); setDeactivate(false); setNotes('');
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Update Student Status">
            <form onSubmit={handleSubmit} className="space-y-4">
                <Select
                    label="New Status"
                    value={status}
                    onChange={e => setStatus(e.target.value)}
                    required
                    options={StudentStatuses}
                />
                <div className="flex items-center gap-2">
                    <input
                        type="checkbox"
                        id="deactivate"
                        checked={deactivate}
                        onChange={e => setDeactivate(e.target.checked)}
                        className="rounded border-gray-300"
                    />
                    <label htmlFor="deactivate" className="text-sm text-gray-700">
                        Deactivate all cohort enrollments
                    </label>
                </div>
                <textarea
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    rows={3}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Notes (optional)"
                />
                <div className="flex justify-end gap-2 pt-2">
                    <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
                    <Button type="submit" disabled={loading || !status}>
                        {loading ? 'Updating...' : 'Update Status'}
                    </Button>
                </div>
            </form>
        </Modal>
    );
}

// ── Enroll Modal ──────────────────────────────────────────────────────────

interface EnrollModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: { cohort_id: number; enrollment_type: string; notes: string }) => Promise<void>;
    availableCohorts: { id: number; name: string; level: string }[];
    loading: boolean;
}

export function EnrollModal({ isOpen, onClose, onSubmit, availableCohorts, loading }: EnrollModalProps) {
    const [cohortId, setCohortId] = useState('');
    const [enrollmentType, setEnrollmentType] = useState('ELECTIVE');
    const [notes, setNotes] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        await onSubmit({ cohort_id: Number(cohortId), enrollment_type: enrollmentType, notes });
        setCohortId(''); setEnrollmentType('ELECTIVE'); setNotes('');
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Enroll in Cohort">
            <form onSubmit={handleSubmit} className="space-y-4">
                <Select
                    label="Cohort"
                    value={cohortId}
                    onChange={e => setCohortId(e.target.value)}
                    required
                    options={[
                        { value: '', label: 'Select Cohort' },
                        ...availableCohorts.map(c => ({
                            value: String(c.id),
                            label: `${c.name} — ${c.level}`,
                        })),
                    ]}
                />
                <Select
                    label="Enrollment Type"
                    value={enrollmentType}
                    onChange={e => setEnrollmentType(e.target.value)}
                    required
                    options={EnrollmentTypes}
                />
                <textarea
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    rows={3}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Notes (optional)"
                />
                <div className="flex justify-end gap-2 pt-2">
                    <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
                    <Button type="submit" disabled={loading || !cohortId}>
                        {loading ? 'Enrolling...' : 'Enroll'}
                    </Button>
                </div>
            </form>
        </Modal>
    );
}

// ── Unenroll Modal ────────────────────────────────────────────────────────

interface UnenrollModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: { end_reason: string; notes: string }) => Promise<void>;
    enrollment: StudentCohortEnrollment | null;
    studentName: string;
    loading: boolean;
}

export function UnenrollModal({ isOpen, onClose, onSubmit, enrollment, studentName, loading }: UnenrollModalProps) {
    const [endReason, setEndReason] = useState('');
    const [notes, setNotes] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        await onSubmit({ end_reason: endReason, notes });
        setEndReason(''); setNotes('');
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Unenroll from Cohort">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="p-3 bg-gray-50 rounded-lg text-sm">
                    <p><strong>Cohort:</strong> {enrollment?.cohort_name}</p>
                    <p className="mt-1"><strong>Student:</strong> {studentName}</p>
                </div>
                <Select
                    label="Reason for Unenrollment"
                    value={endReason}
                    onChange={e => setEndReason(e.target.value)}
                    required
                    options={[{ value: '', label: 'Select a reason...' }, ...END_REASONS]}
                />
                <textarea
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    rows={3}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Additional notes (optional)"
                />
                <div className="flex justify-end gap-2 pt-2">
                    <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
                    <Button type="submit" variant="danger" disabled={loading || !endReason}>
                        {loading ? 'Unenrolling...' : 'Unenroll Student'}
                    </Button>
                </div>
            </form>
        </Modal>
    );
}

// ── Delete Confirm Modal ──────────────────────────────────────────────────

interface DeleteModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => Promise<void>;
    studentName: string;
    loading: boolean;
}

export function DeleteStudentModal({ isOpen, onClose, onConfirm, studentName, loading }: DeleteModalProps) {
    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Delete Student">
            <div className="space-y-4">
                <p className="text-sm text-gray-700">
                    Are you sure you want to delete <strong>{studentName}</strong>? This action cannot be undone.
                </p>
                <div className="flex justify-end gap-2 pt-2">
                    <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
                    <Button variant="danger" onClick={onConfirm} disabled={loading}>
                        {loading ? 'Deleting...' : 'Delete Student'}
                    </Button>
                </div>
            </div>
        </Modal>
    );
}