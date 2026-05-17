'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import {
    Users, BookOpen, FileText, Calendar,
    BarChart3, PieChart, Target,
    Award, Settings, ArrowRight, Download,
} from 'lucide-react';
import { Card } from '@/app/components/ui/Card';
import { Badge } from '@/app/components/ui/Badge';
import { Button } from '@/app/components/ui/Button';
import { StatsCard } from '@/app/components/dashboard/StatsCard';
import { LoadingSpinner } from '@/app/components/ui/LoadingSpinner';
import { ErrorBanner } from '@/app/components/ui/ErrorBanner';
import { ExportModal } from '@/app/components/export/ExportModal';
import { useCurricula } from '@/app/core/hooks/useAcademic';
import { usePlugins } from '@/app/core/hooks/usePlugins';
import { getAvailablePolicySurfaces } from '@/app/core/lib/policySurfaces';
import { useDashboardOverview } from '@/app/core/hooks/useReporting';
import type { ExportPayload } from '@/app/types/export';

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
        title: 'Report Policies',
        description: 'Open the policy modules available for this organization and its active curricula.',
        icon: Settings,
        href: '/reports/policies',
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

export function ReportsPage() {
    const [exportOpen, setExportOpen] = useState(false);
    const { overview, loading, error } = useDashboardOverview();
    const { curricula } = useCurricula();
    const { plugins } = usePlugins();

    const sections = useMemo(() => {
        const availableSurfaces = getAvailablePolicySurfaces({
            curricula,
            installedPlugins: plugins,
        });

        return SECTIONS.filter((section) => (
            section.title !== 'Report Policies' || availableSurfaces.length > 0
        ));
    }, [curricula, plugins]);

    const exportPayload = useMemo<ExportPayload | null>(() => {
        if (!overview) return null;

        return {
            title: 'Admin Overview',
            subtitle: overview.organization.name,
            metadata: {
                academicYear: overview.academic_year?.name ?? 'No active academic year',
                term: overview.current_term?.name ?? 'No active term',
                generatedAt: new Date().toLocaleString(),
            },
            columns: [
                { key: 'organization', label: 'Organization', width: 24 },
                { key: 'academic_year', label: 'Academic Year', width: 18 },
                { key: 'current_term', label: 'Current Term', width: 18 },
                { key: 'total_learners', label: 'Learners', format: 'number', width: 12, align: 'right' as const },
                { key: 'total_cohorts', label: 'Cohorts', format: 'number', width: 12, align: 'right' as const },
                { key: 'total_cohort_subjects', label: 'Cohort Subjects', format: 'number', width: 16, align: 'right' as const },
                { key: 'total_instructors', label: 'Instructors', format: 'number', width: 12, align: 'right' as const },
                { key: 'total_sessions', label: 'Sessions', format: 'number', width: 12, align: 'right' as const },
                { key: 'total_assessments', label: 'Assessments', format: 'number', width: 14, align: 'right' as const },
                { key: 'average_grade', label: 'Average Grade', format: 'percentage', width: 14, align: 'right' as const },
                { key: 'average_attendance', label: 'Average Attendance', format: 'percentage', width: 18, align: 'right' as const },
            ],
            rows: [
                {
                    organization: overview.organization.name,
                    academic_year: overview.academic_year?.name ?? '—',
                    current_term: overview.current_term?.name ?? '—',
                    total_learners: overview.total_learners,
                    total_cohorts: overview.total_cohorts,
                    total_cohort_subjects: overview.total_cohort_subjects,
                    total_instructors: overview.total_instructors,
                    total_sessions: overview.total_sessions,
                    total_assessments: overview.total_assessments,
                    average_grade: overview.average_grade,
                    average_attendance: overview.average_attendance,
                },
            ],
            fileName: 'admin-overview',
            includeMetadata: true,
            includeTimestamp: true,
            sheetName: 'Overview',
            freezeHeader: true,
            autoFilter: true,
            orientation: 'landscape' as const,
        };
    }, [overview]);

    if (loading) return <LoadingSpinner />;
    if (error) return <ErrorBanner message={error} onDismiss={() => { }} />;

    return (
        <div className="space-y-8">

            <div className="flex items-start justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-semibold text-gray-900">
                        Reporting & Analytics
                    </h1>
                    <p className="text-gray-500 mt-1">
                        {overview?.organization.name ?? '—'}
                        {overview?.academic_year ? ` · ${overview.academic_year.name}` : ''}
                        {overview?.current_term ? ` · ${overview.current_term.name}` : ' · No active term'}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    {exportPayload && (
                        <Button variant="secondary" size="sm" onClick={() => setExportOpen(true)}>
                            <Download className="h-4 w-4 mr-1.5" />
                            Export
                        </Button>
                    )}
                    <BarChart3 className="h-7 w-7 text-blue-600" />
                </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                <StatsCard title="Active Learners" value={overview?.total_learners ?? 0} icon={Users} color="blue" />
                <StatsCard title="Cohorts" value={overview?.total_cohorts ?? 0} icon={BookOpen} color="purple" />
                <StatsCard title="Cohort Subjects" value={overview?.total_cohort_subjects ?? 0} icon={FileText} color="green" />
                <StatsCard title="Instructors" value={overview?.total_instructors ?? 0} icon={Target} color="orange" />
                <StatsCard title="Sessions" value={overview?.total_sessions ?? 0} icon={Calendar} color="indigo" />
                <StatsCard title="Assessments" value={overview?.total_assessments ?? 0} icon={Award} color="yellow" />
            </div>

            {(overview?.average_grade != null || overview?.average_attendance != null) && (
                <Card>
                    <div className="flex items-center gap-2 mb-5">
                        <Award className="h-5 w-5 text-blue-600" />
                        <h2 className="text-base font-semibold text-gray-900">
                            Current Reporting Snapshot
                        </h2>
                        {overview?.current_term?.name && (
                            <Badge variant="blue">{overview.current_term.name}</Badge>
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

            <div>
                <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-4">
                    Report Categories
                </h2>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {sections.map(section => {
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

            {exportPayload && (
                <ExportModal
                    open={exportOpen}
                    onClose={() => setExportOpen(false)}
                    payload={exportPayload}
                    defaultFormat="pdf"
                    title="Export Admin Overview"
                />
            )}

        </div>
    );
}
