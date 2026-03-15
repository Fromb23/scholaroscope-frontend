'use client';

// ============================================================================
// app/(dashboard)/admin/settings/page.tsx
//
// Admin settings — General + Members + Plugins tabs.
// Members tab: invite management — create link, list pending, revoke.
// ============================================================================

import { useState, useEffect } from 'react';
import {
    Settings, Puzzle, Check, X, Power, PowerOff, AlertCircle,
    Users, Link, Copy, CheckCheck, Clock, UserCheck, Ban,
    Plus, Trash2, Mail, ChevronDown,
} from 'lucide-react';
import { usePlugins } from '@/app/core/hooks/usePlugins';
import { pluginAPI, InstalledPlugin } from '@/app/core/api/plugins';
import { useInvites, Invite, CreateInvitePayload } from '@/app/core/hooks/useInvites';
import { Card } from '@/app/components/ui/Card';
import { Button } from '@/app/components/ui/Button';
import { Badge } from '@/app/components/ui/Badge';
import Modal from '@/app/components/ui/Modal';
import { Input } from '@/app/components/ui/Input';

// ── Tab type ──────────────────────────────────────────────────────────────────

type Tab = 'general' | 'members' | 'plugins';

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatExpiry(iso: string): string {
    const d = new Date(iso);
    const now = new Date();
    const diffMs = d.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
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

// ── Create Invite Modal ───────────────────────────────────────────────────────

function CreateInviteModal({
    isOpen, onClose, onCreate,
}: {
    isOpen: boolean;
    onClose: () => void;
    onCreate: (payload: CreateInvitePayload) => Promise<Invite>;
}) {
    const [form, setForm] = useState<CreateInvitePayload>({
        email: '',
        role: 'INSTRUCTOR',
        expires_days: 7,
    });
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [createdInvite, setCreatedInvite] = useState<Invite | null>(null);
    const [copied, setCopied] = useState(false);

    const handleCreate = async () => {
        setSubmitting(true);
        setError(null);
        try {
            const invite = await onCreate(form);
            setCreatedInvite(invite);
        } catch (err: unknown) {
            const e = err as { data?: { detail?: string }; message?: string };
            setError(e.data?.detail ?? e.message ?? 'Failed to create invite');
        } finally {
            setSubmitting(false);
        }
    };

    const handleCopy = async () => {
        if (!createdInvite?.link) return;
        await navigator.clipboard.writeText(createdInvite.link);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
    };

    const handleClose = () => {
        setForm({ email: '', role: 'INSTRUCTOR', expires_days: 7 });
        setCreatedInvite(null);
        setCopied(false);
        setError(null);
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={handleClose} title="Create Invite Link" size="md">
            {createdInvite ? (
                // ── Success: show link to copy ──
                <div className="space-y-4">
                    <div className="flex items-center justify-center">
                        <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                            <Check className="h-6 w-6 text-green-600" />
                        </div>
                    </div>
                    <div className="text-center">
                        <p className="font-semibold text-gray-900">Invite link created</p>
                        <p className="text-sm text-gray-500 mt-1">
                            Share this link with the person you're inviting.
                            They'll be added as <span className="font-medium">{ROLE_LABEL[createdInvite.role]}</span>.
                        </p>
                    </div>

                    {/* Link box */}
                    <div className="flex items-center gap-2 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                        <Link className="h-4 w-4 text-gray-400 shrink-0" />
                        <p className="text-xs text-gray-600 flex-1 truncate font-mono">{createdInvite.link}</p>
                        <button
                            onClick={handleCopy}
                            className={`shrink-0 flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-md transition-colors
                ${copied ? 'bg-green-100 text-green-700' : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'}`}
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
                        <Button variant="secondary" onClick={handleClose}>Done</Button>
                    </div>
                </div>
            ) : (
                // ── Form ──
                <div className="space-y-4">
                    {error && (
                        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                            <AlertCircle className="h-4 w-4 shrink-0" />{error}
                        </div>
                    )}

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

                    {/* Role picker */}
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

                    {/* Expiry */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Expires in
                        </label>
                        <div className="relative">
                            <select
                                value={form.expires_days}
                                onChange={e => setForm(f => ({ ...f, expires_days: Number(e.target.value) }))}
                                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm appearance-none focus:outline-none focus:ring-2 focus:border-blue-500 focus:ring-blue-200 bg-white"
                            >
                                <option value={1}>1 day</option>
                                <option value={3}>3 days</option>
                                <option value={7}>7 days</option>
                                <option value={14}>14 days</option>
                                <option value={30}>30 days</option>
                            </select>
                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                        <Button variant="secondary" onClick={handleClose} disabled={submitting}>Cancel</Button>
                        <Button variant="primary" onClick={handleCreate} disabled={submitting}>
                            {submitting ? 'Creating...' : 'Generate Invite Link'}
                        </Button>
                    </div>
                </div>
            )}
        </Modal>
    );
}

// ── Invite row ────────────────────────────────────────────────────────────────

function InviteRow({
    invite, onRevoke, revoking,
}: {
    invite: Invite;
    onRevoke: (token: string) => void;
    revoking: boolean;
}) {
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
                {/* Status icon */}
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
                            <span className="text-xs text-green-600">
                                Accepted by {invite.accepted_by}
                            </span>
                        )}
                        {invite.is_valid && (
                            <span className="text-xs text-yellow-600">{formatExpiry(invite.expires_at)}</span>
                        )}
                    </div>
                </div>
            </div>

            {/* Actions — only for valid pending invites */}
            {invite.status === 'PENDING' && invite.is_valid && (
                <div className="flex items-center gap-2 shrink-0">
                    <button
                        onClick={handleCopy}
                        title="Copy invite link"
                        className={`p-2 rounded-lg text-sm transition-colors flex items-center gap-1.5
              ${copied ? 'bg-green-50 text-green-700' : 'bg-gray-50 text-gray-600 hover:bg-blue-50 hover:text-blue-600'}`}
                    >
                        {copied ? <CheckCheck className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </button>
                    <button
                        onClick={() => onRevoke(invite.token)}
                        disabled={revoking}
                        title="Revoke invite"
                        className="p-2 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors disabled:opacity-50"
                    >
                        <Trash2 className="h-4 w-4" />
                    </button>
                </div>
            )}
        </div>
    );
}

