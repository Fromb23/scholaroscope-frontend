'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Search } from 'lucide-react';
import { apiClient } from '@/app/core/api/client';
import { useAuth } from '@/app/context/AuthContext';
import {
    globalStatusLabel,
    membershipStatusLabel,
} from '@/app/core/types/globalUsers';

interface PeopleSearchResult {
    kind: 'student' | 'instructor' | 'admin' | 'user';
    id: number;
    display_name: string;
    secondary_label: string;
    role: string | null;
    status: string | null;
    global_status?: 'ACTIVE' | 'GLOBAL_DEACTIVATED' | null;
    membership_status?: 'ACTIVE' | 'SUSPENDED' | 'REVOKED' | null;
    state_message?: string | null;
    organization?: {
        id: number;
        name: string | null;
        code: string | null;
    } | null;
    target_url: string;
}

function kindLabel(kind: PeopleSearchResult['kind']): string {
    switch (kind) {
        case 'student':
            return 'Learner';
        case 'admin':
            return 'Admin';
        case 'instructor':
            return 'Instructor';
        default:
            return 'User';
    }
}

export function GlobalPeopleSearch() {
    const router = useRouter();
    const { user } = useAuth();
    const containerRef = useRef<HTMLDivElement | null>(null);
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<PeopleSearchResult[]>([]);
    const [loading, setLoading] = useState(false);
    const [open, setOpen] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const handlePointerDown = (event: MouseEvent) => {
            if (!containerRef.current?.contains(event.target as Node)) {
                setOpen(false);
            }
        };

        document.addEventListener('mousedown', handlePointerDown);
        return () => {
            document.removeEventListener('mousedown', handlePointerDown);
        };
    }, []);

    useEffect(() => {
        let cancelled = false;
        const trimmedQuery = query.trim();

        if (trimmedQuery.length < 2) {
            setResults([]);
            setLoading(false);
            setError(null);
            return;
        }

        setLoading(true);
        setError(null);
        setOpen(true);

        const timer = window.setTimeout(async () => {
            try {
                const { data } = await apiClient.get<PeopleSearchResult[]>(
                    '/users/people-search/',
                    { params: { q: trimmedQuery } },
                );

                if (cancelled) {
                    return;
                }

                setResults(data);
            } catch (err) {
                if (cancelled) {
                    return;
                }

                setResults([]);
                setError(err instanceof Error ? err.message : 'Search failed.');
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        }, 250);

        return () => {
            cancelled = true;
            window.clearTimeout(timer);
        };
    }, [query]);

    const shouldShowDropdown = open && (
        query.trim().length >= 2
        || loading
        || Boolean(error)
    );

    const buildTargetUrl = (result: PeopleSearchResult): string => {
        if (user?.is_superadmin) {
            if (result.kind === 'student' && result.organization?.id) {
                return `/superadmin/learners/${result.id}?organization=${result.organization.id}`;
            }

            if (result.kind !== 'student') {
                return `/superadmin/users/${result.id}`;
            }
        }

        return result.target_url;
    };

    return (
        <div ref={containerRef} className="relative hidden md:block">
            <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 theme-subtle" />
                <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    onFocus={() => {
                        if (query.trim().length >= 2) {
                            setOpen(true);
                        }
                    }}
                    placeholder="Search people"
                    className="theme-input theme-surface-elevated h-10 w-72 rounded-lg pl-10 pr-3 text-sm"
                />
                {loading ? (
                    <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin theme-subtle" />
                ) : null}
            </div>

            {shouldShowDropdown ? (
                <div className="theme-dropdown absolute right-0 z-30 mt-2 w-[28rem] rounded-xl py-2 shadow-xl">
                    {error ? (
                        <div className="px-4 py-3 text-sm text-red-600">{error}</div>
                    ) : null}

                    {!error && !loading && results.length === 0 ? (
                        <div className="px-4 py-3 text-sm theme-muted">
                            No matching people found.
                        </div>
                    ) : null}

                    {!error && results.map((result) => (
                        <button
                            key={`${result.kind}:${result.id}`}
                            type="button"
                            onClick={() => {
                                setOpen(false);
                                setQuery('');
                                router.push(buildTargetUrl(result));
                            }}
                            className="flex w-full items-start justify-between gap-3 px-4 py-3 text-left hover:bg-[color:var(--color-surface-muted)]"
                        >
                            <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className="text-sm font-medium theme-text">
                                        {result.display_name}
                                    </span>
                                    <span className="rounded-full theme-card-muted px-2 py-0.5 text-[11px] font-medium theme-muted">
                                        {kindLabel(result.kind)}
                                    </span>
                                </div>
                                <p className="mt-1 truncate text-sm theme-muted">
                                    {result.secondary_label}
                                </p>
                                {result.organization?.name ? (
                                    <p className="mt-1 text-xs theme-subtle">
                                        {result.organization.code
                                            ? `${result.organization.name} (${result.organization.code})`
                                            : result.organization.name}
                                    </p>
                                ) : null}
                                {result.state_message ? (
                                    <p className="mt-1 text-xs theme-subtle">
                                        {result.state_message}
                                    </p>
                                ) : null}
                            </div>
                            <div className="flex shrink-0 flex-col items-end gap-1">
                                {result.global_status ? (
                                    <span className="rounded-full theme-badge-default px-2 py-0.5 text-[11px] font-medium">
                                        {globalStatusLabel(result.global_status)}
                                    </span>
                                ) : null}
                                {result.membership_status ? (
                                    <span className="rounded-full theme-brand-badge px-2 py-0.5 text-[11px] font-medium">
                                        {membershipStatusLabel(result.membership_status)}
                                    </span>
                                ) : result.status ? (
                                    <span className="shrink-0 text-xs uppercase tracking-wide theme-subtle">
                                        {result.status}
                                    </span>
                                ) : null}
                            </div>
                        </button>
                    ))}
                </div>
            ) : null}
        </div>
    );
}
