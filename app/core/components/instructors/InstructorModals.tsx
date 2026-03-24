'use client';

// ============================================================================
// app/core/components/instructors/InstructorModals.tsx
//
// All modals for the instructor progress page.
// No any. Typed props. ErrorBanner for errors.
// ============================================================================

import { useState, useEffect } from 'react';
import { AlertCircle, Plus, X, Clock } from 'lucide-react';
import Modal from '@/app/components/ui/Modal';
import { Button } from '@/app/components/ui/Button';
import { Input } from '@/app/components/ui/Input';
import { ErrorBanner } from '@/app/components/ui/ErrorBanner';
import { useInstructorDetail } from '@/app/core/hooks/useInstructors';
import { instructorsAPI } from '@/app/core/api/instructors';
import type { UserUpdatePayload, CohortAssignModalProps, AvailableCohortSubject, CohortAssignment } from '@/app/core/types/globalUsers';
import type { InstructorProfileExtended } from '@/app/core/hooks/useInstructorProgress';

// ── EditModal ─────────────────────────────────────────────────────────────

interface EditModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: UserUpdatePayload) => Promise<void>;
    instructor: InstructorProfileExtended;
    submitting: boolean;
}

export function EditModal({ isOpen, onClose, onSubmit, instructor, submitting }: EditModalProps) {
    const [form, setForm] = useState({
        first_name: instructor.first_name,
        last_name: instructor.last_name,
        phone: instructor.phone ?? '',
    });

    useEffect(() => {
        setForm({
            first_name: instructor.first_name,
            last_name: instructor.last_name,
            phone: instructor.phone ?? '',
        });
    }, [instructor, isOpen]);

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Edit Instructor" size="md">
            <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <Input
                        label="First Name"
                        value={form.first_name}
                        onChange={e => setForm(p => ({ ...p, first_name: e.target.value }))}
                    />
                    <Input
                        label="Last Name"
                        value={form.last_name}
                        onChange={e => setForm(p => ({ ...p, last_name: e.target.value }))}
                    />
                </div>
                <Input
                    label="Phone"
                    value={form.phone}
                    onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
                />
                <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                    <Button variant="secondary" onClick={onClose} disabled={submitting}>Cancel</Button>
                    <Button variant="primary" onClick={() => onSubmit(form)} disabled={submitting}>
                        {submitting ? 'Saving...' : 'Save Changes'}
                    </Button>
                </div>
            </div>
        </Modal>
    );
}

// ── ResetPasswordModal ────────────────────────────────────────────────────

interface ResetPasswordModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (pw: string) => Promise<void>;
    submitting: boolean;
}

export function ResetPasswordModal({ isOpen, onClose, onSubmit, submitting }: ResetPasswordModalProps) {
    const [pw, setPw] = useState('');
    const [confirm, setConfirm] = useState('');
    const [err, setErr] = useState('');

    useEffect(() => { if (!isOpen) { setPw(''); setConfirm(''); setErr(''); } }, [isOpen]);

    const handleSubmit = async () => {
        if (pw.length < 8) { setErr('Minimum 8 characters'); return; }
        if (pw !== confirm) { setErr('Passwords do not match'); return; }
        setErr('');
        await onSubmit(pw);
        setPw(''); setConfirm('');
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Reset Password" size="sm">
            <div className="space-y-4">
                <Input
                    label="New Password"
                    type="password"
                    value={pw}
                    onChange={e => { setPw(e.target.value); setErr(''); }}
                />
                <Input
                    label="Confirm Password"
                    type="password"
                    value={confirm}
                    onChange={e => { setConfirm(e.target.value); setErr(''); }}
                    error={err}
                />
                <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                    <Button variant="secondary" onClick={onClose} disabled={submitting}>Cancel</Button>
                    <Button variant="primary" onClick={handleSubmit} disabled={submitting}>
                        {submitting ? 'Resetting...' : 'Reset Password'}
                    </Button>
                </div>
            </div>
        </Modal>
    );
}

// ── DeleteModal ───────────────────────────────────────────────────────────

interface DeleteModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => Promise<void>;
    name: string;
    submitting: boolean;
}

