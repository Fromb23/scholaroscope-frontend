'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ClipboardList, Plus, Filter, TrendingUp, Award, FileText } from 'lucide-react';
import { Card } from '@/app/components/ui/Card';
import { Button } from '@/app/components/ui/Button';
import { Badge } from '@/app/components/ui/Badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/app/components/ui/Table';
import { Select } from '@/app/components/ui/Select';
import { StatsCard } from '@/app/components/dashboard/StatsCard';
import { useAssessments } from '@/app/core/hooks/useAssessments';
import { useTerms, useSubjects } from '@/app/core/hooks/useAcademic';
import { Assessment } from '@/app/core/types/assessment';

export default function AssessmentsOverview() {
    const router = useRouter();
    const [selectedTerm, setSelectedTerm] = useState<number | undefined>();
    const [selectedSubject, setSelectedSubject] = useState<number | undefined>();
    const [selectedType, setSelectedType] = useState<string | undefined>();
    const [selectedEvalType, setSelectedEvalType] = useState<string | undefined>();

    const { assessments, loading } = useAssessments({
        term: selectedTerm,
        subject: selectedSubject,
        assessment_type: selectedType,
        evaluation_type: selectedEvalType
    });

    const { terms } = useTerms();
    const { subjects } = useSubjects();

    const assessmentTypes = [
        { value: '', label: 'All Types' },
        { value: 'CAT', label: 'CAT' },
        { value: 'TEST', label: 'Test' },
        { value: 'MAIN_EXAM', label: 'Main Exam' },
        { value: 'MOCK', label: 'Mock' },
        { value: 'PROJECT', label: 'Project' },
        { value: 'ASSIGNMENT', label: 'Assignment' },
        { value: 'PRACTICAL', label: 'Practical' },
        { value: 'COMPETENCY', label: 'Competency' }
    ];

    const evaluationTypes = [
        { value: '', label: 'All Evaluation Types' },
        { value: 'NUMERIC', label: 'Numeric' },
        { value: 'RUBRIC', label: 'Rubric' },
        { value: 'DESCRIPTIVE', label: 'Descriptive' },
        { value: 'COMPETENCY', label: 'Competency' }
    ];

    const getEvaluationBadge = (type: string) => {
        const variants: Record<string, any> = {
            NUMERIC: 'blue',
            RUBRIC: 'purple',
            DESCRIPTIVE: 'green',
            COMPETENCY: 'orange'
        };
        return variants[type] || 'default';
    };

    // Calculate statistics
    const totalAssessments = assessments.length;
    const numericAssessments = assessments.filter(a => a.evaluation_type === 'NUMERIC').length;
    const rubricAssessments = assessments.filter(a => a.evaluation_type === 'RUBRIC').length;
    const totalScored = assessments.reduce((sum, a) => sum + a.scores_count, 0);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-semibold text-gray-900">Assessments</h1>
                    <p className="text-gray-600 mt-1">Manage assessments and grading</p>
                </div>
                <Link href="/assessments/new">
                    <Button>
                        <Plus className="w-4 h-4 mr-2" />
                        Create Assessment
                    </Button>
                </Link>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <StatsCard
                    title="Total Assessments"
                    value={totalAssessments}
                    icon={ClipboardList}
                    color="blue"
                />
                <StatsCard
                    title="Numeric"
                    value={numericAssessments}
                    icon={TrendingUp}
                    color="green"
                />
                <StatsCard
                    title="Rubric-based"
                    value={rubricAssessments}
                    icon={Award}
                    color="purple"
                />
                <StatsCard
                    title="Total Scored"
                    value={totalScored}
                    icon={FileText}
                    color="orange"
                />
            </div>

            {/* Filters */}
            <Card>
                <div className="p-4">
                    <div className="flex items-center gap-4">
                        <Filter className="w-5 h-5 text-gray-400" />
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 flex-1">
                            <Select
                                label=""
                                value={selectedTerm?.toString() || ''}
                                onChange={(e) => setSelectedTerm(e.target.value ? Number(e.target.value) : undefined)} options={[]}                            >
                                <option value="">All Terms</option>
                                {terms.map(t => (
                                    <option key={t.id} value={t.id}>
                                        {t.name}
                                    </option>
                                ))}
                            </Select>

                            <Select
                                label=""
                                value={selectedSubject?.toString() || ''}
                                onChange={(e) => setSelectedSubject(e.target.value ? Number(e.target.value) : undefined)} options={[]}                            >
                                <option value="">All Subjects</option>
                                {subjects.map(s => (
                                    <option key={s.id} value={s.id}>
                                        {s.name}
                                    </option>
                                ))}
                            </Select>

                            <Select
                                label=""
                                value={selectedType || ''}
                                onChange={(e) => setSelectedType(e.target.value || undefined)} options={[]}                            >
                                {assessmentTypes.map(type => (
                                    <option key={type.value} value={type.value}>
                                        {type.label}
                                    </option>
                                ))}
                            </Select>

                            <Select
                                label=""
                                value={selectedEvalType || ''}
                                onChange={(e) => setSelectedEvalType(e.target.value || undefined)} options={[]}                            >
                                {evaluationTypes.map(type => (
                                    <option key={type.value} value={type.value}>
                                        {type.label}
                                    </option>
                                ))}
                            </Select>
                        </div>
                    </div>
                </div>
            </Card>

            {/* Assessments Table */}
            <Card>
                {loading ? (
                    <div className="py-12 text-center">
                        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
                        <p className="mt-2 text-gray-600">Loading assessments...</p>
                    </div>
                ) : assessments.length === 0 ? (
                    <div className="py-12 text-center">
                        <ClipboardList className="mx-auto h-12 w-12 text-gray-400" />
                        <h3 className="mt-2 text-sm font-medium text-gray-900">No assessments found</h3>
                        <p className="mt-1 text-sm text-gray-500">
                            {selectedTerm || selectedSubject || selectedType || selectedEvalType
                                ? 'Try adjusting your filters'
                                : 'Get started by creating a new assessment'}
                        </p>
                        {!selectedTerm && !selectedSubject && !selectedType && !selectedEvalType && (
                            <Link href="/assessments/new">
                                <Button className="mt-4">
                                    <Plus className="mr-2 h-4 w-4" />
                                    Create Assessment
                                </Button>
                            </Link>
                        )}
                    </div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Assessment Name</TableHead>
                                <TableHead>Subject</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead>Evaluation</TableHead>
                                <TableHead>Date</TableHead>
                                <TableHead>Scores</TableHead>
                                <TableHead>Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {assessments.map((assessment) => (
                                <TableRow
                                    key={assessment.id}
                                    onClick={() => router.push(`/assessments/${assessment.id}`)}
                                >
                                    <TableCell>
                                        <div>
                                            <div className="font-medium text-gray-900">{assessment.name}</div>
                                            {assessment.term_name && (
                                                <div className="text-sm text-gray-500">{assessment.term_name}</div>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div>
                                            <div className="font-medium text-gray-900">{assessment.subject_name}</div>
                                            <div className="text-sm text-gray-500">{assessment.subject_code}</div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="blue">{assessment.assessment_type_display}</Badge>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={getEvaluationBadge(assessment.evaluation_type)}>
                                            {assessment.evaluation_type_display}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <span className="text-sm text-gray-600">
                                            {assessment.assessment_date
                                                ? new Date(assessment.assessment_date).toLocaleDateString()
                                                : '-'}
                                        </span>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="purple">{assessment.scores_count}</Badge>
                                    </TableCell>
                                    <TableCell>
                                        <Button
                                            variant="primary"
                                            size="sm"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                router.push(`/assessments/${assessment.id}`);
                                            }}
                                        >
                                            View Details
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </Card>

            {/* Pagination info */}
            {assessments.length > 0 && (
                <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-600">
                        Showing <span className="font-medium">{assessments.length}</span> assessments
                    </p>
                </div>
            )}
        </div>
    );
}