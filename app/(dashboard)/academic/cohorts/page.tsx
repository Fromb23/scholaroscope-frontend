'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import {
    Users, Plus, Edit, Trash2, GraduationCap, BookOpen,
    ChevronDown, ChevronRight, X, Check, AlertCircle,
    History, RotateCcw, Eye,
} from 'lucide-react';
import { useCohorts, useAcademicYears, useCurricula, useSubjects } from '@/app/core/hooks/useAcademic';
import { cohortAPI } from '@/app/core/api/academic';
import { Card } from '@/app/components/ui/Card';
import { Button } from '@/app/components/ui/Button';
import { Badge } from '@/app/components/ui/Badge';
import { DataTable, Column } from '@/app/components/ui/Table';
import Modal from '@/app/components/ui/Modal';
import { Input } from '@/app/components/ui/Input';
import { Select } from '@/app/components/ui/Select';
import { StatsCard } from '@/app/components/dashboard/StatsCard';
import { Cohort, CohortDetail } from '@/app/core/types/academic';

type CohortWithIndex = { [key: string]: unknown } & Cohort;

// ── Inline error banner ───────────────────────────────────────────────────

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

// ── Subject management panel ──────────────────────────────────────────────

function SubjectPanel({ cohortId, curriculumId, isHistorical }: {
    cohortId: number;
    curriculumId: number;
    isHistorical: boolean;
}) {
    const [detail, setDetail] = useState<CohortDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [working, setWorking] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const { subjects: allSubjects } = useSubjects(curriculumId);

    const loadDetail = async () => {
        setLoading(true);
        try {
            const data = await cohortAPI.getById(cohortId);
            setDetail(data);
        } catch {
            setError('Failed to load subjects.');
        } finally {
            setLoading(false);
        }
    };

    useState(() => { loadDetail(); });

    const linkedIds = new Set((detail?.subjects ?? []).map((s: any) => s.subject));
    const unlinkedSubjects = allSubjects.filter(s => !linkedIds.has(s.id));

    const handleLink = async (subjectId: number) => {
        setWorking(true); setError(null);
        try {
            await cohortAPI.assignSubject(cohortId, subjectId, true);
            await loadDetail();
        } catch (err: any) {
            setError(err?.response?.data?.detail ?? 'Failed to link subject.');
        } finally { setWorking(false); }
    };

    const handleUnlink = async (subjectId: number) => {
        setWorking(true); setError(null);
        try {
            await cohortAPI.removeSubject(cohortId, subjectId);
            await loadDetail();
        } catch (err: any) {
            setError(err?.response?.data?.detail ?? 'Failed to unlink subject.');
        } finally { setWorking(false); }
    };

    if (loading) return (
        <div className="py-6 text-center">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-600 border-t-transparent mx-auto" />
        </div>
    );

    return (
        <div className="space-y-4">
            {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}

            {/* Linked subjects */}
            <div>
                <p className="text-sm font-semibold text-gray-700 mb-2">
                    Linked Subjects ({detail?.subjects?.length ?? 0})
                </p>
                {(detail?.subjects?.length ?? 0) === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-3 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                        No subjects linked yet
                    </p>
                ) : (
                    <div className="space-y-1.5">
                        {(detail?.subjects ?? []).map((cs: any) => (
                            <div key={cs.id}
                                className="flex items-center justify-between px-3 py-2 bg-green-50 border border-green-100 rounded-lg">
                                <div className="flex items-center gap-2">
                                    <Check className="h-3.5 w-3.5 text-green-600 shrink-0" />
                                    <span className="text-sm font-medium text-gray-900">{cs.subject_name}</span>
                                    <span className="font-mono text-xs text-gray-400">{cs.subject_code}</span>
                                    {cs.is_compulsory && <Badge variant="green" size="sm">Compulsory</Badge>}
                                </div>
                                {/* Historical cohorts — no unlinking */}
                                {!isHistorical && (
                                    <button
                                        onClick={() => handleUnlink(cs.subject)}
                                        disabled={working}
                                        className="p-1 rounded text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                                        title="Unlink subject"
                                    >
                                        <X className="h-3.5 w-3.5" />
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Available to link — hidden for historical cohorts */}
            {!isHistorical && unlinkedSubjects.length > 0 && (
                <div>
                    <p className="text-sm font-semibold text-gray-700 mb-2">Available to Link</p>
                    <div className="space-y-1.5 max-h-48 overflow-y-auto">
                        {unlinkedSubjects.map(s => (
                            <div key={s.id}
                                className="flex items-center justify-between px-3 py-2 bg-gray-50 border border-gray-100 rounded-lg hover:bg-gray-100 transition-colors">
                                <div>
                                    <span className="text-sm font-medium text-gray-900">{s.name}</span>
                                    <span className="font-mono text-xs text-gray-400 ml-2">{s.code}</span>
                                    {s.level && s.level !== 'all' && (
                                        <Badge variant="blue" size="sm" className="ml-2">{s.level}</Badge>
                                    )}
                                </div>
                                <button
                                    onClick={() => handleLink(s.id)}
                                    disabled={working}
                                    className="text-xs font-medium text-blue-600 hover:text-blue-700 px-2 py-1 rounded hover:bg-blue-50 transition-colors"
                                >
                                    + Link
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {isHistorical && (
                <p className="text-xs text-gray-400 text-center py-2">
                    This cohort is from a past academic year and is read-only.
                </p>
            )}
        </div>
    );
}

// ── Rollover Modal ────────────────────────────────────────────────────────

function RolloverModal({ cohort, onClose, onSuccess }: {
    cohort: Cohort;
    onClose: () => void;
    onSuccess: () => void;
}) {
    const [newLevel, setNewLevel] = useState('');
    const [newStream, setNewStream] = useState('');
    const [copySubjects, setCopySubjects] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleRollover = async () => {
        if (!newLevel.trim()) {
            setError('New grade level is required.');
            return;
        }
        setSaving(true); setError(null);
        try {
            await cohortAPI.rollover(cohort.id, {
                new_level: newLevel.trim(),
                new_stream: newStream.trim(),
                copy_subjects: copySubjects,
            });
            onSuccess();
            onClose();
        } catch (err: any) {
            const detail = err?.response?.data?.detail;
            setError(
                Array.isArray(detail) ? detail.join(' ') :
                    typeof detail === 'string' ? detail :
                        'Rollover failed. Please try again.'
            );
        } finally { setSaving(false); }
    };

    return (
        <Modal isOpen onClose={onClose} title={`Roll Over — ${cohort.name}`} size="md">
            <div className="space-y-4">
                <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl text-sm text-blue-700">
                    Creates a new cohort in the current academic year based on this one.
                    Students are <strong>not moved automatically</strong> — you enroll them
                    into the new cohort separately.
                </div>

                {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}

                <div>
                    <p className="text-xs text-gray-500 mb-3">
                        Source: <span className="font-medium text-gray-700">{cohort.name}</span>
                    </p>
                </div>

                <Input
                    label="New Grade Level"
                    value={newLevel}
                    onChange={e => setNewLevel(e.target.value)}
                    placeholder="e.g. Form 4, Grade 8"
                    required
                />

                <Input
                    label="Stream (optional)"
                    value={newStream}
                    onChange={e => setNewStream(e.target.value)}
                    placeholder="e.g. Blue, East, A"
                />

                <label className="flex items-center gap-3 cursor-pointer">
                    <input
                        type="checkbox"
                        checked={copySubjects}
                        onChange={e => setCopySubjects(e.target.checked)}
                        className="h-4 w-4 rounded border-gray-300 text-blue-600"
                    />
                    <div>
                        <p className="text-sm font-medium text-gray-900">Copy subject links</p>
                        <p className="text-xs text-gray-500">
                            The same subjects will be linked to the new cohort
                        </p>
                    </div>
                </label>

                <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
                    <Button variant="secondary" onClick={onClose}>Cancel</Button>
                    <Button onClick={handleRollover} disabled={saving || !newLevel.trim()}>
                        {saving ? 'Rolling over...' : 'Create New Cohort'}
                    </Button>
                </div>
            </div>
        </Modal>
    );
}

// ── Page ──────────────────────────────────────────────────────────────────

export default function CohortsPage() {
    const { academicYears } = useAcademicYears();

    // Default to current year
    const currentYear = useMemo(
        () => academicYears.find(y => y.is_current),
        [academicYears]
    );
    const [selectedYearId, setSelectedYearId] = useState<number | undefined>(undefined);

    // Once academic years load, default to current year
    useState(() => {
        if (currentYear && selectedYearId === undefined) {
            setSelectedYearId(currentYear.id);
        }
    });

    const { curricula } = useCurricula();
    const { cohorts, loading, refetch, createCohort, updateCohort, deleteCohort } = useCohorts(
        selectedYearId ? { academic_year: selectedYearId } : undefined
    );

    const [showCreateModal, setShowCreateModal] = useState(false);
    const [editingCohort, setEditingCohort] = useState<Cohort | null>(null);
    const [rolloverCohort, setRolloverCohort] = useState<Cohort | null>(null);
    const [subjectPanelOpen, setSubjectPanelOpen] = useState(false);
    const [pageError, setPageError] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        academic_year: '', curriculum: '', level: '', stream: '',
    });
    const [formError, setFormError] = useState<string | null>(null);
    const [formSaving, setFormSaving] = useState(false);

    // ── Derived ───────────────────────────────────────────────────────────

    const selectedYear = academicYears.find(y => y.id === selectedYearId);
    const isHistoricalView = selectedYear ? !selectedYear.is_current : false;

    const totalStudents = cohorts.reduce((sum, c) => sum + (c.students_count || 0), 0);

    // ── Form handlers ─────────────────────────────────────────────────────

    const openCreate = () => {
        setFormData({
            academic_year: currentYear ? String(currentYear.id) : '',
            curriculum: '', level: '', stream: '',
        });
        setFormError(null);
        setEditingCohort(null);
        setSubjectPanelOpen(false);
        setShowCreateModal(true);
    };

    const openEdit = (cohort: Cohort) => {
        setFormData({
            academic_year: String(cohort.academic_year),
            curriculum: String(cohort.curriculum),
            level: cohort.level,
            stream: cohort.stream || '',
        });
        setFormError(null);
        setEditingCohort(cohort);
        setSubjectPanelOpen(false);
        setShowCreateModal(true);
    };

    const closeModal = () => {
        setShowCreateModal(false);
        setEditingCohort(null);
        setSubjectPanelOpen(false);
        setFormError(null);
    };

    const handleSubmit = async () => {
        if (!formData.academic_year || !formData.curriculum || !formData.level) {
            setFormError('Academic year, curriculum, and grade level are required.');
            return;
        }
        setFormSaving(true); setFormError(null);
        try {
            const payload = {
                academic_year: Number(formData.academic_year),
                curriculum: Number(formData.curriculum),
                level: formData.level,
                stream: formData.stream || undefined,
            };
            if (editingCohort) {
                await updateCohort(editingCohort.id, payload);
            } else {
                await createCohort(payload);
            }
            closeModal();
        } catch (err: any) {
            const detail = err?.response?.data?.detail ?? err?.message;
            setFormError(
                Array.isArray(detail) ? detail.join(' ') :
                    typeof detail === 'string' ? detail :
                        'Failed to save cohort.'
            );
        } finally { setFormSaving(false); }
    };

    const handleDelete = async (cohort: Cohort) => {
        if (!confirm(`Delete cohort "${cohort.name}"? This will affect all enrolled students.`)) return;
        setPageError(null);
        try {
            await deleteCohort(cohort.id);
        } catch (err: any) {
            const detail = err?.response?.data?.detail ?? err?.message;
            setPageError(
                typeof detail === 'string' ? detail : 'Failed to delete cohort.'
            );
        }
    };

    // ── Table columns ─────────────────────────────────────────────────────

    const columns: Column<Cohort>[] = [
        {
            key: 'name',
            header: 'Cohort',
            sortable: true,
            render: cohort => (
                <div className="flex items-center gap-2">
                    <Link
                        href={`/academic/cohorts/${cohort.id}/students`}
                        className="font-medium text-blue-600 hover:text-blue-800 hover:underline"
                    >
                        {cohort.name}
                    </Link>
                    {!cohort.is_current_year && (
                        <Badge variant="default" size="sm">
                            <History className="h-3 w-3 mr-1" />Historical
                        </Badge>
                    )}
                </div>
            ),
        },
        {
            key: 'academic_year_name',
            header: 'Academic Year',
            sortable: true,
            render: cohort => (
                <span className={cohort.is_current_year ? 'text-gray-900 font-medium' : 'text-gray-400'}>
                    {cohort.academic_year_name}
                </span>
            ),
        },
        {
            key: 'curriculum_name',
            header: 'Curriculum',
            render: cohort => <Badge variant="info">{cohort.curriculum_name}</Badge>,
        },
        { key: 'level', header: 'Level', sortable: true },
        {
            key: 'stream',
            header: 'Stream',
            render: cohort => <span className="text-gray-500">{cohort.stream || '—'}</span>,
        },
        {
            key: 'students_count',
            header: 'Students',
            sortable: true,
            render: cohort => (
                <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-gray-400" />
                    <span className="font-medium">{cohort.students_count || 0}</span>
                </div>
            ),
        },
        {
            key: 'subjects_count',
            header: 'Subjects',
            render: cohort => <Badge variant="default">{cohort.subjects_count || 0}</Badge>,
        },
        {
            key: 'actions',
            header: '',
            render: cohort => {
                const isHistorical = !cohort.is_current_year;
                return (
                    <div className="flex gap-1 justify-end">
                        {isHistorical ? (
                            <>
                                {/* Historical: view only + rollover */}
                                <Link href={`/academic/cohorts/${cohort.id}/students`}>
                                    <Button size="sm" variant="ghost" title="View students">
                                        <Eye className="h-4 w-4" />
                                    </Button>
                                </Link>
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    title="Roll over to current year"
                                    onClick={() => setRolloverCohort(cohort)}
                                >
                                    <RotateCcw className="h-4 w-4 text-blue-500" />
                                </Button>
                            </>
                        ) : (
                            <>
                                {/* Current: full edit + delete */}
                                <Button size="sm" variant="ghost" onClick={() => openEdit(cohort)} title="Edit">
                                    <Edit className="h-4 w-4" />
                                </Button>
                                <Button size="sm" variant="ghost" onClick={() => handleDelete(cohort)} title="Delete">
                                    <Trash2 className="h-4 w-4 text-red-500" />
                                </Button>
                            </>
                        )}
                    </div>
                );
            },
        },
    ];

    // ── Render ────────────────────────────────────────────────────────────

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Cohorts</h1>
                    <p className="mt-1 text-gray-500">
                        {isHistoricalView
                            ? 'Viewing historical records — read only'
                            : 'Manage student cohorts and classes'
                        }
                    </p>
                </div>
                {!isHistoricalView && (
                    <Button onClick={openCreate}>
                        <Plus className="mr-2 h-4 w-4" />Add Cohort
                    </Button>
                )}
            </div>

            {/* Page-level error */}
            {pageError && (
                <ErrorBanner message={pageError} onDismiss={() => setPageError(null)} />
            )}

            {/* Stats */}
            <div className="grid gap-4 md:grid-cols-3">
                <StatsCard title="Total Cohorts" value={cohorts.length} icon={GraduationCap} color="blue" />
                <StatsCard title="Total Students" value={totalStudents} icon={Users} color="green" />
                <StatsCard
                    title="Avg per Cohort"
                    value={cohorts.length > 0 ? Math.round(totalStudents / cohorts.length) : 0}
                    icon={Users} color="yellow"
                />
            </div>

            {/* Year filter */}
            <Card>
                <div className="flex items-center gap-3">
                    <Select
                        value={selectedYearId?.toString() || ''}
                        onChange={e => setSelectedYearId(e.target.value ? Number(e.target.value) : undefined)}
                        options={[
                            { value: '', label: 'All Academic Years' },
                            ...academicYears.map(y => ({
                                value: String(y.id),
                                label: y.is_current ? `${y.name} (Current)` : `${y.name} — Historical`,
                            })),
                        ]}
                    />
                    {isHistoricalView && (
                        <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700 whitespace-nowrap">
                            <History className="h-3.5 w-3.5 shrink-0" />
                            Historical view — records are read-only
                        </div>
                    )}
                </div>
            </Card>

            {/* Table */}
            <Card>
                {loading ? (
                    <div className="py-12 text-center">
                        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
                        <p className="mt-2 text-gray-500">Loading cohorts...</p>
                    </div>
                ) : cohorts.length === 0 ? (
                    <div className="py-12 text-center">
                        <GraduationCap className="mx-auto h-12 w-12 text-gray-300" />
                        <h3 className="mt-2 text-sm font-medium text-gray-900">No cohorts found</h3>
                        <p className="mt-1 text-sm text-gray-500">
                            {isHistoricalView
                                ? 'No cohorts exist for this academic year.'
                                : 'Get started by creating a new cohort.'
                            }
                        </p>
                        {!isHistoricalView && (
                            <Button className="mt-4" onClick={openCreate}>
                                <Plus className="mr-2 h-4 w-4" />Add Cohort
                            </Button>
                        )}
                    </div>
                ) : (
                    <DataTable
                        data={cohorts as CohortWithIndex[]}
                        columns={columns}
                        enableSearch
                        enableSort
                        searchPlaceholder="Search cohorts..."
                        emptyMessage="No cohorts found"
                        onSort={() => { }}
                    />
                )}
            </Card>

            {/* Create / Edit Modal */}
            <Modal
                isOpen={showCreateModal}
                onClose={closeModal}
                title={editingCohort ? `Edit — ${editingCohort.name}` : 'Add New Cohort'}
                size="lg"
            >
                <div className="space-y-5">
                    {formError && (
                        <ErrorBanner message={formError} onDismiss={() => setFormError(null)} />
                    )}

                    <div className="space-y-4">
                        {/* name field REMOVED — auto-generated by model */}

                        <div className="grid grid-cols-2 gap-4">
                            <Select
                                label="Academic Year"
                                value={formData.academic_year}
                                onChange={e => setFormData({ ...formData, academic_year: e.target.value })}
                                required
                                options={[
                                    { value: '', label: 'Select Year' },
                                    ...academicYears.map(y => ({
                                        value: String(y.id),
                                        label: y.is_current ? `${y.name} (Current)` : y.name,
                                    })),
                                ]}
                            />
                            <Select
                                label="Curriculum"
                                value={formData.curriculum}
                                onChange={e => setFormData({ ...formData, curriculum: e.target.value })}
                                required
                                options={[
                                    { value: '', label: 'Select Curriculum' },
                                    ...curricula.filter(c => c.is_active).map(c => ({
                                        value: String(c.id), label: c.name,
                                    })),
                                ]}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <Input
                                label="Grade Level"
                                value={formData.level}
                                onChange={e => setFormData({ ...formData, level: e.target.value })}
                                placeholder="e.g. Form 3, Grade 10"
                                required
                            />
                            <Input
                                label="Stream (optional)"
                                value={formData.stream}
                                onChange={e => setFormData({ ...formData, stream: e.target.value })}
                                placeholder="e.g. Blue, East, A"
                            />
                        </div>

                        <p className="text-xs text-gray-400">
                            Cohort name is auto-generated from level, stream, and academic year.
                        </p>
                    </div>

                    <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
                        <Button variant="secondary" onClick={closeModal}>Cancel</Button>
                        <Button onClick={handleSubmit} disabled={formSaving}>
                            {formSaving
                                ? 'Saving...'
                                : editingCohort ? 'Update Cohort' : 'Create Cohort'
                            }
                        </Button>
                    </div>

                    {/* Subject panel — edit only, and only for current-year cohorts */}
                    {editingCohort && (
                        <div className="border-t border-gray-100 pt-4">
                            <button
                                type="button"
                                onClick={() => setSubjectPanelOpen(v => !v)}
                                className="w-full flex items-center gap-3 text-left"
                            >
                                <BookOpen className="h-4 w-4 text-blue-500 shrink-0" />
                                <span className="text-sm font-semibold text-gray-700 flex-1">
                                    {editingCohort.is_current_year ? 'Manage Subjects' : 'View Subjects'}
                                </span>
                                <Badge variant="info" size="sm">
                                    {editingCohort.subjects_count} linked
                                </Badge>
                                {subjectPanelOpen
                                    ? <ChevronDown className="h-4 w-4 text-gray-400" />
                                    : <ChevronRight className="h-4 w-4 text-gray-400" />
                                }
                            </button>

                            {subjectPanelOpen && (
                                <div className="mt-3">
                                    <SubjectPanel
                                        cohortId={editingCohort.id}
                                        curriculumId={editingCohort.curriculum}
                                        isHistorical={!editingCohort.is_current_year}
                                    />
                                </div>
                            )}
                        </div>
                    )}

                    {!editingCohort && (
                        <p className="text-xs text-gray-400 text-center">
                            You can link subjects after creating the cohort by editing it.
                        </p>
                    )}
                </div>
            </Modal>

            {/* Rollover Modal */}
            {rolloverCohort && (
                <RolloverModal
                    cohort={rolloverCohort}
                    onClose={() => setRolloverCohort(null)}
                    onSuccess={refetch}
                />
            )}
        </div>
    );
}