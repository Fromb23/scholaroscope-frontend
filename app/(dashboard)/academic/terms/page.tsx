'use client';

import { useState, useMemo } from 'react';
import { Calendar, Plus, Edit, Trash2, CheckCircle, AlertCircle, X, History } from 'lucide-react';
import { useTerms, useAcademicYears } from '@/app/core/hooks/useAcademic';
import { Card } from '@/app/components/ui/Card';
import { Button } from '@/app/components/ui/Button';
import { Badge } from '@/app/components/ui/Badge';
import {
    Table, TableHeader, TableBody,
    TableRow, TableHead, TableCell,
} from '@/app/components/ui/Table';
import Modal from '@/app/components/ui/Modal';
import { Input } from '@/app/components/ui/Input';
import { Select } from '@/app/components/ui/Select';
import { Term } from '@/app/core/types/academic';

// ── Helpers ───────────────────────────────────────────────────────────────

function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString('en-GB', {
        day: 'numeric', month: 'short', year: 'numeric',
    });
}

function isTermActive(term: Term): boolean {
    const today = new Date();
    const start = new Date(term.start_date);
    const end = new Date(term.end_date);
    return today >= start && today <= end;
}

function isTermPast(term: Term): boolean {
    return new Date(term.end_date) < new Date();
}

// ── Error banner ──────────────────────────────────────────────────────────

function ErrorBanner({ message, onDismiss }: { message: string; onDismiss: () => void }) {
    return (
        <div className="flex items-start gap-3 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span className="flex-1">{message}</span>
            <button onClick={onDismiss} className="text-red-400 hover:text-red-600">
                <X className="h-4 w-4" />
            </button>
        </div>
    );
}

// ── Page ──────────────────────────────────────────────────────────────────

