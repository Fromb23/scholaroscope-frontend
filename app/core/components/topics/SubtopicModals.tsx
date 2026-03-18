'use client';

// ============================================================================
// app/core/components/topics/SubtopicModals.tsx
//
// Subtopic create/edit/delete modals — extracted from topic detail page.
// No any. Typed props.
// ============================================================================

import { useState, useEffect } from 'react';
import Modal from '@/app/components/ui/Modal';
import { Button } from '@/app/components/ui/Button';
import { Input } from '@/app/components/ui/Input';
import { ErrorBanner } from '@/app/components/ui/ErrorBanner';
import type { Subtopic, SubtopicFormData } from '@/app/core/types/topics';

// ── SubtopicFormModal ─────────────────────────────────────────────────────

interface SubtopicFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: SubtopicFormData) => Promise<void>;
    topicId: number;
    initialData?: Subtopic | null;
    loading: boolean;
}

export function SubtopicFormModal({
    isOpen, onClose, onSubmit, topicId, initialData, loading,
}: SubtopicFormModalProps) {
    const [form, setForm] = useState<SubtopicFormData>({
        topic: topicId,
        code: initialData?.code ?? '',
        name: initialData?.name ?? '',
        description: initialData?.description ?? '',
        sequence: initialData?.sequence ?? 0,
    });
    const [error, setError] = useState<string | null>(null);

    // Sync form when initialData or isOpen changes
    useEffect(() => {
        setForm({
            topic: topicId,
            code: initialData?.code ?? '',
            name: initialData?.name ?? '',
            description: initialData?.description ?? '',
            sequence: initialData?.sequence ?? 0,
        });
        setError(null);
    }, [isOpen, initialData, topicId]);

    const handleSubmit = async () => {
        if (!form.code || !form.name) {
            setError('Code and name are required.');
            return;
        }
        setError(null);
        await onSubmit({ ...form, topic: topicId });
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={initialData ? 'Edit Subtopic' : 'Add Subtopic'}
            size="md"
        >
            <div className="space-y-4">
                {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}

                <div className="grid grid-cols-2 gap-4">
                    <Input
                        label="Code *"
                        placeholder="e.g. T1.1"
                        value={form.code}
                        onChange={e => setForm(f => ({ ...f, code: e.target.value }))}
                    />
                    <Input
                        label="Sequence"
                        type="number"
                        min={0}
                        value={form.sequence}
                        onChange={e => setForm(f => ({ ...f, sequence: Number(e.target.value) }))}
                    />
                </div>

                <Input
                    label="Name *"
                    placeholder="e.g. Linear Equations"
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                />

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <textarea
                        rows={3}
                        placeholder="Optional description..."
                        value={form.description}
                        onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                        className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>

                <div className="flex justify-end gap-3 pt-2">
                    <Button variant="secondary" onClick={onClose} disabled={loading}>Cancel</Button>
                    <Button onClick={handleSubmit} disabled={loading}>
                        {loading ? 'Saving...' : initialData ? 'Save Changes' : 'Add Subtopic'}
                    </Button>
                </div>
            </div>
        </Modal>
    );
}

// ── DeleteSubtopicModal ───────────────────────────────────────────────────

interface DeleteSubtopicModalProps {
    subtopic: Subtopic | null;
    onClose: () => void;
    onConfirm: () => Promise<void>;
    loading: boolean;
}

export function DeleteSubtopicModal({
    subtopic, onClose, onConfirm, loading,
}: DeleteSubtopicModalProps) {
    return (
        <Modal isOpen={!!subtopic} onClose={onClose} title="Delete Subtopic" size="sm">
            <div className="space-y-4">
                <p className="text-sm text-gray-600">
                    Delete{' '}
                    <span className="font-semibold text-gray-900">{subtopic?.name}</span>?
                    This will also remove any session links and coverage records for this subtopic.
                </p>
                <div className="flex justify-end gap-3">
                    <Button variant="secondary" onClick={onClose} disabled={loading}>Cancel</Button>
                    <Button variant="danger" onClick={onConfirm} disabled={loading}>
                        {loading ? 'Deleting...' : 'Delete'}
                    </Button>
                </div>
            </div>
        </Modal>
    );
}