'use client';

import { useState } from 'react';
import {
    AlertTriangle, CheckCircle2, RefreshCw,
    Users, Building2, BarChart3, Puzzle, FileText,
} from 'lucide-react';
import { usePlatformHealth } from '@/app/core/hooks/usePlatformHealth';
import { Button } from '@/app/components/ui/Button';
import { LoadingSpinner } from '@/app/components/ui/LoadingSpinner';
import { ErrorState } from '@/app/components/ui/ErrorState';
import {
    SignalCard, OVERALL_CONFIG,
    OrphanUsersTable, SuspendedOrgsTable,
    StaleSummariesBreakdown, GracePeriodTable,
    PendingRequestsTable,
} from '@/app/core/components/superadmin/HealthComponents';

export default function SystemHealthPage() {
    const { health, loading, error, refetch } = usePlatformHealth();
    const [refreshing, setRefreshing] = useState(false);
    const [expanded, setExpanded] = useState<Record<string, boolean>>({});

    const toggle = (key: string) =>
        setExpanded(prev => ({ ...prev, [key]: !prev[key] }));

    const handleRefresh = async () => {
        setRefreshing(true);
        await refetch();
        setRefreshing(false);
    };

    if (loading) return <LoadingSpinner />;
    if (error) return <ErrorState message={error} onRetry={refetch} />;
    if (!health) return null;

    const { signals, overall_severity } = health;
    const overallCfg = OVERALL_CONFIG[overall_severity];

    return (
        <div className="space-y-6">

            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">System Health</h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Platform invariant signals — actionable anomalies only
                    </p>
                </div>
                <Button
                    variant="secondary" size="sm"
                    onClick={handleRefresh} disabled={refreshing}
                    className="gap-2"
                >
                    <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
                    Refresh
                </Button>
            </div>

            {/* Overall status banner */}
            <div className={`flex items-center gap-4 p-5 rounded-xl border-2 ${overallCfg.bg} ${overallCfg.border}`}>
                <div className="p-3 rounded-xl bg-white/60">
                    {overall_severity === 'OK'
                        ? <CheckCircle2 className={`h-6 w-6 ${overallCfg.text}`} />
                        : <AlertTriangle className={`h-6 w-6 ${overallCfg.text}`} />
                    }
                </div>
                <div>
                    <p className={`text-lg font-bold ${overallCfg.text}`}>{overallCfg.label}</p>
                    <p className={`text-sm opacity-80 ${overallCfg.text}`}>
                        {overall_severity === 'OK'
                            ? 'No invariant violations detected.'
                            : 'Review signals below and take action.'
                        }
                    </p>
                </div>
            </div>

            {/* Signal cards */}
            <div className="space-y-3">
                <SignalCard
                    title="Orphan Users"
                    count={signals.orphan_users.count}
                    severity={signals.orphan_users.severity}
                    icon={Users}
                    description="Active users with no active membership in any organization"
                    expanded={!!expanded['orphans']}
                    onToggle={() => toggle('orphans')}
                >
                    <OrphanUsersTable users={signals.orphan_users.items ?? []} />
                </SignalCard>

                <SignalCard
                    title="Suspended Organizations"
                    count={signals.suspended_orgs.count}
                    severity={signals.suspended_orgs.severity}
                    icon={Building2}
                    description="Organizations currently suspended — members cannot access"
                    expanded={!!expanded['suspended']}
                    onToggle={() => toggle('suspended')}
                >
                    <SuspendedOrgsTable orgs={signals.suspended_orgs.items ?? []} />
                </SignalCard>

                <SignalCard
                    title="Stale Summaries"
                    count={signals.stale_summaries.count}
                    severity={signals.stale_summaries.severity}
                    icon={BarChart3}
                    description="Grade and attendance summaries with outdated computed data"
                    expanded={!!expanded['stale']}
                    onToggle={() => toggle('stale')}
                >
                    <StaleSummariesBreakdown breakdown={signals.stale_summaries.breakdown} />
                </SignalCard>

                <SignalCard
                    title="Plugins in Grace Period"
                    count={signals.plugins_in_grace_period.count}
                    severity={signals.plugins_in_grace_period.severity}
                    icon={Puzzle}
                    description="Uninstalled plugins with pending data purge — action required"
                    expanded={!!expanded['grace']}
                    onToggle={() => toggle('grace')}
                >
                    <GracePeriodTable plugins={signals.plugins_in_grace_period.items ?? []} />
                </SignalCard>

                <SignalCard
                    title="Pending Tier-2 Requests"
                    count={signals.pending_tier2_requests.count}
                    severity={signals.pending_tier2_requests.severity}
                    icon={FileText}
                    description="Admin-submitted escalations awaiting superadmin review"
                    expanded={!!expanded['requests']}
                    onToggle={() => toggle('requests')}
                >
                    <PendingRequestsTable requests={signals.pending_tier2_requests.items ?? []} />
                </SignalCard>
            </div>

        </div>
    );
}