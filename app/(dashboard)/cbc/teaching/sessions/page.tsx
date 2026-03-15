// ============================================================================
// app/(dashboard)/cbc/teaching/sessions/page.tsx
// All Teaching Sessions List
// ============================================================================

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
    ArrowLeft,
    Calendar,
    BookOpen,
    Target,
    Users,
    Filter,
    Search
} from 'lucide-react';
import { useTeachingSessions } from '@/app/plugins/cbc/hooks/useCBC';
import { Card } from '@/app/components/ui/Card';
import { Button } from '@/app/components/ui/Button';
import { Badge } from '@/app/components/ui/Badge';
import { Input } from '@/app/components/ui/Input';

export default function SessionsListPage() {
    const router = useRouter();
    const [searchQuery, setSearchQuery] = useState('');
    const [days, setDays] = useState(30);

    const { sessions, loading } = useTeachingSessions({ recent: true, days });

    const filteredSessions = sessions.filter(session => {
        const query = searchQuery.toLowerCase();
        return (
            session.subject_name?.toLowerCase().includes(query) ||
            session.cohort_name?.toLowerCase().includes(query) ||
            session.title?.toLowerCase().includes(query)
        );
    });

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    };

    return (
        <div className="space-y-6 max-w-7xl mx-auto">
            {/* CBC nav */}
            <nav className="flex gap-2 bg-white rounded-xl p-1.5 shadow-sm border border-gray-200">
                <Link
                    href="/cbc/authoring"
                    className="flex-1 text-center text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg py-2.5 transition-colors"
                >
                    Authoring
                </Link>
                <Link
                    href="/cbc/browser"
                    className="flex-1 text-center text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg py-2.5 transition-colors"
                >
                    Browser
                </Link>
                <Link
                    href="/cbc/progress"
                    className="flex-1 text-center text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg py-2.5 transition-colors"
                >
                    Progress
                </Link>
                <Link
                    href="/cbc/teaching"
                    className="flex-1 text-center text-sm font-semibold text-white bg-blue-600 rounded-lg py-2.5 shadow-sm"
                >
                    Teaching
                </Link>
            </nav>

            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link href="/cbc/teaching">
                        <button className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
                            <ArrowLeft className="h-5 w-5" />
                        </button>
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Teaching Sessions</h1>
                        <p className="text-gray-500 mt-1">View and manage your teaching history</p>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <Card className="shadow-sm">
                <div className="flex items-center gap-4 flex-wrap">
                    <div className="flex-1 min-w-[300px]">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search sessions by subject, cohort, or title..."
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Filter className="h-5 w-5 text-gray-400" />
                        <select
                            value={days}
                            onChange={(e) => setDays(Number(e.target.value))}
                            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                            <option value={7}>Last 7 days</option>
                            <option value={14}>Last 14 days</option>
                            <option value={30}>Last 30 days</option>
                            <option value={60}>Last 60 days</option>
                            <option value={90}>Last 90 days</option>
                        </select>
                    </div>
                </div>
            </Card>

            {/* Sessions List */}
            <Card className="shadow-sm">
                <div className="flex items-center justify-between mb-5">
                    <div>
                        <h2 className="text-lg font-semibold text-gray-900">Sessions</h2>
                        <p className="text-sm text-gray-500 mt-1">
                            {filteredSessions.length} session{filteredSessions.length !== 1 ? 's' : ''} found
                        </p>
                    </div>
                    <Badge variant="blue" size="md">
                        {filteredSessions.length}
                    </Badge>
                </div>

                {loading ? (
                    <div className="py-16 text-center">
                        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
                        <p className="mt-2 text-sm text-gray-500">Loading sessions...</p>
                    </div>
                ) : filteredSessions.length === 0 ? (
                    <div className="py-16 text-center">
                        <Calendar className="mx-auto h-12 w-12 text-gray-300 mb-3" />
                        <p className="text-gray-500 mb-1">No sessions found</p>
                        <p className="text-sm text-gray-400">Try adjusting your filters</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {filteredSessions.map((session) => (
                            <button
                                key={session.id}
                                onClick={() => router.push(`/cbc/teaching/sessions/${session.id}`)}
                                className="w-full flex items-center justify-between p-5 border border-gray-200 rounded-xl hover:border-blue-300 hover:bg-blue-50 transition-all text-left"
                            >
                                <div className="flex items-center gap-5 min-w-0 flex-1">
                                    <div className="p-3 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
                                        <BookOpen className="h-6 w-6 text-blue-600" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                            <h3 className="font-semibold text-gray-900 truncate">
                                                {session.subject_name || 'General Session'}
                                            </h3>
                                            <Badge variant="purple" size="sm">
                                                {formatDate(session.session_date)}
                                            </Badge>
                                        </div>
                                        <p className="text-sm text-gray-500 truncate mb-2">
                                            {session.cohort_name}
                                        </p>
                                        <div className="flex items-center gap-4">
                                            <div className="flex items-center gap-1.5 text-xs text-gray-500">
                                                <Target className="h-3.5 w-3.5" />
                                                <span>{session.outcome_links_count} outcomes</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="shrink-0 ml-4">
                                    <div className="text-right">
                                        <Badge
                                            variant={
                                                session.status === 'COMPLETED' ? 'green' :
                                                    session.status === 'ONGOING' ? 'blue' :
                                                        session.status === 'CANCELLED' ? 'red' : 'default'
                                            }
                                            size="sm"
                                        >
                                            {session.status}
                                        </Badge>
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