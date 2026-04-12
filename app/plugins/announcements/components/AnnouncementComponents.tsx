'use client';

// ============================================================================
// app/plugins/announcements/components/AnnouncementComponents.tsx
//
// All announcement page sub-components. No any. Typed props.
// No direct API calls — all mutations go through the hook.
// ============================================================================

import { useState } from 'react';
import {
    Globe, Building2, Check, MessageSquare, Edit, Trash2,
    ChevronDown, ChevronUp, AlertCircle,
} from 'lucide-react';
import { Badge } from '@/app/components/ui/Badge';
import { Button } from '@/app/components/ui/Button';
import { Input } from '@/app/components/ui/Input';
import { Select } from '@/app/components/ui/Select';
import Modal from '@/app/components/ui/Modal';
import { ErrorBanner } from '@/app/components/ui/ErrorBanner';
import type {
    Announcement,
    AnnouncementFormData,
    AnnouncementTarget,
    FeedbackType,
} from '@/app/plugins/announcements/types/announcements';

// ── FeedbackForm ──────────────────────────────────────────────────────────

interface FeedbackFormProps {
    announcement: Announcement;
    onSubmit: (id: number, response: string) => Promise<void>;
}

export function FeedbackForm({ announcement, onSubmit }: FeedbackFormProps) {
    const [response, setResponse] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (value: string) => {
        setSubmitting(true);
        try {
            await onSubmit(announcement.id, value);
        } finally {
            setSubmitting(false);
        }
    };

    if (announcement.has_feedback) {
        return (
            <div className="flex items-center gap-2 mt-2 text-xs text-green-600">
                <Check className="h-3.5 w-3.5" /> Response submitted
            </div>
        );
    }

    return (
        <div className="mt-3 pt-3 border-t border-gray-100 space-y-2">
            <p className="text-xs font-medium text-gray-700">{announcement.feedback_prompt}</p>
            {announcement.feedback_type === 'ACKNOWLEDGE' ? (
                <div className="flex gap-2">
                    <Button size="sm" onClick={() => handleSubmit('yes')} disabled={submitting}>
                        <Check className="h-3.5 w-3.5 mr-1" /> Acknowledge
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => handleSubmit('no')} disabled={submitting}>
                        Decline
                    </Button>
                </div>
            ) : (
                <div className="space-y-2">
                    <textarea
                        value={response}
                        onChange={e => setResponse(e.target.value)}
                        rows={2}
                        placeholder="Your response..."
                        className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <Button size="sm" onClick={() => handleSubmit(response)}
                        disabled={submitting || !response}>
                        Submit Response
                    </Button>
                </div>
            )}
        </div>
    );
}

// ── AnnouncementCard ──────────────────────────────────────────────────────

interface AnnouncementCardProps {
    announcement: Announcement;
    isAdmin: boolean;
    onMarkRead: (id: number) => void;
    onEdit: (a: Announcement) => void;
    onDelete: (id: number) => void;
    onFeedback: (id: number, response: string) => Promise<void>;
}

