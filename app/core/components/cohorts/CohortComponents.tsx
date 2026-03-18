'use client';

// ============================================================================
// app/core/components/cohorts/CohortComponents.tsx
//
// All cohort page sub-components — extracted from cohorts/page.tsx.
// No any, typed props, no direct API calls except SubjectPanel which
// needs cohort detail (not yet in a hook).
// ============================================================================

import { useState } from 'react';
import {
    Check, X, BookOpen, ChevronDown, ChevronRight,
} from 'lucide-react';
import { Badge } from '@/app/components/ui/Badge';
import { Button } from '@/app/components/ui/Button';
import { Input } from '@/app/components/ui/Input';
import { Select } from '@/app/components/ui/Select';
import Modal from '@/app/components/ui/Modal';
import { ErrorBanner } from '@/app/components/ui/ErrorBanner';
import { cohortAPI } from '@/app/core/api/academic';
import { useSubjects } from '@/app/core/hooks/useAcademic';
import { extractErrorMessage } from '@/app/core/types/errors';
import type { ApiError } from '@/app/core/types/errors';
import type { Cohort, CohortDetail, AcademicYear, Curriculum } from '@/app/core/types/academic';

// ── SubjectPanel ──────────────────────────────────────────────────────────

interface CohortSubjectLink {
    id: number;
    subject: number;
    subject_name: string;
    subject_code: string;
    is_compulsory: boolean;
}

interface SubjectPanelProps {
    cohortId: number;
    curriculumId: number;
    isHistorical: boolean;
}

