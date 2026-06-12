'use client';

import { useEffect, useMemo, useState } from 'react';
import {
    Calendar,
    CheckCircle2,
    Edit,
    History,
    Info,
    Lock,
    Plus,
    RefreshCcw,
    Trash2,
} from 'lucide-react';
import Modal from '@/app/components/ui/Modal';
import { Badge } from '@/app/components/ui/Badge';
import { Button } from '@/app/components/ui/Button';
import { Card } from '@/app/components/ui/Card';
import { ErrorBanner } from '@/app/components/ui/ErrorBanner';
import { Input } from '@/app/components/ui/Input';
import { LoadingSpinner } from '@/app/components/ui/LoadingSpinner';
import { Select } from '@/app/components/ui/Select';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/app/components/ui/Table';
import {
    TermFormModal,
    formatDate,
    isTermActive,
    isTermPast,
} from '@/app/core/components/academic/TermComponents';
import type { TermFormState } from '@/app/core/components/academic/TermComponents';
import { useAcademicYears, useTermCalendarEvents, useTerms } from '@/app/core/hooks/useAcademic';
import type {
    Term,
    TermCalendarEvent,
    TermCalendarEventType,
} from '@/app/core/types/academic';
import { extractErrorMessage } from '@/app/core/types/errors';
import type { ApiError } from '@/app/core/types/errors';
import { useAuth } from '@/app/context/AuthContext';

interface TermCalendarEventFormState {
    title: string;
    event_type: TermCalendarEventType;
    start_date: string;
    end_date: string;
    affects_learning: boolean;
    notes: string;
}

const TERM_CALENDAR_EVENT_TYPE_OPTIONS: Array<{ value: TermCalendarEventType; label: string }> = [
    { value: 'ENTRY_EXAM', label: 'Entry exam' },
    { value: 'MIDTERM_EXAM', label: 'Midterm exam' },
    { value: 'MIDTERM_BREAK', label: 'Midterm break' },
    { value: 'MAIN_EXAM', label: 'Main exam' },
    { value: 'EXIT_EXAM', label: 'Exit exam' },
    { value: 'HOLIDAY', label: 'Holiday' },
    { value: 'PUBLIC_HOLIDAY', label: 'Public holiday' },
    { value: 'SCHOOL_EVENT', label: 'School event' },
    { value: 'OTHER', label: 'Other' },
];

function emptyTermCalendarEventForm(term: Term | null): TermCalendarEventFormState {
    return {
        title: '',
        event_type: 'HOLIDAY',
        start_date: term?.start_date ?? '',
        end_date: term?.start_date ?? '',
        affects_learning: true,
        notes: '',
    };
}

function buildTermCalendarEventFormState(
    term: Term | null,
    event: TermCalendarEvent | null,
): TermCalendarEventFormState {
    if (!event) {
        return emptyTermCalendarEventForm(term);
    }

    return {
        title: event.title,
        event_type: event.event_type,
        start_date: event.start_date,
        end_date: event.end_date,
        affects_learning: event.affects_learning,
        notes: event.notes ?? '',
    };
}

function getTermCalendarEventTypeLabel(eventType: TermCalendarEventType): string {
    return (
        TERM_CALENDAR_EVENT_TYPE_OPTIONS.find((option) => option.value === eventType)?.label
        ?? eventType
    );
}

function getTermCalendarEventBadgeVariant(eventType: TermCalendarEventType) {
    switch (eventType) {
        case 'HOLIDAY':
        case 'PUBLIC_HOLIDAY':
            return 'warning' as const;
        case 'MIDTERM_BREAK':
            return 'orange' as const;
        case 'MIDTERM_EXAM':
        case 'MAIN_EXAM':
        case 'EXIT_EXAM':
        case 'ENTRY_EXAM':
            return 'info' as const;
        case 'SCHOOL_EVENT':
            return 'purple' as const;
        default:
            return 'default' as const;
    }
}

function getCalendarSetupBadge(term: Term) {
    if (term.is_calendar_setup_complete) {
        return {
            label: 'Calendar setup complete',
            helper: 'Schemes can now be generated for this term',
            variant: 'success' as const,
        };
    }

    return {
        label: 'Calendar setup incomplete',
        helper: 'Finish the term calendar before teachers generate schemes',
        variant: 'warning' as const,
    };
}

