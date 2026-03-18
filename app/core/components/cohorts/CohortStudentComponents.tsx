'use client';

// ============================================================================
// app/core/components/cohorts/CohortStudentComponents.tsx
//
// Components for cohort student management page.
// No alert() calls. Typed props. No any.
// ============================================================================

import { useState } from 'react';
import { CheckSquare, Square, AlertCircle, UserPlus, UserMinus } from 'lucide-react';
import { Badge } from '@/app/components/ui/Badge';
import { Button } from '@/app/components/ui/Button';
import { Select } from '@/app/components/ui/Select';
import Modal from '@/app/components/ui/Modal';
import { ErrorBanner } from '@/app/components/ui/ErrorBanner';
import type { EnrolledStudent, AvailableStudent } from '@/app/core/hooks/useCohortStudents';
import { EnrollmentTypes } from '@/app/core/types/student';

// ── StudentItem ───────────────────────────────────────────────────────────

interface StudentItemProps {
    name: string;
    admNo: string;
    meta?: string;
    selected: boolean;
    onClick: () => void;
    variant?: 'default' | 'enrolled';
}

export function StudentItem({ name, admNo, meta, selected, onClick, variant = 'default' }: StudentItemProps) {
    return (
        <div
            onClick={onClick}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl border cursor-pointer transition-all ${selected
                ? variant === 'enrolled'
                    ? 'bg-blue-50 border-blue-300'
                    : 'bg-green-50 border-green-300'
                : 'bg-white border-gray-100 hover:bg-gray-50 hover:border-gray-200'
                }`}
        >
            <div className="shrink-0">
                {selected
                    ? <CheckSquare className={`h-4 w-4 ${variant === 'enrolled' ? 'text-blue-600' : 'text-green-600'}`} />
                    : <Square className="h-4 w-4 text-gray-300" />
                }
            </div>
            <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-600 shrink-0">
                {name.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{name}</p>
                <p className="text-xs text-gray-400">{admNo}{meta ? ` · ${meta}` : ''}</p>
            </div>
        </div>
    );
}

// ── StudentListPanel ──────────────────────────────────────────────────────

interface EnrolledPanelProps {
    students: EnrolledStudent[];
    selected: Set<number>;
    searchValue: string;
    loading: boolean;
    onSearchChange: (v: string) => void;
    onToggle: (id: number) => void;
    onSelectAll: () => void;
    onRemoveClick: () => void;
}

export function EnrolledPanel({
    students, selected, searchValue, loading,
    onSearchChange, onToggle, onSelectAll, onRemoveClick,
}: EnrolledPanelProps) {
    const allSelected = students.length > 0 && selected.size === students.length;

    return (
        <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-3">
            <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold text-gray-900">
                    Enrolled
                    <Badge variant="info" size="sm" className="ml-2">{students.length}</Badge>
                </h2>
                <Button
                    size="sm"
                    variant="ghost"
                    onClick={onRemoveClick}
                    disabled={selected.size === 0}
                    className="text-red-600 hover:bg-red-50"
                >
                    <UserMinus className="h-4 w-4 mr-1" />
                    Remove ({selected.size})
                </Button>
            </div>

            <div className="relative">
                <input
                    value={searchValue}
                    onChange={e => onSearchChange(e.target.value)}
                    placeholder="Search enrolled..."
                    className="w-full pl-4 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
            </div>

            {students.length > 0 && (
                <button
                    onClick={onSelectAll}
                    className="flex items-center gap-2 text-xs text-blue-600 hover:text-blue-700 font-medium px-1"
                >
                    {allSelected ? <CheckSquare className="h-3.5 w-3.5" /> : <Square className="h-3.5 w-3.5" />}
                    {allSelected ? 'Deselect all' : 'Select all'}
                </button>
            )}

            <div className="space-y-1.5 max-h-[420px] overflow-y-auto pr-1">
                {loading ? (
                    <div className="py-10 text-center">
                        <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent mx-auto" />
                    </div>
                ) : students.length === 0 ? (
                    <div className="py-10 text-center">
                        <AlertCircle className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                        <p className="text-sm text-gray-400">No enrolled students</p>
                    </div>
                ) : students.map(s => (
                    <StudentItem
                        key={s.id}
                        name={s.full_name}
                        admNo={s.admission_number}
                        meta={s.enrollment_type}
                        selected={selected.has(s.id)}
                        onClick={() => onToggle(s.id)}
                        variant="enrolled"
                    />
                ))}
            </div>
        </div>
    );
}

interface AvailablePanelProps {
    students: AvailableStudent[];
    selected: Set<number>;
    searchValue: string;
    loading: boolean;
    onSearchChange: (v: string) => void;
    onSearch: () => void;
    onToggle: (id: number) => void;
    onSelectAll: () => void;
    onEnrollClick: () => void;
}

export function AvailablePanel({
    students, selected, searchValue, loading,
    onSearchChange, onSearch, onToggle, onSelectAll, onEnrollClick,
}: AvailablePanelProps) {
    const allSelected = students.length > 0 && selected.size === students.length;

    return (
        <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-3">
            <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold text-gray-900">
                    Available
                    <Badge variant="green" size="sm" className="ml-2">{students.length}</Badge>
                </h2>
                <Button
                    size="sm"
                    onClick={onEnrollClick}
                    disabled={selected.size === 0}
                >
                    <UserPlus className="h-4 w-4 mr-1" />
                    Enroll ({selected.size})
                </Button>
            </div>

            <div className="flex gap-2">
                <input
                    value={searchValue}
                    onChange={e => onSearchChange(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && onSearch()}
                    placeholder="Search available..."
                    className="flex-1 pl-4 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <Button size="sm" variant="secondary" onClick={onSearch}>Search</Button>
            </div>

            {students.length > 0 && (
                <button
                    onClick={onSelectAll}
                    className="flex items-center gap-2 text-xs text-green-600 hover:text-green-700 font-medium px-1"
                >
                    {allSelected ? <CheckSquare className="h-3.5 w-3.5" /> : <Square className="h-3.5 w-3.5" />}
                    {allSelected ? 'Deselect all' : 'Select all'}
                </button>
            )}

            <div className="space-y-1.5 max-h-[420px] overflow-y-auto pr-1">
                {loading ? (
                    <div className="py-10 text-center">
                        <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent mx-auto" />
                    </div>
                ) : students.length === 0 ? (
                    <div className="py-10 text-center">
                        <AlertCircle className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                        <p className="text-sm text-gray-400">No available students</p>
                    </div>
                ) : students.map(s => (
                    <StudentItem
                        key={s.id}
                        name={s.full_name}
                        admNo={s.admission_number}
                        meta={s.primary_cohort_name}
                        selected={selected.has(s.id)}
                        onClick={() => onToggle(s.id)}
                        variant="default"
                    />
                ))}
            </div>
        </div>
    );
}

// ── EnrollModal ───────────────────────────────────────────────────────────

interface EnrollModalProps {
    isOpen: boolean;
    count: number;
    cohortName: string;
    onClose: () => void;
    onConfirm: (enrollmentType: string, notes: string) => Promise<void>;
}

export function EnrollModal({ isOpen, count, cohortName, onClose, onConfirm }: EnrollModalProps) {
    const [enrollmentType, setEnrollmentType] = useState('ELECTIVE');
    const [notes, setNotes] = useState('');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleConfirm = async () => {
        setSaving(true); setError(null);
        try {
            await onConfirm(enrollmentType, notes);
            setEnrollmentType('ELECTIVE');
            setNotes('');
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Enrollment failed.');
        } finally { setSaving(false); }
    };

    const handleClose = () => { setNotes(''); setEnrollmentType('ELECTIVE'); setError(null); onClose(); };

    return (
        <Modal isOpen={isOpen} onClose={handleClose} title={`Enroll ${count} Student${count !== 1 ? 's' : ''}`} size="sm">
            <div className="space-y-4">
                <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl text-sm text-blue-800">
                    Enrolling <strong>{count}</strong> student{count !== 1 ? 's' : ''} into <strong>{cohortName}</strong>
                </div>
                {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}
                <Select
                    label="Enrollment Type"
                    value={enrollmentType}
                    onChange={e => setEnrollmentType(e.target.value)}
                    options={EnrollmentTypes}
                />
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
                    <textarea
                        value={notes}
                        onChange={e => setNotes(e.target.value)}
                        rows={3}
                        className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Add notes about this enrollment..."
                    />
                </div>
                <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
                    <Button variant="secondary" onClick={handleClose}>Cancel</Button>
                    <Button onClick={handleConfirm} disabled={saving}>
                        {saving ? 'Enrolling...' : 'Enroll Students'}
                    </Button>
                </div>
            </div>
        </Modal>
    );
}

// ── UnenrollModal ─────────────────────────────────────────────────────────

interface UnenrollModalProps {
    isOpen: boolean;
    count: number;
    onClose: () => void;
    onConfirm: (notes: string) => Promise<void>;
}

export function UnenrollModal({ isOpen, count, onClose, onConfirm }: UnenrollModalProps) {
    const [notes, setNotes] = useState('');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleConfirm = async () => {
        setSaving(true); setError(null);
        try {
            await onConfirm(notes);
            setNotes('');
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unenrollment failed.');
        } finally { setSaving(false); }
    };

    const handleClose = () => { setNotes(''); setError(null); onClose(); };

    return (
        <Modal isOpen={isOpen} onClose={handleClose} title={`Remove ${count} Student${count !== 1 ? 's' : ''}`} size="sm">
            <div className="space-y-4">
                <div className="p-3 bg-red-50 border border-red-100 rounded-xl">
                    <p className="text-sm text-red-800 font-medium mb-1">This will:</p>
                    <ul className="text-sm text-red-700 space-y-0.5 list-disc list-inside">
                        <li>Deactivate their subject enrollments</li>
                        <li>Remove future attendance records</li>
                        <li>Update primary cohort if applicable</li>
                    </ul>
                </div>
                {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Reason (optional)</label>
                    <textarea
                        value={notes}
                        onChange={e => setNotes(e.target.value)}
                        rows={3}
                        className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                        placeholder="Add reason for removal..."
                    />
                </div>
                <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
                    <Button variant="secondary" onClick={handleClose}>Cancel</Button>
                    <Button onClick={handleConfirm} disabled={saving} className="bg-red-600 hover:bg-red-700 text-white">
                        {saving ? 'Removing...' : 'Remove Students'}
                    </Button>
                </div>
            </div>
        </Modal>
    );
}