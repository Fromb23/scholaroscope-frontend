'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { BookOpen, Target, TrendingUp, Users, ChevronRight, Filter } from 'lucide-react';
import {
  useStrandsByCurriculum,
  useStrandDetailsBySubjectProfiles,
} from '@/app/plugins/cbc/hooks/useCBC';
import { useCBCContext } from '@/app/plugins/cbc/context/CBCContext';
import { useCohorts, useSubjects } from '@/app/core/hooks/useAcademic';
import {
  CBCNav,
  CBCError,
  CBCLoading,
  CBCEmpty,
  SubjectGroupPicker,
} from '@/app/plugins/cbc/components/CBCComponents';
import { Card } from '@/app/components/ui/Card';
import { Badge } from '@/app/components/ui/Badge';
import { StatsCard } from '@/app/components/dashboard/StatsCard';
import { Select } from '@/app/components/ui/Select';
import type { Cohort, Subject } from '@/app/core/types/academic';
import { matchesCBCStrandToSubjectSelection } from '@/app/plugins/cbc/lib/visibility';
import { useResolvedCBCInstructorContext } from '@/app/plugins/cbc/hooks/useCBCInstructorContext';

function formatLevelLabel(level: string | null | undefined) {
  return (level ?? '')
    .replace('grade', 'Grade ')
    .replace(/(\d+)/, ' $1')
    .replace(/\s+/, ' ')
    .trim();
}

type StrandLike = {
  id: number;
  code: string;
  name: string;
  sequence?: number | null;
  subject?: number | null;
  subject_org_id?: number | null;
  subject_profile_id?: number | null;
  subject_name?: string | null;
  subject_level?: string | null;
  is_assigned?: boolean;
  sub_strands?: Array<{ outcomes_count?: number | null }>;
  sub_strands_count?: number | null;
};

function getSubStrandCount(strand: StrandLike) {
  const explicitCount = strand.sub_strands_count ?? 0;
  const nestedCount = strand.sub_strands?.length ?? 0;

  return Math.max(explicitCount, nestedCount);
}

function getOutcomeCount(strand: StrandLike) {
  return strand.sub_strands?.reduce(
    (sum, subStrand) => sum + (subStrand.outcomes_count ?? 0),
    0,
  ) ?? 0;
}

