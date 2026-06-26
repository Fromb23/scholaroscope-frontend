'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import {
    ArrowLeft,
    CheckCircle,
    Download,
    Edit,
    PlayCircle,
    Trash2,
} from 'lucide-react';
import { Badge } from '@/app/components/ui/Badge';
import { Button } from '@/app/components/ui/Button';
import type { AssessmentDetail } from '@/app/core/types/assessment';

interface AssessmentDetailHeaderProps {
    assessment: AssessmentDetail;
    assessmentId: number;
    isDraft: boolean;
    isActive: boolean;
    isFinalized: boolean;
    canUpdate: boolean;
    canDelete: boolean;
    canActivate: boolean;
    canFinalize: boolean;
    canExportPdf: boolean;
    finalizing: boolean;
    deleting: boolean;
    downloadingPdf: boolean;
    onActivate: () => void;
    onFinalize: () => void;
    onDownloadPdf: () => void;
    onDelete: () => void;
}

export function AssessmentDetailHeader({
    assessment,
    assessmentId,
    isDraft,
    isActive,
    isFinalized,
    canUpdate,
    canDelete,
    canActivate,
    canFinalize,
    canExportPdf,
    finalizing,
    deleting,
    downloadingPdf,
    onActivate,
    onFinalize,
    onDownloadPdf,
    onDelete,
}: AssessmentDetailHeaderProps) {
    const searchParams = useSearchParams();
    const safeReturnTo = useMemo(() => {
        const value = searchParams.get('returnTo');
        return value?.startsWith('/') ? value : null;
    }, [searchParams]);
    const editHref = useMemo(() => {
        if (!safeReturnTo) {
            return `/assessments/${assessmentId}/edit`;
        }
        return `/assessments/${assessmentId}/edit?${new URLSearchParams({
            returnTo: safeReturnTo,
        }).toString()}`;
    }, [assessmentId, safeReturnTo]);

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
                    {isDraft && <Badge variant="default">Draft</Badge>}
                    {isActive && <Badge variant="yellow">Active</Badge>}
                    {isFinalized && <Badge variant="green">Finalized</Badge>}
                </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
                {canExportPdf && (
                    <Button variant="secondary" size="sm" onClick={onDownloadPdf} disabled={downloadingPdf}>
                        <Download className="mr-1.5 h-4 w-4" />
                        {downloadingPdf ? 'Downloading…' : 'Download PDF'}
                    </Button>
                )}
                {isDraft && canActivate && (
                    <Button variant="secondary" size="sm" onClick={onActivate}>
                        <PlayCircle className="mr-1.5 h-4 w-4" />
                        Activate
                    </Button>
                )}
                {isActive && canFinalize && (
                    <Button variant="primary" size="sm" onClick={onFinalize} disabled={finalizing}>
                        <CheckCircle className="mr-1.5 h-4 w-4" />
                        {finalizing ? 'Finalizing…' : 'Finalize'}
                    </Button>
                )}
                {!isFinalized && canUpdate && (
                    <Link href={editHref}>
                        <Button variant="secondary" size="sm">
                            <Edit className="mr-1.5 h-4 w-4" />
                            Edit
                        </Button>
                    </Link>
                )}
                {canDelete && (
                    <Button variant="ghost" size="sm" onClick={onDelete} disabled={deleting}>
                        <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                )}
            </div>
        </div>
    );
}
