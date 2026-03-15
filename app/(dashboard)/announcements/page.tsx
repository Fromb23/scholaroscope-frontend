// app/(dashboard)/announcements/page.tsx
'use client';

import { useState } from 'react';
import {
    Megaphone, Plus, Globe, Building2, Check, Users,
    MessageSquare, Edit, Trash2, AlertCircle, ChevronDown, ChevronUp,
} from 'lucide-react';
import { useAnnouncements } from '@/app/plugins/announcements/hooks/useAnnouncements';
import { announcementAPI } from '@/app/plugins/announcements/api/announcements';
import {
    Announcement, AnnouncementFormData, FeedbackType
} from '@/app/plugins/announcements/types/announcements';
import { useAuth } from '@/app/context/AuthContext';
import { Card } from '@/app/components/ui/Card';
import { Button } from '@/app/components/ui/Button';
import { Badge } from '@/app/components/ui/Badge';
import { Input } from '@/app/components/ui/Input';
import { Select } from '@/app/components/ui/Select';
import Modal from '@/app/components/ui/Modal';
import { StatsCard } from '@/app/components/dashboard/StatsCard';

// ── Feedback form ─────────────────────────────────────────────────────────

function FeedbackForm({ announcement, onSubmit }: {
    announcement: Announcement;
    onSubmit: () => void;
}) {
    const [response, setResponse] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async () => {
        if (!response) return;
        setSubmitting(true);
        try {
            await announcementAPI.submitFeedback(announcement.id, response);
            onSubmit();
        } finally {
            setSubmitting(false);
        }
    };

    if (announcement.has_feedback) return (
        <div className="flex items-center gap-2 mt-2 text-xs text-green-600">
            <Check className="h-3.5 w-3.5" /> Response submitted
        </div>
    );

    return (
        <div className="mt-3 pt-3 border-t border-gray-100 space-y-2">
            <p className="text-xs font-medium text-gray-700">{announcement.feedback_prompt}</p>
            {announcement.feedback_type === 'ACKNOWLEDGE' ? (
                <div className="flex gap-2">
                    <Button size="sm" onClick={() => { setResponse('yes'); handleSubmit(); }}
                        disabled={submitting}>
                        <Check className="h-3.5 w-3.5 mr-1" /> Acknowledge
                    </Button>
                    <Button size="sm" variant="secondary"
                        onClick={() => { setResponse('no'); handleSubmit(); }}
                        disabled={submitting}>
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
                    <Button size="sm" onClick={handleSubmit}
                        disabled={submitting || !response}>
                        Submit Response
                    </Button>
                </div>
            )}
        </div>
    );
}

// ── Announcement card ─────────────────────────────────────────────────────