export default function CBCProgressPage() {
  const [selectedSubjectFilterId, setSelectedSubjectFilterId] = useState<number | null>(null);

  const {
    selectedCurriculumId,
    setSelectedCohort,
    selectedCohortId,
    isAdmin,
    curriculumLoading,
  } = useCBCContext();

  const { cohorts = [], loading: cohortsLoading } = useCohorts(
    isAdmin ? { curriculum: selectedCurriculumId ?? undefined } : undefined,
    { enabled: isAdmin },
  );

  const { subjects: adminSubjects = [], loading: subjectsLoading } = useSubjects(
    selectedCurriculumId ?? undefined,
    { enabled: isAdmin },
  );

  const instructorContext = useResolvedCBCInstructorContext({
    selectedCurriculumId,
    requestedCohortId: selectedCohortId,
    requestedSubjectId: selectedSubjectFilterId,
  });

  const {
    assignedCohorts,
    effectiveCohortId,
    effectiveCohort,
    subjectSelections: instructorSubjectSelections,
    subjectOptions: instructorSubjectOptions,
    selectedSubjectId: selectedVisibleSubjectId,
    selectedSelection: resolvedInstructorSubjectSelection,
    selectedProfileIds,
    hasVisibleProfiles,
    isLoading: instructorContextLoading,
    error: instructorContextError,
    refetch: refetchInstructorContext,
  } = instructorContext;

  const {
    data: adminStrands = [],
    isLoading: adminStrandsLoading,
    error: adminStrandsError,
    refetch: refetchAdminStrands,
  } = useStrandsByCurriculum(isAdmin ? selectedCurriculumId : null);

  const {
    data: instructorStrands = [],
    isLoading: instructorStrandsLoading,
    error: instructorStrandsError,
    refetch: refetchInstructorStrands,
  } = useStrandDetailsBySubjectProfiles({
    curriculumId: selectedCurriculumId,
    subjectProfileIds: selectedProfileIds,
  });

  const strandSource = useMemo(
    () => (isAdmin ? adminStrands : instructorStrands),
    [adminStrands, instructorStrands, isAdmin],
  );

  const subjectsForCurriculum = useMemo(() => {
    if (!selectedCurriculumId) return [];

    if (!isAdmin) {
      return instructorSubjectOptions;
    }

    const subjectIdsWithStrands = new Set(
      strandSource
        .filter(strand => getSubStrandCount(strand) > 0)
        .map(strand => strand.subject_org_id)
        .filter((value): value is number => value !== null && value !== undefined),
    );

    return adminSubjects.filter((subject: Subject) => subjectIdsWithStrands.has(subject.id));
  }, [
    adminSubjects,
    instructorSubjectOptions,
    isAdmin,
    selectedCurriculumId,
    strandSource,
  ]);

  const visibleStrands = useMemo(() => {
    const withContent = strandSource.filter(strand => getSubStrandCount(strand) > 0);

    if (!isAdmin) {
      // Instructor strandSource is already server-scoped by allowed CBC subject profiles.
      // Do not re-filter by kernel subject ids here; CBC authority is subject_profile.
      if (!resolvedInstructorSubjectSelection) {
        return withContent;
      }

      return withContent.filter(strand =>
        matchesCBCStrandToSubjectSelection(strand, resolvedInstructorSubjectSelection),
      );
    }

    if (selectedVisibleSubjectId === null) {
      return withContent;
    }

    return withContent.filter(strand => strand.subject_org_id === selectedVisibleSubjectId);
  }, [
    isAdmin,
    resolvedInstructorSubjectSelection,
    selectedVisibleSubjectId,
    strandSource,
  ]);

  const resolvedSubject = useMemo(
    () => subjectsForCurriculum.find(subject => subject.id === selectedVisibleSubjectId)
      ?? (subjectsForCurriculum.length === 1 ? subjectsForCurriculum[0] : null),
    [selectedVisibleSubjectId, subjectsForCurriculum],
  );

  const stats = useMemo(() => ({
    strands: visibleStrands.length,
    subStrands: visibleStrands.reduce(
      (sum, strand) => sum + getSubStrandCount(strand),
      0,
    ),
    outcomes: visibleStrands.reduce(
      (sum, strand) => sum + getOutcomeCount(strand),
      0,
    ),
    subjects: isAdmin
      ? new Set(
        visibleStrands
          .map(strand => strand.subject_org_id)
          .filter((value): value is number => value !== null && value !== undefined),
      ).size
      : subjectsForCurriculum.length,
  }), [isAdmin, subjectsForCurriculum.length, visibleStrands]);

  const isLoading = isAdmin
    ? curriculumLoading || cohortsLoading || subjectsLoading || adminStrandsLoading
    : curriculumLoading || instructorContextLoading || instructorStrandsLoading;

  const error = isAdmin
    ? adminStrandsError
    : (instructorContextError ?? instructorStrandsError);

  const refetch = () => {
    if (isAdmin) {
      refetchAdminStrands();
      return;
    }

    refetchInstructorContext();
    refetchInstructorStrands();
  };

  const handleCohortChange = (cohortId: number | null) => {
    setSelectedCohort(cohortId);
    setSelectedSubjectFilterId(null);
  };

  if (isLoading) {
    return <CBCLoading message="Loading your assignments…" />;
  }

  return (
    <div className="space-y-6">
      <CBCNav />

      <div className="flex items-center gap-4">
        <div className="p-3 bg-gradient-to-br from-purple-100 to-pink-100 rounded-xl">
          <TrendingUp className="h-8 w-8 text-purple-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">CBC Progress</h1>
          <p className="text-gray-500 mt-1">Track competency emergence across outcomes</p>
        </div>
      </div>

      {!isAdmin && hasVisibleProfiles && (
        <Card className="border-purple-100 bg-purple-50 p-4">
          <div className="flex flex-wrap items-start gap-6">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Resolved CBC Subject
              </p>
              {resolvedSubject ? (
                <div className="flex flex-wrap gap-2">
                  <Badge variant="purple" size="md">{resolvedSubject.name}</Badge>
                  <Badge variant="blue" size="md">
                    {formatLevelLabel(resolvedSubject.level)}
                  </Badge>
                </div>
              ) : (
                <p className="text-sm text-gray-600">Across assigned CBC subjects</p>
              )}
            </div>

            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Cohort Context
              </p>
              {effectiveCohort ? (
                <div className="flex flex-wrap gap-2">
                  <Badge variant="indigo" size="md">{effectiveCohort.name}</Badge>
                  <Badge variant="default" size="md">Cohort {effectiveCohort.id}</Badge>
                </div>
              ) : (
                <p className="text-sm text-gray-600">
                  Across {assignedCohorts.length} assigned CBC cohort
                  {assignedCohorts.length !== 1 ? 's' : ''}
                </p>
              )}
            </div>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1 space-y-4">
          <Card>
            <div className="flex items-center gap-2 mb-3">
              <Filter className="h-4 w-4 text-gray-400" />
              <h3 className="text-sm font-semibold text-gray-900">Cohort</h3>
            </div>
            <Select
              label=""
              value={effectiveCohort?.id.toString() ?? effectiveCohortId?.toString() ?? ''}
              onChange={event => handleCohortChange(
                event.target.value ? Number(event.target.value) : null,
              )}
              options={[
                { value: '', label: 'All cohorts' },
                ...(isAdmin ? cohorts : assignedCohorts).map(
                  (cohort: Cohort | { id: number; name: string }) => ({
                    value: String(cohort.id),
                    label: cohort.name,
                  }),
                ),
              ]}
            />
          </Card>

          <Card>
            <div className="flex items-center gap-2 mb-3">
              <BookOpen className="h-4 w-4 text-gray-400" />
              <h3 className="text-sm font-semibold text-gray-900">
                {isAdmin ? 'Subject' : 'My CBC Subject'}
              </h3>
            </div>
            <SubjectGroupPicker
              subjects={subjectsForCurriculum}
              selectedSubjectId={selectedVisibleSubjectId}
              onSelect={setSelectedSubjectFilterId}
              showAllOption={isAdmin || subjectsForCurriculum.length > 1}
              autoExpandSelected={!isAdmin}
              mode={isAdmin ? 'catalog' : 'instructor'}
              instructorSelections={instructorSubjectSelections}
            />
          </Card>
        </div>

        <div className="lg:col-span-3 space-y-4">
          {selectedCurriculumId && !error && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatsCard title="Strands" value={stats.strands} icon={BookOpen} color="blue" />
              <StatsCard title="Sub-Strands" value={stats.subStrands} icon={TrendingUp} color="green" />
              <StatsCard title="Outcomes" value={stats.outcomes} icon={Target} color="purple" />
              <StatsCard title="Subjects" value={stats.subjects} icon={Users} color="orange" />
            </div>
          )}

          {error && <CBCError error={error} onRetry={refetch} />}

          <Card>
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Target className="h-5 w-5 text-blue-600" />
                Strands
                {visibleStrands.length > 0 && (
                  <Badge variant="blue" size="sm">{visibleStrands.length}</Badge>
                )}
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                Click a strand to explore sub-strands and learning outcomes
              </p>
            </div>

            {isLoading ? (
              <CBCLoading message="Loading strands…" />
            ) : !isAdmin && !hasVisibleProfiles ? (
              <CBCEmpty
                icon={BookOpen}
                title="No CBC Subjects Attached"
                description="No CBC subjects are attached to your assigned cohorts."
              />
            ) : visibleStrands.length === 0 ? (
              <CBCEmpty
                icon={Target}
                title="No Strands Found"
                description="No strands match the selected filters"
              />
            ) : (
              <div className="space-y-1">
                {visibleStrands.map(strand => {
                  const subStrandCount = getSubStrandCount(strand);
                  const outcomeCount = getOutcomeCount(strand);

                  const subjectParam = isAdmin
                    ? (strand.subject_org_id ?? '')
                    : (
                      resolvedInstructorSubjectSelection?.subject_ids[0]
                      ?? strand.subject_org_id
                      ?? strand.subject
                      ?? ''
                    );

                  return (
                    <Link
                      key={strand.id}
                      href={`/cbc/progress/strand/${strand.id}?cohort=${effectiveCohortId ?? ''}&subject=${subjectParam}`}
                      className="flex items-center justify-between hover:bg-gray-50 -mx-2 px-2 py-3 rounded-lg transition-colors group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <Badge variant="blue" size="sm" className="font-mono shrink-0">
                          {strand.code}
                        </Badge>
                        <span className="font-medium text-gray-900 truncate">
                          {strand.name}
                        </span>
                        {!effectiveCohortId && !strand.is_assigned && (
                          <Badge variant="warning" size="sm" className="shrink-0">
                            No cohort yet
                          </Badge>
                        )}
                      </div>

                      <div className="flex items-center gap-3 shrink-0 ml-4">
                        <span className="text-sm text-gray-500">
                          {subStrandCount} sub-strands · {outcomeCount} outcomes
                        </span>
                        <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-blue-600 transition-colors" />
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}