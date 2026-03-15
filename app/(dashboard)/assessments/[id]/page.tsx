'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
    ArrowLeft,
    Edit,
    Trash2,
    Save,
    Calendar,
    BookOpen,
    ClipboardList,
    TrendingUp,
    Award,
    Download
} from 'lucide-react';
import { Card } from '@/app/components/ui/Card';
import { Button } from '@/app/components/ui/Button';
import { Badge } from '@/app/components/ui/Badge';
import { Input } from '@/app/components/ui/Input';
import { Select } from '@/app/components/ui/Select';
import { DataTable } from '@/app/components/ui/Table';
import type { Column } from '@/app/components/ui/Table';
import { StatsCard } from '@/app/components/dashboard/StatsCard';
import { useAssessmentDetail, useAssessmentScores } from '@/app/core/hooks/useAssessments';
import { useAuth } from '@/app/context/AuthContext';
import { assessmentAPI } from '@/app/core/api/assessments';
import { ExportModal } from '@/app/components/export/ExportModal';
import type { ExportPayload, ExportPreset } from '@/app/types/export';

interface ScoreRow {
    id: number;
    student: number;
    student_name: string;
    student_admission: string;
    score: number | null;
    rubric_level: number | null;
    comments: string;
}
type ScoresWithIndex = {
    [key: string]: unknown;
} & ScoreRow;