function AnnouncementCard({ announcement, isAdmin, onMarkRead, onEdit, onDelete, refetch }: {
    announcement: Announcement;
    isAdmin: boolean;
    onMarkRead: (id: number) => void;
    onEdit?: (a: Announcement) => void;
    onDelete?: (id: number) => void;
    refetch: () => void;
}) {
    const [expanded, setExpanded] = useState(!announcement.is_read);

    return (
        <div className={`rounded-xl border transition-all ${announcement.is_read ? 'bg-white border-gray-200' : 'bg-blue-50 border-blue-200'
            }`}>
            {/* Header */}
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
                                    <button onClick={() => onEdit?.(announcement)}
                                        className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600">
                                        <Edit className="h-3.5 w-3.5" />
                                    </button>
                                    <button onClick={() => onDelete?.(announcement.id)}
                                        className="p-1.5 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600">
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                </>
                            )}
                            <button onClick={() => setExpanded(v => !v)}
                                className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100">
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

            {/* Body */}
            {expanded && (
                <div className="px-4 pb-4 pt-0 ml-11">
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{announcement.body}</p>

                    {/* Feedback */}
                    {announcement.requires_feedback && (
                        <FeedbackForm announcement={announcement} onSubmit={refetch} />
                    )}

                    {/* Mark read */}
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

// ── Create/Edit Modal ─────────────────────────────────────────────────────

const EMPTY_FORM: AnnouncementFormData = {
    title: '', body: '', target_role: 'ALL',
    is_system: false, requires_feedback: false,
    feedback_type: 'NONE', feedback_prompt: '', expires_at: '',
};

function AnnouncementModal({ open, onClose, editing, onCreate, onUpdate }: {
    open: boolean;
    onClose: () => void;
    editing: Announcement | null;
    onCreate: (data: AnnouncementFormData) => Promise<void>;
    onUpdate: (id: number, data: Partial<AnnouncementFormData>) => Promise<void>;
}) {
    const { user } = useAuth();
    const [form, setForm] = useState<AnnouncementFormData>(
        editing ? {
            title: editing.title, body: editing.body,
            target_role: editing.target_role, is_system: editing.is_system,
            requires_feedback: editing.requires_feedback,
            feedback_type: editing.feedback_type,
            feedback_prompt: editing.feedback_prompt,
            expires_at: editing.expires_at ?? '',
        } : EMPTY_FORM
    );
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const isSuperAdmin = user?.role === 'SUPERADMIN';

    const handleSubmit = async () => {
        if (!form.title || !form.body) {
            setError('Title and body are required.'); return;
        }
        setSaving(true); setError(null);
        try {
            const payload = {
                ...form,
                feedback_type: form.requires_feedback ? form.feedback_type : 'NONE',
                expires_at: form.expires_at || null,
            };
            if (editing) {
                await onUpdate(editing.id, payload);
            } else {
                await onCreate(payload as AnnouncementFormData);
            }
            onClose();
        } catch { setError('Failed to save announcement.'); }
        finally { setSaving(false); }
    };

    const set = (key: keyof AnnouncementFormData, value: any) =>
        setForm(prev => ({ ...prev, [key]: value }));

    return (
        <Modal isOpen={open} onClose={onClose}
            title={editing ? 'Edit Announcement' : 'New Announcement'} size="lg">
            <div className="space-y-4">
                {error && (
                    <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                        <AlertCircle className="h-4 w-4 shrink-0" />{error}
                    </div>
                )}

                <Input label="Title" value={form.title}
                    onChange={e => set('title', e.target.value)}
                    placeholder="Announcement title" required />

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Body</label>
                    <textarea value={form.body} onChange={e => set('body', e.target.value)}
                        rows={4} required
                        className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Write your announcement..." />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <Select label="Audience" value={form.target_role}
                        onChange={e => set('target_role', e.target.value)}
                        options={[
                            { value: 'ALL', label: 'All Users' },
                            { value: 'ADMIN', label: 'Admins Only' },
                            { value: 'INSTRUCTOR', label: 'Instructors Only' },
                        ]} />
                    <Input label="Expires At (optional)" type="datetime-local"
                        value={form.expires_at}
                        onChange={e => set('expires_at', e.target.value)} />
                </div>

                {isSuperAdmin && (
                    <label className="flex items-center gap-3 cursor-pointer">
                        <input type="checkbox" checked={form.is_system}
                            onChange={e => set('is_system', e.target.checked)}
                            className="h-4 w-4 rounded border-gray-300 text-purple-600" />
                        <div>
                            <p className="text-sm font-medium text-gray-900">System Announcement</p>
                            <p className="text-xs text-gray-500">Visible to all organizations regardless of plugin state</p>
                        </div>
                    </label>
                )}

                <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" checked={form.requires_feedback}
                        onChange={e => set('requires_feedback', e.target.checked)}
                        className="h-4 w-4 rounded border-gray-300 text-blue-600" />
                    <p className="text-sm font-medium text-gray-900">Requires Feedback</p>
                </label>

                {form.requires_feedback && (
                    <div className="pl-7 space-y-3">
                        <Select label="Feedback Type" value={form.feedback_type}
                            onChange={e => set('feedback_type', e.target.value as FeedbackType)}
                            options={[
                                { value: 'ACKNOWLEDGE', label: 'Acknowledgement (Yes/No)' },
                                { value: 'TEXT', label: 'Free Text Response' },
                            ]} />
                        <Input label="Feedback Prompt"
                            value={form.feedback_prompt}
                            onChange={e => set('feedback_prompt', e.target.value)}
                            placeholder="e.g. Do you acknowledge this policy?" />
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

// ── Page ──────────────────────────────────────────────────────────────────

export default function AnnouncementsPage() {
    const { user } = useAuth();
    const { announcements, loading, refetch, create, update, remove, markRead } = useAnnouncements();
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState<Announcement | null>(null);
    const [filter, setFilter] = useState<'all' | 'unread' | 'needs_feedback'>('all');

    const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPERADMIN';

    const filtered = announcements.filter(a => {
        if (filter === 'unread') return !a.is_read;
        if (filter === 'needs_feedback') return a.requires_feedback && !a.has_feedback;
        return true;
    });

    const unreadCount = announcements.filter(a => !a.is_read).length;
    const needsFeedbackCount = announcements.filter(a => a.requires_feedback && !a.has_feedback).length;

    const handleDelete = async (id: number) => {
        if (confirm('Delete this announcement?')) {
            try { await remove(id); } catch { alert('Failed to delete'); }
        }
    };

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Announcements</h1>
                    <p className="text-sm text-gray-500 mt-1">Stay informed with the latest updates</p>
                </div>
                {isAdmin && (
                    <Button onClick={() => { setEditing(null); setShowModal(true); }}>
                        <Plus className="h-4 w-4 mr-2" />New Announcement
                    </Button>
                )}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
                <StatsCard title="Total" value={announcements.length} icon={Megaphone} color="blue" />
                <StatsCard title="Unread" value={unreadCount} icon={AlertCircle} color="yellow" />
                <StatsCard title="Needs Response" value={needsFeedbackCount} icon={MessageSquare} color="red" />
            </div>

            {/* Filter tabs */}
            <div className="flex gap-1 bg-gray-100 rounded-xl p-1.5">
                {([
                    { key: 'all', label: 'All' },
                    { key: 'unread', label: `Unread (${unreadCount})` },
                    { key: 'needs_feedback', label: `Needs Response (${needsFeedbackCount})` },
                ] as const).map(tab => (
                    <button key={tab.key} onClick={() => setFilter(tab.key)}
                        className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${filter === tab.key
                            ? 'bg-white text-gray-900 shadow-sm'
                            : 'text-gray-500 hover:text-gray-700'
                            }`}>
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* List */}
            {loading ? (
                <div className="space-y-3">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />
                    ))}
                </div>
            ) : filtered.length === 0 ? (
                <Card>
                    <div className="py-12 text-center">
                        <Megaphone className="h-10 w-10 text-gray-200 mx-auto mb-3" />
                        <p className="text-sm text-gray-500">No announcements here</p>
                    </div>
                </Card>
            ) : (
                <div className="space-y-3">
                    {filtered.map(a => (
                        <AnnouncementCard
                            key={a.id}
                            announcement={a}
                            isAdmin={isAdmin}
                            onMarkRead={markRead}
                            onEdit={a => { setEditing(a); setShowModal(true); }}
                            onDelete={handleDelete}
                            refetch={refetch}
                        />
                    ))}
                </div>
            )}

            {/* Modal */}
            {showModal && (
                <AnnouncementModal
                    open={showModal}
                    onClose={() => { setShowModal(false); setEditing(null); }}
                    editing={editing}
                    onCreate={create}
                    onUpdate={update}
                />
            )}
        </div>
    );
}