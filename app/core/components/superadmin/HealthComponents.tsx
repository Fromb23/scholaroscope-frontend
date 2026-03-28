'use client';

import {
    AlertTriangle, AlertCircle, CheckCircle2,
    ChevronDown, ChevronUp, Users, Building2,
    BarChart3, Puzzle, FileText,
} from 'lucide-react';
import { Card } from '@/app/components/ui/Card';
import { Badge } from '@/app/components/ui/Badge';
import type {
    SignalSeverity, OrphanUser, SuspendedOrg,
    GracePeriodPlugin, PendingRequest,
} from '@/app/core/api/platformHealth';

// ── Severity config ───────────────────────────────────────────────────────────

export const SEVERITY_CONFIG: Record<SignalSeverity, {
    color: string;
    bg: string;
    border: string;
    badge: 'danger' | 'warning' | 'info' | 'default' | 'success';
    icon: React.ElementType;
}> = {
    CRITICAL: { color: 'text-red-700', bg: 'bg-red-50', border: 'border-red-200', badge: 'danger', icon: AlertTriangle },
    HIGH: { color: 'text-orange-700', bg: 'bg-orange-50', border: 'border-orange-200', badge: 'warning', icon: AlertCircle },
    MEDIUM: { color: 'text-yellow-700', bg: 'bg-yellow-50', border: 'border-yellow-200', badge: 'warning', icon: AlertCircle },
    LOW: { color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-200', badge: 'info', icon: AlertCircle },
    OK: { color: 'text-green-700', bg: 'bg-green-50', border: 'border-green-200', badge: 'success', icon: CheckCircle2 },
};

export const OVERALL_CONFIG = {
    CRITICAL: { label: 'Critical Issues Detected', bg: 'bg-red-50', border: 'border-red-300', text: 'text-red-800' },
    HIGH: { label: 'High Priority Issues', bg: 'bg-orange-50', border: 'border-orange-300', text: 'text-orange-800' },
    MEDIUM: { label: 'Medium Priority Issues', bg: 'bg-yellow-50', border: 'border-yellow-300', text: 'text-yellow-800' },
    LOW: { label: 'Low Priority Issues', bg: 'bg-blue-50', border: 'border-blue-300', text: 'text-blue-800' },
    OK: { label: 'All Systems Operational', bg: 'bg-green-50', border: 'border-green-300', text: 'text-green-800' },
};

// ── Signal Card ───────────────────────────────────────────────────────────────

interface SignalCardProps {
    title: string;
    count: number;
    severity: SignalSeverity;
    icon: React.ElementType;
    description: string;
    expanded: boolean;
    onToggle: () => void;
    children: React.ReactNode;
}

export function SignalCard({
    title, count, severity, icon: Icon,
    description, expanded, onToggle, children,
}: SignalCardProps) {
    const cfg = SEVERITY_CONFIG[severity];
    return (
        <Card className="overflow-hidden">
            <button
                onClick={onToggle}
                className="w-full flex items-center justify-between p-5 hover:bg-gray-50 transition-colors"
            >
                <div className="flex items-center gap-4">
                    <div className={`p-2.5 rounded-xl ${cfg.bg} ${cfg.border} border`}>
                        <Icon className={`h-5 w-5 ${cfg.color}`} />
                    </div>
                    <div className="text-left">
                        <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold text-gray-900">{title}</p>
                            <Badge variant={cfg.badge}>{severity}</Badge>
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">{description}</p>
                    </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                    <span className={`text-2xl font-bold ${count > 0 ? cfg.color : 'text-gray-400'}`}>
                        {count}
                    </span>
                    {count > 0 && (
                        expanded
                            ? <ChevronUp className="h-4 w-4 text-gray-400" />
                            : <ChevronDown className="h-4 w-4 text-gray-400" />
                    )}
                </div>
            </button>
            {expanded && count > 0 && (
                <div className={`border-t ${cfg.border} ${cfg.bg} p-4`}>
                    {children}
                </div>
            )}
        </Card>
    );
}

// ── Drill-down tables ─────────────────────────────────────────────────────────

const REASON_LABELS: Record<string, string> = {
    USER_REQUESTED: 'User Requested',
    POLICY_VIOLATION: 'Policy Violation',
    PAYMENT_ISSUE: 'Payment Issue',
    ADMIN_ACTION: 'Admin Action',
};

export function OrphanUsersTable({ users }: { users: OrphanUser[] }) {
    return (
        <div className="space-y-2">
            {users.map(u => (
                <div key={u.id} className="flex items-center justify-between p-3 bg-white rounded-lg border border-red-100">
                    <div>
                        <p className="text-sm font-medium text-gray-900">{u.full_name}</p>
                        <p className="text-xs text-gray-500">{u.email}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-xs text-gray-500">
                            Joined {new Date(u.date_joined).toLocaleDateString('en-GB', {
                                day: '2-digit', month: 'short', year: 'numeric',
                            })}
                        </p>
                        <p className="text-xs text-gray-400">
                            {u.last_login
                                ? `Last login ${new Date(u.last_login).toLocaleDateString('en-GB')}`
                                : 'Never logged in'
                            }
                        </p>
                    </div>
                </div>
            ))}
        </div>
    );
}

export function SuspendedOrgsTable({ orgs }: { orgs: SuspendedOrg[] }) {
    return (
        <div className="space-y-2">
            {orgs.map(o => (
                <div key={o.id} className="flex items-center justify-between p-3 bg-white rounded-lg border border-orange-100">
                    <div>
                        <p className="text-sm font-medium text-gray-900">{o.name}</p>
                        <p className="text-xs text-gray-500">
                            {o.suspension_reason
                                ? REASON_LABELS[o.suspension_reason] ?? o.suspension_reason
                                : 'No reason given'
                            }
                        </p>
                    </div>
                    <div className="text-right">
                        <p className="text-xs text-gray-500">
                            {o.affected_users} affected user{o.affected_users !== 1 ? 's' : ''}
                        </p>
                        <p className="text-xs text-gray-400">
                            Since {new Date(o.suspended_since).toLocaleDateString('en-GB')}
                        </p>
                    </div>
                </div>
            ))}
        </div>
    );
}

export function StaleSummariesBreakdown({
    breakdown,
}: {
    breakdown: { grade_summaries: number; attendance_summaries: number };
}) {
    return (
        <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-white rounded-lg border border-yellow-100 text-center">
                <p className="text-2xl font-bold text-yellow-700">{breakdown.grade_summaries}</p>
                <p className="text-xs text-gray-500 mt-0.5">Stale Grade Summaries</p>
            </div>
            <div className="p-3 bg-white rounded-lg border border-yellow-100 text-center">
                <p className="text-2xl font-bold text-yellow-700">{breakdown.attendance_summaries}</p>
                <p className="text-xs text-gray-500 mt-0.5">Stale Attendance Summaries</p>
            </div>
        </div>
    );
}

export function GracePeriodTable({ plugins }: { plugins: GracePeriodPlugin[] }) {
    return (
        <div className="space-y-2">
            {plugins.map(p => {
                const daysLeft = Math.max(0, Math.ceil(
                    (new Date(p.data_retention_until).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
                ));
                return (
                    <div key={p.id} className="flex items-center justify-between p-3 bg-white rounded-lg border border-blue-100">
                        <div>
                            <p className="text-sm font-medium text-gray-900">{p.plugin}</p>
                            <p className="text-xs text-gray-500">{p.organization}</p>
                        </div>
                        <div className="text-right">
                            <p className={`text-xs font-medium ${daysLeft <= 3 ? 'text-red-600' : 'text-blue-600'}`}>
                                {daysLeft} day{daysLeft !== 1 ? 's' : ''} remaining
                            </p>
                            <p className="text-xs text-gray-400">
                                Purge: {new Date(p.data_retention_until).toLocaleDateString('en-GB')}
                            </p>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

export function PendingRequestsTable({ requests }: { requests: PendingRequest[] }) {
    return (
        <div className="space-y-2">
            {requests.map(r => (
                <div key={r.id} className="flex items-center justify-between p-3 bg-white rounded-lg border border-yellow-100">
                    <div>
                        <p className="text-sm font-medium text-gray-900">
                            {r.request_type.replace(/_/g, ' ')}
                        </p>
                        <p className="text-xs text-gray-500">{r.organization__name}</p>
                    </div>
                    <p className="text-xs text-gray-400">
                        {new Date(r.created_at).toLocaleDateString('en-GB')}
                    </p>
                </div>
            ))}
        </div>
    );
}