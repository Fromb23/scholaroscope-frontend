'use client';

import { useState } from 'react';
import {
    Puzzle, Shield, Globe, Power, PowerOff,
    RefreshCw, Building2, AlertTriangle,
    CheckCircle2, Eye, Download, Trash2,
} from 'lucide-react';
import { Badge } from '@/app/components/ui/Badge';
import { Button } from '@/app/components/ui/Button';
import { Card } from '@/app/components/ui/Card';
import Modal from '@/app/components/ui/Modal';
import type { Plugin, InstalledPlugin } from '@/app/core/types/plugins';
import {
    SOURCE_LABELS, SOURCE_COLORS,
    STATE_LABELS, STATE_COLORS,
} from '@/app/core/types/plugins';

// ── Helpers ───────────────────────────────────────────────────────────────────

function SourceIcon({ source }: { source: string }) {
    if (source === 'core') return <Shield className="h-3.5 w-3.5 text-purple-500" />;
    if (source === 'third_party') return <Globe className="h-3.5 w-3.5 text-blue-500" />;
    return <Puzzle className="h-3.5 w-3.5 text-gray-400" />;
}

// ── Stats bar ─────────────────────────────────────────────────────────────────

export function PluginStatsBar({ plugins }: { plugins: Plugin[] }) {
    const total = plugins.length;
    const installed = plugins.filter(p => p.installation_count > 0).length;
    const core = plugins.filter(p => p.is_core).length;
    const thirdParty = plugins.filter(p => p.is_third_party).length;

    return (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
                { label: 'Total', value: total, color: 'text-gray-900', },
                { label: 'Installed', value: installed, color: 'text-green-600', },
                { label: 'Core', value: core, color: 'text-purple-600', },
                { label: 'Third Party', value: thirdParty, color: 'text-blue-600', },
            ].map(s => (
                <Card key={s.label} className="py-4 px-5">
                    <p className="text-xs font-medium text-gray-500">{s.label}</p>
                    <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
                </Card>
            ))}
        </div>
    );
}

// ── Plugin table row ──────────────────────────────────────────────────────────

interface PluginTableRowProps {
    plugin: Plugin;
    onView: (plugin: Plugin) => void;
    onViewInstallations: (plugin: Plugin) => void;
    onSync: (plugin: Plugin) => void;
    onInstallGlobally: (plugin: Plugin) => void;
    onUninstallGlobally: (plugin: Plugin) => void;
    syncing: boolean;
    acting: boolean;
}

