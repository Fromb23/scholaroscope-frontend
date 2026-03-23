'use client';

import Link from 'next/link';
import { Input } from '@/app/components/ui/Input';
import { Select } from '@/app/components/ui/Select';
import { Badge } from '@/app/components/ui/Badge';
import { DataTable } from '@/app/components/ui/Table';
import type { Column } from '@/app/components/ui/Table';
import {
    AssessmentScore,
    AssessmentDetail,
    calculateGrade,
} from '@/app/core/types/assessment';

interface ScoreDraft {
    score?: number | null;
    rubric_level?: number | null;
    comments?: string;
}

interface Props {
    assessment: AssessmentDetail;
    scores: AssessmentScore[];
    draft: Record<number, ScoreDraft>;
    loading: boolean;
    readOnly: boolean;
    onScoreChange: (studentId: number, field: keyof ScoreDraft, value: number | string | null) => void;
    onSearch: (q: string) => void;
}

export function AssessmentScoreTable({
    assessment, scores, draft, loading, readOnly, onScoreChange, onSearch,
}: Props) {
    const columns: Column<AssessmentScore>[] = [
        {
            key: 'student_name', header: 'Student', sortable: true,
            render: row => (
                <Link href={`/learners/${row.student}`}
                    className="font-medium text-blue-600 hover:underline">
                    {row.student_name}
                </Link>
            ),
        },
        {
            key: 'student_admission', header: 'Admission No.', sortable: true,
            render: row => <span className="text-gray-600">{row.student_admission}</span>,
        },
    ];

    if (assessment.evaluation_type === 'NUMERIC') {
        columns.push({
            key: 'score', header: `Score (out of ${assessment.total_marks})`, sortable: true,
            render: row => {
                const current = draft[row.student]?.score ?? row.score;
                const gradeInfo = current != null
                    ? calculateGrade(current, assessment.total_marks ?? 100)
                    : null;
                return (
                    <div className="flex items-center gap-2">
                        <Input
                            type="number"
                            min={0}
                            max={assessment.total_marks ?? 100}
                            step={0.5}
                            value={current ?? ''}
                            disabled={readOnly}
                            onChange={e => onScoreChange(
                                row.student, 'score',
                                e.target.value ? parseFloat(e.target.value) : null
                            )}
                            placeholder="Score"
                        />
                        {gradeInfo && (
                            <div className="flex flex-col items-center gap-0.5">
                                <Badge variant={gradeInfo.color}>{gradeInfo.grade}</Badge>
                                <span className="text-xs text-gray-500">{gradeInfo.percentage}%</span>
                            </div>
                        )}
                    </div>
                );
            },
        });
    }

    if (assessment.evaluation_type === 'RUBRIC') {
        columns.push({
            key: 'rubric_level', header: 'Rubric Level',
            render: row => (
                <Select
                    value={(draft[row.student]?.rubric_level ?? row.rubric_level)?.toString() ?? ''}
                    disabled={readOnly}
                    onChange={e => onScoreChange(
                        row.student, 'rubric_level',
                        e.target.value ? Number(e.target.value) : null
                    )}
                    options={assessment.rubric_levels?.map(l => ({
                        value: String(l.id),
                        label: `${l.label} — ${l.code}`,
                    })) ?? []}
                />
            ),
        });
    }

    columns.push({
        key: 'comments', header: 'Comments',
        render: row => (
            <input
                type="text"
                value={draft[row.student]?.comments ?? row.comments ?? ''}
                disabled={readOnly}
                onChange={e => onScoreChange(row.student, 'comments', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm
                           focus:ring-2 focus:ring-blue-500 focus:border-transparent
                           disabled:bg-gray-50 disabled:text-gray-500"
                placeholder="Add notes"
            />
        ),
    });

    return (
        <DataTable
            data={scores as (AssessmentScore & Record<string, unknown>)[]}
            columns={columns}
            loading={loading}
            enableSearch
            enableSort
            onSearch={onSearch}
            searchPlaceholder="Search by name or admission number…"
            emptyMessage="No students enrolled in this assessment"
        />
    );
}