function getTermLifecycleBadge(term: Term) {
    if (isTermActive(term)) {
        return { label: 'Active', variant: 'green' as const };
    }
    if (isTermPast(term)) {
        return { label: 'Ended', variant: 'default' as const };
    }
    return { label: 'Upcoming', variant: 'warning' as const };
}

interface TermCalendarEventModalProps {
    isOpen: boolean;
    onClose: () => void;
    term: Term | null;
    editingEvent: TermCalendarEvent | null;
    onSave: (payload: TermCalendarEventFormState, editingId?: number) => Promise<void>;
}

function TermCalendarEventModal({
    isOpen,
    onClose,
    term,
    editingEvent,
    onSave,
}: TermCalendarEventModalProps) {
    const [form, setForm] = useState<TermCalendarEventFormState>(() => buildTermCalendarEventFormState(term, editingEvent));
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        setForm(buildTermCalendarEventFormState(term, editingEvent));
        setError(null);
    }, [editingEvent, isOpen, term]);

    const validate = (): string | null => {
        if (!term) {
            return 'Select a term first.';
        }
        if (!form.title.trim()) {
            return 'Title is required.';
        }
        if (!form.start_date || !form.end_date) {
            return 'Start date and end date are required.';
        }
        if (form.start_date < term.start_date || form.start_date > term.end_date) {
            return 'Start date must stay inside the selected term.';
        }
        if (form.end_date < term.start_date || form.end_date > term.end_date) {
            return 'End date must stay inside the selected term.';
        }
        if (form.end_date < form.start_date) {
            return 'End date must be on or after the start date.';
        }
        return null;
    };

    const handleSubmit = async () => {
        const validationError = validate();
        if (validationError) {
            setError(validationError);
            return;
        }

        setSaving(true);
        setError(null);
        try {
            await onSave(form, editingEvent?.id);
            onClose();
        } catch (err) {
            setError(extractErrorMessage(err as ApiError, 'Failed to save term calendar event.'));
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={editingEvent ? 'Edit Term Calendar Event' : 'Add Term Calendar Event'}
            size="md"
        >
            <div className="space-y-4">
                {error ? <ErrorBanner message={error} onDismiss={() => setError(null)} /> : null}

                <Input
                    label="Title"
                    value={form.title}
                    onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                    placeholder="Midterm break, school trip, prize-giving"
                    required
                />

                <Select
                    label="Event Type"
                    value={form.event_type}
                    onChange={(event) => setForm((current) => ({
                        ...current,
                        event_type: event.target.value as TermCalendarEventType,
                    }))}
                    options={TERM_CALENDAR_EVENT_TYPE_OPTIONS}
                />

                <div className="grid gap-4 md:grid-cols-2">
                    <Input
                        label="Start Date"
                        type="date"
                        value={form.start_date}
                        min={term?.start_date}
                        max={term?.end_date}
                        onChange={(event) => setForm((current) => ({ ...current, start_date: event.target.value }))}
                        required
                    />
                    <Input
                        label="End Date"
                        type="date"
                        value={form.end_date}
                        min={term?.start_date}
                        max={term?.end_date}
                        onChange={(event) => setForm((current) => ({ ...current, end_date: event.target.value }))}
                        required
                    />
                </div>

                <label className="flex items-start gap-3 rounded-lg border theme-border bg-gray-50 px-4 py-3 text-sm theme-text">
                    <input
                        type="checkbox"
                        className="theme-checkbox theme-border mt-1 h-4 w-4 rounded"
                        checked={form.affects_learning}
                        onChange={(event) => setForm((current) => ({
                            ...current,
                            affects_learning: event.target.checked,
                        }))}
                    />
                    <span>
                        This event reduces or interrupts active learning time in the week it falls in.
                    </span>
                </label>

                <div>
                    <label className="mb-1 block text-sm font-medium theme-text">Notes</label>
                    <textarea
                        value={form.notes}
                        onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
                        rows={4}
                        className="theme-input min-h-[120px] w-full rounded-lg px-4 py-2"
                        placeholder="Optional details for teachers"
                    />
                </div>

                <div className="flex justify-end gap-3 border-t border-gray-100 pt-2">
                    <Button variant="secondary" onClick={onClose} disabled={saving}>
                        Cancel
                    </Button>
                    <Button onClick={handleSubmit} disabled={saving}>
                        {saving ? 'Saving...' : editingEvent ? 'Update Event' : 'Create Event'}
                    </Button>
                </div>
            </div>
        </Modal>
    );
}

