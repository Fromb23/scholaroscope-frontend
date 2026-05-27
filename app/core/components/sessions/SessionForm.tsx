'use client';

// ============================================================================
// app/core/components/sessions/SessionForm.tsx
//
// Owns all session creation form state, validation, and submission.
// Calls useSessions hook only — no direct API calls.
// ============================================================================

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Save, Calendar, Clock, BookOpen, Users, AlertCircle, X } from 'lucide-react';
import Link from 'next/link';
import { Card } from '@/app/components/ui/Card';
import { Button } from '@/app/components/ui/Button';
import { CurriculumLifecycleAccessState } from '@/app/core/components/curriculum/CurriculumLifecycleAccessState';
import { CurriculumLifecycleNotice } from '@/app/core/components/curriculum/CurriculumLifecycleNotice';
import { Input } from '@/app/components/ui/Input';
import { Select } from '@/app/components/ui/Select';
import { useSessions, useCohortSubjectOptions } from '@/app/core/hooks/useSessions';
import { useCurricula, useTerms, useCohorts } from '@/app/core/hooks/useAcademic';
import { useInstructorCohortAccess } from '@/app/core/hooks/useInstructorCohortAccess';
import { canCreateCurriculumWork } from '@/app/core/lib/curriculumLifecycle';
import { useAuth } from '@/app/context/AuthContext';
import { extractErrorMessage } from '@/app/core/types/errors';
import type { ApiError } from '@/app/core/types/errors';
import type { SessionFormData } from '@/app/core/types/session';

// ── Types ─────────────────────────────────────────────────────────────────

interface AcademicYear {
    id: number;
    name: string;
    is_current: boolean;
}

interface SessionFormProps {
    currentYear: AcademicYear | undefined;
}

// ── Constants ─────────────────────────────────────────────────────────────

const SESSION_TYPES = [
    { value: 'LESSON', label: 'Lesson' },
    { value: 'PRACTICAL', label: 'Practical' },
    { value: 'PROJECT', label: 'Project' },
    { value: 'EXAM', label: 'Exam' },
    { value: 'FIELD_TRIP', label: 'Field Trip' },
    { value: 'ASSEMBLY', label: 'Assembly' },
    { value: 'OTHER', label: 'Other' },
];

const DEFAULT_FORM: SessionFormData = {
    cohort_subject: null,
    subject_source: undefined,
    subject_id: null,
    term: null,
    session_type: 'LESSON',
    session_date: new Date().toISOString().split('T')[0],
    start_time: '08:00',
    end_time: '09:30',
    title: '',
    description: '',
    venue: '',
    auto_create_attendance: true,
};

// ── Sub-component: error banner ───────────────────────────────────────────

function ErrorBanner({ message, onDismiss }: { message: string; onDismiss: () => void }) {
    return (
        <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span className="flex-1 whitespace-pre-wrap">{message}</span>
            <button onClick={onDismiss} className="text-red-400 hover:text-red-600 shrink-0">
                <X className="h-4 w-4" />
            </button>
        </div>
    );
}

// ── SessionForm ───────────────────────────────────────────────────────────

