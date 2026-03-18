'use client';

// ============================================================================
// app/core/components/sessions/EditSessionForm.tsx
//
// Owns all session edit form state, validation, and submission.
// Calls useSessions hook only — no direct API calls.
// ============================================================================

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Save } from 'lucide-react';
import Link from 'next/link';
import { Card } from '@/app/components/ui/Card';
import { Button } from '@/app/components/ui/Button';
import { Input } from '@/app/components/ui/Input';
import { Select } from '@/app/components/ui/Select';
import { ErrorBanner } from '@/app/components/ui/ErrorBanner';
import { useSessions } from '@/app/core/hooks/useSessions';
import { useTerms } from '@/app/core/hooks/useAcademic';
import { extractErrorMessage } from '@/app/core/types/errors';
import type { ApiError } from '@/app/core/types/errors';
import type { SessionDetail } from '@/app/core/types/session';

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

// ── Form state shape ──────────────────────────────────────────────────────

interface EditFormState {
    session_type: string;
    session_date: string;
    start_time: string;
    end_time: string;
    title: string;
    description: string;
    venue: string;
    term: string;
}

// ── Props ─────────────────────────────────────────────────────────────────

interface EditSessionFormProps {
    session: SessionDetail;
}

// ── Component ─────────────────────────────────────────────────────────────

export function EditSessionForm({ session }: EditSessionFormProps) {
    const router = useRouter();
    const { updateSession } = useSessions();
    const { terms } = useTerms(session.academic_year_id ?? undefined);

    const [formData, setFormData] = useState<EditFormState>({
        session_type: session.session_type ?? 'LESSON',
        session_date: session.session_date ?? '',
        start_time: session.start_time ?? '',
        end_time: session.end_time ?? '',
        title: session.title ?? '',
        description: session.description ?? '',
        venue: session.venue ?? '',
        term: session.term ? String(session.term) : '',
    });
    const [formErrors, setFormErrors] = useState<Record<string, string>>({});
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);

    // Re-sync if session prop changes (e.g. refetch)
    useEffect(() => {
        setFormData({
            session_type: session.session_type ?? 'LESSON',
            session_date: session.session_date ?? '',
            start_time: session.start_time ?? '',
            end_time: session.end_time ?? '',
            title: session.title ?? '',
            description: session.description ?? '',
            venue: session.venue ?? '',
            term: session.term ? String(session.term) : '',
        });
    }, [session.id]);

    const handleChange = (field: keyof EditFormState, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        setFormErrors(prev => { const n = { ...prev }; delete n[field]; return n; });
        setSubmitError(null);
    };

    const validate = (): boolean => {
        const errors: Record<string, string> = {};
        if (!formData.session_date) errors.session_date = 'Date is required.';
        if (!formData.start_time) errors.start_time = 'Start time is required.';
        if (!formData.end_time) errors.end_time = 'End time is required.';
        if (formData.start_time && formData.end_time && formData.start_time >= formData.end_time) {
            errors.end_time = 'End time must be after start time.';
        }
        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleSubmit = async () => {
        if (!validate()) return;
        setSaving(true);
        setSubmitError(null);
        try {
            await updateSession(session.id, {
                session_type: formData.session_type,
                session_date: formData.session_date,
                start_time: formData.start_time || null,
                end_time: formData.end_time || null,
                title: formData.title,
                description: formData.description,
                venue: formData.venue,
                term: formData.term ? Number(formData.term) : null,
            });
            router.push(`/sessions/${session.id}`);
        } catch (err) {
            setSubmitError(extractErrorMessage(err as ApiError, 'Failed to save session.'));
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="space-y-6">
            {submitError && (
                <ErrorBanner message={submitError} onDismiss={() => setSubmitError(null)} />
            )}

            {/* Immutable fields — shown read-only for context */}
            <Card>
                <div className="p-5">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
                        Cannot be changed
                    </p>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <p className="text-xs text-gray-500 mb-1">Cohort</p>
                            <p className="text-sm font-medium text-gray-700">{session.cohort_name}</p>
                        </div>
                        <div>
                            <p className="text-xs text-gray-500 mb-1">Subject</p>
                            <p className="text-sm font-medium text-gray-700">{session.subject_name}</p>
                        </div>
                    </div>
                </div>
            </Card>

            {/* Editable fields */}
            <Card>
                <div className="p-5 space-y-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <Select
                            label="Session Type"
                            value={formData.session_type}
                            onChange={e => handleChange('session_type', e.target.value)}
                            options={SESSION_TYPES}
                        />

                        <Select
                            label="Term"
                            value={formData.term}
                            onChange={e => handleChange('term', e.target.value)}
                            options={[
                                { value: '', label: 'No Term' },
                                ...terms.map(t => {
                                    const today = new Date();
                                    const isActive = today >= new Date(t.start_date) && today <= new Date(t.end_date);
                                    return {
                                        value: String(t.id),
                                        label: isActive ? `${t.name} (Active)` : t.name,
                                    };
                                }),
                            ]}
                        />

                        <div>
                            <Input
                                label="Session Date"
                                type="date"
                                value={formData.session_date}
                                onChange={e => handleChange('session_date', e.target.value)}
                                required
                            />
                            {formErrors.session_date && (
                                <p className="mt-1 text-sm text-red-600">{formErrors.session_date}</p>
                            )}
                        </div>

                        <Input
                            label="Venue"
                            value={formData.venue}
                            onChange={e => handleChange('venue', e.target.value)}
                            placeholder="e.g. Room 101, Lab 2"
                        />

                        <div>
                            <Input
                                label="Start Time"
                                type="time"
                                value={formData.start_time}
                                onChange={e => handleChange('start_time', e.target.value)}
                            />
                            {formErrors.start_time && (
                                <p className="mt-1 text-sm text-red-600">{formErrors.start_time}</p>
                            )}
                        </div>

                        <div>
                            <Input
                                label="End Time"
                                type="time"
                                value={formData.end_time}
                                onChange={e => handleChange('end_time', e.target.value)}
                            />
                            {formErrors.end_time && (
                                <p className="mt-1 text-sm text-red-600">{formErrors.end_time}</p>
                            )}
                        </div>
                    </div>

                    <Input
                        label="Session Title"
                        value={formData.title}
                        onChange={e => handleChange('title', e.target.value)}
                        placeholder="e.g. Introduction to Algebra"
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
                            placeholder="Session objectives or notes..."
                        />
                    </div>
                </div>
            </Card>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3">
                <Link href={`/sessions/${session.id}`}>
                    <Button variant="secondary">Cancel</Button>
                </Link>
                <Button onClick={handleSubmit} disabled={saving}>
                    <Save className="w-4 h-4 mr-2" />
                    {saving ? 'Saving...' : 'Save Changes'}
                </Button>
            </div>
        </div>
    );
}