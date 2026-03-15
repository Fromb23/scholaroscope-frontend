'use client';

// ============================================================================
// app/(dashboard)/superadmin/health/page.tsx
// Route: /superadmin/health
// Strategy: Derives real health indicators from existing API data
//           (organizations + users). Infrastructure metrics show as
//           "Monitoring not configured" until a backend health endpoint exists.
// ============================================================================

import { useEffect, useState } from 'react';
import {
    Activity, Server, Database, Zap, AlertCircle, CheckCircle,
    Building2, Users, TrendingUp, TrendingDown, Minus,
    RefreshCw, Clock, AlertTriangle, ShieldCheck,
} from 'lucide-react';
import { useOrganizations } from '@/app/core/hooks/useOrganizations';
import { useGlobalUsers } from '@/app/core/hooks/useGlobalUsers';
import { Card, CardHeader, CardTitle, CardContent } from '@/app/components/ui/Card';
import { Badge } from '@/app/components/ui/Badge';
import { Button } from '@/app/components/ui/Button';

// ============================================================================
// Types
// ============================================================================
type HealthStatus = 'healthy' | 'warning' | 'critical' | 'unknown';

interface ServiceStatus {
    name: string;
    status: HealthStatus;
    message: string;
    icon: any;
}

// ============================================================================
// Helpers
// ============================================================================
function statusColor(s: HealthStatus) {
    return {
        healthy: 'text-green-600 bg-green-50 border-green-200',
        warning: 'text-yellow-600 bg-yellow-50 border-yellow-200',
        critical: 'text-red-600 bg-red-50 border-red-200',
        unknown: 'text-gray-500 bg-gray-50 border-gray-200',
    }[s];
}

