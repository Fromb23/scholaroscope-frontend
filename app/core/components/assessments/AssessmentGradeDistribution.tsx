'use client';

import { AssessmentScore } from '@/app/core/types/assessment';

const GRADE_BANDS = [
    { grade: 'A', min: 80, max: 100, color: 'bg-green-50 text-green-600' },
    { grade: 'B', min: 70, max: 79, color: 'bg-blue-50 text-blue-600' },
    { grade: 'C', min: 60, max: 69, color: 'bg-yellow-50 text-yellow-600' },
    { grade: 'D', min: 50, max: 59, color: 'bg-orange-50 text-orange-600' },
    { grade: 'E', min: 0, max: 49, color: 'bg-red-50 text-red-600' },
] as const;

interface Props {
    scores: AssessmentScore[];
    totalMarks: number;
}

export function AssessmentGradeDistribution({ scores, totalMarks }: Props) {
    return (
        <div className="grid gap-4 md:grid-cols-5">
            {GRADE_BANDS.map(({ grade, min, max, color }) => {
                const cnt = scores.filter(s =>
                    s.score != null &&
                    (s.score / totalMarks) * 100 >= min &&
                    (s.score / totalMarks) * 100 <= max
                ).length;
                return (
                    <div key={grade} className={`text-center p-4 rounded-lg ${color}`}>
                        <p className="text-3xl font-bold">{cnt}</p>
                        <p className="text-sm mt-1">Grade {grade}</p>
                        <p className="text-xs mt-1">{min}–{max}%</p>
                    </div>
                );
            })}
        </div>
    );
}