// ── Members tab ───────────────────────────────────────────────────────────────

function MembersTab() {
    const { invites, loading, error, fetchInvites, createInvite, revokeInvite } = useInvites();
    const [createOpen, setCreateOpen] = useState(false);
    const [revoking, setRevoking] = useState<string | null>(null);
    const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

    useEffect(() => { fetchInvites(); }, [fetchInvites]);

    const handleRevoke = async (token: string) => {
        setRevoking(token);
        setFeedback(null);
        try {
            await revokeInvite(token);
            setFeedback({ type: 'success', message: 'Invite revoked.' });
        } catch {
            setFeedback({ type: 'error', message: 'Failed to revoke invite.' });
        } finally {
            setRevoking(null);
            setTimeout(() => setFeedback(null), 3000);
        }
    };

    const pending = invites.filter(i => i.status === 'PENDING' && i.is_valid);
    const history = invites.filter(i => i.status !== 'PENDING' || !i.is_valid);

    return (
        <div className="space-y-6">
            {/* Header row */}
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm font-semibold text-gray-900">Invite Members</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                        Generate invite links to share manually via email, WhatsApp, or Slack.
                    </p>
                </div>
                <Button
                    variant="primary"
                    size="sm"
                    onClick={() => setCreateOpen(true)}
                    className="gap-2"
                >
                    <Plus className="h-4 w-4" />
                    New Invite
                </Button>
            </div>

            {/* Feedback */}
            {feedback && (
                <div className={`flex items-center gap-2 p-3 rounded-xl text-sm ${feedback.type === 'success'
                    ? 'bg-green-50 border border-green-200 text-green-700'
                    : 'bg-red-50 border border-red-200 text-red-700'
                    }`}>
                    {feedback.type === 'success' ? <Check className="h-4 w-4 shrink-0" /> : <X className="h-4 w-4 shrink-0" />}
                    {feedback.message}
                </div>
            )}

            {loading && (
                <div className="py-10 text-center">
                    <div className="h-6 w-6 animate-spin rounded-full border-4 border-blue-600 border-t-transparent mx-auto" />
                    <p className="mt-2 text-sm text-gray-400">Loading invites...</p>
                </div>
            )}

            {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                    <AlertCircle className="h-4 w-4 shrink-0" />{error}
                </div>
            )}

            {!loading && !error && (
                <>
                    {/* Pending invites */}
                    <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-2">
                            <Clock className="h-3.5 w-3.5" />
                            Pending ({pending.length})
                        </p>
                        {pending.length === 0 ? (
                            <div className="py-8 text-center border border-dashed border-gray-200 rounded-xl">
                                <Mail className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                                <p className="text-sm text-gray-500">No pending invites.</p>
                                <p className="text-xs text-gray-400 mt-1">Create an invite link to bring someone in.</p>
                            </div>
                        ) : (
                            <div>
                                {pending.map(inv => (
                                    <InviteRow
                                        key={inv.token}
                                        invite={inv}
                                        onRevoke={handleRevoke}
                                        revoking={revoking === inv.token}
                                    />
                                ))}
                            </div>
                        )}
                    </div>

                    {/* History */}
                    {history.length > 0 && (
                        <div>
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                                History
                            </p>
                            <div>
                                {history.map(inv => (
                                    <InviteRow
                                        key={inv.token}
                                        invite={inv}
                                        onRevoke={handleRevoke}
                                        revoking={revoking === inv.token}
                                    />
                                ))}
                            </div>
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

// ── Plugin card ───────────────────────────────────────────────────────────────

function InstalledPluginCard({
    plugin, onToggle, toggling,
}: {
    plugin: InstalledPlugin;
    onToggle: (id: number) => void;
    toggling: boolean;
}) {
    return (
        <div className={`flex items-start justify-between p-4 rounded-xl border transition-colors ${plugin.is_active ? 'bg-white border-gray-200' : 'bg-gray-50 border-gray-100'}`}>
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
                </div>
            </div>
            {!plugin.is_core && (
                <button
                    onClick={() => onToggle(plugin.id)}
                    disabled={toggling}
                    title={plugin.is_active ? 'Deactivate' : 'Activate'}
                    className={`p-2 rounded-lg transition-colors shrink-0 ml-4 ${plugin.is_active
                        ? 'text-gray-400 hover:bg-red-50 hover:text-red-600'
                        : 'text-gray-400 hover:bg-green-50 hover:text-green-600'
                        }`}
                >
                    {plugin.is_active ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
                </button>
            )}
        </div>
    );
}

// ── Plugins tab ───────────────────────────────────────────────────────────────

function PluginsTab() {
    const { plugins, loading, error, refetch } = usePlugins();
    const [toggling, setToggling] = useState(false);
    const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

    const handleToggle = async (id: number) => {
        setToggling(true);
        setFeedback(null);
        try {
            await pluginAPI.toggle(id);
            await refetch();
            setFeedback({ type: 'success', message: 'Plugin updated.' });
        } catch {
            setFeedback({ type: 'error', message: 'Failed to update plugin.' });
        } finally {
            setToggling(false);
            setTimeout(() => setFeedback(null), 3000);
        }
    };

    const corePlugins = plugins.filter(p => p.is_core);
    const optionalPlugins = plugins.filter(p => !p.is_core);

    if (loading) return (
        <div className="py-16 text-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent mx-auto" />
            <p className="mt-3 text-sm text-gray-500">Loading plugins...</p>
        </div>
    );

    if (error) return (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 text-sm text-red-700">
            <AlertCircle className="h-4 w-4 shrink-0" />{error}
        </div>
    );

    return (
        <div className="space-y-6">
            {feedback && (
                <div className={`flex items-center gap-2 p-3 rounded-xl text-sm ${feedback.type === 'success'
                    ? 'bg-green-50 border border-green-200 text-green-700'
                    : 'bg-red-50 border border-red-200 text-red-700'
                    }`}>
                    {feedback.type === 'success' ? <Check className="h-4 w-4 shrink-0" /> : <X className="h-4 w-4 shrink-0" />}
                    {feedback.message}
                </div>
            )}
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

// ── General tab ───────────────────────────────────────────────────────────────

function GeneralTab() {
    return (
        <div className="py-12 text-center text-gray-400">
            <Settings className="h-10 w-10 mx-auto mb-3 text-gray-300" />
            <p className="text-sm">General settings coming soon.</p>
        </div>
    );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AdminSettingsPage() {
    const [activeTab, setActiveTab] = useState<Tab>('members');

    const tabs: { key: Tab; label: string; icon: React.ElementType }[] = [
        { key: 'general', label: 'General', icon: Settings },
        { key: 'members', label: 'Members', icon: Users },
        { key: 'plugins', label: 'Plugins', icon: Puzzle },
    ];

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
                <p className="text-gray-500 mt-1 text-sm">Manage your workspace configuration and team</p>
            </div>

            <div className="flex gap-1 bg-gray-100 rounded-xl p-1.5">
                {tabs.map(tab => {
                    const Icon = tab.icon;
                    return (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key)}
                            className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium rounded-lg transition-colors ${activeTab === tab.key
                                ? 'bg-white text-gray-900 shadow-sm'
                                : 'text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            <Icon className="h-4 w-4" />
                            {tab.label}
                        </button>
                    );
                })}
            </div>

            <Card>
                {activeTab === 'general' && <GeneralTab />}
                {activeTab === 'members' && <MembersTab />}
                {activeTab === 'plugins' && <PluginsTab />}
            </Card>
        </div>
    );
}