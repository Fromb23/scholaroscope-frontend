'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext';
import {
    Building2, Users, Activity, TrendingUp, AlertCircle,
    Globe, Database, ShieldCheck, Settings, FileText,
    Clock, CheckCircle2, XCircle, DollarSign, Zap,
    BarChart3, Eye, Ban, RefreshCw
} from 'lucide-react';

export default function SuperAdminDashboard() {
    const router = useRouter();
    const { user } = useAuth();
    const [lastRefresh, setLastRefresh] = useState(new Date());

    // Placeholder metrics - replace with actual API calls
    const metrics = {
        organizations: {
            total: 45,
            active: 38,
            suspended: 7,
            trial: 12
        },
        users: {
            total: 2847,
            admins: 45,
            instructors: 312,
            active: 2690
        },
        system: {
            uptime: '99.9%',
            storage: '2.4 TB',
            apiCalls: '1.2M',
            errorRate: '0.03%'
        },
        revenue: {
            monthly: '$45,200',
            growth: '+12.4%',
            churn: '2.1%'
        }
    };

    const recentOrganizations = [
        { id: 1, name: 'Olympic High School', status: 'active', users: 245, plan: 'Premium', lastActive: '2 mins ago' },
        { id: 2, name: 'Sunrise Academy', status: 'active', users: 189, plan: 'Standard', lastActive: '15 mins ago' },
        { id: 3, name: 'Greenfield Institute', status: 'trial', users: 67, plan: 'Trial', lastActive: '1 hour ago' },
        { id: 4, name: 'Mountain View School', status: 'suspended', users: 0, plan: 'Premium', lastActive: '3 days ago' }
    ];

    const systemAlerts = [
        { id: 1, type: 'warning', message: 'High API usage detected for Olympic High', time: '5 mins ago' },
        { id: 2, type: 'error', message: 'Payment failed for 3 organizations', time: '1 hour ago' },
        { id: 3, type: 'info', message: 'System maintenance scheduled for tonight', time: '2 hours ago' }
    ];

    if (user?.role !== 'SUPERADMIN') {
        router.push('/dashboard');
        return null;
    }

    return (
        <>
            {/* Decorative background - REMOVED from component, will be in layout if needed */}

            {/* Header */}
            <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl border border-white/50 p-8 mb-6">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                    <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-3 bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl shadow-lg">
                                <ShieldCheck className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-purple-900 via-pink-900 to-purple-900 bg-clip-text text-transparent">
                                    System Command Center
                                </h1>
                                <p className="text-gray-600 mt-1 flex items-center gap-2">
                                    <Globe className="w-4 h-4" />
                                    Managing {metrics.organizations.total} organizations across the platform
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setLastRefresh(new Date())}
                            className="p-3 text-gray-600 hover:text-purple-600 hover:bg-purple-50 rounded-xl transition-all duration-300 hover:scale-110"
                        >
                            <RefreshCw className="w-5 h-5" />
                        </button>

                        <div className="hidden lg:block text-right px-4 py-2 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border border-purple-100">
                            <p className="text-sm font-semibold text-gray-900">
                                {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                            </p>
                            <p className="text-xs text-gray-500">
                                Updated {lastRefresh.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                <MetricCard
                    title="Total Organizations"
                    value={metrics.organizations.total}
                    subtitle={`${metrics.organizations.active} active • ${metrics.organizations.suspended} suspended`}
                    icon={Building2}
                    gradient="from-purple-500 to-pink-500"
                    onClick={() => router.push('/superadmin/organizations')}
                />

                <MetricCard
                    title="Platform Users"
                    value={metrics.users.total.toLocaleString()}
                    subtitle={`${metrics.users.active.toLocaleString()} active today`}
                    icon={Users}
                    gradient="from-blue-500 to-cyan-500"
                    onClick={() => router.push('/superadmin/users')}
                />

                <MetricCard
                    title="Monthly Revenue"
                    value={metrics.revenue.monthly}
                    subtitle={`${metrics.revenue.growth} growth`}
                    icon={DollarSign}
                    gradient="from-green-500 to-emerald-500"
                    onClick={() => router.push('/superadmin/subscriptions')}
                />

                <MetricCard
                    title="System Health"
                    value={metrics.system.uptime}
                    subtitle={`${metrics.system.apiCalls} API calls today`}
                    icon={Activity}
                    gradient="from-orange-500 to-red-500"
                    onClick={() => router.push('/superadmin/health')}
                />
            </div>

            {/* Main Content */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-6">
                {/* Left Column */}
                <div className="xl:col-span-2 space-y-6">
                    {/* Organizations Table */}
                    <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/50 p-6">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl">
                                    <Building2 className="w-5 h-5 text-white" />
                                </div>
                                <h3 className="text-xl font-bold text-gray-900">Recent Organizations</h3>
                            </div>
                            <button
                                onClick={() => router.push('/superadmin/organizations')}
                                className="text-sm text-purple-600 hover:text-purple-700 font-semibold flex items-center gap-1 hover:gap-2 transition-all"
                            >
                                View All →
                            </button>
                        </div>

                        <div className="space-y-3">
                            {recentOrganizations.map(org => (
                                <div
                                    key={org.id}
                                    className="group p-4 bg-gradient-to-r from-gray-50 to-purple-50 hover:from-purple-100 hover:to-pink-100 rounded-xl border border-gray-200 transition-all hover:scale-[1.02] cursor-pointer"
                                    onClick={() => router.push(`/superadmin/organizations/${org.id}`)}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3">
                                                <p className="font-bold text-gray-900">{org.name}</p>
                                                <StatusBadge status={org.status} />
                                            </div>
                                            <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                                                <span className="flex items-center gap-1">
                                                    <Users className="w-4 h-4" />
                                                    {org.users} users
                                                </span>
                                                <span>•</span>
                                                <span>{org.plan}</span>
                                                <span>•</span>
                                                <span className="flex items-center gap-1">
                                                    <Clock className="w-3 h-3" />
                                                    {org.lastActive}
                                                </span>
                                            </div>
                                        </div>
                                        <Eye className="w-5 h-5 text-gray-400 group-hover:text-purple-600 transition-colors" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* System Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <SystemStatCard
                            title="Storage Usage"
                            value={metrics.system.storage}
                            subtitle="Across all organizations"
                            icon={Database}
                            color="purple"
                        />
                        <SystemStatCard
                            title="Error Rate"
                            value={metrics.system.errorRate}
                            subtitle="Last 24 hours"
                            icon={AlertCircle}
                            color="orange"
                        />
                    </div>
                </div>

                {/* Right Column */}
                <div className="space-y-6">
                    {/* System Alerts */}
                    <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/50 p-6">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl">
                                <AlertCircle className="w-5 h-5 text-white" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900">System Alerts</h3>
                        </div>

                        <div className="space-y-3">
                            {systemAlerts.map(alert => (
                                <AlertItem key={alert.id} alert={alert} />
                            ))}
                        </div>
                    </div>

                    {/* Quick Actions */}
                    <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/50 p-6">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl">
                                <Zap className="w-5 h-5 text-white" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900">Quick Actions</h3>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <QuickActionButton
                                icon={Building2}
                                label="New Org"
                                onClick={() => router.push('/superadmin/organizations/new')}
                            />
                            <QuickActionButton
                                icon={Settings}
                                label="Settings"
                                onClick={() => router.push('/superadmin/settings')}
                            />
                            <QuickActionButton
                                icon={FileText}
                                label="Audit Log"
                                onClick={() => router.push('/superadmin/audit')}
                            />
                            <QuickActionButton
                                icon={BarChart3}
                                label="Analytics"
                                onClick={() => router.push('/superadmin/analytics')}
                            />
                        </div>
                    </div>

                    {/* Platform Stats */}
                    <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/50 p-6">
                        <h3 className="text-lg font-bold text-gray-900 mb-4">Platform Overview</h3>
                        <div className="space-y-3">
                            <StatRow label="Trial Organizations" value={metrics.organizations.trial} color="blue" />
                            <StatRow label="Admin Users" value={metrics.users.admins} color="purple" />
                            <StatRow label="Instructors" value={metrics.users.instructors} color="green" />
                            <StatRow label="Churn Rate" value={metrics.revenue.churn} color="orange" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Coming Soon Notice */}
            <div className="bg-gradient-to-r from-purple-100 to-pink-100 rounded-2xl p-6 border border-purple-200">
                <p className="text-center text-gray-700">
                    <span className="font-bold text-purple-600">🚀 More Features Coming Soon:</span> Organization management, user controls, subscription handling, global settings, audit logs, and advanced analytics.
                </p>
            </div>
        </>
    );
}

// Helper Components
function MetricCard({ title, value, subtitle, icon: Icon, gradient, onClick }: any) {
    return (
        <div
            onClick={onClick}
            className="group relative bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/50 p-6 cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-2xl overflow-hidden"
        >
            <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-300`}></div>
            <div className="relative">
                <div className={`p-3 bg-gradient-to-br ${gradient} rounded-xl shadow-lg group-hover:scale-110 transition-transform duration-300 inline-block mb-4`}>
                    <Icon className="w-6 h-6 text-white" />
                </div>
                <p className="text-sm font-medium text-gray-600 mb-2">{title}</p>
                <p className="text-4xl font-bold text-gray-900 mb-2">{value}</p>
                <p className="text-xs text-gray-500">{subtitle}</p>
            </div>
        </div>
    );
}

function StatusBadge({ status }: { status: string }) {
    const styles = {
        active: 'bg-green-100 text-green-700 border-green-200',
        suspended: 'bg-red-100 text-red-700 border-red-200',
        trial: 'bg-blue-100 text-blue-700 border-blue-200'
    };

    return (
        <span className={`px-2 py-1 rounded-full text-xs font-bold border ${styles[status as keyof typeof styles]}`}>
            {status.charAt(0).toUpperCase() + status.slice(1)}
        </span>
    );
}

function AlertItem({ alert }: any) {
    const styles = {
        warning: 'bg-amber-50 border-amber-200 text-amber-800',
        error: 'bg-red-50 border-red-200 text-red-800',
        info: 'bg-blue-50 border-blue-200 text-blue-800'
    };

    return (
        <div className={`p-3 rounded-xl border ${styles[alert.type as keyof typeof styles]}`}>
            <p className="text-sm font-medium">{alert.message}</p>
            <p className="text-xs mt-1 opacity-75">{alert.time}</p>
        </div>
    );
}

function SystemStatCard({ title, value, subtitle, icon: Icon, color }: any) {
    const colors = {
        purple: 'from-purple-500 to-pink-500',
        orange: 'from-orange-500 to-red-500'
    };

    return (
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/50 p-6">
            <div className="flex items-center gap-3 mb-4">
                <div className={`p-2 bg-gradient-to-br ${colors[color as keyof typeof colors]} rounded-xl`}>
                    <Icon className="w-5 h-5 text-white" />
                </div>
                <h3 className="font-bold text-gray-900">{title}</h3>
            </div>
            <p className="text-3xl font-bold text-gray-900 mb-1">{value}</p>
            <p className="text-xs text-gray-500">{subtitle}</p>
        </div>
    );
}

function QuickActionButton({ icon: Icon, label, onClick }: any) {
    return (
        <button
            onClick={onClick}
            className="p-4 bg-gradient-to-br from-gray-50 to-purple-50 hover:from-purple-100 hover:to-pink-100 rounded-xl border border-gray-200 transition-all hover:scale-105 flex flex-col items-center gap-2"
        >
            <Icon className="w-5 h-5 text-purple-600" />
            <span className="text-xs font-semibold text-gray-700">{label}</span>
        </button>
    );
}

function StatRow({ label, value, color }: any) {
    const colors = {
        blue: 'bg-blue-100 text-blue-700',
        purple: 'bg-purple-100 text-purple-700',
        green: 'bg-green-100 text-green-700',
        orange: 'bg-orange-100 text-orange-700'
    };

    return (
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
            <span className="text-sm text-gray-700">{label}</span>
            <span className={`px-3 py-1 rounded-full text-sm font-bold ${colors[color as keyof typeof colors]}`}>
                {value}
            </span>
        </div>
    );
}