export default function TermsPage() {
    const { academicYears } = useAcademicYears();

    // Default filter to current year
    const currentYear = useMemo(
        () => academicYears.find(y => y.is_current),
        [academicYears]
    );
    const [selectedYearId, setSelectedYearId] = useState<number | undefined>(undefined);

    // Set default once years load
    useMemo(() => {
        if (currentYear && selectedYearId === undefined) {
            setSelectedYearId(currentYear.id);
        }
    }, [currentYear]);

    const { terms, loading, createTerm, updateTerm, deleteTerm } = useTerms(selectedYearId);

    const [showModal, setShowModal] = useState(false);
    const [editingTerm, setEditingTerm] = useState<Term | null>(null);
    const [formError, setFormError] = useState<string | null>(null);
    const [pageError, setPageError] = useState<string | null>(null);
    const [formSaving, setFormSaving] = useState(false);

    const [formData, setFormData] = useState({
        name: '',
        academic_year: '' as string,
        start_date: '',
        end_date: '',
        sequence: 1,
    });

    // ── Derived ───────────────────────────────────────────────────────────

    const selectedYear = academicYears.find(y => y.id === selectedYearId);
    const isHistoricalView = selectedYear ? !selectedYear.is_current : false;

    // Warn if admin selects a past year in the form
    const selectedFormYear = academicYears.find(y => String(y.id) === formData.academic_year);
    const formYearIsHistorical = selectedFormYear ? !selectedFormYear.is_current : false;

    // ── Handlers ──────────────────────────────────────────────────────────

    const openCreate = () => {
        setFormData({
            name: '',
            academic_year: currentYear ? String(currentYear.id) : '',
            start_date: '',
            end_date: '',
            sequence: (terms.length + 1),
        });
        setFormError(null);
        setEditingTerm(null);
        setShowModal(true);
    };

    const openEdit = (term: Term) => {
        setFormData({
            name: term.name,
            academic_year: String(term.academic_year),
            start_date: term.start_date,
            end_date: term.end_date,
            sequence: term.sequence,
        });
        setFormError(null);
        setEditingTerm(term);
        setShowModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
        setEditingTerm(null);
        setFormError(null);
    };

    const handleSubmit = async () => {
        if (!formData.name || !formData.academic_year || !formData.start_date || !formData.end_date) {
            setFormError('All fields are required.');
            return;
        }
        if (formData.start_date >= formData.end_date) {
            setFormError('End date must be after start date.');
            return;
        }

        setFormSaving(true); setFormError(null);
        try {
            const payload = {
                name: formData.name,
                academic_year: Number(formData.academic_year),
                start_date: formData.start_date,
                end_date: formData.end_date,
                sequence: formData.sequence,
            };
            if (editingTerm) {
                await updateTerm(editingTerm.id, payload);
            } else {
                await createTerm(payload);
            }
            closeModal();
        } catch (err: any) {
            const detail = err?.response?.data?.detail ?? err?.message;
            setFormError(
                Array.isArray(detail) ? detail.join(' ') :
                    typeof detail === 'string' ? detail :
                        'Failed to save term.'
            );
        } finally { setFormSaving(false); }
    };

    const handleDelete = async (term: Term) => {
        if (!confirm(`Delete "${term.name}"? This cannot be undone.`)) return;
        setPageError(null);
        try {
            await deleteTerm(term.id);
        } catch (err: any) {
            const detail = err?.response?.data?.detail ?? err?.message;
            setPageError(
                typeof detail === 'string' ? detail : 'Failed to delete term.'
            );
        }
    };

    // ── Render ────────────────────────────────────────────────────────────

    return (
        <div className="space-y-6">
            {/* Header */}
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

            {/* Page error */}
            {pageError && (
                <ErrorBanner message={pageError} onDismiss={() => setPageError(null)} />
            )}

            {/* Year filter */}
            <Card>
                <div className="flex items-center gap-3">
                    <Select
                        value={selectedYearId?.toString() || ''}
                        onChange={e => setSelectedYearId(
                            e.target.value ? Number(e.target.value) : undefined
                        )}
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
                    <div className="py-12 text-center">
                        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
                        <p className="mt-2 text-gray-500">Loading terms...</p>
                    </div>
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
                                <TableHead>Actions</TableHead>
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
                                                    <CheckCircle className="mr-1 h-3 w-3" />
                                                    Active
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
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() => openEdit(term)}
                                                        title="Edit"
                                                    >
                                                        <Edit className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() => handleDelete(term)}
                                                        title="Delete"
                                                    >
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

            {/* Create / Edit Modal */}
            <Modal
                isOpen={showModal}
                onClose={closeModal}
                title={editingTerm ? 'Edit Term' : 'Add New Term'}
            >
                <div className="space-y-4">
                    {formError && (
                        <ErrorBanner message={formError} onDismiss={() => setFormError(null)} />
                    )}

                    {/* Warn if admin picks a historical year */}
                    {formYearIsHistorical && (
                        <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-700">
                            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                            This academic year is no longer active. The system will reject
                            creating terms in past academic years.
                        </div>
                    )}

                    <Input
                        label="Term Name"
                        value={formData.name}
                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                        placeholder="e.g. Term 1, First Semester"
                        required
                    />

                    <Select
                        label="Academic Year"
                        value={formData.academic_year}
                        onChange={e => setFormData({ ...formData, academic_year: e.target.value })}
                        required
                        options={[
                            { value: '', label: 'Select Academic Year' },
                            ...academicYears.map(y => ({
                                value: String(y.id),
                                label: y.is_current ? `${y.name} (Current)` : `${y.name} — Historical`,
                            })),
                        ]}
                    />

                    <div className="grid grid-cols-2 gap-4">
                        <Input
                            label="Start Date"
                            type="date"
                            value={formData.start_date}
                            onChange={e => setFormData({ ...formData, start_date: e.target.value })}
                            required
                        />
                        <Input
                            label="End Date"
                            type="date"
                            value={formData.end_date}
                            onChange={e => setFormData({ ...formData, end_date: e.target.value })}
                            required
                        />
                    </div>

                    <Input
                        label="Sequence"
                        type="number"
                        value={formData.sequence}
                        onChange={e => setFormData({ ...formData, sequence: Number(e.target.value) })}
                        min={1}
                        required
                    />

                    <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
                        <Button variant="secondary" onClick={closeModal}>Cancel</Button>
                        <Button onClick={handleSubmit} disabled={formSaving || formYearIsHistorical}>
                            {formSaving
                                ? 'Saving...'
                                : editingTerm ? 'Update Term' : 'Create Term'
                            }
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}