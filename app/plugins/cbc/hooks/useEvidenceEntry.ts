// app/plugins/cbc/hooks/useEvidenceEntry.ts
import { useEffect, useMemo, useRef, useState } from 'react';
import {
    useTeachingSession, useSessionLearners, useLearningOutcomeDetail,
    useEvidenceBySessionOutcome, useCreateEvidence,
} from '@/app/plugins/cbc/hooks/useCBC';
import { extractErrorMessage } from '@/app/plugins/cbc/components/CBCComponents';
import {
    isAttendanceBlocking,
    isEvidenceEligible,
    isEvidenceIneligible,
} from '@/app/plugins/cbc/lib/evidenceEligibility';
import type {
    BulkClassEvidenceResult,
    EvaluationType,
    EvidenceRecord,
} from '@/app/plugins/cbc/types/cbc';

export function useEvidenceEntry(sessionId: number, learningOutcomeId: number) {
    const { data: session, isLoading: sessionLoading, error: sessionError } =
        useTeachingSession(sessionId);
    const { data: outcome, isLoading: outcomeLoading, error: outcomeError } =
        useLearningOutcomeDetail(learningOutcomeId);
    const {
        data: learners = [],
        isLoading: learnersLoading,
        error: learnersError,
    } =
        useSessionLearners(sessionId);
    const {
        data: allEvidence = [],
        isLoading: evidenceLoading,
        error: evidenceError,
    } = useEvidenceBySessionOutcome(sessionId, learningOutcomeId);

    const createEvidence = useCreateEvidence();

    const evidenceByStudent = useMemo(() => {
        const map = new Map<number, EvidenceRecord[]>();
        for (const rec of allEvidence) {
            if (!map.has(rec.student)) map.set(rec.student, []);
            map.get(rec.student)!.push(rec);
        }
        return map;
    }, [allEvidence]);

    const eligibility = useMemo(() => {
        const eligibleLearners = learners.filter(learner =>
            isEvidenceEligible(learner.attendance_status),
        );
        const ineligibleLearners = learners.filter(learner =>
            isEvidenceIneligible(learner.attendance_status),
        );
        const unmarkedLearners = learners.filter(learner =>
            isAttendanceBlocking(learner.attendance_status),
        );
        const eligibleWithEvidence = eligibleLearners.filter(learner =>
            evidenceByStudent.has(learner.id),
        );
        const eligibleWithoutEvidence = eligibleLearners.filter(learner =>
            !evidenceByStudent.has(learner.id),
        );

        return {
            eligibleLearners,
            ineligibleLearners,
            unmarkedLearners,
            eligibleWithEvidence,
            eligibleWithoutEvidence,
            sortedEligibleLearners: [...eligibleWithoutEvidence, ...eligibleWithEvidence],
            hasBlockingAttendance: unmarkedLearners.length > 0,
        };
    }, [learners, evidenceByStudent]);

    const [addingFor, setAddingFor] = useState<number | null>(null);
    const [evalType, setEvalType] = useState<EvaluationType>('DESCRIPTIVE');
    const [numericScore, setNumericScore] = useState('');
    const [narrative, setNarrative] = useState('');
    const [formError, setFormError] = useState<string | null>(null);
    const [showBulk, setShowBulk] = useState(false);
    const [bulkSuccess, setBulkSuccess] = useState<BulkClassEvidenceResult | null>(null);

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
            setFormError(extractErrorMessage(e));
        }
    };

    const handleBulkClose = (result?: BulkClassEvidenceResult) => {
        setShowBulk(false);
        if (result) setBulkSuccess(result);
    };

    const loadTimerStarted = useRef(false);
    const loadTimerEnded = useRef(false);

    useEffect(() => {
        if (process.env.NODE_ENV !== 'development') return;
        console.time('[CBC Evidence] load');
        loadTimerStarted.current = true;
        loadTimerEnded.current = false;

        return () => {
            if (loadTimerStarted.current && !loadTimerEnded.current) {
                console.timeEnd('[CBC Evidence] load');
                loadTimerEnded.current = true;
            }
        };
    }, [sessionId, learningOutcomeId]);

    useEffect(() => {
        if (process.env.NODE_ENV !== 'development') return;
        if (!loadTimerStarted.current || loadTimerEnded.current) return;

        const pageReady = (
            (!sessionLoading && !outcomeLoading && !learnersLoading && !evidenceLoading) ||
            Boolean(sessionError || outcomeError || learnersError || evidenceError)
        );

        if (pageReady) {
            console.timeEnd('[CBC Evidence] load');
            loadTimerEnded.current = true;
        }
    }, [
        evidenceError,
        evidenceLoading,
        learnersError,
        learnersLoading,
        outcomeError,
        outcomeLoading,
        sessionError,
        sessionLoading,
    ]);

    return {
        session, sessionError,
        outcome, outcomeError,
        learners,
        learnersError,
        evidenceError,
        eligibleLearners: eligibility.eligibleLearners,
        ineligibleLearners: eligibility.ineligibleLearners,
        unmarkedLearners: eligibility.unmarkedLearners,
        eligibleWithEvidence: eligibility.eligibleWithEvidence,
        eligibleWithoutEvidence: eligibility.eligibleWithoutEvidence,
        sortedEligibleLearners: eligibility.sortedEligibleLearners,
        hasBlockingAttendance: eligibility.hasBlockingAttendance,
        evidenceByStudent,
        isPageLoading: sessionLoading || outcomeLoading,
        isEvidencePanelLoading: learnersLoading || evidenceLoading,
        addingFor, setAddingFor,
        evalType, setEvalType,
        numericScore, setNumericScore,
        narrative, setNarrative,
        formError,
        showBulk, setShowBulk,
        bulkSuccess, setBulkSuccess,
        createEvidencePending: createEvidence.isPending,
        resetForm, handleSubmit, handleBulkClose,
    };
}
