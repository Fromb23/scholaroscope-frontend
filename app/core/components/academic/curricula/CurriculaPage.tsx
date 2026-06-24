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
import { BookOpen, Plus, Edit, Trash2, CheckCircle, Puzzle } from 'lucide-react';
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
import {
    canCreateCurriculumWork,
    canEditCurriculumWork,
    resolveCurriculumPluginKey,
} from '@/app/core/lib/curriculumLifecycle';
import { extractErrorMessage } from '@/app/core/types/errors';
import type { ApiError } from '@/app/core/types/errors';
import type { Curriculum } from '@/app/core/types/academic';
import type { CurriculumFormData } from '@/app/core/components/curricula/CurriculumFormModal';
import { DesktopOnly } from '@/app/core/components/DesktopOnly';
import type { CurriculumType } from '@/app/core/types/academic';
import {
    CAMBRIDGE_BRIDGE_NAME,
    getCurriculumBridgeCode,
    getCurriculumBridgeName,
    isCambridgeCurriculumType,
} from '@/app/core/lib/curriculumBridge';

export function CurriculaPage() {
    const { curricula, loading, createCurriculum, updateCurriculum, deleteCurriculum } = useCurricula();
    const router = useRouter();
    const searchParams = useSearchParams();
    const setupStatusQuery = useAcademicSetupStatus({
        enabled: searchParams.get('setup') === '1',
    });

    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState<Curriculum | null>(null);
    const [pageError, setPageError] = useState<string | null>(null);

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
                return 'Manage plugin';
            case 'DISABLE_REQUESTED':
            case 'DRAINING':
            case 'FINALIZING':
                return 'View disable workflow';
            case 'DISABLED':
                return 'Reactivate in Plugin Settings';
            case 'FAILED':
                return 'Review disable failure';
            case 'REACTIVATING':
                return 'View reactivation progress';
            default:
                return 'Manage plugin';
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

    // ── Shared row actions ────────────────────────────────────────────────

    const RowActions = ({ curriculum }: { curriculum: Curriculum }) => (
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
                            Plugin settings
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
                            National and international curricula are powered by plugins. Manage the curriculum plugin here, then choose subject offerings from the curriculum catalog.
                        </p>
                    </div>
                    <Link href={pluginSettingsHeaderHref}>
                        <Button type="button" variant="secondary">
                            <Puzzle className="mr-2 h-4 w-4" />
                            Open plugin settings
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
                                <TableHead>Plugin</TableHead>
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
                                            {c.source === 'plugin' ? <Badge variant="blue">Managed by plugin</Badge> : null}
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
                                                        Open plugin settings
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
                                <TableHead>Plugin</TableHead>
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
                                            {c.source === 'plugin' ? <Badge variant="blue">Managed by plugin</Badge> : null}
                                        </div>
                                    </TableCell>
                                    <TableCell><span className="text-gray-600">{c.description || '—'}</span></TableCell>
                                    <TableCell><CurriculumLifecycleBadge status={c.offering_status} /></TableCell>
                                    <TableCell>
                                        {getPluginSettingsHref(c) && getPluginActionLabel(c) ? (
                                            <div className="flex flex-wrap gap-2">
                                                <Link href={getPluginSettingsHref(c) ?? pluginSettingsHeaderHref}>
                                                    <Button type="button" size="sm" variant="secondary">
                                                        Open plugin settings
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
        </div>
    );
}
