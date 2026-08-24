'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Badge } from '@/app/components/ui/Badge';
import { Button } from '@/app/components/ui/Button';
import {
  AssessmentGovernance,
  getAssessmentGovernanceLabel,
  type AssessmentDetailResponse,
} from '@/app/core/types/assessment';
import {
  getOperationalDetailBackLabel,
  resolveOperationalDetailBack,
} from '@/app/core/lib/operationalDetailNavigation';

interface AssessmentDetailHeaderProps {
  assessment: AssessmentDetailResponse;
  isDraft: boolean;
  isActive: boolean;
  isFinalized: boolean;
}

export function AssessmentDetailHeader({
  assessment,
  isDraft,
  isActive,
  isFinalized,
}: AssessmentDetailHeaderProps) {
  const searchParams = useSearchParams();
  const backHref = useMemo(() => {
    const parentParams = new URLSearchParams();
    if (assessment.term) parentParams.set('term', String(assessment.term));
    parentParams.set('cohort_subject', String(assessment.cohort_subject));
    const query = parentParams.toString();
    return resolveOperationalDetailBack({
      returnTo: searchParams.get('returnTo'),
      hierarchicalParent: `/assessments${query ? `?${query}` : ''}`,
      structuralFallback: '/assessments',
    });
  }, [assessment.cohort_subject, assessment.term, searchParams]);
  const backLabel = useMemo(() => getOperationalDetailBackLabel(backHref), [backHref]);
  return (
    <div className="space-y-3">
      <Link href={backHref}>
        <Button variant="ghost" size="sm">
          <ArrowLeft className="mr-2 h-4 w-4" />
          {backLabel}
        </Button>
      </Link>

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="flex flex-wrap items-center gap-2 text-xl font-semibold">
            <span className="truncate">{assessment.name}</span>
            <Badge variant={assessment.governance === AssessmentGovernance.FORMATIVE ? 'yellow' : 'blue'}>
              {getAssessmentGovernanceLabel(assessment.governance)}
            </Badge>
            <Badge variant="blue">{assessment.assessment_type_display}</Badge>
            <Badge variant="purple">{assessment.evaluation_type_display}</Badge>
          </h1>
          <p className="mt-0.5 truncate text-sm text-gray-500">
            {assessment.subject_name} — {assessment.cohort_name}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
          {isDraft && <Badge variant="default">Prepared</Badge>}
          {isActive && <Badge variant="yellow">Scores open</Badge>}
          {isFinalized && <Badge variant="green">Results finalized</Badge>}
        </div>
      </div>
    </div>
  );
}
