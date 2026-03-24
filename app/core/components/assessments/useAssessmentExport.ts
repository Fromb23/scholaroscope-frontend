// Encapsulates all export payload construction — keeps it out of the page.

import {
    AssessmentDetail,
    AssessmentScore,
    calculateGrade,
} from '@/app/core/types/assessment';
import type { ExportPayload, ExportPreset } from '@/app/types/export';

export function buildExportPayload(
    assessment: AssessmentDetail,
    scores: AssessmentScore[],
    userEmail: string,
): ExportPayload {
    return {
        title: assessment.name,
        subtitle: `${assessment.subject_name} • ${assessment.cohort_name}`,
        metadata: {
            term: assessment.term_name ?? 'Year-round',
            assessmentDate: assessment.assessment_date
                ? new Date(assessment.assessment_date).toLocaleDateString()
                : 'Not set',
            assessmentType: assessment.assessment_type_display,
            evaluationType: assessment.evaluation_type_display,
            totalMarks: assessment.total_marks?.toString() ?? 'N/A',
            totalStudents: scores.length.toString(),
            scoredStudents: scores.filter(s => s.score != null).length.toString(),
            generatedBy: userEmail,
            generatedAt: new Date().toLocaleString(),
        },
        columns: [
            { key: 'student_name', label: 'Student Name', width: 25 },
            { key: 'student_admission', label: 'Admission Number', width: 15 },
            ...(assessment.evaluation_type === 'NUMERIC' ? [
                { key: 'score', label: `Score (/${assessment.total_marks})`, width: 12, align: 'center' as const, format: 'number' as const },
                { key: 'percentage', label: 'Percentage', width: 12, align: 'center' as const, format: 'percentage' as const },
                { key: 'grade', label: 'Grade', width: 10, align: 'center' as const },
            ] : []),
            { key: 'comments', label: 'Comments', width: 35 },
        ],
        rows: scores.map(s => {
            const g = assessment.evaluation_type === 'NUMERIC' && s.score != null
                ? calculateGrade(s.score, assessment.total_marks ?? 100)
                : null;
            return {
                student_name: s.student_name,
                student_admission: s.student_admission,
                score: s.score ?? '',
                percentage: s.score && assessment.total_marks
                    ? (s.score / assessment.total_marks) * 100 : '',
                grade: g?.grade ?? '',
                comments: s.comments ?? '',
            };
        }),
        fileName: `${assessment.name.replace(/\s+/g, '_')}_Scores`,
        includeMetadata: true,
        includeTimestamp: true,
        freezeHeader: true,
        autoFilter: true,
        orientation: 'landscape',
        sheetName: 'Assessment Scores',
    };
}

export function buildExportPresets(assessment: AssessmentDetail): ExportPreset[] {
    return [
        {
            id: 'scores-only', label: 'Scores Only',
            description: 'Names and scores without comments',
            columns: [
                { key: 'student_name', label: 'Student Name', width: 25 },
                { key: 'student_admission', label: 'Admission No.', width: 15 },
                ...(assessment.evaluation_type === 'NUMERIC' ? [
                    { key: 'score', label: 'Score', width: 12, format: 'number' as const },
                    { key: 'grade', label: 'Grade', width: 10 },
                ] : []),
            ],
            includeMetadata: false,
        },
        {
            id: 'full-report', label: 'Full Report',
            description: 'Complete data with all details',
            columns: [
                { key: 'student_name', label: 'Student Name', width: 25 },
                { key: 'student_admission', label: 'Admission No.', width: 15 },
                ...(assessment.evaluation_type === 'NUMERIC' ? [
                    { key: 'score', label: 'Score', width: 12, format: 'number' as const },
                    { key: 'percentage', label: 'Percentage', width: 12, format: 'percentage' as const },
                    { key: 'grade', label: 'Grade', width: 10 },
                ] : []),
                { key: 'comments', label: 'Comments', width: 35 },
            ],
            includeMetadata: true,
        },
    ];
}