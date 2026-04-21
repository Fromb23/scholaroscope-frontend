'use client';

// ============================================================================
// app/core/components/settings/SettingsComponents.tsx
//
// All sub-components for the admin settings page.
// No any. Typed props. Reuses ErrorBanner and InlineAlert.
// ============================================================================

import { useState, useEffect, useMemo } from 'react';
import {
    Puzzle, Check, X, Power, PowerOff, ChevronRight, BookOpen,
    Clock, UserCheck, Ban, Plus, Trash2, Mail,
    Copy, CheckCheck, ChevronDown, Link,
} from 'lucide-react';
import { Badge } from '@/app/components/ui/Badge';
import { Button } from '@/app/components/ui/Button';
import { Input } from '@/app/components/ui/Input';
import { LoadingSpinner } from '@/app/components/ui/LoadingSpinner';
import { ErrorBanner } from '@/app/components/ui/ErrorBanner';
import Modal from '@/app/components/ui/Modal';
import { pluginAPI } from '@/app/core/api/plugins';
import { usePlugins } from '@/app/core/hooks/usePlugins';
import { useInvites, Invite, CreateInvitePayload } from '@/app/core/hooks/useInvites';
import {
    CurriculumCatalogDetail, InstalledPlugin,
    SubjectSelection, CurriculumTopicEntry, CurriculumSubtopicEntry,
} from '@/app/core/types/plugins';
import { getPluginModalSlot } from '@/app/core/registry/pluginModalSlots';

// ── Helpers ───────────────────────────────────────────────────────────────

function formatExpiry(iso: string): string {
    const diffDays = Math.ceil((new Date(iso).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    if (diffDays <= 0) return 'Expired';
    if (diffDays === 1) return 'Expires tomorrow';
    return `Expires in ${diffDays} days`;
}

function formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('en-GB', {
        day: '2-digit', month: 'short', year: 'numeric',
    });
}

const STATUS_STYLES: Record<string, string> = {
    PENDING: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    ACCEPTED: 'bg-green-50 text-green-700 border-green-200',
    REVOKED: 'bg-red-50 text-red-700 border-red-200',
    EXPIRED: 'bg-gray-50 text-gray-500 border-gray-200',
};

const STATUS_ICONS: Record<string, React.ElementType> = {
    PENDING: Clock,
    ACCEPTED: UserCheck,
    REVOKED: Ban,
    EXPIRED: Clock,
};

const ROLE_LABEL: Record<string, string> = {
    ADMIN: 'Administrator',
    INSTRUCTOR: 'Instructor',
};

// ── FeedbackBanner ────────────────────────────────────────────────────────

interface FeedbackBannerProps {
    feedback: { type: 'success' | 'error'; message: string } | null;
}

function FeedbackBanner({ feedback }: FeedbackBannerProps) {
    if (!feedback) return null;
    return (
        <div className={`flex items-center gap-2 p-3 rounded-xl text-sm ${feedback.type === 'success'
            ? 'bg-green-50 border border-green-200 text-green-700'
            : 'bg-red-50 border border-red-200 text-red-700'
            }`}>
            {feedback.type === 'success'
                ? <Check className="h-4 w-4 shrink-0" />
                : <X className="h-4 w-4 shrink-0" />
            }
            {feedback.message}
        </div>
    );
}

// ── CreateInviteModal ─────────────────────────────────────────────────────

interface CreateInviteModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCreate: (payload: CreateInvitePayload) => Promise<Invite>;
}

