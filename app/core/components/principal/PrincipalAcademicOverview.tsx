'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { AlertTriangle, ArrowRight, BookOpen, GraduationCap, School } from 'lucide-react';

import { adminReportsAPI } from '@/app/core/api/reporting';
import type { PrincipalAcademicOverview as AcademicOverviewPayload } from '@/app/core/types/reporting';
import {
  applyReportStateChange,
  buildReportIntentHref,
  buildReportOrigin,
  type ReportProjection,
} from '@/app/core/components/reports/reportIntent';
import { useAuth } from '@/app/context/AuthContext';

const PROJECTIONS: Array<{ projection: ReportProjection; label: string }> = [
  { projection: 'overview', label: 'Overview' },
  { projection: 'learners', label: 'Learners' },
  { projection: 'attendance', label: 'Lessons and attendance' },
  { projection: 'assignments', label: 'Assignments' },
  { projection: 'assessments-results', label: 'Assessments and results' },
  { projection: 'projects', label: 'Projects' },
  { projection: 'curriculum-progress', label: 'Curriculum / CBC progress' },
];

function positive(params: URLSearchParams, key: string): number | undefined {
  const value = Number(params.get(key));
  return Number.isInteger(value) && value > 0 ? value : undefined;
}

function displayState(state: string): string {
  if (state === 'NO_RECORDS') return 'No records';
  if (state === 'INCOMPLETE') return 'Incomplete data';
  if (state === 'UNAVAILABLE') return 'Unavailable';
  if (state === 'ZERO') return 'Zero recorded';
  return 'Available';
}

