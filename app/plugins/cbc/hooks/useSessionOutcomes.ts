// app/plugins/cbc/hooks/useSessionOutcomes.ts
import { useState, useMemo } from 'react';
import {
    useTeachingSession, useOutcomeSessions,
    useMarkOutcomeCovered, useRemoveOutcomeLink, useSessionSummary,
} from '@/app/plugins/cbc/hooks/useCBC';
import type { OutcomeSessionWithEvidence } from '@/app/plugins/cbc/types/cbc';

export type OutcomeFilter = 'all' | 'needs_evidence' | 'covered';

export function useSessionOutcomes(sessionId: number) {
    const { data: session, isLoading: sessionLoading, error: sessionError } =
        useTeachingSession(sessionId);
    const { data: rawLinks = [], isLoading: linksLoading, error: linksError, refetch } =
        useOutcomeSessions(sessionId);
    const { data: summary } = useSessionSummary(sessionId);

    const links = rawLinks as OutcomeSessionWithEvidence[];

    const markCovered = useMarkOutcomeCovered();
    const removeLink = useRemoveOutcomeLink();

    const [filter, setFilter] = useState<OutcomeFilter>('all');
    const [editingNotes, setEditingNotes] = useState<number | null>(null);
    const [notesValue, setNotesValue] = useState('');

    const coveredCount = links.filter(l => l.covered).length;
    const withEvidenceCount = links.filter(l => l.evidence_count > 0).length;
    const needsEvidenceCount = links.filter(l => l.evidence_count === 0).length;
    const progress = links.length > 0 ? Math.round((coveredCount / links.length) * 100) : 0;

    const filteredLinks = useMemo(() => {
        if (filter === 'needs_evidence') return links.filter(l => l.evidence_count === 0);
        if (filter === 'covered') return links.filter(l => l.covered);
        return links;
    }, [links, filter]);

    const handleToggleCovered = async (linkId: number, covered: boolean, notes: string) => {
        if (covered) {
            setEditingNotes(linkId);
            setNotesValue(notes);
            return;
        }
        await markCovered.mutateAsync({ id: linkId });
    };

    const handleSaveNotes = async (linkId: number) => {
        await markCovered.mutateAsync({ id: linkId, notes: notesValue });
        setEditingNotes(null);
    };

    const handleRemove = async (linkId: number) => {
        if (!confirm('Remove this outcome from the session?')) return;
        await removeLink.mutateAsync(linkId);
    };

    return {
        session, sessionLoading, sessionError,
        links, filteredLinks, linksLoading, linksError, refetch,
        summary,
        filter, setFilter,
        coveredCount, withEvidenceCount, needsEvidenceCount, progress,
        editingNotes, setEditingNotes,
        notesValue, setNotesValue,
        markCoveredPending: markCovered.isPending,
        removeLinkPending: removeLink.isPending,
        handleToggleCovered, handleSaveNotes, handleRemove,
    };
}