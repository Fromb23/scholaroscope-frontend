'use client';

// ============================================================================
// app/(dashboard)/admin/instructors/[id]/progress/page.tsx
//
// Single instructor view — all management actions live here.
// Actions: Edit, Reset Password, Toggle Active, Delete, Assign Cohorts
// ============================================================================

import { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
    ArrowLeft, Calendar, Users, TrendingUp, CheckCircle, Circle,
    ChevronDown, ChevronRight, Award, Clock, AlertCircle,
    GraduationCap, Layers, Pencil, KeyRound, Power, PowerOff,
    Trash2, BookOpen, Plus, X,
} from 'lucide-react';
import { Card } from '@/app/components/ui/Card';
import { Badge } from '@/app/components/ui/Badge';
import { Button } from '@/app/components/ui/Button';
import { Input } from '@/app/components/ui/Input';
import { StatsCard } from '@/app/components/dashboard/StatsCard';
import Modal from '@/app/components/ui/Modal';
import { instructorsAPI } from '@/app/core/api/instructors';
import { sessionAPI } from '@/app/core/api/sessions';
import { subtopicCoverageAPI } from '@/app/core/api/topics';
import { useInstructorDetail } from '@/app/core/hooks/useInstructors';
import { Session } from '@/app/core/types/session';
import { UserUpdatePayload } from '@/app/core/types/globalUsers';

// ── Edit Modal ────────────────────────────────────────────────────────────

function EditModal({ isOpen, onClose, onSubmit, instructor, submitting }: {
    isOpen: boolean; onClose: () => void;
    onSubmit: (data: UserUpdatePayload) => Promise<void>;
    instructor: any; submitting: boolean;
}) {
    const [form, setForm] = useState({
        first_name: instructor.first_name,
        last_name: instructor.last_name,
        phone: instructor.phone ?? '',
    });

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Edit Instructor" size="md">
            <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <Input label="First Name" value={form.first_name}
                        onChange={e => setForm(p => ({ ...p, first_name: e.target.value }))} />
                    <Input label="Last Name" value={form.last_name}
                        onChange={e => setForm(p => ({ ...p, last_name: e.target.value }))} />
                </div>
                <Input label="Phone" value={form.phone}
                    onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} />
                <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                    <Button variant="secondary" onClick={onClose} disabled={submitting}>Cancel</Button>
                    <Button variant="primary" onClick={() => onSubmit(form)} disabled={submitting}>
                        {submitting ? 'Saving...' : 'Save Changes'}
                    </Button>
                </div>
            </div>
        </Modal>
    );
}

// ── Reset Password Modal ──────────────────────────────────────────────────

function ResetPasswordModal({ isOpen, onClose, onSubmit, submitting }: {
    isOpen: boolean; onClose: () => void;
    onSubmit: (pw: string) => Promise<void>;
    submitting: boolean;
}) {
    const [pw, setPw] = useState('');
    const [confirm, setConfirm] = useState('');
    const [err, setErr] = useState('');

    const handleSubmit = async () => {
        if (pw.length < 8) { setErr('Minimum 8 characters'); return; }
        if (pw !== confirm) { setErr('Passwords do not match'); return; }
        setErr('');
        await onSubmit(pw);
        setPw(''); setConfirm('');
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Reset Password" size="sm">
            <div className="space-y-4">
                <Input label="New Password" type="password" value={pw}
                    onChange={e => { setPw(e.target.value); setErr(''); }} />
                <Input label="Confirm Password" type="password" value={confirm}
                    onChange={e => { setConfirm(e.target.value); setErr(''); }} error={err} />
                <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                    <Button variant="secondary" onClick={onClose} disabled={submitting}>Cancel</Button>
                    <Button variant="primary" onClick={handleSubmit} disabled={submitting}>
                        {submitting ? 'Resetting...' : 'Reset Password'}
                    </Button>
                </div>
            </div>
        </Modal>
    );
}

// ── Delete Modal ──────────────────────────────────────────────────────────

