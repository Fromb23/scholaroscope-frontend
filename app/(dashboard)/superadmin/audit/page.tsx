'use client';

// ============================================================================
// app/(dashboard)/superadmin/audit/page.tsx
// Route: /superadmin/audit
// Note: Displays mock data — swap MOCK_LOGS for a real API hook when
//       the backend implements the audit trail endpoint.
// ============================================================================

import { useState, useMemo } from 'react';
import {
    FileText, Search, Download, Filter, UserPlus, Pencil,
    Trash2, LogIn, LogOut, Power, PowerOff, Link, Unlink,
    ChevronDown, Building2, Users, BookOpen,
    Clock, AlertTriangle,
} from 'lucide-react';
import { Badge } from '@/app/components/ui/Badge';
import { Card } from '@/app/components/ui/Card';
import { Button } from '@/app/components/ui/Button';
import { AuditLog, AuditAction, ACTION_COLORS } from '@/app/plugins/platform/audit/types/auditLogs';

// ============================================================================
// Mock data — replace with real API hook when backend is ready
// ============================================================================
const MOCK_LOGS: AuditLog[] = [
    {
        id: 1, actor_id: 1, actor_email: 'superadmin@platform.com',
        actor_name: 'System Admin', actor_role: 'SUPERADMIN',
        organization_id: null, organization_name: null,
        action: 'CREATE', resource_type: 'ORGANIZATION', resource_id: 5,
        resource_name: 'Greenwood Academy',
        details: { plan_type: 'BASIC' }, ip_address: '192.168.1.1',
        timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
    },
    {
        id: 2, actor_id: 2, actor_email: 'admin@greenwood.com',
        actor_name: 'Jane Admin', actor_role: 'ADMIN',
        organization_id: 5, organization_name: 'Greenwood Academy',
        action: 'CREATE', resource_type: 'USER', resource_id: 12,
        resource_name: 'John Instructor',
        details: { role: 'INSTRUCTOR' }, ip_address: '10.0.0.5',
        timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    },
    {
        id: 3, actor_id: 2, actor_email: 'admin@greenwood.com',
        actor_name: 'Jane Admin', actor_role: 'ADMIN',
        organization_id: 5, organization_name: 'Greenwood Academy',
        action: 'LOGIN', resource_type: 'USER', resource_id: 2,
        resource_name: 'Jane Admin',
        details: {}, ip_address: '10.0.0.5',
        timestamp: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
    },
    {
        id: 4, actor_id: 1, actor_email: 'superadmin@platform.com',
        actor_name: 'System Admin', actor_role: 'SUPERADMIN',
        organization_id: 3, organization_name: 'Riverside School',
        action: 'DEACTIVATE', resource_type: 'ORGANIZATION', resource_id: 3,
        resource_name: 'Riverside School',
        details: { reason: 'Subscription expired' }, ip_address: '192.168.1.1',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
    },
    {
        id: 5, actor_id: 4, actor_email: 'admin@riverside.com',
        actor_name: 'Bob Admin', actor_role: 'ADMIN',
        organization_id: 3, organization_name: 'Riverside School',
        action: 'DELETE', resource_type: 'COHORT', resource_id: 8,
        resource_name: 'Grade 7 Blue 2024',
        details: {}, ip_address: '10.0.1.12',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
    },
    {
        id: 6, actor_id: 1, actor_email: 'superadmin@platform.com',
        actor_name: 'System Admin', actor_role: 'SUPERADMIN',
        organization_id: 5, organization_name: 'Greenwood Academy',
        action: 'UPDATE', resource_type: 'ORGANIZATION', resource_id: 5,
        resource_name: 'Greenwood Academy',
        details: { plan_type: { from: 'BASIC', to: 'PREMIUM' } }, ip_address: '192.168.1.1',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    },
];

// ============================================================================
// Helpers
// ============================================================================
function timeAgo(ts: string): string {
    const diff = Date.now() - new Date(ts).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
}

