'use client';

// ============================================================================
// app/(dashboard)/sessions/[id]/edit/page.tsx
//
// Responsibility: fetch session, handle guards, render EditSessionForm.
// No form logic. No API calls. No validation.
// ============================================================================

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, AlertCircle } from 'lucide-react';
import { Card } from '@/app/components/ui/Card';
import { Button } from '@/app/components/ui/Button';
import { CurriculumLifecycleAccessState } from '@/app/core/components/curriculum/CurriculumLifecycleAccessState';
import { CurriculumLifecycleNotice } from '@/app/core/components/curriculum/CurriculumLifecycleNotice';
import { LoadingSpinner } from '@/app/components/ui/LoadingSpinner';
import { EditSessionForm } from '@/app/core/components/sessions/EditSessionForm';
import { useCurriculumLifecycleGuard } from '@/app/core/hooks/useCurriculumLifecycleGuard';
import { useSessionDetail } from '@/app/core/hooks/useSessions';

export function EditSessionPage() {
    const params = useParams();
    const sessionId = Number(params.id);

    const { session, loading } = useSessionDetail(sessionId, '');
    const lifecycle = useCurriculumLifecycleGuard({
        curriculumType: session?.curriculum_type ?? null,
        routeIntent: 'edit',
        allowWhenNoCurriculum: true,
    });

    // ── Guards ────────────────────────────────────────────────────────────

    if (loading && !session) return <LoadingSpinner />;

    if (!session) {
        return <div className="p-10 text-gray-500">Session not found.</div>;
    }

    // Historical sessions are read-only
    if (!session.is_current_year) {
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
                            <Button variant="secondary" className="mt-2">View Session</Button>
                        </Link>
                    </div>
                </Card>
            </div>
        );
    }

    if (session && !lifecycle.allowed) {
        return (
            <CurriculumLifecycleAccessState
                title="Session editing is unavailable"
                status={lifecycle.curriculum?.offering_status ?? null}
                message={lifecycle.message}
                backHref={`/sessions/${sessionId}`}
                backLabel="View Session"
            />
        );
    }

    // ── Render ────────────────────────────────────────────────────────────

    return (
        <div className="space-y-6">
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

            {lifecycle.curriculum && lifecycle.curriculum.offering_status !== 'ACTIVE' ? (
                <CurriculumLifecycleNotice
                    status={lifecycle.curriculum.offering_status}
                    role={lifecycle.role}
                    title="Session edit status"
                    message={lifecycle.message}
                />
            ) : null}

            <EditSessionForm session={session} />
        </div>
    );
}