function DeleteModal({ isOpen, onClose, onConfirm, name, submitting }: {
    isOpen: boolean; onClose: () => void; onConfirm: () => Promise<void>;
    name: string; submitting: boolean;
}) {
    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Remove Instructor" size="sm">
            <div className="space-y-4">
                <div className="flex items-start gap-3 p-4 bg-red-50 rounded-lg border border-red-100">
                    <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                    <p className="text-sm text-red-700">
                        Delete <strong>{name}</strong>? Their sessions, grades, and activity records will also be removed.
                    </p>
                </div>
                <div className="flex justify-end gap-3">
                    <Button variant="secondary" onClick={onClose} disabled={submitting}>Cancel</Button>
                    <Button variant="danger" onClick={onConfirm} disabled={submitting}>
                        {submitting ? 'Deleting...' : 'Delete Instructor'}
                    </Button>
                </div>
            </div>
        </Modal>
    );
}

// ── Cohort Assign Modal ───────────────────────────────────────────────────

function CohortAssignModal({ isOpen, onClose, instructorId, instructorName }: {
    isOpen: boolean; onClose: () => void;
    instructorId: number; instructorName: string;
}) {
    const { instructor: detail, loading, assignCohort, unassignCohort } = useInstructorDetail(isOpen ? instructorId : null);
    const [cohorts, setCohorts] = useState<{ id: number; name: string; academic_year: string }[]>([]);
    const [selectedCohort, setSelectedCohort] = useState('');
    const [working, setWorking] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) instructorsAPI.getCohorts().then(setCohorts).catch(() => { });
    }, [isOpen]);

    const assignedIds = new Set((detail?.cohort_assignments ?? []).map((a: any) => a.cohort_id));
    const available = cohorts.filter(c => !assignedIds.has(c.id));

    const handleAssign = async () => {
        if (!selectedCohort) return;
        setWorking(true); setError(null);
        try { await assignCohort(Number(selectedCohort)); setSelectedCohort(''); }
        catch (err: any) { setError(err.message ?? 'Failed'); }
        finally { setWorking(false); }
    };

    const handleUnassign = async (cohortId: number) => {
        setWorking(true); setError(null);
        try { await unassignCohort(cohortId); }
        catch (err: any) { setError(err.message ?? 'Failed'); }
        finally { setWorking(false); }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Cohort Assignments — ${instructorName}`} size="md">
            <div className="space-y-5">
                {error && (
                    <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                        <AlertCircle className="h-4 w-4" />{error}
                    </div>
                )}
                <div>
                    <p className="text-sm font-semibold text-gray-700 mb-2">
                        Current Assignments ({detail?.cohort_assignments?.length ?? 0})
                    </p>
                    {loading ? (
                        <div className="h-12 flex items-center justify-center">
                            <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
                        </div>
                    ) : (detail?.cohort_assignments?.length ?? 0) === 0 ? (
                        <p className="text-sm text-gray-400 py-3 text-center bg-gray-50 rounded-lg border border-dashed border-gray-200">
                            Not assigned to any cohorts
                        </p>
                    ) : (
                        <div className="space-y-2">
                            {detail!.cohort_assignments.map((a: any) => (
                                <div key={a.cohort_id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                                    <div>
                                        <p className="text-sm font-medium text-gray-900">{a.cohort_name}</p>
                                        <p className="text-xs text-gray-500">{a.academic_year} · {a.subject_count} subjects</p>
                                    </div>
                                    <button onClick={() => handleUnassign(a.cohort_id)} disabled={working}
                                        className="p-1.5 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors">
                                        <X className="h-4 w-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                <div className="border-t border-gray-100 pt-4">
                    <p className="text-sm font-semibold text-gray-700 mb-2">Assign to Cohort</p>
                    {available.length === 0 ? (
                        <p className="text-sm text-gray-400 text-center py-2">No unassigned cohorts available</p>
                    ) : (
                        <div className="flex gap-2">
                            <select value={selectedCohort} onChange={e => setSelectedCohort(e.target.value)}
                                className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                                <option value="">Select cohort...</option>
                                {available.map(c => (
                                    <option key={c.id} value={c.id}>{c.name} ({c.academic_year})</option>
                                ))}
                            </select>
                            <Button variant="primary" onClick={handleAssign} disabled={!selectedCohort || working}>
                                <Plus className="h-4 w-4" />Assign
                            </Button>
                        </div>
                    )}
                </div>
                <div className="flex justify-end pt-2 border-t border-gray-100">
                    <Button variant="secondary" onClick={onClose}>Close</Button>
                </div>
            </div>
        </Modal>
    );
}

// ── Coverage bar ──────────────────────────────────────────────────────────

function CoverageBar({ percentage }: { percentage: number }) {
    const color =
        percentage >= 80 ? 'bg-green-500'
            : percentage >= 60 ? 'bg-blue-500'
                : percentage >= 40 ? 'bg-yellow-500'
                    : percentage > 0 ? 'bg-red-400'
                        : 'bg-gray-200';

    return (
        <div className="flex items-center gap-3">
            <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all duration-500 ${color}`}
                    style={{ width: `${Math.min(percentage, 100)}%` }} />
            </div>
            <span className="text-sm font-semibold text-gray-900 w-10 text-right">{percentage}%</span>
        </div>
    );
}

