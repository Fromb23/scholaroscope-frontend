'use client';

import { useEffect, useState, type FormEvent } from 'react';
import Modal from '@/app/components/ui/Modal';
import { Button } from '@/app/components/ui/Button';
import { Select } from '@/app/components/ui/Select';
import { useTypeToConfirm } from '@/app/core/hooks/useTypeToConfirm';
import {
    LearnerDeleteEligibility,
    StudentCohortEnrollment,
    StudentStatuses,
} from '@/app/core/types/student';

const END_REASONS = [
    { value: 'COMPLETED', label: 'Completed Cohort' },
    { value: 'GRADUATED', label: 'Graduated' },
    { value: 'TRANSFERRED', label: 'Transferred to Another Cohort' },
    { value: 'WRONG_ASSIGNMENT', label: 'Wrong Assignment (Admin Correction)' },
    { value: 'WITHDRAWN', label: 'Withdrawn from Cohort' },
    { value: 'PROMOTED', label: 'Promoted to Next Level' },
];

const TRANSFER_REASONS = [
    { value: 'COHORT_MOVE', label: 'Move to Correct Cohort' },
    { value: 'PROMOTION', label: 'Promotion' },
    { value: 'ADMIN_CORRECTION', label: 'Administrative Correction' },
    { value: 'OTHER', label: 'Other' },
];

function todayIso(): string {
    return new Date().toISOString().slice(0, 10);
}

function formatBlockerLabel(key: string): string {
    return key
        .split('_')
        .map(part => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ');
}

function ImpactSummary({
    currentCohort,
    subjectNames,
    attendanceText,
}: {
    currentCohort?: string | null;
    subjectNames: string[];
    attendanceText: string;
}) {
    return (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700">
            <p><strong>Current cohort:</strong> {currentCohort ?? 'None'}</p>
            <p className="mt-1">
                <strong>Active subject enrollments affected:</strong>{' '}
                {subjectNames.length === 0 ? 'None' : subjectNames.join(', ')}
            </p>
            <p className="mt-1"><strong>Reporting and attendance:</strong> {attendanceText}</p>
        </div>
    );
}

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

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        await onSubmit(status, deactivate, notes);
        setStatus('');
        setDeactivate(false);
        setNotes('');
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

// ── Re-enroll Modal ───────────────────────────────────────────────────────

interface EnrollModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: {
        cohort_id: number;
        enrollment_type: 'PRIMARY';
        effective_from: string;
        start_reason: 'RE_ENROLMENT';
        notes: string;
    }) => Promise<void>;
    availableCohorts: { id: number; name: string; level: string }[];
    activeSubjectNames: string[];
    loading: boolean;
}

export function EnrollModal({
    isOpen,
    onClose,
    onSubmit,
    availableCohorts,
    activeSubjectNames,
    loading,
}: EnrollModalProps) {
    const [cohortId, setCohortId] = useState('');
    const [effectiveFrom, setEffectiveFrom] = useState(todayIso());
    const [reason, setReason] = useState('');
    const [notes, setNotes] = useState('');

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        await onSubmit({
            cohort_id: Number(cohortId),
            enrollment_type: 'PRIMARY',
            effective_from: effectiveFrom,
            start_reason: 'RE_ENROLMENT',
            notes: [reason, notes].filter(Boolean).join(' - '),
        });
        setCohortId('');
        setEffectiveFrom(todayIso());
        setReason('');
        setNotes('');
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Re-enroll Learner">
            <form onSubmit={handleSubmit} className="space-y-4">
                <ImpactSummary
                    currentCohort={null}
                    subjectNames={activeSubjectNames}
                    attendanceText="New attendance and reports will use the selected cohort from the effective date. Historical records remain preserved."
                />
                <Select
                    label="New Primary Cohort"
                    value={cohortId}
                    onChange={e => setCohortId(e.target.value)}
                    required
                    options={[
                        { value: '', label: 'Select cohort' },
                        ...availableCohorts.map(c => ({
                            value: String(c.id),
                            label: `${c.name} - ${c.level}`,
                        })),
                    ]}
                />
                <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">Effective Date</label>
                    <input
                        type="date"
                        value={effectiveFrom}
                        onChange={e => setEffectiveFrom(e.target.value)}
                        required
                        className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>
                <textarea
                    value={reason}
                    onChange={e => setReason(e.target.value)}
                    rows={2}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Reason for re-enrollment"
                    required
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
                    <Button type="submit" disabled={loading || !cohortId || !effectiveFrom || !reason}>
                        {loading ? 'Re-enrolling...' : 'Re-enroll Learner'}
                    </Button>
                </div>
            </form>
        </Modal>
    );
}

