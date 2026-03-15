'use client';
import { useDashboardOverview } from '@/app/core/hooks/useReporting';
import Link from 'next/link';
import {
    TrendingUp,
    Users,
    BookOpen,
    FileText,
    Calendar,
    BarChart3,
    PieChart,
    Target,
    Award
} from 'lucide-react';
import { Card } from '@/app/components/ui/Card';
import { StatsCard } from '@/app/components/dashboard/StatsCard';
import { Badge } from '@/app/components/ui/Badge';

export default function ReportsPage() {
    const { overview, loading, error } = useDashboardOverview();

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
                    <p className="mt-2 text-gray-600">Loading analytics...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Card className="max-w-md">
                    <div className="text-center">
                        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                            <span className="text-2xl">⚠️</span>
                        </div>
                        <h3 className="mt-4 text-lg font-medium text-gray-900">Error Loading Data</h3>
                        <p className="mt-2 text-sm text-gray-600">{error}</p>
                    </div>
                </Card>
            </div>
        );
    }

    const reportSections = [
        {
            title: 'Students',
            description: 'Individual student performance, report cards, and longitudinal tracking',
            icon: Users,
            href: '/reports/students',
            color: 'blue'
        },
        {
            title: 'Cohorts',
            description: 'Class-level analytics, rankings, and performance distributions',
            icon: BookOpen,
            href: '/reports/cohorts',
            color: 'purple'
        },
        {
            title: 'Subjects',
            description: 'Subject performance across cohorts and curriculum analysis',
            icon: FileText,
            href: '/reports/subjects',
            color: 'green'
        },
        {
            title: 'Assessments',
            description: 'Assessment type comparisons, weight analysis, and pedagogy insights',
            icon: PieChart,
            href: '/reports/assessments',
            color: 'orange'
        },
        {
            title: 'Attendance',
            description: 'Participation metrics, session tracking, and correlation analysis',
            icon: Calendar,
            href: '/reports/attendance',
            color: 'indigo'
        },
        {
            title: 'Compute',
            description: 'Admin controls for recomputing summaries and batch processing',
            icon: BarChart3,
            href: '/reports/compute',
            color: 'gray'
        }
    ];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Reporting & Analytics</h1>
                    <p className="mt-2 text-gray-600">
                        {overview?.academic_year} · {overview?.current_term || 'No active term'}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <BarChart3 className="h-8 w-8 text-blue-600" />
                </div>
            </div>

            {/* Stats Overview */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <StatsCard
                    title="Active Students"
                    value={overview?.total_students || 0}
                    icon={Users}
                    color="blue"
                />
                <StatsCard
                    title="Cohorts"
                    value={overview?.total_cohorts || 0}
                    icon={BookOpen}
                    color="purple"
                />
                <StatsCard
                    title="Subjects"
                    value={overview?.total_subjects || 0}
                    icon={FileText}
                    color="green"
                />
                <StatsCard
                    title="Assessments"
                    value={overview?.total_assessments || 0}
                    icon={Target}
                    color="orange"
                />
            </div>

            {/* Performance Overview */}
            {(overview?.average_grade || overview?.average_attendance) && (
                <Card>
                    <div className="flex items-center gap-3 mb-6">
                        <Award className="h-6 w-6 text-blue-600" />
                        <h2 className="text-xl font-semibold text-gray-900">Current Term Performance</h2>
                    </div>
                    <div className="grid gap-6 md:grid-cols-2">
                        {overview.average_grade && (
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm font-medium text-gray-600">Average Grade</span>
                                    <Badge variant="info">
                                        {overview.average_grade.toFixed(1)}%
                                    </Badge>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                    <div
                                        className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                                        style={{ width: `${overview.average_grade}%` }}
                                    />
                                </div>
                            </div>
                        )}
                        {overview.average_attendance && (
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm font-medium text-gray-600">Average Attendance</span>
                                    <Badge variant="success">
                                        {overview.average_attendance.toFixed(1)}%
                                    </Badge>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                    <div
                                        className="bg-green-600 h-2 rounded-full transition-all duration-500"
                                        style={{ width: `${overview.average_attendance}%` }}
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                </Card>
            )}

            {/* Report Categories */}
            <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Report Categories</h2>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {reportSections.map((section) => (
                        <Link
                            key={section.title}
                            href={section.href}
                            className="group"
                        >
                            <Card className="h-full transition-all hover:shadow-lg hover:border-gray-300">
                                <div className="flex items-start justify-between mb-4">
                                    <div className={`p-3 rounded-lg ${section.color === 'blue' ? 'bg-blue-100' :
                                        section.color === 'purple' ? 'bg-purple-100' :
                                            section.color === 'green' ? 'bg-green-100' :
                                                section.color === 'orange' ? 'bg-orange-100' :
                                                    section.color === 'indigo' ? 'bg-indigo-100' :
                                                        'bg-gray-100'
                                        }`}>
                                        <section.icon className={`h-6 w-6 ${section.color === 'blue' ? 'text-blue-600' :
                                            section.color === 'purple' ? 'text-purple-600' :
                                                section.color === 'green' ? 'text-green-600' :
                                                    section.color === 'orange' ? 'text-orange-600' :
                                                        section.color === 'indigo' ? 'text-indigo-600' :
                                                            'text-gray-600'
                                            }`} />
                                    </div>
                                    <TrendingUp className="h-4 w-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                                </div>
                                <h3 className="text-lg font-semibold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
                                    {section.title}
                                </h3>
                                <p className="text-sm text-gray-600 leading-relaxed">
                                    {section.description}
                                </p>
                            </Card>
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    );
}