function coverageVariant(pct: number): 'success' | 'blue' | 'yellow' | 'red' | 'default' {
    if (pct >= 80) return 'success';
    if (pct >= 60) return 'blue';
    if (pct >= 40) return 'yellow';
    if (pct > 0) return 'red';
    return 'default';
}

// ── CohortSubject coverage card ───────────────────────────────────────────

function CohortSubjectCoverage({ cohortSubjectId, subjectName, cohortName }: {
    cohortSubjectId: number; subjectName: string; cohortName: string;
}) {
    const [progress, setProgress] = useState<any>(null);
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        subtopicCoverageAPI.getProgress(cohortSubjectId)
            .then(data => { if (!data.ineligible) setProgress(data); })
            .catch(() => { })
            .finally(() => setLoading(false));
    }, [cohortSubjectId]);

    if (loading) return (
        <div className="border border-gray-200 rounded-xl p-4 animate-pulse">
            <div className="h-4 bg-gray-100 rounded w-1/3 mb-3" />
            <div className="h-2 bg-gray-100 rounded" />
        </div>
    );

    if (!progress) return null;

    return (
        <div className="border border-gray-200 rounded-xl overflow-hidden">
            <button type="button" onClick={() => setOpen(v => !v)}
                className="w-full flex items-center gap-4 px-5 py-4 bg-white hover:bg-gray-50 transition-colors text-left">
                <div className="shrink-0">
                    {open ? <ChevronDown className="h-4 w-4 text-blue-600" /> : <ChevronRight className="h-4 w-4 text-gray-400" />}
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <p className="font-semibold text-gray-900 text-sm">{subjectName}</p>
                        <Badge variant="default" size="sm">{cohortName}</Badge>
                    </div>
                    <CoverageBar percentage={progress.percentage} />
                </div>
                <Badge variant={coverageVariant(progress.percentage)} size="md" className="shrink-0">
                    {progress.covered}/{progress.total}
                </Badge>
            </button>

            {open && (
                <div className="border-t border-gray-100 bg-gray-50 px-5 py-4">
                    {progress.uncovered_subtopics?.length === 0 ? (
                        <div className="flex items-center gap-2 text-green-600">
                            <CheckCircle className="h-4 w-4" />
                            <span className="text-sm font-medium">All subtopics covered</span>
                        </div>
                    ) : (
                        <>
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                                Remaining ({progress.uncovered_subtopics?.length})
                            </p>
                            <div className="space-y-1.5">
                                {progress.uncovered_subtopics?.map((s: any) => (
                                    <div key={s.id} className="flex items-center gap-2">
                                        <Circle className="h-3.5 w-3.5 text-gray-300 shrink-0" />
                                        <span className="font-mono text-xs text-gray-400">{s.code}</span>
                                        <span className="text-sm text-gray-600">{s.name}</span>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </div>
            )}
        </div>
    );
}

// ── Grouped sessions ──────────────────────────────────────────────────────

interface SessionGroup { cohortId: number; cohortName: string; sessions: any[]; }

function SessionCohortGroup({ group }: { group: SessionGroup }) {
    const [open, setOpen] = useState(false);
    const [page, setPage] = useState(1);
    const pageSize = 10;
    const totalPages = Math.ceil(group.sessions.length / pageSize);
    const paginated = group.sessions.slice((page - 1) * pageSize, page * pageSize);

    return (
        <div className="border border-gray-200 rounded-xl overflow-hidden">
            <button type="button" onClick={() => setOpen(v => !v)}
                className="w-full flex items-center gap-3 px-5 py-4 bg-white hover:bg-gray-50 transition-colors text-left">
                {open ? <ChevronDown className="h-4 w-4 text-blue-600 shrink-0" /> : <ChevronRight className="h-4 w-4 text-gray-400 shrink-0" />}
                <span className="font-semibold text-gray-900 flex-1">{group.cohortName}</span>
                <Badge variant="info" size="sm">{group.sessions.length} session{group.sessions.length !== 1 ? 's' : ''}</Badge>
            </button>

            {open && (
                <div className="border-t border-gray-100">
                    <div className="divide-y divide-gray-50">
                        {paginated.map(session => {
                            const total = session.attendance_count?.total ?? 0;
                            const present = session.attendance_count?.present ?? 0;
                            const rate = total > 0 ? Math.round((present / total) * 100) : 0;
                            return (
                                <div key={session.id} className="flex items-center gap-4 px-5 py-3 hover:bg-gray-50 transition-colors">
                                    <div className="w-20 shrink-0">
                                        <span className="text-xs font-medium text-gray-500">
                                            {new Date(session.session_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                                        </span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-gray-900 truncate">{session.title || session.subject_name}</p>
                                        <p className="text-xs text-gray-400">{session.subject_name}</p>
                                    </div>
                                    <Badge variant={rate >= 80 ? 'success' : rate >= 60 ? 'blue' : rate > 0 ? 'yellow' : 'default'} size="sm" className="shrink-0">
                                        {total > 0 ? `${rate}%` : 'Unmarked'}
                                    </Badge>
                                    <Link href={`/sessions/${session.id}`} className="shrink-0">
                                        <Button size="sm" variant="ghost">View</Button>
                                    </Link>
                                </div>
                            );
                        })}
                    </div>

                    {totalPages > 1 && (
                        <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 bg-gray-50">
                            <span className="text-xs text-gray-500">Page {page} of {totalPages}</span>
                            <div className="flex gap-2">
                                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                                    className="px-3 py-1 text-xs rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-white transition-colors">Prev</button>
                                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                                    className="px-3 py-1 text-xs rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-white transition-colors">Next</button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

function GroupedSessions({ sessions }: { sessions: any[] }) {
    const groups = useMemo<SessionGroup[]>(() => {
        const map = new Map<number, SessionGroup>();
        sessions.forEach(s => {
            if (!map.has(s.cohort_id)) map.set(s.cohort_id, { cohortId: s.cohort_id, cohortName: s.cohort_name, sessions: [] });
            map.get(s.cohort_id)!.sessions.push(s);
        });
        map.forEach(g => g.sessions.sort((a, b) => new Date(b.session_date).getTime() - new Date(a.session_date).getTime()));
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
            {groups.map(group => <SessionCohortGroup key={group.cohortId} group={group} />)}
        </div>
    );
}

// ── Page ──────────────────────────────────────────────────────────────────

export default function InstructorProgressPage() {
    const params = useParams();
    const router = useRouter();
    const instructorId = Number(params.id);

    const [instructor, setInstructor] = useState<any>(null);
    const [sessions, setSessions] = useState<Session[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

    // Modal state
    const [editOpen, setEditOpen] = useState(false);
    const [resetOpen, setResetOpen] = useState(false);
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [cohortOpen, setCohortOpen] = useState(false);

    const flash = (type: 'success' | 'error', msg: string) => {
        setFeedback({ type, msg });
        setTimeout(() => setFeedback(null), 3000);
    };

    const load = async () => {
        setLoading(true);
        try {
            const instructorData = await instructorsAPI.getById(instructorId);
            setInstructor(instructorData);
            const sessionsData = await sessionAPI.getAll({ created_by: instructorData.email });
            const allSessions = Array.isArray(sessionsData) ? sessionsData : (sessionsData as any)?.results ?? [];
            setSessions(allSessions);
        } catch (err) {
            console.error('Failed to load instructor', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, [instructorId]);

    // ── Action handlers ───────────────────────────────────────────────────

    const handleEdit = async (data: UserUpdatePayload) => {
        setSubmitting(true);
        try {
            await instructorsAPI.update(instructorId, data);
            setEditOpen(false);
            await load();
            flash('success', 'Instructor updated');
        } catch { flash('error', 'Failed to update instructor'); }
        finally { setSubmitting(false); }
    };

    const handleResetPw = async (password: string) => {
        setSubmitting(true);
        try {
            await instructorsAPI.resetPassword(instructorId, password);
            setResetOpen(false);
            flash('success', 'Password reset successfully');
        } catch { flash('error', 'Failed to reset password'); }
        finally { setSubmitting(false); }
    };

    const handleToggle = async () => {
        try {
            await instructorsAPI.update(instructorId, { is_active: !instructor.is_active });
            await load();
            flash('success', `Instructor ${instructor.is_active ? 'deactivated' : 'activated'}`);
        } catch { flash('error', 'Failed to update status'); }
    };

    const handleDelete = async () => {
        setSubmitting(true);
        try {
            await instructorsAPI.delete(instructorId);
            router.push('/admin/instructors');
        } catch { flash('error', 'Failed to delete instructor'); }
        finally { setSubmitting(false); }
    };

    // ── Derived data ──────────────────────────────────────────────────────

    const cohortSubjects = useMemo(() => {
        if (!instructor?.cohort_assignments) return [];
        const seen = new Set<number>();
        const result: { cohortSubjectId: number; subjectName: string; cohortName: string; isCBC: boolean }[] = [];
        instructor.cohort_assignments.forEach((a: any) => {
            (a.subjects ?? []).forEach((cs: any) => {
                if (!seen.has(cs.cohort_subject_id)) {
                    seen.add(cs.cohort_subject_id);
                    result.push({ cohortSubjectId: cs.cohort_subject_id, subjectName: cs.subject_name, cohortName: a.cohort_name, isCBC: a.is_cbc ?? false });
                }
            });
        });
        return result;
    }, [instructor]);

    const nonCBCSubjects = cohortSubjects.filter(cs => !cs.isCBC);
    const cbcCohorts = useMemo(() => instructor?.cohort_assignments?.filter((a: any) => a.is_cbc) ?? [], [instructor]);

    const sessionStats = useMemo(() => {
        const now = new Date();
        return {
            total: sessions.length,
            thisMonth: sessions.filter(s => {
                const d = new Date(s.session_date);
                return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
            }).length,
        };
    }, [sessions]);

    const attendanceStats = useMemo(() => {
        let total = 0, present = 0, absent = 0, late = 0;
        sessions.forEach((s: any) => {
            total += s.attendance_count?.total ?? 0;
            present += s.attendance_count?.present ?? 0;
            absent += s.attendance_count?.absent ?? 0;
            late += s.attendance_count?.late ?? 0;
        });
        return { total, present, absent, late, rate: total > 0 ? Math.round((present / total) * 100) : 0 };
    }, [sessions]);

    if (loading) return (
        <div className="flex items-center justify-center h-64">
            <div className="text-center">
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent mx-auto" />
                <p className="mt-3 text-sm text-gray-500">Loading...</p>
            </div>
        </div>
    );

    if (!instructor) return (
        <div className="flex items-center justify-center h-64">
            <div className="text-center">
                <AlertCircle className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-500">Instructor not found</p>
                <Link href="/admin/instructors"><Button variant="secondary" className="mt-3">Back</Button></Link>
            </div>
        </div>
    );

    return (
        <div className="space-y-6 max-w-5xl mx-auto">

            {/* Back */}
            <Link href="/admin/instructors">
                <Button variant="ghost" size="sm">
                    <ArrowLeft className="h-4 w-4 mr-2" />Back to Instructors
                </Button>
            </Link>

            {/* Feedback */}
            {feedback && (
                <div className={`flex items-center gap-2 p-3 rounded-lg text-sm border ${feedback.type === 'success'
                    ? 'bg-green-50 border-green-200 text-green-700'
                    : 'bg-red-50 border-red-200 text-red-700'
                    }`}>
                    {feedback.type === 'success'
                        ? <CheckCircle className="h-4 w-4 shrink-0" />
                        : <AlertCircle className="h-4 w-4 shrink-0" />
                    }
                    {feedback.msg}
                </div>
            )}

            {/* Header — name + all actions */}
            <div className="flex items-start gap-5">
                <div className="h-16 w-16 rounded-2xl bg-blue-100 flex items-center justify-center text-xl font-bold text-blue-700 shrink-0">
                    {instructor.first_name?.charAt(0)}{instructor.last_name?.charAt(0)}
                </div>
                <div className="flex-1">
                    <div className="flex items-center gap-3 flex-wrap">
                        <h1 className="text-2xl font-bold text-gray-900">{instructor.full_name}</h1>
                        <Badge variant={instructor.is_active ? 'success' : 'danger'}>
                            {instructor.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                    </div>
                    <p className="text-gray-500 text-sm mt-1">{instructor.email}</p>
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                        {instructor.cohort_assignments?.length === 0 && (
                            <span className="text-xs text-gray-400 italic">No cohorts assigned</span>
                        )}
                        {instructor.cohort_assignments?.map((a: any) => (
                            <Badge key={a.cohort_id} variant="info" size="sm">
                                <GraduationCap className="h-3 w-3 mr-1 inline" />{a.cohort_name}
                            </Badge>
                        ))}
                    </div>
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                    <Button size="sm" variant="secondary" onClick={() => setEditOpen(true)}>
                        <Pencil className="h-3.5 w-3.5 mr-1" />Edit
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => setCohortOpen(true)}>
                        <BookOpen className="h-3.5 w-3.5 mr-1" />Cohorts
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => setResetOpen(true)}>
                        <KeyRound className="h-3.5 w-3.5 mr-1" />Password
                    </Button>
                    <Button
                        size="sm"
                        variant="secondary"
                        onClick={handleToggle}
                        className={instructor.is_active ? 'text-orange-600 hover:bg-orange-50' : 'text-green-600 hover:bg-green-50'}
                    >
                        {instructor.is_active
                            ? <><PowerOff className="h-3.5 w-3.5 mr-1" />Deactivate</>
                            : <><Power className="h-3.5 w-3.5 mr-1" />Activate</>
                        }
                    </Button>
                    <Button size="sm" variant="danger" onClick={() => setDeleteOpen(true)}>
                        <Trash2 className="h-3.5 w-3.5 mr-1" />Delete
                    </Button>
                </div>
            </div>

            {/* Quick stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatsCard title="Total Sessions" value={sessionStats.total} icon={Calendar} color="blue" />
                <StatsCard title="This Month" value={sessionStats.thisMonth} icon={Clock} color="purple" />
                <StatsCard title="Avg Attendance" value={`${attendanceStats.rate}%`} icon={Users} color="green" />
                <StatsCard title="Cohorts" value={instructor.cohort_assignments?.length ?? 0} icon={GraduationCap} color="orange" />
            </div>

            {/* Attendance */}
            <Card>
                <div className="p-6">
                    <div className="flex items-center gap-2 mb-4">
                        <Users className="h-5 w-5 text-blue-500" />
                        <h2 className="text-lg font-semibold text-gray-900">Attendance Overview</h2>
                        <span className="text-sm text-gray-400">across all sessions</span>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {[
                            { label: 'Total Records', value: attendanceStats.total, color: 'text-gray-900' },
                            { label: 'Present', value: attendanceStats.present, color: 'text-green-600' },
                            { label: 'Absent', value: attendanceStats.absent, color: 'text-red-600' },
                            { label: 'Late', value: attendanceStats.late, color: 'text-yellow-600' },
                        ].map(stat => (
                            <div key={stat.label} className="bg-gray-50 rounded-xl p-4 text-center">
                                <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                                <p className="text-xs text-gray-500 mt-1">{stat.label}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </Card>

            {/* Topic coverage */}
            {nonCBCSubjects.length > 0 && (
                <Card>
                    <div className="p-6">
                        <div className="flex items-center gap-2 mb-5">
                            <Layers className="h-5 w-5 text-blue-500" />
                            <h2 className="text-lg font-semibold text-gray-900">Topic Coverage</h2>
                            <Badge variant="info" size="sm">{nonCBCSubjects.length} subjects</Badge>
                        </div>
                        <div className="space-y-3">
                            {nonCBCSubjects.map(cs => (
                                <CohortSubjectCoverage key={cs.cohortSubjectId}
                                    cohortSubjectId={cs.cohortSubjectId}
                                    subjectName={cs.subjectName}
                                    cohortName={cs.cohortName}
                                />
                            ))}
                        </div>
                    </div>
                </Card>
            )}

            {/* CBC progress */}
            {cbcCohorts.length > 0 && (
                <Card>
                    <div className="p-6">
                        <div className="flex items-center gap-2 mb-4">
                            <Award className="h-5 w-5 text-purple-500" />
                            <h2 className="text-lg font-semibold text-gray-900">CBC Outcome Progress</h2>
                        </div>
                        <div className="space-y-3">
                            {cbcCohorts.map((a: any) => (
                                <div key={a.cohort_id} className="flex items-center justify-between p-4 border border-gray-200 rounded-xl">
                                    <div>
                                        <p className="font-medium text-gray-900">{a.cohort_name}</p>
                                        <p className="text-xs text-gray-500">{a.academic_year}</p>
                                    </div>
                                    <Link href={`/cbc/progress/cohort/${a.cohort_id}`}>
                                        <Button size="sm" variant="ghost">
                                            <TrendingUp className="h-3.5 w-3.5 mr-1" />View Progress
                                        </Button>
                                    </Link>
                                </div>
                            ))}
                        </div>
                    </div>
                </Card>
            )}

            {/* Sessions */}
            <Card>
                <div className="p-6">
                    <div className="flex items-center gap-2 mb-4">
                        <Calendar className="h-5 w-5 text-blue-500" />
                        <h2 className="text-lg font-semibold text-gray-900">Sessions</h2>
                        <Badge variant="info" size="sm">{sessions.length} total</Badge>
                    </div>
                    <GroupedSessions sessions={sessions} />
                </div>
            </Card>

            {/* Modals */}
            {editOpen && (
                <EditModal isOpen={editOpen} onClose={() => setEditOpen(false)}
                    onSubmit={handleEdit} instructor={instructor} submitting={submitting} />
            )}
            <ResetPasswordModal isOpen={resetOpen} onClose={() => setResetOpen(false)}
                onSubmit={handleResetPw} submitting={submitting} />
            <DeleteModal isOpen={deleteOpen} onClose={() => setDeleteOpen(false)}
                onConfirm={handleDelete} name={instructor.full_name} submitting={submitting} />
            <CohortAssignModal isOpen={cohortOpen} onClose={() => setCohortOpen(false)}
                instructorId={instructorId} instructorName={instructor.full_name} />
        </div>
    );
}