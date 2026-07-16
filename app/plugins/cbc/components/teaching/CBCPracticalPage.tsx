'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';

import { Badge } from '@/app/components/ui/Badge';
import { Button } from '@/app/components/ui/Button';
import { ErrorBanner } from '@/app/components/ui/ErrorBanner';
import { LoadingSpinner } from '@/app/components/ui/LoadingSpinner';
import { sessionAPI } from '@/app/core/api/sessions';
import { useSessionDetail } from '@/app/core/hooks/useSessions';
import type {
    FineArtsPracticalContract,
    MusicPracticalContract,
    PracticalProfileKey,
} from '@/app/core/types/session';
import { resolveErrorMessage, type ApiError } from '@/app/core/types/errors';
import { CBCBreadcrumb, CBCNav } from '@/app/plugins/cbc/components/CBCComponents';
import { FineArtsPracticalRequirementsCard } from '@/app/plugins/cbc/components/fineArts/FineArtsPracticalRequirementsCard';
import { MusicPracticalRequirementsCard } from '@/app/plugins/cbc/components/practicals/MusicPracticalRequirementsCard';
import { useSessionCbcPracticalProfile } from '@/app/plugins/cbc/hooks/usePracticalProfiles';
import { sanitizeAppDestination } from '@/app/core/auth/navigation';

function withQueryParams(href: string, params: Record<string, string | null | undefined>) {
    const [basePath, existingQuery = ''] = href.split('?', 2);
    const searchParams = new URLSearchParams(existingQuery);

    Object.entries(params).forEach(([key, value]) => {
        if (value) {
            searchParams.set(key, value);
        } else {
            searchParams.delete(key);
        }
    });

    return searchParams.size > 0 ? `${basePath}?${searchParams.toString()}` : basePath;
}

