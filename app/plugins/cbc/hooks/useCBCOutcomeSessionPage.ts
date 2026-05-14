import { useEffect, useState } from 'react';
import { apiClient } from '@/app/core/api/client';
import { useTeachingSession } from '@/app/plugins/cbc/hooks/useCBC';

interface LearningOutcome {
    id: number;
    code: string;
    description: string;
    sub_strand: number;
    sub_strand_name?: string;
    strand_name?: string;
}

interface OutcomeSession {
    id: number;
    session: number;
    learning_outcome: number;
    covered: boolean;
    notes: string;
    evidence_count?: number;
    learners_with_evidence?: number;
}

export function useCBCOutcomeSessionPage(sessionId: number, learningOutcomeId: number) {
    const { data: session } = useTeachingSession(sessionId);
    const [learningOutcome, setLearningOutcome] = useState<LearningOutcome | null>(null);
    const [outcomeSession, setOutcomeSession] = useState<OutcomeSession | null>(null);
    const [loading, setLoading] = useState(true);
    const [editingNotes, setEditingNotes] = useState(false);
    const [notes, setNotes] = useState('');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        let isActive = true;

        const fetchData = async () => {
            try {
                setLoading(true);

                const outcomeResponse = await apiClient.get(`/cbc/learning-outcomes/${learningOutcomeId}/`);
                const sessionOutcomesResponse = await apiClient.get<OutcomeSession[]>(
                    `/cbc/outcome-sessions/by_session/?session_id=${sessionId}`
                );
                const outcomeSessionLink = sessionOutcomesResponse.data.find(
                    link => link.learning_outcome === learningOutcomeId
                );

                if (!isActive) return;

                setLearningOutcome(outcomeResponse.data);
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
            const response = await apiClient.patch(
                `/cbc/outcome-sessions/${outcomeSession.id}/mark_covered/`,
                { notes }
            );
            setOutcomeSession(response.data);
        } catch (error) {
            console.error('Failed to toggle covered:', error);
        }
    };

    const handleSaveNotes = async () => {
        if (!outcomeSession) return;

        setSaving(true);
        try {
            const response = await apiClient.patch(
                `/cbc/outcome-sessions/${outcomeSession.id}/mark_covered/`,
                { notes }
            );
            setOutcomeSession(response.data);
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
