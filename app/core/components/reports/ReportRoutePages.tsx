'use client';

import { useParams } from 'next/navigation';
import CanonicalCohortSubjectReportPage from '@/app/core/components/reports/InstructorCohortSubjectReportPage';
import { CohortsReportPage } from '@/app/core/components/reports/CohortsReportPage';
import { StudentsReportPage } from '@/app/core/components/reports/StudentsReportPage';
import { SubjectsReportPage } from '@/app/core/components/reports/SubjectsReportPage';

export function CohortSubjectReportRoutePage() {
    return <CanonicalCohortSubjectReportPage />;
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
