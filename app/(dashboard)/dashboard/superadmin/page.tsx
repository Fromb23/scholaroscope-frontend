'use client';

import { useRouter } from 'next/navigation';
import {
    Building2, Users, Activity, AlertCircle,
    Globe, Database, ShieldCheck, FileText,
    Clock, Zap, BarChart3, RefreshCw,
    CheckCircle2, XCircle, Settings,
} from 'lucide-react';
import { useOrganizations } from '@/app/core/hooks/useOrganizations';
import { useGlobalUsers, useGlobalUserStats } from '@/app/core/hooks/useGlobalUsers';
import { usePlatformHealth } from '@/app/core/hooks/usePlatformHealth';
import { useAuditLogs } from '@/app/core/hooks/useAuditLogs';
import { LoadingSpinner } from '@/app/components/ui/LoadingSpinner';
import { Organization } from '@/app/core/types/organization';

export default function SuperAdminDashboard() {
    const router = useRouter();

    const { organizations, loading: orgsLoading, refetch: refetchOrgs } = useOrganizations();
    const { stats: userStats, loading: userStatsLoading } = useGlobalUserStats();
    const { health, loading: healthLoading, refetch: refetchHealth } = usePlatformHealth();
    const { logs: auditLogs, loading: auditLoading } = useAuditLogs();

    const loading = orgsLoading || userStatsLoading || healthLoading;

    const handleRefresh = () => {
        refetchOrgs();
        refetchHealth();
    };

    // Derived org metrics
    const activeOrgs = organizations.filter(o => o.status === 'ACTIVE').length;
    const suspendedOrgs = organizations.filter(o => o.status === 'SUSPENDED').length;
    const recentOrgs = [...organizations]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 4);

    if (loading) return <LoadingSpinner />;

    return (
        <>
            {/* Header */}
            <div className="bg-white rounded-2xl shadow border border-gray-100 p-6 mb-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-purple-600 rounded-xl">
                            <ShieldCheck className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">System Command Center</h1>
                            <p className="text-sm text-gray-500 flex items-center gap-1 mt-0.5">
                                <Globe className="w-4 h-4" />
                                Managing {organizations.length} organizations
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={handleRefresh}
                        className="p-2 text-gray-500 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                    >
                        <RefreshCw className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Health banner */}
            {health && health.overall_severity !== 'OK' && (
                <div className={`flex items-center gap-3 p-4 rounded-xl border mb-6 ${health.overall_severity === 'CRITICAL' ? 'bg-red-50 border-red-200 text-red-800' :
                    health.overall_severity === 'HIGH' ? 'bg-orange-50 border-orange-200 text-orange-800' :
                        'bg-amber-50 border-amber-200 text-amber-800'
                    }`}>
                    <AlertCircle className="w-5 h-5 shrink-0" />
                    <span className="text-sm font-medium">
                        Platform health: <strong>{health.overall_severity}</strong> —
                        {health.signals.pending_tier2_requests.count > 0 && ` ${health.signals.pending_tier2_requests.count} pending requests,`}
                        {health.signals.suspended_orgs.count > 0 && ` ${health.signals.suspended_orgs.count} suspended orgs,`}
                        {health.signals.orphan_users.count > 0 && ` ${health.signals.orphan_users.count} orphan users`}
                    </span>
                    <button
                        onClick={() => router.push('/superadmin/health')}
                        className="ml-auto text-sm font-semibold underline"
                    >
                        View details
                    </button>
                </div>
            )}

            {/* Key Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <MetricCard
                    title="Total Organizations"
                    value={organizations.length}
                    subtitle={`${activeOrgs} active · ${suspendedOrgs} suspended`}
                    icon={Building2}
                    color="purple"
                    onClick={() => router.push('/superadmin/organizations')}
                />
                <MetricCard
                    title="Platform Users"
                    value={userStats?.total_members ?? '—'}
                    subtitle={`${userStats?.active_members ?? 0} active`}
                    icon={Users}
                    color="blue"
                    onClick={() => router.push('/superadmin/users')}
                />
                <MetricCard
                    title="Platform Health"
                    value={health?.overall_severity ?? '—'}
                    subtitle={`${health?.signals.pending_tier2_requests.count ?? 0} pending requests`}
                    icon={Activity}
                    color={health?.overall_severity === 'OK' ? 'green' : 'orange'}
                    onClick={() => router.push('/superadmin/health')}
                />
                <MetricCard
                    title="Orphan Users"
                    value={health?.signals.orphan_users.count ?? 0}
                    subtitle="Users without org membership"
                    icon={AlertCircle}
                    color={health?.signals.orphan_users.count ? 'orange' : 'green'}
                    onClick={() => router.push('/superadmin/users')}
                />
            </div>

            {/* Main content */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                {/* Recent organizations */}
                <div className="xl:col-span-2">
                    <div className="bg-white rounded-2xl shadow border border-gray-100 p-6">
                        <div className="flex items-center justify-between mb-5">
                            <div className="flex items-center gap-2">
                                <Building2 className="w-5 h-5 text-purple-600" />
                                <h3 className="text-lg font-bold text-gray-900">Recent Organizations</h3>
                            </div>
                            <button
                                onClick={() => router.push('/superadmin/organizations')}
                                className="text-sm text-purple-600 hover:text-purple-700 font-medium"
                            >
                                View all →
                            </button>
                        </div>
                        <div className="space-y-3">
                            {recentOrgs.length === 0 ? (
                                <p className="text-sm text-gray-500 text-center py-8">No organizations yet</p>
                            ) : recentOrgs.map(org => (
                                <OrgRow
                                    key={org.id}
                                    org={org}
                                    onClick={() => router.push(`/superadmin/organizations/${org.id}`)}
                                />
                            ))}
                        </div>
                    </div>
                </div>

                {/* Right column */}
                <div className="space-y-6">
                    {/* Health signals */}
                    <div className="bg-white rounded-2xl shadow border border-gray-100 p-6">
                        <div className="flex items-center gap-2 mb-5">
                            <Activity className="w-5 h-5 text-orange-500" />
                            <h3 className="text-lg font-bold text-gray-900">Health Signals</h3>
                        </div>
                        {healthLoading ? (
                            <LoadingSpinner fullScreen={false} />
                        ) : health ? (
                            <div className="space-y-3">
                                <SignalRow
                                    label="Orphan Users"
                                    count={health.signals.orphan_users.count}
                                    severity={health.signals.orphan_users.severity}
                                />
                                <SignalRow
                                    label="Suspended Orgs"
                                    count={health.signals.suspended_orgs.count}
                                    severity={health.signals.suspended_orgs.severity}
                                />
                                <SignalRow
                                    label="Pending Requests"
                                    count={health.signals.pending_tier2_requests.count}
                                    severity={health.signals.pending_tier2_requests.severity}
                                />
                                <SignalRow
                                    label="Plugins in Grace Period"
                                    count={health.signals.plugins_in_grace_period.count}
                                    severity={health.signals.plugins_in_grace_period.severity}
                                />
                                <SignalRow
                                    label="Stale Summaries"
                                    count={health.signals.stale_summaries.count}
                                    severity={health.signals.stale_summaries.severity}
                                />
                            </div>
                        ) : (
                            <p className="text-sm text-gray-500">Health data unavailable</p>
                        )}
                    </div>

                    {/* Quick actions */}
                    <div className="bg-white rounded-2xl shadow border border-gray-100 p-6">
                        <div className="flex items-center gap-2 mb-5">
                            <Zap className="w-5 h-5 text-blue-500" />
                            <h3 className="text-lg font-bold text-gray-900">Quick Actions</h3>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <QuickAction icon={FileText} label="Audit Log" onClick={() => router.push('/superadmin/audit')} />
                            <QuickAction icon={Settings} label="Plugins" onClick={() => router.push('/superadmin/plugins')} />
                            <QuickAction icon={Users} label="Users" onClick={() => router.push('/superadmin/users')} />
                            <QuickAction icon={BarChart3} label="Health" onClick={() => router.push('/superadmin/health')} />
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}

