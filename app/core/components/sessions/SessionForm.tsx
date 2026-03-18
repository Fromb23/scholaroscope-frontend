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
import { Input } from '@/app/components/ui/Input';
import { Select } from '@/app/components/ui/Select';
import { TopicSubtopicPicker } from './TopicSubtopicPicker';
import { useSessions, useCohortSubjects } from '@/app/core/hooks/useSessions';
import { useTerms, useCohorts } from '@/app/core/hooks/useAcademic';
import { useAuth } from '@/app/context/AuthContext';
import { extractErrorMessage } from '@/app/core/types/errors';
import type { ApiError } from '@/app/core/types/errors';
import type { Topic, Subtopic } from '@/app/core/types/topics';
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
    cohort_subject: 0,
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
    const { user } = useAuth();
    const { createSessionWithLinks } = useSessions();

    const { cohorts } = useCohorts(currentYear ? { academic_year: currentYear.id } : undefined);
    const { terms } = useTerms(currentYear?.id);

    const activeTerm = useMemo(() => {
        const today = new Date();
        return terms.find(t => today >= new Date(t.start_date) && today <= new Date(t.end_date));
    }, [terms]);

    const [selectedCohort, setSelectedCohort] = useState<number>(0);
    const [selectedCohortSubjectId, setSelectedCohortSubjectId] = useState<number>(0);
    const { cohortSubjects } = useCohortSubjects(selectedCohort || null);

    const selectedCohortSubject = cohortSubjects.find(cs => cs.id === selectedCohortSubjectId);
    const isCBC = selectedCohortSubject?.curriculum_type === 'CBE';
    const subjectId = selectedCohortSubject?.subject ?? 0;

    const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);
    const [selectedSubtopics, setSelectedSubtopics] = useState<Subtopic[]>([]);
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

    // Auto-fill title from topic + subtopic selection
    useEffect(() => {
        if (!selectedTopic) return;
        const title = selectedSubtopics.length > 0
            ? `${selectedTopic.name} — ${selectedSubtopics.map(s => s.name).join(', ')}`
            : selectedTopic.name;
        setFormData(prev => ({ ...prev, title }));
    }, [selectedTopic, selectedSubtopics]);

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
        setSelectedCohortSubjectId(0);
        handleChange('cohort_subject', 0);
        setSelectedTopic(null);
        setSelectedSubtopics([]);
    };

    const handleCohortSubjectChange = (id: number) => {
        setSelectedCohortSubjectId(id);
        handleChange('cohort_subject', id);
        setSelectedTopic(null);
        setSelectedSubtopics([]);
        handleChange('title', '');
    };

    const validate = (): boolean => {
        const newErrors: Record<string, string> = {};
        if (!selectedCohort) newErrors.cohort = 'Cohort is required';
        if (!formData.cohort_subject) newErrors.cohort_subject = 'Subject is required';
        if (!formData.session_date) newErrors.session_date = 'Date is required';
        if (!formData.start_time) newErrors.start_time = 'Start time is required';
        if (!formData.end_time) newErrors.end_time = 'End time is required';
        if (formData.start_time && formData.end_time && formData.start_time >= formData.end_time) {
            newErrors.end_time = 'End time must be after start time';
        }
        if (!isCBC && !selectedTopic) newErrors.topic = 'Select a topic for this session';
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) return;

        setSaving(true);
        setSubmitError(null);

        try {
            const session = await createSessionWithLinks(
                { ...formData, created_by: user?.id ?? 0 },
                selectedSubtopics.map(s => s.id)
            );
            router.push(`/sessions/${session.id}`);
        } catch (err) {
            setSubmitError(extractErrorMessage(err as ApiError));
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } finally {
            setSaving(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {submitError && (
                <ErrorBanner message={submitError} onDismiss={() => setSubmitError(null)} />
            )}

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
                                    ...cohorts.map(c => ({ value: String(c.id), label: c.name })),
                                ]}
                            />
                            {errors.cohort && <p className="mt-1 text-sm text-red-600">{errors.cohort}</p>}
                        </div>

                        <div>
                            <Select
                                label="Subject"
                                value={formData.cohort_subject.toString()}
                                onChange={e => handleCohortSubjectChange(Number(e.target.value))}
                                required
                                disabled={!selectedCohort}
                                options={[
                                    { value: '0', label: selectedCohort ? 'Select Subject' : 'Select a cohort first' },
                                    ...cohortSubjects.map(cs => ({
                                        value: String(cs.id),
                                        label: `${cs.subject_code} — ${cs.subject_name}${cs.is_compulsory ? ' (Core)' : ''}`,
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

            {/* Topic & Subtopic — non-CBC only */}
            {formData.cohort_subject > 0 && !isCBC && (
                <Card>
                    <div className="p-6">
                        <div className="flex items-center gap-2 mb-2">
                            <BookOpen className="w-5 h-5 text-blue-500" />
                            <h2 className="text-lg font-semibold text-gray-900">Topic &amp; Subtopics</h2>
                        </div>
                        <p className="text-sm text-gray-500 mb-5">
                            Select what you&apos;ll be teaching. Links this session to the curriculum
                            and pre-fills the session title.
                        </p>
                        <TopicSubtopicPicker
                            subjectId={subjectId}
                            onSelectionChange={(topic, subtopics) => {
                                setSelectedTopic(topic);
                                setSelectedSubtopics(subtopics);
                                if (errors.topic) setErrors(prev => { const n = { ...prev }; delete n.topic; return n; });
                            }}
                        />
                        {errors.topic && <p className="mt-2 text-sm text-red-600">{errors.topic}</p>}
                    </div>
                </Card>
            )}

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
                            placeholder={
                                formData.cohort_subject && !isCBC
                                    ? 'Auto-filled from topic selection above'
                                    : 'e.g., Introduction to Algebra'
                            }
                            value={formData.title}
                            onChange={e => handleChange('title', e.target.value)}
                        />
                        {selectedTopic && (
                            <p className="text-xs text-gray-400">Auto-filled from topic selection — you can edit this.</p>
                        )}
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
                <Button type="submit" disabled={saving}>
                    <Save className="w-4 h-4 mr-2" />
                    {saving
                        ? selectedSubtopics.length > 0 ? 'Creating & linking subtopics...' : 'Creating...'
                        : 'Create Session'
                    }
                </Button>
            </div>
        </form>
    );
}