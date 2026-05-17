'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  Calendar,
  ClipboardCheck,
  Clock3,
  Download,
  FileBarChart,
  FileText,
  Settings,
  Target,
  Users,
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
import { CbcCodeDistribution } from '@/app/core/components/reports/CbcCodeDistribution';
import { AdminReportAccessGate } from '@/app/core/components/reports/AdminReportAccessGate';
import { formatNumber, formatPercent } from '@/app/core/lib/reportingPresentation';
import type { ExportPayload } from '@/app/types/export';

const SECTIONS = [
  {
    title: 'Students',
    description: 'Learner report cards with curriculum-aware subject sections.',
    icon: Users,
    href: '/reports/students',
    color: 'blue',
  },
  {
    title: 'Cohorts',
    description: 'Cohort subject reporting by backend reporting source.',
    icon: BookOpen,
    href: '/reports/cohorts',
    color: 'purple',
  },
  {
    title: 'Subjects',
    description: 'Subject reporting without forcing CBC into numeric grade tables.',
    icon: FileText,
    href: '/reports/subjects',
    color: 'green',
  },
  {
    title: 'Assessments',
    description: 'Assessment completion and curriculum-specific performance interpretation.',
    icon: ClipboardCheck,
    href: '/reports/assessments',
    color: 'orange',
  },
  {
    title: 'Attendance',
    description: 'Attendance remains a kernel fact across all reporting sources.',
    icon: Calendar,
    href: '/reports/attendance',
    color: 'indigo',
  },
  {
    title: 'Report Policies',
    description: 'Open admin policy surfaces for active curricula.',
    icon: Settings,
    href: '/reports/policies',
    color: 'teal',
  },
  {
    title: 'Compute',
    description: 'Generic-only report computation and batch summary refresh.',
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

    return SECTIONS.filter((section) => {
      if (section.title === 'Report Policies') {
        return availableSurfaces.length > 0;
      }
      return true;
    });
  }, [curricula, plugins]);

  const exportPayload = useMemo<ExportPayload | null>(() => {
    if (!overview) return null;

    return {
      title: 'Admin Reporting Overview',
      subtitle: overview.organization.name,
      metadata: {
        academicYear: overview.academic_year?.name ?? 'No active academic year',
        term: overview.current_term?.name ?? 'No active term',
        genericAverage: formatPercent(overview.performance_summary.generic?.average_score),
        cbcAverageWeightedScore: formatPercent(overview.performance_summary.cbc?.average_weighted_score),
        averageAttendance: formatPercent(overview.average_attendance),
        generatedAt: new Date().toLocaleString(),
      },
      columns: [
        { key: 'organization', label: 'Organization', width: 24 },
        { key: 'term', label: 'Current Term', width: 18 },
        { key: 'total_learners', label: 'Learners', format: 'number', width: 12, align: 'right' as const },
        { key: 'total_cohorts', label: 'Cohorts', format: 'number', width: 12, align: 'right' as const },
        { key: 'total_cohort_subjects', label: 'Cohort Subjects', format: 'number', width: 16, align: 'right' as const },
        { key: 'total_sessions', label: 'Sessions', format: 'number', width: 12, align: 'right' as const },
        { key: 'total_assessments', label: 'Assessments', format: 'number', width: 14, align: 'right' as const },
        { key: 'generic_average_score', label: 'Generic Numeric Average', format: 'percentage', width: 18, align: 'right' as const },
        { key: 'generic_computed_count', label: 'Generic Computed', format: 'number', width: 16, align: 'right' as const },
        { key: 'cbc_average_weighted_score', label: 'CBC Weighted Score', format: 'percentage', width: 18, align: 'right' as const },
        { key: 'cbc_total_results', label: 'CBC Results', format: 'number', width: 14, align: 'right' as const },
        { key: 'average_attendance', label: 'Average Attendance', format: 'percentage', width: 18, align: 'right' as const },
      ],
      rows: [
        {
          organization: overview.organization.name,
          term: overview.current_term?.name ?? '—',
          total_learners: overview.total_learners,
          total_cohorts: overview.total_cohorts,
          total_cohort_subjects: overview.total_cohort_subjects,
          total_sessions: overview.total_sessions,
          total_assessments: overview.total_assessments,
          generic_average_score: overview.performance_summary.generic?.average_score ?? overview.average_grade,
          generic_computed_count: overview.performance_summary.generic?.computed_count ?? 0,
          cbc_average_weighted_score: overview.performance_summary.cbc?.average_weighted_score ?? null,
          cbc_total_results: overview.performance_summary.cbc?.total_results ?? 0,
          average_attendance: overview.average_attendance,
        },
      ],
      fileName: 'admin-reporting-overview',
      includeMetadata: true,
      includeTimestamp: true,
      sheetName: 'Overview',
      freezeHeader: true,
      autoFilter: true,
      orientation: 'landscape' as const,
    };
  }, [overview]);

  return (
    <AdminReportAccessGate>
      {loading ? <LoadingSpinner /> : error ? <ErrorBanner message={error} onDismiss={() => {}} /> : (
        <div className="space-y-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">
                Reporting & Analytics
              </h1>
              <p className="mt-1 text-gray-500">
                {overview?.organization.name ?? '—'}
                {overview?.academic_year ? ` · ${overview.academic_year.name}` : ''}
                {overview?.current_term ? ` · ${overview.current_term.name}` : ' · No active term'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {exportPayload && (
                <Button variant="secondary" size="sm" onClick={() => setExportOpen(true)}>
                  <Download className="mr-1.5 h-4 w-4" />
                  Export
                </Button>
              )}
              <FileBarChart className="h-7 w-7 text-blue-600" />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <StatsCard title="Active Learners" value={overview?.total_learners ?? 0} icon={Users} color="blue" />
            <StatsCard title="Cohorts" value={overview?.total_cohorts ?? 0} icon={BookOpen} color="purple" />
            <StatsCard title="Cohort Subjects" value={overview?.total_cohort_subjects ?? 0} icon={FileText} color="green" />
            <StatsCard title="Instructors" value={overview?.total_instructors ?? 0} icon={Target} color="orange" />
            <StatsCard title="Sessions" value={overview?.total_sessions ?? 0} icon={Clock3} color="indigo" />
            <StatsCard title="Assessments" value={overview?.total_assessments ?? 0} icon={ClipboardCheck} color="yellow" />
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <Card className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold text-gray-900">Generic Numeric Performance</h2>
                  <p className="mt-1 text-sm text-gray-500">
                    Generic numeric reporting only.
                  </p>
                </div>
                <Badge variant="blue">
                  {formatNumber(overview?.performance_summary.generic?.computed_count, 0)}
                  {' '}computed
                </Badge>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <MetricCard label="Generic Numeric Average" value={formatPercent(overview?.performance_summary.generic?.average_score ?? overview?.average_grade)} />
                <MetricCard label="Average Attendance" value={formatPercent(overview?.average_attendance)} />
              </div>
              {overview?.average_grade_note && (
                <p className="text-xs text-gray-500">{overview.average_grade_note}</p>
              )}
            </Card>

            <Card className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold text-gray-900">CBC Performance</h2>
                  <p className="mt-1 text-sm text-gray-500">
                    Rendered from curriculum-aware CBC results.
                  </p>
                </div>
                <Badge variant="green">
                  {formatNumber(overview?.performance_summary.cbc?.total_results, 0)}
                  {' '}results
                </Badge>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <MetricCard label="CBC Weighted Score" value={formatPercent(overview?.performance_summary.cbc?.average_weighted_score)} />
                <MetricCard label="Average Points" value={formatNumber(overview?.performance_summary.cbc?.average_points)} />
                <MetricCard label="Final" value={formatNumber(overview?.performance_summary.cbc?.final_count, 0)} />
                <MetricCard label="Stale" value={formatNumber(overview?.performance_summary.cbc?.stale_count, 0)} />
              </div>
              {overview?.performance_summary.cbc && (
                <div>
                  <h3 className="text-sm font-medium text-gray-900">CBC Performance Code Distribution</h3>
                  <div className="mt-2">
                    <CbcCodeDistribution distribution={overview.performance_summary.cbc.distribution_by_code} />
                  </div>
                </div>
              )}
            </Card>

            <Card className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold text-gray-900">Cambridge Pending</h2>
                  <p className="mt-1 text-sm text-gray-500">
                    Curriculum reporting pending until the backend adapter is implemented.
                  </p>
                </div>
                <Badge variant="yellow">
                  {overview?.performance_summary.cambridge?.status ?? 'not_implemented'}
                </Badge>
              </div>
              <MetricCard
                label="Cohort Subjects"
                value={formatNumber(overview?.performance_summary.cambridge?.cohort_subject_count, 0)}
              />
            </Card>

            <Card className="space-y-4">
              <div>
                <h2 className="text-base font-semibold text-gray-900">Attendance</h2>
                <p className="mt-1 text-sm text-gray-500">
                  Attendance remains curriculum-agnostic and stays outside reporting adapters.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <MetricCard label="Average Attendance" value={formatPercent(overview?.average_attendance)} />
                <MetricCard label="Sessions" value={formatNumber(overview?.total_sessions, 0)} />
              </div>
            </Card>
          </div>

          <div>
            <h2 className="text-sm font-medium uppercase tracking-wide text-gray-500">
              Report Categories
            </h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {sections.map((section) => {
                const { bg, icon } = COLOR_MAP[section.color];
                return (
                  <Link key={section.title} href={section.href} className="group">
                    <Card className="h-full transition-all hover:-translate-y-0.5 hover:shadow-md">
                      <div className="mb-3 flex items-start justify-between">
                        <div className={`rounded-lg p-2.5 ${bg}`}>
                          <section.icon className={`h-5 w-5 ${icon}`} />
                        </div>
                        <ArrowRight className="h-4 w-4 text-gray-300 transition-colors group-hover:text-gray-500" />
                      </div>
                      <h3 className="font-semibold text-gray-900 transition-colors group-hover:text-blue-600">
                        {section.title}
                      </h3>
                      <p className="mt-1 text-xs leading-relaxed text-gray-500">
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
              title="Export Admin Reporting Overview"
            />
          )}
        </div>
      )}
    </AdminReportAccessGate>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-gray-200 px-4 py-3">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="mt-1 text-lg font-semibold text-gray-900">{value}</p>
    </div>
  );
}
