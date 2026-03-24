'use client';

// ============================================================================
// app/core/components/curricula/CurriculumFormModal.tsx
//
// Create/edit curriculum modal — extracted from curricula/page.tsx.
// No any. No alert(). Typed props.
// ============================================================================

import { useState, useEffect } from 'react';
import Modal from '@/app/components/ui/Modal';
import { Button } from '@/app/components/ui/Button';
import { Input } from '@/app/components/ui/Input';
import { ErrorBanner } from '@/app/components/ui/ErrorBanner';
import { extractErrorMessage } from '@/app/core/types/errors';
import type { ApiError } from '@/app/core/types/errors';
import { CURRICULUM_TYPE_OPTIONS, type Curriculum, type CurriculumType } from '@/app/core/types/academic';
import { Select } from '@/app/components/ui/Select';

// ── Types ─────────────────────────────────────────────────────────────────

export interface CurriculumFormData {
    name: string;
    curriculum_type: CurriculumType;
    description: string;
    is_active: boolean;
}

interface CurriculumFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    editing: Curriculum | null;
    onSave: (data: CurriculumFormData, editingId?: number) => Promise<void>;
}

const DEFAULT_FORM: CurriculumFormData = {
    name: '',
    curriculum_type: '',
    description: '',
    is_active: true,
};

// ── Component ─────────────────────────────────────────────────────────────

export function CurriculumFormModal({ isOpen, onClose, editing, onSave }: CurriculumFormModalProps) {
    const [form, setForm] = useState<CurriculumFormData>(DEFAULT_FORM);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Sync form when editing changes
    useEffect(() => {
        if (editing) {
            setForm({
                name: editing.name,
                curriculum_type: editing.curriculum_type,
                description: editing.description ?? '',
                is_active: editing.is_active,
            });
        } else {
            setForm(DEFAULT_FORM);
        }
        setError(null);
    }, [editing, isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setError(null);
        try {
            await onSave(form, editing?.id);
            onClose();
        } catch (err) {
            setError(extractErrorMessage(err as ApiError, 'Failed to save curriculum.'));
        } finally {
            setSaving(false);
        }
    };

    const handleClose = () => { setError(null); onClose(); };

    return (
        <Modal
            isOpen={isOpen}
            onClose={handleClose}
            title={editing ? 'Edit Curriculum' : 'Add New Curriculum'}
        >
            <form onSubmit={handleSubmit} className="space-y-4">
                {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}

                <Input
                    label="Curriculum Code"
                    value={form.curriculum_type}
                    onChange={e => setForm(prev => ({ ...prev, curriculum_type: e.target.value as CurriculumType }))}
                    placeholder="e.g., CBC, 8-4-4"
                    required
                />
                <Input
                    label="Curriculum Name"
                    value={form.name}
                    onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g., Competency-Based Curriculum"
                    required
                />

                <Select
                    label="Curriculum Type"
                    value={form.curriculum_type}
                    onChange={e => setForm(prev => ({
                        ...prev,
                        curriculum_type: e.target.value as CurriculumType,
                    }))}
                    options={CURRICULUM_TYPE_OPTIONS}
                    required
                />

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <textarea
                        value={form.description}
                        onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="Brief description of the curriculum"
                        rows={3}
                        className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>

                <label className="flex items-center gap-2 cursor-pointer">
                    <input
                        type="checkbox"
                        id="is_active"
                        checked={form.is_active}
                        onChange={e => setForm(prev => ({ ...prev, is_active: e.target.checked }))}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-gray-700">Active Curriculum</span>
                </label>

                <div className="flex justify-end gap-2 pt-4 border-t border-gray-100">
                    <Button type="button" variant="ghost" onClick={handleClose} disabled={saving}>
                        Cancel
                    </Button>
                    <Button type="submit" disabled={saving}>
                        {saving ? 'Saving...' : editing ? 'Update Curriculum' : 'Create Curriculum'}
                    </Button>
                </div>
            </form>
        </Modal>
    );
}