'use client';

// ============================================================================
// app/(dashboard)/sessions/[id]/page.tsx
//
// Responsibility: fetch data via hooks, compose components, render.
// No logic. No API calls. No transformations.
// ============================================================================

import { useState, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { Calendar, Clock, MapPin, Edit, AlertCircle, Layers, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Card } from '@/app/components/ui/Card';
import { Button } from '@/app/components/ui/Button';
import { Badge } from '@/app/components/ui/Badge';
import { LoadingSpinner } from '@/app/components/ui/LoadingSpinner';
import { AttendanceStatsStrip } from '@/app/core/components/sessions/AttendanceStats';
import { AttendanceTable } from '@/app/core/components/sessions/AttendanceTable';
import { ParticipatingCohorts } from '@/app/core/components/sessions/ParticipatingCohorts';
import { SessionSubtopicLinker } from '@/app/core/components/sessions/SessionSubtopicLinker';
import { useSessionDetail, useSessionCohorts } from '@/app/core/hooks/useSessions';
import { useAttendanceDraft } from '@/app/core/hooks/useAttendanceDraft';
import { calcAttendanceStats } from '@/app/utils/sessionUtils';

export default function SessionDetailPage() {
    const params = useParams();
    const sessionId = Number(params.id);

    const [searchQuery, setSearchQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);

    const {
        session,
        attendanceRecords,
        pagination,
        loading,
        markAttendance,
        refetch,
        startSession,
        completeSession,
    } = useSessionDetail(sessionId, searchQuery, currentPage, pageSize);

    const { activeCohorts, historicalCohorts } = useSessionCohorts(sessionId);

    const isHistorical = session ? !session.is_current_year : false;
    const isCBC = session?.curriculum_type === 'CBE';
    const sessionStatus = session?.status ?? 'SCHEDULED';
    const isCompleted = sessionStatus === 'COMPLETED';
    const isInProgress = sessionStatus === 'IN_PROGRESS';
    const isScheduled = sessionStatus === 'SCHEDULED';
    const isReadOnly = isHistorical || isCompleted;
    const isMerged = useMemo(
        () => (activeCohorts?.length ?? 0) + (historicalCohorts?.length ?? 0) > 1,
        [activeCohorts, historicalCohorts]
    );

    const attendanceStats = useMemo(
        () => calcAttendanceStats(attendanceRecords),
        [attendanceRecords]
    );

    const {
        draft,
        saving, saveError, dismissError,
        updateStatus, updateNotes, markAll, save,
    } = useAttendanceDraft({
        records: attendanceRecords,
        onSave: markAttendance,
        readOnly: isHistorical,
    });

    // ── Guards ────────────────────────────────────────────────────────────

    if (loading && !session) return <LoadingSpinner />;
    if (!session) return <div className="p-10 text-gray-500">Session not found.</div>;

    // ── Render ────────────────────────────────────────────────────────────

    return (
        <div className="space-y-6">

            {/* Header */}
            <div className="space-y-3">
                {/* Back */}
                <Link href="/sessions">
                    <Button variant="ghost" size="sm">
                        <ArrowLeft className="mr-2 h-4 w-4" />Back
                    </Button>
                </Link>

                {/* Title + badges */}
                <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                        <h1 className="text-xl font-semibold flex items-center gap-2 flex-wrap">
                            <span className="truncate">{session.subject_name}</span>
                            {isMerged && (
                                <Badge variant="purple">
                                    <Layers className="w-3 h-3 mr-1" />Multi-cohort
                                </Badge>
                            )}
                            {isHistorical && <Badge variant="default">Historical</Badge>}
                        </h1>
                        <p className="text-gray-500 text-sm mt-0.5">{session.term_name}</p>
                    </div>

                    {/* Status badge — desktop inline, mobile below */}
                    <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                        <Badge variant="blue">{session.session_type_display}</Badge>
                        {isScheduled && <Badge variant="default">Scheduled</Badge>}
                        {isInProgress && <Badge variant="yellow">In Progress</Badge>}
                        {isCompleted && <Badge variant="green">Completed</Badge>}
                    </div>
                </div>

                {/* Action buttons — own row so they never overflow */}
                {!isHistorical && (
                    <div className="flex items-center gap-2 flex-wrap">
                        {isScheduled && (
                            <Button variant="secondary" size="sm" onClick={async () => { await startSession(); }}>
                                Start Session
                            </Button>
                        )}
                        {isInProgress && (
                            <Button variant="primary" size="sm" onClick={async () => { await completeSession(); }}>
                                Complete Session
                            </Button>
                        )}
                        {!isCompleted && (
                            <Link href={`/sessions/${session.id}/edit`}>
                                <Button variant="secondary" size="sm">
                                    <Edit className="h-4 w-4 mr-1.5" />Edit
                                </Button>
                            </Link>
                        )}
                    </div>
                )}
            </div>

            {/* Historical notice */}
            {isHistorical && (
                <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-700">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    This session is from a past academic year. Attendance records are read-only.
                </div>
            )}

            {/* Session info */}
            <Card>
                <div className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="flex items-center gap-2 text-sm text-gray-700">
                        <Calendar className="h-4 w-4 text-gray-400 shrink-0" />
                        {session.session_date}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-700">
                        <Clock className="h-4 w-4 text-gray-400 shrink-0" />
                        {session.start_time} – {session.end_time}
                    </div>
                    {session.venue && (
                        <div className="flex items-center gap-2 text-sm text-gray-700">
                            <MapPin className="h-4 w-4 text-gray-400 shrink-0" />
                            {session.venue}
                        </div>
                    )}
                </div>
            </Card>

            {/* rest unchanged */}
            <ParticipatingCohorts
                sessionId={sessionId}
                sessionSubjectId={session.cohort_subject}
                primaryCohortId={session.cohort_id}
                isHistorical={isHistorical}
            />

            <AttendanceStatsStrip stats={attendanceStats} />

            <Card>
                <div className="p-5">
                    <AttendanceTable
                        records={attendanceRecords}
                        draft={draft}
                        loading={loading}
                        saving={saving}
                        saveError={saveError}
                        pagination={pagination}
                        onUpdateStatus={updateStatus}
                        onUpdateNotes={updateNotes}
                        onMarkAll={markAll}
                        readOnly={isReadOnly}
                        onSave={async () => { await save(); refetch(); }}
                        onDismissError={dismissError}
                        onSearch={q => { setSearchQuery(q); setCurrentPage(1); }}
                        onPaginationChange={(p, ps) => { setCurrentPage(p); setPageSize(ps); }}
                    />
                </div>
            </Card>

            {!isCBC && session.cohort_subject && (
                <Card>
                    <div className="p-5">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-semibold text-gray-900">Subtopics</h2>
                            <p className="text-xs text-gray-400">Track what content was covered</p>
                        </div>
                        <SessionSubtopicLinker
                            sessionId={session.id}
                            subjectId={session.subject_id}
                            readOnly={isReadOnly}
                        />
                    </div>
                </Card>
            )}
        </div>
    );
}