export default function AssessmentDetailPage() {
    const params = useParams();
    const router = useRouter();
    const assessmentId = Number(params.id);
    const { user } = useAuth();

    const { assessment, loading, refetch } = useAssessmentDetail(assessmentId);
    const [scoreData, setScoreData] = useState<{
        [key: number]: {
            score?: number | null;
            rubric_level?: number | null;
            comments?: string;
        };
    }>({});
    const [saving, setSaving] = useState(false);
    const [scoreErrors, setScoreErrors] = useState<{ [studentId: number]: string }>({});
    const [searchQuery, setSearchQuery] = useState('');
    const [exportOpen, setExportOpen] = useState(false);
    const { scores, loading: scoresLoading, bulkEntry } = useAssessmentScores({
        assessment: assessmentId,
        search: searchQuery || undefined,
    });

    // Initialize score data when assessment loads
    useEffect(() => {
        if (!scores || scores.length === 0) return;

        const initial: Record<number, {
            score?: number | null;
            rubric_level?: number | null;
            comments?: string;
        }> = {};

        scores.forEach(s => {
            initial[s.student] = {
                score: s.score,
                rubric_level: s.rubric_level,
                comments: s.comments ?? '',
            };
        });

        setScoreData(initial);
    }, [scores]);

    const handleScoreChange = (studentId: number, field: string, value: any) => {
        // Validate numeric score
        if (field === 'score' && value !== null && value !== '' && assessment?.total_marks) {
            const numericValue = parseFloat(value);
            if (numericValue > assessment.total_marks) {
                setScoreErrors(prev => ({
                    ...prev,
                    [studentId]: `Score cannot exceed ${assessment.total_marks}`
                }));
                return;
            } else if (numericValue < 0) {
                setScoreErrors(prev => ({
                    ...prev,
                    [studentId]: 'Score cannot be negative'
                }));
                return;
            } else {
                setScoreErrors(prev => {
                    const newErrors = { ...prev };
                    delete newErrors[studentId];
                    return newErrors;
                });
            }
        }

        setScoreData(prev => ({
            ...prev,
            [studentId]: {
                ...prev[studentId],
                [field]: value
            }
        }));
    };

    const handleSaveScores = async () => {
        if (!assessment) return;

        if (Object.keys(scoreErrors).length > 0) {
            alert('Please fix all validation errors before saving');
            return;
        }

        setSaving(true);
        try {
            const scoresArray = Object.entries(scoreData).map(([studentId, data]) => ({
                student_id: Number(studentId),
                score: assessment.evaluation_type === 'NUMERIC' ? data.score || undefined : undefined,
                rubric_level_id: assessment.evaluation_type === 'RUBRIC' ? data.rubric_level || undefined : undefined,
                comments: data.comments || ''
            }));

            await bulkEntry({
                assessment: assessmentId,
                scores: scoresArray,
                scored_by: user?.email || 'system'
            });

            alert('Scores saved successfully!');
            refetch();
        } catch (error: any) {
            alert(error.message);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!assessment) return;

        if (confirm(`Are you sure you want to delete "${assessment.name}"? This action cannot be undone.`)) {
            try {
                await assessmentAPI.delete(assessmentId);
                router.push('/assessments');
            } catch (error: any) {
                alert(error.message);
            }
        }
    };

    const calculateGrade = (score: number | null | undefined, totalMarks: number) => {
        if (score === null || score === undefined || !totalMarks) {
            return null;
        }

        const percentage = (score / totalMarks) * 100;

        let grade = 'E';
        let label = 'Poor Performance';
        let color: 'success' | 'info' | 'warning' | 'danger' = 'danger';

        if (percentage >= 80) {
            grade = 'A';
            label = 'Excellent';
            color = 'success';
        } else if (percentage >= 70) {
            grade = 'B';
            label = 'Very Good';
            color = 'info';
        } else if (percentage >= 60) {
            grade = 'C';
            label = 'Good';
            color = 'info';
        } else if (percentage >= 50) {
            grade = 'D';
            label = 'Satisfactory';
            color = 'warning';
        }

        return { grade, label, percentage: percentage.toFixed(1), color };
    };

    const calculateStats = () => {
        if (!assessment?.scores || assessment.scores.length === 0) {
            return { average: 0, highest: 0, lowest: 0, scored: 0, total: 0 };
        }

        const validScores = assessment.scores.filter(s => s.score !== null && s.score !== undefined);
        const scores = validScores.map(s => s.score as number);

        return {
            average: scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0,
            highest: scores.length > 0 ? Math.max(...scores) : 0,
            lowest: scores.length > 0 ? Math.min(...scores) : 0,
            scored: validScores.length,
            total: assessment.scores.length
        };
    };

    // ============================================================================
    // Export Configuration
    // ============================================================================

    const createExportPayload = (): ExportPayload => {
        if (!assessment) {
            throw new Error('No assessment data available');
        }

        return {
            title: assessment.name,
            subtitle: `${assessment.subject_name} • ${assessment.cohort_name || 'All Students'}`,

            metadata: {
                term: assessment.term_name || 'Year-round',
                assessmentDate: assessment.assessment_date
                    ? new Date(assessment.assessment_date).toLocaleDateString()
                    : 'Not set',
                assessmentType: assessment.assessment_type_display,
                evaluationType: assessment.evaluation_type_display,
                totalMarks: assessment.total_marks?.toString() || 'N/A',
                weight: assessment.weight?.toString() || 'N/A',
                totalStudents: assessment.scores.length.toString(),
                scoredStudents: assessment.scores.filter((s: any) => s.score !== null).length.toString(),
                generatedBy: user?.email || 'System',
                generatedAt: new Date().toLocaleString()
            },

            columns: [
                {
                    key: 'student_name',
                    label: 'Student Name',
                    width: 25
                },
                {
                    key: 'student_admission',
                    label: 'Admission Number',
                    width: 15
                },
                ...(assessment.evaluation_type === 'NUMERIC' ? [
                    {
                        key: 'score',
                        label: `Score (out of ${assessment.total_marks})`,
                        width: 12,
                        align: 'center' as const,
                        format: 'number' as const
                    },
                    {
                        key: 'percentage',
                        label: 'Percentage',
                        width: 12,
                        align: 'center' as const,
                        format: 'percentage' as const
                    },
                    {
                        key: 'grade',
                        label: 'Grade',
                        width: 10,
                        align: 'center' as const
                    }
                ] : []),
                {
                    key: 'comments',
                    label: 'Comments/Remarks',
                    width: 35
                }
            ],

            rows: assessment.scores.map((score: any) => {
                const gradeInfo = assessment.evaluation_type === 'NUMERIC' && score.score != null
                    ? calculateGrade(score.score, assessment.total_marks || 100)
                    : null;

                return {
                    student_name: score.student_name,
                    student_admission: score.student_admission,
                    score: score.score ?? '',
                    percentage: score.score && assessment.total_marks
                        ? (score.score / assessment.total_marks) * 100
                        : '',
                    grade: gradeInfo?.grade ?? '',
                    comments: score.comments || ''
                };
            }),

            fileName: `${assessment.name.replace(/\s+/g, '_')}_${assessment.cohort_name?.replace(/\s+/g, '_') || 'Scores'}`,
            includeMetadata: true,
            includeTimestamp: true,
            freezeHeader: true,
            autoFilter: true,
            orientation: 'landscape',
            sheetName: 'Assessment Scores'
        };
    };

    const exportPresets: ExportPreset[] = [
        {
            id: 'scores-only',
            label: 'Scores Only',
            description: 'Student names and scores without comments',
            columns: [
                { key: 'student_name', label: 'Student Name', width: 25 },
                { key: 'student_admission', label: 'Admission No.', width: 15 },
                ...(assessment?.evaluation_type === 'NUMERIC' ? [
                    { key: 'score', label: 'Score', width: 12, format: 'number' as const },
                    { key: 'grade', label: 'Grade', width: 10 }
                ] : [])
            ],
            includeMetadata: false
        },
        {
            id: 'full-report',
            label: 'Full Report',
            description: 'Complete assessment data with all details',
            columns: [
                { key: 'student_name', label: 'Student Name', width: 25 },
                { key: 'student_admission', label: 'Admission No.', width: 15 },
                ...(assessment?.evaluation_type === 'NUMERIC' ? [
                    { key: 'score', label: 'Score', width: 12, format: 'number' as const },
                    { key: 'percentage', label: 'Percentage', width: 12, format: 'percentage' as const },
                    { key: 'grade', label: 'Grade', width: 10 }
                ] : []),
                { key: 'comments', label: 'Comments', width: 35 }
            ],
            includeMetadata: true
        },
        {
            id: 'anonymous',
            label: 'Anonymous Export',
            description: 'Scores without student names (for data analysis)',
            columns: [
                { key: 'student_admission', label: 'Student ID', width: 15 },
                ...(assessment?.evaluation_type === 'NUMERIC' ? [
                    { key: 'score', label: 'Score', width: 12, format: 'number' as const },
                    { key: 'grade', label: 'Grade', width: 10 }
                ] : [])
            ],
            includeMetadata: false
        }
    ];

    // ============================================================================
    // DataTable Columns
    // ============================================================================

    const columns: Column<ScoreRow>[] = [
        {
            key: 'student_name',
            header: 'Student',
            sortable: true,
            render: (row) => (
                <Link
                    href={`/learners/${row.student}`}
                    title="View student profile"
                    className="font-medium text-blue-600 hover:underline"
                >
                    {row.student_name}
                </Link>
            )
        },
        {
            key: 'student_admission',
            header: 'Admission No.',
            sortable: true,
            render: (row) => (
                <span className="text-gray-600">{row.student_admission}</span>
            )
        }
    ];

    // Add score column for numeric assessments
    if (assessment?.evaluation_type === 'NUMERIC') {
        columns.push({
            key: 'score',
            header: `Score (out of ${assessment.total_marks})`,
            sortable: true,
            render: (row) => {
                const currentData = scoreData[row.student] || {};
                return (
                    <div className="space-y-2">
                        <div className="flex items-center gap-2">
                            <Input
                                type="number"
                                min={0}
                                max={assessment.total_marks || 100}
                                step={0.5}
                                value={currentData.score ?? ''}
                                onChange={(e) =>
                                    handleScoreChange(
                                        row.student,
                                        'score',
                                        e.target.value ? parseFloat(e.target.value) : null
                                    )
                                }
                                placeholder="Enter score"
                                className={scoreErrors[row.student] ? 'border-red-500' : ''}
                            />
                            {currentData.score != null && (
                                (() => {
                                    const gradeInfo = calculateGrade(
                                        currentData.score,
                                        assessment.total_marks || 100
                                    );
                                    return gradeInfo ? (
                                        <div className="flex flex-col items-center gap-1">
                                            <Badge variant={gradeInfo.color}>
                                                {gradeInfo.grade}
                                            </Badge>
                                            <span className="text-xs text-gray-500">
                                                {gradeInfo.percentage}%
                                            </span>
                                        </div>
                                    ) : null;
                                })()
                            )}
                        </div>
                        {scoreErrors[row.student] && (
                            <p className="text-xs text-red-600">
                                {scoreErrors[row.student]}
                            </p>
                        )}
                    </div>
                );
            }
        });
    }

    // Add rubric level column for rubric assessments
    if (assessment?.evaluation_type === 'RUBRIC') {
        columns.push({
            key: 'rubric_level',
            header: 'Rubric Level',
            render: (row) => {
                const currentData = scoreData[row.student] || {};
                return (
                    <Select
                        value={currentData.rubric_level?.toString() || ''}
                        onChange={(e) =>
                            handleScoreChange(
                                row.student,
                                'rubric_level',
                                e.target.value ? Number(e.target.value) : null
                            )
                        }
                        options={[]}
                    >
                        <option value="">Select Level</option>
                        {assessment.rubric_levels?.map(level => (
                            <option key={level.id} value={level.id}>
                                {level.label} - {level.code}
                            </option>
                        ))}
                    </Select>
                );
            }
        });
    }

    // Add narrative column for descriptive/competency assessments
    if (assessment?.evaluation_type === 'DESCRIPTIVE' || assessment?.evaluation_type === 'COMPETENCY') {
        columns.push({
            key: 'comments',
            header: 'Narrative',
            render: (row) => {
                const currentData = scoreData[row.student] || {};
                return (
                    <textarea
                        value={currentData.comments || ''}
                        onChange={(e) =>
                            handleScoreChange(
                                row.student,
                                'comments',
                                e.target.value
                            )
                        }
                        rows={2}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Enter feedback"
                    />
                );
            }
        });
    }

    // Add notes column
    columns.push({
        key: 'notes',
        header: 'Notes',
        render: (row) => {
            const currentData = scoreData[row.student] || {};
            return (
                <input
                    type="text"
                    value={currentData.comments || ''}
                    onChange={(e) =>
                        handleScoreChange(
                            row.student,
                            'comments',
                            e.target.value
                        )
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Add notes"
                />
            );
        }
    });

    // ============================================================================
    // Render
    // ============================================================================

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
            </div>
        );
    }

    if (!assessment) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="text-gray-500">Assessment not found</div>
            </div>
        );
    }

    const stats = calculateStats();

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link href="/assessments">
                        <Button variant="ghost" size="sm">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back to Assessments
                        </Button>
                    </Link>
                </div>
                <div className="flex gap-2">
                    <Link href={`/assessments/${assessmentId}/edit`}>
                        <Button variant="ghost">
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                        </Button>
                    </Link>
                    <Button variant="ghost" onClick={handleDelete}>
                        <Trash2 className="h-4 w-4 text-red-600" />
                    </Button>
                </div>
            </div>

            {/* Assessment Info */}
            <Card>
                <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">{assessment.name}</h1>
                            <p className="text-gray-600 mt-1">{assessment.subject_name}</p>
                        </div>
                        <div className="flex gap-2">
                            <Badge variant="blue">{assessment.assessment_type_display}</Badge>
                            <Badge variant="purple">{assessment.evaluation_type_display}</Badge>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        <div className="flex items-center gap-3">
                            <Calendar className="w-5 h-5 text-gray-400" />
                            <div>
                                <div className="text-sm text-gray-600">Date</div>
                                <div className="font-medium text-gray-900">
                                    {assessment.assessment_date
                                        ? new Date(assessment.assessment_date).toLocaleDateString()
                                        : 'Not set'}
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <BookOpen className="w-5 h-5 text-gray-400" />
                            <div>
                                <div className="text-sm text-gray-600">Term</div>
                                <div className="font-medium text-gray-900">
                                    {assessment.term_name || 'Year-round'}
                                </div>
                            </div>
                        </div>

                        {assessment.evaluation_type === 'NUMERIC' && assessment.total_marks && (
                            <div className="flex items-center gap-3">
                                <ClipboardList className="w-5 h-5 text-gray-400" />
                                <div>
                                    <div className="text-sm text-gray-600">Total Marks</div>
                                    <div className="font-medium text-gray-900">
                                        {assessment.total_marks}
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="flex items-center gap-3">
                            <Award className="w-5 h-5 text-gray-400" />
                            <div>
                                <div className="text-sm text-gray-600">Weight</div>
                                <div className="font-medium text-gray-900">
                                    {assessment.weight}
                                </div>
                            </div>
                        </div>
                    </div>

                    {assessment.description && (
                        <div className="mt-4 pt-4 border-t border-gray-200">
                            <div className="text-sm text-gray-600 mb-1">Description</div>
                            <div className="text-gray-900">{assessment.description}</div>
                        </div>
                    )}
                </div>
            </Card>

            {/* Statistics */}
            {assessment.evaluation_type === 'NUMERIC' && (
                <div className="grid gap-4 md:grid-cols-5">
                    <StatsCard
                        title="Scored"
                        value={`${stats.scored}/${stats.total}`}
                        icon={ClipboardList}
                        color="blue"
                    />
                    <StatsCard
                        title="Average"
                        value={stats.average.toFixed(1)}
                        icon={TrendingUp}
                        color="green"
                    />
                    <StatsCard
                        title="Highest"
                        value={stats.highest}
                        icon={Award}
                        color="yellow"
                    />
                    <StatsCard
                        title="Lowest"
                        value={stats.lowest}
                        icon={TrendingUp}
                        color="red"
                    />
                    <StatsCard
                        title="Completion"
                        value={`${stats.total > 0 ? Math.round((stats.scored / stats.total) * 100) : 0}%`}
                        icon={ClipboardList}
                        color="purple"
                    />
                </div>
            )}

            {/* Score Entry with DataTable */}
            <Card>
                <div className="p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-lg font-semibold text-gray-900">Enter Scores</h2>
                        <div className="flex gap-2">
                            <Button
                                variant="primary"
                                onClick={() => setExportOpen(true)}
                                disabled={!assessment || assessment.scores.length === 0}
                            >
                                <Download className="w-4 h-4 mr-2" />
                                Export
                            </Button>
                            <Button onClick={handleSaveScores} disabled={saving}>
                                <Save className="w-4 h-4 mr-2" />
                                {saving ? 'Saving...' : 'Save All Scores'}
                            </Button>
                        </div>
                    </div>

                    <DataTable
                        data={scores as unknown as ScoresWithIndex[]}
                        columns={columns}
                        loading={scoresLoading}
                        enableSearch={true}
                        enableSort={true}
                        onSearch={setSearchQuery}
                        searchPlaceholder="Search by student name or admission number..."
                        emptyMessage="No students enrolled in this assessment"
                    />
                </div>
            </Card>

            {/* Grade Distribution (for numeric assessments) */}
            {assessment.evaluation_type === 'NUMERIC' && assessment.scores && assessment.scores.length > 0 && (
                <Card>
                    <div className="p-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">Grade Distribution</h2>
                        <div className="grid gap-4 md:grid-cols-5">
                            {['A', 'B', 'C', 'D', 'E'].map(grade => {
                                const gradeRanges: Record<string, [number, number]> = {
                                    A: [80, 100],
                                    B: [70, 79],
                                    C: [60, 69],
                                    D: [50, 59],
                                    E: [0, 49]
                                };
                                const [min, max] = gradeRanges[grade];
                                const totalMarks = assessment.total_marks || 100;
                                const minScore = (min / 100) * totalMarks;
                                const maxScore = (max / 100) * totalMarks;

                                const count = assessment.scores.filter(s =>
                                    s.score !== null &&
                                    s.score !== undefined &&
                                    s.score >= minScore &&
                                    s.score <= maxScore
                                ).length;

                                const colors: Record<string, string> = {
                                    A: 'bg-green-50 text-green-600',
                                    B: 'bg-blue-50 text-blue-600',
                                    C: 'bg-yellow-50 text-yellow-600',
                                    D: 'bg-orange-50 text-orange-600',
                                    E: 'bg-red-50 text-red-600'
                                };

                                return (
                                    <div key={grade} className={`text-center p-4 rounded-lg ${colors[grade]}`}>
                                        <p className="text-3xl font-bold">{count}</p>
                                        <p className="text-sm mt-1">Grade {grade}</p>
                                        <p className="text-xs mt-1">{min}-{max}%</p>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </Card>
            )}

            {/* Export Modal */}
            {assessment && assessment.scores.length > 0 && (
                <ExportModal
                    open={exportOpen}
                    onClose={() => setExportOpen(false)}
                    payload={createExportPayload()}
                    presets={exportPresets}
                    defaultFormat="excel"
                    title="Export Assessment Scores"
                />
            )}
        </div>
    );
}