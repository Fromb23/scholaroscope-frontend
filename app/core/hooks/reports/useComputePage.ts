'use client';

import { useMemo, useState } from 'react';
import { useTerms } from '@/app/core/hooks/useAcademic';
import {
    useAssessmentTypeSummaries,
    useAttendanceSummaries,
    useCohortSummaries,
    useGradeSummaries,
    useSubjectSummaries,
} from '@/app/core/hooks/useReporting';
import { useComputedGrades } from '@/app/core/hooks/useGradePolicies';
import { ApiError, extractErrorMessage } from '@/app/core/types/errors';

export interface ComputeResult {
    success: boolean;
    message: string;
}

export interface ComputeOption {
    id: string;
    title: string;
    description: string;
    run: () => Promise<void>;
}

export function useComputePage() {
    const [selectedTerm, setSelectedTerm] = useState<number | null>(null);
    const [computing, setComputing] = useState<string | null>(null);
    const [results, setResults] = useState<Record<string, ComputeResult>>({});
    const [globalError, setGlobalError] = useState<string | null>(null);

    const { terms, loading: termsLoading } = useTerms();
    const { computeSummaries: computeAttendance } = useAttendanceSummaries();
    const { computeSummaries: computeGrades } = useGradeSummaries();
    const { computeSummaries: computeCohorts } = useCohortSummaries();
    const { computeSummaries: computeSubjects } = useSubjectSummaries();
    const { computeSummaries: computeAssessmentTypes } = useAssessmentTypeSummaries();
    const { computeWithPolicy } = useComputedGrades();

    const run = async (id: string, fn: () => Promise<void>) => {
        if (!selectedTerm) return;

        setComputing(id);
        try {
            await fn();
            setResults((previous) => ({
                ...previous,
                [id]: { success: true, message: 'Completed successfully' },
            }));
        } catch (error) {
            setResults((previous) => ({
                ...previous,
                [id]: {
                    success: false,
                    message: extractErrorMessage(error as ApiError, 'Computation failed'),
                },
            }));
        } finally {
            setComputing(null);
        }
    };

    const computeOptions = useMemo<ComputeOption[]>(
        () => [
            {
                id: 'attendance',
                title: 'Attendance Summaries',
                description: 'Recompute from session records',
                run: () => computeAttendance(selectedTerm!),
            },
            {
                id: 'grades',
                title: 'Grade Summaries',
                description: 'Recompute from assessment scores',
                run: () => computeGrades(selectedTerm!),
            },
            {
                id: 'cohorts',
                title: 'Cohort Summaries',
                description: 'Recompute cohort-level aggregates',
                run: () => computeCohorts(selectedTerm!),
            },
            {
                id: 'subjects',
                title: 'Subject Summaries',
                description: 'Recompute subject statistics',
                run: () => computeSubjects(selectedTerm!),
            },
            {
                id: 'assessments',
                title: 'Assessment Type Summaries',
                description: 'Recompute assessment breakdowns',
                run: () => computeAssessmentTypes(selectedTerm!),
            },
        ],
        [
            computeAssessmentTypes,
            computeAttendance,
            computeCohorts,
            computeGrades,
            computeSubjects,
            selectedTerm,
        ]
    );

    const handleComputeAll = async () => {
        if (!selectedTerm) return;

        setComputing('all');
        for (const option of computeOptions) {
            try {
                await option.run();
                setResults((previous) => ({
                    ...previous,
                    [option.id]: { success: true, message: 'Completed' },
                }));
            } catch (error) {
                setResults((previous) => ({
                    ...previous,
                    [option.id]: {
                        success: false,
                        message: extractErrorMessage(error as ApiError, 'Failed'),
                    },
                }));
            }
        }
        setComputing(null);
    };

    const handleTermChange = (value: string) => {
        setSelectedTerm(value ? Number(value) : null);
        setResults({});
    };

    const successCount = Object.values(results).filter((result) => result.success).length;
    const failCount = Object.values(results).filter((result) => !result.success).length;
    const termOptions = [
        { value: '', label: 'Select a term…' },
        ...terms.map((term) => ({
            value: String(term.id),
            label: `${term.academic_year_name} — ${term.name}`,
        })),
    ];

    return {
        selectedTerm,
        computing,
        results,
        globalError,
        termsLoading,
        computeOptions,
        successCount,
        failCount,
        termOptions,
        run,
        setGlobalError,
        handleTermChange,
        handleComputeAll,
        computeWithPolicy,
    };
}
