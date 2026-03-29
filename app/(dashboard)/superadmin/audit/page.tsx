'use client';

import { useState, useMemo } from 'react';
import { FileText, Search, Download } from 'lucide-react';
import { useAuditLogs, useAuditStats } from '@/app/core/hooks/useAuditLogs';
import { Button } from '@/app/components/ui/Button';
import { Card } from '@/app/components/ui/Card';
import { LoadingSpinner } from '@/app/components/ui/LoadingSpinner';
import { ErrorState } from '@/app/components/ui/ErrorState';
import {
    AuditStatsBar, LogRow,
} from '@/app/core/components/superadmin/AuditComponents';

export default function AuditLogsPage() {
    const { logs, loading, error, refetch } = useAuditLogs();
    const { stats } = useAuditStats();

    const [search, setSearch] = useState('');
    const [actionFilter, setActionFilter] = useState('all');
    const [resourceFilter, setResourceFilter] = useState('all');
    const [expandedId, setExpandedId] = useState<number | null>(null);

    const filtered = useMemo(() => logs.filter(l => {
        const q = search.toLowerCase();
        return (
            (!search ||
                l.actor_name.toLowerCase().includes(q) ||
                l.actor_email.toLowerCase().includes(q) ||
                l.resource_name.toLowerCase().includes(q) ||
                l.organization_name.toLowerCase().includes(q)
            ) &&
            (actionFilter === 'all' || l.action === actionFilter) &&
            (resourceFilter === 'all' || l.resource_type === resourceFilter)
        );
    }), [logs, search, actionFilter, resourceFilter]);

    const handleExport = () => {
        const csv = [
            ['Timestamp', 'Actor', 'Action', 'Resource Type', 'Resource', 'Organization', 'IP'].join(','),
            ...filtered.map(l => [
                l.timestamp, l.actor_email, l.action,
                l.resource_type, l.resource_name,
                l.organization_name || 'Platform',
                l.ip_address ?? '',
            ].join(',')),
        ].join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    if (loading) return <LoadingSpinner />;
    if (error) return <ErrorState message={error} onRetry={refetch} />;

    return (
        <div className="space-y-6">

            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Audit Logs</h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Track all system activities and changes — {logs.length} total events
                    </p>
                </div>
                <Button variant="secondary" onClick={handleExport} className="gap-2">
                    <Download className="h-4 w-4" /> Export CSV
                </Button>
            </div>

            {/* Stats */}
            {stats && <AuditStatsBar stats={stats} />}

            {/* Filters */}
            <Card className="p-4">
                <div className="flex flex-col sm:flex-row gap-3">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search by actor, resource or organization..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                    </div>
                    <select
                        value={actionFilter}
                        onChange={e => setActionFilter(e.target.value)}
                        className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                        <option value="all">All Actions</option>
                        {['CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'ACTIVATE', 'DEACTIVATE', 'ASSIGN', 'UNASSIGN', 'SUSPEND', 'UNSUSPEND'].map(a => (
                            <option key={a} value={a}>{a}</option>
                        ))}
                    </select>
                    <select
                        value={resourceFilter}
                        onChange={e => setResourceFilter(e.target.value)}
                        className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                        <option value="all">All Resources</option>
                        {['USER', 'ORGANIZATION', 'MEMBERSHIP', 'COHORT', 'SUBJECT', 'ACADEMIC_YEAR', 'TERM', 'ASSESSMENT', 'SESSION', 'PLUGIN', 'REQUEST'].map(r => (
                            <option key={r} value={r}>{r.replace('_', ' ')}</option>
                        ))}
                    </select>
                </div>
            </Card>

            {/* Table */}
            <Card className="p-0 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-gray-200 bg-gray-50">
                                {['When', 'Actor', 'Action', 'Resource', 'Organization', 'IP', ''].map(h => (
                                    <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                        {h}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-12 text-center">
                                        <FileText className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                                        <p className="text-sm text-gray-500">
                                            {search || actionFilter !== 'all' || resourceFilter !== 'all'
                                                ? 'No audit entries match your filters'
                                                : 'No audit events recorded yet'
                                            }
                                        </p>
                                    </td>
                                </tr>
                            ) : (
                                filtered.map(log => (
                                    <LogRow
                                        key={log.id}
                                        log={log}
                                        expanded={expandedId === log.id}
                                        onToggle={() => setExpandedId(expandedId === log.id ? null : log.id)}
                                    />
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
                {filtered.length > 0 && (
                    <div className="px-5 py-3 border-t border-gray-100 bg-gray-50">
                        <p className="text-xs text-gray-500">
                            Showing {filtered.length} of {logs.length} event{logs.length !== 1 ? 's' : ''}
                        </p>
                    </div>
                )}
            </Card>

        </div>
    );
}