export function DeleteModal({ isOpen, onClose, onConfirm, name, submitting }: DeleteModalProps) {
    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Remove Instructor" size="sm">
            <div className="space-y-4">
                <div className="flex items-start gap-3 p-4 bg-red-50 rounded-lg border border-red-100">
                    <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                    <p className="text-sm text-red-700">
                        Delete <strong>{name}</strong>? Their sessions, grades, and activity records will also be removed.
                    </p>
                </div>
                <div className="flex justify-end gap-3">
                    <Button variant="secondary" onClick={onClose} disabled={submitting}>Cancel</Button>
                    <Button variant="danger" onClick={onConfirm} disabled={submitting}>
                        {submitting ? 'Deleting...' : 'Delete Instructor'}
                    </Button>
                </div>
            </div>
        </Modal>
    );
}

// ── CohortAssignModal ─────────────────────────────────────────────────────

// ── Types ─────────────────────────────────────────────────────────────────



export function CohortAssignModal({
    isOpen, onClose, instructorId, instructorName,
}: CohortAssignModalProps) {
    const { instructor: detail, loading, refetch } =
        useInstructorDetail(isOpen ? instructorId : null);

    const [allCohortSubjects, setAllCohortSubjects] = useState<AvailableCohortSubject[]>([]);
    const [selectedCohortSubject, setSelectedCohortSubject] = useState('');
    const [working, setWorking] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [history, setHistory] = useState<Record<number, {
        log_id: number;
        user_full_name: string;
        assigned_at: string;
        unassigned_at: string | null;
        end_reason: string;
        is_active: boolean;
    }[]>>({});
    const [expandedHistory, setExpandedHistory] = useState<number | null>(null);
    const [unassignReason, setUnassignReason] = useState('MANUAL');
    const [unassignNotes, setUnassignNotes] = useState('');


    const loadHistory = async (cohortSubjectId: number) => {
        if (expandedHistory === cohortSubjectId) {
            setExpandedHistory(null);
            return;
        }
        try {
            const data = await instructorsAPI.getInstructorHistory(cohortSubjectId);
            setHistory(prev => ({ ...prev, [cohortSubjectId]: data.history }));
            setExpandedHistory(cohortSubjectId);
        } catch { /* silent */ }
    };

    useEffect(() => {
        if (!isOpen) return;
        instructorsAPI.getCohortSubjects()
            .then(setAllCohortSubjects)
            .catch(() => { });
    }, [isOpen]);

    const assignedIds = new Set(
        (detail?.cohort_assignments ?? []).map(a => a.cohort_subject_id)
    );
    const available = allCohortSubjects.filter(cs => !assignedIds.has(cs.id));

    const handleAssign = async () => {
        if (!selectedCohortSubject) return;
        setWorking(true); setError(null);
        try {
            await instructorsAPI.assignToCohortSubject(instructorId, Number(selectedCohortSubject));
            setSelectedCohortSubject('');
            await refetch();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to assign cohort-subject');
        } finally { setWorking(false); }
    };

    const handleUnassign = async (cohortSubjectId: number) => {
        setWorking(true); setError(null);
        try {
            await instructorsAPI.unassignFromCohortSubject(
                instructorId, cohortSubjectId, unassignReason, unassignNotes
            );
            await refetch();
            setUnassignReason('MANUAL');
            setUnassignNotes('');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to unassign');
        } finally { setWorking(false); }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Subject Assignments — ${instructorName}`} size="md">
            <div className="space-y-5">
                {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}

                <div>
                    <p className="text-sm font-semibold text-gray-700 mb-2">
                        Current Assignments ({detail?.cohort_assignments?.length ?? 0})
                    </p>
                    {loading ? (
                        <div className="h-12 flex items-center justify-center">
                            <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
                        </div>
                    ) : (detail?.cohort_assignments?.length ?? 0) === 0 ? (
                        <p className="text-sm text-gray-400 py-3 text-center bg-gray-50 rounded-lg border border-dashed border-gray-200">
                            Not assigned to any subjects
                        </p>
                    ) : (
                        <div className="space-y-2">
                            {detail!.cohort_assignments.map(a => (
                                <div key={a.cohort_subject_id} className="rounded-lg border border-gray-200 overflow-hidden">
                                    <div className="flex items-center justify-between p-3 bg-gray-50">
                                        <div>
                                            <p className="text-sm font-medium text-gray-900">{a.subject_name}</p>
                                            <p className="text-xs text-gray-500">
                                                {a.cohort_name} · {a.academic_year}
                                                {a.start_date && (
                                                    <span className="ml-1 text-teal-600">
                                                        · since {new Date(a.start_date).toLocaleDateString('en-GB', {
                                                            day: '2-digit', month: 'short',
                                                        })}
                                                    </span>
                                                )}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <button
                                                onClick={() => loadHistory(a.cohort_subject_id)}
                                                className="p-1.5 rounded-lg text-gray-400 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                                                title="View history"
                                            >
                                                <Clock className="h-3.5 w-3.5" />
                                            </button>
                                            <select
                                                value={unassignReason}
                                                onChange={e => setUnassignReason(e.target.value)}
                                                className="text-xs rounded-lg border border-gray-200 px-2 py-1 text-gray-500 focus:outline-none focus:ring-1 focus:ring-red-400 bg-white"
                                            >
                                                <option value="MANUAL">Manual</option>
                                                <option value="REASSIGNED">Reassigned</option>
                                                <option value="TERM_END">Term End</option>
                                                <option value="MEMBERSHIP_REVOKED">Membership Revoked</option>
                                                <option value="ACCOUNT_DELETED">Account Deleted</option>
                                            </select>
                                            <button
                                                onClick={() => handleUnassign(a.cohort_subject_id)}
                                                disabled={working}
                                                className="p-1.5 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                                                title="Unassign"
                                            >
                                                <X className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </div>
                                    {expandedHistory === a.cohort_subject_id && history[a.cohort_subject_id] && (
                                        <div className="border-t border-gray-100 bg-white px-3 py-2 space-y-1.5">
                                            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">History</p>
                                            {history[a.cohort_subject_id].map(log => (
                                                <div key={log.log_id} className="flex items-center justify-between text-xs">
                                                    <span className={`font-medium ${log.is_active ? 'text-teal-600' : 'text-gray-500'}`}>
                                                        {log.user_full_name}
                                                    </span>
                                                    <span className="text-gray-400">
                                                        {new Date(log.assigned_at).toLocaleDateString('en-GB', {
                                                            day: '2-digit', month: 'short',
                                                        })}
                                                        {log.unassigned_at && (
                                                            <> → {new Date(log.unassigned_at).toLocaleDateString('en-GB', {
                                                                day: '2-digit', month: 'short',
                                                            })}</>
                                                        )}
                                                        {log.is_active && <span className="ml-1 text-teal-500">· active</span>}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="border-t border-gray-100 pt-4">
                    <p className="text-sm font-semibold text-gray-700 mb-2">Assign to Subject</p>
                    {available.length === 0 ? (
                        <p className="text-sm text-gray-400 text-center py-2">
                            {allCohortSubjects.length === 0
                                ? 'No cohort-subjects available'
                                : 'All subjects already assigned'}
                        </p>
                    ) : (
                        <div className="flex gap-2">
                            <select
                                value={selectedCohortSubject}
                                onChange={e => setSelectedCohortSubject(e.target.value)}
                                className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="">Select subject...</option>
                                {available.map(cs => (
                                    <option key={cs.id} value={cs.id}>
                                        {cs.cohort_name} — {cs.subject_name} ({cs.academic_year_name})
                                    </option>
                                ))}
                            </select>
                            <Button
                                variant="primary"
                                onClick={handleAssign}
                                disabled={!selectedCohortSubject || working}
                            >
                                <Plus className="h-4 w-4" /> Assign
                            </Button>
                        </div>
                    )}
                </div>

                <div className="flex justify-end pt-2 border-t border-gray-100">
                    <Button variant="secondary" onClick={onClose}>Close</Button>
                </div>
            </div>
        </Modal>
    );
}