export function PluginTableRow({
    plugin, onView, onViewInstallations,
    onSync, onInstallGlobally, onUninstallGlobally,
    syncing, acting,
}: PluginTableRowProps) {
    return (
        <tr className="hover:bg-gray-50 transition-colors">
            <td className="px-5 py-3">
                <div className="flex items-center gap-2">
                    <SourceIcon source={plugin.source} />
                    <div>
                        <p className="text-sm font-semibold text-gray-900">{plugin.name}</p>
                        <p className="text-xs text-gray-400 font-mono">{plugin.key}</p>
                    </div>
                </div>
            </td>
            <td className="px-5 py-3">
                <Badge variant={SOURCE_COLORS[plugin.source]}>
                    {SOURCE_LABELS[plugin.source]}
                </Badge>
            </td>
            <td className="px-5 py-3">
                <span className="text-xs font-mono text-gray-500">v{plugin.version}</span>
            </td>
            <td className="px-5 py-3">
                <Badge variant={plugin.installation_count > 0 ? 'success' : 'default'}>
                    {plugin.installation_count > 0
                        ? `Installed (${plugin.installation_count})`
                        : 'Not Installed'
                    }
                </Badge>
            </td>
            <td className="px-5 py-3">
                {plugin.is_core
                    ? <Badge variant="default">Core</Badge>
                    : <span className="text-xs text-gray-400">Optional</span>
                }
            </td>
            <td className="px-5 py-3">
                {plugin.is_third_party ? (
                    <div className="flex items-center gap-1.5">
                        {plugin.is_manifest_stale
                            ? <AlertTriangle className="h-3.5 w-3.5 text-yellow-500" />
                            : <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                        }
                        <span className="text-xs text-gray-500">
                            {plugin.is_manifest_stale ? 'Stale' : 'Fresh'}
                        </span>
                    </div>
                ) : (
                    <span className="text-xs text-gray-300">—</span>
                )}
            </td>
            <td className="px-5 py-3">
                <div className="flex items-center gap-1">
                    <button
                        onClick={() => onView(plugin)}
                        className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
                        title="View details"
                    >
                        <Eye className="h-4 w-4" />
                    </button>
                    <button
                        onClick={() => onViewInstallations(plugin)}
                        className="p-1.5 rounded-lg text-gray-500 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                        title="View org footprint"
                    >
                        <Building2 className="h-4 w-4" />
                    </button>
                    {plugin.is_third_party && (
                        <button
                            onClick={() => onSync(plugin)}
                            disabled={syncing}
                            className="p-1.5 rounded-lg text-gray-500 hover:bg-purple-50 hover:text-purple-600 transition-colors disabled:opacity-50"
                            title="Sync manifest"
                        >
                            <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
                        </button>
                    )}
                    {!plugin.is_core && (
                        plugin.installation_count > 0 ? (
                            <button
                                onClick={() => onUninstallGlobally(plugin)}
                                disabled={acting}
                                className="p-1.5 rounded-lg text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors disabled:opacity-50"
                                title="Uninstall from all orgs"
                            >
                                <Trash2 className="h-4 w-4" />
                            </button>
                        ) : (
                            <button
                                onClick={() => onInstallGlobally(plugin)}
                                disabled={acting}
                                className="p-1.5 rounded-lg text-gray-500 hover:bg-green-50 hover:text-green-600 transition-colors disabled:opacity-50"
                                title="Install to all orgs"
                            >
                                <Download className="h-4 w-4" />
                            </button>
                        )
                    )}
                </div>
            </td>
        </tr>
    );
}

// ── Plugin detail modal ───────────────────────────────────────────────────────

interface PluginDetailModalProps {
    plugin: Plugin | null;
    isOpen: boolean;
    onClose: () => void;
    onSync: (plugin: Plugin) => void;
    onInstallGlobally: (plugin: Plugin) => void;
    onUninstallGlobally: (plugin: Plugin) => void;
    syncing: boolean;
    acting: boolean;
}

