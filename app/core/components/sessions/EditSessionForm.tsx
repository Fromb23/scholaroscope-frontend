'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CalendarClock, Save } from 'lucide-react';
import Link from 'next/link';

import { Card } from '@/app/components/ui/Card';
import { Button } from '@/app/components/ui/Button';
import { Input } from '@/app/components/ui/Input';
import { ErrorBanner } from '@/app/components/ui/ErrorBanner';
import { useScrollIntoViewOnMessage } from '@/app/core/hooks/useScrollIntoViewOnMessage';
import { useSessions } from '@/app/core/hooks/useSessions';
import { extractErrorMessage } from '@/app/core/types/errors';
import type { ApiError } from '@/app/core/types/errors';
import type { SessionDetail } from '@/app/core/types/session';

interface EditFormState {
    title: string;
    description: string;
    venue: string;
}

interface EditSessionFormProps {
    session: SessionDetail;
}

export function EditSessionForm({ session }: EditSessionFormProps) {
    const router = useRouter();
    const { updateSession } = useSessions();

    const [formData, setFormData] = useState<EditFormState>({
        title: session.title ?? '',
        description: session.description ?? '',
        venue: session.venue ?? '',
    });
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const submitErrorRef = useScrollIntoViewOnMessage(submitError);

    useEffect(() => {
        setFormData({
            title: session.title ?? '',
            description: session.description ?? '',
            venue: session.venue ?? '',
        });
    }, [session.description, session.id, session.title, session.venue]);

    const handleChange = (field: keyof EditFormState, value: string) => {
        setFormData((current) => ({ ...current, [field]: value }));
        setSubmitError(null);
    };

    const handleSubmit = async () => {
        setSaving(true);
        setSubmitError(null);
        try {
            await updateSession(session.id, {
                title: formData.title,
                description: formData.description,
                venue: formData.venue,
            });
            router.push(`/sessions/${session.id}`);
        } catch (err) {
            setSubmitError(
                extractErrorMessage(
                    err as ApiError,
                    'Failed to save session details.',
                ),
            );
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="space-y-6">
            <Card>
                <div className="space-y-4 p-5">
                    <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4">
                        <CalendarClock className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
                        <div className="space-y-1 text-sm text-amber-800">
                            <p className="font-medium text-amber-900">Schedule changes are handled separately</p>
                            <p>
                                This form only updates harmless lesson metadata. To change the lesson date, time,
                                cohort participation, or practical setup, return to the lesson workspace and use the
                                reschedule flow.
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 text-sm text-gray-700 md:grid-cols-2">
                        <div>
                            <p className="text-xs text-gray-500">Cohort</p>
                            <p className="font-medium text-gray-900">{session.cohort_name}</p>
                        </div>
                        <div>
                            <p className="text-xs text-gray-500">Subject</p>
                            <p className="font-medium text-gray-900">{session.subject_name}</p>
                        </div>
                        <div>
                            <p className="text-xs text-gray-500">Lesson date</p>
                            <p className="font-medium text-gray-900">{session.session_date}</p>
                        </div>
                        <div>
                            <p className="text-xs text-gray-500">Lesson time</p>
                            <p className="font-medium text-gray-900">
                                {[session.start_time, session.end_time].filter(Boolean).join(' - ') || 'Not scheduled'}
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-3">
                        <Link href={`/sessions/${session.id}`}>
                            <Button variant="secondary" size="sm">Return to lesson workspace</Button>
                        </Link>
                    </div>
                </div>
            </Card>

            <Card>
                <div className="space-y-5 p-5">
                    <Input
                        label="Lesson Title"
                        value={formData.title}
                        onChange={(event) => handleChange('title', event.target.value)}
                        placeholder="e.g. Introduction to Algebra"
                    />

                    <Input
                        label="Venue"
                        value={formData.venue}
                        onChange={(event) => handleChange('venue', event.target.value)}
                        placeholder="e.g. Room 101, Lab 2"
                    />

                    <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700">
                            Description <span className="font-normal text-gray-400">(optional)</span>
                        </label>
                        <textarea
                            value={formData.description}
                            onChange={(event) => handleChange('description', event.target.value)}
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            rows={4}
                            placeholder="Lesson notes, venue details, or brief context..."
                        />
                    </div>
                </div>
            </Card>

            {submitError ? (
                <div ref={submitErrorRef}>
                    <ErrorBanner
                        message={submitError}
                        onDismiss={() => setSubmitError(null)}
                    />
                </div>
            ) : null}

            <div className="sticky bottom-0 z-10 border-t border-gray-200 bg-white/95 px-1 py-4 backdrop-blur">
                <div className="mx-auto flex max-w-5xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
                    <Link href={`/sessions/${session.id}`}>
                        <Button variant="secondary" className="w-full sm:w-auto">Cancel</Button>
                    </Link>
                    <Button
                        variant="primary"
                        onClick={() => {
                            void handleSubmit();
                        }}
                        disabled={saving}
                        className="w-full sm:w-auto"
                    >
                        <Save className="h-4 w-4" />
                        {saving ? 'Saving...' : 'Save metadata'}
                    </Button>
                </div>
            </div>
        </div>
    );
}