// ── Transfer Modal ────────────────────────────────────────────────────────

interface TransferLearnerModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: { new_cohort: number; effective_from: string; notes: string }) => Promise<void>;
    currentEnrollment: StudentCohortEnrollment | null;
    availableCohorts: { id: number; name: string; level: string }[];
    activeSubjectNames: string[];
    loading: boolean;
}

export function TransferLearnerModal({
    isOpen,
    onClose,
    onSubmit,
    currentEnrollment,
    availableCohorts,
    activeSubjectNames,
    loading,
}: TransferLearnerModalProps) {
    const [cohortId, setCohortId] = useState('');
    const [effectiveFrom, setEffectiveFrom] = useState(todayIso());
    const [reason, setReason] = useState('');
    const [notes, setNotes] = useState('');

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        await onSubmit({
            new_cohort: Number(cohortId),
            effective_from: effectiveFrom,
            notes: [reason, notes].filter(Boolean).join(' - '),
        });
        setCohortId('');
        setEffectiveFrom(todayIso());
        setReason('');
        setNotes('');
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Transfer Learner">
            <form onSubmit={handleSubmit} className="space-y-4">
                <ImpactSummary
                    currentCohort={currentEnrollment?.cohort_name}
                    subjectNames={activeSubjectNames}
                    attendanceText="The current cohort and subject enrollments will close before the new primary cohort opens. Historical reports keep their old scope."
                />
                <Select
                    label="New Primary Cohort"
                    value={cohortId}
                    onChange={e => setCohortId(e.target.value)}
                    required
                    options={[
                        { value: '', label: 'Select cohort' },
                        ...availableCohorts.map(c => ({
                            value: String(c.id),
                            label: `${c.name} - ${c.level}`,
                        })),
                    ]}
                />
                <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">Effective Date</label>
                    <input
                        type="date"
                        value={effectiveFrom}
                        onChange={e => setEffectiveFrom(e.target.value)}
                        required
                        className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>
                <Select
                    label="Reason"
                    value={reason}
                    onChange={e => setReason(e.target.value)}
                    required
                    options={[{ value: '', label: 'Select a reason' }, ...TRANSFER_REASONS]}
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
                    <Button type="submit" disabled={loading || !cohortId || !effectiveFrom || !reason}>
                        {loading ? 'Transferring...' : 'Transfer Learner'}
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
    onSubmit: (data: { end_reason: string; effective_to: string; notes: string }) => Promise<void>;
    enrollment: StudentCohortEnrollment | null;
    studentName: string;
    activeSubjectNames: string[];
    loading: boolean;
}

export function UnenrollModal({
    isOpen,
    onClose,
    onSubmit,
    enrollment,
    studentName,
    activeSubjectNames,
    loading,
}: UnenrollModalProps) {
    const [endReason, setEndReason] = useState('');
    const [effectiveTo, setEffectiveTo] = useState(todayIso());
    const [notes, setNotes] = useState('');

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        await onSubmit({ end_reason: endReason, effective_to: effectiveTo, notes });
        setEndReason('');
        setEffectiveTo(todayIso());
        setNotes('');
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Unenroll Learner">
            <form onSubmit={handleSubmit} className="space-y-4">
                <ImpactSummary
                    currentCohort={enrollment?.cohort_name}
                    subjectNames={activeSubjectNames}
                    attendanceText="The learner leaves the active class list after the effective date. Historical attendance and reports remain available."
                />
                <p className="text-sm text-gray-700">
                    Learner: <strong>{studentName}</strong>
                </p>
                <Select
                    label="Reason"
                    value={endReason}
                    onChange={e => setEndReason(e.target.value)}
                    required
                    options={[{ value: '', label: 'Select a reason' }, ...END_REASONS]}
                />
                <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">Effective Date</label>
                    <input
                        type="date"
                        value={effectiveTo}
                        onChange={e => setEffectiveTo(e.target.value)}
                        required
                        className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>
                <textarea
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    rows={3}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Additional notes (optional)"
                />
                <div className="flex justify-end gap-2 pt-2">
                    <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
                    <Button type="submit" variant="danger" disabled={loading || !endReason || !effectiveTo}>
                        {loading ? 'Unenrolling...' : 'Unenroll Learner'}
                    </Button>
                </div>
            </form>
        </Modal>
    );
}