export function TermsPage() {
    const { academicYears } = useAcademicYears();
    const { user, activeRole } = useAuth();
    const currentYear = useMemo(() => academicYears.find((year) => year.is_current), [academicYears]);
    const isAdminLike = Boolean(user?.is_superadmin) || activeRole === 'ADMIN';

    const [selectedYearId, setSelectedYearId] = useState<number | undefined>(undefined);
    const [selectedTermId, setSelectedTermId] = useState<number | null>(null);
    const [showModal, setShowModal] = useState(false);
    const [editingTerm, setEditingTerm] = useState<Term | null>(null);
    const [showEventModal, setShowEventModal] = useState(false);
    const [editingEvent, setEditingEvent] = useState<TermCalendarEvent | null>(null);
    const [pageError, setPageError] = useState<string | null>(null);

    useEffect(() => {
        if (currentYear && selectedYearId === undefined) {
            setSelectedYearId(currentYear.id);
        }
    }, [currentYear, selectedYearId]);

    const {
        terms,
        loading,
        createTerm,
        updateTerm,
        deleteTerm,
        completeCalendarSetup,
        reopenCalendarSetup,
    } = useTerms(selectedYearId);

    useEffect(() => {
        if (!terms.length) {
            setSelectedTermId(null);
            return;
        }

        if (selectedTermId && terms.some((term) => term.id === selectedTermId)) {
            return;
        }

        setSelectedTermId(terms[0].id);
    }, [selectedTermId, terms]);

    const selectedYear = academicYears.find((year) => year.id === selectedYearId);
    const isHistoricalView = selectedYear ? !selectedYear.is_current : false;
    const selectedTerm = useMemo(
        () => terms.find((term) => term.id === selectedTermId) ?? null,
        [selectedTermId, terms],
    );
    const {
        events,
        loading: eventsLoading,
        error: eventsError,
        createEvent,
        updateEvent,
        deleteEvent,
    } = useTermCalendarEvents(selectedTerm?.id ?? null);

    const calendarEditable = Boolean(
        isAdminLike
        && selectedTerm
        && !isHistoricalView
        && !isTermPast(selectedTerm)
        && !selectedTerm.is_calendar_setup_complete
    );
    const calendarReopenable = Boolean(
        isAdminLike
        && selectedTerm
        && !isHistoricalView
        && !isTermPast(selectedTerm)
        && selectedTerm.is_calendar_setup_complete
    );

    const initialData = useMemo((): TermFormState => (
        editingTerm
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
            }
    ), [editingTerm, currentYear, terms.length]);

    const selectedTermCalendarBadge = selectedTerm ? getCalendarSetupBadge(selectedTerm) : null;

    const openCreate = () => {
        setEditingTerm(null);
        setShowModal(true);
    };

    const openEdit = (term: Term) => {
        setEditingTerm(term);
        setShowModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
        setEditingTerm(null);
    };

    const openCreateEvent = () => {
        setEditingEvent(null);
        setShowEventModal(true);
    };

    const openEditEvent = (event: TermCalendarEvent) => {
        setEditingEvent(event);
        setShowEventModal(true);
    };

    const closeEventModal = () => {
        setShowEventModal(false);
        setEditingEvent(null);
    };

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
            return;
        }

        const created = await createTerm(payload);
        setSelectedTermId(created.id);
    };

    const handleDelete = async (term: Term) => {
        if (!confirm(`Delete "${term.name}"? This cannot be undone.`)) {
            return;
        }

        setPageError(null);
        try {
            await deleteTerm(term.id);
        } catch (err) {
            setPageError(extractErrorMessage(err as ApiError, 'Failed to delete term.'));
        }
    };

    const handleSaveCalendarEvent = async (
        data: TermCalendarEventFormState,
        editingId?: number,
    ) => {
        if (!selectedTerm) {
            throw new Error('Select a term first.');
        }

        const payload = {
            term: selectedTerm.id,
            title: data.title.trim(),
            event_type: data.event_type,
            start_date: data.start_date,
            end_date: data.end_date,
            affects_learning: data.affects_learning,
            notes: data.notes.trim(),
        };

        if (editingId) {
            await updateEvent(editingId, payload);
            return;
        }

        await createEvent(payload);
    };

    const handleDeleteEvent = async (event: TermCalendarEvent) => {
        if (!confirm(`Delete "${event.title}" from the term calendar?`)) {
            return;
        }

        setPageError(null);
        try {
            await deleteEvent(event.id);
        } catch (err) {
            setPageError(extractErrorMessage(err as ApiError, 'Failed to delete term calendar event.'));
        }
    };

    const handleCompleteCalendarSetup = async () => {
        if (!selectedTerm) {
            return;
        }

        setPageError(null);
        try {
            await completeCalendarSetup(selectedTerm.id);
        } catch (err) {
            setPageError(extractErrorMessage(err as ApiError, 'Failed to complete term calendar setup.'));
        }
    };

    const handleReopenCalendarSetup = async () => {
        if (!selectedTerm) {
            return;
        }

        setPageError(null);
        try {
            await reopenCalendarSetup(selectedTerm.id);
        } catch (err) {
            setPageError(extractErrorMessage(err as ApiError, 'Failed to reopen term calendar setup.'));
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between gap-3">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Terms</h1>
                    <p className="mt-1 text-gray-500">
                        {isHistoricalView
                            ? 'Viewing historical terms and their final calendar records.'
                            : 'Manage academic terms and the organization term calendar used for schemes of work.'}
                    </p>
                </div>
                {!isHistoricalView && isAdminLike ? (
                    <Button onClick={openCreate}>
                        <Plus className="h-4 w-4" />
                        Add Term
                    </Button>
                ) : null}
            </div>

            {pageError ? <ErrorBanner message={pageError} onDismiss={() => setPageError(null)} /> : null}

            <Card>
                <div className="flex items-center gap-3">
                    <Select
                        value={selectedYearId?.toString() ?? ''}
                        onChange={(event) => setSelectedYearId(event.target.value ? Number(event.target.value) : undefined)}
                        options={[
                            { value: '', label: 'All Academic Years' },
                            ...academicYears.map((year) => ({
                                value: String(year.id),
                                label: year.is_current ? `${year.name} (Current)` : `${year.name} — Historical`,
                            })),
                        ]}
                    />
                    {isHistoricalView ? (
                        <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700 whitespace-nowrap">
                            <History className="h-3.5 w-3.5 shrink-0" />
                            Historical view
                        </div>
                    ) : null}
                </div>
            </Card>

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
                                : 'Create a term to set up the school calendar for schemes of work.'}
                        </p>
                        {!isHistoricalView && isAdminLike ? (
                            <Button className="mt-4" onClick={openCreate}>
                                <Plus className="h-4 w-4" />
                                Add Term
                            </Button>
                        ) : null}
                    </div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Term</TableHead>
                                <TableHead>Dates</TableHead>
                                <TableHead>Weeks</TableHead>
                                <TableHead>Calendar Setup</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {terms.map((term) => {
                                const lifecycleBadge = getTermLifecycleBadge(term);
                                const setupBadge = getCalendarSetupBadge(term);
                                const selected = term.id === selectedTermId;

                                return (
                                    <TableRow
                                        key={term.id}
                                        className={selected ? 'bg-blue-50/60' : ''}
                                    >
                                        <TableCell>
                                            <button
                                                type="button"
                                                onClick={() => setSelectedTermId(term.id)}
                                                className="text-left"
                                            >
                                                <div className="font-medium text-gray-900">{term.name}</div>
                                                <div className="text-xs text-gray-500">{term.academic_year_name}</div>
                                            </button>
                                        </TableCell>
                                        <TableCell className="text-gray-600">
                                            {formatDate(term.start_date)} to {formatDate(term.end_date)}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="info">{term.week_count}</Badge>
                                        </TableCell>
                                        <TableCell>
                                            <div className="space-y-1">
                                                <Badge variant={setupBadge.variant}>{setupBadge.label}</Badge>
                                                <p className="text-xs text-gray-500">{setupBadge.helper}</p>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={lifecycleBadge.variant}>{lifecycleBadge.label}</Badge>
                                        </TableCell>
                                        <TableCell>
                                            {!isHistoricalView && isAdminLike ? (
                                                <div className="flex justify-end gap-1">
                                                    <Button size="sm" variant="ghost" onClick={() => openEdit(term)}>
                                                        <Edit className="h-4 w-4" />
                                                    </Button>
                                                    <Button size="sm" variant="ghost" onClick={() => handleDelete(term)}>
                                                        <Trash2 className="h-4 w-4 text-red-500" />
                                                    </Button>
                                                </div>
                                            ) : null}
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                )}
            </Card>

            {selectedTerm ? (
                <Card className="space-y-6">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="space-y-2">
                            <div className="flex flex-wrap items-center gap-2">
                                <h2 className="text-xl font-semibold theme-text">{selectedTerm.name}</h2>
                                {selectedTermCalendarBadge ? (
                                    <Badge variant={selectedTermCalendarBadge.variant}>
                                        {selectedTermCalendarBadge.label}
                                    </Badge>
                                ) : null}
                                <Badge variant={getTermLifecycleBadge(selectedTerm).variant}>
                                    {getTermLifecycleBadge(selectedTerm).label}
                                </Badge>
                            </div>
                            <p className="text-sm theme-subtle">
                                {selectedTerm.academic_year_name} • {formatDate(selectedTerm.start_date)} to {formatDate(selectedTerm.end_date)}
                            </p>
                        </div>

                        <div className="flex flex-col gap-2 sm:flex-row">
                            {calendarEditable ? (
                                <>
                                    <Button variant="secondary" onClick={openCreateEvent}>
                                        <Plus className="h-4 w-4" />
                                        Add Calendar Event
                                    </Button>
                                    <Button onClick={handleCompleteCalendarSetup}>
                                        <CheckCircle2 className="h-4 w-4" />
                                        Mark Setup Complete
                                    </Button>
                                </>
                            ) : null}
                            {calendarReopenable ? (
                                <Button variant="secondary" onClick={handleReopenCalendarSetup}>
                                    <RefreshCcw className="h-4 w-4" />
                                    Reopen Setup
                                </Button>
                            ) : null}
                        </div>
                    </div>

                    {selectedTermCalendarBadge ? (
                        <div className={`rounded-xl border px-4 py-4 text-sm ${
                            selectedTermCalendarBadge.variant === 'success'
                                ? 'border-green-200 bg-green-50 text-green-900'
                                : 'border-amber-200 bg-amber-50 text-amber-900'
                        }`}>
                            <div className="flex items-start gap-3">
                                {selectedTermCalendarBadge.variant === 'success' ? (
                                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                                ) : (
                                    <Info className="mt-0.5 h-4 w-4 shrink-0" />
                                )}
                                <div>
                                    <p className="font-medium">{selectedTermCalendarBadge.label}</p>
                                    <p className="mt-1">{selectedTermCalendarBadge.helper}</p>
                                    {selectedTerm.is_calendar_setup_complete && selectedTerm.calendar_setup_completed_by_name ? (
                                        <p className="mt-2 text-xs">
                                            Completed by {selectedTerm.calendar_setup_completed_by_name}
                                            {selectedTerm.calendar_setup_completed_at
                                                ? ` on ${formatDate(selectedTerm.calendar_setup_completed_at)}`
                                                : ''}
                                        </p>
                                    ) : null}
                                </div>
                            </div>
                        </div>
                    ) : null}

                    <div className="grid gap-3 md:grid-cols-3">
                        <div className="rounded-lg bg-gray-50 px-4 py-3">
                            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Start Date</p>
                            <p className="mt-1 text-base font-semibold theme-text">{formatDate(selectedTerm.start_date)}</p>
                        </div>
                        <div className="rounded-lg bg-gray-50 px-4 py-3">
                            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">End Date</p>
                            <p className="mt-1 text-base font-semibold theme-text">{formatDate(selectedTerm.end_date)}</p>
                        </div>
                        <div className="rounded-lg bg-gray-50 px-4 py-3">
                            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Calculated Weeks</p>
                            <p className="mt-1 text-base font-semibold theme-text">{selectedTerm.week_count}</p>
                        </div>
                    </div>

                    {!calendarEditable && !calendarReopenable && isAdminLike ? (
                        <div className="flex items-start gap-3 rounded-xl border theme-border bg-gray-50 px-4 py-4 text-sm theme-text">
                            <Lock className="mt-0.5 h-4 w-4 shrink-0" />
                            <div>
                                <p className="font-medium">Term calendar locked</p>
                                <p className="mt-1 theme-subtle">
                                    {isHistoricalView || isTermPast(selectedTerm)
                                        ? 'Historical terms stay read-only.'
                                        : 'Reopen setup if you need to update the calendar before schemes move further into history.'}
                                </p>
                            </div>
                        </div>
                    ) : null}

                    <div className="space-y-3">
                        <div className="flex items-center justify-between gap-3">
                            <div>
                                <h3 className="text-lg font-semibold theme-text">Term Calendar Events</h3>
                                <p className="text-sm theme-subtle">
                                    These events are used to derive scheme exceptional weeks for every teacher in the term.
                                </p>
                            </div>
                            <Badge variant="info">{events.length}</Badge>
                        </div>

                        {eventsLoading ? (
                            <LoadingSpinner fullScreen={false} message="Loading term calendar..." />
                        ) : eventsError ? (
                            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-900">
                                {eventsError}
                            </div>
                        ) : events.length === 0 ? (
                            <div className="rounded-xl border theme-border bg-gray-50 px-4 py-6 text-sm theme-subtle">
                                No calendar events added yet.
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {events.map((event) => (
                                    <div
                                        key={event.id}
                                        className="rounded-xl border theme-border px-4 py-4"
                                    >
                                        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                                            <div className="min-w-0 space-y-2">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <p className="text-sm font-semibold theme-text">{event.title}</p>
                                                    <Badge variant={getTermCalendarEventBadgeVariant(event.event_type)}>
                                                        {getTermCalendarEventTypeLabel(event.event_type)}
                                                    </Badge>
                                                    <Badge variant={event.affects_learning ? 'warning' : 'default'}>
                                                        {event.affects_learning ? 'Affects learning' : 'Keeps learning active'}
                                                    </Badge>
                                                </div>
                                                <p className="text-sm theme-subtle">
                                                    {formatDate(event.start_date)} to {formatDate(event.end_date)}
                                                    {' • '}
                                                    Week {event.start_week_number ?? '—'}
                                                    {event.end_week_number && event.end_week_number !== event.start_week_number
                                                        ? ` to Week ${event.end_week_number}`
                                                        : ''}
                                                </p>
                                                <p className="text-sm theme-text">
                                                    {event.notes || 'No notes added'}
                                                </p>
                                            </div>

                                            {calendarEditable ? (
                                                <div className="flex gap-1">
                                                    <Button size="sm" variant="ghost" onClick={() => openEditEvent(event)}>
                                                        <Edit className="h-4 w-4" />
                                                    </Button>
                                                    <Button size="sm" variant="ghost" onClick={() => handleDeleteEvent(event)}>
                                                        <Trash2 className="h-4 w-4 text-red-500" />
                                                    </Button>
                                                </div>
                                            ) : null}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </Card>
            ) : null}

            <TermFormModal
                isOpen={showModal}
                onClose={closeModal}
                editing={editingTerm}
                academicYears={academicYears}
                initialData={initialData}
                onSave={handleSave}
            />

            <TermCalendarEventModal
                isOpen={showEventModal}
                onClose={closeEventModal}
                term={selectedTerm}
                editingEvent={editingEvent}
                onSave={handleSaveCalendarEvent}
            />
        </div>
    );
}
