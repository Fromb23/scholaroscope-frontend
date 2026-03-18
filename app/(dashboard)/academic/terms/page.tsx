'use client';

// ============================================================================
// app/(dashboard)/academic/terms/page.tsx
//
// Responsibility: fetch data, handle state, compose components, render.
// No alert(). No any. No inline component definitions.
// ============================================================================

import { useState, useMemo, useEffect } from 'react';
import { Calendar, Plus, Edit, Trash2, CheckCircle, History } from 'lucide-react';
import { useTerms, useAcademicYears } from '@/app/core/hooks/useAcademic';
import { Card } from '@/app/components/ui/Card';
import { Button } from '@/app/components/ui/Button';
import { Badge } from '@/app/components/ui/Badge';
import { Select } from '@/app/components/ui/Select';
import { LoadingSpinner } from '@/app/components/ui/LoadingSpinner';
import { ErrorBanner } from '@/app/components/ui/ErrorBanner';
import {
    Table, TableHeader, TableBody,
    TableRow, TableHead, TableCell,
} from '@/app/components/ui/Table';
import {
    TermFormModal,
    formatDate,
    isTermActive,
    isTermPast,
} from '@/app/core/components/academic/TermComponents';
import type { TermFormState } from '@/app/core/components/academic/TermComponents';
import { extractErrorMessage } from '@/app/core/types/errors';
import type { ApiError } from '@/app/core/types/errors';
import type { Term } from '@/app/core/types/academic';