// ── Delete Workflow Modal ─────────────────────────────────────────────────

interface DeleteModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => Promise<void>;
    onCheckEligibility: () => Promise<LearnerDeleteEligibility>;
    onWithdraw: () => Promise<void>;
    onArchive: () => Promise<void>;
    studentName: string;
    loading: boolean;
}

export function DeleteStudentModal({
    isOpen,
    onClose,
    onConfirm,
    onCheckEligibility,
    onWithdraw,
    onArchive,
    studentName,
    loading,
}: DeleteModalProps) {
    const [eligibility, setEligibility] = useState<LearnerDeleteEligibility | null>(null);
    const [checking, setChecking] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const {
        input: confirmation,
        setInput: setConfirmation,
        isConfirmed,
        reset: resetConfirmation,
    } = useTypeToConfirm('DELETE');

    useEffect(() => {
        if (!isOpen) {
            setEligibility(null);
            setError(null);
            resetConfirmation();
            return;
        }

        let cancelled = false;
        setChecking(true);
        setError(null);
        onCheckEligibility()
            .then(result => {
                if (!cancelled) {
                    setEligibility(result);
                }
            })
            .catch(() => {
                if (!cancelled) {
                    setError('Could not check learner delete eligibility.');
                }
            })
            .finally(() => {
                if (!cancelled) {
                    setChecking(false);
                }
            });

        return () => {
            cancelled = true;
        };
    }, [isOpen, onCheckEligibility, resetConfirmation]);

    const blockerEntries = Object.entries(eligibility?.blockers ?? {});
    const hardDeleteAllowed = Boolean(eligibility?.allowed);

    const handleConfirm = async () => {
        await onConfirm();
        onClose();
    };

    const handleWithdraw = async () => {
        await onWithdraw();
        onClose();
    };

    const handleArchive = async () => {
        await onArchive();
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Learner Danger Zone">
            <div className="space-y-4">
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                    <p className="font-medium">Safer lifecycle actions are preferred.</p>
                    <p className="mt-1">
                        Withdraw or archive the learner to preserve attendance, assessment, assignment, evidence, and reporting records.
                    </p>
                </div>

                {checking ? (
                    <p className="text-sm text-gray-600">Checking delete eligibility...</p>
                ) : error ? (
                    <p className="text-sm text-red-600">{error}</p>
                ) : eligibility ? (
                    <div className="space-y-3">
                        <p className="text-sm text-gray-700">{eligibility.detail}</p>
                        {blockerEntries.length > 0 ? (
                            <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700">
                                <p className="font-medium text-gray-900">Academic records found</p>
                                <ul className="mt-2 space-y-1">
                                    {blockerEntries.map(([key, count]) => (
                                        <li key={key} className="flex justify-between gap-4">
                                            <span>{formatBlockerLabel(key)}</span>
                                            <span className="font-medium">{count}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ) : null}
                    </div>
                ) : null}

                {!hardDeleteAllowed ? (
                    <div className="flex flex-wrap justify-end gap-2 pt-2">
                        <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
                        <Button type="button" variant="secondary" onClick={handleArchive} disabled={loading || checking}>
                            {loading ? 'Archiving...' : 'Archive Learner'}
                        </Button>
                        <Button type="button" onClick={handleWithdraw} disabled={loading || checking}>
                            {loading ? 'Withdrawing...' : 'Withdraw Learner'}
                        </Button>
                    </div>
                ) : (
                    <div className="space-y-3">
                        <p className="text-sm text-gray-700">
                            Hard delete is available only because no academic records were found for <strong>{studentName}</strong>.
                        </p>
                        <div>
                            <label className="mb-1 block text-sm font-medium text-gray-700">
                                Type DELETE to permanently delete this mistaken record
                            </label>
                            <input
                                value={confirmation}
                                onChange={e => setConfirmation(e.target.value)}
                                className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                            />
                        </div>
                        <div className="flex justify-end gap-2 pt-2">
                            <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
                            <Button
                                variant="danger"
                                onClick={handleConfirm}
                                disabled={loading || checking || !isConfirmed}
                            >
                                {loading ? 'Deleting...' : 'Permanently Delete'}
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </Modal>
    );
}
