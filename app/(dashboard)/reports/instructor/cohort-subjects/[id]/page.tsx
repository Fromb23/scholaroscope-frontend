'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useMemo, useState, type ElementType } from 'react';
import {
    Activity, ArrowLeft, BookOpen, CheckCircle2, Download, FileBarChart,
    GraduationCap, ListChecks, TrendingUp, Users,
} from 'lucide-react';
import { Card } from '@/app/components/ui/Card';
import { Badge } from '@/app/components/ui/Badge';
import { Button } from '@/app/components/ui/Button';
import { Select } from '@/app/components/ui/Select';
import { ErrorState } from '@/app/components/ui/ErrorState';
import { LoadingSpinner } from '@/app/components/ui/LoadingSpinner';
import { ExportModal } from '@/app/components/export/ExportModal';
import { StatsCard } from '@/app/components/dashboard/StatsCard';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/app/components/ui/Table';
import { GradeBadge } from '@/app/core/components/reports/GradeBadge';
import {
    useInstructorCohortSubjectLearners,
    useInstructorCohortSubjectPerformance,
    useInstructorCohortSubjectTeachingActivity,
    useInstructorCohortSubjects,
} from '@/app/core/hooks/useReporting';
import { useTerms } from '@/app/core/hooks/useAcademic';
import type { ExportPayload } from '@/app/types/export';

type DetailTab = 'learners' | 'performance' | 'teaching-activity';

const TABS: Array<{ id: DetailTab; label: string; icon: ElementType }> = [
    { id: 'learners', label: 'Learners', icon: Users },
    { id: 'performance', label: 'Performance', icon: TrendingUp },
    { id: 'teaching-activity', label: 'Teaching Activity', icon: Activity },
];

function toPercent(value: number | null | undefined): string {
    return typeof value === 'number' ? `${value.toFixed(1)}%` : '—';
}

