'use client';
// app/(dashboard)/cbc/teaching/sessions/page.tsx

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Calendar, BookOpen, Target, Filter, Search } from 'lucide-react';
import { useRecentSessions } from '@/app/plugins/cbc/hooks/useCBC';
import {
    CBCNav, CBCBreadcrumb, CBCError, CBCLoading, SessionStatusBadge,
} from '@/app/plugins/cbc/components/CBCComponents';
import { Card } from '@/app/components/ui/Card';
import { Button } from '@/app/components/ui/Button';
import { Badge } from '@/app/components/ui/Badge';
import type { SessionStatus } from '@/app/plugins/cbc/types/cbc';

const STATUS_OPTIONS: { value: string; label: string }[] = [
    { value: '', label: 'All statuses' },
    { value: 'SCHEDULED', label: 'Scheduled' },
    { value: 'IN_PROGRESS', label: 'In Progress' },
    { value: 'COMPLETED', label: 'Completed' },
    { value: 'MISSED', label: 'Missed' },
];

export default function SessionsListPage() {
    const router = useRouter();
    const [search, setSearch] = useState('');
    const [days, setDays] = useState(30);
    const [statusFilter, setStatus] = useState('');

    const { data: sessions = [], isLoading, error, refetch } = useRecentSessions(days);

    const filtered = useMemo(() => {
        let list = sessions;
        if (statusFilter) list = list.filter(s => s.status === statusFilter);
        if (search.trim()) {
            const q = search.toLowerCase();
            list = list.filter(s =>
                s.subject_name?.toLowerCase().includes(q) ||
                s.cohort_name?.toLowerCase().includes(q) ||
                s.title?.toLowerCase().includes(q)
            );
        }
        return list;
    }, [sessions, search, statusFilter]);

    return (
        <div className="space-y-6">
            <CBCNav />
            <CBCBreadcrumb segments={[
                { label: 'Teaching', href: '/cbc/teaching' },
                { label: 'All Sessions' },
            ]} />

            {/* Header */}
            <div className="flex items-center gap-3">
                <Link href="/cbc/teaching"
                    className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors">
                    <ArrowLeft className="h-5 w-5" />
                </Link>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Teaching Sessions</h1>
                    <p className="text-gray-500 mt-0.5">View and manage your teaching history</p>
                </div>
            </div>

            {error && <CBCError error={error} onRetry={refetch} />}

            {/* Filters */}
            <Card>
                <div className="flex flex-wrap items-end gap-4">
                    <div className="flex-1 min-w-[240px]">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <input
                                type="text"
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                placeholder="Subject, cohort, or title…"
                                className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg
                  text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            <Filter className="h-4 w-4 inline mr-1" />Period
                        </label>
                        <select value={days} onChange={e => setDays(Number(e.target.value))}
                            className="px-3 py-2 border border-gray-300 rounded-lg text-sm
                focus:outline-none focus:ring-2 focus:ring-blue-500">
                            <option value={7}>Last 7 days</option>
                            <option value={14}>Last 14 days</option>
                            <option value={30}>Last 30 days</option>
                            <option value={60}>Last 60 days</option>
                            <option value={90}>Last 90 days</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                        <select value={statusFilter} onChange={e => setStatus(e.target.value)}
                            className="px-3 py-2 border border-gray-300 rounded-lg text-sm
                focus:outline-none focus:ring-2 focus:ring-blue-500">
                            {STATUS_OPTIONS.map(o => (
                                <option key={o.value} value={o.value}>{o.label}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </Card>

            {/* List */}
            <Card>
                <div className="flex items-center justify-between mb-5">
                    <div>
                        <h2 className="text-lg font-semibold text-gray-900">Sessions</h2>
                        <p className="text-sm text-gray-500 mt-0.5">
                            {filtered.length} session{filtered.length !== 1 ? 's' : ''} found
                        </p>
                    </div>
                    <Badge variant="blue" size="md">{filtered.length}</Badge>
                </div>

                {isLoading ? (
                    <CBCLoading />
                ) : filtered.length === 0 ? (
                    <div className="py-16 text-center">
                        <Calendar className="mx-auto h-12 w-12 text-gray-300 mb-3" />
                        <p className="text-gray-500 mb-1">No sessions found</p>
                        <p className="text-sm text-gray-400">Try adjusting your filters</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {filtered.map(session => (
                            <button
                                key={session.id}
                                onClick={() => router.push(`/cbc/teaching/sessions/${session.id}`)}
                                className="w-full flex items-center justify-between p-5 border border-gray-200
                  rounded-xl hover:border-blue-300 hover:bg-blue-50 transition-all text-left"
                            >
                                <div className="flex items-center gap-5 min-w-0 flex-1">
                                    <div className="p-3 bg-blue-50 rounded-xl border border-blue-100 shrink-0">
                                        <BookOpen className="h-6 w-6 text-blue-600" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-3 flex-wrap mb-1">
                                            <h3 className="font-semibold text-gray-900 truncate">
                                                {session.subject_name ?? 'General Session'}
                                            </h3>
                                            <Badge variant="purple" size="sm">
                                                {new Date(session.session_date).toLocaleDateString('en-GB', {
                                                    day: 'numeric', month: 'short', year: 'numeric',
                                                })}
                                            </Badge>
                                        </div>
                                        <p className="text-sm text-gray-500 truncate mb-1">{session.cohort_name}</p>
                                        <div className="flex items-center gap-3">
                                            <SessionStatusBadge status={session.status} />
                                            {(session.outcome_links_count ?? 0) > 0 && (
                                                <span className="text-xs text-gray-500 flex items-center gap-1">
                                                    <Target className="h-3.5 w-3.5" />
                                                    {session.outcome_links_count} outcomes
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>
                )}
            </Card>
        </div>
    );
}