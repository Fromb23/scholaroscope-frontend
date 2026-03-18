'use client';
// ============================================================================
// app/(dashboard)/requests/new/page.tsx
// Instructor → submit to Admin
// Admin → submit to SuperAdmin
// Type options change based on role automatically
// ============================================================================

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Send, AlertTriangle, CheckCircle } from 'lucide-react';
import { useAuth } from '@/app/context/AuthContext';
import { requestsAPI } from '@/app/plugins/requests/api/requests';
import { Button } from '@/app/components/ui/Button';
import { Input } from '@/app/components/ui/Input';
import { Select } from '@/app/components/ui/Select';
import { Card, CardHeader, CardTitle, CardContent } from '@/app/components/ui/Card';
import {
    INSTRUCTOR_REQUEST_OPTIONS, ADMIN_REQUEST_OPTIONS,
    RequestType, RequestPriority,
} from '@/app/plugins/requests/types/requests';

interface FormData {
    title: string;
    description: string;
    request_type: string;
    priority: string;
}

const EMPTY: FormData = {
    title: '', description: '', request_type: '', priority: 'NORMAL',
};

export default function NewRequestPage() {
    const router = useRouter();
    const { user } = useAuth();

    const [form, setForm] = useState<FormData>(EMPTY);
    const [errors, setErrors] = useState<Partial<FormData>>({});
    const [submitting, setSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [submitted, setSubmitted] = useState(false);

    const isAdmin = activeRole === 'ADMIN';
    const isInstructor = activeRole === 'INSTRUCTOR';

    const typeOptions = isAdmin ? ADMIN_REQUEST_OPTIONS : INSTRUCTOR_REQUEST_OPTIONS;

    const set = (field: keyof FormData, val: string) => {
        setForm(p => ({ ...p, [field]: val }));
        if (errors[field]) setErrors(p => ({ ...p, [field]: '' }));
    };

    const validate = () => {
        const e: Partial<FormData> = {};
        if (!form.title.trim()) e.title = 'Title is required';
        if (!form.description.trim()) e.description = 'Description is required';
        if (!form.request_type) e.request_type = 'Request type is required';
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const handleSubmit = async () => {
        if (!validate()) return;
        setSubmitting(true);
        setSubmitError(null);
        try {
            await requestsAPI.create({
                title: form.title,
                description: form.description,
                request_type: form.request_type as RequestType,
                priority: form.priority as RequestPriority,
            });
            setSubmitted(true);
        } catch (err: any) {
            setSubmitError(
                err.response?.data?.request_type?.[0] ||
                err.response?.data?.detail ||
                err.message || 'Failed to submit request'
            );
        } finally {
            setSubmitting(false);
        }
    };

    // ── Success screen ────────────────────────────────────────────────────────
    if (submitted) {
        return (
            <div className="max-w-lg mx-auto mt-16 text-center space-y-6">
                <div className="h-16 w-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                    <CheckCircle className="h-8 w-8 text-green-600" />
                </div>
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Request Submitted</h2>
                    <p className="text-gray-500 mt-2">
                        {isAdmin
                            ? 'Your request has been sent to the platform SuperAdmin for review.'
                            : 'Your request has been sent to your organization Admin for review.'
                        }
                    </p>
                    <p className="text-sm text-gray-400 mt-1">
                        You will be notified when the status changes.
                    </p>
                </div>
                <div className="flex justify-center gap-3">
                    <Button variant="secondary" onClick={() => { setForm(EMPTY); setSubmitted(false); }}>
                        Submit Another
                    </Button>
                    <Button variant="primary" onClick={() => router.push('/requests')}>
                        View My Requests
                    </Button>
                </div>
            </div>
        );
    }

    // ── Destination label ─────────────────────────────────────────────────────
    const destinationLabel = isAdmin
        ? 'SuperAdmin (Platform Level)'
        : `${user?.organization_name ?? 'Your Organization'} Admin`;

    const destinationColor = isAdmin
        ? 'bg-purple-50 border-purple-200 text-purple-800'
        : 'bg-blue-50 border-blue-200 text-blue-800';

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            {/* Back */}
            <button
                onClick={() => router.back()}
                className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition-colors"
            >
                <ArrowLeft className="h-4 w-4" /> Back to Requests
            </button>

            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Submit a Request</h1>
                <p className="text-sm text-gray-500 mt-1">
                    {isAdmin
                        ? 'Submit an escalation or support request to the platform team'
                        : 'Submit a request to your organization admin for approval'
                    }
                </p>
            </div>

            {/* Destination indicator */}
            <div className={`flex items-center gap-2 px-4 py-3 rounded-lg border text-sm font-medium ${destinationColor}`}>
                <Send className="h-4 w-4" />
                This request will be sent to: <strong>{destinationLabel}</strong>
            </div>

            {/* Form */}
            <Card>
                <CardHeader><CardTitle>Request Details</CardTitle></CardHeader>
                <CardContent>
                    <div className="space-y-5">
                        {/* Type + Priority */}
                        <div className="grid grid-cols-2 gap-4">
                            <Select
                                label="Request Type *"
                                value={form.request_type}
                                onChange={e => set('request_type', e.target.value)}
                                error={errors.request_type}
                                options={[
                                    { value: '', label: 'Select type...' },
                                    ...typeOptions.map(o => ({ value: o.value, label: o.label })),
                                ]}
                            />
                            <Select
                                label="Priority"
                                value={form.priority}
                                onChange={e => set('priority', e.target.value)}
                                options={[
                                    { value: 'LOW', label: 'Low' },
                                    { value: 'NORMAL', label: 'Normal' },
                                    { value: 'HIGH', label: 'High' },
                                    { value: 'URGENT', label: 'Urgent' },
                                ]}
                            />
                        </div>

                        <Input
                            label="Title *"
                            value={form.title}
                            onChange={e => set('title', e.target.value)}
                            error={errors.title}
                            placeholder="Brief summary of your request"
                        />

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Description *
                            </label>
                            <textarea
                                value={form.description}
                                onChange={e => set('description', e.target.value)}
                                placeholder="Provide as much detail as possible. Include any relevant IDs, names, or context..."
                                rows={6}
                                className={`w-full rounded-lg border px-4 py-2 text-sm focus:outline-none focus:ring-2 resize-none ${errors.description
                                    ? 'border-red-300 focus:ring-red-500'
                                    : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
                                    }`}
                            />
                            {errors.description && (
                                <p className="mt-1 text-sm text-red-600">{errors.description}</p>
                            )}
                        </div>

                        {/* Priority guide */}
                        <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                            <p className="text-xs font-semibold text-gray-600 mb-1.5">Priority Guide</p>
                            <div className="grid grid-cols-2 gap-x-6 gap-y-0.5 text-xs text-gray-500">
                                <span><strong className="text-gray-700">Low:</strong> Non-blocking, informational</span>
                                <span><strong className="text-gray-700">Normal:</strong> Needs attention, not urgent</span>
                                <span><strong className="text-gray-700">High:</strong> Affecting workflow</span>
                                <span><strong className="text-gray-700">Urgent:</strong> Blocking operations</span>
                            </div>
                        </div>

                        {/* Error */}
                        {submitError && (
                            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                                <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                                {submitError}
                            </div>
                        )}

                        {/* Actions */}
                        <div className="flex justify-end gap-3 pt-2">
                            <Button variant="secondary" onClick={() => router.back()} disabled={submitting}>
                                Cancel
                            </Button>
                            <Button
                                variant="primary"
                                onClick={handleSubmit}
                                disabled={submitting}
                                className="gap-2"
                            >
                                <Send className="h-4 w-4" />
                                {submitting ? 'Submitting...' : 'Submit Request'}
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}