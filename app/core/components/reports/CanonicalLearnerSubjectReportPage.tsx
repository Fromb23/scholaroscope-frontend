'use client';

import { useCallback, useEffect, useMemo } from 'react';
import { useParams, usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Activity, ClipboardCheck, FileBarChart, ListChecks } from 'lucide-react';

import { LearnerAssignmentReportPage } from './LearnerAssignmentReportPage';
import { LearnerAssessmentReportPage } from './LearnerAssessmentReportPage';
import { LearnerSubjectReportPage } from './LearnerSubjectReportPage';
import { AttendanceReportPage } from './AttendanceReportPage';
import { parseReportIntent, type ReportProjection } from './reportIntent';

const PROJECTIONS: Array<{ id: ReportProjection; label: string; icon: typeof FileBarChart }> = [
  { id: 'overview', label: 'Overview', icon: FileBarChart },
  { id: 'attendance', label: 'Attendance', icon: ClipboardCheck },
  { id: 'assessments-results', label: 'Assessments & Results', icon: ListChecks },
  { id: 'assignments', label: 'Assignments', icon: ListChecks },
  { id: 'curriculum-progress', label: 'Curriculum Progress', icon: Activity },
];

const PATH_OWNED_QUERY_KEYS = [
  'cohort_subject',
  'cohortSubject',
  'cohort_subject_id',
  'student',
  'learner',
  'learner_id',
] as const;

export function CanonicalLearnerSubjectReportPage() {
  const params = useParams<{ learnerId: string; cohortSubjectId: string }>();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const learnerId = Number(params.learnerId);
  const cohortSubjectId = Number(params.cohortSubjectId);
  const validIds = Number.isInteger(learnerId) && learnerId > 0
    && Number.isInteger(cohortSubjectId) && cohortSubjectId > 0;
  const intent = useMemo(() => parseReportIntent(
    {
      type: 'learner-subject',
      learnerId: validIds ? learnerId : 1,
      cohortSubjectId: validIds ? cohortSubjectId : 1,
    },
    new URLSearchParams(searchParams.toString()),
  ), [cohortSubjectId, learnerId, searchParams, validIds]);
  const projection = intent.projection;

  const navigateProjection = useCallback((nextProjection: ReportProjection) => {
    const next = new URLSearchParams(searchParams.toString());
    PATH_OWNED_QUERY_KEYS.forEach((key) => next.delete(key));
    next.set('projection', nextProjection);
    next.delete('tab');
    const query = next.toString();
    router.push(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [pathname, router, searchParams]);

  useEffect(() => {
    if (!validIds) return;
    const next = new URLSearchParams(searchParams.toString());
    let changed = false;
    PATH_OWNED_QUERY_KEYS.forEach((key) => {
      if (next.has(key)) {
        next.delete(key);
        changed = true;
      }
    });
    if (!next.get('projection') || next.has('tab')) {
      next.set('projection', projection);
      next.delete('tab');
      changed = true;
    }
    if (intent.focus?.assignmentId && !next.get('highlightAssignment')) {
      next.set('highlightAssignment', String(intent.focus.assignmentId));
      changed = true;
    }
    if (changed) {
      const query = next.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    }
  }, [cohortSubjectId, intent.focus?.assignmentId, learnerId, pathname, projection, router, searchParams, validIds]);

  if (!validIds) return <LearnerSubjectReportPage />;

  return (
    <div className="space-y-6">
      <nav className="flex flex-wrap gap-2" aria-label="Learner subject report projections">
        {PROJECTIONS.map((item) => {
          const Icon = item.icon;
          const active = projection === item.id;
          return (
            <button
              key={item.id}
              type="button"
              aria-current={active ? 'page' : undefined}
              onClick={() => navigateProjection(item.id)}
              className={`theme-focus-ring inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium ${active ? 'border-blue-600 bg-blue-600 text-white' : 'theme-border theme-surface theme-text'}`}
            >
              <Icon className="h-4 w-4" />{item.label}
            </button>
          );
        })}
      </nav>

      {projection === 'attendance' ? <AttendanceReportPage /> : null}
      {projection === 'assessments-results' ? <LearnerAssessmentReportPage /> : null}
      {projection === 'assignments' ? <LearnerAssignmentReportPage /> : null}
      {projection === 'overview' || projection === 'curriculum-progress' ? <LearnerSubjectReportPage /> : null}
    </div>
  );
}
