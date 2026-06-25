'use client';

// ============================================================================
// app/(dashboard)/academic/curricula/page.tsx
//
// Responsibility: fetch data, handle state, compose components, render.
// No alert(). No any. No inline modal definitions.
// ============================================================================

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, BookOpen, Plus, Edit, Trash2, CheckCircle, PowerOff, Puzzle } from 'lucide-react';
import { AcademicSetupGate } from '@/app/core/components/academic/setup/AcademicSetupGate';
import { useCurricula } from '@/app/core/hooks/useAcademic';
import { useAcademicSetupStatus } from '@/app/core/hooks/useAcademicSetupStatus';
import {
    getAcademicSetupPageState,
    resolveAcademicSetupOrigin,
    withAcademicSetupMode,
} from '@/app/core/lib/academicSetup';
import { Card } from '@/app/components/ui/Card';
import { Button } from '@/app/components/ui/Button';
import { Badge } from '@/app/components/ui/Badge';
import { StatsCard } from '@/app/components/dashboard/StatsCard';
import { LoadingSpinner } from '@/app/components/ui/LoadingSpinner';
import { ErrorBanner } from '@/app/components/ui/ErrorBanner';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/app/components/ui/Table';
import { CurriculumFormModal } from '@/app/core/components/curricula/CurriculumFormModal';
import { CurriculumLifecycleBadge } from '@/app/core/components/curriculum/CurriculumLifecycleBadge';
import { CurriculumLifecycleNotice } from '@/app/core/components/curriculum/CurriculumLifecycleNotice';
import { useScrollIntoViewOnMessage } from '@/app/core/hooks/useScrollIntoViewOnMessage';
import { curriculumAPI, curriculumDisableRequestAPI } from '@/app/core/api/academic';
import { academicKeys } from '@/app/core/lib/queryKeys';
import {
    canCreateCurriculumWork,
    canEditCurriculumWork,
    resolveCurriculumPluginKey,
} from '@/app/core/lib/curriculumLifecycle';
import { extractErrorMessage } from '@/app/core/types/errors';
import type { ApiError } from '@/app/core/types/errors';
import type { Curriculum } from '@/app/core/types/academic';
import type { CurriculumDisableImpactSnapshot } from '@/app/core/types/academic';
import type { CurriculumFormData } from '@/app/core/components/curricula/CurriculumFormModal';
import { DesktopOnly } from '@/app/core/components/DesktopOnly';
import type { CurriculumType } from '@/app/core/types/academic';
import {
    CAMBRIDGE_BRIDGE_NAME,
    getCurriculumBridgeCode,
    getCurriculumBridgeName,
    isCambridgeCurriculumType,
} from '@/app/core/lib/curriculumBridge';
import { useOrganizationContext } from '@/app/context/OrganizationContext';

