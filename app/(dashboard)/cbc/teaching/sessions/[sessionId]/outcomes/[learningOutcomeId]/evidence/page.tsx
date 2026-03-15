// ============================================================================
// app/(dashboard)/cbc/teaching/sessions/[sessionId]/outcomes/[learningOutcomeId]/evidence/page.tsx
// Evidence Entry - CRITICAL PAGE - Record learner demonstrations
// ============================================================================

'use client';

import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
    ArrowLeft,
    Target,
    Users,
    FileText,
    Plus,
    Check,
    AlertCircle
} from 'lucide-react';
import { apiClient } from '@/app/core/api/client';
import { useTeachingSession, useSessionLearners, useSessionEvidence } from '@/app/plugins/cbc/hooks/useCBC';
import { Card } from '@/app/components/ui/Card';
import { Button } from '@/app/components/ui/Button';
import { Badge } from '@/app/components/ui/Badge';
import { Select } from '@/app/components/ui/Select';
import { Input } from '@/app/components/ui/Input';

interface OutcomeSessionDetail {
    id: number;
    learning_outcome: number;
    learning_outcome_code: string;
    learning_outcome_description: string;
    sub_strand_name: string;
    strand_name: string;
}

export default function EvidenceEntryPage() {
    const params = useParams();
    const searchParams = useSearchParams();
    const sessionId = Number(params.sessionId);
    const learningOutcomeId = Number(params.learningOutcomeId);
    const highlightStudentId = searchParams.get('student');

    const { session } = useTeachingSession(sessionId);
    const { learners, loading: learnersLoading } = useSessionLearners(sessionId);
    const { evidenceRecords, loading: evidenceLoading, saving, createEvidence } = useSessionEvidence(
        learningOutcomeId,
        sessionId
    );

    const [outcomeSession, setOutcomeSession] = useState<OutcomeSessionDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [addingFor, setAddingFor] = useState<number | null>(null);

    // Form state
    const [evaluationType, setEvaluationType] = useState('DESCRIPTIVE');
    const [numericScore, setNumericScore] = useState('');
    const [narrative, setNarrative] = useState('');

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);

                // Fetch outcome session
                const osResponse = await apiClient.get(`/learning-outcomes/${learningOutcomeId}/`);
                setOutcomeSession(osResponse.data);
            } catch (err) {
                console.error('Failed to fetch data:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [learningOutcomeId, sessionId]);

    const handleAddEvidence = async (studentId: number) => {
        if (!outcomeSession) return;

        try {
            await createEvidence({
                studentId,
                evaluationType: evaluationType as 'DESCRIPTIVE' | 'NUMERIC' | 'COMPETENCY',
                numericScore: evaluationType === 'NUMERIC' ? parseFloat(numericScore) : null,
                narrative: narrative.trim(),
                observedAt: session?.session_date || new Date().toISOString().split('T')[0]
            });

            // Reset form
            setAddingFor(null);
            setNarrative('');
            setNumericScore('');
            setEvaluationType('DESCRIPTIVE');
        } catch (err: any) {
            console.error('Failed to create evidence:', err.response?.data);
            alert(err.response?.data?.detail || 'Failed to record evidence');
        }
    };

    if (loading || learnersLoading || evidenceLoading || !session) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="flex flex-col items-center gap-3">
                    <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
                    <p className="text-sm text-gray-500">Loading...</p>
                </div>
            </div>
        );
    }

    if (!outcomeSession) {
        return (
            <div className="py-20 text-center">
                <p className="text-gray-500">Outcome not found</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-7xl mx-auto">
            {/* CBC nav */}
            <nav className="flex gap-2 bg-white rounded-xl p-1.5 shadow-sm border border-gray-200">
                <Link href="/cbc/authoring" className="flex-1 text-center text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg py-2.5 transition-colors">
                    Authoring
                </Link>
                <Link href="/cbc/browser" className="flex-1 text-center text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg py-2.5 transition-colors">
                    Browser
                </Link>
                <Link href="/cbc/progress" className="flex-1 text-center text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg py-2.5 transition-colors">
                    Progress
                </Link>
                <Link href="/cbc/teaching" className="flex-1 text-center text-sm font-semibold text-white bg-blue-600 rounded-lg py-2.5 shadow-sm">
                    Teaching
                </Link>
            </nav>

            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-sm text-gray-500">
                <Link href="/cbc/teaching" className="hover:text-blue-600">Teaching</Link>
                <span>→</span>
                <Link href={`/cbc/teaching/sessions/${sessionId}`} className="hover:text-blue-600">
                    {session.subject_name}
                </Link>
                <span>→</span>
                <Link href={`/cbc/teaching/sessions/${sessionId}/outcomes`} className="hover:text-blue-600">
                    Outcomes
                </Link>
                <span>→</span>
                <Link href={`/cbc/teaching/sessions/${sessionId}/outcomes/${learningOutcomeId}`} className="hover:text-blue-600">
                    {outcomeSession.learning_outcome_code}
                </Link>
                <span>→</span>
                <span className="text-gray-900 font-medium">Evidence</span>
            </div>

            {/* Outcome Header */}
            <Card className="shadow-sm bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200">
                <div className="flex items-start gap-4">
                    <div className="p-3 bg-purple-600 rounded-lg">
                        <Target className="h-6 w-6 text-white" />
                    </div>
                    <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                            <Badge variant="purple" size="lg" className="font-mono font-semibold">
                                {outcomeSession.learning_outcome_code}
                            </Badge>
                            <span className="text-xs text-gray-600">
                                {outcomeSession.strand_name} → {outcomeSession.sub_strand_name}
                            </span>
                        </div>
                        <p className="text-gray-700 font-medium">
                            {outcomeSession.learning_outcome_description}
                        </p>
                    </div>
                </div>
            </Card>

            {/* Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="shadow-sm">
                    <div className="text-center">
                        <div className="text-3xl font-bold text-blue-600">{learners.length}</div>
                        <div className="text-sm text-gray-600 mt-1">Total Learners</div>
                    </div>
                </Card>
                <Card className="shadow-sm">
                    <div className="text-center">
                        <div className="text-3xl font-bold text-green-600">
                            {Array.from(evidenceRecords.keys()).length}
                        </div>
                        <div className="text-sm text-gray-600 mt-1">With Evidence</div>
                    </div>
                </Card>
                <Card className="shadow-sm">
                    <div className="text-center">
                        <div className="text-3xl font-bold text-purple-600">
                            {Array.from(evidenceRecords.values()).reduce((sum, records) => sum + records.length, 0)}
                        </div>
                        <div className="text-sm text-gray-600 mt-1">Total Records</div>
                    </div>
                </Card>
            </div>

            {/* Learners List */}
            <Card className="shadow-sm">
                <div className="mb-5">
                    <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                        <Users className="h-5 w-5 text-purple-600" />
                        Record Evidence by Learner
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">
                        Document observations for each learner
                    </p>
                </div>

                <div className="space-y-3">
                    {learners.map((learner) => {
                        const studentEvidence = evidenceRecords.get(learner.id) || [];
                        const isAdding = addingFor === learner.id;
                        const isHighlighted = highlightStudentId === String(learner.id);

                        return (
                            <div
                                key={learner.id}
                                className={`border rounded-xl overflow-hidden transition-all ${isHighlighted
                                    ? 'border-blue-500 shadow-md'
                                    : studentEvidence.length > 0
                                        ? 'border-green-200 bg-green-50'
                                        : 'border-gray-200'
                                    }`}
                            >
                                {/* Learner Header */}
                                <div className="flex items-center justify-between p-4 bg-white">
                                    <div className="flex items-center gap-4 flex-1">
                                        <div className="p-2 bg-purple-100 rounded-lg">
                                            <Users className="h-5 w-5 text-purple-600" />
                                        </div>
                                        <div className="flex-1">
                                            <h3 className="font-semibold text-gray-900">
                                                {learner.first_name} {learner.last_name}
                                            </h3>
                                            <p className="text-sm text-gray-500">{learner.admission_number}</p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        {studentEvidence.length > 0 && (
                                            <Badge variant="green" size="sm">
                                                {studentEvidence.length} record{studentEvidence.length !== 1 ? 's' : ''}
                                            </Badge>
                                        )}
                                        {!isAdding && (
                                            <Button
                                                variant={studentEvidence.length > 0 ? 'ghost' : 'primary'}
                                                size="sm"
                                                onClick={() => setAddingFor(learner.id)}
                                            >
                                                <Plus className="h-4 w-4 mr-2" />
                                                Add Evidence
                                            </Button>
                                        )}
                                    </div>
                                </div>

                                {/* Existing Evidence */}
                                {studentEvidence.length > 0 && (
                                    <div className="px-4 pb-3 bg-white border-t border-gray-100">
                                        <div className="space-y-2">
                                            {studentEvidence.map((evidence) => (
                                                <div key={evidence.id} className="p-3 bg-gray-50 rounded-lg text-sm">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <Badge variant="blue" size="sm">{evidence.evaluation_type}</Badge>
                                                        <span className="text-xs text-gray-500">
                                                            {new Date(evidence.observed_at).toLocaleDateString()}
                                                        </span>
                                                    </div>
                                                    {evidence.narrative && (
                                                        <p className="text-gray-700">{evidence.narrative}</p>
                                                    )}
                                                    {evidence.numeric_score !== null && evidence.numeric_score !== undefined && (
                                                        <p className="text-gray-700">Score: {evidence.numeric_score}</p>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Add Evidence Form */}
                                {isAdding && (
                                    <div className="p-4 bg-blue-50 border-t border-blue-200">
                                        <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                            <FileText className="h-4 w-4 text-blue-600" />
                                            Record New Evidence
                                        </h4>

                                        <div className="space-y-3">
                                            <Select
                                                label="Evaluation Type"
                                                value={evaluationType}
                                                onChange={(e) => setEvaluationType(e.target.value)}
                                                options={[
                                                    { value: 'DESCRIPTIVE', label: 'Descriptive (Observation)' },
                                                    { value: 'NUMERIC', label: 'Numeric Score' },
                                                    { value: 'COMPETENCY', label: 'Competency Check' },
                                                ]}
                                            />

                                            {evaluationType === 'NUMERIC' && (
                                                <Input
                                                    label="Score"
                                                    type="number"
                                                    value={numericScore}
                                                    onChange={(e) => setNumericScore(e.target.value)}
                                                    placeholder="Enter score..."
                                                />
                                            )}

                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                                    Observation Notes
                                                </label>
                                                <textarea
                                                    value={narrative}
                                                    onChange={(e) => setNarrative(e.target.value)}
                                                    rows={3}
                                                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                    placeholder="Describe what the learner demonstrated..."
                                                />
                                            </div>

                                            <div className="flex gap-2">
                                                <Button
                                                    variant="primary"
                                                    size="sm"
                                                    onClick={() => handleAddEvidence(learner.id)}
                                                    disabled={saving || (!narrative.trim() && evaluationType !== 'NUMERIC')}
                                                >
                                                    <Check className="h-4 w-4 mr-2" />
                                                    {saving ? 'Saving...' : 'Record Evidence'}
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => {
                                                        setAddingFor(null);
                                                        setNarrative('');
                                                        setNumericScore('');
                                                    }}
                                                >
                                                    Cancel
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                {learners.length === 0 && (
                    <div className="py-12 text-center">
                        <AlertCircle className="mx-auto h-12 w-12 text-gray-300 mb-3" />
                        <p className="text-gray-500">No learners in this cohort</p>
                    </div>
                )}
            </Card>
        </div>
    );
}