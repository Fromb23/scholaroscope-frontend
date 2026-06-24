'use client';

import Link from 'next/link';
import { useCallback } from 'react';
import {
  ArrowRight,
  Briefcase,
  Calendar,
  ClipboardCheck,
  Download,
  FileBarChart,
  GraduationCap,
  Users,
} from 'lucide-react';
import { Badge } from '@/app/components/ui/Badge';
import { Button } from '@/app/components/ui/Button';
import { Card } from '@/app/components/ui/Card';
import { ErrorBanner } from '@/app/components/ui/ErrorBanner';
import { LoadingSpinner } from '@/app/components/ui/LoadingSpinner';
import { StatsCard } from '@/app/components/dashboard/StatsCard';
import { downloadBlob } from '@/app/core/api/downloads';
import { adminReportsAPI } from '@/app/core/api/reporting';
import { AdminReportAccessGate } from '@/app/core/components/reports/AdminReportAccessGate';
import {
  getAdminReportLandingSections,
  REPORT_HIERARCHY_STEPS,
} from '@/app/core/components/reports/reportHierarchy';
import { useDashboardOverview } from '@/app/core/hooks/useReporting';
import { formatPercent } from '@/app/core/lib/reportingPresentation';
import type { ReportExportFormat } from '@/app/core/types/reporting';
import { extractErrorMessage, type ApiError } from '@/app/core/types/errors';

const REPORT_CARD_ACCENTS: Record<string, string> = {
  learners: 'bg-blue-50 text-blue-600',
  classes: 'bg-emerald-50 text-emerald-600',
  subjects: 'bg-amber-50 text-amber-600',
  instructors: 'bg-indigo-50 text-indigo-600',
  attendance: 'bg-slate-100 text-slate-600',
  policies: 'bg-cyan-50 text-cyan-700',
  maintenance: 'bg-rose-50 text-rose-700',
};