export function CreateInviteModal({ isOpen, onClose, onCreate }: CreateInviteModalProps) {
    const [form, setForm] = useState<CreateInvitePayload>({
        email: '', role: 'INSTRUCTOR', expires_days: 7,
    });
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [createdInvite, setCreatedInvite] = useState<Invite | null>(null);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        if (!isOpen) {
            setForm({ email: '', role: 'INSTRUCTOR', expires_days: 7 });
            setCreatedInvite(null);
            setCopied(false);
            setError(null);
        }
    }, [isOpen]);

    const handleCreate = async () => {
        setSubmitting(true); setError(null);
        try {
            const invite = await onCreate(form);
            setCreatedInvite(invite);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to create invite');
        } finally { setSubmitting(false); }
    };

    const handleCopy = async () => {
        if (!createdInvite?.link) return;
        await navigator.clipboard.writeText(createdInvite.link);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Create Invite Link" size="md">
            {createdInvite ? (
                <div className="space-y-4">
                    <div className="flex items-center justify-center">
                        <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                            <Check className="h-6 w-6 text-green-600" />
                        </div>
                    </div>
                    <div className="text-center">
                        <p className="font-semibold text-gray-900">Invite link created</p>
                        <p className="text-sm text-gray-500 mt-1">
                            Share this link. They&apos;ll be added as{' '}
                            <span className="font-medium">{ROLE_LABEL[createdInvite.role]}</span>.
                        </p>
                    </div>
                    <div className="flex items-center gap-2 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                        <Link className="h-4 w-4 text-gray-400 shrink-0" />
                        <p className="text-xs text-gray-600 flex-1 truncate font-mono">{createdInvite.link}</p>
                        <button
                            onClick={handleCopy}
                            className={`shrink-0 flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-md transition-colors ${copied
                                ? 'bg-green-100 text-green-700'
                                : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
                                }`}
                        >
                            {copied ? <CheckCheck className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                            {copied ? 'Copied!' : 'Copy'}
                        </button>
                    </div>
                    <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-100 rounded-lg">
                        <Clock className="h-4 w-4 text-yellow-600 shrink-0" />
                        <p className="text-xs text-yellow-700">{formatExpiry(createdInvite.expires_at)}</p>
                    </div>
                    <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
                        <Button variant="secondary" onClick={onClose}>Done</Button>
                    </div>
                </div>
            ) : (
                <div className="space-y-4">
                    {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}

                    <Input
                        label="Email Address (optional)"
                        type="email"
                        value={form.email ?? ''}
                        onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                        placeholder="invitee@example.com"
                    />
                    <p className="text-xs text-gray-400 -mt-2">
                        If provided, the form will be pre-filled. Leave blank for a generic link.
                    </p>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                        <div className="relative">
                            <select
                                value={form.role}
                                onChange={e => setForm(f => ({ ...f, role: e.target.value as 'ADMIN' | 'INSTRUCTOR' }))}
                                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm appearance-none focus:outline-none focus:ring-2 focus:border-blue-500 focus:ring-blue-200 bg-white"
                            >
                                <option value="INSTRUCTOR">Instructor</option>
                                <option value="ADMIN">Administrator</option>
                            </select>
                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Expires in</label>
                        <div className="relative">
                            <select
                                value={form.expires_days}
                                onChange={e => setForm(f => ({ ...f, expires_days: Number(e.target.value) }))}
                                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm appearance-none focus:outline-none focus:ring-2 focus:border-blue-500 focus:ring-blue-200 bg-white"
                            >
                                {[1, 3, 7, 14, 30].map(d => (
                                    <option key={d} value={d}>{d} day{d !== 1 ? 's' : ''}</option>
                                ))}
                            </select>
                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                        <Button variant="secondary" onClick={onClose} disabled={submitting}>Cancel</Button>
                        <Button variant="primary" onClick={handleCreate} disabled={submitting}>
                            {submitting ? 'Creating...' : 'Generate Invite Link'}
                        </Button>
                    </div>
                </div>
            )}
        </Modal>
    );
}

// ── InviteRow ─────────────────────────────────────────────────────────────

interface InviteRowProps {
    invite: Invite;
    onRevoke: (token: string) => void;
    revoking: boolean;
}

