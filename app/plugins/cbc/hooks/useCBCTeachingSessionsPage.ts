import { useMemo, useState } from 'react';
import { useRecentSessions } from '@/app/plugins/cbc/hooks/useCBC';

export function useCBCTeachingSessionsPage() {
    const [search, setSearch] = useState('');
    const [days, setDays] = useState(30);
    const [statusFilter, setStatusFilter] = useState('');

    const { data: sessions = [], isLoading, error, refetch } = useRecentSessions(days);

    const filtered = useMemo(() => {
        let list = sessions;

        if (statusFilter) {
            list = list.filter(session => session.status === statusFilter);
        }

        if (search.trim()) {
            const query = search.toLowerCase();
            list = list.filter(session => (
                session.subject_name?.toLowerCase().includes(query) ||
                session.cohort_name?.toLowerCase().includes(query) ||
                session.title?.toLowerCase().includes(query)
            ));
        }

        return list;
    }, [sessions, search, statusFilter]);

    return {
        search,
        setSearch,
        days,
        setDays,
        statusFilter,
        setStatusFilter,
        filtered,
        isLoading,
        error,
        refetch,
    };
}