export function AnnouncementCard({
    announcement, isAdmin, onMarkRead, onEdit, onDelete, onFeedback,
}: AnnouncementCardProps) {
    const [expanded, setExpanded] = useState(!announcement.is_read);

    return (
        <div className={`rounded-xl border transition-all ${announcement.is_read ? 'bg-white border-gray-200' : 'bg-blue-50 border-blue-200'
            }`}>
            <div className="flex items-start gap-3 p-4">
                <div className={`p-2 rounded-xl shrink-0 ${announcement.is_system ? 'bg-purple-100' : 'bg-blue-100'
                    }`}>
                    {announcement.is_system
                        ? <Globe className="h-4 w-4 text-purple-600" />
                        : <Building2 className="h-4 w-4 text-blue-600" />
                    }
                </div>

                <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-sm font-semibold text-gray-900">
                                {announcement.title}
                            </h3>
                            {!announcement.is_read && (
                                <span className="h-2 w-2 rounded-full bg-blue-500 shrink-0" />
                            )}
                            {announcement.is_system && (
                                <Badge variant="purple" size="sm">System</Badge>
                            )}
                            {announcement.target_role !== 'ALL' && (
                                <Badge variant="info" size="sm">{announcement.target_role}</Badge>
                            )}
                            {announcement.requires_feedback && (
                                <Badge variant="warning" size="sm">
                                    <MessageSquare className="h-3 w-3 mr-1" />
                                    Feedback required
                                </Badge>
                            )}
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                            {isAdmin && (
                                <>
                                    <button
                                        onClick={() => onEdit(announcement)}
                                        className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                                    >
                                        <Edit className="h-3.5 w-3.5" />
                                    </button>
                                    <button
                                        onClick={() => onDelete(announcement.id)}
                                        className="p-1.5 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600"
                                    >
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                </>
                            )}
                            <button
                                onClick={() => setExpanded(v => !v)}
                                className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100"
                            >
                                {expanded
                                    ? <ChevronUp className="h-3.5 w-3.5" />
                                    : <ChevronDown className="h-3.5 w-3.5" />
                                }
                            </button>
                        </div>
                    </div>

                    <p className="text-xs text-gray-400 mt-0.5">
                        {announcement.created_by_name} ·{' '}
                        {new Date(announcement.created_at).toLocaleDateString()}
                        {isAdmin && (
                            <span className="ml-2 text-gray-300">
                                {announcement.read_count} read · {announcement.feedback_count} responses
                            </span>
                        )}
                    </p>
                </div>
            </div>

            {expanded && (
                <div className="px-4 pb-4 pt-0 ml-11">
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{announcement.body}</p>

                    {announcement.requires_feedback && (
                        <FeedbackForm announcement={announcement} onSubmit={onFeedback} />
                    )}

                    {!announcement.is_read && (
                        <button
                            onClick={() => onMarkRead(announcement.id)}
                            className="mt-3 text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
                        >
                            <Check className="h-3 w-3" /> Mark as read
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}

// ── AnnouncementModal ─────────────────────────────────────────────────────

const EMPTY_FORM: AnnouncementFormData = {
    title: '', body: '', target_role: 'ALL',
    is_system: false, requires_feedback: false,
    feedback_type: 'NONE', feedback_prompt: '', expires_at: '',
};

interface AnnouncementModalProps {
    open: boolean;
    onClose: () => void;
    editing: Announcement | null;
    isSuperAdmin: boolean;
    onCreate: (data: AnnouncementFormData) => Promise<Announcement | void>;
    onUpdate: (id: number, data: Partial<AnnouncementFormData>) => Promise<Announcement | void>;
}

export function AnnouncementModal({
    open, onClose, editing, isSuperAdmin, onCreate, onUpdate,
}: AnnouncementModalProps) {
    const [form, setForm] = useState<AnnouncementFormData>(
        editing
            ? {
                title: editing.title,
                body: editing.body,
                target_role: editing.target_role,
                is_system: editing.is_system,
                requires_feedback: editing.requires_feedback,
                feedback_type: editing.feedback_type,
                feedback_prompt: editing.feedback_prompt,
                expires_at: editing.expires_at ?? '',
            }
            : EMPTY_FORM
    );
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const set = <K extends keyof AnnouncementFormData>(
        key: K,
        value: AnnouncementFormData[K]
    ) => setForm(prev => ({ ...prev, [key]: value }));

    const handleSubmit = async () => {
        if (!form.title || !form.body) {
            setError('Title and body are required.');
            return;
        }
        setSaving(true); setError(null);
        try {
            const payload: AnnouncementFormData = {
                ...form,
                feedback_type: form.requires_feedback ? form.feedback_type : 'NONE',
                expires_at: form.expires_at,
            };
            if (editing) {
                await onUpdate(editing.id, payload);
            } else {
                await onCreate(payload);
            }
            onClose();
        } catch {
            setError('Failed to save announcement.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal
            isOpen={open}
            onClose={onClose}
            title={editing ? 'Edit Announcement' : 'New Announcement'}
            size="lg"
        >
            <div className="space-y-4">
                {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}

                <Input
                    label="Title"
                    value={form.title}
                    onChange={e => set('title', e.target.value)}
                    placeholder="Announcement title"
                    required
                />

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Body</label>
                    <textarea
                        value={form.body}
                        onChange={e => set('body', e.target.value)}
                        rows={4}
                        required
                        className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Write your announcement..."
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <Select
                        label="Audience"
                        value={form.target_role}
                        onChange={e => set('target_role', e.target.value as AnnouncementTarget)}
                        options={[
                            { value: 'ALL', label: 'All Users' },
                            { value: 'ADMIN', label: 'Admins Only' },
                            { value: 'INSTRUCTOR', label: 'Instructors Only' },
                        ]}
                    />
                    <Input
                        label="Expires At (optional)"
                        type="datetime-local"
                        value={form.expires_at}
                        onChange={e => set('expires_at', e.target.value)}
                    />
                </div>

                {isSuperAdmin && (
                    <label className="flex items-center gap-3 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={form.is_system}
                            onChange={e => set('is_system', e.target.checked)}
                            className="h-4 w-4 rounded border-gray-300 text-purple-600"
                        />
                        <div>
                            <p className="text-sm font-medium text-gray-900">System Announcement</p>
                            <p className="text-xs text-gray-500">
                                Visible to all organizations regardless of plugin state
                            </p>
                        </div>
                    </label>
                )}

                <label className="flex items-center gap-3 cursor-pointer">
                    <input
                        type="checkbox"
                        checked={form.requires_feedback}
                        onChange={e => set('requires_feedback', e.target.checked)}
                        className="h-4 w-4 rounded border-gray-300 text-blue-600"
                    />
                    <p className="text-sm font-medium text-gray-900">Requires Feedback</p>
                </label>

                {form.requires_feedback && (
                    <div className="pl-7 space-y-3">
                        <Select
                            label="Feedback Type"
                            value={form.feedback_type}
                            onChange={e => set('feedback_type', e.target.value as FeedbackType)}
                            options={[
                                { value: 'ACKNOWLEDGE', label: 'Acknowledgement (Yes/No)' },
                                { value: 'TEXT', label: 'Free Text Response' },
                            ]}
                        />
                        <Input
                            label="Feedback Prompt"
                            value={form.feedback_prompt}
                            onChange={e => set('feedback_prompt', e.target.value)}
                            placeholder="e.g. Do you acknowledge this policy?"
                        />
                    </div>
                )}

                <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
                    <Button variant="secondary" onClick={onClose}>Cancel</Button>
                    <Button onClick={handleSubmit} disabled={saving}>
                        {saving ? 'Saving...' : editing ? 'Update' : 'Post Announcement'}
                    </Button>
                </div>
            </div>
        </Modal>
    );
}