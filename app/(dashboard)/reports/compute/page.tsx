'use client';

// ============================================================================
// app/(dashboard)/reports/compute/page.tsx — render only
// ============================================================================

import { useState } from 'react';
import Link from 'next/link';
import { Settings, Play, CheckCircle, AlertCircle, Loader, Zap } from 'lucide-react';
import { Card } from '@/app/components/ui/Card';
import { Button } from '@/app/components/ui/Button';
import { Select } from '@/app/components/ui/Select';
import { Badge } from '@/app/components/ui/Badge';
import { ErrorBanner } from '@/app/components/ui/ErrorBanner';
import { useTerms } from '@/app/core/hooks/useAcademic';
import {
    useAttendanceSummaries,
    useGradeSummaries,
    useCohortSummaries,
    useSubjectSummaries,
    useAssessmentTypeSummaries,
} from '@/app/core/hooks/useReporting';
import { useComputedGrades } from '@/app/core/hooks/useGradePolicies';
import { ApiError, extractErrorMessage } from '@/app/core/types/errors';

interface ComputeResult { success: boolean; message: string; }

export default function ComputePage() {
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
            setResults(prev => ({ ...prev, [id]: { success: true, message: 'Completed successfully' } }));
        } catch (err) {
            setResults(prev => ({
                ...prev,
                [id]: { success: false, message: extractErrorMessage(err as ApiError, 'Computation failed') },
            }));
        } finally {
            setComputing(null);
        }
    };

    const handleComputeAll = async () => {
        if (!selectedTerm) return;
        setComputing('all');
        const ops = [
            { id: 'attendance', fn: () => computeAttendance(selectedTerm) },
            { id: 'grades', fn: () => computeGrades(selectedTerm) },
            { id: 'cohorts', fn: () => computeCohorts(selectedTerm) },
            { id: 'subjects', fn: () => computeSubjects(selectedTerm) },
            { id: 'assessments', fn: () => computeAssessmentTypes(selectedTerm) },
        ];
        for (const op of ops) {
            try {
                await op.fn();
                setResults(prev => ({ ...prev, [op.id]: { success: true, message: 'Completed' } }));
            } catch (err) {
                setResults(prev => ({
                    ...prev,
                    [op.id]: { success: false, message: extractErrorMessage(err as ApiError, 'Failed') },
                }));
            }
        }
        setComputing(null);
    };

    const COMPUTE_OPTIONS = [
        { id: 'attendance', title: 'Attendance Summaries', description: 'Recompute from session records', fn: () => computeAttendance(selectedTerm!) },
        { id: 'grades', title: 'Grade Summaries', description: 'Recompute from assessment scores', fn: () => computeGrades(selectedTerm!) },
        { id: 'cohorts', title: 'Cohort Summaries', description: 'Recompute cohort-level aggregates', fn: () => computeCohorts(selectedTerm!) },
        { id: 'subjects', title: 'Subject Summaries', description: 'Recompute subject statistics', fn: () => computeSubjects(selectedTerm!) },
        { id: 'assessments', title: 'Assessment Type Summaries', description: 'Recompute assessment breakdowns', fn: () => computeAssessmentTypes(selectedTerm!) },
    ] as const;

    const successCount = Object.values(results).filter(r => r.success).length;
    const failCount = Object.values(results).filter(r => !r.success).length;

    return (
        <div className="space-y-6">

            {/* Header */}
            <div className="flex items-start justify-between">
                <div>
                    <h1 className="text-2xl font-semibold text-gray-900">Compute Controls</h1>
                    <p className="text-gray-500 mt-1">
                        Trigger grade computation and recompute summaries for a term.
                    </p>
                </div>
                <Settings className="h-7 w-7 text-gray-500" />
            </div>

            {globalError && <ErrorBanner message={globalError} onDismiss={() => setGlobalError(null)} />}

            {/* Term selector */}
            <Card>
                <Select
                    label="Select Term"
                    value={selectedTerm?.toString() ?? ''}
                    onChange={e => {
                        setSelectedTerm(e.target.value ? Number(e.target.value) : null);
                        setResults({});
                    }}
                    disabled={termsLoading}
                    options={[
                        { value: '', label: 'Select a term…' },
                        ...terms.map(t => ({
                            value: String(t.id),
                            label: `${t.academic_year_name} — ${t.name}`,
                        })),
                    ]}
                />
            </Card>

            {/* Policy-based computation */}
            <div className="rounded-2xl bg-gradient-to-r from-blue-50 to-purple-50
                            border border-blue-200 p-5">
                <div className="flex items-start gap-4">
                    <div className="p-2.5 rounded-xl bg-gradient-to-br from-blue-600 to-purple-600">
                        <Zap className="h-5 w-5 text-white" />
                    </div>
                    <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 mb-1">
                            Policy-Based Grade Computation
                        </h3>
                        <p className="text-sm text-gray-600 mb-3">
                            Compute grades using your configured policies — weighted averages,
                            custom scales, required components, and grading bands.
                        </p>
                        <div className="flex items-center gap-3">
                            <Button
                                onClick={() => run('policy', () => computeWithPolicy(selectedTerm!))}
                                disabled={!selectedTerm || computing === 'policy'}
                            >
                                {computing === 'policy'
                                    ? <><Loader className="h-4 w-4 mr-1.5 animate-spin" />Computing…</>
                                    : <><Zap className="h-4 w-4 mr-1.5" />Compute with Policies</>
                                }
                            </Button>
                            <Link href="/reports/grade-policies">
                                <Button variant="secondary" size="sm">
                                    <Settings className="h-4 w-4 mr-1.5" />Manage Policies
                                </Button>
                            </Link>
                        </div>
                        {results.policy && (
                            <ResultBanner result={results.policy} />
                        )}
                    </div>
                </div>
            </div>

            {/* Individual compute options */}
            <div>
                <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">
                    Summary Recomputation
                </h2>
                <div className="grid gap-3 md:grid-cols-2">
                    {COMPUTE_OPTIONS.map(opt => (
                        <Card key={opt.id}>
                            <div className="flex items-start justify-between mb-3">
                                <div>
                                    <p className="font-medium text-gray-900">{opt.title}</p>
                                    <p className="text-xs text-gray-500 mt-0.5">{opt.description}</p>
                                </div>
                            </div>
                            <Button
                                onClick={() => run(opt.id, opt.fn)}
                                disabled={!selectedTerm || computing === opt.id || computing === 'all'}
                                variant="secondary"
                                size="sm"
                                className="w-full"
                            >
                                {computing === opt.id
                                    ? <><Loader className="h-3 w-3 mr-1.5 animate-spin" />Computing…</>
                                    : <><Play className="h-3 w-3 mr-1.5" />Compute</>
                                }
                            </Button>
                            {results[opt.id] && <ResultBanner result={results[opt.id]} />}
                        </Card>
                    ))}
                </div>
            </div>

            {/* Batch all */}
            <Card>
                <div className="flex items-center justify-between mb-3">
                    <div>
                        <h3 className="font-semibold text-gray-900">Compute All Summaries</h3>
                        <p className="text-xs text-gray-500 mt-0.5">
                            Runs all five summary computations in sequence.
                        </p>
                    </div>
                    {Object.keys(results).length > 0 && (
                        <div className="flex gap-2">
                            {successCount > 0 && <Badge variant="green">{successCount} ok</Badge>}
                            {failCount > 0 && <Badge variant="red">{failCount} failed</Badge>}
                        </div>
                    )}
                </div>
                <Button
                    onClick={handleComputeAll}
                    disabled={!selectedTerm || computing !== null}
                    className="w-full md:w-auto"
                >
                    {computing === 'all'
                        ? <><Loader className="h-4 w-4 mr-1.5 animate-spin" />Computing All…</>
                        : <><Play className="h-4 w-4 mr-1.5" />Compute All</>
                    }
                </Button>
            </Card>

        </div>
    );
}

// ── Small helper component ────────────────────────────────────────────────

function ResultBanner({ result }: { result: { success: boolean; message: string } }) {
    return (
        <div className={`mt-3 p-2.5 rounded-lg flex items-center gap-2 text-sm
            ${result.success
                ? 'bg-green-50 text-green-700 border border-green-200'
                : 'bg-red-50   text-red-700   border border-red-200'
            }`}>
            {result.success
                ? <CheckCircle className="h-4 w-4 shrink-0" />
                : <AlertCircle className="h-4 w-4 shrink-0" />
            }
            {result.message}
        </div>
    );
}