'use client';

// ============================================================================
// app/core/components/academic/TermComponents.tsx
//
// Components and utilities for the terms page.
// No any. No alert(). No inline definitions in page.
// ============================================================================

import { useState, useEffect } from 'react';
import { AlertCircle } from 'lucide-react';
import Modal from '@/app/components/ui/Modal';
import { Button } from '@/app/components/ui/Button';
import { Input } from '@/app/components/ui/Input';
import { Select } from '@/app/components/ui/Select';
import { ErrorBanner } from '@/app/components/ui/ErrorBanner';
import { extractErrorMessage } from '@/app/core/types/errors';
import type { ApiError } from '@/app/core/types/errors';
import type { Term, AcademicYear } from '@/app/core/types/academic';

// ── Pure utilities ────────────────────────────────────────────────────────

export function formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    });
}

export function isTermActive(term: Term): boolean {
    const today = new Date();
    return today >= new Date(term.start_date) && today <= new Date(term.end_date);
}

export function isTermPast(term: Term): boolean {
    return new Date(term.end_date) < new Date();
}

// ── Form state type ───────────────────────────────────────────────────────

export interface TermFormState {
    name: string;
    academic_year: string;
    start_date: string;
    end_date: string;
    sequence: number;
}

// ── TermFormModal ─────────────────────────────────────────────────────────

interface TermFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    editing: Term | null;
    academicYears: AcademicYear[];
    initialData: TermFormState;
    onSave: (data: TermFormState, editingId?: number) => Promise<void>;
}

export function TermFormModal({
    isOpen,
    onClose,
    editing,
    academicYears,
    initialData,
    onSave,
}: TermFormModalProps) {
    const [form, setForm] = useState<TermFormState>(initialData);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        setForm(initialData);
        setError(null);
    }, [isOpen, initialData]);

    const selectedFormYear = academicYears.find((y) => String(y.id) === form.academic_year);
    const formYearIsHistorical = selectedFormYear ? !selectedFormYear.is_current : false;

    const validate = (): string | null => {
        if (!form.name || !form.academic_year || !form.start_date || !form.end_date)
            return 'All fields are required.';
        if (form.start_date >= form.end_date) return 'End date must be after start date.';
        return null;
    };

    const handleSubmit = async () => {
        const validationError = validate();
        if (validationError) {
            setError(validationError);
            return;
        }

        setSaving(true);
        setError(null);
        try {
            await onSave(form, editing?.id);
            onClose();
        } catch (err) {
            setError(extractErrorMessage(err as ApiError, 'Failed to save term.'));
        } finally {
            setSaving(false);
        }
    };

    const handleClose = () => {
        setError(null);
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={handleClose} title={editing ? 'Edit Term' : 'Add New Term'}>
            <div className="space-y-4">
                {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}

                {formYearIsHistorical && (
                    <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-700">
                        <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                        This academic year is no longer active. The system will reject creating terms in past
                        academic years.
                    </div>
                )}

                <Input
                    label="Term Name"
                    value={form.name}
                    onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g. Term 1, First Semester"
                    required
                />

                <Select
                    label="Academic Year"
                    value={form.academic_year}
                    onChange={(e) => setForm((prev) => ({ ...prev, academic_year: e.target.value }))}
                    required
                    options={[
                        { value: '', label: 'Select Academic Year' },
                        ...academicYears.map((y) => ({
                            value: String(y.id),
                            label: y.is_current ? `${y.name} (Current)` : `${y.name} — Historical`,
                        })),
                    ]}
                />

                <div className="grid grid-cols-2 gap-4">
                    <Input
                        label="Start Date"
                        type="date"
                        value={form.start_date}
                        onChange={(e) => setForm((prev) => ({ ...prev, start_date: e.target.value }))}
                        required
                    />
                    <Input
                        label="End Date"
                        type="date"
                        value={form.end_date}
                        onChange={(e) => setForm((prev) => ({ ...prev, end_date: e.target.value }))}
                        required
                    />
                </div>

                <Input
                    label="Sequence"
                    type="number"
                    value={form.sequence}
                    onChange={(e) => setForm((prev) => ({ ...prev, sequence: Number(e.target.value) }))}
                    min={1}
                    required
                />

                <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
                    <Button variant="secondary" onClick={handleClose} disabled={saving}>
                        Cancel
                    </Button>
                    <Button onClick={handleSubmit} disabled={saving || formYearIsHistorical}>
                        {saving ? 'Saving...' : editing ? 'Update Term' : 'Create Term'}
                    </Button>
                </div>
            </div>
        </Modal>
    );
}