function ActionIcon({ action }: { action: AuditAction }) {
    const cls = 'h-3.5 w-3.5';
    switch (action) {
        case 'CREATE': return <UserPlus className={cls} />;
        case 'UPDATE': return <Pencil className={cls} />;
        case 'DELETE': return <Trash2 className={cls} />;
        case 'LOGIN': return <LogIn className={cls} />;
        case 'LOGOUT': return <LogOut className={cls} />;
        case 'ACTIVATE': return <Power className={cls} />;
        case 'DEACTIVATE': return <PowerOff className={cls} />;
        case 'ASSIGN': return <Link className={cls} />;
        case 'UNASSIGN': return <Unlink className={cls} />;
        default: return <FileText className={cls} />;
    }
}

function ResourceIcon({ type }: { type: string }) {
    const cls = 'h-3.5 w-3.5 text-gray-400';
    switch (type) {
        case 'ORGANIZATION': return <Building2 className={cls} />;
        case 'USER': return <Users className={cls} />;
        case 'COHORT': return <BookOpen className={cls} />;
        default: return <FileText className={cls} />;
    }
}

// ============================================================================
// Stats strip
// ============================================================================
function AuditStats({ logs }: { logs: AuditLog[] }) {
    const today = logs.filter(l =>
        new Date(l.timestamp).toDateString() === new Date().toDateString()
    ).length;
    const creates = logs.filter(l => l.action === 'CREATE').length;
    const deletes = logs.filter(l => l.action === 'DELETE').length;
    const logins = logs.filter(l => l.action === 'LOGIN').length;

    return (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
                { label: "Today's Events", value: today, color: 'text-purple-600', bg: 'bg-purple-50' },
                { label: 'Creates', value: creates, color: 'text-green-600', bg: 'bg-green-50' },
                { label: 'Deletes', value: deletes, color: 'text-red-600', bg: 'bg-red-50' },
                { label: 'Logins', value: logins, color: 'text-blue-600', bg: 'bg-blue-50' },
            ].map(s => (
                <Card key={s.label} className="py-4 px-5">
                    <p className="text-xs font-medium text-gray-500">{s.label}</p>
                    <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
                </Card>
            ))}
        </div>
    );
}