export function InviteRow({ invite, onRevoke, revoking }: InviteRowProps) {
    const [copied, setCopied] = useState(false);
    const StatusIcon = STATUS_ICONS[invite.status] ?? Clock;

    const handleCopy = async () => {
        if (!invite.link) return;
        await navigator.clipboard.writeText(invite.link);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="flex items-start justify-between gap-4 py-4 border-b border-gray-100 last:border-0">
            <div className="flex items-start gap-3 min-w-0">
                <div className={`mt-0.5 h-8 w-8 rounded-lg flex items-center justify-center shrink-0 border ${STATUS_STYLES[invite.status]}`}>
                    <StatusIcon className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-gray-900">
                            {invite.email || <span className="text-gray-400 italic">No email specified</span>}
                        </span>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${STATUS_STYLES[invite.status]}`}>
                            {invite.status}
                        </span>
                        <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                            {ROLE_LABEL[invite.role] ?? invite.role}
                        </span>
                    </div>
                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                        <span className="text-xs text-gray-400">
                            Created {formatDate(invite.created_at)}
                            {invite.created_by && ` by ${invite.created_by}`}
                        </span>
                        {invite.status === 'ACCEPTED' && invite.accepted_by && (
                            <span className="text-xs text-green-600">Accepted by {invite.accepted_by}</span>
                        )}
                        {invite.is_valid && (
                            <span className="text-xs text-yellow-600">{formatExpiry(invite.expires_at)}</span>
                        )}
                    </div>
                </div>
            </div>
            {invite.status === 'PENDING' && invite.is_valid && (
                <div className="flex items-center gap-2 shrink-0">
                    <button
                        onClick={handleCopy}
                        className={`p-2 rounded-lg text-sm transition-colors flex items-center gap-1.5 ${copied ? 'bg-green-50 text-green-700' : 'bg-gray-50 text-gray-600 hover:bg-blue-50 hover:text-blue-600'
                            }`}
                    >
                        {copied ? <CheckCheck className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </button>
                    <button
                        onClick={() => onRevoke(invite.token)}
                        disabled={revoking}
                        className="p-2 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors disabled:opacity-50"
                    >
                        <Trash2 className="h-4 w-4" />
                    </button>
                </div>
            )}
        </div>
    );
}

// ── MembersTab ────────────────────────────────────────────────────────────

export function MembersTab() {
    const { invites, loading, error, fetchInvites, createInvite, revokeInvite } = useInvites();
    const [createOpen, setCreateOpen] = useState(false);
    const [revoking, setRevoking] = useState<string | null>(null);
    const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

    useEffect(() => { fetchInvites(); }, [fetchInvites]);

    const flash = (type: 'success' | 'error', message: string) => {
        setFeedback({ type, message });
        setTimeout(() => setFeedback(null), 3000);
    };

    const handleRevoke = async (token: string) => {
        setRevoking(token);
        try {
            await revokeInvite(token);
            flash('success', 'Invite revoked.');
        } catch {
            flash('error', 'Failed to revoke invite.');
        } finally { setRevoking(null); }
    };

    const pending = invites.filter(i => i.status === 'PENDING' && i.is_valid);
    const history = invites.filter(i => i.status !== 'PENDING' || !i.is_valid);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm font-semibold text-gray-900">Invite Members</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                        Generate invite links to share manually via email, WhatsApp, or Slack.
                    </p>
                </div>
                <Button variant="primary" size="sm" onClick={() => setCreateOpen(true)} className="gap-2">
                    <Plus className="h-4 w-4" />New Invite
                </Button>
            </div>

            <FeedbackBanner feedback={feedback} />

            {loading && <LoadingSpinner fullScreen={false} message="Loading invites..." />}

            {error && <ErrorBanner message={error} onDismiss={() => { }} />}

            {!loading && !error && (
                <>
                    <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-2">
                            <Clock className="h-3.5 w-3.5" />Pending ({pending.length})
                        </p>
                        {pending.length === 0 ? (
                            <div className="py-8 text-center border border-dashed border-gray-200 rounded-xl">
                                <Mail className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                                <p className="text-sm text-gray-500">No pending invites.</p>
                                <p className="text-xs text-gray-400 mt-1">Create an invite link to bring someone in.</p>
                            </div>
                        ) : pending.map(inv => (
                            <InviteRow
                                key={inv.token}
                                invite={inv}
                                onRevoke={handleRevoke}
                                revoking={revoking === inv.token}
                            />
                        ))}
                    </div>

                    {history.length > 0 && (
                        <div>
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">History</p>
                            {history.map(inv => (
                                <InviteRow
                                    key={inv.token}
                                    invite={inv}
                                    onRevoke={handleRevoke}
                                    revoking={revoking === inv.token}
                                />
                            ))}
                        </div>
                    )}
                </>
            )}

            <CreateInviteModal
                isOpen={createOpen}
                onClose={() => setCreateOpen(false)}
                onCreate={createInvite}
            />
        </div>
    );
}

// ── InstalledPluginCard ───────────────────────────────────────────────────

interface InstalledPluginCardProps {
    plugin: InstalledPlugin;
    onToggle: (id: number) => void;
    toggling: boolean;
}

export function InstalledPluginCard({ plugin, onToggle, toggling }: InstalledPluginCardProps) {
    const [curriculumOpen, setCurriculumOpen] = useState(false);
    const [modalKey, setModalKey] = useState(0);

    const PluginModal = getPluginModalSlot(plugin.key);

    const openCurriculum = () => {
        setModalKey(k => k + 1);
        setCurriculumOpen(true);
    };

    return (
        <>
            <div className={`flex items-start justify-between p-4 rounded-xl border transition-colors ${plugin.is_active ? 'bg-white border-gray-200' : 'bg-gray-50 border-gray-100'
                }`}>
                <div className="flex items-start gap-4">
                    <div className={`p-2.5 rounded-xl shrink-0 ${plugin.is_active ? 'bg-blue-100' : 'bg-gray-100'}`}>
                        <Puzzle className={`h-5 w-5 ${plugin.is_active ? 'text-blue-600' : 'text-gray-400'}`} />
                    </div>
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-sm font-semibold text-gray-900">{plugin.name}</h3>
                            <Badge variant="default" size="sm" className="font-mono">{plugin.version}</Badge>
                            {plugin.is_core && <Badge variant="info" size="sm">Core</Badge>}
                            {plugin.is_active
                                ? <Badge variant="green" size="sm">Active</Badge>
                                : <Badge variant="default" size="sm">Inactive</Badge>
                            }
                        </div>
                        <p className="text-xs text-gray-500 max-w-md">{plugin.description}</p>
                        <p className="text-xs text-gray-400 mt-1 font-mono">key: {plugin.key}</p>

                        {PluginModal && plugin.is_active && (
                            <button
                                onClick={openCurriculum}
                                className="mt-2 flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 font-medium"
                            >
                                <BookOpen className="h-3.5 w-3.5" />
                                Manage Curriculum
                                <ChevronRight className="h-3 w-3" />
                            </button>
                        )}
                    </div>
                </div>
                {!plugin.is_core && (
                    <button
                        onClick={() => onToggle(plugin.id)}
                        disabled={toggling}
                        className={`p-2 rounded-lg transition-colors shrink-0 ml-4 ${plugin.is_active
                            ? 'text-gray-400 hover:bg-red-50 hover:text-red-600'
                            : 'text-gray-400 hover:bg-green-50 hover:text-green-600'
                            }`}
                    >
                        {plugin.is_active ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
                    </button>
                )}
            </div>

            {PluginModal && (
                <PluginModal
                    key={modalKey}
                    isOpen={curriculumOpen}
                    onClose={() => setCurriculumOpen(false)}
                />
            )}
        </>
    );
}

// ── PluginsTab ────────────────────────────────────────────────────────────

export function PluginsTab() {
    const { plugins, loading, error, refetch } = usePlugins();
    const [toggling, setToggling] = useState(false);
    const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

    const flash = (type: 'success' | 'error', message: string) => {
        setFeedback({ type, message });
        setTimeout(() => setFeedback(null), 3000);
    };

    const handleToggle = async (id: number) => {
        setToggling(true);
        try {
            await pluginAPI.toggle(id);
            await refetch();
            flash('success', 'Plugin updated.');
        } catch {
            flash('error', 'Failed to update plugin.');
        } finally { setToggling(false); }
    };

    const corePlugins = plugins.filter(p => p.is_core);
    const optionalPlugins = plugins.filter(p => !p.is_core);

    if (loading) return <LoadingSpinner fullScreen={false} message="Loading plugins..." />;
    if (error) return <ErrorBanner message={error} onDismiss={() => { }} />;

    return (
        <div className="space-y-6">
            <FeedbackBanner feedback={feedback} />

            <div>
                <div className="mb-3">
                    <h3 className="text-sm font-semibold text-gray-900">Core Plugins</h3>
                    <p className="text-xs text-gray-500 mt-0.5">Auto-installed. Cannot be deactivated.</p>
                </div>
                <div className="space-y-2">
                    {corePlugins.length === 0
                        ? <p className="text-sm text-gray-400 py-4 text-center">No core plugins</p>
                        : corePlugins.map(p => (
                            <InstalledPluginCard key={p.id} plugin={p} onToggle={handleToggle} toggling={toggling} />
                        ))
                    }
                </div>
            </div>

            <div>
                <div className="mb-3">
                    <h3 className="text-sm font-semibold text-gray-900">Optional Plugins</h3>
                    <p className="text-xs text-gray-500 mt-0.5">Activate or deactivate as needed.</p>
                </div>
                <div className="space-y-2">
                    {optionalPlugins.length === 0 ? (
                        <div className="py-8 text-center border border-dashed border-gray-200 rounded-xl">
                            <Puzzle className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                            <p className="text-sm text-gray-500">No optional plugins installed.</p>
                        </div>
                    ) : optionalPlugins.map(p => (
                        <InstalledPluginCard key={p.id} plugin={p} onToggle={handleToggle} toggling={toggling} />
                    ))}
                </div>
            </div>
        </div>
    );
}

// ── CurriculumSelectionModal ──────────────────────────────────────────────

interface CurriculumSelectionModalProps {
    isOpen: boolean;
    onClose: () => void;
    installedPluginId: number;
    pluginName: string;
}

export function CurriculumSelectionModal({
    isOpen,
    onClose,
    installedPluginId,
    pluginName,
}: CurriculumSelectionModalProps) {
    const [catalog, setCatalog] = useState<CurriculumCatalogDetail | null>(null);
    const [loading, setLoading] = useState(false);
    const [seeding, setSeeding] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<{ added: number; removed: number } | null>(null);

    // levelCode → Set<topicCode>
    const [checkedTopics, setCheckedTopics] = useState<Record<string, Set<string>>>({});
    // "levelCode-topicCode" → Set<subtopicCode>
    const [checkedSubtopics, setCheckedSubtopics] = useState<Record<string, Set<string>>>({});
    // snapshots for diffing
    const [snapTopics, setSnapTopics] = useState<Record<string, Set<string>>>({});
    const [snapSubtopics, setSnapSubtopics] = useState<Record<string, Set<string>>>({});

    const [expandedSubjects, setExpandedSubjects] = useState<Set<string>>(new Set());
    const [expandedLevels, setExpandedLevels] = useState<Set<string>>(new Set());
    const [expandedTopics, setExpandedTopics] = useState<Set<string>>(new Set());

    const clone = (obj: Record<string, Set<string>>) =>
        Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, new Set(v)]));

    const applyData = (data: CurriculumCatalogDetail) => {
        setCatalog(data);
        const t: Record<string, Set<string>> = {};
        const s: Record<string, Set<string>> = {};
        data.subjects.forEach(group => {
            group.levels.forEach(level => {
                // key: levelCode → registered topic codes
                t[level.code] = new Set(
                    level.topics.filter(x => x.registered).map(x => x.code)
                );
                level.topics.forEach(topic => {
                    // key: "levelCode-topicCode" → registered subtopic codes
                    const sk = `${level.code}-${topic.code}`;
                    s[sk] = new Set(
                        topic.subtopics.filter(x => x.registered).map(x => x.code)
                    );
                });
            });
        });
        setCheckedTopics(t);
        setCheckedSubtopics(s);
        setSnapTopics(clone(t));
        setSnapSubtopics(clone(s));
    };

    useEffect(() => {
        if (!isOpen) {
            setCatalog(null);
            setCheckedTopics({});
            setCheckedSubtopics({});
            setSnapTopics({});
            setSnapSubtopics({});
            setExpandedSubjects(new Set());
            setExpandedLevels(new Set());
            setExpandedTopics(new Set());
            setError(null);
            setResult(null);
            return;
        }
        setLoading(true);
        pluginAPI.catalogDetail(installedPluginId)
            .then(applyData)
            .catch(() => setError('Could not load curriculum.'))
            .finally(() => setLoading(false));
    }, [isOpen, installedPluginId]);

    const toggleLevel = (lk: string, topics: CurriculumTopicEntry[]) => {
        const cur = checkedTopics[lk] ?? new Set();
        const selectAll = cur.size < topics.length;
        setCheckedTopics(prev => ({
            ...prev,
            [lk]: selectAll ? new Set(topics.map(t => t.code)) : new Set(),
        }));
        const newSubs = { ...checkedSubtopics };
        topics.forEach(t => {
            const sk = `${lk}-${t.code}`;
            newSubs[sk] = selectAll
                ? new Set(t.subtopics.map(s => s.code))
                : new Set();
        });
        setCheckedSubtopics(newSubs);
    };

    const toggleTopic = (lk: string, tc: string, subtopics: CurriculumSubtopicEntry[]) => {
        const sk = `${lk}-${tc}`;
        const current = new Set(checkedTopics[lk] ?? []);
        if (current.has(tc)) {
            current.delete(tc);
            // keep subtopic state — don't clear, diff handles removal
        } else {
            current.add(tc);
            setCheckedSubtopics(prev => ({
                ...prev,
                [sk]: new Set(subtopics.map(s => s.code)),
            }));
        }
        setCheckedTopics(prev => ({ ...prev, [lk]: current }));
    };

    const toggleSubtopic = (lk: string, tc: string, sc: string) => {
        const sk = `${lk}-${tc}`;
        const current = new Set(checkedSubtopics[sk] ?? []);
        current.has(sc) ? current.delete(sc) : current.add(sc);
        setCheckedSubtopics(prev => ({ ...prev, [sk]: current }));
    };

    const diff = useMemo(() => {
        if (!catalog) return {
            toAdd: [] as SubjectSelection[],
            toRemove: {} as Record<string, { topicCodes: string[]; subtopicCodes: string[] }>,
            addCount: 0,
            removeCount: 0,
        };

        const toAdd: SubjectSelection[] = [];
        const toRemove: Record<string, { topicCodes: string[]; subtopicCodes: string[] }> = {};
        let addCount = 0;
        let removeCount = 0;

        catalog.subjects.forEach(group => {
            group.levels.forEach(level => {
                const lk = level.code;
                const curT = checkedTopics[lk] ?? new Set();
                const snapT = snapTopics[lk] ?? new Set();
                const addTopics: string[] = [];
                const removeTopics: string[] = [];
                const addSubs: Record<string, string[]> = {};
                const removeSubs: Record<string, string[]> = {};

                level.topics.forEach(topic => {
                    const tc = topic.code;
                    const sk = `${lk}-${tc}`;
                    const nowT = curT.has(tc);
                    const wasT = snapT.has(tc);
                    const curS = checkedSubtopics[sk] ?? new Set();
                    const snapS = snapSubtopics[sk] ?? new Set();

                    if (nowT && !wasT) {
                        // new topic — add with selected subtopics
                        addTopics.push(tc);
                        addSubs[tc] = topic.subtopics
                            .filter(s => curS.has(s.code))
                            .map(s => s.code);
                        addCount += 1;
                    } else if (!nowT && wasT) {
                        // removed topic
                        removeTopics.push(tc);
                        removeCount += 1;
                    } else if (nowT && wasT) {
                        // unchanged topic — diff subtopics
                        topic.subtopics.forEach(sub => {
                            const sc = sub.code;
                            const nowS = curS.has(sc);
                            const wasS = snapS.has(sc);
                            if (nowS && !wasS) {
                                if (!addSubs[tc]) addSubs[tc] = [];
                                addSubs[tc].push(sc);
                                addCount += 1;
                            } else if (!nowS && wasS) {
                                if (!removeSubs[tc]) removeSubs[tc] = [];
                                removeSubs[tc].push(sc);
                                removeCount += 1;
                            }
                        });
                    }
                });

                // additions — new topics + new subtopics in existing topics
                const subAddKeys = Object.keys(addSubs).filter(k => !addTopics.includes(k));
                const allAddTopics = [...addTopics, ...subAddKeys];
                if (allAddTopics.length > 0) {
                    toAdd.push({ code: lk, topics: allAddTopics, subtopics: addSubs });
                }

                // removals
                const flatRemoveSubs = Object.values(removeSubs).flat();
                if (removeTopics.length > 0 || flatRemoveSubs.length > 0) {
                    toRemove[lk] = {
                        topicCodes: removeTopics,
                        subtopicCodes: flatRemoveSubs,
                    };
                }
            });
        });

        return { toAdd, toRemove, addCount, removeCount };
    }, [catalog, checkedTopics, checkedSubtopics, snapTopics, snapSubtopics]);

    const hasChanges = diff.addCount > 0 || diff.removeCount > 0;

    const handleSave = async () => {
        if (!hasChanges) return;
        setSeeding(true);
        setError(null);
        try {
            let removedTopics = 0;
            let removedSubtopics = 0;
            let addedCount = 0;

            for (const [subjectCode, removal] of Object.entries(diff.toRemove)) {
                const res = await pluginAPI.unregisterByCode({
                    subject_code: subjectCode,
                    topic_codes: removal.topicCodes,
                    subtopic_codes: removal.subtopicCodes,
                });
                removedTopics += res.removed_topics.length;
                removedSubtopics += res.removed_subtopics.length;
            }

            if (diff.toAdd.length > 0) {
                const res = await pluginAPI.seedCurriculum({
                    installed_plugin_id: installedPluginId,
                    selections: diff.toAdd,
                });
                addedCount = res.seeded.reduce((acc, s) => acc + s.topics + s.subtopics, 0);
            }

            setResult({ added: addedCount, removed: removedTopics + removedSubtopics });
        } catch {
            setError('Operation failed. Please try again.');
        } finally {
            setSeeding(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`${pluginName} — Manage Curriculum`} size="lg">
            <div className="space-y-4">

                {/* Result */}
                {result && (
                    <div className="space-y-3">
                        <div className="flex items-center gap-3 p-3 rounded-xl bg-green-50 border border-green-200">
                            <Check className="h-4 w-4 text-green-600 shrink-0" />
                            <div className="text-sm text-green-700 space-y-0.5">
                                {result.added > 0 && (
                                    <p>✅ {result.added} new item{result.added !== 1 ? 's' : ''} added to your curriculum.</p>
                                )}
                                {result.removed > 0 && (
                                    <p>🗑 {result.removed} item{result.removed !== 1 ? 's' : ''} removed from your curriculum.</p>
                                )}
                                {result.added === 0 && result.removed === 0 && (
                                    <p>No changes were made.</p>
                                )}
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
                            <Button variant="secondary" onClick={() => {
                                setResult(null);
                                setLoading(true);
                                pluginAPI.catalogDetail(installedPluginId)
                                    .then(applyData)
                                    .catch(() => setError('Could not reload.'))
                                    .finally(() => setLoading(false));
                            }}>
                                Continue Editing
                            </Button>
                            <Button variant="primary" onClick={onClose}>Done</Button>
                        </div>
                    </div>
                )}

                {/* Loading */}
                {!result && loading && (
                    <LoadingSpinner fullScreen={false} message="Loading curriculum..." />
                )}

                {/* Error */}
                {!result && !loading && error && (
                    <ErrorBanner message={error} onDismiss={() => setError(null)} />
                )}

                {/* Tree */}
                {!result && !loading && catalog && (
                    <>
                        <div className="flex items-center gap-4 text-xs">
                            <span className="flex items-center gap-1 text-gray-500">
                                <span className="h-3 w-3 rounded border-2 border-blue-600 bg-blue-600 inline-block" />
                                Registered
                            </span>
                            <span className="flex items-center gap-1 text-gray-500">
                                <span className="h-3 w-3 rounded border-2 border-gray-300 inline-block" />
                                Not registered
                            </span>
                            {hasChanges && (
                                <span className="ml-auto text-amber-600 font-medium text-xs">
                                    {diff.addCount > 0 && `+${diff.addCount} to add`}
                                    {diff.addCount > 0 && diff.removeCount > 0 && ' · '}
                                    {diff.removeCount > 0 && `−${diff.removeCount} to remove`}
                                </span>
                            )}
                        </div>

                        <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                            {catalog.subjects.map(group => {
                                const gExp = expandedSubjects.has(group.name);
                                return (
                                    <div key={group.name} className="border border-gray-200 rounded-xl overflow-hidden">

                                        {/* Subject group header */}
                                        <button
                                            onClick={() => setExpandedSubjects(prev => {
                                                const n = new Set(prev);
                                                n.has(group.name) ? n.delete(group.name) : n.add(group.name);
                                                return n;
                                            })}
                                            className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 text-left"
                                        >
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm font-semibold text-gray-900">{group.name}</span>
                                                <span className="text-xs text-gray-400">
                                                    {group.levels.length} level{group.levels.length !== 1 ? 's' : ''}
                                                </span>
                                                {group.all_registered && (
                                                    <span className="text-xs text-green-600 bg-green-50 border border-green-200 px-1.5 py-0.5 rounded-full">
                                                        All registered
                                                    </span>
                                                )}
                                                {group.any_registered && !group.all_registered && (
                                                    <span className="text-xs text-blue-600 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded-full">
                                                        Partial
                                                    </span>
                                                )}
                                            </div>
                                            <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${gExp ? 'rotate-180' : ''}`} />
                                        </button>

                                        {/* Levels */}
                                        {gExp && (
                                            <div className="divide-y divide-gray-100">
                                                {group.levels.map(level => {
                                                    const lk = level.code;
                                                    const lExp = expandedLevels.has(lk);
                                                    const selT = checkedTopics[lk]?.size ?? 0;
                                                    const totalT = level.topics.length;
                                                    const lChk = selT === totalT && totalT > 0;
                                                    const lPart = selT > 0 && selT < totalT;

                                                    return (
                                                        <div key={lk}>
                                                            <div className="flex items-center gap-3 px-4 py-3 bg-white hover:bg-gray-50">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={lChk}
                                                                    ref={el => { if (el) el.indeterminate = lPart; }}
                                                                    onChange={() => toggleLevel(lk, level.topics)}
                                                                    className="h-4 w-4 rounded border-gray-300 text-blue-600"
                                                                />
                                                                <button
                                                                    onClick={() => setExpandedLevels(prev => {
                                                                        const n = new Set(prev);
                                                                        n.has(lk) ? n.delete(lk) : n.add(lk);
                                                                        return n;
                                                                    })}
                                                                    className="flex-1 flex items-center justify-between text-left"
                                                                >
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="text-sm font-medium text-gray-800">{level.level}</span>
                                                                        <span className="text-xs font-mono text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">{level.code}</span>
                                                                        {level.registered && (
                                                                            <span className="text-xs text-green-600 bg-green-50 border border-green-200 px-1.5 py-0.5 rounded-full">
                                                                                Registered
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="text-xs text-gray-400">{selT}/{totalT} topics</span>
                                                                        <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${lExp ? 'rotate-180' : ''}`} />
                                                                    </div>
                                                                </button>
                                                            </div>

                                                            {/* Topics */}
                                                            {lExp && (
                                                                <div className="border-t border-gray-100 bg-gray-50">
                                                                    {level.topics.map(topic => {
                                                                        const tc = topic.code;
                                                                        const sk = `${lk}-${tc}`;
                                                                        const tKey = `${lk}__${tc}`;
                                                                        const tExp = expandedTopics.has(tKey);
                                                                        const tChk = checkedTopics[lk]?.has(tc) ?? false;
                                                                        const curS = checkedSubtopics[sk] ?? new Set();
                                                                        const selS = curS.size;
                                                                        const totalS = topic.subtopics.length;
                                                                        const sPart = selS > 0 && selS < totalS;
                                                                        const snapT = snapTopics[lk]?.has(tc) ?? false;
                                                                        const isNew = tChk && !snapT;
                                                                        const isRemoved = !tChk && snapT;

                                                                        return (
                                                                            <div key={tc} className={`border-b border-gray-100 last:border-0 ${isRemoved ? 'opacity-50' : ''}`}>
                                                                                <div className="flex items-center gap-3 px-8 py-2.5 hover:bg-gray-100">
                                                                                    <input
                                                                                        type="checkbox"
                                                                                        checked={tChk}
                                                                                        ref={el => { if (el) el.indeterminate = !tChk && sPart; }}
                                                                                        onChange={() => toggleTopic(lk, tc, topic.subtopics)}
                                                                                        className="h-4 w-4 rounded border-gray-300 text-blue-600"
                                                                                    />
                                                                                    <button
                                                                                        onClick={() => setExpandedTopics(prev => {
                                                                                            const n = new Set(prev);
                                                                                            n.has(tKey) ? n.delete(tKey) : n.add(tKey);
                                                                                            return n;
                                                                                        })}
                                                                                        className="flex-1 flex items-center justify-between text-left"
                                                                                    >
                                                                                        <div className="flex items-center gap-2">
                                                                                            <span className="text-sm text-gray-700">{topic.name}</span>
                                                                                            {topic.registered && !isRemoved && (
                                                                                                <span className="text-xs text-green-600 bg-green-50 border border-green-200 px-1.5 py-0.5 rounded-full">Added</span>
                                                                                            )}
                                                                                            {isNew && (
                                                                                                <span className="text-xs text-blue-600 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded-full">New</span>
                                                                                            )}
                                                                                            {isRemoved && (
                                                                                                <span className="text-xs text-red-600 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded-full">Will remove</span>
                                                                                            )}
                                                                                        </div>
                                                                                        <div className="flex items-center gap-2">
                                                                                            <span className="text-xs text-gray-400">{selS}/{totalS}</span>
                                                                                            <ChevronDown className={`h-3.5 w-3.5 text-gray-400 transition-transform ${tExp ? 'rotate-180' : ''}`} />
                                                                                        </div>
                                                                                    </button>
                                                                                </div>

                                                                                {/* Subtopics */}
                                                                                {tExp && (
                                                                                    <div className="bg-white">
                                                                                        {topic.subtopics.map(sub => {
                                                                                            const sc = sub.code;
                                                                                            const sChk = curS.has(sc);
                                                                                            const snapS = snapSubtopics[sk] ?? new Set();
                                                                                            const sSnap = snapS.has(sc);
                                                                                            const sNew = sChk && !sSnap;
                                                                                            const sRemoved = !sChk && sSnap;
                                                                                            return (
                                                                                                <label
                                                                                                    key={sc}
                                                                                                    className={`flex items-center gap-3 px-12 py-2 hover:bg-blue-50 cursor-pointer ${sRemoved ? 'opacity-50' : ''}`}
                                                                                                >
                                                                                                    <input
                                                                                                        type="checkbox"
                                                                                                        checked={sChk}
                                                                                                        onChange={() => toggleSubtopic(lk, tc, sc)}
                                                                                                        className="h-3.5 w-3.5 rounded border-gray-300 text-blue-600"
                                                                                                    />
                                                                                                    <span className="text-xs text-gray-700">{sub.name}</span>
                                                                                                    <span className="ml-auto flex items-center gap-1">
                                                                                                        {sub.registered && !sRemoved && <span className="text-xs text-green-500">✓ Added</span>}
                                                                                                        {sNew && <span className="text-xs text-blue-500">+ New</span>}
                                                                                                        {sRemoved && <span className="text-xs text-red-500">− Remove</span>}
                                                                                                    </span>
                                                                                                </label>
                                                                                            );
                                                                                        })}
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        );
                                                                    })}
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                            <p className="text-xs text-gray-400">
                                {hasChanges
                                    ? `${diff.addCount > 0 ? `+${diff.addCount} to add` : ''}${diff.addCount > 0 && diff.removeCount > 0 ? ' · ' : ''}${diff.removeCount > 0 ? `−${diff.removeCount} to remove` : ''}`
                                    : 'No changes'
                                }
                            </p>
                            <div className="flex gap-3">
                                <Button variant="secondary" onClick={onClose} disabled={seeding}>Cancel</Button>
                                <Button
                                    variant="primary"
                                    onClick={handleSave}
                                    disabled={seeding || !hasChanges}
                                >
                                    {seeding ? 'Saving...' : 'Save Changes'}
                                </Button>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </Modal>
    );
}