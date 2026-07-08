'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { ChevronDown, ChevronRight, Loader2, Search } from 'lucide-react';
import { apiClient } from '@/app/core/api/client';
import { useAuth } from '@/app/context/AuthContext';
import {
    globalStatusLabel,
    membershipStatusLabel,
} from '@/app/core/types/globalUsers';

interface PeopleSearchAction {
    key: string;
    label: string;
    href: string;
    description?: string;
}

interface PeopleSearchResult {
    kind: 'student' | 'instructor' | 'admin' | 'superadmin' | 'user';
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
    actions?: PeopleSearchAction[];
}

function kindLabel(kind: PeopleSearchResult['kind']): string {
    switch (kind) {
        case 'student':
            return 'Learner';
        case 'admin':
            return 'Admin';
        case 'instructor':
            return 'Instructor';
        case 'superadmin':
            return 'Superadmin';
        default:
            return 'User';
    }
}

function safeRelativeUrl(href: string): URL | null {
    if (!href.startsWith('/') || href.startsWith('//')) {
        return null;
    }

    return new URL(href, 'https://scholaroscope.local');
}

function getOrganizationIdFromHref(href: string): number | null {
    const url = safeRelativeUrl(href);
    if (!url) {
        return null;
    }

    const parsed = Number(url.searchParams.get('organization'));
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function stripOrganizationParam(href: string): string {
    const url = safeRelativeUrl(href);
    if (!url) {
        return href;
    }

    url.searchParams.delete('organization');
    return `${url.pathname}${url.search}${url.hash}`;
}

export function GlobalPeopleSearch() {
    const router = useRouter();
    const pathname = usePathname();
    const { activeOrg, switchOrg, user } = useAuth();
    const containerRef = useRef<HTMLDivElement | null>(null);
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<PeopleSearchResult[]>([]);
    const [loading, setLoading] = useState(false);
    const [open, setOpen] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [expandedResultKey, setExpandedResultKey] = useState<string | null>(null);
    const isPlatformSearchContext = Boolean(
        user?.is_superadmin
        && (
            pathname === '/dashboard/superadmin'
            || pathname.startsWith('/superadmin')
        ),
    );

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
            setExpandedResultKey(null);
            return;
        }

        setLoading(true);
        setError(null);
        setOpen(true);

        const timer = window.setTimeout(async () => {
            try {
                const { data } = await apiClient.get<PeopleSearchResult[]>(
                    '/users/people-search/',
                    {
                        params: {
                            q: trimmedQuery,
                            ...(isPlatformSearchContext ? { scope: 'platform' } : {}),
                        },
                    },
                );

                if (cancelled) {
                    return;
                }

                setResults(data);
                setExpandedResultKey(null);
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
    }, [isPlatformSearchContext, query]);

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

    const navigateToHref = async (href: string, result: PeopleSearchResult) => {
        try {
            let nextHref = href;
            const organizationId = getOrganizationIdFromHref(href) ?? result.organization?.id ?? null;
            if (
                user?.is_superadmin
                && organizationId
                && !nextHref.startsWith('/superadmin/learners/')
            ) {
                if (activeOrg?.id !== organizationId) {
                    await switchOrg(organizationId);
                }
                nextHref = stripOrganizationParam(nextHref);
            }

            setOpen(false);
            setQuery('');
            setExpandedResultKey(null);
            router.push(nextHref);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Search navigation failed.');
            setOpen(true);
        }
    };

    const visibleResults = user?.is_superadmin
        ? results
        : results.filter((result) => result.kind !== 'superadmin');

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

                    {!error && !loading && visibleResults.length === 0 ? (
                        <div className="px-4 py-3 text-sm theme-muted">
                            No matching people found.
                        </div>
                    ) : null}

                    {!error && visibleResults.map((result) => {
                        const resultKey = `${result.kind}:${result.id}`;
                        const learnerActions = result.kind === 'student'
                            ? (result.actions ?? []).filter((action) => action.href && action.label)
                            : [];
                        const hasLearnerActions = learnerActions.length > 0;
                        const isExpanded = expandedResultKey === resultKey;

                        return (
                            <div
                                key={resultKey}
                                className="border-t first:border-t-0 theme-border"
                            >
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (hasLearnerActions) {
                                            setExpandedResultKey(isExpanded ? null : resultKey);
                                            return;
                                        }
                                        void navigateToHref(buildTargetUrl(result), result);
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
                                        {hasLearnerActions ? (
                                            isExpanded
                                                ? <ChevronDown className="mt-1 h-4 w-4 theme-subtle" />
                                                : <ChevronRight className="mt-1 h-4 w-4 theme-subtle" />
                                        ) : null}
                                    </div>
                                </button>
                                {hasLearnerActions && isExpanded ? (
                                    <div className="grid gap-2 px-4 pb-3 sm:grid-cols-2">
                                        {learnerActions.map((action) => (
                                            <button
                                                key={action.key}
                                                type="button"
                                                onClick={() => {
                                                    void navigateToHref(action.href, result);
                                                }}
                                                className="rounded-lg border px-3 py-2 text-left text-sm font-medium theme-border theme-hover-surface theme-text"
                                            >
                                                {action.label}
                                                {action.description ? (
                                                    <span className="mt-1 block text-xs font-normal theme-subtle">
                                                        {action.description}
                                                    </span>
                                                ) : null}
                                            </button>
                                        ))}
                                    </div>
                                ) : null}
                            </div>
                        );
                    })}
                </div>
            ) : null}
        </div>
    );
}
