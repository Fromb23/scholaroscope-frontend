'use client';

import { useEffect, useMemo, useState } from 'react';
import Modal from '@/app/components/ui/Modal';
import { Button } from '@/app/components/ui/Button';
import { ErrorBanner } from '@/app/components/ui/ErrorBanner';
import { Input } from '@/app/components/ui/Input';
import { ApiError, extractErrorMessage } from '@/app/core/types/errors';
import type { RescheduleSessionPayload, SessionDetail } from '@/app/core/types/session';

interface RescheduleLessonModalProps {
    isOpen: boolean;
    session: SessionDetail;
    onClose: () => void;
    onSubmit: (payload: RescheduleSessionPayload) => Promise<void>;
}

interface FormErrors {
    session_date?: string;
    start_time?: string;
    end_time?: string;
}

const EMPTY_ERRORS: FormErrors = {};

export function RescheduleLessonModal({
    isOpen,
    session,
    onClose,
    onSubmit,
}: RescheduleLessonModalProps) {
    const initialForm = useMemo<RescheduleSessionPayload>(() => ({
        session_date: session.session_date ?? '',
        start_time: session.start_time ?? '',
        end_time: session.end_time ?? '',
        reason: '',
        venue: session.venue ?? '',
        description: session.description ?? '',
    }), [session]);

    const [formData, setFormData] = useState<RescheduleSessionPayload>(initialForm);
    const [errors, setErrors] = useState<FormErrors>(EMPTY_ERRORS);
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (!isOpen) {
            return;
        }

        setFormData(initialForm);
        setErrors(EMPTY_ERRORS);
        setSubmitError(null);
        setSubmitting(false);
    }, [initialForm, isOpen]);

    const updateField = <K extends keyof RescheduleSessionPayload>(
        field: K,
        value: RescheduleSessionPayload[K],
    ) => {
        setFormData((current) => ({ ...current, [field]: value }));
        if (field === 'session_date' || field === 'start_time' || field === 'end_time') {
            setErrors((current) => ({ ...current, [field]: undefined }));
        }
        if (submitError) {
            setSubmitError(null);
        }
    };

    const validate = () => {
        const nextErrors: FormErrors = {};

        if (!formData.session_date.trim()) {
            nextErrors.session_date = 'Date is required.';
        }
        if (!formData.start_time.trim()) {
            nextErrors.start_time = 'Start time is required.';
        }
        if (!formData.end_time.trim()) {
            nextErrors.end_time = 'End time is required.';
        }
        if (
            formData.start_time.trim()
            && formData.end_time.trim()
            && formData.end_time <= formData.start_time
        ) {
            nextErrors.end_time = 'End time must be later than start time.';
        }

        setErrors(nextErrors);
        return Object.keys(nextErrors).length === 0;
    };

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!validate()) {
            return;
        }

        setSubmitting(true);
        setSubmitError(null);

        try {
            await onSubmit({
                session_date: formData.session_date,
                start_time: formData.start_time,
                end_time: formData.end_time,
                reason: formData.reason?.trim() || undefined,
                venue: formData.venue?.trim() || '',
                description: formData.description?.trim() || '',
            });
            onClose();
        } catch (error) {
            setSubmitError(
                extractErrorMessage(error as ApiError, 'Could not reschedule this lesson.')
            );
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Reschedule Lesson"
            size="md"
        >
            <form className="space-y-4" onSubmit={handleSubmit}>
                <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
                    Update the lesson date and time without changing attendance, taught outcomes, or reporting state.
                </div>

                {submitError ? (
                    <ErrorBanner
                        message={submitError}
                        onDismiss={() => setSubmitError(null)}
                        autoDismissMs={false}
                    />
                ) : null}

                <div className="grid gap-4 sm:grid-cols-3">
                    <Input
                        label="Date"
                        type="date"
                        value={formData.session_date}
                        onChange={(event) => updateField('session_date', event.target.value)}
                        error={errors.session_date}
                    />
                    <Input
                        label="Start time"
                        type="time"
                        value={formData.start_time}
                        onChange={(event) => updateField('start_time', event.target.value)}
                        error={errors.start_time}
                    />
                    <Input
                        label="End time"
                        type="time"
                        value={formData.end_time}
                        onChange={(event) => updateField('end_time', event.target.value)}
                        error={errors.end_time}
                    />
                </div>

                <Input
                    label="Reason"
                    type="text"
                    value={formData.reason ?? ''}
                    onChange={(event) => updateField('reason', event.target.value)}
                    placeholder="Optional"
                />

                <Input
                    label="Venue"
                    type="text"
                    value={formData.venue ?? ''}
                    onChange={(event) => updateField('venue', event.target.value)}
                    placeholder="Optional"
                />

                <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                        Notes
                    </label>
                    <textarea
                        value={formData.description ?? ''}
                        onChange={(event) => updateField('description', event.target.value)}
                        rows={4}
                        className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Optional"
                    />
                </div>

                <div className="flex gap-3 pt-2">
                    <Button
                        type="button"
                        variant="ghost"
                        onClick={onClose}
                        className="flex-1"
                        disabled={submitting}
                    >
                        Cancel
                    </Button>
                    <Button
                        type="submit"
                        className="flex-1"
                        disabled={submitting}
                    >
                        {submitting ? 'Rescheduling...' : 'Save changes'}
                    </Button>
                </div>
            </form>
        </Modal>
    );
}
