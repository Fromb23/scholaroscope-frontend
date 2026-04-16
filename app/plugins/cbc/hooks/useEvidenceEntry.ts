// app/plugins/cbc/hooks/useEvidenceEntry.ts
import { useState, useMemo } from 'react';
import {
    useTeachingSession, useSessionLearners, useLearningOutcomeDetail,
    useEvidence, useCreateEvidence,
    useSessionRubricScale, useBulkCreateClassEvidence,
} from '@/app/plugins/cbc/hooks/useCBC';
import type { EvidenceRecord, EvaluationType } from '@/app/plugins/cbc/types/cbc';

type ApiList<T> = T[] | { results: T[]; count: number };

export function useEvidenceEntry(sessionId: number, learningOutcomeId: number) {
    const { data: session, isLoading: sessionLoading, error: sessionError } =
        useTeachingSession(sessionId);
    const { data: outcome, isLoading: outcomeLoading, error: outcomeError } =
        useLearningOutcomeDetail(learningOutcomeId);
    const { data: learners = [], isLoading: learnersLoading } =
        useSessionLearners(sessionId);
    const { data: allEvidenceRaw, isLoading: evidenceLoading } = useEvidence({
        learning_outcome: learningOutcomeId,
        source_type: 'SESSION',
        source_id: sessionId,
    });
    const { data: rubricScale } = useSessionRubricScale(sessionId);

    const createEvidence = useCreateEvidence();
    const bulkCreate = useBulkCreateClassEvidence();

    const allEvidence: EvidenceRecord[] = useMemo(() => {
        if (!allEvidenceRaw) return [];
        const raw = allEvidenceRaw as ApiList<EvidenceRecord>;
        return Array.isArray(raw) ? raw : raw.results ?? [];
    }, [allEvidenceRaw]);

    const evidenceByStudent = useMemo(() => {
        const map = new Map<number, EvidenceRecord[]>();
        for (const rec of allEvidence) {
            if (!map.has(rec.student)) map.set(rec.student, []);
            map.get(rec.student)!.push(rec);
        }
        return map;
    }, [allEvidence]);

    const withEvidence = useMemo(() =>
        learners.filter(l => evidenceByStudent.has(l.id)), [learners, evidenceByStudent]);
    const withoutEvidence = useMemo(() =>
        learners.filter(l => !evidenceByStudent.has(l.id)), [learners, evidenceByStudent]);
    const sortedLearners = useMemo(() =>
        [...withoutEvidence, ...withEvidence], [withoutEvidence, withEvidence]);

    const [addingFor, setAddingFor] = useState<number | null>(null);
    const [evalType, setEvalType] = useState<EvaluationType>('DESCRIPTIVE');
    const [numericScore, setNumericScore] = useState('');
    const [narrative, setNarrative] = useState('');
    const [formError, setFormError] = useState<string | null>(null);
    const [showBulk, setShowBulk] = useState(false);
    const [bulkSuccess, setBulkSuccess] = useState<number | null>(null);

    const resetForm = () => {
        setAddingFor(null);
        setNarrative('');
        setNumericScore('');
        setEvalType('DESCRIPTIVE');
        setFormError(null);
    };

    const handleSubmit = async (studentId: number) => {
        if (!session) return;
        setFormError(null);
        try {
            await createEvidence.mutateAsync({
                student: studentId,
                learning_outcome: learningOutcomeId,
                source_type: 'SESSION',
                source_id: sessionId,
                evaluation_type: evalType,
                numeric_score: evalType === 'NUMERIC' ? parseFloat(numericScore) : null,
                narrative: narrative.trim(),
                observed_at: session.session_date,
            });
            resetForm();
        } catch (e: unknown) {
            setFormError((e as Error).message ?? 'Failed to record evidence');
        }
    };

    const handleBulkClose = (recordedCount?: number) => {
        setShowBulk(false);
        if (recordedCount) setBulkSuccess(recordedCount);
    };

    const isPageLoading = sessionLoading || outcomeLoading || learnersLoading || evidenceLoading;

    return {
        session, sessionError,
        outcome, outcomeError,
        learners, sortedLearners,
        withEvidence, withoutEvidence,
        evidenceByStudent,
        rubricScale,
        isPageLoading,
        addingFor, setAddingFor,
        evalType, setEvalType,
        numericScore, setNumericScore,
        narrative, setNarrative,
        formError,
        showBulk, setShowBulk,
        bulkSuccess, setBulkSuccess,
        createEvidencePending: createEvidence.isPending,
        bulkCreatePending: bulkCreate.isPending,
        bulkCreate,
        resetForm, handleSubmit, handleBulkClose,
    };
}