export function PluginDetailModal({
    plugin, isOpen, onClose,
    onSync, onInstallGlobally, onUninstallGlobally,
    syncing, acting,
}: PluginDetailModalProps) {
    if (!plugin) return null;
    return (
        <Modal isOpen={isOpen} onClose={onClose} title={plugin.name} size="lg">
            <div className="space-y-4">
                <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant={SOURCE_COLORS[plugin.source]}>{SOURCE_LABELS[plugin.source]}</Badge>
                    <Badge variant={plugin.installation_count > 0 ? 'success' : 'default'}>
                        {plugin.installation_count > 0
                            ? `Installed (${plugin.installation_count})`
                            : 'Not Installed'
                        }
                    </Badge>
                    {plugin.is_core && <Badge variant="default">Core</Badge>}
                    <span className="text-xs font-mono text-gray-400">v{plugin.version}</span>
                </div>

                <p className="text-sm text-gray-700">{plugin.description || 'No description.'}</p>

                <div className="grid grid-cols-2 gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wide">Key</p>
                        <p className="text-sm font-mono text-gray-900 mt-0.5">{plugin.key}</p>
                    </div>
                    <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wide">Source</p>
                        <p className="text-sm text-gray-900 mt-0.5">{SOURCE_LABELS[plugin.source]}</p>
                    </div>
                    <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wide">Version</p>
                        <p className="text-sm text-gray-900 mt-0.5">{plugin.version}</p>
                    </div>
                    <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wide">Registered</p>
                        <p className="text-sm text-gray-900 mt-0.5">
                            {new Date(plugin.created_at).toLocaleDateString('en-GB')}
                        </p>
                    </div>
                </div>

                {plugin.is_third_party && (
                    <div className="p-3 rounded-lg border border-gray-200 bg-gray-50 space-y-2">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Manifest</p>
                        <p className="text-xs font-mono text-blue-600 break-all">{plugin.manifest_url}</p>
                        <div className="flex items-center gap-2">
                            {plugin.is_manifest_stale ? (
                                <div className="flex items-center gap-1.5 text-xs text-yellow-600">
                                    <AlertTriangle className="h-3.5 w-3.5" /> Stale — needs sync
                                </div>
                            ) : (
                                <div className="flex items-center gap-1.5 text-xs text-green-600">
                                    <CheckCircle2 className="h-3.5 w-3.5" /> Fresh
                                </div>
                            )}
                            {plugin.manifest_synced_at && (
                                <span className="text-xs text-gray-400">
                                    Last synced {new Date(plugin.manifest_synced_at).toLocaleDateString('en-GB')}
                                </span>
                            )}
                        </div>
                    </div>
                )}

                {Object.keys(plugin.config_schema).length > 0 && (
                    <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Config Schema</p>
                        <pre className="text-xs text-gray-700 bg-white rounded-lg p-3 border border-gray-200 overflow-auto max-h-40">
                            {JSON.stringify(plugin.config_schema, null, 2)}
                        </pre>
                    </div>
                )}

                <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                    {plugin.is_third_party && (
                        <Button variant="secondary" size="sm" onClick={() => onSync(plugin)} disabled={syncing} className="gap-1.5">
                            <RefreshCw className={`h-3.5 w-3.5 ${syncing ? 'animate-spin' : ''}`} />
                            {syncing ? 'Syncing...' : 'Sync Manifest'}
                        </Button>
                    )}
                    {!plugin.is_core && (
                        plugin.installation_count > 0 ? (
                            <Button
                                variant="secondary" size="sm"
                                onClick={() => onUninstallGlobally(plugin)}
                                disabled={acting}
                                className="gap-1.5 text-red-600 hover:bg-red-50"
                            >
                                <Trash2 className="h-3.5 w-3.5" />
                                {acting ? 'Uninstalling...' : 'Uninstall Globally'}
                            </Button>
                        ) : (
                            <Button
                                variant="secondary" size="sm"
                                onClick={() => onInstallGlobally(plugin)}
                                disabled={acting}
                                className="gap-1.5 text-green-600 hover:bg-green-50"
                            >
                                <Download className="h-3.5 w-3.5" />
                                {acting ? 'Installing...' : 'Install Globally'}
                            </Button>
                        )
                    )}
                    <Button variant="secondary" onClick={onClose} className="ml-auto">Close</Button>
                </div>
            </div>
        </Modal>
    );
}

// ── Installations footprint modal (read-only audit) ───────────────────────────

interface InstallationsModalProps {
    plugin: Plugin | null;
    installations: InstalledPlugin[];
    loading: boolean;
    isOpen: boolean;
    onClose: () => void;
}

export function InstallationsModal({
    plugin, installations, loading, isOpen, onClose,
}: InstallationsModalProps) {
    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={`${plugin?.name ?? 'Plugin'} — Org Footprint`}
            size="lg"
        >
            <div className="space-y-3">
                {loading ? (
                    <div className="py-8 flex justify-center">
                        <div className="h-6 w-6 animate-spin rounded-full border-2 border-purple-600 border-t-transparent" />
                    </div>
                ) : installations.length === 0 ? (
                    <div className="py-8 text-center">
                        <Building2 className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                        <p className="text-sm text-gray-500">No organizations have this plugin installed.</p>
                    </div>
                ) : (
                    installations.map(inst => (
                        <div key={inst.id} className="flex items-center justify-between p-3 rounded-lg border border-gray-200 bg-gray-50">
                            <div className="flex items-center gap-3">
                                <Building2 className="h-4 w-4 text-gray-400 shrink-0" />
                                <div>
                                    <p className="text-sm font-medium text-gray-900">{inst.organization_name}</p>
                                    <p className="text-xs text-gray-500">
                                        {inst.installed_by_email ? `by ${inst.installed_by_email}` : 'Auto-installed'}
                                        {' · '}
                                        {new Date(inst.installed_at).toLocaleDateString('en-GB')}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <Badge variant={STATE_COLORS[inst.state]}>
                                    {STATE_LABELS[inst.state]}
                                </Badge>
                            </div>
                        </div>
                    ))
                )}
                <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                    <p className="text-xs text-gray-500">
                        {installations.length} org{installations.length !== 1 ? 's' : ''} have this plugin
                    </p>
                    <Button variant="secondary" onClick={onClose}>Close</Button>
                </div>
            </div>
        </Modal>
    );
}

