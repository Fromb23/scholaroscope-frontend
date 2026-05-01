'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useMemo, useState } from 'react';
import { ArrowLeft, BookOpen, Calendar, Clock, GraduationCap, MapPin, Workflow } from 'lucide-react';
import { Badge } from '@/app/components/ui/Badge';
import { Button } from '@/app/components/ui/Button';
import { Card } from '@/app/components/ui/Card';
import { ErrorBanner } from '@/app/components/ui/ErrorBanner';
import { LoadingSpinner } from '@/app/components/ui/LoadingSpinner';
import { useSessionDetail } from '@/app/core/hooks/useSessions';
import { isCambridgeCurriculum } from '@/app/core/lib/curriculumBridge';
import { PermissionGuard } from '@/app/core/guards/PermissionGuard';
import { TenantGuard } from '@/app/core/guards/TenantGuard';
import { AssessmentComponentList } from '../components/AssessmentComponentList';
import { CambridgeBreadcrumb } from '../components/CambridgeNavigation';
import { LearningTree } from '../components/LearningTree';
import {
    useCambridgeAssessmentUnits,
    useCambridgeBrowserSubjects,
    useCambridgeLearningUnits,
    useCambridgeOffering,
    useCambridgeProgressDetail,
    useCambridgeSubject,
} from '../hooks';

