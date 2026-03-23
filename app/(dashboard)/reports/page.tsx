'use client';

// ============================================================================
// app/(dashboard)/reports/page.tsx — render only
// ============================================================================

import Link from 'next/link';
import {
    Users, BookOpen, FileText, Calendar,
    BarChart3, PieChart, TrendingUp, Target,
    Award, Settings, ArrowRight,
} from 'lucide-react';
import { Card } from '@/app/components/ui/Card';
import { Badge } from '@/app/components/ui/Badge';
import { StatsCard } from '@/app/components/dashboard/StatsCard';
import { LoadingSpinner } from '@/app/components/ui/LoadingSpinner';
import { ErrorBanner } from '@/app/components/ui/ErrorBanner';
import { useDashboardOverview } from '@/app/core/hooks/useReporting';

const SECTIONS = [
    {
        title: 'Students',
        description: 'Report cards, subject performance, and longitudinal progress tracking.',
        icon: Users,
        href: '/reports/students',
        color: 'blue',
    },
    {
        title: 'Cohorts',
        description: 'Class-level analytics, grade distributions, and ranking.',
        icon: BookOpen,
        href: '/reports/cohorts',
        color: 'purple',
    },
    {
        title: 'Subjects',
        description: 'Subject performance across cohorts and assessment breakdowns.',
        icon: FileText,
        href: '/reports/subjects',
        color: 'green',
    },
    {
        title: 'Assessments',
        description: 'CAT vs Exam comparisons, type analysis, and pedagogy insights.',
        icon: PieChart,
        href: '/reports/assessments',
        color: 'orange',
    },
    {
        title: 'Attendance',
        description: 'Session participation metrics and frequently absent students.',
        icon: Calendar,
        href: '/reports/attendance',
        color: 'indigo',
    },
    {
        title: 'Grade Policies',
        description: 'Configure weighted grading, custom scales, and policy scope.',
        icon: Settings,
        href: '/reports/grade-policies',
        color: 'teal',
    },
    {
        title: 'Compute',
        description: 'Recompute summaries and trigger batch grade computation.',
        icon: BarChart3,
        href: '/reports/compute',
        color: 'gray',
    },
] as const;

const COLOR_MAP: Record<string, { bg: string; icon: string }> = {
    blue: { bg: 'bg-blue-50', icon: 'text-blue-600' },
    purple: { bg: 'bg-purple-50', icon: 'text-purple-600' },
    green: { bg: 'bg-green-50', icon: 'text-green-600' },
    orange: { bg: 'bg-orange-50', icon: 'text-orange-600' },
    indigo: { bg: 'bg-indigo-50', icon: 'text-indigo-600' },
    teal: { bg: 'bg-teal-50', icon: 'text-teal-600' },
    gray: { bg: 'bg-gray-100', icon: 'text-gray-600' },
};

export default function ReportsPage() {
    const { overview, loading, error } = useDashboardOverview();

    if (loading) return <LoadingSpinner />;
    if (error) return <ErrorBanner message={error} onDismiss={() => { }} />;

    return (
        <div className="space-y-8">

            {/* Header */}
            <div className="flex items-start justify-between">
                <div>
                    <h1 className="text-2xl font-semibold text-gray-900">
                        Reporting & Analytics
                    </h1>
                    <p className="text-gray-500 mt-1">
                        {overview?.academic_year ?? '—'}
                        {overview?.current_term ? ` · ${overview.current_term}` : ' · No active term'}
                    </p>
                </div>
                <BarChart3 className="h-7 w-7 text-blue-600" />
            </div>

            {/* Stats strip */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatsCard title="Active Students" value={overview?.total_students ?? 0} icon={Users} color="blue" />
                <StatsCard title="Cohorts" value={overview?.total_cohorts ?? 0} icon={BookOpen} color="purple" />
                <StatsCard title="Subjects" value={overview?.total_subjects ?? 0} icon={FileText} color="green" />
                <StatsCard title="Assessments" value={overview?.total_assessments ?? 0} icon={Target} color="orange" />
            </div>

            {/* Performance bars */}
            {(overview?.average_grade != null || overview?.average_attendance != null) && (
                <Card>
                    <div className="flex items-center gap-2 mb-5">
                        <Award className="h-5 w-5 text-blue-600" />
                        <h2 className="text-base font-semibold text-gray-900">
                            Current Term Performance
                        </h2>
                        {overview?.current_term && (
                            <Badge variant="blue">{overview.current_term}</Badge>
                        )}
                    </div>
                    <div className="grid md:grid-cols-2 gap-6">
                        {overview?.average_grade != null && (
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm text-gray-600">Average Grade</span>
                                    <span className="text-sm font-semibold text-blue-600">
                                        {overview.average_grade.toFixed(1)}%
                                    </span>
                                </div>
                                <div className="w-full bg-gray-100 rounded-full h-2">
                                    <div
                                        className="bg-blue-500 h-2 rounded-full transition-all duration-700"
                                        style={{ width: `${overview.average_grade}%` }}
                                    />
                                </div>
                            </div>
                        )}
                        {overview?.average_attendance != null && (
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm text-gray-600">Average Attendance</span>
                                    <span className="text-sm font-semibold text-green-600">
                                        {overview.average_attendance.toFixed(1)}%
                                    </span>
                                </div>
                                <div className="w-full bg-gray-100 rounded-full h-2">
                                    <div
                                        className="bg-green-500 h-2 rounded-full transition-all duration-700"
                                        style={{ width: `${overview.average_attendance}%` }}
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                </Card>
            )}

            {/* Section cards */}
            <div>
                <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-4">
                    Report Categories
                </h2>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {SECTIONS.map(section => {
                        const { bg, icon } = COLOR_MAP[section.color];
                        return (
                            <Link key={section.title} href={section.href} className="group">
                                <Card className="h-full hover:shadow-md transition-all hover:-translate-y-0.5">
                                    <div className="flex items-start justify-between mb-3">
                                        <div className={`p-2.5 rounded-xl ${bg}`}>
                                            <section.icon className={`h-5 w-5 ${icon}`} />
                                        </div>
                                        <ArrowRight className="h-4 w-4 text-gray-300 group-hover:text-gray-500 transition-colors" />
                                    </div>
                                    <h3 className="font-semibold text-gray-900 mb-1 group-hover:text-blue-600 transition-colors">
                                        {section.title}
                                    </h3>
                                    <p className="text-xs text-gray-500 leading-relaxed">
                                        {section.description}
                                    </p>
                                </Card>
                            </Link>
                        );
                    })}
                </div>
            </div>

        </div>
    );
}