'use client';

import { useEffect, useState } from 'react';

export function useNarrowViewport(queryText = '(max-width: 1023px)'): boolean {
    const [matches, setMatches] = useState(false);

    useEffect(() => {
        if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
            return undefined;
        }

        const query = window.matchMedia(queryText);
        const update = () => setMatches(query.matches);
        update();
        query.addEventListener?.('change', update);
        return () => query.removeEventListener?.('change', update);
    }, [queryText]);

    return matches;
}
