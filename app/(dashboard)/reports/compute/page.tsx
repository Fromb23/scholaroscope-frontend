// ============================================================================
// app/(dashboard)/reports/compute/page.tsx - Final Version
// Uses useComputedGrades from useGradePolicies hook
// All existing logic preserved
// ============================================================================

'use client';

import { useState } from 'react';
import { Card } from '@/app/components/ui/Card';
import { Button } from '@/app/components/ui/Button';
import { Select } from '@/app/components/ui/Select';
import { Badge } from '@/app/components/ui/Badge';
import { useTerms } from '@/app/core/hooks/useAcademic';
import {
    useAttendanceSummaries,
    useGradeSummaries,
    useCohortSummaries,
    useSubjectSummaries,
    useAssessmentTypeSummaries
} from '@/app/core/hooks/useReporting';
import { useComputedGrades } from '@/app/core/hooks/useGradePolicies'; // NEW IMPORT
import { Settings, Play, CheckCircle, AlertCircle, Loader, Zap } from 'lucide-react';
import Link from 'next/link';

export default function ComputePage() {
    const [selectedTerm, setSelectedTerm] = useState<number | null>(null);
    const [computing, setComputing] = useState<string | null>(null);
    const [results, setResults] = useState<{ [key: string]: { success: boolean; message: string } }>({});

    const { terms, loading: termsLoading } = useTerms();

    // EXISTING: Legacy computation hooks (unchanged)
    const { computeSummaries: computeAttendance } = useAttendanceSummaries();
    const { computeSummaries: computeGrades } = useGradeSummaries();
    const { computeSummaries: computeCohorts } = useCohortSummaries();
    const { computeSummaries: computeSubjects } = useSubjectSummaries();
    const { computeSummaries: computeAssessmentTypes } = useAssessmentTypeSummaries();

    // NEW: Policy-based computation from useGradePolicies hook
    const { computeWithPolicy } = useComputedGrades();

    // EXISTING: Legacy compute handler (100% unchanged)
    const handleCompute = async (type: string, computeFn: (termId: number) => Promise<void>) => {
        if (!selectedTerm) return;

        setComputing(type);
        try {
            await computeFn(selectedTerm);
            setResults(prev => ({
                ...prev,
                [type]: { success: true, message: 'Successfully computed summaries' }
            }));
        } catch (error: any) {
            setResults(prev => ({
                ...prev,
                [type]: { success: false, message: error.message || 'Computation failed' }
            }));
        } finally {
            setComputing(null);
        }
    };

    // EXISTING: Batch compute all handler (100% unchanged)
    const handleComputeAll = async () => {
        if (!selectedTerm) return;

        const operations = [
            { type: 'attendance', fn: computeAttendance },
            { type: 'grades', fn: computeGrades },
            { type: 'cohorts', fn: computeCohorts },
            { type: 'subjects', fn: computeSubjects },
            { type: 'assessments', fn: computeAssessmentTypes }
        ];

        setComputing('all');

        for (const op of operations) {
            try {
                await op.fn(selectedTerm);
                setResults(prev => ({
                    ...prev,
                    [op.type]: { success: true, message: 'Successfully computed' }
                }));
            } catch (error: any) {
                setResults(prev => ({
                    ...prev,
                    [op.type]: { success: false, message: error.message || 'Failed' }
                }));
            }
        }

        setComputing(null);
    };

    // NEW: Policy-based computation handler
    const handleComputeWithPolicy = async () => {
        if (!selectedTerm) return;

        setComputing('policy');
        try {
            // Calls POST /api/reports/computed-grades/compute_with_policy/
            await computeWithPolicy(selectedTerm);

            setResults(prev => ({
                ...prev,
                policy: {
                    success: true,
                    message: 'Successfully computed grades using policies'
                }
            }));
        } catch (error: any) {
            setResults(prev => ({
                ...prev,
                policy: {
                    success: false,
                    message: error.message || 'Policy computation failed'
                }
            }));
        } finally {
            setComputing(null);
        }
    };

    // EXISTING: Compute options (100% unchanged)
    const computeOptions = [
        {
            id: 'attendance',
            title: 'Attendance Summaries',
            description: 'Recompute attendance statistics from session records',
            icon: '📊',
            compute: () => handleCompute('attendance', computeAttendance)
        },
        {
            id: 'grades',
            title: 'Grade Summaries',
            description: 'Recompute grade statistics from assessment scores',
            icon: '📈',
            compute: () => handleCompute('grades', computeGrades)
        },
        {
            id: 'cohorts',
            title: 'Cohort Summaries',
            description: 'Recompute cohort-level aggregates',
            icon: '👥',
            compute: () => handleCompute('cohorts', computeCohorts)
        },
        {
            id: 'subjects',
            title: 'Subject Summaries',
            description: 'Recompute subject performance statistics',
            icon: '📚',
            compute: () => handleCompute('subjects', computeSubjects)
        },
        {
            id: 'assessments',
            title: 'Assessment Type Summaries',
            description: 'Recompute assessment type breakdowns',
            icon: '📝',
            compute: () => handleCompute('assessments', computeAssessmentTypes)
        }
    ];

    return (
        <div className="space-y-6">
            {/* EXISTING: Header (unchanged) */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Compute Controls</h1>
                    <p className="mt-2 text-gray-600">Recompute summaries and batch processing</p>
                </div>
                <Settings className="h-8 w-8 text-blue-600" />
            </div>

            {/* EXISTING: Term Selection (unchanged) */}
            <Card>
                <Select
                    label="Select Term"
                    value={selectedTerm?.toString() || ''}
                    onChange={(e) => setSelectedTerm(e.target.value ? Number(e.target.value) : null)}
                    options={[
                        { value: '', label: 'Select a term...' },
                        ...terms.map(term => ({
                            value: String(term.id),
                            label: `${term.academic_year_name} — ${term.name}`
                        }))
                    ]}
                    disabled={termsLoading}
                />
            </Card>

            {/* NEW: Policy-Based Computation Section */}
            <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
                <div className="flex items-start gap-4">
                    <div className="flex-shrink-0">
                        <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                            <Zap className="h-6 w-6 text-white" />
                        </div>
                    </div>
                    <div className="flex-1">
                        <h3 className="text-lg font-bold text-gray-900 mb-2">
                            Policy-Based Grade Computation
                        </h3>
                        <p className="text-sm text-gray-600 mb-4">
                            Compute grades using flexible computation policies. Supports weighted averages,
                            drop lowest CAT, papers averaging, and custom formulas.
                        </p>
                        <div className="flex items-center gap-3">
                            <Button
                                onClick={handleComputeWithPolicy}
                                disabled={!selectedTerm || computing === 'policy'}
                            >
                                {computing === 'policy' ? (
                                    <>
                                        <Loader className="mr-2 h-4 w-4 animate-spin" />
                                        Computing with Policies...
                                    </>
                                ) : (
                                    <>
                                        <Zap className="mr-2 h-4 w-4" />
                                        Compute with Policies
                                    </>
                                )}
                            </Button>
                            <Link href="/reports/grade-policies">
                                <Button variant="ghost" size="sm">
                                    <Settings className="mr-2 h-4 w-4" />
                                    Manage Policies
                                </Button>
                            </Link>
                        </div>
                        {results.policy && (
                            <div className={`mt-4 p-3 rounded-lg flex items-center gap-2 ${results.policy.success
                                ? 'bg-green-50 text-green-700 border border-green-200'
                                : 'bg-red-50 text-red-700 border border-red-200'
                                }`}>
                                {results.policy.success ? (
                                    <CheckCircle className="h-4 w-4" />
                                ) : (
                                    <AlertCircle className="h-4 w-4" />
                                )}
                                <span className="text-sm font-medium">{results.policy.message}</span>
                            </div>
                        )}
                    </div>
                </div>
            </Card>

            {/* EXISTING: Legacy Compute Options (100% unchanged) */}
            <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Legacy Computation Methods</h2>
                <div className="grid gap-4 md:grid-cols-2">
                    {computeOptions.map((option) => (
                        <Card key={option.id} className="hover:shadow-lg transition-shadow">
                            <div className="flex items-start gap-3 mb-4">
                                <div className="text-3xl">{option.icon}</div>
                                <div className="flex-1">
                                    <h3 className="text-lg font-semibold text-gray-900">{option.title}</h3>
                                    <p className="text-sm text-gray-600">{option.description}</p>
                                </div>
                            </div>

                            <Button
                                onClick={option.compute}
                                disabled={!selectedTerm || computing === option.id || computing === 'all'}
                                className="w-full"
                            >
                                {computing === option.id ? (
                                    <>
                                        <Loader className="mr-2 h-4 w-4 animate-spin" />
                                        Computing...
                                    </>
                                ) : (
                                    <>
                                        <Play className="mr-2 h-4 w-4" />
                                        Compute
                                    </>
                                )}
                            </Button>

                            {results[option.id] && (
                                <div className={`mt-4 p-3 rounded-lg flex items-center gap-2 ${results[option.id].success
                                    ? 'bg-green-50 text-green-700 border border-green-200'
                                    : 'bg-red-50 text-red-700 border border-red-200'
                                    }`}>
                                    {results[option.id].success ? (
                                        <CheckCircle className="h-4 w-4" />
                                    ) : (
                                        <AlertCircle className="h-4 w-4" />
                                    )}
                                    <span className="text-sm font-medium">{results[option.id].message}</span>
                                </div>
                            )}
                        </Card>
                    ))}
                </div>
            </div>

            {/* EXISTING: Batch Compute All (100% unchanged) */}
            <Card className="bg-gradient-to-r from-gray-50 to-gray-100 border-gray-200">
                <div className="mb-4">
                    <h3 className="text-xl font-bold text-gray-900 mb-2">Batch Compute All (Legacy)</h3>
                    <p className="text-gray-600">
                        Recompute all legacy summaries in sequence for the selected term
                    </p>
                </div>
                <Button
                    onClick={handleComputeAll}
                    disabled={!selectedTerm || computing !== null}
                    size="lg"
                    className="w-full md:w-auto"
                >
                    {computing === 'all' ? (
                        <>
                            <Loader className="mr-2 h-5 w-5 animate-spin" />
                            Computing All...
                        </>
                    ) : (
                        <>
                            <Play className="mr-2 h-5 w-5" />
                            Compute All Summaries
                        </>
                    )}
                </Button>

                {/* EXISTING: Batch Results Summary (unchanged) */}
                {Object.keys(results).length > 0 && (
                    <div className="mt-6 pt-6 border-t border-gray-200">
                        <h4 className="text-sm font-semibold text-gray-900 mb-3">Results Summary</h4>
                        <div className="flex gap-4">
                            <Badge variant="success">
                                ✓ {Object.values(results).filter(r => r.success).length} Successful
                            </Badge>
                            <Badge variant="danger">
                                ✗ {Object.values(results).filter(r => !r.success).length} Failed
                            </Badge>
                        </div>
                    </div>
                )}
            </Card>
        </div>
    );
}