export default function CambridgeTeachingSessionPage() {
    const { sessionId: rawSessionId } = useParams<{ sessionId: string }>();
    const sessionId = Number(rawSessionId ?? 0);
    const [errorVisible, setErrorVisible] = useState(true);

    const { session, loading: sessionLoading, error: sessionError } = useSessionDetail(sessionId, '', 1, 1);

    const installationSubjectId =
        session?.subject_source === 'cambridge' && session.subject_id ? session.subject_id : null;

    const {
        data: installationSubject,
        isLoading: installationSubjectLoading,
        error: installationSubjectError,
    } = useCambridgeSubject(installationSubjectId);
    const {
        data: normalizedSubjects = [],
        isLoading: normalizedSubjectsLoading,
        error: normalizedSubjectsError,
    } = useCambridgeBrowserSubjects();
    const {
        data: offering,
        isLoading: offeringLoading,
        error: offeringError,
    } = useCambridgeOffering(session?.offering_id ?? null);

    const normalizedSubject = useMemo(() => {
        if (!installationSubject) return null;
        return normalizedSubjects.find((item) => item.subject_id === installationSubject.subject_id) ?? null;
    }, [installationSubject, normalizedSubjects]);

    const normalizedSubjectId = normalizedSubject?.id ?? null;

    const {
        data: units = [],
        isLoading: unitsLoading,
        error: unitsError,
    } = useCambridgeLearningUnits(normalizedSubjectId);
    const {
        data: assessmentUnits = [],
        isLoading: assessmentUnitsLoading,
        error: assessmentUnitsError,
    } = useCambridgeAssessmentUnits(normalizedSubjectId);
    const {
        data: progress,
        isLoading: progressLoading,
        error: progressError,
    } = useCambridgeProgressDetail(normalizedSubjectId);

    const loading =
        sessionLoading ||
        installationSubjectLoading ||
        normalizedSubjectsLoading ||
        offeringLoading ||
        unitsLoading ||
        assessmentUnitsLoading ||
        progressLoading;

    const hasError =
        sessionError ||
        installationSubjectError ||
        normalizedSubjectsError ||
        offeringError ||
        unitsError ||
        assessmentUnitsError ||
        progressError;

    const sharedSessionHref = session ? `/sessions/${session.id}` : '/sessions';
    const isCambridgeSession = Boolean(session && isCambridgeCurriculum(session));

    return (
        <TenantGuard>
            <PermissionGuard allowedRoles={['ADMIN', 'INSTRUCTOR']}>
                <div className="space-y-6">
                    <div className="flex flex-wrap items-center gap-3">
                        <Link href={sharedSessionHref}>
                            <Button variant="ghost" size="sm">
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                Shared Session
                            </Button>
                        </Link>
                        <Link href="/sessions">
                            <Button variant="ghost" size="sm">All Sessions</Button>
                        </Link>
                    </div>

                    <CambridgeBreadcrumb
                        segments={[
                            { label: 'Sessions', href: '/sessions' },
                            session ? { label: session.subject_name || `Session ${session.id}`, href: sharedSessionHref } : { label: 'Session' },
                            { label: 'Cambridge Teaching' },
                        ]}
                    />

                    {loading ? <LoadingSpinner fullScreen={false} message="Loading Cambridge teaching session..." /> : null}

                    {hasError && errorVisible ? (
                        <ErrorBanner
                            message="Failed to load one or more Cambridge teaching resources for this session."
                            onDismiss={() => setErrorVisible(false)}
                        />
                    ) : null}

                    {!loading && !session ? (
                        <Card>
                            <h2 className="font-semibold text-gray-900">Session not found</h2>
                            <p className="mt-2 text-sm text-gray-600">
                                The shared session record is unavailable or outside your visible scope.
                            </p>
                        </Card>
                    ) : null}

                    {!loading && session && !isCambridgeSession ? (
                        <Card>
                            <h2 className="font-semibold text-gray-900">Cambridge workflow unavailable</h2>
                            <p className="mt-2 text-sm text-gray-600">
                                This session does not belong to the Cambridge curriculum. Use the shared session page for kernel workflows.
                            </p>
                        </Card>
                    ) : null}

                    {!loading && session && isCambridgeSession ? (
                        <>
                            <Card>
                                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <h1 className="text-xl font-semibold text-gray-900">{session.subject_name}</h1>
                                            <Badge variant="blue">Cambridge Teaching</Badge>
                                            <Badge variant="default">{session.session_type_display}</Badge>
                                        </div>
                                        <p className="mt-1 text-sm text-gray-600">
                                            {session.cohort_name} · {offering?.programme_code ?? session.curriculum_name}
                                        </p>
                                        <div className="mt-4 grid grid-cols-1 gap-2 text-sm text-gray-600 sm:grid-cols-2">
                                            <div className="flex items-center gap-2">
                                                <Calendar className="h-4 w-4 shrink-0 text-gray-400" />
                                                {session.session_date}
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Clock className="h-4 w-4 shrink-0 text-gray-400" />
                                                {session.start_time ?? '—'} - {session.end_time ?? '—'}
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <GraduationCap className="h-4 w-4 shrink-0 text-gray-400" />
                                                {installationSubject?.display_name ?? session.subject_name}
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <MapPin className="h-4 w-4 shrink-0 text-gray-400" />
                                                {session.venue || 'Venue not set'}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex w-full flex-col gap-2 sm:w-auto">
                                        <Link href={sharedSessionHref} className="w-full sm:w-auto">
                                            <Button variant="secondary" size="sm" className="w-full sm:w-auto">
                                                View Shared Session
                                            </Button>
                                        </Link>
                                        {installationSubject ? (
                                            <Link href={`/cambridge/subjects/${installationSubject.id}`} className="w-full sm:w-auto">
                                                <Button variant="ghost" size="sm" className="w-full sm:w-auto">
                                                    Subject Detail
                                                </Button>
                                            </Link>
                                        ) : null}
                                    </div>
                                </div>
                            </Card>

                            {!normalizedSubject ? (
                                <Card>
                                    <h2 className="font-semibold text-gray-900">No normalized Cambridge subject</h2>
                                    <p className="mt-2 text-sm text-gray-600">
                                        This session does not yet resolve to a normalized Cambridge subject, so learning units are not available in the teaching workspace.
                                    </p>
                                </Card>
                            ) : (
                                <>
                                    <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
                                        <Card className="xl:col-span-1">
                                            <div className="flex items-center gap-2">
                                                <Workflow className="h-5 w-5 text-blue-600" />
                                                <h2 className="font-semibold text-gray-900">Progress Snapshot</h2>
                                            </div>
                                            <div className="mt-4 space-y-3 text-sm text-gray-600">
                                                <p>
                                                    <span className="font-medium text-gray-900">{normalizedSubject.title}</span>
                                                </p>
                                                <p>{normalizedSubject.programme_code} · {normalizedSubject.structure_mode}</p>
                                                <p>{normalizedSubject.learning_unit_count} learning units</p>
                                                <p>{normalizedSubject.assessment_unit_count} assessment units</p>
                                                {progress ? (
                                                    <p>
                                                        {progress.covered_units}/{progress.total_units} units covered ({progress.progress_percentage}%)
                                                    </p>
                                                ) : (
                                                    <p>Progress has not been computed yet for this subject.</p>
                                                )}
                                            </div>
                                        </Card>

                                        <Card className="xl:col-span-2">
                                            <div className="flex items-center gap-2 mb-3">
                                                <BookOpen className="h-5 w-5 text-blue-600" />
                                                <h2 className="font-semibold text-gray-900">Learning Units</h2>
                                            </div>
                                            {units.length === 0 ? (
                                                <p className="text-sm text-gray-600">No normalized learning units are available for this subject.</p>
                                            ) : (
                                                <div className="overflow-x-auto">
                                                    <div className="min-w-[280px]">
                                                        <LearningTree units={units} />
                                                    </div>
                                                </div>
                                            )}
                                        </Card>
                                    </div>

                                    <Card>
                                        <div className="flex items-center gap-2 mb-3">
                                            <Workflow className="h-5 w-5 text-blue-600" />
                                            <h2 className="font-semibold text-gray-900">Assessment Components</h2>
                                        </div>
                                        {assessmentUnits.length === 0 ? (
                                            <p className="text-sm text-gray-600">
                                                No Cambridge assessment components are available for this subject.
                                            </p>
                                        ) : (
                                            <AssessmentComponentList components={assessmentUnits} />
                                        )}
                                    </Card>
                                </>
                            )}
                        </>
                    ) : null}
                </div>
            </PermissionGuard>
        </TenantGuard>
    );
}