export default function InstructorCohortSubjectDetailReportPage() {
    const params = useParams<{ id: string }>();
    const cohortSubjectId = Number(params.id);
    const isValidCohortSubjectId = Number.isFinite(cohortSubjectId) && cohortSubjectId > 0;

    const [activeTab, setActiveTab] = useState<DetailTab>('learners');
    const [selectedTerm, setSelectedTerm] = useState<number | null>(null);
    const [exportOpen, setExportOpen] = useState(false);

    const { terms, loading: termsLoading } = useTerms();
    const {
        cohortSubjects,
        loading: cohortSubjectsLoading,
        error: cohortSubjectsError,
    } = useInstructorCohortSubjects();

    const learnersQuery = useInstructorCohortSubjectLearners(
        isValidCohortSubjectId ? cohortSubjectId : null,
        selectedTerm,
        { enabled: activeTab === 'learners' && isValidCohortSubjectId },
    );
    const performanceQuery = useInstructorCohortSubjectPerformance(
        isValidCohortSubjectId ? cohortSubjectId : null,
        selectedTerm,
        { enabled: activeTab === 'performance' && isValidCohortSubjectId },
    );
    const teachingActivityQuery = useInstructorCohortSubjectTeachingActivity(
        isValidCohortSubjectId ? cohortSubjectId : null,
        selectedTerm,
        { enabled: activeTab === 'teaching-activity' && isValidCohortSubjectId },
    );

    const cohortSubjectMeta = cohortSubjects.find(item => item.id === cohortSubjectId) ?? null;
    const reportCohortSubject = learnersQuery.report?.cohort_subject
        ?? performanceQuery.report?.cohort_subject
        ?? teachingActivityQuery.report?.cohort_subject
        ?? null;

    const pageTitle = cohortSubjectMeta
        ? `${cohortSubjectMeta.cohort_name} — ${cohortSubjectMeta.subject_name}`
        : reportCohortSubject
            ? `${reportCohortSubject.cohort_name} — ${reportCohortSubject.subject_name}`
            : `Cohort Subject #${cohortSubjectId}`;

    const activeQuery = activeTab === 'learners'
        ? learnersQuery
        : activeTab === 'performance'
            ? performanceQuery
            : teachingActivityQuery;

    const activeErrorMessage = activeQuery.error;
    const activeErrorStatus = activeQuery.errorStatus;

    const exportPayload = useMemo<ExportPayload | null>(() => {
        if (!isValidCohortSubjectId) return null;

        if (activeTab === 'learners' && learnersQuery.report) {
            return {
                title: `${pageTitle} Learner Report`,
                subtitle: selectedTerm
                    ? terms.find(term => term.id === selectedTerm)?.name ?? 'Selected term'
                    : 'All terms',
                metadata: {
                    cohort: reportCohortSubject?.cohort_name ?? cohortSubjectMeta?.cohort_name ?? '—',
                    subject: reportCohortSubject?.subject_name ?? cohortSubjectMeta?.subject_name ?? '—',
                    term: learnersQuery.report.term?.name ?? 'All terms',
                    academicYear: learnersQuery.report.term?.academic_year ?? cohortSubjectMeta?.academic_year ?? '—',
                    generatedAt: new Date().toLocaleString(),
                },
                columns: [
                    { key: 'student_name', label: 'Learner', width: 24 },
                    { key: 'admission_number', label: 'Admission No.', width: 14 },
                    { key: 'attendance', label: 'Attendance', format: 'percentage', width: 14, align: 'right' as const },
                    { key: 'final_score', label: 'Final Score', format: 'percentage', width: 14, align: 'right' as const },
                    { key: 'grade', label: 'Grade', width: 10 },
                    { key: 'grade_status', label: 'Status', width: 14 },
                    { key: 'completed_scores', label: 'Scores Entered', format: 'number', width: 14, align: 'right' as const },
                    { key: 'total_assessments', label: 'Assessments', format: 'number', width: 14, align: 'right' as const },
                ],
                rows: learnersQuery.report.learners.map(item => ({
                    student_name: item.student.name,
                    admission_number: item.student.admission_number,
                    attendance: item.attendance_summary?.average ?? null,
                    final_score: item.computed_grade?.final_score
                        ?? item.grade_summary?.weighted_average
                        ?? item.grade_summary?.average_score
                        ?? null,
                    grade: item.computed_grade?.letter_grade ?? item.grade_summary?.final_grade ?? '—',
                    grade_status: item.computed_grade?.grade_status ?? 'No computed grade',
                    completed_scores: item.assessment_completion.completed_scores,
                    total_assessments: item.assessment_completion.total_assessments,
                })),
                fileName: `learner-report-${cohortSubjectId}`,
                includeMetadata: true,
                includeTimestamp: true,
                sheetName: 'Learners',
                freezeHeader: true,
                autoFilter: true,
                orientation: 'landscape' as const,
            };
        }

        if (activeTab === 'performance' && performanceQuery.report) {
            return {
                title: `${pageTitle} Performance Report`,
                subtitle: selectedTerm
                    ? terms.find(term => term.id === selectedTerm)?.name ?? 'Selected term'
                    : 'All terms',
                metadata: {
                    totalLearners: String(performanceQuery.report.total_learners),
                    averageScore: toPercent(performanceQuery.report.average_score),
                    highestScore: toPercent(performanceQuery.report.highest_score),
                    lowestScore: toPercent(performanceQuery.report.lowest_score),
                    gradeDistribution: performanceQuery.report.grade_distribution
                        .map(item => `${item.letter_grade ?? 'Unassigned'}: ${item.count}`)
                        .join(' | ') || 'No grades',
                    gradeStatusCounts: performanceQuery.report.grade_status_counts
                        .map(item => `${item.grade_status ?? 'Unknown'}: ${item.count}`)
                        .join(' | ') || 'No grade statuses',
                    generatedAt: new Date().toLocaleString(),
                },
                columns: [
                    { key: 'section', label: 'Section', width: 18 },
                    { key: 'label', label: 'Label', width: 24 },
                    { key: 'count', label: 'Count', format: 'number', width: 12, align: 'right' as const },
                    { key: 'average_score', label: 'Average Score', format: 'percentage', width: 16, align: 'right' as const },
                ],
                rows: [
                    ...performanceQuery.report.grade_distribution.map(item => ({
                        section: 'Grade Distribution',
                        label: item.letter_grade ?? 'Unassigned',
                        count: item.count,
                        average_score: null,
                    })),
                    ...performanceQuery.report.grade_status_counts.map(item => ({
                        section: 'Grade Status',
                        label: item.grade_status ?? 'Unknown',
                        count: item.count,
                        average_score: null,
                    })),
                    ...performanceQuery.report.assessment_type_breakdown.map(item => ({
                        section: 'Assessment Type',
                        label: item.assessment_type,
                        count: item.total_assessments,
                        average_score: item.average_score,
                    })),
                ],
                fileName: `performance-report-${cohortSubjectId}`,
                includeMetadata: true,
                includeTimestamp: true,
                sheetName: 'Performance',
                freezeHeader: true,
                autoFilter: true,
                orientation: 'landscape' as const,
            };
        }

        if (activeTab === 'teaching-activity' && teachingActivityQuery.report) {
            return {
                title: `${pageTitle} Teaching Activity Report`,
                subtitle: selectedTerm
                    ? terms.find(term => term.id === selectedTerm)?.name ?? 'Selected term'
                    : 'All terms',
                metadata: {
                    generatedAt: new Date().toLocaleString(),
                },
                columns: [
                    { key: 'sessions_created', label: 'Sessions Created', format: 'number', width: 16, align: 'right' as const },
                    { key: 'sessions_completed', label: 'Sessions Completed', format: 'number', width: 18, align: 'right' as const },
                    { key: 'attendance_marked', label: 'Attendance Marked', format: 'number', width: 18, align: 'right' as const },
                    { key: 'attendance_expected', label: 'Attendance Expected', format: 'number', width: 18, align: 'right' as const },
                    { key: 'attendance_completeness', label: 'Attendance Completeness', format: 'percentage', width: 20, align: 'right' as const },
                ],
                rows: [{
                    sessions_created: teachingActivityQuery.report.sessions_created,
                    sessions_completed: teachingActivityQuery.report.sessions_completed,
                    attendance_marked: teachingActivityQuery.report.attendance_marked,
                    attendance_expected: teachingActivityQuery.report.attendance_expected,
                    attendance_completeness: teachingActivityQuery.report.attendance_completeness,
                }],
                fileName: `teaching-activity-report-${cohortSubjectId}`,
                includeMetadata: true,
                includeTimestamp: true,
                sheetName: 'Teaching Activity',
                freezeHeader: true,
                autoFilter: true,
                orientation: 'landscape' as const,
            };
        }

        return null;
    }, [
        activeTab,
        cohortSubjectId,
        cohortSubjectMeta,
        isValidCohortSubjectId,
        learnersQuery.report,
        pageTitle,
        performanceQuery.report,
        reportCohortSubject,
        selectedTerm,
        teachingActivityQuery.report,
        terms,
    ]);

    if (!isValidCohortSubjectId) {
        return <ErrorState message="Invalid cohort subject." fullScreen={false} />;
    }

    if (cohortSubjectsLoading && !cohortSubjectMeta && activeQuery.loading) {
        return <LoadingSpinner />;
    }

    if (cohortSubjectsError && !cohortSubjectMeta) {
        return <ErrorState message={cohortSubjectsError} fullScreen={false} />;
    }

    return (
        <div className="space-y-6">

            <div className="space-y-3">
                <Link href="/reports/instructor/cohort-subjects">
                    <Button variant="ghost" size="sm">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back
                    </Button>
                </Link>

                <div className="flex items-start justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-semibold text-gray-900">{pageTitle}</h1>
                        <p className="text-gray-500 mt-1">
                            Cohort-subject scoped reporting for learners, performance, and teaching activity.
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        {exportPayload && (
                            <Button variant="secondary" size="sm" onClick={() => setExportOpen(true)}>
                                <Download className="h-4 w-4 mr-1.5" />
                                Export
                            </Button>
                        )}
                        <FileBarChart className="h-7 w-7 text-green-600" />
                    </div>
                </div>
            </div>

            <Card>
                <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                    <div className="flex flex-wrap gap-2">
                        {cohortSubjectMeta && <Badge variant="blue">{cohortSubjectMeta.cohort_name}</Badge>}
                        <Badge variant="default">{cohortSubjectMeta?.curriculum ?? 'Reporting scope'}</Badge>
                        {cohortSubjectMeta?.academic_year && (
                            <Badge variant="purple">{cohortSubjectMeta.academic_year}</Badge>
                        )}
                    </div>
                    <div className="w-full xl:w-72">
                        <Select
                            label="Term (optional)"
                            value={selectedTerm?.toString() ?? ''}
                            onChange={event => setSelectedTerm(event.target.value ? Number(event.target.value) : null)}
                            disabled={termsLoading}
                            options={[
                                { value: '', label: 'All terms' },
                                ...terms.map(term => ({
                                    value: String(term.id),
                                    label: `${term.academic_year_name} — ${term.name}`,
                                })),
                            ]}
                        />
                    </div>
                </div>
            </Card>

            <div className="flex flex-wrap gap-2">
                {TABS.map(tab => {
                    const Icon = tab.icon;
                    const active = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            type="button"
                            onClick={() => setActiveTab(tab.id)}
                            className={`inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                                active
                                    ? 'border-blue-600 bg-blue-600 text-white'
                                    : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                            }`}
                        >
                            <Icon className="h-4 w-4" />
                            {tab.label}
                        </button>
                    );
                })}
            </div>

            {activeQuery.loading && <LoadingSpinner />}

            {!activeQuery.loading && activeErrorMessage && (
                <ErrorState
                    fullScreen={false}
                    message={
                        activeErrorStatus === 403
                            ? activeErrorMessage || 'You do not have access to this report.'
                            : activeErrorStatus === 404
                                ? activeErrorMessage || 'This report could not be found.'
                                : activeErrorMessage
                    }
                    onRetry={activeQuery.refetch}
                />
            )}

            {!activeQuery.loading && !activeErrorMessage && activeTab === 'learners' && learnersQuery.report && (
                learnersQuery.report.learners.length === 0 ? (
                    <Card>
                        <div className="py-12 text-center">
                            <Users className="mx-auto h-10 w-10 text-gray-300" />
                            <p className="mt-2 text-sm text-gray-500">
                                No active learners are visible for this cohort subject.
                            </p>
                        </div>
                    </Card>
                ) : (
                    <Card>
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="font-semibold text-gray-900">Learners</h2>
                            <Badge variant="blue">{learnersQuery.report.total_learners} learners</Badge>
                        </div>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Learner</TableHead>
                                    <TableHead>Attendance</TableHead>
                                    <TableHead>Final Score</TableHead>
                                    <TableHead>Grade</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Assessments</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {learnersQuery.report.learners.map(item => {
                                    const missingAssessments = Math.max(
                                        item.assessment_completion.total_assessments - item.assessment_completion.completed_scores,
                                        0,
                                    );
                                    return (
                                        <TableRow key={item.student.id}>
                                            <TableCell>
                                                <p className="font-medium text-gray-900">{item.student.name}</p>
                                                <p className="text-xs text-gray-500">{item.student.admission_number}</p>
                                            </TableCell>
                                            <TableCell>{toPercent(item.attendance_summary?.average)}</TableCell>
                                            <TableCell>
                                                {typeof item.computed_grade?.final_score === 'number'
                                                    ? `${item.computed_grade.final_score.toFixed(1)}%`
                                                    : typeof item.grade_summary?.weighted_average === 'number'
                                                        ? `${item.grade_summary.weighted_average.toFixed(1)}%`
                                                        : typeof item.grade_summary?.average_score === 'number'
                                                            ? `${item.grade_summary.average_score.toFixed(1)}%`
                                                            : '—'}
                                            </TableCell>
                                            <TableCell>
                                                {item.computed_grade ? (
                                                    <GradeBadge
                                                        grade={item.computed_grade.letter_grade ?? ''}
                                                        label={item.computed_grade.letter_label ?? undefined}
                                                        status={item.computed_grade.grade_status ?? undefined}
                                                    />
                                                ) : (
                                                    <Badge variant="default">
                                                        {item.grade_summary?.final_grade ?? 'No grade'}
                                                    </Badge>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <div className="space-y-1">
                                                    <Badge variant={item.computed_grade ? 'green' : 'yellow'}>
                                                        {item.computed_grade?.grade_status ?? 'Awaiting computation'}
                                                    </Badge>
                                                    {missingAssessments > 0 && (
                                                        <p className="text-xs text-gray-500">
                                                            Missing {missingAssessments} assessment
                                                            {missingAssessments === 1 ? '' : 's'}
                                                        </p>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                {item.assessment_completion.completed_scores}/
                                                {item.assessment_completion.total_assessments}
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </Card>
                )
            )}

            {!activeQuery.loading && !activeErrorMessage && activeTab === 'performance' && performanceQuery.report && (
                <div className="space-y-6">
                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                        <StatsCard title="Learners" value={performanceQuery.report.total_learners} icon={Users} color="blue" />
                        <StatsCard title="Average Score" value={toPercent(performanceQuery.report.average_score)} icon={TrendingUp} color="green" />
                        <StatsCard title="Highest Score" value={toPercent(performanceQuery.report.highest_score)} icon={GraduationCap} color="purple" />
                        <StatsCard title="Lowest Score" value={toPercent(performanceQuery.report.lowest_score)} icon={TrendingUp} color="orange" />
                    </div>

                    <Card>
                        <div className="grid gap-4 lg:grid-cols-2">
                            <div>
                                <h2 className="font-semibold text-gray-900 mb-3">Grade Distribution</h2>
                                {performanceQuery.report.grade_distribution.length === 0 ? (
                                    <p className="text-sm text-gray-500">No grade distribution data available.</p>
                                ) : (
                                    <div className="space-y-2">
                                        {performanceQuery.report.grade_distribution.map(item => (
                                            <div key={item.letter_grade ?? 'unassigned'} className="flex items-center justify-between rounded-lg border border-gray-200 px-3 py-2">
                                                <span className="font-medium text-gray-900">{item.letter_grade ?? 'Unassigned'}</span>
                                                <Badge variant="blue">{item.count}</Badge>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <div>
                                <h2 className="font-semibold text-gray-900 mb-3">Grade Status</h2>
                                {performanceQuery.report.grade_status_counts.length === 0 ? (
                                    <p className="text-sm text-gray-500">No grade status data available.</p>
                                ) : (
                                    <div className="space-y-2">
                                        {performanceQuery.report.grade_status_counts.map(item => (
                                            <div key={item.grade_status ?? 'unknown'} className="flex items-center justify-between rounded-lg border border-gray-200 px-3 py-2">
                                                <span className="font-medium text-gray-900">{item.grade_status ?? 'Unknown'}</span>
                                                <Badge variant="purple">{item.count}</Badge>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </Card>

                    <Card>
                        <div className="flex items-center gap-2 mb-4">
                            <ListChecks className="h-5 w-5 text-orange-500" />
                            <h2 className="font-semibold text-gray-900">Assessment Type Breakdown</h2>
                        </div>
                        {performanceQuery.report.assessment_type_breakdown.length === 0 ? (
                            <p className="text-sm text-gray-500">No assessment breakdown data available.</p>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Assessment Type</TableHead>
                                        <TableHead>Total Assessments</TableHead>
                                        <TableHead>Average Score</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {performanceQuery.report.assessment_type_breakdown.map(item => (
                                        <TableRow key={item.assessment_type}>
                                            <TableCell>{item.assessment_type}</TableCell>
                                            <TableCell>{item.total_assessments}</TableCell>
                                            <TableCell>{toPercent(item.average_score)}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </Card>
                </div>
            )}

            {!activeQuery.loading && !activeErrorMessage && activeTab === 'teaching-activity' && teachingActivityQuery.report && (
                <div className="space-y-6">
                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                        <StatsCard title="Sessions Created" value={teachingActivityQuery.report.sessions_created} icon={BookOpen} color="blue" />
                        <StatsCard title="Sessions Completed" value={teachingActivityQuery.report.sessions_completed} icon={CheckCircle2} color="green" />
                        <StatsCard title="Attendance Marked" value={teachingActivityQuery.report.attendance_marked} icon={Users} color="purple" />
                        <StatsCard
                            title="Attendance Completeness"
                            value={toPercent(teachingActivityQuery.report.attendance_completeness)}
                            icon={Activity}
                            color="indigo"
                        />
                    </div>

                    <Card>
                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="rounded-lg border border-gray-200 p-4">
                                <p className="text-sm text-gray-500">Attendance Expected</p>
                                <p className="mt-2 text-2xl font-semibold text-gray-900">
                                    {teachingActivityQuery.report.attendance_expected}
                                </p>
                            </div>
                        </div>
                    </Card>

                    {teachingActivityQuery.report.sessions_created === 0 && (
                        <Card>
                            <div className="py-12 text-center">
                                <Activity className="mx-auto h-10 w-10 text-gray-300" />
                                <p className="mt-2 text-sm text-gray-500">
                                    No teaching activity has been recorded for this cohort subject yet.
                                </p>
                            </div>
                        </Card>
                    )}
                </div>
            )}

            {exportPayload && (
                <ExportModal
                    open={exportOpen}
                    onClose={() => setExportOpen(false)}
                    payload={exportPayload}
                    defaultFormat="excel"
                    title="Export Report"
                />
            )}

        </div>
    );
}
