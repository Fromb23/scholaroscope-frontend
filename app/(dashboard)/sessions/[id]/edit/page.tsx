'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Save, AlertCircle, X } from 'lucide-react';
import Link from 'next/link';
import { Card } from '@/app/components/ui/Card';
import { Button } from '@/app/components/ui/Button';
import { Input } from '@/app/components/ui/Input';
import { Select } from '@/app/components/ui/Select';
import { useSessionDetail } from '@/app/core/hooks/useSessions';
import { useTerms } from '@/app/core/hooks/useAcademic';
import { sessionAPI } from '@/app/core/api/sessions';

// ── Error banner ──────────────────────────────────────────────────────────

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

// ── Page ──────────────────────────────────────────────────────────────────

const SESSION_TYPES = [
    { value: 'LESSON', label: 'Lesson' },
    { value: 'PRACTICAL', label: 'Practical' },
    { value: 'PROJECT', label: 'Project' },
    { value: 'EXAM', label: 'Exam' },
    { value: 'FIELD_TRIP', label: 'Field Trip' },
    { value: 'ASSEMBLY', label: 'Assembly' },
    { value: 'OTHER', label: 'Other' },
];

export default function EditSessionPage() {
    const params = useParams();
    const router = useRouter();
    const sessionId = Number(params.id);

    // Load session — we only need basic session data, not attendance
    const { session, loading } = useSessionDetail(sessionId, '', 1, 1);

    // Terms for current year only — same scope as create page
    const { terms } = useTerms(
        session?.academic_year_id ?? undefined
    );

    const [formData, setFormData] = useState({
        session_type: '',
        session_date: '',
        start_time: '',
        end_time: '',
        title: '',
        description: '',
        venue: '',
        term: '' as string,
    });
    const [formErrors, setFormErrors] = useState<Record<string, string>>({});
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [initialized, setInitialized] = useState(false);

    // Populate form once session loads
    useEffect(() => {
        if (!session || initialized) return;
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
        setInitialized(true);
    }, [session, initialized]);

    const handleChange = (field: string, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        if (formErrors[field]) {
            setFormErrors(prev => { const n = { ...prev }; delete n[field]; return n; });
        }
        if (submitError) setSubmitError(null);
    };

    const validate = () => {
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
            await sessionAPI.update(sessionId, {
                session_type: formData.session_type,
                session_date: formData.session_date,
                start_time: formData.start_time || null,
                end_time: formData.end_time || null,
                title: formData.title,
                description: formData.description,
                venue: formData.venue,
                term: formData.term ? Number(formData.term) : null,
            });
            router.push(`/sessions/${sessionId}`);
        } catch (err: any) {
            const detail = err?.response?.data?.detail ?? err?.message;
            setSubmitError(
                Array.isArray(detail) ? detail.join('\n') :
                    typeof detail === 'string' ? detail :
                        'Failed to save session.'
            );
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } finally {
            setSaving(false);
        }
    };

    // ── Guards ────────────────────────────────────────────────────────────

    if (loading && !session) {
        return <div className="p-10 text-gray-500">Loading session…</div>;
    }

    if (!session) {
        return <div className="p-10 text-gray-500">Session not found.</div>;
    }

    // Past-year sessions cannot be edited — redirect to detail
    if (session.is_current_year === false) {
        return (
            <div className="space-y-6">
                <div className="flex items-center gap-4">
                    <Link href={`/sessions/${sessionId}`}>
                        <Button variant="ghost" size="sm">
                            <ArrowLeft className="w-4 h-4 mr-2" />Back
                        </Button>
                    </Link>
                    <h1 className="text-2xl font-semibold text-gray-900">Edit Session</h1>
                </div>
                <Card>
                    <div className="p-8 text-center space-y-3">
                        <AlertCircle className="mx-auto h-10 w-10 text-amber-400" />
                        <h3 className="text-base font-semibold text-gray-900">
                            Session cannot be edited
                        </h3>
                        <p className="text-sm text-gray-500 max-w-sm mx-auto">
                            This session belongs to a past academic year.
                            Historical records are read-only to preserve data integrity.
                        </p>
                        <Link href={`/sessions/${sessionId}`}>
                            <Button variant="secondary" className="mt-2">
                                View Session
                            </Button>
                        </Link>
                    </div>
                </Card>
            </div>
        );
    }

    // ── Render ────────────────────────────────────────────────────────────

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Link href={`/sessions/${sessionId}`}>
                    <Button variant="ghost" size="sm">
                        <ArrowLeft className="w-4 h-4 mr-2" />Back
                    </Button>
                </Link>
                <div className="flex-1">
                    <h1 className="text-2xl font-semibold text-gray-900">Edit Session</h1>
                    <p className="text-gray-500 mt-1">
                        {session.subject_name} · {session.cohort_name}
                    </p>
                </div>
            </div>

            {/* Submit error */}
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
                            <p className="text-sm font-medium text-gray-700">
                                {session.cohort_name}
                            </p>
                        </div>
                        <div>
                            <p className="text-xs text-gray-500 mb-1">Subject</p>
                            <p className="text-sm font-medium text-gray-700">
                                {session.subject_name}
                            </p>
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
                                    const isActive =
                                        today >= new Date(t.start_date) &&
                                        today <= new Date(t.end_date);
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
                <Link href={`/sessions/${sessionId}`}>
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