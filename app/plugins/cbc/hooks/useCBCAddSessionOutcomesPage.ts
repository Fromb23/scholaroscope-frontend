import { useCallback, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
    useTeachingSession,
    useOutcomeSessions,
    useBulkTagOutcomes,
    useStrandsBySubject,
} from '@/app/plugins/cbc/hooks/useCBC';
import { resolveErrorMessage } from '@/app/plugins/cbc/components/CBCComponents';

export function useCBCAddSessionOutcomesPage(sessionId: number) {
    const router = useRouter();
    const { data: session, isLoading: sessionLoading, error: sessionError } = useTeachingSession(sessionId);
    const { data: links = [] } = useOutcomeSessions(sessionId);
    const bulkTag = useBulkTagOutcomes();
    const subjectId = session?.subject_id ?? null;
    const { data: strands = [], isLoading: strandsLoading } = useStrandsBySubject(subjectId);

    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
    const [search, setSearch] = useState('');
    const [tagError, setTagError] = useState<string | null>(null);
    const [expandedSubStrands, setExpandedSubStrands] = useState<Set<number>>(new Set());

    const linkedIds = useMemo(() => new Set(links.map(link => link.learning_outcome)), [links]);

    const visibleBySubject = useMemo(
        () => strands.filter(strand => strand.sub_strands.length > 0),
        [strands]
    );

    const toggleSubStrand = useCallback((id: number) => {
        setExpandedSubStrands(previous => {
            const next = new Set(previous);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    }, []);

    const toggleOutcome = (id: number) => {
        setSelectedIds(previous => {
            const next = new Set(previous);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    };

    const visibleStrands = useMemo(() => {
        if (!search.trim()) {
            return visibleBySubject.filter(strand => strand.sub_strands.length > 0);
        }

        const query = search.toLowerCase();
        return visibleBySubject.filter(strand => (
            (strand.name.toLowerCase().includes(query) || strand.code.toLowerCase().includes(query)) &&
            strand.sub_strands.length > 0
        ));
    }, [visibleBySubject, search]);

    const handleAdd = async () => {
        if (selectedIds.size === 0) return;

        setTagError(null);
        try {
            await bulkTag.mutateAsync({
                session: sessionId,
                outcome_ids: Array.from(selectedIds),
            });
            router.push(`/cbc/teaching/sessions/${sessionId}/outcomes`);
        } catch (error) {
            setTagError(resolveErrorMessage(error));
        }
    };

    return {
        session,
        sessionLoading,
        sessionError,
        linkedIds,
        strandsLoading,
        selectedIds,
        setSelectedIds,
        search,
        setSearch,
        tagError,
        expandedSubStrands,
        toggleSubStrand,
        toggleOutcome,
        visibleStrands,
        bulkTag,
        handleAdd,
    };
}
