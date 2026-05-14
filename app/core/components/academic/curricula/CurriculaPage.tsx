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
import { BookOpen, Plus, Edit, Trash2, CheckCircle } from 'lucide-react';
import { useCurricula } from '@/app/core/hooks/useAcademic';
import { Card } from '@/app/components/ui/Card';
import { Button } from '@/app/components/ui/Button';
import { Badge } from '@/app/components/ui/Badge';
import { StatsCard } from '@/app/components/dashboard/StatsCard';
import { LoadingSpinner } from '@/app/components/ui/LoadingSpinner';
import { ErrorBanner } from '@/app/components/ui/ErrorBanner';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/app/components/ui/Table';
import { CurriculumFormModal } from '@/app/core/components/curricula/CurriculumFormModal';
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

    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState<Curriculum | null>(null);
    const [pageError, setPageError] = useState<string | null>(null);

    const activeCurricula = curricula.filter(c => c.is_active);
    const inactiveCurricula = curricula.filter(c => !c.is_active);
    const shouldOpenCreate = searchParams.get('create') === '1';
    const returnTo = searchParams.get('returnTo');
    const createInitialData = useMemo<CurriculumFormData>(() => ({
        name: isCambridgeCurriculumType(searchParams.get('curriculum_type')) ? CAMBRIDGE_BRIDGE_NAME : (searchParams.get('name') ?? ''),
        curriculum_type: (searchParams.get('curriculum_type') ?? '') as CurriculumType,
        description: '',
        is_active: true,
    }), [searchParams]);

    const openCreate = () => { setEditing(null); setShowModal(true); };
    const openEdit = (c: Curriculum) => { setEditing(c); setShowModal(true); };
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
            <Button size="sm" variant="ghost" onClick={() => openEdit(curriculum)}>
                <Edit className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="ghost" onClick={() => handleDelete(curriculum)}>
                <Trash2 className="h-4 w-4 text-red-600" />
            </Button>
        </div>
    );

    // ── Render ────────────────────────────────────────────────────────────

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Curricula</h1>
                    <p className="mt-2 text-gray-600">Manage educational curricula and programs</p>
                </div>
                <Button onClick={openCreate}>
                    <Plus className="mr-2 h-4 w-4" />Add Curriculum
                </Button>
            </div>

            {pageError && <ErrorBanner message={pageError} onDismiss={() => setPageError(null)} />}

            {returnTo ? (
                <Card>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                            <h2 className="text-sm font-semibold text-gray-900">Cambridge Setup Flow</h2>
                            <p className="mt-1 text-sm text-gray-600">
                                Create the curriculum here, then return to the Cambridge offering to assign cohorts.
                            </p>
                        </div>
                        <Link href={returnTo} className="text-sm text-blue-600 hover:text-blue-700">
                            Return to Cambridge offering
                        </Link>
                    </div>
                </Card>
            ) : null}

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
                    <LoadingSpinner fullScreen={false} />
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
                                <TableHead>Subjects</TableHead>
                                <TableHead>Cohorts</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {activeCurricula.map(c => (
                                <TableRow key={c.id}>
                                    <TableCell><span className="font-mono font-medium">{getCurriculumBridgeCode(c.curriculum_type)}</span></TableCell>
                                    <TableCell><span className="font-medium">{getCurriculumBridgeName(c)}</span></TableCell>
                                    <TableCell><span className="text-gray-600">{c.description || '—'}</span></TableCell>
                                    <TableCell><Badge variant="info">{c.subjects_count ?? 0}</Badge></TableCell>
                                    <TableCell><Badge variant="info">{c.cohorts_count ?? 0}</Badge></TableCell>
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
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {inactiveCurricula.map(c => (
                                <TableRow key={c.id} className="opacity-60">
                                    <TableCell><span className="font-mono font-medium">{getCurriculumBridgeCode(c.curriculum_type)}</span></TableCell>
                                    <TableCell><span className="font-medium">{getCurriculumBridgeName(c)}</span></TableCell>
                                    <TableCell><span className="text-gray-600">{c.description || '—'}</span></TableCell>
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
