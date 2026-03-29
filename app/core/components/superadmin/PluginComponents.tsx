'use client';

import { useState } from 'react';
import {
    Puzzle, Shield, Globe, Power, PowerOff,
    RefreshCw, Building2, Clock, AlertTriangle,
    CheckCircle2, Eye,
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

// ── Source icon ───────────────────────────────────────────────────────────────

function SourceIcon({ source }: { source: string }) {
    if (source === 'core') return <Shield className="h-3.5 w-3.5 text-purple-500" />;
    if (source === 'third_party') return <Globe className="h-3.5 w-3.5 text-blue-500" />;
    return <Puzzle className="h-3.5 w-3.5 text-gray-400" />;
}

// ── Stats bar ─────────────────────────────────────────────────────────────────

export function PluginStatsBar({ plugins }: { plugins: Plugin[] }) {
    const total = plugins.length;
    const available = plugins.filter(p => p.is_available).length;
    const core = plugins.filter(p => p.is_core).length;
    const thirdParty = plugins.filter(p => p.is_third_party).length;

    return (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
                { label: 'Total Plugins', value: total, color: 'text-gray-900', bg: 'bg-gray-50' },
                { label: 'Available', value: available, color: 'text-green-600', bg: 'bg-green-50' },
                { label: 'Core', value: core, color: 'text-purple-600', bg: 'bg-purple-50' },
                { label: 'Third Party', value: thirdParty, color: 'text-blue-600', bg: 'bg-blue-50' },
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
    onToggle: (plugin: Plugin) => void;
    onSync: (plugin: Plugin) => void;
    onView: (plugin: Plugin) => void;
    onViewInstallations: (plugin: Plugin) => void;
    toggling: boolean;
    syncing: boolean;
}

export function PluginTableRow({
    plugin, onToggle, onSync, onView, onViewInstallations, toggling, syncing,
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
                <Badge variant={plugin.is_available ? 'success' : 'danger'}>
                    {plugin.is_available ? 'Available' : 'Disabled'}
                </Badge>
            </td>
            <td className="px-5 py-3">
                {plugin.is_core ? (
                    <Badge variant="default">Core</Badge>
                ) : (
                    <span className="text-xs text-gray-400">Optional</span>
                )}
            </td>
            <td className="px-5 py-3">
                {plugin.is_third_party ? (
                    <div className="flex items-center gap-1.5">
                        {plugin.is_manifest_stale ? (
                            <AlertTriangle className="h-3.5 w-3.5 text-yellow-500" />
                        ) : (
                            <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                        )}
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
                        title="View installations"
                    >
                        <Building2 className="h-4 w-4" />
                    </button>
                    {plugin.is_third_party && (
                        <button
                            onClick={() => onSync(plugin)}
                            disabled={syncing}
                            className="p-1.5 rounded-lg text-gray-500 hover:bg-purple-50 hover:text-purple-600 transition-colors"
                            title="Sync manifest"
                        >
                            <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
                        </button>
                    )}
                    {!plugin.is_core && (
                        <button
                            onClick={() => onToggle(plugin)}
                            disabled={toggling}
                            className={`p-1.5 rounded-lg transition-colors ${plugin.is_available
                                ? 'text-gray-500 hover:bg-orange-50 hover:text-orange-600'
                                : 'text-gray-500 hover:bg-green-50 hover:text-green-600'
                                }`}
                            title={plugin.is_available ? 'Disable platform-wide' : 'Enable platform-wide'}
                        >
                            {plugin.is_available
                                ? <PowerOff className="h-4 w-4" />
                                : <Power className="h-4 w-4" />
                            }
                        </button>
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
    onToggle: (plugin: Plugin) => void;
    onSync: (plugin: Plugin) => void;
    toggling: boolean;
    syncing: boolean;
}

export function PluginDetailModal({
    plugin, isOpen, onClose, onToggle, onSync, toggling, syncing,
}: PluginDetailModalProps) {
    if (!plugin) return null;
    return (
        <Modal isOpen={isOpen} onClose={onClose} title={plugin.name} size="lg">
            <div className="space-y-4">
                {/* Badges */}
                <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant={SOURCE_COLORS[plugin.source]}>{SOURCE_LABELS[plugin.source]}</Badge>
                    <Badge variant={plugin.is_available ? 'success' : 'danger'}>
                        {plugin.is_available ? 'Available' : 'Disabled'}
                    </Badge>
                    {plugin.is_core && <Badge variant="default">Core</Badge>}
                    <span className="text-xs font-mono text-gray-400">v{plugin.version}</span>
                </div>

                {/* Description */}
                <p className="text-sm text-gray-700">{plugin.description || 'No description.'}</p>

                {/* Meta */}
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

                {/* Manifest info */}
                {plugin.is_third_party && (
                    <div className="p-3 rounded-lg border border-gray-200 bg-gray-50 space-y-2">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Manifest</p>
                        <p className="text-xs font-mono text-blue-600 break-all">{plugin.manifest_url}</p>
                        <div className="flex items-center gap-2">
                            {plugin.is_manifest_stale ? (
                                <div className="flex items-center gap-1.5 text-xs text-yellow-600">
                                    <AlertTriangle className="h-3.5 w-3.5" />
                                    Stale — needs sync
                                </div>
                            ) : (
                                <div className="flex items-center gap-1.5 text-xs text-green-600">
                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                    Fresh
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

                {/* Config schema */}
                {Object.keys(plugin.config_schema).length > 0 && (
                    <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                            Config Schema
                        </p>
                        <pre className="text-xs text-gray-700 bg-white rounded-lg p-3 border border-gray-200 overflow-auto max-h-40">
                            {JSON.stringify(plugin.config_schema, null, 2)}
                        </pre>
                    </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                    {plugin.is_third_party && (
                        <Button
                            variant="secondary" size="sm"
                            onClick={() => onSync(plugin)}
                            disabled={syncing}
                            className="gap-1.5"
                        >
                            <RefreshCw className={`h-3.5 w-3.5 ${syncing ? 'animate-spin' : ''}`} />
                            {syncing ? 'Syncing...' : 'Sync Manifest'}
                        </Button>
                    )}
                    {!plugin.is_core && (
                        <Button
                            variant="secondary" size="sm"
                            onClick={() => onToggle(plugin)}
                            disabled={toggling}
                            className={`gap-1.5 ${plugin.is_available
                                ? 'text-orange-600 hover:bg-orange-50'
                                : 'text-green-600 hover:bg-green-50'
                                }`}
                        >
                            {plugin.is_available
                                ? <><PowerOff className="h-3.5 w-3.5" /> Disable</>
                                : <><Power className="h-3.5 w-3.5" /> Enable</>
                            }
                        </Button>
                    )}
                    <Button variant="secondary" onClick={onClose} className="ml-auto">Close</Button>
                </div>
            </div>
        </Modal>
    );
}

// ── Installations modal ───────────────────────────────────────────────────────

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
            title={`${plugin?.name ?? 'Plugin'} — Installations`}
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
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="flex items-center gap-1 text-xs text-gray-400">
                                    <Clock className="h-3 w-3" />
                                    {new Date(inst.installed_at).toLocaleDateString('en-GB')}
                                </div>
                                <Badge variant={STATE_COLORS[inst.state]}>
                                    {STATE_LABELS[inst.state]}
                                </Badge>
                                {inst.data_retention_until && inst.state === 'grace_period' && (
                                    <p className="text-xs text-yellow-600">
                                        Purge: {new Date(inst.data_retention_until).toLocaleDateString('en-GB')}
                                    </p>
                                )}
                            </div>
                        </div>
                    ))
                )}
                <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                    <p className="text-xs text-gray-500">
                        {installations.length} installation{installations.length !== 1 ? 's' : ''}
                    </p>
                    <Button variant="secondary" onClick={onClose}>Close</Button>
                </div>
            </div>
        </Modal>
    );
}