// ── Sub-components ────────────────────────────────────────────────────────

function MetricCard({
    title, value, subtitle, icon: Icon, color, onClick
}: {
    title: string;
    value: string | number;
    subtitle: string;
    icon: React.ElementType;
    color: 'purple' | 'blue' | 'green' | 'orange';
    onClick: () => void;
}) {
    const colors = {
        purple: 'bg-purple-100 text-purple-600',
        blue: 'bg-blue-100 text-blue-600',
        green: 'bg-green-100 text-green-600',
        orange: 'bg-orange-100 text-orange-600',
    };
    return (
        <div
            onClick={onClick}
            className="bg-white rounded-2xl shadow border border-gray-100 p-5 cursor-pointer hover:shadow-md transition-shadow"
        >
            <div className={`inline-flex p-2 rounded-lg mb-3 ${colors[color]}`}>
                <Icon className="w-5 h-5" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
            <p className="text-sm font-medium text-gray-700 mt-0.5">{title}</p>
            <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
        </div>
    );
}

function OrgRow({ org, onClick }: { org: Organization; onClick: () => void }) {
    return (
        <div
            onClick={onClick}
            className="flex items-center justify-between p-3 rounded-xl border border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors"
        >
            <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">{org.name}</p>
                <p className="text-xs text-gray-500 mt-0.5">{org.member_count} members · {org.plan_type}</p>
            </div>
            <span className={`ml-3 px-2 py-1 rounded-full text-xs font-medium ${org.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                }`}>
                {org.status}
            </span>
        </div>
    );
}

function SignalRow({ label, count, severity }: { label: string; count: number; severity: string }) {
    const isOk = severity === 'OK' || count === 0;
    return (
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
            <span className="text-sm text-gray-700">{label}</span>
            <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-gray-900">{count}</span>
                {isOk
                    ? <CheckCircle2 className="w-4 h-4 text-green-500" />
                    : <XCircle className="w-4 h-4 text-red-500" />
                }
            </div>
        </div>
    );
}

function QuickAction({ icon: Icon, label, onClick }: { icon: React.ElementType; label: string; onClick: () => void }) {
    return (
        <button
            onClick={onClick}
            className="p-4 bg-gray-50 hover:bg-purple-50 rounded-xl border border-gray-200 hover:border-purple-200 transition-colors flex flex-col items-center gap-2"
        >
            <Icon className="w-5 h-5 text-purple-600" />
            <span className="text-xs font-semibold text-gray-700">{label}</span>
        </button>
    );
}