export function PrincipalAcademicOverview() {
  const { activeOrg } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const query = searchParams.toString();
  const [data, setData] = useState<AcademicOverviewPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const selected = useMemo(() => ({
    curriculum: positive(searchParams, 'curriculum'),
    academic_year: positive(searchParams, 'academic_year'),
    term: positive(searchParams, 'term'),
    cohort: positive(searchParams, 'cohort'),
    cohort_subject: positive(searchParams, 'cohort_subject'),
  }), [searchParams]);

  useEffect(() => {
    if (!activeOrg) return;
    let current = true;
    setLoading(true);
    setError(null);
    adminReportsAPI.getAcademicOverview(selected)
      .then((payload) => {
        if (!current) return;
        setData(payload);
        if (!selected.curriculum && payload.options.curricula.length === 1) {
          const next = applyReportStateChange(searchParams, 'curriculum', payload.options.curricula[0].id);
          router.replace(`${pathname}?${next.toString()}`);
        }
      })
      .catch(() => {
        if (current) setError('The academic overview could not be loaded for this selection.');
      })
      .finally(() => {
        if (current) setLoading(false);
      });
    return () => { current = false; };
  }, [activeOrg, pathname, query, router, searchParams, selected]);

  const change = (key: Parameters<typeof applyReportStateChange>[1], value: string) => {
    const next = applyReportStateChange(searchParams, key, value || null);
    router.push(`${pathname}${next.size ? `?${next.toString()}` : ''}`);
  };

  if (loading && !data) {
    return <div aria-busy="true" className="theme-card h-72 animate-pulse rounded-2xl border theme-border" />;
  }
  if (error || !data) {
    return (
      <section role="alert" className="theme-card rounded-2xl border theme-border p-6">
        <h1 className="text-lg font-semibold theme-text">Academic overview unavailable</h1>
        <p className="mt-2 text-sm theme-text-muted">{error}</p>
      </section>
    );
  }

  const origin = buildReportOrigin(pathname, searchParams);
  const reportHref = (projection: ReportProjection) => {
    if (!selected.cohort_subject) return origin;
    return buildReportIntentHref({
      object: { type: 'cohort-subject', cohortSubjectId: selected.cohort_subject },
      projection,
      period: {
        curriculumId: selected.curriculum,
        academicYearId: selected.academic_year,
        termId: selected.term,
      },
      filters: { cohortId: selected.cohort, cohortSubjectId: selected.cohort_subject },
      authorityMode: 'supervision',
      origin: { kind: 'hierarchy', returnTo: origin },
    });
  };

  const crumbs = [
    data.options.curricula.find((item) => item.id === selected.curriculum)?.name,
    data.options.academic_years.find((item) => item.id === selected.academic_year)?.name,
    data.options.terms.find((item) => item.id === selected.term)?.name,
    data.options.cohorts.find((item) => item.id === selected.cohort)?.name,
    data.options.cohort_subjects.find((item) => item.id === selected.cohort_subject)?.name,
  ].filter(Boolean);

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <header className="theme-card rounded-2xl border theme-border p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <div className="theme-brand-icon rounded-xl p-3"><School className="h-6 w-6" /></div>
          <div>
            <p className="theme-subtle text-xs font-semibold uppercase tracking-wider">Read-only oversight</p>
            <h1 className="mt-1 text-2xl font-semibold theme-text">Academic overview</h1>
            <p className="mt-1 text-sm theme-text-muted">Start school-wide, then select a year, term, cohort and cohort subject.</p>
          </div>
        </div>
      </header>

      <nav aria-label="Academic hierarchy" className="flex flex-wrap items-center gap-2 text-sm theme-text-muted">
        <span>{data.organization.name}</span>
        {crumbs.map((crumb) => <span key={crumb}>/ {crumb}</span>)}
      </nav>

      <section className="theme-card rounded-2xl border theme-border p-4">
        <div className="grid gap-3 md:grid-cols-5">
          {data.options.curricula.length > 1 ? (
            <HierarchySelect label="Curriculum" value={selected.curriculum} options={data.options.curricula} onChange={(value) => change('curriculum', value)} />
          ) : null}
          {selected.curriculum ? <HierarchySelect label="Academic year" value={selected.academic_year} options={data.options.academic_years} onChange={(value) => change('academic_year', value)} /> : null}
          {selected.academic_year ? <HierarchySelect label="Term" value={selected.term} options={data.options.terms} onChange={(value) => change('term', value)} /> : null}
          {selected.academic_year ? <HierarchySelect label="Cohort" value={selected.cohort} options={data.options.cohorts} onChange={(value) => change('cohort', value)} /> : null}
          {selected.cohort ? <HierarchySelect label="Cohort subject" value={selected.cohort_subject} options={data.options.cohort_subjects} onChange={(value) => change('cohort_subject', value)} /> : null}
        </div>
      </section>

      <section aria-label="School-wide academic signals" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="Active learners" value={data.summary.learners.active_count} state={data.summary.learners.state} />
        <Metric label="Cohorts" value={data.summary.cohorts.count} state={data.summary.cohorts.state} />
        <Metric label="Teaching assignments" value={data.summary.teaching_assignments.active_count} state={data.summary.teaching_assignments.state} />
        <Metric label="Lessons completed" value={`${data.summary.lessons.completed_count} / ${data.summary.lessons.planned_count}`} state={data.summary.lessons.state} />
        <Metric label="Attendance coverage" value={data.summary.attendance.coverage_percentage == null ? '—' : `${data.summary.attendance.coverage_percentage}%`} state={data.summary.attendance.state} />
        <Metric label="Attendance rate" value={data.summary.attendance.attendance_rate == null ? '—' : `${data.summary.attendance.attendance_rate}%`} state={data.summary.attendance.state} />
        <Metric label="Assessment results" value={`${data.summary.assessments.scored_count} scored`} state={data.summary.assessments.state} />
        <Metric label="Assignment participation" value={data.summary.assignments.participated_count} state={data.summary.assignments.state} />
        <Metric label="Project deployments" value={data.summary.projects.deployment_count} state={data.summary.projects.state} />
        <Metric label="Project evidence" value={data.summary.projects.evidence_count} state={data.summary.projects.state} />
        <Metric label="Curriculum progress" value={data.summary.curriculum_progress.percentage == null ? '—' : `${data.summary.curriculum_progress.percentage}%`} state={data.summary.curriculum_progress.state} />
      </section>

      {data.data_completeness.warnings.length ? (
        <section className="theme-card rounded-xl border theme-border p-4" aria-label="Data completeness warnings">
          <div className="flex items-center gap-2"><AlertTriangle className="h-4 w-4" /><h2 className="font-semibold theme-text">Incomplete data</h2></div>
          <ul className="mt-2 text-sm theme-text-muted">
            {data.data_completeness.warnings.map((warning) => <li key={warning.code}>{warning.code.replaceAll('_', ' ').toLowerCase()}: {warning.count}</li>)}
          </ul>
        </section>
      ) : null}

      {selected.cohort_subject ? (
        <section className="theme-card rounded-2xl border theme-border p-5">
          <div className="flex items-center gap-2"><BookOpen className="h-5 w-5" /><h2 className="font-semibold theme-text">Inspect this cohort subject</h2></div>
          <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {PROJECTIONS.map((item) => (
              <Link key={item.projection} href={reportHref(item.projection)} className="theme-focus-ring flex items-center justify-between rounded-xl border theme-border px-4 py-3 text-sm font-medium theme-text theme-hover-surface">
                {item.label}<ArrowRight className="h-4 w-4" />
              </Link>
            ))}
          </div>
        </section>
      ) : (
        <section className="theme-card rounded-2xl border border-dashed theme-border p-8 text-center">
          <GraduationCap className="mx-auto h-7 w-7 theme-muted" />
          <p className="mt-3 text-sm theme-text-muted">Select through the hierarchy to reveal domain records. Empty selectors mean no records exist for the selected parent.</p>
        </section>
      )}
    </div>
  );
}

function HierarchySelect({ label, value, options, onChange }: { label: string; value?: number; options: Array<{ id: number; name: string }>; onChange: (value: string) => void }) {
  return <label className="text-xs font-medium theme-text-muted">{label}<select aria-label={label} value={value ?? ''} onChange={(event) => onChange(event.target.value)} className="mt-1 min-h-11 w-full rounded-lg border theme-border theme-card px-3 text-sm theme-text"><option value="">Select {label.toLowerCase()}</option>{options.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}</select></label>;
}

function Metric({ label, value, state }: { label: string; value: string | number; state: string }) {
  return <div className="theme-card rounded-xl border theme-border p-4"><p className="text-xs font-medium theme-text-muted">{label}</p><p className="mt-2 text-2xl font-semibold theme-text">{value}</p><p className="mt-1 text-xs theme-subtle">{displayState(state)}</p></div>;
}