export function SubjectPanel({ cohortId, curriculumId, isHistorical }: SubjectPanelProps) {
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

    // Load on mount
    useState(() => { loadDetail(); });

    const linkedIds = new Set((detail?.subjects ?? []).map((s: CohortSubjectLink) => s.subject));
    const unlinked = allSubjects.filter(s => !linkedIds.has(s.id));

    const handleLink = async (subjectId: number) => {
        setWorking(true); setError(null);
        try {
            await cohortAPI.assignSubject(cohortId, subjectId, true);
            await loadDetail();
        } catch (err) {
            setError(extractErrorMessage(err as ApiError, 'Failed to link subject.'));
        } finally { setWorking(false); }
    };

    const handleUnlink = async (subjectId: number) => {
        setWorking(true); setError(null);
        try {
            await cohortAPI.removeSubject(cohortId, subjectId);
            await loadDetail();
        } catch (err) {
            setError(extractErrorMessage(err as ApiError, 'Failed to unlink subject.'));
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
                        {(detail?.subjects ?? []).map((cs: CohortSubjectLink) => (
                            <div key={cs.id} className="flex items-center justify-between px-3 py-2 bg-green-50 border border-green-100 rounded-lg">
                                <div className="flex items-center gap-2">
                                    <Check className="h-3.5 w-3.5 text-green-600 shrink-0" />
                                    <span className="text-sm font-medium text-gray-900">{cs.subject_name}</span>
                                    <span className="font-mono text-xs text-gray-400">{cs.subject_code}</span>
                                    {cs.is_compulsory && <Badge variant="green" size="sm">Compulsory</Badge>}
                                </div>
                                {!isHistorical && (
                                    <button
                                        onClick={() => handleUnlink(cs.subject)}
                                        disabled={working}
                                        className="p-1 rounded text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                                    >
                                        <X className="h-3.5 w-3.5" />
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {!isHistorical && unlinked.length > 0 && (
                <div>
                    <p className="text-sm font-semibold text-gray-700 mb-2">Available to Link</p>
                    <div className="space-y-1.5 max-h-48 overflow-y-auto">
                        {unlinked.map(s => (
                            <div key={s.id} className="flex items-center justify-between px-3 py-2 bg-gray-50 border border-gray-100 rounded-lg hover:bg-gray-100 transition-colors">
                                <div>
                                    <span className="text-sm font-medium text-gray-900">{s.name}</span>
                                    <span className="font-mono text-xs text-gray-400 ml-2">{s.code}</span>
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

// ── RolloverModal ─────────────────────────────────────────────────────────

interface RolloverModalProps {
    cohort: Cohort;
    onClose: () => void;
    onSuccess: () => void;
}

export function RolloverModal({ cohort, onClose, onSuccess }: RolloverModalProps) {
    const [newLevel, setNewLevel] = useState('');
    const [newStream, setNewStream] = useState('');
    const [copySubjects, setCopySubjects] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleRollover = async () => {
        if (!newLevel.trim()) { setError('New grade level is required.'); return; }
        setSaving(true); setError(null);
        try {
            await cohortAPI.rollover(cohort.id, {
                new_level: newLevel.trim(),
                new_stream: newStream.trim() || undefined,
                copy_subjects: copySubjects,
            });
            onSuccess();
            onClose();
        } catch (err) {
            setError(extractErrorMessage(err as ApiError, 'Rollover failed. Please try again.'));
        } finally { setSaving(false); }
    };

    return (
        <Modal isOpen onClose={onClose} title={`Roll Over — ${cohort.name}`} size="md">
            <div className="space-y-4">
                <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl text-sm text-blue-700">
                    Creates a new cohort in the current academic year based on this one.
                    Students are <strong>not moved automatically</strong> — you enroll them into the new cohort separately.
                </div>

                {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}

                <p className="text-xs text-gray-500">
                    Source: <span className="font-medium text-gray-700">{cohort.name}</span>
                </p>

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
                        <p className="text-xs text-gray-500">The same subjects will be linked to the new cohort</p>
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

// ── CohortFormModal ───────────────────────────────────────────────────────

interface CohortFormState {
    academic_year: string;
    curriculum: string;
    level: string;
    stream: string;
}

interface CohortFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    editingCohort: Cohort | null;
    academicYears: AcademicYear[];
    curricula: Curriculum[];
    onSave: (data: CohortFormState, isEdit: boolean, cohortId?: number) => Promise<void>;
    initialData: CohortFormState;
}

export function CohortFormModal({
    isOpen, onClose, editingCohort,
    academicYears, curricula, onSave, initialData,
}: CohortFormModalProps) {
    const [formData, setFormData] = useState<CohortFormState>(initialData);
    const [formError, setFormError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [subjectPanelOpen, setSubjectPanelOpen] = useState(false);

    // Sync when initialData changes (open/close)
    useState(() => { setFormData(initialData); setFormError(null); setSubjectPanelOpen(false); });

    const handleSubmit = async () => {
        if (!formData.academic_year || !formData.curriculum || !formData.level) {
            setFormError('Academic year, curriculum, and grade level are required.');
            return;
        }
        setSaving(true); setFormError(null);
        try {
            await onSave(formData, !!editingCohort, editingCohort?.id);
            onClose();
        } catch (err) {
            setFormError(extractErrorMessage(err as ApiError, 'Failed to save cohort.'));
        } finally { setSaving(false); }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={editingCohort ? `Edit — ${editingCohort.name}` : 'Add New Cohort'}
            size="lg"
        >
            <div className="space-y-5">
                {formError && <ErrorBanner message={formError} onDismiss={() => setFormError(null)} />}

                <div className="grid grid-cols-2 gap-4">
                    <Select
                        label="Academic Year"
                        value={formData.academic_year}
                        onChange={e => setFormData(prev => ({ ...prev, academic_year: e.target.value }))}
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
                        onChange={e => setFormData(prev => ({ ...prev, curriculum: e.target.value }))}
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
                        onChange={e => setFormData(prev => ({ ...prev, level: e.target.value }))}
                        placeholder="e.g. Form 3, Grade 10"
                        required
                    />
                    <Input
                        label="Stream (optional)"
                        value={formData.stream}
                        onChange={e => setFormData(prev => ({ ...prev, stream: e.target.value }))}
                        placeholder="e.g. Blue, East, A"
                    />
                </div>

                <p className="text-xs text-gray-400">
                    Cohort name is auto-generated from level, stream, and academic year.
                </p>

                <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
                    <Button variant="secondary" onClick={onClose}>Cancel</Button>
                    <Button onClick={handleSubmit} disabled={saving}>
                        {saving ? 'Saving...' : editingCohort ? 'Update Cohort' : 'Create Cohort'}
                    </Button>
                </div>

                {/* Subject panel — edit only */}
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
                            <Badge variant="info" size="sm">{editingCohort.subjects_count} linked</Badge>
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
    );
}