export function SessionForm({ currentYear }: SessionFormProps) {
    const router = useRouter();
    const { user, activeRole } = useAuth();
    const { createSession } = useSessions();
    const { cohortSubjectIds } = useInstructorCohortAccess();
    const { curricula } = useCurricula();

    const cohortFilters = useMemo(
        () => (currentYear ? { academic_year: currentYear.id } : undefined),
        [currentYear]
    );
    const { cohorts } = useCohorts(cohortFilters);
    const { terms } = useTerms(currentYear?.id);
    const availableCohorts = useMemo(
        () => cohorts.filter((cohort) => {
            const curriculum = curricula.find((entry) => entry.id === cohort.curriculum) ?? null;
            return canCreateCurriculumWork(curriculum);
        }),
        [cohorts, curricula]
    );

    const activeTerm = useMemo(() => {
        const today = new Date();
        return terms.find(t => today >= new Date(t.start_date) && today <= new Date(t.end_date));
    }, [terms]);

    const [selectedCohort, setSelectedCohort] = useState<number>(0);
    const [selectedSubjectOptionId, setSelectedSubjectOptionId] = useState<string>('');
    const { subjectOptions } = useCohortSubjectOptions(selectedCohort || null);
    const allowedCohortSubjectIds = useMemo(
        () => new Set(cohortSubjectIds),
        [cohortSubjectIds]
    );
    const filteredSubjectOptions = useMemo(() => {
        if (activeRole !== 'INSTRUCTOR') {
            return subjectOptions;
        }

        return subjectOptions.filter((option) => {
            if (typeof option.cohort_subject_id === 'number') {
                return allowedCohortSubjectIds.has(option.cohort_subject_id);
            }

            return true;
        });
    }, [activeRole, allowedCohortSubjectIds, subjectOptions]);
    const selectedCurriculum = useMemo(() => {
        const cohort = availableCohorts.find((entry) => entry.id === selectedCohort);
        if (!cohort) {
            return null;
        }

        return curricula.find((entry) => entry.id === cohort.curriculum) ?? null;
    }, [availableCohorts, curricula, selectedCohort]);
    const isSelectedCurriculumWritable = selectedCurriculum ? canCreateCurriculumWork(selectedCurriculum) : true;

    const selectedSubjectOption = filteredSubjectOptions.find(option => option.id === selectedSubjectOptionId) ?? null;
    const [formData, setFormData] = useState<SessionFormData>(DEFAULT_FORM);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [saving, setSaving] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);

    // Auto-select active term
    useEffect(() => {
        if (activeTerm && !formData.term) {
            setFormData(prev => ({ ...prev, term: activeTerm.id }));
        }
    }, [activeTerm, formData.term]);

    const handleChange = (
        field: keyof SessionFormData,
        value: SessionFormData[keyof SessionFormData]
    ) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        setErrors(prev => { const n = { ...prev }; delete n[field]; return n; });
        setSubmitError(null);
    };

    const handleCohortChange = (cohortId: number) => {
        setSelectedCohort(cohortId);
        setSelectedSubjectOptionId('');
        setFormData(prev => ({
            ...prev,
            cohort_subject: null,
            subject_source: undefined,
            subject_id: null,
            title: '',
        }));
        setErrors(prev => {
            const next = { ...prev };
            delete next.cohort_subject;
            return next;
        });
        setSubmitError(null);
    };

    const handleCohortSubjectChange = (id: string) => {
        const option = filteredSubjectOptions.find((item) => item.id === id) ?? null;
        setSelectedSubjectOptionId(id);
        setFormData(prev => ({
            ...prev,
            cohort_subject: option?.session_supported ? (option.cohort_subject_id ?? null) : null,
            subject_source: option?.session_supported
                ? (option.source === 'cambridge' ? 'cambridge' : 'kernel')
                : undefined,
            subject_id: option?.session_supported ? (option.subject_id ?? null) : null,
            title: '',
        }));
        setErrors(prev => {
            const next = { ...prev };
            delete next.cohort_subject;
            return next;
        });
        setSubmitError(null);
    };

    const validate = (): boolean => {
        const newErrors: Record<string, string> = {};
        if (!selectedCohort) newErrors.cohort = 'Cohort is required';
        if (!selectedSubjectOption || !selectedSubjectOption.session_supported || !formData.subject_source || !formData.subject_id) {
            newErrors.cohort_subject = 'Subject is required';
        }
        if (!formData.session_date) newErrors.session_date = 'Date is required';
        if (!formData.start_time) newErrors.start_time = 'Start time is required';
        if (!formData.end_time) newErrors.end_time = 'End time is required';
        if (formData.start_time && formData.end_time && formData.start_time >= formData.end_time) {
            newErrors.end_time = 'End time must be after start time';
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isSelectedCurriculumWritable) return;
        if (!validate()) return;

        setSaving(true);
        setSubmitError(null);

        try {
            const session = await createSession({ ...formData, created_by: user?.id ?? 0 });
            router.push(`/sessions/${session.id}`);
        } catch (err) {
            setSubmitError(extractErrorMessage(err as ApiError));
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } finally {
            setSaving(false);
        }
    };

    if (cohorts.length > 0 && availableCohorts.length === 0) {
        return (
            <CurriculumLifecycleAccessState
                title="Session creation is unavailable"
                message="All available curricula are currently blocked for new work. Historical session records remain readable."
                backHref="/sessions"
                backLabel="Back to Sessions"
            />
        );
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {submitError && (
                <ErrorBanner message={submitError} onDismiss={() => setSubmitError(null)} />
            )}

            {selectedCurriculum && selectedCurriculum.offering_status !== 'ACTIVE' ? (
                <CurriculumLifecycleNotice
                    status={selectedCurriculum.offering_status}
                    role={activeRole === 'INSTRUCTOR' ? 'INSTRUCTOR' : 'ADMIN'}
                    title="Session scheduling status"
                />
            ) : null}

            {/* Basic Information */}
            <Card>
                <div className="p-6">
                    <div className="flex items-center gap-2 mb-6">
                        <Calendar className="w-5 h-5 text-gray-400" />
                        <h2 className="text-lg font-semibold text-gray-900">Basic Information</h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <Select
                                label="Cohort"
                                value={selectedCohort.toString()}
                                onChange={e => handleCohortChange(Number(e.target.value))}
                                required
                                options={[
                                    { value: '', label: 'Select Cohort' },
                                    ...availableCohorts.map(c => ({ value: String(c.id), label: c.name })),
                                ]}
                            />
                            {errors.cohort && <p className="mt-1 text-sm text-red-600">{errors.cohort}</p>}
                        </div>

                        <div>
                            <Select
                                label="Subject"
                                value={selectedSubjectOptionId}
                                onChange={e => handleCohortSubjectChange(e.target.value)}
                                required
                                disabled={!selectedCohort || !isSelectedCurriculumWritable}
                                options={[
                                    { value: '', label: selectedCohort ? 'Select Subject' : 'Select a cohort first' },
                                    ...filteredSubjectOptions.map(option => ({
                                        value: option.id,
                                        label: option.session_supported
                                            ? `${option.subject_code ?? 'SUBJ'} — ${option.label}${option.source === 'cbc' ? ' (CBC)' : option.source === 'cambridge' ? ' (Cambridge)' : ''}`
                                            : `${option.subject_code ?? 'SUBJ'} — ${option.label} (${option.programme ?? option.plugin}${option.curriculum_version ? ` · ${option.curriculum_version}` : ''})`,
                                        disabled: !option.session_supported,
                                    })),
                                ]}
                            />
                            {errors.cohort_subject && <p className="mt-1 text-sm text-red-600">{errors.cohort_subject}</p>}
                        </div>

                        <div>
                            <Select
                                label="Term"
                                value={formData.term?.toString() ?? ''}
                                onChange={e => handleChange('term', e.target.value ? Number(e.target.value) : null)}
                                options={[
                                    { value: '', label: terms.length === 0 ? 'No terms configured' : 'Select Term' },
                                    ...terms.map(t => {
                                        const today = new Date();
                                        const isActive = today >= new Date(t.start_date) && today <= new Date(t.end_date);
                                        return { value: String(t.id), label: isActive ? `${t.name} (Active)` : t.name };
                                    }),
                                ]}
                            />
                            {terms.length > 0 && !formData.term && (
                                <p className="mt-1 text-xs text-amber-600">
                                    No active term for today. Sessions outside term windows may be rejected.
                                </p>
                            )}
                        </div>

                        <div>
                            <Select
                                label="Session Type"
                                value={formData.session_type}
                                onChange={e => handleChange('session_type', e.target.value)}
                                required
                                options={SESSION_TYPES}
                            />
                        </div>

                        <div>
                            <Input
                                label="Session Date"
                                type="date"
                                value={formData.session_date}
                                onChange={e => handleChange('session_date', e.target.value)}
                                required
                            />
                            {errors.session_date && <p className="mt-1 text-sm text-red-600">{errors.session_date}</p>}
                        </div>
                    </div>
                </div>
            </Card>

            {/* Session Details */}
            <Card>
                <div className="p-6">
                    <div className="flex items-center gap-2 mb-6">
                        <BookOpen className="w-5 h-5 text-gray-400" />
                        <h2 className="text-lg font-semibold text-gray-900">Session Details</h2>
                    </div>
                    <div className="space-y-4">
                        <Input
                            label="Session Title"
                            type="text"
                            placeholder="e.g., Introduction to Algebra"
                            value={formData.title}
                            onChange={e => handleChange('title', e.target.value)}
                        />
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Description <span className="text-gray-400 font-normal">(optional)</span>
                            </label>
                            <textarea
                                value={formData.description}
                                onChange={e => handleChange('description', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                rows={3}
                                placeholder="Session objectives or additional notes..."
                            />
                        </div>
                    </div>
                </div>
            </Card>

            {/* Time & Location */}
            <Card>
                <div className="p-6">
                    <div className="flex items-center gap-2 mb-6">
                        <Clock className="w-5 h-5 text-gray-400" />
                        <h2 className="text-lg font-semibold text-gray-900">Time &amp; Location</h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div>
                            <Input
                                label="Start Time"
                                type="time"
                                value={formData.start_time ?? ''}
                                onChange={e => handleChange('start_time', e.target.value)}
                                required
                            />
                            {errors.start_time && <p className="mt-1 text-sm text-red-600">{errors.start_time}</p>}
                        </div>
                        <div>
                            <Input
                                label="End Time"
                                type="time"
                                value={formData.end_time ?? ''}
                                onChange={e => handleChange('end_time', e.target.value)}
                                required
                            />
                            {errors.end_time && <p className="mt-1 text-sm text-red-600">{errors.end_time}</p>}
                        </div>
                        <Input
                            label="Venue"
                            type="text"
                            placeholder="e.g., Room 101, Lab 2"
                            value={formData.venue}
                            onChange={e => handleChange('venue', e.target.value)}
                        />
                    </div>
                </div>
            </Card>

            {/* Attendance Settings */}
            <Card>
                <div className="p-6">
                    <div className="flex items-center gap-2 mb-4">
                        <Users className="w-5 h-5 text-gray-400" />
                        <h2 className="text-lg font-semibold text-gray-900">Attendance</h2>
                    </div>
                    <label className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg border border-blue-200 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={formData.auto_create_attendance}
                            onChange={e => handleChange('auto_create_attendance', e.target.checked)}
                            className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <div>
                            <p className="font-medium text-gray-900">Auto-create attendance records</p>
                            <p className="text-sm text-gray-600 mt-1">
                                Creates attendance records for all enrolled students. Records will be unmarked by default.
                            </p>
                        </div>
                    </label>
                </div>
            </Card>

            {/* Actions */}
            <div className="flex items-center justify-end gap-4">
                <Link href="/sessions">
                    <Button type="button" variant="secondary">Cancel</Button>
                </Link>
                <Button type="submit" disabled={saving || !isSelectedCurriculumWritable}>
                    <Save className="w-4 h-4 mr-2" />
                    {saving ? 'Creating...' : 'Create Session'}
                </Button>
            </div>
        </form>
    );
}