export default function TermsPage() {
    const { academicYears } = useAcademicYears();
    const currentYear = useMemo(() => academicYears.find(y => y.is_current), [academicYears]);

    const [selectedYearId, setSelectedYearId] = useState<number | undefined>(undefined);
    const [showModal, setShowModal] = useState(false);
    const [editingTerm, setEditingTerm] = useState<Term | null>(null);
    const [pageError, setPageError] = useState<string | null>(null);

    // Default to current year once loaded — useEffect not useMemo
    useEffect(() => {
        if (currentYear && selectedYearId === undefined) {
            setSelectedYearId(currentYear.id);
        }
    }, [currentYear, selectedYearId]);

    const { terms, loading, createTerm, updateTerm, deleteTerm } = useTerms(selectedYearId);

    const selectedYear = academicYears.find(y => y.id === selectedYearId);
    const isHistoricalView = selectedYear ? !selectedYear.is_current : false;

    // ── Modal helpers ─────────────────────────────────────────────────────

    const initialData = useMemo((): TermFormState => editingTerm
        ? {
            name: editingTerm.name,
            academic_year: String(editingTerm.academic_year),
            start_date: editingTerm.start_date,
            end_date: editingTerm.end_date,
            sequence: editingTerm.sequence,
        }
        : {
            name: '',
            academic_year: currentYear ? String(currentYear.id) : '',
            start_date: '',
            end_date: '',
            sequence: terms.length + 1,
        },
        [editingTerm, currentYear, terms.length]);

    const openCreate = () => { setEditingTerm(null); setShowModal(true); };
    const openEdit = (t: Term) => { setEditingTerm(t); setShowModal(true); };
    const closeModal = () => { setShowModal(false); setEditingTerm(null); };

    const handleSave = async (data: TermFormState, editingId?: number) => {
        const payload = {
            name: data.name,
            academic_year: Number(data.academic_year),
            start_date: data.start_date,
            end_date: data.end_date,
            sequence: data.sequence,
        };
        if (editingId) {
            await updateTerm(editingId, payload);
        } else {
            await createTerm(payload);
        }
    };

    const handleDelete = async (term: Term) => {
        if (!confirm(`Delete "${term.name}"? This cannot be undone.`)) return;
        setPageError(null);
        try {
            await deleteTerm(term.id);
        } catch (err) {
            setPageError(extractErrorMessage(err as ApiError, 'Failed to delete term.'));
        }
    };

    // ── Render ────────────────────────────────────────────────────────────

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Terms</h1>
                    <p className="mt-1 text-gray-500">
                        {isHistoricalView
                            ? 'Viewing historical records — read only'
                            : 'Manage academic terms and session windows'
                        }
                    </p>
                </div>
                {!isHistoricalView && (
                    <Button onClick={openCreate}>
                        <Plus className="mr-2 h-4 w-4" />Add Term
                    </Button>
                )}
            </div>

            {pageError && <ErrorBanner message={pageError} onDismiss={() => setPageError(null)} />}

            {/* Year filter */}
            <Card>
                <div className="flex items-center gap-3">
                    <Select
                        value={selectedYearId?.toString() ?? ''}
                        onChange={e => setSelectedYearId(e.target.value ? Number(e.target.value) : undefined)}
                        options={[
                            { value: '', label: 'All Academic Years' },
                            ...academicYears.map(y => ({
                                value: String(y.id),
                                label: y.is_current ? `${y.name} (Current)` : `${y.name} — Historical`,
                            })),
                        ]}
                    />
                    {isHistoricalView && (
                        <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700 whitespace-nowrap">
                            <History className="h-3.5 w-3.5 shrink-0" />
                            Historical view — records are read-only
                        </div>
                    )}
                </div>
            </Card>

            {/* Terms table */}
            <Card>
                {loading ? (
                    <LoadingSpinner fullScreen={false} message="Loading terms..." />
                ) : terms.length === 0 ? (
                    <div className="py-12 text-center">
                        <Calendar className="mx-auto h-12 w-12 text-gray-300" />
                        <h3 className="mt-2 text-sm font-medium text-gray-900">No terms found</h3>
                        <p className="mt-1 text-sm text-gray-500">
                            {isHistoricalView
                                ? 'No terms exist for this academic year.'
                                : 'Create terms to define session windows for the current year.'
                            }
                        </p>
                        {!isHistoricalView && (
                            <Button className="mt-4" onClick={openCreate}>
                                <Plus className="mr-2 h-4 w-4" />Add Term
                            </Button>
                        )}
                    </div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Term</TableHead>
                                <TableHead>Academic Year</TableHead>
                                <TableHead>Start Date</TableHead>
                                <TableHead>End Date</TableHead>
                                <TableHead>Sequence</TableHead>
                                <TableHead>Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {terms.map(term => {
                                const active = isTermActive(term);
                                const past = isTermPast(term);
                                const historical = !selectedYear?.is_current;

                                return (
                                    <TableRow key={term.id} className={historical ? 'opacity-70' : ''}>
                                        <TableCell>
                                            <span className="font-medium text-gray-900">{term.name}</span>
                                        </TableCell>
                                        <TableCell className="text-gray-500">
                                            {term.academic_year_name}
                                        </TableCell>
                                        <TableCell className="text-gray-600">
                                            {formatDate(term.start_date)}
                                        </TableCell>
                                        <TableCell className="text-gray-600">
                                            {formatDate(term.end_date)}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="info">{term.sequence}</Badge>
                                        </TableCell>
                                        <TableCell>
                                            {active ? (
                                                <Badge variant="green">
                                                    <CheckCircle className="mr-1 h-3 w-3" />Active
                                                </Badge>
                                            ) : past ? (
                                                <Badge variant="default">Ended</Badge>
                                            ) : (
                                                <Badge variant="warning">Upcoming</Badge>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            {!historical && (
                                                <div className="flex gap-1 justify-end">
                                                    <Button size="sm" variant="ghost" onClick={() => openEdit(term)}>
                                                        <Edit className="h-4 w-4" />
                                                    </Button>
                                                    <Button size="sm" variant="ghost" onClick={() => handleDelete(term)}>
                                                        <Trash2 className="h-4 w-4 text-red-500" />
                                                    </Button>
                                                </div>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                )}
            </Card>

            <TermFormModal
                isOpen={showModal}
                onClose={closeModal}
                editing={editingTerm}
                academicYears={academicYears}
                initialData={initialData}
                onSave={handleSave}
            />
        </div>
    );
}