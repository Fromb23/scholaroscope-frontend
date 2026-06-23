'use client';

import { useParams, useSearchParams } from 'next/navigation';
import { ClassSubjectReportPage } from '@/app/core/components/reports/ClassSubjectReportPage';
import { CohortsReportPage } from '@/app/core/components/reports/CohortsReportPage';
import { StudentsReportPage } from '@/app/core/components/reports/StudentsReportPage';
import { SubjectsReportPage } from '@/app/core/components/reports/SubjectsReportPage';
import {
    buildCohortReportHref,
    parsePositiveReportParam,
} from '@/app/core/components/reports/reportNavigation';

export function CohortSubjectReportRoutePage() {
    const searchParams = useSearchParams();
    const cohortId = parsePositiveReportParam(
        searchParams.get('cohort') ?? searchParams.get('cohort_id'),
    );
    const termId = parsePositiveReportParam(searchParams.get('term'));

    return (
        <ClassSubjectReportPage
            cohortIdOverride={cohortId}
            fallbackReturnTo={cohortId ? buildCohortReportHref(cohortId, { term: termId }) : '/reports/cohorts'}
        />
    );
}

export function CohortReportRoutePage() {
    const params = useParams<{ cohortId: string }>();
    const cohortId = Number(params.cohortId);

    return <CohortsReportPage cohortIdFromRoute={Number.isFinite(cohortId) ? cohortId : null} />;
}

export function StudentReportRoutePage() {
    const params = useParams<{ studentId: string }>();
    const studentId = Number(params.studentId);

    return <StudentsReportPage studentIdFromRoute={Number.isFinite(studentId) ? studentId : null} />;
}

export function SubjectReportRoutePage() {
    const params = useParams<{ subjectId: string }>();
    const subjectId = Number(params.subjectId);

    return <SubjectsReportPage subjectIdFromRoute={Number.isFinite(subjectId) ? subjectId : null} />;
}
