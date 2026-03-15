'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams } from 'next/navigation';
import {
    Calendar, Clock, MapPin, Save, ArrowLeft,
    Users, Layers, Edit, AlertCircle, X,
} from 'lucide-react';
import Link from 'next/link';
import { Card } from '@/app/components/ui/Card';
import { Button } from '@/app/components/ui/Button';
import { Badge } from '@/app/components/ui/Badge';
import { DataTable, Column } from '@/app/components/ui/Table';
import { AttendanceRecord } from '@/app/core/types/session';
import { useSessionDetail, useSessionCohorts } from '@/app/core/hooks/useSessions';
import { ParticipatingCohorts } from '@/app/core/components/sessions/ParticipatingCohorts';
import { SessionSubtopicLinker } from '@/app/core/components/sessions/SessionSubtopicLinker';

// ── Error banner ──────────────────────────────────────────────────────────

function ErrorBanner({ message, onDismiss }: { message: string; onDismiss: () => void }) {
    return (
        <div className="flex items-start gap-3 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span className="flex-1">{message}</span>
            <button onClick={onDismiss} className="text-red-400 hover:text-red-600">
                <X className="h-4 w-4" />
            </button>
        </div>
    );
}

// ── Page ──────────────────────────────────────────────────────────────────

export default function SessionDetailPage() {
    const params = useParams();
    const sessionId = Number(params.id);

    const [searchQuery, setSearchQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [attendanceDraft, setAttendanceDraft] = useState<
        Record<number, { status: string; notes: string }>
    >({});
    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);

    const {
        session,
        attendanceRecords,
        pagination,
        loading,
        markAttendance,
        refetch,
    } = useSessionDetail(sessionId, searchQuery, currentPage, pageSize);

    const { activeCohorts, historicalCohorts } = useSessionCohorts(sessionId);

    // Past-year session — attendance and links are read-only
    // Derived from the cohort's academic year via session data
    const isHistorical = session ? !session.is_current_year : false;

    // Initialize attendance draft when records load
    useEffect(() => {
        if (!attendanceRecords) return;
        const draft: Record<number, { status: string; notes: string }> = {};
        attendanceRecords.forEach(r => {
            draft[r.student] = {
                status: r.status ?? '',
                notes: r.notes ?? '',
            };
        });
        setAttendanceDraft(draft);
    }, [attendanceRecords]);

    // ── Stats ─────────────────────────────────────────────────────────────

    const attendanceStats = useMemo(() => {
        if (!attendanceRecords) return null;
        const total = attendanceRecords.length;
        const present = attendanceRecords.filter(r => r.status === 'PRESENT').length;
        const absent = attendanceRecords.filter(r => r.status === 'ABSENT').length;
        const late = attendanceRecords.filter(r => r.status === 'LATE').length;
        const excused = attendanceRecords.filter(r => r.status === 'EXCUSED').length;
        const sick = attendanceRecords.filter(r => r.status === 'SICK').length;
        const unmarked = attendanceRecords.filter(r => !r.status).length;
        const attendancePercent = total > 0 ? Math.round((present / total) * 100) : 0;
        return { total, present, absent, late, excused, sick, unmarked, attendancePercent };
    }, [attendanceRecords]);

    const isMerged = useMemo(
        () => (activeCohorts?.length || 0) + (historicalCohorts?.length || 0) > 1,
        [activeCohorts, historicalCohorts]
    );

    // ── Handlers ─────────────────────────────────────────────────────────

    const updateStatus = (studentId: number, status: string) => {
        setAttendanceDraft(prev => ({
            ...prev,
            [studentId]: { ...prev[studentId], status },
        }));
    };

    const updateNotes = (studentId: number, notes: string) => {
        setAttendanceDraft(prev => ({
            ...prev,
            [studentId]: { ...prev[studentId], notes },
        }));
    };

    const markAll = (status: string) => {
        const draft: Record<number, { status: string; notes: string }> = {};
        attendanceRecords.forEach(r => {
            draft[r.student] = { status, notes: attendanceDraft[r.student]?.notes || '' };
        });
        setAttendanceDraft(draft);
    };

    const saveAttendance = async () => {
        if (!session) return;
        setSaving(true);
        setSaveError(null);
        try {
            const payload = Object.entries(attendanceDraft).map(([studentId, data]) => ({
                student_id: Number(studentId),
                status: data.status || '',
                notes: data.notes || '',
            }));
            // marked_by derived from auth token on backend — do not send
            await markAttendance({ attendance_records: payload });
            refetch();
        } catch (err: any) {
            const detail = err?.response?.data?.detail ?? err?.message;
            setSaveError(
                typeof detail === 'string' ? detail : 'Failed to save attendance.'
            );
        } finally {
            setSaving(false);
        }
    };

    // ── Table columns ─────────────────────────────────────────────────────

    type AttendanceWithIndex = { [key: string]: unknown } & AttendanceRecord;

    const columns: Column<AttendanceRecord>[] = [
        {
            key: 'student_name',
            header: 'Learner',
            render: r => (
                <div>
                    <Link
                        href={`/learners/${r.student}`}
                        className="font-medium text-blue-600 hover:underline"
                    >
                        {r.student_name}
                    </Link>
                    <div className="text-xs text-gray-500">{r.student_admission}</div>
                </div>
            ),
        },
        {
            key: 'status',
            header: 'Status',
            render: r => (
                <div className="flex gap-1.5 flex-wrap">
                    {['PRESENT', 'ABSENT', 'LATE', 'EXCUSED', 'SICK'].map(s => (
                        <button
                            key={s}
                            onClick={() => !isHistorical && updateStatus(r.student, s)}
                            disabled={isHistorical}
                            className={`px-2.5 py-1.5 text-xs rounded-lg border transition-colors ${attendanceDraft[r.student]?.status === s
                                ? 'border-gray-900 bg-gray-900 text-white'
                                : 'border-gray-200 hover:border-gray-400'
                                } ${isHistorical ? 'opacity-60 cursor-not-allowed' : ''}`}
                        >
                            {s}
                        </button>
                    ))}
                </div>
            ),
        },
        {
            key: 'notes',
            header: 'Notes',
            render: r => (
                <input
                    value={attendanceDraft[r.student]?.notes || ''}
                    onChange={e => updateNotes(r.student, e.target.value)}
                    disabled={isHistorical}
                    className={`border rounded-lg px-3 py-1.5 text-sm w-full ${isHistorical ? 'bg-gray-50 text-gray-400 cursor-not-allowed' : ''
                        }`}
                    placeholder="Optional note..."
                />
            ),
        },
    ];

    // ── Guards ────────────────────────────────────────────────────────────

    if (loading && !session) {
        return <div className="p-10 text-gray-500">Loading session…</div>;
    }

    if (!session || !attendanceStats) {
        return <div className="p-10 text-gray-500">Session not found.</div>;
    }

    const isCBC = session.curriculum_type === 'CBE';

    // ── Render ────────────────────────────────────────────────────────────

    return (
        <div className="space-y-6">

            {/* Header */}
            <div className="flex justify-between items-start">
                <div>
                    <Link href="/sessions">
                        <Button variant="ghost" size="sm">
                            <ArrowLeft className="mr-2 h-4 w-4" />Back
                        </Button>
                    </Link>
                    <h1 className="text-2xl font-semibold mt-2 flex items-center gap-2">
                        {session.subject_name}
                        {isMerged && (
                            <Badge variant="purple">
                                <Layers className="w-3 h-3 mr-1" />Multi-cohort
                            </Badge>
                        )}
                        {isHistorical && (
                            <Badge variant="default">Historical</Badge>
                        )}
                    </h1>
                    <p className="text-gray-500">{session.term_name}</p>
                </div>

                <div className="flex items-center gap-2">
                    <Badge variant="blue">{session.session_type_display}</Badge>
                    {/* Edit button — hidden for historical sessions */}
                    {!isHistorical && (
                        <Link href={`/sessions/${session.id}/edit`}>
                            <Button variant="secondary" size="sm">
                                <Edit className="h-4 w-4 mr-1.5" />Edit
                            </Button>
                        </Link>
                    )}
                </div>
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
                <div className="p-5 grid md:grid-cols-3 gap-4">
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

            {/* Participating cohorts — compact dropdown */}
            <ParticipatingCohorts
                sessionId={sessionId}
                sessionSubjectId={session.cohort_subject}
                primaryCohortId={session.cohort_id}
                isHistorical={isHistorical}
            />

            {/* Attendance stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: 'Recorded', value: attendanceStats.total, color: 'text-gray-900' },
                    { label: 'Present', value: attendanceStats.present, color: 'text-green-600' },
                    { label: 'Absent', value: attendanceStats.absent, color: 'text-red-600' },
                    { label: 'Rate', value: `${attendanceStats.attendancePercent}%`, color: 'text-blue-600' },
                ].map(stat => (
                    <Card key={stat.label}>
                        <div className="p-4">
                            <p className="text-xs text-gray-500">{stat.label}</p>
                            <p className={`text-2xl font-semibold mt-1 ${stat.color}`}>
                                {stat.value}
                            </p>
                        </div>
                    </Card>
                ))}
            </div>

            {/* Attendance table */}
            <Card>
                <div className="p-5 space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="font-semibold text-gray-900">
                            {isHistorical ? 'Attendance Records' : 'Mark Attendance'}
                        </h2>
                        {!isHistorical && (
                            <Button onClick={saveAttendance} disabled={saving}>
                                <Save className="mr-2 h-4 w-4" />
                                {saving ? 'Saving...' : 'Save'}
                            </Button>
                        )}
                    </div>

                    {saveError && (
                        <ErrorBanner
                            message={saveError}
                            onDismiss={() => setSaveError(null)}
                        />
                    )}

                    {!isHistorical && (
                        <div className="flex gap-2">
                            <Button size="sm" variant="secondary" onClick={() => markAll('PRESENT')}>
                                Mark all present
                            </Button>
                            <Button size="sm" variant="secondary" onClick={() => markAll('ABSENT')}>
                                Mark all absent
                            </Button>
                        </div>
                    )}

                    <DataTable
                        data={attendanceRecords as AttendanceWithIndex[]}
                        columns={columns}
                        loading={loading}
                        enableSearch
                        onSearch={q => { setSearchQuery(q); setCurrentPage(1); }}
                        pagination={pagination}
                        onPaginationChange={(p, ps) => { setCurrentPage(p); setPageSize(ps); }}
                    />
                </div>
            </Card>

            {/* Subtopics — non-CBC only */}
            {!isCBC && session.cohort_subject && (
                <Card>
                    <div className="p-5">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-semibold text-gray-900">Subtopics</h2>
                            <p className="text-xs text-gray-400">
                                Track what content was covered
                            </p>
                        </div>
                        <SessionSubtopicLinker
                            sessionId={session.id}
                            subjectId={session.subject_id}
                            readOnly={isHistorical || session.status === 'COMPLETED'}
                        />
                    </div>
                </Card>
            )}
        </div>
    );
}