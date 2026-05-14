import { useEffect, useState } from 'react';
import {
    learningOutcomeAPI,
    outcomeSessionAPI,
    teachingAPI,
} from '@/app/plugins/cbc/api/cbc';
import { useTeachingSession } from '@/app/plugins/cbc/hooks/useCBC';
import type {
    LearningOutcome,
    OutcomeSessionWithEvidence,
} from '@/app/plugins/cbc/types/cbc';

export function useCBCOutcomeSessionPage(sessionId: number, learningOutcomeId: number) {
    const { data: session } = useTeachingSession(sessionId);
    const [learningOutcome, setLearningOutcome] = useState<LearningOutcome | null>(null);
    const [outcomeSession, setOutcomeSession] = useState<OutcomeSessionWithEvidence | null>(null);
    const [loading, setLoading] = useState(true);
    const [editingNotes, setEditingNotes] = useState(false);
    const [notes, setNotes] = useState('');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        let isActive = true;

        const fetchData = async () => {
            try {
                setLoading(true);

                const [outcome, sessionOutcomes] = await Promise.all([
                    learningOutcomeAPI.getById(learningOutcomeId),
                    teachingAPI.getSessionOutcomes(sessionId),
                ]);
                const outcomeSessionLink = sessionOutcomes.find(
                    (link) => link.learning_outcome === learningOutcomeId,
                );

                if (!isActive) return;

                setLearningOutcome(outcome);
                if (outcomeSessionLink) {
                    setOutcomeSession(outcomeSessionLink);
                    setNotes(outcomeSessionLink.notes || '');
                }
            } catch (error) {
                console.error('Failed to fetch data:', error);
            } finally {
                if (isActive) {
                    setLoading(false);
                }
            }
        };

        void fetchData();

        return () => {
            isActive = false;
        };
    }, [sessionId, learningOutcomeId]);

    const handleToggleCovered = async () => {
        if (!outcomeSession) return;

        try {
            const updated = await outcomeSessionAPI.markCovered(outcomeSession.id, notes);
            setOutcomeSession(previous => (
                previous ? { ...previous, ...updated } : null
            ));
        } catch (error) {
            console.error('Failed to toggle covered:', error);
        }
    };

    const handleSaveNotes = async () => {
        if (!outcomeSession) return;

        setSaving(true);
        try {
            const updated = await outcomeSessionAPI.markCovered(outcomeSession.id, notes);
            setOutcomeSession(previous => (
                previous ? { ...previous, ...updated } : null
            ));
            setEditingNotes(false);
        } catch (error) {
            console.error('Failed to save notes:', error);
        } finally {
            setSaving(false);
        }
    };

    return {
        session,
        learningOutcome,
        outcomeSession,
        loading,
        editingNotes,
        setEditingNotes,
        notes,
        setNotes,
        saving,
        handleToggleCovered,
        handleSaveNotes,
    };
}
