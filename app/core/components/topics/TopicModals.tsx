'use client';

// ============================================================================
// app/core/components/topics/TopicModals.tsx
//
// Topic create/edit/delete modals — extracted from topics/page.tsx.
// No any. Typed props. ErrorBanner replaces inline error paragraph.
// ============================================================================

import { useState, useEffect } from 'react';
import Modal from '@/app/components/ui/Modal';
import { Button } from '@/app/components/ui/Button';
import { Input } from '@/app/components/ui/Input';
import { Select } from '@/app/components/ui/Select';
import { ErrorBanner } from '@/app/components/ui/ErrorBanner';
import type { Topic, TopicFormData } from '@/app/core/types/topics';

// ── SubjectOption — shared select option shape ────────────────────────────

export interface SubjectOption {
    value: number | string;
    label: string;
}

// ── TopicFormModal ────────────────────────────────────────────────────────

interface TopicFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: TopicFormData) => Promise<void>;
    initialData?: Topic | null;
    subjects: SubjectOption[];
    loading: boolean;
}

export function TopicFormModal({
    isOpen, onClose, onSubmit, initialData, subjects, loading,
}: TopicFormModalProps) {
    const [form, setForm] = useState<TopicFormData>({
        subject: initialData?.subject ?? (subjects[0]?.value as number) ?? 0,
        code: initialData?.code ?? '',
        name: initialData?.name ?? '',
        description: initialData?.description ?? '',
        sequence: initialData?.sequence ?? 0,
    });
    const [error, setError] = useState<string | null>(null);

    // Sync when modal opens with different data
    useEffect(() => {
        setForm({
            subject: initialData?.subject ?? (subjects[0]?.value as number) ?? 0,
            code: initialData?.code ?? '',
            name: initialData?.name ?? '',
            description: initialData?.description ?? '',
            sequence: initialData?.sequence ?? 0,
        });
        setError(null);
    }, [isOpen, initialData]);

    const handleSubmit = async () => {
        if (!form.subject || !form.code || !form.name) {
            setError('Subject, code and name are required.');
            return;
        }
        setError(null);
        await onSubmit(form);
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={initialData ? 'Edit Topic' : 'Create Topic'}
            size="md"
        >
            <div className="space-y-4">
                {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}

                <Select
                    label="Subject *"
                    value={form.subject}
                    onChange={e => setForm(f => ({ ...f, subject: Number(e.target.value) }))}
                    options={[{ value: '', label: 'Select subject...' }, ...subjects]}
                />

                <div className="grid grid-cols-2 gap-4">
                    <Input
                        label="Code *"
                        placeholder="e.g. T1, UNIT-3"
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
                    placeholder="e.g. Algebra, Organic Chemistry"
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
                        {loading ? 'Saving...' : initialData ? 'Save Changes' : 'Create Topic'}
                    </Button>
                </div>
            </div>
        </Modal>
    );
}

// ── DeleteTopicModal ──────────────────────────────────────────────────────

interface DeleteTopicModalProps {
    topic: Topic | null;
    onClose: () => void;
    onConfirm: () => Promise<void>;
    loading: boolean;
}

export function DeleteTopicModal({ topic, onClose, onConfirm, loading }: DeleteTopicModalProps) {
    return (
        <Modal isOpen={!!topic} onClose={onClose} title="Delete Topic" size="sm">
            <div className="space-y-4">
                <p className="text-sm text-gray-600">
                    Are you sure you want to delete{' '}
                    <span className="font-semibold text-gray-900">{topic?.name}</span>?
                    All subtopics under this topic will also be deleted. This cannot be undone.
                </p>
                <div className="flex justify-end gap-3">
                    <Button variant="secondary" onClick={onClose} disabled={loading}>Cancel</Button>
                    <Button variant="danger" onClick={onConfirm} disabled={loading}>
                        {loading ? 'Deleting...' : 'Delete Topic'}
                    </Button>
                </div>
            </div>
        </Modal>
    );
}