'use client';

import {
    FileText, UserPlus, Pencil, Trash2,
    LogIn, LogOut, Power, PowerOff,
    Link, Unlink, ShieldOff, ShieldCheck,
    Building2, Users, BookOpen, Clock,
    ChevronDown,
} from 'lucide-react';
import { Badge } from '@/app/components/ui/Badge';
import { Card } from '@/app/components/ui/Card';
import type { AuditLog, AuditAction, AuditStats } from '@/app/plugins/platform/audit/types/auditLogs';
import { ACTION_COLORS } from '@/app/plugins/platform/audit/types/auditLogs';

// ── Helpers ───────────────────────────────────────────────────────────────────

export function timeAgo(ts: string): string {
    const diff = Date.now() - new Date(ts).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
}

// ── Action icon ───────────────────────────────────────────────────────────────

export function ActionIcon({ action }: { action: AuditAction }) {
    const cls = 'h-3.5 w-3.5';
    const map: Record<AuditAction, React.ReactElement> = {
        CREATE: <UserPlus className={cls} />,
        UPDATE: <Pencil className={cls} />,
        DELETE: <Trash2 className={cls} />,
        LOGIN: <LogIn className={cls} />,
        LOGOUT: <LogOut className={cls} />,
        ACTIVATE: <Power className={cls} />,
        DEACTIVATE: <PowerOff className={cls} />,
        ASSIGN: <Link className={cls} />,
        UNASSIGN: <Unlink className={cls} />,
        SUSPEND: <ShieldOff className={cls} />,
        UNSUSPEND: <ShieldCheck className={cls} />,
    };
    return map[action] ?? <FileText className={cls} />;
}

// ── Resource icon ─────────────────────────────────────────────────────────────

export function ResourceIcon({ type }: { type: string }) {
    const cls = 'h-3.5 w-3.5 text-gray-400';
    if (type === 'ORGANIZATION') return <Building2 className={cls} />;
    if (type === 'USER') return <Users className={cls} />;
    if (type === 'COHORT') return <BookOpen className={cls} />;
    return <FileText className={cls} />;
}

// ── Stats bar ─────────────────────────────────────────────────────────────────

export function AuditStatsBar({ stats }: { stats: AuditStats }) {
    return (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
                { label: "Today's Events", value: stats.today, color: 'text-purple-600', bg: 'bg-purple-50' },
                { label: 'Last 7 Days', value: stats.last_7_days, color: 'text-blue-600', bg: 'bg-blue-50' },
                { label: 'Creates', value: stats.by_action?.CREATE ?? 0, color: 'text-green-600', bg: 'bg-green-50' },
                { label: 'Deletes', value: stats.by_action?.DELETE ?? 0, color: 'text-red-600', bg: 'bg-red-50' },
            ].map(s => (
                <Card key={s.label} className="py-4 px-5">
                    <p className="text-xs font-medium text-gray-500">{s.label}</p>
                    <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
                </Card>
            ))}
        </div>
    );
}

// ── Log row ───────────────────────────────────────────────────────────────────

interface LogRowProps {
    log: AuditLog;
    expanded: boolean;
    onToggle: () => void;
}

export function LogRow({ log, expanded, onToggle }: LogRowProps) {
    const hasDetails = Object.keys(log.details).length > 0;

    return (
        <>
            <tr
                className={`hover:bg-gray-50 transition-colors ${hasDetails ? 'cursor-pointer' : ''}`}
                onClick={hasDetails ? onToggle : undefined}
            >
                <td className="px-5 py-3 whitespace-nowrap">
                    <div className="flex items-center gap-1.5 text-sm text-gray-700">
                        <Clock className="h-3.5 w-3.5 text-gray-400" />
                        {timeAgo(log.timestamp)}
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5 ml-5">
                        {new Date(log.timestamp).toLocaleString('en-GB', {
                            day: '2-digit', month: 'short',
                            hour: '2-digit', minute: '2-digit',
                        })}
                    </p>
                </td>
                <td className="px-5 py-3">
                    <p className="text-sm font-medium text-gray-900">{log.actor_name}</p>
                    <p className="text-xs text-gray-500">{log.actor_email}</p>
                </td>
                <td className="px-5 py-3">
                    <Badge variant={ACTION_COLORS[log.action]} size="sm">
                        <span className="flex items-center gap-1">
                            <ActionIcon action={log.action} />
                            {log.action}
                        </span>
                    </Badge>
                </td>
                <td className="px-5 py-3">
                    <div className="flex items-center gap-1.5">
                        <ResourceIcon type={log.resource_type} />
                        <div>
                            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                                {log.resource_type.replace('_', ' ')}
                            </p>
                            <p className="text-sm text-gray-900">{log.resource_name}</p>
                        </div>
                    </div>
                </td>
                <td className="px-5 py-3">
                    {log.organization_name ? (
                        <p className="text-sm text-gray-700">{log.organization_name}</p>
                    ) : (
                        <span className="text-xs text-gray-400 italic">Platform</span>
                    )}
                </td>
                <td className="px-5 py-3">
                    <span className="text-xs font-mono text-gray-500">
                        {log.ip_address ?? '—'}
                    </span>
                </td>
                <td className="px-5 py-3">
                    {hasDetails && (
                        <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${expanded ? 'rotate-180' : ''}`} />
                    )}
                </td>
            </tr>

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