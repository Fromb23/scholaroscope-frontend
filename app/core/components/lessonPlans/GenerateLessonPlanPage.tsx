'use client';

import type { FormEvent } from 'react';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Bot, FileText } from 'lucide-react';
import { Button } from '@/app/components/ui/Button';
import { Card } from '@/app/components/ui/Card';
import { ErrorBanner } from '@/app/components/ui/ErrorBanner';
import { ErrorState } from '@/app/components/ui/ErrorState';
import { LoadingSpinner } from '@/app/components/ui/LoadingSpinner';
import { Select } from '@/app/components/ui/Select';
import { useGenerateLessonPlan } from '@/app/core/hooks/useLessonPlans';
import { useSessions } from '@/app/core/hooks/useSessions';
import type { Session } from '@/app/core/types/session';

function formatSessionDate(value: string): string {
    return new Date(value).toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    });
}

function formatSessionOption(session: Session): string {
    const parts = [
        session.title || session.subject_name,
        formatSessionDate(session.session_date),
        session.cohort_name,
        session.subject_name,
        session.status,
    ].filter(Boolean);

    return parts.join(' · ');
}

function compareSessions(left: Session, right: Session): number {
    const leftTimestamp = new Date(`${left.session_date}T${left.start_time ?? '00:00:00'}`).getTime();
    const rightTimestamp = new Date(`${right.session_date}T${right.start_time ?? '00:00:00'}`).getTime();
    return leftTimestamp - rightTimestamp;
}

export function GenerateLessonPlanPage() {
    const router = useRouter();
    const { sessions, loading: sessionsLoading, error: sessionsError, refetch: refetchSessions } = useSessions();
    const { generateLessonPlan, submitting, error, clearError } = useGenerateLessonPlan();
    const [selectedSessionId, setSelectedSessionId] = useState('');
    const [forceRegenerate, setForceRegenerate] = useState(false);

    const sortedSessions = useMemo(
        () => [...sessions].sort(compareSessions),
        [sessions]
    );
    const selectedSession = sortedSessions.find(
        (session) => String(session.id) === selectedSessionId
    );

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (!selectedSessionId) {
            return;
        }

        try {
            const response = await generateLessonPlan({
                session_id: Number(selectedSessionId),
                force_regenerate: forceRegenerate,
                use_ai: false,
            });

            router.push(
                `/lesson-plans/${response.lesson_plan.id}?notice=${
                    response.created ? 'generated' : 'existing'
                }&references=${response.selected_references_count}`
            );
        } catch {
            return;
        }
    };

    if (sessionsLoading && sessions.length === 0) {
        return <LoadingSpinner message="Loading sessions..." fullScreen={false} />;
    }

    if (sessionsError && sessions.length === 0) {
        return (
            <ErrorState
                fullScreen={false}
                message={sessionsError}
                onRetry={() => {
                    void refetchSessions();
                }}
            />
        );
    }

    return (
        <div className="space-y-6">
            <div className="space-y-3">
                <Link href="/lesson-plans">
                    <Button variant="ghost" size="sm">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back
                    </Button>
                </Link>

                <div>
                    <h1 className="text-2xl font-semibold text-gray-900">Generate Lesson Plan</h1>
                    <p className="mt-1 text-gray-600">
                        Generate a lesson plan from a session.
                    </p>
                    <p className="mt-1 text-sm text-gray-500">
                        The plan will use the session context and any aligned reference materials.
                    </p>
                </div>
            </div>

            {error ? (
                <ErrorBanner message={error} onDismiss={clearError} />
            ) : null}

            {sortedSessions.length === 0 ? (
                <Card>
                    <div className="py-10 text-center">
                        <FileText className="mx-auto h-12 w-12 text-gray-400" />
                        <h2 className="mt-3 text-base font-semibold text-gray-900">No sessions are available</h2>
                        <p className="mt-2 text-sm text-gray-500">
                            No sessions are available for lesson planning yet.
                        </p>
                    </div>
                </Card>
            ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                    <Card>
                        <div className="space-y-5">
                            <Select
                                label="Session"
                                value={selectedSessionId}
                                onChange={(event) => setSelectedSessionId(event.target.value)}
                                options={[
                                    { value: '', label: 'Select a session' },
                                    ...sortedSessions.map((session) => ({
                                        value: String(session.id),
                                        label: formatSessionOption(session),
                                    })),
                                ]}
                            />

                            {selectedSession ? (
                                <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700">
                                    <p className="font-semibold text-gray-900">
                                        {selectedSession.title || selectedSession.subject_name}
                                    </p>
                                    <p className="mt-1">
                                        {formatSessionDate(selectedSession.session_date)} · {selectedSession.cohort_name} · {selectedSession.subject_name}
                                    </p>
                                    <p className="mt-1 text-gray-500">
                                        Status: {selectedSession.status}
                                    </p>
                                </div>
                            ) : null}

                            <label className="flex items-start gap-3 rounded-lg border border-gray-200 p-4">
                                <input
                                    type="checkbox"
                                    checked={forceRegenerate}
                                    onChange={(event) => setForceRegenerate(event.target.checked)}
                                    className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                                <span className="space-y-1 text-sm text-gray-700">
                                    <span className="block font-medium text-gray-900">Force regenerate</span>
                                    <span className="block text-gray-500">
                                        Create a fresh plan even if the session already has one.
                                    </span>
                                </span>
                            </label>

                            <label className="flex items-start gap-3 rounded-lg border border-gray-200 bg-gray-50 p-4">
                                <input
                                    type="checkbox"
                                    checked={false}
                                    disabled
                                    className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600"
                                />
                                <span className="space-y-1 text-sm text-gray-700">
                                    <span className="flex items-center gap-2 font-medium text-gray-900">
                                        <Bot className="h-4 w-4 text-gray-500" />
                                        Use AI when available
                                    </span>
                                    <span className="block text-gray-500">
                                        AI generation is not active yet. This option is shown for the backend contract and will stay off for now.
                                    </span>
                                </span>
                            </label>
                        </div>
                    </Card>

                    <div className="flex flex-wrap items-center justify-end gap-3">
                        <Link href="/lesson-plans">
                            <Button type="button" variant="secondary">
                                Cancel
                            </Button>
                        </Link>
                        <Button type="submit" disabled={submitting || !selectedSessionId}>
                            {submitting ? 'Generating...' : 'Generate Lesson Plan'}
                        </Button>
                    </div>
                </form>
            )}
        </div>
    );
}
