'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
    Building2, Users, Activity, AlertCircle,
    Globe, ShieldCheck, FileText, Zap, BarChart3, RefreshCw,
    CheckCircle2, XCircle, Settings,
} from 'lucide-react';
import { useOrganizations } from '@/app/core/hooks/useOrganizations';
import { useGlobalUserStats } from '@/app/core/hooks/useGlobalUsers';
import { usePlatformHealth } from '@/app/core/hooks/usePlatformHealth';
import { LoadingSpinner } from '@/app/components/ui/LoadingSpinner';
import { Organization } from '@/app/core/types/organization';
import { themeClasses } from '@/app/core/theme/themeClasses';
import { useAssistantPageContext } from '@/app/core/components/assistant/useAssistantPageContext';

const dashboardCardClass = `${themeClasses.dashboardCard} p-6`;
const dashboardMetricCardClass = `${themeClasses.dashboardMetricCard} cursor-pointer p-5 transition-shadow hover:shadow-md`;
const dashboardActionRowClass = `${themeClasses.dashboardActionRow} p-4`;

export default function SuperAdminDashboard() {
    const router = useRouter();

    const { organizations, loading: orgsLoading, refetch: refetchOrgs } = useOrganizations();
    const { stats: userStats, loading: userStatsLoading } = useGlobalUserStats();
    const { health, loading: healthLoading, refetch: refetchHealth } = usePlatformHealth();

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
    const assistantContext = useMemo(() => ({
        pageKey: 'superadmin_dashboard',
        pageTitle: 'System Command Center',
        state: {
            is_loading: loading,
            organization_count: organizations.length,
            suspended_organizations: suspendedOrgs,
            pending_platform_requests: health?.signals.pending_tier2_requests.count ?? 0,
        },
        visibleActions: [
            { label: 'Open Organizations', type: 'navigate' as const, href: '/superadmin/organizations' },
            { label: 'Open System Health', type: 'navigate' as const, href: '/superadmin/health' },
        ],
    }), [health?.signals.pending_tier2_requests.count, loading, organizations.length, suspendedOrgs]);

    useAssistantPageContext(assistantContext);

    if (loading) return <LoadingSpinner />;

    return (
        <>
            {/* Header */}
            <div className={`${dashboardCardClass} mb-6`}>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-purple-600 rounded-xl">
                            <ShieldCheck className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold theme-text">System Command Center</h1>
                            <p className="mt-0.5 flex items-center gap-1 text-sm theme-muted">
                                <Globe className="w-4 h-4" />
                                Managing {organizations.length} organizations
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={handleRefresh}
                        className="theme-focus-ring theme-button-ghost theme-hover-surface rounded-lg p-2 transition-colors hover:text-purple-600"
                    >
                        <RefreshCw className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Health banner */}
            {health && health.overall_severity !== 'OK' && (
                <div className={`mb-6 flex items-center gap-3 rounded-xl p-4 ${health.overall_severity === 'CRITICAL' ? 'theme-danger-surface text-[color:var(--color-danger)]' :
                    health.overall_severity === 'HIGH' ? 'theme-warning-surface text-[color:var(--color-warning)]' :
                        'theme-warning-surface text-[color:var(--color-warning)]'
                    }`}>
                    <AlertCircle className="w-5 h-5 shrink-0" />
                    <span className="text-sm font-medium theme-text">
                        Platform health: <strong>{health.overall_severity}</strong> —
                        {health.signals.pending_tier2_requests.count > 0 && ` ${health.signals.pending_tier2_requests.count} pending requests,`}
                        {health.signals.suspended_orgs.count > 0 && ` ${health.signals.suspended_orgs.count} suspended orgs,`}
                        {health.signals.orphan_users.count > 0 && ` ${health.signals.orphan_users.count} orphan users`}
                    </span>
                    <button
                        onClick={() => router.push('/superadmin/health')}
                        className="ml-auto text-sm font-semibold underline theme-text"
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
                    <div className={dashboardCardClass}>
                        <div className="flex items-center justify-between mb-5">
                            <div className="flex items-center gap-2">
                                <Building2 className="w-5 h-5 text-purple-600" />
                                <h3 className="text-lg font-bold theme-text">Recent Organizations</h3>
                            </div>
                            <button
                                onClick={() => router.push('/superadmin/organizations')}
                                className="text-sm font-medium text-purple-600 transition-colors hover:text-purple-500"
                            >
                                View all →
                            </button>
                        </div>
                        <div className="space-y-3">
                            {recentOrgs.length === 0 ? (
                                <p className="py-8 text-center text-sm theme-muted">No organizations yet</p>
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
                    <div className={dashboardCardClass}>
                        <div className="flex items-center gap-2 mb-5">
                            <Activity className="w-5 h-5 text-orange-500" />
                            <h3 className="text-lg font-bold theme-text">Health Signals</h3>
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
                            <p className="text-sm theme-muted">Health data unavailable</p>
                        )}
                    </div>

                    {/* Quick actions */}
                    <div className={dashboardCardClass}>
                        <div className="flex items-center gap-2 mb-5">
                            <Zap className="w-5 h-5 text-blue-500" />
                            <h3 className="text-lg font-bold theme-text">Quick Actions</h3>
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
        purple: 'bg-gradient-to-br from-purple-500 to-pink-500 text-white shadow-lg',
        blue: 'bg-gradient-to-br from-blue-500 to-cyan-500 text-white shadow-lg',
        green: 'bg-gradient-to-br from-green-500 to-emerald-500 text-white shadow-lg',
        orange: 'bg-gradient-to-br from-orange-500 to-red-500 text-white shadow-lg',
    };
    return (
        <div
            onClick={onClick}
            className={dashboardMetricCardClass}
        >
            <div className={`inline-flex p-2 rounded-lg mb-3 ${colors[color]}`}>
                <Icon className="w-5 h-5" />
            </div>
            <p className="text-2xl font-bold theme-text">{value}</p>
            <p className="mt-0.5 text-sm font-medium theme-muted">{title}</p>
            <p className="mt-1 text-xs theme-subtle">{subtitle}</p>
        </div>
    );
}

function OrgRow({ org, onClick }: { org: Organization; onClick: () => void }) {
    return (
        <div
            onClick={onClick}
            className="flex cursor-pointer items-center justify-between rounded-xl p-3 theme-surface-muted theme-hover-surface transition-colors"
        >
            <div className="flex-1 min-w-0">
                <p className="truncate text-sm font-semibold theme-text">{org.name}</p>
                <p className="mt-0.5 text-xs theme-muted">{org.member_count} members · {org.plan_type}</p>
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
        <div className="flex items-center justify-between rounded-xl p-3 theme-surface-muted">
            <span className="text-sm theme-muted">{label}</span>
            <div className="flex items-center gap-2">
                <span className="text-sm font-bold theme-text">{count}</span>
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
            className={`${dashboardActionRowClass} flex flex-col items-center gap-2`}
        >
            <Icon className="w-5 h-5 text-purple-600" />
            <span className="text-xs font-semibold theme-text">{label}</span>
        </button>
    );
}