export function CBCPracticalPage() {
    const { sessionId: sessionIdRaw } = useParams<{ sessionId: string }>();
    const sessionId = Number(sessionIdRaw);
    const router = useRouter();
    const searchParams = useSearchParams();
    const action = searchParams.get('action');
    const returnTo = sanitizeAppDestination(
        searchParams.get('returnTo'),
        `/sessions/${sessionId}?section=complete`,
    );
    const { session, closureState, loading, error, refetch, refetchClosureState } = useSessionDetail(sessionId);
    const practicalProfileQuery = useSessionCbcPracticalProfile(sessionId, Boolean(session));
    const [completionPending, setCompletionPending] = useState(false);
    const [completionError, setCompletionError] = useState<string | null>(null);

    const backHref = useMemo(
        () => withQueryParams(returnTo, { notice: null }),
        [returnTo],
    );
    const completionReturnHref = useMemo(
        () => withQueryParams(returnTo, { notice: 'lesson-closed' }),
        [returnTo],
    );
    const incompleteReturnHref = useMemo(
        () => withQueryParams(returnTo, {
            notice: 'evidence-recorded-next-close',
            section: 'complete',
        }),
        [returnTo],
    );

    const handleCloseLesson = async () => {
        try {
            setCompletionPending(true);
            setCompletionError(null);
            const updatedSession = await sessionAPI.complete(sessionId);

            if (updatedSession.status === 'COMPLETED') {
                router.push(completionReturnHref);
                return;
            }

            router.push(incompleteReturnHref);
        } catch (mutationError) {
            setCompletionError(
                resolveErrorMessage(mutationError as ApiError, 'We could not close the lesson record.'),
            );
        } finally {
            setCompletionPending(false);
        }
    };

    if (loading && !session) {
        return <LoadingSpinner message="Loading practical workflow..." fullScreen={false} />;
    }

    if (error) {
        return <ErrorBanner message={error} onDismiss={() => {}} />;
    }

    if (!session) {
        return <div className="p-6 text-sm theme-muted">Session not found.</div>;
    }

    if (practicalProfileQuery.isLoading && !practicalProfileQuery.data) {
        return <LoadingSpinner message="Loading practical profile..." fullScreen={false} />;
    }

    if (practicalProfileQuery.error) {
        return (
            <ErrorBanner
                message={resolveErrorMessage(practicalProfileQuery.error as ApiError, 'We could not load the practical profile.')}
                onDismiss={() => {}}
            />
        );
    }

    if (!practicalProfileQuery.data?.is_cbc_practical || !practicalProfileQuery.data.profile) {
        return (
            <ErrorBanner
                message="This session is not a CBC practical session."
                onDismiss={() => {}}
            />
        );
    }

    const practicalProfile = practicalProfileQuery.data.profile;
    const practicalProfileKey = practicalProfile.key as PracticalProfileKey;
    const canEdit = session.status === 'IN_PROGRESS';
    const canClose = canEdit && Boolean(closureState?.ready);
    const guidedMode = action === 'record-evidence' || closureState?.next_step === 'EVIDENCE';

    return (
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 pb-8">
            <div className="space-y-4">
                <Link href={backHref}>
                    <Button variant="ghost" size="sm">
                        <ArrowLeft className="h-4 w-4" />
                        Back to lesson workspace
                    </Button>
                </Link>

                <CBCNav />
                <CBCBreadcrumb
                    segments={[
                        { label: 'Teaching', href: '/cbc/teaching' },
                        { label: 'My Lessons', href: '/cbc/teaching/sessions' },
                        { label: session.title || session.subject_name || `Session ${session.id}`, href: returnTo },
                        { label: practicalProfile.label },
                    ]}
                />

                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <h1 className="text-2xl font-semibold theme-text">{practicalProfile.label}</h1>
                        </div>
                        <p className="text-sm theme-muted">
                            {guidedMode
                                ? 'Follow the next required practical evidence step, then return to the lesson workspace for any remaining closure action.'
                                : 'Keep the practical inside the normal session chain: attendance, confirmed outcomes, learner evidence, then closure.'}
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <Badge variant="blue">{session.session_type_display}</Badge>
                        <Badge variant={session.status === 'COMPLETED' ? 'green' : session.status === 'IN_PROGRESS' ? 'yellow' : 'default'}>
                            {session.status === 'IN_PROGRESS' ? 'In progress' : session.status}
                        </Badge>
                    </div>
                </div>
            </div>

            {completionError ? (
                <ErrorBanner
                    message={completionError}
                    onDismiss={() => setCompletionError(null)}
                />
            ) : null}

            {practicalProfileKey === 'FINE_ARTS' ? (
                <FineArtsPracticalRequirementsCard
                    sessionId={session.id}
                    editable={canEdit}
                    guidedMode={guidedMode}
                    onStateChange={async () => {
                        await Promise.all([
                            refetch(),
                            refetchClosureState(),
                            practicalProfileQuery.refetch(),
                        ]);
                    }}
                    footer={(
                        <div className="flex flex-col gap-3 border-t pt-4 theme-border sm:flex-row sm:items-center sm:justify-between">
                            <p className="text-sm theme-muted">
                                {closureState?.ready
                                    ? 'Required practical evidence is complete. You can now close the lesson record.'
                                    : closureState?.next_step === 'REFLECTION'
                                        ? 'Required practical evidence is complete. Return to the lesson workspace to add the lesson reflection.'
                                        : (practicalProfileQuery.data.contract as FineArtsPracticalContract | null)?.message ?? 'Resolve the task and record the required evidence before closing the lesson.'}
                            </p>
                            <div className="flex flex-col gap-3 sm:flex-row">
                                <Link href={backHref}>
                                    <Button variant="secondary">Return to lesson workspace</Button>
                                </Link>
                                {session.status === 'IN_PROGRESS' ? (
                                    <Button
                                        type="button"
                                        onClick={() => {
                                            void handleCloseLesson();
                                        }}
                                        disabled={!canClose || completionPending}
                                    >
                                        <CheckCircle2 className="h-4 w-4" />
                                        {completionPending ? 'Closing...' : 'Close lesson record'}
                                    </Button>
                                ) : null}
                            </div>
                        </div>
                    )}
                />
            ) : (
                <MusicPracticalRequirementsCard
                    sessionId={session.id}
                    editable={canEdit}
                    actorCanRecord={practicalProfile.actor_can_record}
                    readOnlyMessage={practicalProfile.read_only_message}
                    initialContract={(practicalProfileQuery.data.contract as MusicPracticalContract | null) ?? null}
                    onStateChange={async () => {
                        await Promise.all([
                            refetch(),
                            refetchClosureState(),
                            practicalProfileQuery.refetch(),
                        ]);
                    }}
                    footer={(
                        <div className="flex flex-col gap-3 border-t pt-4 theme-border sm:flex-row sm:items-center sm:justify-between">
                            <p className="text-sm theme-muted">
                                {closureState?.ready
                                    ? 'Required Music practical evidence is complete. You can now close the lesson record.'
                                    : closureState?.next_step === 'REFLECTION'
                                        ? 'Required Music practical evidence is complete. Return to the lesson workspace to add the lesson reflection.'
                                        : (practicalProfileQuery.data.contract as MusicPracticalContract | null)?.message ?? 'Resolve the task and record learner evidence before closing the lesson.'}
                            </p>
                            <div className="flex flex-col gap-3 sm:flex-row">
                                <Link href={backHref}>
                                    <Button variant="secondary">Return to lesson workspace</Button>
                                </Link>
                                {session.status === 'IN_PROGRESS' ? (
                                    <Button
                                        type="button"
                                        onClick={() => {
                                            void handleCloseLesson();
                                        }}
                                        disabled={!canClose || completionPending}
                                    >
                                        <CheckCircle2 className="h-4 w-4" />
                                        {completionPending ? 'Closing...' : 'Close lesson record'}
                                    </Button>
                                ) : null}
                            </div>
                        </div>
                    )}
                />
            )}
        </div>
    );
}