export function CurriculaPage() {
    const { curricula, loading, refetch, createCurriculum, updateCurriculum, deleteCurriculum } = useCurricula();
    const queryClient = useQueryClient();
    const { organizationId } = useOrganizationContext();
    const router = useRouter();
    const searchParams = useSearchParams();
    const setupStatusQuery = useAcademicSetupStatus({
        enabled: searchParams.get('setup') === '1',
    });

    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState<Curriculum | null>(null);
    const [pageError, setPageError] = useState<string | null>(null);
    const [disablingCurriculum, setDisablingCurriculum] = useState<Curriculum | null>(null);
    const [disableImpact, setDisableImpact] = useState<CurriculumDisableImpactSnapshot | null>(null);
    const [activeDisableRequestId, setActiveDisableRequestId] = useState<number | null>(null);
    const [disableLoading, setDisableLoading] = useState(false);
    const [disableSubmitting, setDisableSubmitting] = useState(false);
    const [disableError, setDisableError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<{ message: string; href?: string; label?: string } | null>(null);

    const activeCurricula = curricula.filter(c => c.is_active);
    const inactiveCurricula = curricula.filter(c => !c.is_active);
    const lifecycleCurricula = curricula.filter((curriculum) => curriculum.offering_status !== 'ACTIVE');
    const shouldOpenCreate = searchParams.get('create') === '1';
    const setupMode = searchParams.get('setup') === '1';
    const blockedNotice = searchParams.get('blocked') === '1';
    const returnTo = searchParams.get('returnTo');
    const setupOriginContext = resolveAcademicSetupOrigin({
        setup: searchParams.get('setup'),
        blocked: searchParams.get('blocked'),
        returnTo,
        origin: searchParams.get('origin'),
        flow: searchParams.get('flow'),
        pluginKey: searchParams.get('pluginKey'),
    });
    const setupStatus = setupStatusQuery.data ?? null;
    const setupPageState = getAcademicSetupPageState(setupStatus, 'CURRICULUM');
    const pageErrorRef = useScrollIntoViewOnMessage(pageError);
    const createInitialData = useMemo<CurriculumFormData>(() => ({
        name: isCambridgeCurriculumType(searchParams.get('curriculum_type')) ? CAMBRIDGE_BRIDGE_NAME : (searchParams.get('name') ?? ''),
        curriculum_type: (searchParams.get('curriculum_type') ?? '') as CurriculumType,
        description: '',
        is_active: true,
    }), [searchParams]);
    const pluginSettingsHeaderHref = setupMode
        ? '/admin/settings?tab=plugins&from=academic-setup'
        : '/admin/settings?tab=plugins&from=curricula';

    const getPluginSettingsHref = (curriculum: Curriculum): string | null => {
        const pluginKey = resolveCurriculumPluginKey(curriculum);

        if (!pluginKey) {
            return null;
        }

        const params = new URLSearchParams({
            tab: 'plugins',
            plugin: pluginKey,
            curriculum: String(curriculum.id),
            from: setupMode ? 'academic-setup' : 'curricula',
        });

        return `/admin/settings?${params.toString()}`;
    };

    const getPluginActionLabel = (curriculum: Curriculum): string | null => {
        if (!resolveCurriculumPluginKey(curriculum)) {
            return null;
        }

        switch (curriculum.offering_status) {
            case 'ACTIVE':
                return 'Manage curriculum engine';
            case 'DISABLE_REQUESTED':
            case 'DRAINING':
            case 'FINALIZING':
                return 'View disable workflow';
            case 'DISABLED':
                return 'Reactivate in Curriculum Settings';
            case 'FAILED':
                return 'Review disable failure';
            case 'REACTIVATING':
                return 'View reactivation progress';
            default:
                return 'Manage curriculum engine';
        }
    };

    const openCreate = () => {
        if (!curricula.some((curriculum) => canCreateCurriculumWork(curriculum))) {
            setPageError('All curricula are currently blocked for new work. Wait until a curriculum returns to Active before creating another one.');
            return;
        }

        setEditing(null);
        setShowModal(true);
    };
    const openEdit = (c: Curriculum) => {
        if (!canEditCurriculumWork(c)) {
            setPageError('This curriculum is not accepting changes right now. Historical records remain readable, but curriculum setup is read-only.');
            return;
        }

        setEditing(c);
        setShowModal(true);
    };
    const clearCreateFlag = () => {
        const params = new URLSearchParams(searchParams.toString());
        params.delete('create');
        const next = params.toString();
        router.replace(next ? `/academic/curricula?${next}` : '/academic/curricula', { scroll: false });
    };
    const closeModal = () => {
        setShowModal(false);
        setEditing(null);
        if (shouldOpenCreate) {
            clearCreateFlag();
        }
    };

    useEffect(() => {
        if (shouldOpenCreate && !editing) {
            setShowModal(true);
        }
    }, [editing, shouldOpenCreate]);

    const handleSave = async (data: CurriculumFormData, editingId?: number) => {
        if (editingId) {
            await updateCurriculum(editingId, data);
        } else {
            await createCurriculum(data);
            if (setupMode) {
                const refreshedStatus = (await setupStatusQuery.refetch()).data;
                router.push(
                    withAcademicSetupMode(
                        refreshedStatus?.next_action.href ?? '/academic/years?create=1',
                    ),
                );
            }
        }
    };

    const handleDelete = async (curriculum: Curriculum) => {
        if (!confirm(`Delete "${getCurriculumBridgeName(curriculum)}"? This will affect all associated subjects and cohorts.`)) return;
        setPageError(null);
        try {
            await deleteCurriculum(curriculum.id);
        } catch (err) {
            setPageError(extractErrorMessage(err as ApiError, 'Failed to delete curriculum.'));
        }
    };

    const openDisable = async (curriculum: Curriculum) => {
        setSuccessMessage(null);
        setDisablingCurriculum(curriculum);
        setDisableImpact(null);
        setActiveDisableRequestId(null);
        setDisableError(null);
        setDisableLoading(true);
        try {
            const response = await curriculumAPI.getDisableImpact(curriculum.id);
            setDisableImpact(response.impact_snapshot);
            setActiveDisableRequestId(response.active_disable_request_id);
        } catch (err) {
            setDisableError(extractErrorMessage(err as ApiError, 'Failed to load disable impact.'));
        } finally {
            setDisableLoading(false);
        }
    };

    const closeDisable = () => {
        if (disableSubmitting) return;
        setDisablingCurriculum(null);
        setDisableImpact(null);
        setActiveDisableRequestId(null);
        setDisableError(null);
    };

    const refreshAcademicState = async () => {
        await Promise.all([
            refetch(),
            setupStatusQuery.refetch(),
            queryClient.invalidateQueries({ queryKey: academicKeys.curricula.all }),
            queryClient.invalidateQueries({ queryKey: academicKeys.setupStatus.detail(organizationId) }),
            queryClient.invalidateQueries({ queryKey: academicKeys.todayMode.detail(organizationId) }),
            queryClient.invalidateQueries({ queryKey: academicKeys.curriculumDisableRequests.all }),
        ]);
        router.refresh();
    };

    const confirmDisable = async () => {
        if (!disablingCurriculum) return;
        setDisableSubmitting(true);
        setDisableError(null);
        try {
            await curriculumAPI.requestDisable(disablingCurriculum.id, {
                mode: 'GRACEFUL',
                confirm: true,
            });
            await refreshAcademicState();
            setDisablingCurriculum(null);
            setDisableImpact(null);
            setActiveDisableRequestId(null);
            setDisableError(null);
            setSuccessMessage({
                message: 'Curriculum shutdown has started. Academic setup has been refreshed.',
            });
        } catch (err) {
            setDisableError(extractErrorMessage(err as ApiError, 'Failed to disable curriculum.'));
        } finally {
            setDisableSubmitting(false);
        }
    };

    const cancelDisable = async () => {
        if (!activeDisableRequestId) return;
        setDisableSubmitting(true);
        setDisableError(null);
        try {
            await curriculumDisableRequestAPI.cancel(activeDisableRequestId);
            await refreshAcademicState();
            setDisablingCurriculum(null);
            setDisableImpact(null);
            setActiveDisableRequestId(null);
            setDisableError(null);
        } catch (err) {
            setDisableError(extractErrorMessage(err as ApiError, 'Failed to cancel curriculum disable.'));
        } finally {
            setDisableSubmitting(false);
        }
    };

    const handleReactivate = async (curriculum: Curriculum) => {
        setPageError(null);
        setSuccessMessage(null);
        try {
            const reactivated = await curriculumAPI.reactivate(curriculum.id);
            await refreshAcademicState();
            setSuccessMessage({
                message: 'CBC has been reactivated. Review subject offerings before creating new academic work.',
                href: `/academic/subjects?curriculum=${reactivated.id}`,
                label: 'Review subject offerings',
            });
        } catch (err) {
            setPageError(extractErrorMessage(err as ApiError, 'Failed to reactivate curriculum.'));
        }
    };

    const impactCounts = disableImpact ? [
        { label: 'Subjects', value: disableImpact.academic_setup?.subject_count ?? 0 },
        { label: 'Cohorts', value: disableImpact.academic_setup?.cohort_count ?? 0 },
        { label: 'Cohort subject assignments', value: disableImpact.academic_setup?.cohort_subject_count ?? 0 },
        { label: 'Sessions requiring completion/cancellation', value: disableImpact.sessions?.requiring_completion_count ?? disableImpact.sessions?.scheduled_total_count ?? 0 },
        { label: 'Open assessments', value: (disableImpact.assessments?.draft_count ?? 0) + (disableImpact.assessments?.active_open_count ?? 0) },
        { label: 'Pending lesson plans', value: (disableImpact.lesson_plans?.draft_count ?? 0) + (disableImpact.lesson_plans?.reviewed_ready_count ?? 0) + (disableImpact.lesson_plans?.scheduled_unused_count ?? 0) },
        { label: 'Affected instructors/admins', value: (disableImpact.users?.affected_instructors?.length ?? 0) + (disableImpact.users?.affected_admins?.length ?? 0) },
    ] : [];

    // ── Shared row actions ────────────────────────────────────────────────

    const RowActions = ({ curriculum }: { curriculum: Curriculum }) => {
        if (curriculum.source === 'plugin') {
            const disablingAllowed = curriculum.offering_status === 'ACTIVE';
            const label = disablingAllowed ? 'Disable curriculum' : 'View disable workflow';
            return (
                <div className="flex flex-wrap gap-2">
                    {curriculum.offering_status === 'DISABLED' ? (
                        <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => handleReactivate(curriculum)}
                        >
                            <CheckCircle className="h-4 w-4" />
                            Reactivate
                        </Button>
                    ) : (
                        <Button
                            size="sm"
                            variant={disablingAllowed ? 'danger' : 'secondary'}
                            onClick={() => openDisable(curriculum)}
                            title={disablingAllowed ? 'Disable this curriculum for the workspace.' : 'View disable impact, progress, and cancellation options.'}
                        >
                            <PowerOff className="h-4 w-4" />
                            {label}
                        </Button>
                    )}
                </div>
            );
        }

        return (
            <div className="flex gap-2">
                <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => openEdit(curriculum)}
                    disabled={!canEditCurriculumWork(curriculum)}
                    title={!canEditCurriculumWork(curriculum) ? 'This curriculum is read-only while the disable lifecycle is in progress.' : undefined}
                >
                    <Edit className="h-4 w-4" />
                </Button>
                <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDelete(curriculum)}
                    disabled={!canEditCurriculumWork(curriculum)}
                    title={!canEditCurriculumWork(curriculum) ? 'This curriculum cannot be deleted while it is read-only.' : undefined}
                >
                    <Trash2 className="h-4 w-4 text-red-600" />
                </Button>
            </div>
        );
    };

    // ── Render ────────────────────────────────────────────────────────────

    if (setupMode && setupStatusQuery.isLoading && !setupStatus) {
        return <LoadingSpinner fullScreen={false} message="Loading academic setup..." />;
    }

    if (setupMode && setupPageState === 'blocked') {
        return (
            <div className="space-y-6">
                <AcademicSetupGate
                    status={setupStatus}
                    stepKey="CURRICULUM"
                    setupMode={setupMode}
                    blockedNotice={blockedNotice}
                />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <AcademicSetupGate
                status={setupStatus}
                stepKey="CURRICULUM"
                setupMode={setupMode}
                blockedNotice={blockedNotice}
            />
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Curricula</h1>
                    <p className="mt-2 text-gray-600">Manage educational curricula and programs</p>
                </div>
                <div className="flex flex-wrap gap-3">
                    <Link href={pluginSettingsHeaderHref}>
                        <Button type="button" variant="secondary">
                            <Puzzle className="mr-2 h-4 w-4" />
                            Curriculum settings
                        </Button>
                    </Link>
                    <Button
                        onClick={openCreate}
                        disabled={!curricula.some((curriculum) => canCreateCurriculumWork(curriculum))}
                    >
                        <Plus className="mr-2 h-4 w-4" />Add Curriculum
                    </Button>
                </div>
            </div>

            {pageError ? (
                <ErrorBanner
                    ref={pageErrorRef}
                    message={pageError}
                    onDismiss={() => setPageError(null)}
                    autoDismissMs={5000}
                />
            ) : null}

            {successMessage ? (
                <Card>
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <p className="text-sm font-medium text-gray-900">{successMessage.message}</p>
                        {successMessage.href && successMessage.label ? (
                            <Link href={successMessage.href}>
                                <Button type="button" variant="secondary">
                                    {successMessage.label}
                                </Button>
                            </Link>
                        ) : null}
                    </div>
                </Card>
            ) : null}

            {lifecycleCurricula.length > 0 ? (
                <CurriculumLifecycleNotice
                    status={lifecycleCurricula[0].offering_status}
                    title="Curriculum lifecycle in progress"
                    message="Some curricula are being disabled, finalized, reactivated, or kept read-only. Historical records remain visible, but new curriculum work is blocked where the lifecycle requires it."
                />
            ) : null}

            {returnTo ? (
                <Card>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                            <h2 className="text-sm font-semibold text-gray-900">{setupOriginContext.title}</h2>
                            <p className="mt-1 text-sm text-gray-600">
                                {setupOriginContext.message}
                            </p>
                        </div>
                        <Link href={returnTo} className="text-sm text-blue-600 hover:text-blue-700">
                            {setupOriginContext.returnLabel}
                        </Link>
                    </div>
                </Card>
            ) : null}

            <Card>
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                        <h2 className="text-sm font-semibold text-gray-900">
                            Using CBC, Cambridge, or another national curriculum?
                        </h2>
                        <p className="mt-1 text-sm text-gray-600">
                            National and international curricula are powered by Scholaroscope. Manage the curriculum engine here, then choose subject offerings from the curriculum catalog.
                        </p>
                    </div>
                    <Link href={pluginSettingsHeaderHref}>
                        <Button type="button" variant="secondary">
                            <Puzzle className="mr-2 h-4 w-4" />
                            Open curriculum settings
                        </Button>
                    </Link>
                </div>
            </Card>

            <DesktopOnly>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <StatsCard title="Total Curricula" value={curricula.length} icon={BookOpen} />
                    <StatsCard title="Active Curricula" value={activeCurricula.length} icon={CheckCircle} />
                    <StatsCard title="Inactive Curricula" value={inactiveCurricula.length} icon={BookOpen} />
                </div>
            </DesktopOnly>

            {/* Active */}
            <Card>
                <div className="mb-4">
                    <h2 className="text-lg font-semibold text-gray-900">Active Curricula</h2>
                </div>

                {loading ? (
                    <LoadingSpinner fullScreen={false} message="Loading curriculum options..." />
                ) : activeCurricula.length === 0 ? (
                    <div className="py-12 text-center">
                        <BookOpen className="mx-auto h-12 w-12 text-gray-400" />
                        <h3 className="mt-2 text-sm font-medium text-gray-900">No active curricula</h3>
                        <p className="mt-1 text-sm text-gray-500">Get started by creating a new curriculum</p>
                        <Button className="mt-4" onClick={openCreate}>
                            <Plus className="mr-2 h-4 w-4" />Add Curriculum
                        </Button>
                    </div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Code</TableHead>
                                <TableHead>Name</TableHead>
                                <TableHead>Description</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Subjects</TableHead>
                                <TableHead>Cohorts</TableHead>
                                <TableHead>Engine</TableHead>
                                <TableHead>Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {activeCurricula.map(c => (
                                <TableRow key={c.id}>
                                    <TableCell><span className="font-mono font-medium">{getCurriculumBridgeCode(c.curriculum_type)}</span></TableCell>
                                    <TableCell>
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className="font-medium">{getCurriculumBridgeName(c)}</span>
                                            {c.source === 'plugin' ? <Badge variant="blue">Powered by Scholaroscope</Badge> : null}
                                        </div>
                                    </TableCell>
                                    <TableCell><span className="text-gray-600">{c.description || '—'}</span></TableCell>
                                    <TableCell><CurriculumLifecycleBadge status={c.offering_status} /></TableCell>
                                    <TableCell><Badge variant="info">{c.subjects_count ?? 0}</Badge></TableCell>
                                    <TableCell><Badge variant="info">{c.cohorts_count ?? 0}</Badge></TableCell>
                                    <TableCell>
                                        {getPluginSettingsHref(c) && getPluginActionLabel(c) ? (
                                            <div className="flex flex-wrap gap-2">
                                                <Link href={getPluginSettingsHref(c) ?? pluginSettingsHeaderHref}>
                                                    <Button type="button" size="sm" variant="secondary">
                                                        Open curriculum settings
                                                    </Button>
                                                </Link>
                                                <Link href={`/academic/subjects?setup=1&curriculum=${c.id}`}>
                                                    <Button type="button" size="sm" variant="ghost">
                                                        Manage subject offerings
                                                    </Button>
                                                </Link>
                                            </div>
                                        ) : (
                                            <span className="text-sm text-gray-400">—</span>
                                        )}
                                    </TableCell>
                                    <TableCell><RowActions curriculum={c} /></TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </Card>

            {/* Inactive */}
            {inactiveCurricula.length > 0 && (
                <Card>
                    <div className="mb-4">
                        <h2 className="text-lg font-semibold text-gray-900">Inactive Curricula</h2>
                    </div>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Code</TableHead>
                                <TableHead>Name</TableHead>
                                <TableHead>Description</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Engine</TableHead>
                                <TableHead>Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {inactiveCurricula.map(c => (
                                <TableRow key={c.id} className="opacity-60">
                                    <TableCell><span className="font-mono font-medium">{getCurriculumBridgeCode(c.curriculum_type)}</span></TableCell>
                                    <TableCell>
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className="font-medium">{getCurriculumBridgeName(c)}</span>
                                            {c.source === 'plugin' ? <Badge variant="blue">Powered by Scholaroscope</Badge> : null}
                                        </div>
                                    </TableCell>
                                    <TableCell><span className="text-gray-600">{c.description || '—'}</span></TableCell>
                                    <TableCell><CurriculumLifecycleBadge status={c.offering_status} /></TableCell>
                                    <TableCell>
                                        {getPluginSettingsHref(c) && getPluginActionLabel(c) ? (
                                            <div className="flex flex-wrap gap-2">
                                                <Link href={getPluginSettingsHref(c) ?? pluginSettingsHeaderHref}>
                                                    <Button type="button" size="sm" variant="secondary">
                                                        Open curriculum settings
                                                    </Button>
                                                </Link>
                                                <Link href={`/academic/subjects?setup=1&curriculum=${c.id}`}>
                                                    <Button type="button" size="sm" variant="ghost">
                                                        Manage subject offerings
                                                    </Button>
                                                </Link>
                                            </div>
                                        ) : (
                                            <span className="text-sm text-gray-400">—</span>
                                        )}
                                    </TableCell>
                                    <TableCell><RowActions curriculum={c} /></TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </Card>
            )}

            <CurriculumFormModal
                isOpen={showModal}
                onClose={closeModal}
                editing={editing}
                initialData={editing ? undefined : createInitialData}
                onSave={handleSave}
            />

            {disablingCurriculum ? (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-lg bg-white p-6 shadow-xl">
                        <div className="flex items-start gap-3">
                            <AlertTriangle className="mt-1 h-5 w-5 shrink-0 text-red-600" />
                            <div>
                                <h2 className="text-lg font-semibold text-gray-900">
                                    Disable {getCurriculumBridgeName(disablingCurriculum)}
                                </h2>
                                <p className="mt-2 text-sm text-gray-600">
                                    Disabling {getCurriculumBridgeName(disablingCurriculum)} will start a curriculum shutdown process for this workspace. Scholaroscope will preserve historical records, close or cancel pending curriculum work according to the disable workflow, and prevent new academic work under this curriculum while shutdown is running.
                                </p>
                                <p className="mt-2 text-sm text-gray-600">
                                    Cancellation is possible only before finalization starts.
                                </p>
                            </div>
                        </div>

                        {disableError ? (
                            <div className="mt-4">
                                <ErrorBanner
                                    message={disableError}
                                    onDismiss={() => setDisableError(null)}
                                />
                            </div>
                        ) : null}

                        {disableLoading ? (
                            <div className="mt-6">
                                <LoadingSpinner fullScreen={false} message="Loading disable impact..." />
                            </div>
                        ) : (
                            <div className="mt-6 grid gap-3 sm:grid-cols-2">
                                {impactCounts.map((item) => (
                                    <div key={item.label} className="rounded-lg border border-gray-200 p-4">
                                        <p className="text-xs font-medium text-gray-500">{item.label}</p>
                                        <p className="mt-1 text-2xl font-semibold text-gray-900">{item.value}</p>
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="mt-6 rounded-lg bg-amber-50 p-4 text-sm text-amber-900">
                            Academic work under this curriculum becomes read-only while shutdown is running. Users can still view historical records and disable progress.
                        </div>

                        <div className="mt-6 flex flex-wrap justify-end gap-3">
                            <Button
                                type="button"
                                variant="secondary"
                                onClick={closeDisable}
                                disabled={disableSubmitting}
                            >
                                Cancel
                            </Button>
                            {activeDisableRequestId && ['DISABLE_REQUESTED', 'DRAINING'].includes(disablingCurriculum.offering_status) ? (
                                <Button
                                    type="button"
                                    variant="secondary"
                                    onClick={cancelDisable}
                                    disabled={disableSubmitting}
                                >
                                    {disableSubmitting ? 'Cancelling...' : 'Cancel disable'}
                                </Button>
                            ) : null}
                            {disablingCurriculum.offering_status === 'ACTIVE' ? (
                                <Button
                                    type="button"
                                    variant="danger"
                                    onClick={confirmDisable}
                                    disabled={disableLoading || disableSubmitting}
                                >
                                    {disableSubmitting ? 'Starting shutdown...' : 'Confirm disable'}
                                </Button>
                            ) : null}
                        </div>
                    </div>
                </div>
            ) : null}
        </div>
    );
}