// ============================================================================
// Log Row
// ============================================================================
function LogRow({ log, expanded, onToggle }: {
    log: AuditLog; expanded: boolean; onToggle: () => void;
}) {
    const hasDetails = Object.keys(log.details).length > 0;

    return (
        <>
            <tr
                className={`hover:bg-gray-50 transition-colors ${hasDetails ? 'cursor-pointer' : ''}`}
                onClick={hasDetails ? onToggle : undefined}
            >
                {/* Timestamp */}
                <td className="px-5 py-3 whitespace-nowrap">
                    <div className="flex items-center gap-1.5 text-sm text-gray-700">
                        <Clock className="h-3.5 w-3.5 text-gray-400" />
                        <span>{timeAgo(log.timestamp)}</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5 ml-5">
                        {new Date(log.timestamp).toLocaleString('en-GB', {
                            day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
                        })}
                    </p>
                </td>

                {/* Actor */}
                <td className="px-5 py-3">
                    <p className="text-sm font-medium text-gray-900">{log.actor_name}</p>
                    <p className="text-xs text-gray-500">{log.actor_email}</p>
                </td>

                {/* Action */}
                <td className="px-5 py-3">
                    <Badge variant={ACTION_COLORS[log.action]} size="sm">
                        <span className="flex items-center gap-1">
                            <ActionIcon action={log.action} />
                            {log.action}
                        </span>
                    </Badge>
                </td>

                {/* Resource */}
                <td className="px-5 py-3">
                    <div className="flex items-center gap-1.5">
                        <ResourceIcon type={log.resource_type} />
                        <div>
                            <p className="text-xs font-medium text-gray-600 uppercase tracking-wide">
                                {log.resource_type.replace('_', ' ')}
                            </p>
                            <p className="text-sm text-gray-900">{log.resource_name}</p>
                        </div>
                    </div>
                </td>

                {/* Organization */}
                <td className="px-5 py-3">
                    {log.organization_name ? (
                        <p className="text-sm text-gray-700">{log.organization_name}</p>
                    ) : (
                        <span className="text-xs text-gray-400 italic">Platform</span>
                    )}
                </td>

                {/* IP */}
                <td className="px-5 py-3">
                    <span className="text-xs font-mono text-gray-500">{log.ip_address}</span>
                </td>

                {/* Expand toggle */}
                <td className="px-5 py-3">
                    {hasDetails && (
                        <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${expanded ? 'rotate-180' : ''}`} />
                    )}
                </td>
            </tr>

            {/* Expanded details */}
            {expanded && hasDetails && (
                <tr className="bg-gray-50">
                    <td colSpan={7} className="px-5 py-3">
                        <div className="ml-4 pl-4 border-l-2 border-purple-200">
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                                Change Details
                            </p>
                            <pre className="text-xs text-gray-700 bg-white rounded-lg p-3 border border-gray-200 overflow-auto">
                                {JSON.stringify(log.details, null, 2)}
                            </pre>
                        </div>
                    </td>
                </tr>
            )}
        </>
    );
}

// ============================================================================
// Main Page
// ============================================================================
export default function AuditLogsPage() {
    const logs = MOCK_LOGS; // 🔄 Replace: const { logs, loading } = useAuditLogs();

    const [search, setSearch] = useState('');
    const [actionFilter, setActionFilter] = useState('all');
    const [resourceFilter, setResourceFilter] = useState('all');
    const [expandedId, setExpandedId] = useState<number | null>(null);

    const filtered = useMemo(() => {
        return logs.filter(l => {
            const matchSearch = !search ||
                l.actor_name.toLowerCase().includes(search.toLowerCase()) ||
                l.actor_email.toLowerCase().includes(search.toLowerCase()) ||
                l.resource_name.toLowerCase().includes(search.toLowerCase()) ||
                (l.organization_name ?? '').toLowerCase().includes(search.toLowerCase());
            const matchAction = actionFilter === 'all' || l.action === actionFilter;
            const matchResource = resourceFilter === 'all' || l.resource_type === resourceFilter;
            return matchSearch && matchAction && matchResource;
        });
    }, [logs, search, actionFilter, resourceFilter]);

    const handleExport = () => {
        const csv = [
            ['Timestamp', 'Actor', 'Action', 'Resource Type', 'Resource', 'Organization', 'IP'].join(','),
            ...filtered.map(l => [
                l.timestamp, l.actor_email, l.action,
                l.resource_type, l.resource_name,
                l.organization_name ?? 'Platform', l.ip_address,
            ].join(',')),
        ].join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url;
        a.download = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`;
        a.click(); URL.revokeObjectURL(url);
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Audit Logs</h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Track all system activities and changes
                    </p>
                </div>
                <Button
                    variant="secondary" onClick={handleExport}
                    className="gap-2"
                >
                    <Download className="h-4 w-4" /> Export CSV
                </Button>
            </div>

            {/* Notice banner — remove when backend is live */}
            <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-amber-800">
                    <strong>Preview data:</strong> Showing mock audit entries.
                    Connect to the backend audit endpoint to see real data.
                </p>
            </div>

            {/* Stats */}
            <AuditStats logs={logs} />

            {/* Filters */}
            <Card className="p-4">
                <div className="flex flex-col sm:flex-row gap-3">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                            type="text" placeholder="Search by actor, resource or organization..."
                            value={search} onChange={e => setSearch(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                    </div>
                    <select value={actionFilter} onChange={e => setActionFilter(e.target.value)}
                        className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500">
                        <option value="all">All Actions</option>
                        {['CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'ACTIVATE', 'DEACTIVATE', 'ASSIGN', 'UNASSIGN'].map(a => (
                            <option key={a} value={a}>{a}</option>
                        ))}
                    </select>
                    <select value={resourceFilter} onChange={e => setResourceFilter(e.target.value)}
                        className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500">
                        <option value="all">All Resources</option>
                        {['ORGANIZATION', 'USER', 'COHORT', 'SUBJECT', 'ACADEMIC_YEAR', 'TERM', 'ASSESSMENT', 'SESSION'].map(r => (
                            <option key={r} value={r}>{r.replace('_', ' ')}</option>
                        ))}
                    </select>
                </div>
            </Card>

            {/* Logs table */}
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
                                        <p className="text-sm text-gray-500">No audit entries match your filters</p>
                                    </td>
                                </tr>
                            ) : (
                                filtered.map(log => (
                                    <LogRow
                                        key={log.id} log={log}
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