export function ReportsPage() {
  const { overview, loading, error } = useDashboardOverview();
  const hierarchy = getAdminReportLandingSections();

  const handleExport = useCallback(async (format: ReportExportFormat) => {
    try {
      const file = await adminReportsAPI.exportOverview(format);
      downloadBlob(file.blob, file.fileName);
    } catch (requestError) {
      window.alert(extractErrorMessage(requestError as ApiError, 'Failed to export reporting overview.'));
    }
  }, []);

  return (
    <AdminReportAccessGate>
      {loading ? <LoadingSpinner message="Loading report workspace..." /> : error ? <ErrorBanner message={error} onDismiss={() => {}} /> : (
        <div className="space-y-8 max-w-full">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <h1 className="text-2xl font-semibold text-gray-900">Workspace Reporting Overview</h1>
              <p className="mt-1 max-w-3xl text-sm text-gray-500">
                Start from the reporting question you have, then move down the reporting hierarchy
                without having to remember where attendance, sessions, assessments, assignments,
                CBC progress, or evidence are owned.
              </p>
              <p className="mt-2 text-sm text-gray-500">
                {overview?.organization.name ?? '—'}
                {overview?.academic_year ? ` · ${overview.academic_year.name}` : ''}
                {overview?.current_term ? ` · ${overview.current_term.name}` : ' · No active term'}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button variant="secondary" size="sm" onClick={() => void handleExport('pdf')}>
                <Download className="h-4 w-4" />
                Export PDF
              </Button>
              <Button variant="secondary" size="sm" onClick={() => void handleExport('xlsx')}>
                <Download className="h-4 w-4" />
                Export Excel
              </Button>
              <Button variant="ghost" size="sm" onClick={() => void handleExport('csv')}>
                <Download className="h-4 w-4" />
                Export CSV
              </Button>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatsCard title="Learners" value={overview?.total_learners ?? 0} icon={Users} color="blue" />
            <StatsCard title="Classes" value={overview?.total_cohorts ?? 0} icon={GraduationCap} color="green" />
            <StatsCard title="Instructors" value={overview?.total_instructors ?? 0} icon={Briefcase} color="indigo" />
            <StatsCard title="Average Attendance" value={formatPercent(overview?.average_attendance)} icon={Calendar} color="purple" />
          </div>

          <div className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
            <Card className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold text-gray-900">Start With a Reporting Lens</h2>
                  <p className="mt-1 text-sm text-gray-500">
                    Choose the primary investigation path first. Attendance, sessions, assessments,
                    assignments, CBC progress, and evidence belong underneath these report contexts.
                  </p>
                </div>
                {overview?.current_term ? <Badge variant="blue">{overview.current_term.name}</Badge> : null}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {hierarchy.primary.map((card) => (
                  <Link key={card.key} href={card.href} className="group block">
                    <div className="rounded-2xl border border-gray-200 p-5 transition hover:border-blue-300 hover:shadow-sm">
                      <div className="flex items-start justify-between gap-3">
                        <div className={`rounded-xl p-3 ${REPORT_CARD_ACCENTS[card.key] ?? 'bg-gray-100 text-gray-600'}`}>
                          <card.icon className="h-5 w-5" />
                        </div>
                        <ArrowRight className="h-4 w-4 text-gray-300 transition group-hover:text-gray-500" />
                      </div>
                      <h3 className="mt-4 text-base font-semibold text-gray-900">{card.name}</h3>
                      <p className="mt-1 text-sm leading-relaxed text-gray-500">{card.description}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </Card>

            <Card className="space-y-4">
              <div>
                <h2 className="text-base font-semibold text-gray-900">Investigation Map</h2>
                <p className="mt-1 text-sm text-gray-500">
                  The reporting shell should guide the next question at each level.
                </p>
              </div>

              <div className="grid gap-3">
                {REPORT_HIERARCHY_STEPS.map((step) => (
                  <SnapshotRow
                    key={step.level}
                    label={step.level}
                    value={step.question}
                    alignTop
                  />
                ))}
              </div>
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            {[...hierarchy.secondary, ...hierarchy.maintenance].map((card) => (
              <Link key={card.key} href={card.href} className="group block">
                <Card className="h-full">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className={`rounded-xl p-3 ${REPORT_CARD_ACCENTS[card.key] ?? 'bg-gray-100 text-gray-600'}`}>
                        <card.icon className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="text-base font-semibold text-gray-900">{card.name}</h3>
                        <p className="mt-1 text-sm text-gray-500">{card.description}</p>
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-gray-300 transition group-hover:text-gray-500" />
                  </div>
                </Card>
              </Link>
            ))}
          </div>

          <Card>
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-blue-50 p-3 text-blue-600">
                <FileBarChart className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-gray-900">Reporting Principle</h2>
                <p className="mt-1 text-sm text-gray-500">
                  Reporting should reduce cognitive load. Overview pages should guide the next question,
                  not make administrators remember which module owns attendance, sessions, scores, or evidence.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {hierarchy.compatibility.map((item) => (
                    <Link key={item.href} href={item.href}>
                      <Button variant="ghost" size="sm">
                        <ClipboardCheck className="h-4 w-4" />
                        {item.name}
                      </Button>
                    </Link>
                  ))}
                </div>
                <p className="mt-2 text-xs text-gray-500">
                  Use the assessment compatibility view after you have chosen the learner, class,
                  subject, or instructor path you are investigating.
                </p>
              </div>
            </div>
          </Card>
        </div>
      )}
    </AdminReportAccessGate>
  );
}

function SnapshotRow({
  label,
  value,
  alignTop = false,
}: {
  label: string;
  value: string;
  alignTop?: boolean;
}) {
  return (
    <div className={`flex gap-4 rounded-lg border border-gray-200 px-3 py-2 ${alignTop ? 'items-start' : 'items-center justify-between'}`}>
      <span className="text-sm text-gray-500">{label}</span>
      <span className="text-sm font-semibold text-gray-900">{value}</span>
    </div>
  );
}
