import { useCallback, useEffect, useState } from 'react';
import { useStrandDetail } from '@/app/plugins/cbc/hooks/useCBC';

export function useCBCBrowserStrandPage(strandId: number) {
    const { data: strand, isLoading, error, refetch } = useStrandDetail(strandId);
    const [expandedSubStrands, setExpandedSubStrands] = useState<Set<number>>(new Set());

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

    useEffect(() => {
        if (strand?.sub_strands.length !== 1) return;

        const id = strand.sub_strands[0].id;
        setExpandedSubStrands(previous => {
            if (previous.has(id)) {
                return previous;
            }

            const next = new Set(previous);
            next.add(id);
            return next;
        });
    }, [strand]);

    return {
        strand,
        isLoading,
        error,
        refetch,
        expandedSubStrands,
        toggleSubStrand,
    };
}
