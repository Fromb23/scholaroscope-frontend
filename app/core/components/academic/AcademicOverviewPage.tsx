'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import {
    Calendar,
    BookOpen,
    Users,
    GraduationCap,
    Clock,
} from 'lucide-react';
import { Card } from '@/app/components/ui/Card';
import { StatsCard } from '@/app/components/dashboard/StatsCard';
import { AcademicSetupDashboard } from '@/app/core/components/academic/setup/AcademicSetupDashboard';
import { useAcademicYears, useCurricula, useCohorts, useTerms } from '@/app/core/hooks/useAcademic';
import { useAcademicSetupStatus } from '@/app/core/hooks/useAcademicSetupStatus';
import { Badge } from '@/app/components/ui/Badge';
import { StatStrip } from '@/app/components/dashboard/StatStrip';
import { getCurriculumBridgeName } from '@/app/core/lib/curriculumBridge';
import { useAssistantPageContext } from '@/app/core/components/assistant/useAssistantPageContext';

export default function AcademicOverview() {
    const academicSetupQuery = useAcademicSetupStatus();
    const { academicYears, loading: yearsLoading } = useAcademicYears();
    const { curricula, loading: curriculaLoading } = useCurricula();
    const { cohorts, loading: cohortsLoading } = useCohorts();
    const { terms, loading: termsLoading } = useTerms();

    const currentYear = academicYears.find(y => y.is_current);
    const activeCurricula = curricula.filter(c => c.is_active);
    const setupStatus = academicSetupQuery.data ?? null;
    const setupIncomplete = Boolean(setupStatus && !setupStatus.complete);

    const loading = yearsLoading || curriculaLoading || cohortsLoading || termsLoading || academicSetupQuery.isLoading;
    const assistantContext = useMemo(() => ({
        pageKey: 'academic_overview',
        pageTitle: 'Academic Management',
        state: {
            is_loading: loading,
            setup_incomplete: setupIncomplete,
            has_current_year: Boolean(currentYear),
            has_current_term: terms.length > 0,
            active_curricula_count: activeCurricula.length,
            cohort_count: cohorts.length,
        },
        visibleActions: setupIncomplete
            ? [{
                label: setupStatus?.next_action.label ?? 'Open Academic Setup',
                type: 'navigate' as const,
                href: setupStatus?.next_action.href ?? '/admin/settings?tab=plugins&from=academic-setup',
            }]
            : [
                { label: 'Open Terms', type: 'navigate' as const, href: '/academic/terms' },
                { label: 'Open Academic Years', type: 'navigate' as const, href: '/academic/years' },
            ],
        nextSafeAction: setupIncomplete
            ? {
                label: setupStatus?.next_action.label ?? 'Open Academic Setup',
                type: 'navigate' as const,
                href: setupStatus?.next_action.href ?? '/admin/settings?tab=plugins&from=academic-setup',
            }
            : (!terms.length
                ? { label: 'Open Terms', type: 'navigate' as const, href: '/academic/terms' }
                : { label: 'Open Academic Years', type: 'navigate' as const, href: '/academic/years' }),
        workflowStep: 'academic_setup',
        emptyStateReason: setupIncomplete
            ? 'Complete academic setup before operational academic management unlocks.'
            : (!loading && !currentYear
            ? 'No current academic year is active yet.'
            : undefined),
    }), [activeCurricula.length, cohorts.length, currentYear, loading, terms.length, setupIncomplete, setupStatus]);

    useAssistantPageContext(assistantContext);

    type QuickLinkColor = 'blue' | 'green' | 'purple' | 'orange' | 'indigo';

    const quickLinks: Array<{
        title: string;
        description: string;
        href: string;
        icon: typeof Calendar;
        count: number;
        color: QuickLinkColor;
    }> = [
        {
            title: 'Academic Years',
            description: 'Manage academic year settings',
            href: '/academic/years',
            icon: Calendar,
            count: academicYears.length,
            color: 'blue'
        },
        {
            title: 'Terms',
            description: 'Configure term schedules',
            href: '/academic/terms',
            icon: Clock,
            count: terms.length,
            color: 'green'
        },
        {
            title: 'Curricula',
            description: 'Manage curriculum frameworks',
            href: '/academic/curricula',
            icon: BookOpen,
            count: activeCurricula.length,
            color: 'purple'
        },
        {
            title: 'Subjects',
            description: 'Configure subjects and courses',
            href: '/academic/subjects',
            icon: GraduationCap,
            count: curricula.reduce((sum, c) => sum + c.subjects_count, 0),
            color: 'orange'
        },
        {
            title: 'Cohorts',
            description: 'Manage student cohorts',
            href: '/academic/cohorts',
            icon: Users,
            count: cohorts.length,
            color: 'indigo'
        }
    ];

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-gray-500">Loading academic data...</div>
            </div>
        );
    }

    if (setupStatus && !setupStatus.complete) {
        return <AcademicSetupDashboard status={setupStatus} title="Academic Setup" />;
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-semibold text-gray-900">Academic Management</h1>
                    <p className="text-gray-600 mt-1">
                        Configure academic years, terms, curricula, and cohorts
                    </p>
                </div>
            </div>

            {/* Current Academic Context */}
            <Card>
                <div className="p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">
                        Current Academic Context
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div>
                            <div className="text-sm text-gray-600 mb-1">Academic Year</div>
                            {currentYear ? (
                                <div>
                                    <div className="text-lg font-semibold text-gray-900">
                                        {currentYear.name}
                                    </div>
                                    <div className="text-sm text-gray-500">
                                        {new Date(currentYear.start_date).toLocaleDateString()} - {' '}
                                        {new Date(currentYear.end_date).toLocaleDateString()}
                                    </div>
                                </div>
                            ) : (
                                <div className="text-sm text-gray-400">No current year set</div>
                            )}
                        </div>

                        <div>
                            <div className="text-sm text-gray-600 mb-1">Active Curricula</div>
                            <div className="flex flex-wrap gap-2 mt-2">
                                {activeCurricula.length > 0 ? (
                                    activeCurricula.map(c => (
                                        <Badge key={c.id} variant="blue">
                                            {getCurriculumBridgeName(c)}
                                        </Badge>
                                    ))
                                ) : (
                                    <div className="text-sm text-gray-400">No active curriculum</div>
                                )}
                            </div>
                        </div>

                        <div>
                            <div className="text-sm text-gray-600 mb-1">Current Cohorts</div>
                            <div className="text-lg font-semibold text-gray-900">
                                {cohorts.length}
                            </div>
                            <div className="text-sm text-gray-500">
                                {cohorts.reduce((sum, c) => sum + c.students_count, 0)} total students
                            </div>
                        </div>
                    </div>
                </div>
            </Card>

            {/* Stats Overview */}
            <StatStrip mdColumns={2} lgColumns={4} gap="wide">
                <StatsCard
                    title="Academic Years"
                    value={academicYears.length}
                    icon={Calendar}
                    trend={{ value: 0, isPositive: true }}
                    color="blue"
                />
                <StatsCard
                    title="Active Terms"
                    value={terms.length}
                    icon={Clock}
                    trend={{ value: 0, isPositive: true }}
                    color="green"
                />
                <StatsCard
                    title="Curricula"
                    value={activeCurricula.length}
                    icon={BookOpen}
                    trend={{ value: 0, isPositive: true }}
                    color="purple"
                />
                <StatsCard
                    title="Total Cohorts"
                    value={cohorts.length}
                    icon={Users}
                    trend={{ value: 0, isPositive: true }}
                    color="indigo"
                />
            </StatStrip>

            {/* Quick Links */}
            <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                    Academic Sections
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {quickLinks.map((link) => {
                        const Icon = link.icon;
                        return (
                            <Link key={link.href} href={link.href}>
                                <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
                                    <div className="p-6">
                                        <div className="flex items-start justify-between mb-4">
                                            <div className={`p-3 bg-${link.color}-100 rounded-lg`}>
                                                <Icon className={`w-6 h-6 text-${link.color}-600`} />
                                            </div>
                                            <Badge variant={link.color}>
                                                {link.count}
                                            </Badge>
                                        </div>
                                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                                            {link.title}
                                        </h3>
                                        <p className="text-sm text-gray-600">
                                            {link.description}
                                        </p>
                                    </div>
                                </Card>
                            </Link>
                        );
                    })}
                </div>
            </div>

            {/* Recent Activity */}
            <Card>
                <div className="p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">
                        Recent Updates
                    </h2>
                    <div className="space-y-3">
                        {academicYears.slice(0, 5).map(year => (
                            <div key={year.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                                <div className="flex items-center gap-3">
                                    <Calendar className="w-5 h-5 text-gray-400" />
                                    <div>
                                        <div className="font-medium text-gray-900">{year.name}</div>
                                        <div className="text-sm text-gray-500">
                                            {year.cohorts_count} cohorts • {year.terms_count} terms
                                        </div>
                                    </div>
                                </div>
                                {year.is_current && (
                                    <Badge variant="green">Current</Badge>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </Card>
        </div>
    );
}
