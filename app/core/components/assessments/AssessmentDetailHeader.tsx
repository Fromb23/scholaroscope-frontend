'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import {
    ArrowLeft,
} from 'lucide-react';
import { Badge } from '@/app/components/ui/Badge';
import { Button } from '@/app/components/ui/Button';
import type { AssessmentDetailResponse } from '@/app/core/types/assessment';

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
    const safeReturnTo = useMemo(() => {
        const value = searchParams.get('returnTo');
        return value?.startsWith('/') ? value : null;
    }, [searchParams]);
    return (
        <div className="space-y-3">
            <Link href={safeReturnTo ?? '/assessments'}>
                <Button variant="ghost" size="sm">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back
                </Button>
            </Link>

            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                    <h1 className="flex flex-wrap items-center gap-2 text-xl font-semibold">
                        <span className="truncate">{assessment.name}</span>
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