function StatusDot({ status }: { status: HealthStatus }) {
    const colors = {
        healthy: 'bg-green-500',
        warning: 'bg-yellow-500',
        critical: 'bg-red-500',
        unknown: 'bg-gray-400',
    };
    return (
        <span className="relative flex h-2.5 w-2.5">
            {status === 'healthy' && (
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${colors[status]} opacity-50`} />
            )}
            <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${colors[status]}`} />
        </span>
    );
}

// ============================================================================
// Metric Card
// ============================================================================
function MetricCard({ label, value, sub, icon: Icon, color, trend }: {
    label: string; value: string | number; sub?: string;
    icon: any; color: string; trend?: 'up' | 'down' | 'neutral';
}) {
    return (
        <Card className="py-5 px-5">
            <div className="flex items-start justify-between">
                <div className={`p-2.5 rounded-xl ${color}`}>
                    <Icon className="h-5 w-5" />
                </div>
                {trend && (
                    <div className={`flex items-center gap-1 text-xs font-medium ${trend === 'up' ? 'text-green-600' : trend === 'down' ? 'text-red-600' : 'text-gray-400'
                        }`}>
                        {trend === 'up' ? <TrendingUp className="h-3.5 w-3.5" /> :
                            trend === 'down' ? <TrendingDown className="h-3.5 w-3.5" /> :
                                <Minus className="h-3.5 w-3.5" />}
                    </div>
                )}
            </div>
            <p className="text-2xl font-bold text-gray-900 mt-3">{value}</p>
            <p className="text-sm font-medium text-gray-700 mt-0.5">{label}</p>
            {sub && <p className="text-xs text-gray-500 mt-0.5">{sub}</p>}
        </Card>
    );
}

// ============================================================================
// Service Status Row
// ============================================================================
function ServiceRow({ service }: { service: ServiceStatus }) {
    return (
        <div className={`flex items-center justify-between p-4 rounded-xl border ${statusColor(service.status)}`}>
            <div className="flex items-center gap-3">
                <service.icon className="h-5 w-5" />
                <div>
                    <p className="text-sm font-semibold">{service.name}</p>
                    <p className="text-xs opacity-80">{service.message}</p>
                </div>
            </div>
            <div className="flex items-center gap-2">
                <StatusDot status={service.status} />
                <span className="text-xs font-semibold uppercase tracking-wide">
                    {service.status}
                </span>
            </div>
        </div>
    );
}

// ============================================================================
// Main Page
// ============================================================================
export default function SystemHealthPage() {
    const { organizations, loading: orgsLoading, error: orgsError, refetch: refetchOrgs } = useOrganizations();
    const { users, loading: usersLoading, error: usersError, refetch: refetchUsers } = useGlobalUsers();

    const [lastRefresh, setLastRefresh] = useState(new Date());
    const [refreshing, setRefreshing] = useState(false);

    const handleRefresh = async () => {
        setRefreshing(true);
        await Promise.all([refetchOrgs(), refetchUsers()]);
        setLastRefresh(new Date());
        setRefreshing(false);
    };

    const loading = orgsLoading || usersLoading;

    // Derived platform metrics from real data
    const activeOrgs = organizations.filter(o => o.is_active).length;
    const suspendedOrgs = organizations.filter(o => !o.is_active).length;
    const activeUsers = users.filter(u => u.is_active).length;
    const inactiveUsers = users.filter(u => !u.is_active).length;
    const admins = users.filter(u => u.role === 'ADMIN').length;
    const instructors = users.filter(u => u.role === 'INSTRUCTOR').length;

    // Health score: weighted % of active orgs + active users
    const healthScore = organizations.length > 0 && users.length > 0
        ? Math.round(
            ((activeOrgs / organizations.length) * 0.5 +
                (activeUsers / users.length) * 0.5) * 100
        )
        : null;

    const overallStatus: HealthStatus =
        healthScore === null ? 'unknown' :
            healthScore >= 90 ? 'healthy' :
                healthScore >= 70 ? 'warning' : 'critical';

    // API health derived from whether our calls succeeded
    const apiStatus: HealthStatus = (!orgsError && !usersError) ? 'healthy' : 'critical';

    const services: ServiceStatus[] = [
        {
            name: 'API Server',
            status: apiStatus,
            message: apiStatus === 'healthy'
                ? 'All endpoints responding normally'
                : 'One or more endpoints returned errors',
            icon: Server,
        },
        {
            name: 'Database',
            status: apiStatus === 'healthy' ? 'healthy' : 'warning',
            message: apiStatus === 'healthy'
                ? 'Queries completing successfully'
                : 'Unable to verify — API errors present',
            icon: Database,
        },
        {
            name: 'Authentication',
            status: 'healthy',  // We're logged in, so auth works
            message: 'JWT authentication operational',
            icon: ShieldCheck,
        },
        {
            name: 'Infrastructure Metrics',
            status: 'unknown',
            message: 'No monitoring endpoint configured yet',
            icon: Zap,
        },
    ];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">System Health</h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Platform performance and operational status
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5 text-xs text-gray-500">
                        <Clock className="h-3.5 w-3.5" />
                        Last updated: {lastRefresh.toLocaleTimeString('en-GB', {
                            hour: '2-digit', minute: '2-digit', second: '2-digit',
                        })}
                    </div>
                    <Button
                        variant="secondary" size="sm" onClick={handleRefresh}
                        disabled={refreshing} className="gap-2"
                    >
                        <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
                        Refresh
                    </Button>
                </div>
            </div>

            {/* Overall health banner */}
            {!loading && (
                <div className={`flex items-center justify-between p-5 rounded-xl border-2 ${overallStatus === 'healthy' ? 'bg-green-50 border-green-300' :
                    overallStatus === 'warning' ? 'bg-yellow-50 border-yellow-300' :
                        overallStatus === 'critical' ? 'bg-red-50 border-red-300' :
                            'bg-gray-50 border-gray-300'
                    }`}>
                    <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-xl ${overallStatus === 'healthy' ? 'bg-green-100' :
                            overallStatus === 'warning' ? 'bg-yellow-100' :
                                'bg-red-100'
                            }`}>
                            {overallStatus === 'healthy'
                                ? <CheckCircle className="h-6 w-6 text-green-600" />
                                : <AlertTriangle className="h-6 w-6 text-yellow-600" />
                            }
                        </div>
                        <div>
                            <p className={`text-lg font-bold ${overallStatus === 'healthy' ? 'text-green-800' :
                                overallStatus === 'warning' ? 'text-yellow-800' : 'text-red-800'
                                }`}>
                                {overallStatus === 'healthy' ? 'All Systems Operational' :
                                    overallStatus === 'warning' ? 'Partial Issues Detected' :
                                        overallStatus === 'unknown' ? 'Status Unknown' :
                                            'Critical Issues Detected'}
                            </p>
                            <p className="text-sm opacity-80">
                                Platform health score: {healthScore !== null ? `${healthScore}%` : 'Calculating...'}
                            </p>
                        </div>
                    </div>
                    <StatusDot status={overallStatus} />
                </div>
            )}

            {/* Platform metrics from real data */}
            <div>
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
                    Platform Metrics
                </h2>
                {loading ? (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        {Array(4).fill(0).map((_, i) => (
                            <Card key={i} className="py-5 px-5 animate-pulse">
                                <div className="h-10 w-10 bg-gray-200 rounded-xl mb-3" />
                                <div className="h-7 w-16 bg-gray-200 rounded mb-1" />
                                <div className="h-4 w-24 bg-gray-100 rounded" />
                            </Card>
                        ))}
                    </div>
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <MetricCard
                            label="Total Organizations"
                            value={organizations.length}
                            sub={`${activeOrgs} active · ${suspendedOrgs} suspended`}
                            icon={Building2}
                            color="bg-purple-100 text-purple-600"
                            trend={activeOrgs > suspendedOrgs ? 'up' : 'neutral'}
                        />
                        <MetricCard
                            label="Total Users"
                            value={users.length}
                            sub={`${activeUsers} active · ${inactiveUsers} inactive`}
                            icon={Users}
                            color="bg-blue-100 text-blue-600"
                            trend="up"
                        />
                        <MetricCard
                            label="Organization Admins"
                            value={admins}
                            sub="Across all organizations"
                            icon={AlertCircle}
                            color="bg-orange-100 text-orange-600"
                        />
                        <MetricCard
                            label="Instructors"
                            value={instructors}
                            sub="Active teaching staff"
                            icon={Activity}
                            color="bg-green-100 text-green-600"
                        />
                    </div>
                )}
            </div>

            {/* Service statuses */}
            <div>
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
                    Service Status
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {services.map(s => (
                        <ServiceRow key={s.name} service={s} />
                    ))}
                </div>
            </div>

            {/* Org health breakdown */}
            {!loading && organizations.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Organization Health</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {organizations.slice(0, 8).map(org => {
                                const orgUsers = users.filter(u => u.organization === org.id);
                                const orgActive = orgUsers.filter(u => u.is_active).length;
                                const pct = orgUsers.length > 0
                                    ? Math.round((orgActive / orgUsers.length) * 100)
                                    : 100;
                                const st: HealthStatus = !org.is_active ? 'critical'
                                    : pct >= 80 ? 'healthy'
                                        : pct >= 50 ? 'warning'
                                            : 'critical';

                                return (
                                    <div key={org.id} className="flex items-center gap-3">
                                        <StatusDot status={st} />
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between mb-1">
                                                <p className="text-sm font-medium text-gray-900 truncate">{org.name}</p>
                                                <div className="flex items-center gap-2 ml-2">
                                                    <span className="text-xs text-gray-500">{orgActive}/{orgUsers.length} users</span>
                                                    <Badge variant={org.is_active ? 'success' : 'danger'} size="sm">
                                                        {org.is_active ? 'Active' : 'Suspended'}
                                                    </Badge>
                                                </div>
                                            </div>
                                            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full rounded-full transition-all ${st === 'healthy' ? 'bg-green-500' :
                                                        st === 'warning' ? 'bg-yellow-500' : 'bg-red-500'
                                                        }`}
                                                    style={{ width: `${pct}%` }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                            {organizations.length > 8 && (
                                <p className="text-xs text-gray-500 text-center pt-1">
                                    +{organizations.length - 8} more organizations
                                </p>
                            )}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Infrastructure note */}
            <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <Zap className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-blue-800">
                    <strong>Infrastructure metrics</strong> (CPU, memory, response times, error rates) require
                    a dedicated health endpoint on the backend. Add{' '}
                    <code className="bg-blue-100 px-1 rounded text-xs">GET /api/health/</code> to enable
                    real-time server monitoring.
                </p>
            </div>
        </div>
    );
}