import Link from 'next/link';
import { Edit, Eye, History, RotateCcw, Trash2, Users } from 'lucide-react';
import { Badge } from '@/app/components/ui/Badge';
import { Button } from '@/app/components/ui/Button';
import type { Cohort } from '@/app/core/types/academic';
import { getAcademicLevelLabel } from '@/app/core/lib/curriculumLevels';
import { getCurriculumBridgeName } from '@/app/core/lib/curriculumBridge';

interface CohortMobileCardProps {
  cohort: Cohort;
  onDelete: (cohort: Cohort) => void;
  onEdit: (cohort: Cohort) => void;
  onRollover: (cohort: Cohort) => void;
}

function pluralize(count: number, singular: string) {
  return `${count} ${singular}${count === 1 ? '' : 's'}`;
}

export function CohortMobileCard({
  cohort,
  onDelete,
  onEdit,
  onRollover,
}: CohortMobileCardProps) {
  const cohortHref = `/academic/cohorts/${cohort.id}`;
  const isHistoricalCohort = !cohort.is_current_year;
  const subjectCount = cohort.subjects_count ?? 0;
  const studentCount = cohort.students_count ?? 0;

  return (
    <article className="theme-card rounded-lg p-4">
      <Link href={cohortHref} className="-m-2 block rounded-lg p-2 theme-focus-ring">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="info">{getCurriculumBridgeName(cohort)}</Badge>
          {isHistoricalCohort ? (
            <Badge variant="default" size="sm">
              <History className="mr-1 h-3 w-3" />
              Historical
            </Badge>
          ) : null}
        </div>

        <div className="mt-3 min-w-0">
          <h3 className="text-base font-semibold text-blue-600">{cohort.name}</h3>
          <p className="mt-1 text-sm text-gray-600">
            {getAcademicLevelLabel(cohort.level, cohort.curriculum_type)}
            {cohort.stream ? ` - Stream ${cohort.stream}` : ' - No stream'}
          </p>
          {cohort.cbc_profile ? (
            <p className="mt-1 text-xs text-gray-500">
              {cohort.cbc_profile.pathway_name} - {cohort.cbc_profile.track_name} - #{cohort.cbc_profile.combination_code}
            </p>
          ) : null}
        </div>

        <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500">
          <span>{pluralize(subjectCount, 'subject')}</span>
          <span className="inline-flex items-center gap-1">
            <Users className="h-3.5 w-3.5" />
            {pluralize(studentCount, 'learner')}
          </span>
          <span>{cohort.academic_year_name}</span>
        </div>
      </Link>

      <div className="mt-4 flex justify-end gap-1 border-t border-gray-100 pt-3">
        {isHistoricalCohort ? (
          <>
            <Link href={`/academic/cohorts/${cohort.id}/students`}>
              <Button size="sm" variant="ghost" aria-label={`View ${cohort.name} learners`}>
                <Eye className="h-4 w-4" />
              </Button>
            </Link>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              aria-label={`Rollover ${cohort.name}`}
              onClick={() => onRollover(cohort)}
            >
              <RotateCcw className="h-4 w-4 text-blue-500" />
            </Button>
          </>
        ) : (
          <>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              aria-label={`Edit ${cohort.name}`}
              onClick={() => onEdit(cohort)}
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              aria-label={`Delete ${cohort.name}`}
              onClick={() => onDelete(cohort)}
            >
              <Trash2 className="h-4 w-4 text-red-500" />
            </Button>
          </>
        )}
      </div>
    </article>
  );
}
