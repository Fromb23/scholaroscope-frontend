'use client';

// ============================================================================
// app/core/components/instructors/InstructorProgressComponents.tsx
//
// Supporting components for the instructor detail page.
// No any. Typed props.
// ============================================================================

import { useState, useMemo } from 'react';
import Link from 'next/link';
import {
    Calendar, ChevronDown, ChevronRight,
} from 'lucide-react';
import { Badge } from '@/app/components/ui/Badge';
import { Button } from '@/app/components/ui/Button';
import type { Session } from '@/app/core/types/session';

// ── SessionCohortGroup ────────────────────────────────────────────────────

interface SessionGroup {
    cohortId: number;
    cohortName: string;
    sessions: Session[];
}

function attendanceVariant(rate: number): 'success' | 'blue' | 'yellow' | 'default' {
    if (rate >= 80) return 'success';
    if (rate >= 60) return 'blue';
    if (rate > 0) return 'yellow';
    return 'default';
}

function SessionCohortGroup({ group }: { group: SessionGroup }) {
    const [open, setOpen] = useState(false);
    const [page, setPage] = useState(1);
    const pageSize = 10;
    const totalPages = Math.ceil(group.sessions.length / pageSize);
    const paginated = group.sessions.slice((page - 1) * pageSize, page * pageSize);

    return (
        <div className="border border-gray-200 rounded-xl overflow-hidden">
            <button
                type="button"
                onClick={() => setOpen(v => !v)}
                className="w-full flex items-center gap-3 px-4 py-3 bg-white hover:bg-gray-50 transition-colors text-left"
            >
                {open
                    ? <ChevronDown className="h-4 w-4 text-blue-600 shrink-0" />
                    : <ChevronRight className="h-4 w-4 text-gray-400 shrink-0" />
                }
                <span className="font-semibold text-gray-900 flex-1 min-w-0 truncate">
                    {group.cohortName}
                </span>
                <Badge variant="info" size="sm" className="shrink-0 ml-auto">
                    {group.sessions.length} session{group.sessions.length !== 1 ? 's' : ''}
                </Badge>
            </button>

            {open && (
                <div className="border-t border-gray-100 overflow-x-auto">
                    <div className="min-w-[480px]">  {/* prevents shrinking below this width */}
                        <div className="divide-y divide-gray-50">
                            {paginated.map(session => {
                                const total = session.attendance_count?.total ?? 0;
                                const present = session.attendance_count?.present ?? 0;
                                const rate = total > 0 ? Math.round((present / total) * 100) : 0;
                                return (
                                    <div key={session.id} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors">
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-gray-900 truncate">
                                                {session.title || session.subject_name}
                                            </p>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <span className="text-xs text-gray-400">{session.subject_name}</span>
                                                <span className="text-xs text-gray-300">·</span>
                                                <span className="text-xs text-gray-400 shrink-0">
                                                    {new Date(session.session_date).toLocaleDateString('en-GB', {
                                                        day: '2-digit', month: 'short',
                                                    })}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0">
                                            <Badge variant={attendanceVariant(rate)} size="sm">
                                                {total > 0 ? `${rate}%` : 'Unmarked'}
                                            </Badge>
                                            <Link href={`/sessions/${session.id}`}>
                                                <Button size="sm" variant="ghost">View</Button>
                                            </Link>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {totalPages > 1 && (
                            <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 bg-gray-50">
                                <span className="text-xs text-gray-500">Page {page} of {totalPages}</span>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setPage(p => Math.max(1, p - 1))}
                                        disabled={page === 1}
                                        className="px-3 py-1 text-xs rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-white transition-colors"
                                    >Prev</button>
                                    <button
                                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                        disabled={page === totalPages}
                                        className="px-3 py-1 text-xs rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-white transition-colors"
                                    >Next</button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

// ── GroupedSessions ───────────────────────────────────────────────────────

interface GroupedSessionsProps {
    sessions: Session[];
}

export function GroupedSessions({ sessions }: GroupedSessionsProps) {
    const groups = useMemo<SessionGroup[]>(() => {
        const map = new Map<number, SessionGroup>();
        sessions.forEach(s => {
            const cohortId = s.cohort_id ?? 0;
            const cohortName = s.cohort_name ?? 'Unknown Cohort';
            if (!map.has(cohortId)) {
                map.set(cohortId, { cohortId, cohortName, sessions: [] });
            }
            map.get(cohortId)!.sessions.push(s);
        });
        map.forEach(g => g.sessions.sort(
            (a, b) => new Date(b.session_date).getTime() - new Date(a.session_date).getTime()
        ));
        return Array.from(map.values());
    }, [sessions]);

    if (sessions.length === 0) return (
        <div className="py-10 text-center border border-dashed border-gray-200 rounded-xl">
            <Calendar className="h-8 w-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500">No sessions recorded yet</p>
        </div>
    );

    return (
        <div className="space-y-3">
            {groups.map(group => (
                <SessionCohortGroup key={group.cohortId} group={group} />
            ))}
        </div>
    );
}