// ── Uninstall confirmation modal ──────────────────────────────────────────────

interface UninstallImpact {
    plugin_name: string;
    active_count: number;
    disabled_count: number;
    total_affected: number;
    active_orgs: { id: number; name: string }[];
    disabled_orgs: { id: number; name: string }[];
}

interface UninstallConfirmModalProps {
    impact: UninstallImpact | null;
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => Promise<void>;
    confirming: boolean;
}

export function UninstallConfirmModal({
    impact, isOpen, onClose, onConfirm, confirming,
}: UninstallConfirmModalProps) {
    const [typed, setTyped] = useState('');
    if (!impact) return null;

    const hasActiveOrgs = impact.active_count > 0;
    const confirmed = typed === impact.plugin_name;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Confirm Global Uninstall" size="lg">
            <div className="space-y-4">

                {/* Severity banner */}
                <div className={`flex items-start gap-3 p-4 rounded-lg border ${hasActiveOrgs
                    ? 'bg-red-50 border-red-300'
                    : 'bg-yellow-50 border-yellow-300'
                    }`}>
                    <AlertTriangle className={`h-5 w-5 shrink-0 mt-0.5 ${hasActiveOrgs ? 'text-red-600' : 'text-yellow-600'
                        }`} />
                    <div>
                        <p className={`text-sm font-semibold ${hasActiveOrgs ? 'text-red-800' : 'text-yellow-800'
                            }`}>
                            {hasActiveOrgs
                                ? `${impact.active_count} org${impact.active_count !== 1 ? 's' : ''} actively using this plugin`
                                : `Plugin is installed in ${impact.total_affected} org${impact.total_affected !== 1 ? 's' : ''} but not enabled anywhere`
                            }
                        </p>
                        <p className={`text-xs mt-1 ${hasActiveOrgs ? 'text-red-700' : 'text-yellow-700'
                            }`}>
                            Uninstalling will remove all plugin data and features from {impact.total_affected} organization{impact.total_affected !== 1 ? 's' : ''}.
                            This action cannot be undone.
                        </p>
                    </div>
                </div>

                {/* Active orgs */}
                {impact.active_orgs.length > 0 && (
                    <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                            Actively Using ({impact.active_count})
                        </p>
                        <div className="space-y-1 max-h-32 overflow-y-auto">
                            {impact.active_orgs.map(org => (
                                <div key={org.id} className="flex items-center gap-2 px-3 py-1.5 bg-red-50 rounded-lg border border-red-100">
                                    <Building2 className="h-3.5 w-3.5 text-red-400 shrink-0" />
                                    <p className="text-sm text-red-800">{org.name}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Disabled orgs */}
                {impact.disabled_orgs.length > 0 && (
                    <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                            Installed but Disabled ({impact.disabled_count})
                        </p>
                        <div className="space-y-1 max-h-24 overflow-y-auto">
                            {impact.disabled_orgs.map(org => (
                                <div key={org.id} className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-lg border border-gray-100">
                                    <Building2 className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                                    <p className="text-sm text-gray-700">{org.name}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Confirmation input */}
                <div>
                    <p className="text-sm text-gray-700 mb-2">
                        Type <strong>{impact.plugin_name}</strong> to confirm uninstall:
                    </p>
                    <input
                        value={typed}
                        onChange={e => setTyped(e.target.value)}
                        placeholder={impact.plugin_name}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                </div>

                <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
                    <Button variant="secondary" onClick={() => { onClose(); setTyped(''); }} disabled={confirming}>
                        Cancel
                    </Button>
                    <Button
                        onClick={async () => { await onConfirm(); setTyped(''); }}
                        disabled={!confirmed || confirming}
                        className="bg-red-600 hover:bg-red-700 text-white gap-1.5 disabled:opacity-50"
                    >
                        <Trash2 className="h-4 w-4" />
                        {confirming ? 'Uninstalling...' : 'Confirm Uninstall'}
                    </Button>
                </div>
            </div>
        </Modal>
    );
}