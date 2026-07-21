'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
    AlertTriangle,
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
import { AcademicSetupGate } from '@/app/core/components/academic/setup/AcademicSetupGate';
import {
    TermFormModal,
    formatDate,
    isTermActive,
    isTermPast,
} from '@/app/core/components/academic/TermComponents';
import type { TermFormState } from '@/app/core/components/academic/TermComponents';
import { useAcademicYears, useTermCalendarEvents, useTerms } from '@/app/core/hooks/useAcademic';
import { useAcademicSetupStatus } from '@/app/core/hooks/useAcademicSetupStatus';
import { useWorkspaceSubscriptionSummary } from '@/app/core/hooks/useSubscriptions';
import {
    getAcademicSetupPageState,
    withAcademicSetupMode,
} from '@/app/core/lib/academicSetup';
import {
    canAddTermCalendarEvent,
    canCompleteTermCalendar,
    canDeleteTermCalendarEvent,
    canEditTermCalendarEvent,
    canReopenTermCalendar,
    isTermDetailLocked,
    resolveSelectedTermId,
    termHasHistoricalLifecycle,
} from '@/app/core/components/academic/terms/termSelection';
import type {
    Term,
    TermCalendarEvent,
    TermCalendarEventType,
} from '@/app/core/types/academic';
import { extractErrorCode, resolveErrorMessage } from '@/app/core/types/errors';
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

type ThemeBadgeTone = 'success' | 'warning' | 'danger' | 'info' | 'default';

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

const TERM_CONFIGURATION_LOCK_ERROR_CODES = new Set([
    'TERM_CONFIGURATION_LOCKED',
    'TERM_HISTORICAL_LOCKED',
    'TERM_DELETE_BLOCKED_BY_ACADEMIC_RECORDS',
    'TERM_SETUP_REOPEN_NOT_ALLOWED',
]);

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

function getThemeBadgeClass(tone: ThemeBadgeTone): string {
    switch (tone) {
        case 'success':
            return 'theme-success-surface text-[color:var(--color-success)]';
        case 'warning':
            return 'theme-warning-surface text-[color:var(--color-warning)]';
        case 'danger':
            return 'theme-danger-surface text-[color:var(--color-danger)]';
        case 'info':
            return 'theme-info-surface text-[color:var(--color-primary)]';
        default:
            return 'theme-border theme-surface-muted theme-muted';
    }
}

function getTermCalendarEventBadgeTone(eventType: TermCalendarEventType): ThemeBadgeTone {
    switch (eventType) {
        case 'HOLIDAY':
        case 'PUBLIC_HOLIDAY':
            return 'warning';
        case 'MIDTERM_BREAK':
            return 'warning';
        case 'MIDTERM_EXAM':
        case 'MAIN_EXAM':
        case 'EXIT_EXAM':
        case 'ENTRY_EXAM':
            return 'info';
        case 'SCHOOL_EVENT':
            return 'info';
        default:
            return 'default';
    }
}

function getCalendarSetupBadge(term: Term) {
    if (term.configuration_state === 'HISTORICAL_LOCKED') {
        return {
            label: 'Historical configuration locked',
            helper: term.configuration_locked_reason ?? 'Historical terms stay read-only',
            tone: 'default' as const,
        };
    }

    if (term.configuration_state === 'SETUP_LOCKED') {
        return {
            label: 'Calendar setup complete',
            helper: term.configuration_locked_reason ?? 'Term configuration locked',
            tone: 'success' as const,
        };
    }

    return {
        label: 'Calendar setup open',
        helper: 'Term dates and calendar events can still be configured',
        tone: 'warning' as const,
    };
}

function getTermLifecycleBadge(term: Term) {
    if (term.status === 'CLOSED_HISTORICAL' || term.is_frozen) {
        return { label: 'Historical', tone: 'default' as const };
    }
    if (term.status === 'CLOSING') {
        return { label: 'Closing', tone: 'warning' as const };
    }
    if (term.status === 'ENDED_GRACE_PERIOD') {
        return { label: 'Closure grace', tone: 'warning' as const };
    }
    if (isTermActive(term)) {
        return { label: 'Active', tone: 'success' as const };
    }
    if (isTermPast(term)) {
        return { label: 'Ended', tone: 'default' as const };
    }
    return { label: 'Upcoming', tone: 'warning' as const };
}

function termCanEdit(term: Term): boolean {
    return !termHasHistoricalLifecycle(term) && term.configuration_actions.can_edit_term;
}

function termCanDelete(term: Term): boolean {
    return !termHasHistoricalLifecycle(term) && term.configuration_actions.can_delete_term;
}

function termLockedReason(term: Term): string | null {
    return term.configuration_locked_reason;
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
            setError(resolveErrorMessage(err as ApiError, 'Failed to save term calendar event.'));
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

                <label className="flex items-start gap-3 rounded-lg border theme-border theme-surface-muted px-4 py-3 text-sm theme-text">
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
                        className="theme-focus-ring theme-input theme-surface-elevated min-h-[120px] w-full rounded-lg px-4 py-2"
                        placeholder="Optional details for teachers"
                    />
                </div>

                <div className="flex justify-end gap-3 border-t theme-border pt-2">
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
    const router = useRouter();
    const searchParams = useSearchParams();
    const setupMode = searchParams.get('setup') === '1';
    const blockedNotice = searchParams.get('blocked') === '1';
    const { user, activeRole } = useAuth();
    const setupStatusQuery = useAcademicSetupStatus({ enabled: setupMode });
    const subscriptionSummaryQuery = useWorkspaceSubscriptionSummary(undefined, { enabled: Boolean(user) });
    const { academicYears } = useAcademicYears();
    const currentYear = useMemo(() => academicYears.find((year) => year.is_current), [academicYears]);
    const isAdminLike = activeRole === 'ADMIN';
    const setupStatus = setupStatusQuery.data ?? null;
    const setupPageState = getAcademicSetupPageState(setupStatus, 'TERMS');

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
        refetch: refetchTerms,
    } = useTerms(selectedYearId);

    const visibleTerms = useMemo(
        () => (
            selectedYearId
                ? terms.filter((term) => term.academic_year === selectedYearId)
                : terms
        ),
        [selectedYearId, terms],
    );

    useEffect(() => {
        setSelectedTermId((currentSelectedTermId) => (
            resolveSelectedTermId(currentSelectedTermId, visibleTerms)
        ));
    }, [visibleTerms]);

    const selectedYear = academicYears.find((year) => year.id === selectedYearId);
    const isHistoricalView = selectedYear ? !selectedYear.is_current : false;
    const selectedTerm = useMemo(
        () => visibleTerms.find((term) => term.id === selectedTermId) ?? null,
        [selectedTermId, visibleTerms],
    );
    const {
        events,
        loading: eventsLoading,
        error: eventsError,
        createEvent,
        updateEvent,
        deleteEvent,
        refetch: refetchEvents,
    } = useTermCalendarEvents(selectedTerm?.id ?? null);

    const calendarAccessContext = {
        isAdminLike,
        term: selectedTerm,
    };
    const calendarCanAddEvent = canAddTermCalendarEvent(calendarAccessContext);
    const calendarCanEditEvent = canEditTermCalendarEvent(calendarAccessContext);
    const calendarCanDeleteEvent = canDeleteTermCalendarEvent(calendarAccessContext);
    const calendarCanComplete = canCompleteTermCalendar(calendarAccessContext);
    const calendarReopenable = canReopenTermCalendar(calendarAccessContext);
    const termDetailLocked = isTermDetailLocked(calendarAccessContext);

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
                sequence: visibleTerms.length + 1,
            }
    ), [editingTerm, currentYear, visibleTerms.length]);

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

    const recoverFromConfigurationLockError = async (
        err: ApiError & { code?: string | null },
        fallback: string,
    ): Promise<boolean> => {
        const code = extractErrorCode(err) ?? err.code ?? null;
        if (!code || !TERM_CONFIGURATION_LOCK_ERROR_CODES.has(code)) {
            return false;
        }

        const refreshedTerms = await refetchTerms();
        await refetchEvents();
        const refreshedTerm = selectedTermId
            ? refreshedTerms.find((term) => term.id === selectedTermId)
            : null;
        closeModal();
        closeEventModal();
        setPageError(
            refreshedTerm?.configuration_locked_reason
            ?? resolveErrorMessage(err, fallback),
        );
        return true;
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
            try {
                await updateTerm(editingId, payload);
            } catch (err) {
                await recoverFromConfigurationLockError(
                    err as ApiError & { code?: string | null },
                    'Failed to update term.',
                );
                throw err;
            }
            return;
        }

        let created: Term;
        try {
            created = await createTerm(payload);
        } catch (err) {
            if (extractErrorCode(err as ApiError) === 'subscription_required_for_term') {
                setPageError(resolveErrorMessage(err, 'Subscription required for this term.'));
            }
            throw err;
        }
        setSelectedTermId(created.id);
        if (setupMode) {
            const refreshedStatus = (await setupStatusQuery.refetch()).data;
            router.push(
                withAcademicSetupMode(
                    refreshedStatus?.next_action.href ?? '/academic/subjects',
                ),
            );
        }
    };

    const handleDelete = async (term: Term) => {
        if (!confirm(`Delete "${term.name}"? This cannot be undone.`)) {
            return;
        }

        setPageError(null);
        try {
            await deleteTerm(term.id);
        } catch (err) {
            const recovered = await recoverFromConfigurationLockError(
                err as ApiError & { code?: string | null },
                'Failed to delete term.',
            );
            if (!recovered) {
                setPageError(resolveErrorMessage(err as ApiError, 'Failed to delete term.'));
            }
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
            try {
                await updateEvent(editingId, payload);
            } catch (err) {
                await recoverFromConfigurationLockError(
                    err as ApiError & { code?: string | null },
                    'Failed to update term calendar event.',
                );
                throw err;
            }
            return;
        }

        try {
            await createEvent(payload);
        } catch (err) {
            await recoverFromConfigurationLockError(
                err as ApiError & { code?: string | null },
                'Failed to create term calendar event.',
            );
            throw err;
        }
    };

    const handleDeleteEvent = async (event: TermCalendarEvent) => {
        if (!confirm(`Delete "${event.title}" from the term calendar?`)) {
            return;
        }

        setPageError(null);
        try {
            await deleteEvent(event.id);
        } catch (err) {
            const recovered = await recoverFromConfigurationLockError(
                err as ApiError & { code?: string | null },
                'Failed to delete term calendar event.',
            );
            if (!recovered) {
                setPageError(resolveErrorMessage(err as ApiError, 'Failed to delete term calendar event.'));
            }
        }
    };

    const handleCompleteCalendarSetup = async () => {
        if (!selectedTerm) {
            return;
        }

        setPageError(null);
        try {
            const updated = await completeCalendarSetup(selectedTerm.id);
            setSelectedTermId(updated.id);
            await refetchEvents();
        } catch (err) {
            const recovered = await recoverFromConfigurationLockError(
                err as ApiError & { code?: string | null },
                'Failed to complete term calendar setup.',
            );
            if (!recovered) {
                setPageError(resolveErrorMessage(err as ApiError, 'Failed to complete term calendar setup.'));
            }
        }
    };

    const handleReopenCalendarSetup = async () => {
        if (!selectedTerm) {
            return;
        }
        const confirmed = window.confirm(
            'Reopening setup allows changes to term dates and calendar events. Existing schemes may require review or regeneration.',
        );
        if (!confirmed) {
            return;
        }

        setPageError(null);
        try {
            const updated = await reopenCalendarSetup(selectedTerm.id);
            setSelectedTermId(updated.id);
            await refetchEvents();
        } catch (err) {
            const recovered = await recoverFromConfigurationLockError(
                err as ApiError & { code?: string | null },
                'Failed to reopen term calendar setup.',
            );
            if (!recovered) {
                setPageError(resolveErrorMessage(err as ApiError, 'Failed to reopen term calendar setup.'));
            }
        }
    };

    if (setupMode && setupStatusQuery.isLoading && !setupStatus) {
        return <LoadingSpinner fullScreen={false} message="Loading academic setup..." />;
    }

    if (setupMode && setupPageState === 'blocked') {
        return (
            <div className="space-y-6">
                <AcademicSetupGate
                    status={setupStatus}
                    stepKey="TERMS"
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
                stepKey="TERMS"
                setupMode={setupMode}
                blockedNotice={blockedNotice}
            />
            <div className="flex items-center justify-between gap-3">
                <div>
                    <h1 className="text-3xl font-bold theme-text">Terms</h1>
                    <p className="mt-1 theme-muted">
                        {isHistoricalView
                            ? 'Viewing historical terms and their final calendar records.'
                            : 'Manage academic terms and the organization term calendar used for schemes of work.'}
                    </p>
                </div>
                {isAdminLike ? (
                    <Button onClick={openCreate}>
                        <Plus className="h-4 w-4" />
                        Add Term
                    </Button>
                ) : null}
            </div>

            {pageError ? <ErrorBanner message={pageError} onDismiss={() => setPageError(null)} /> : null}

            {subscriptionSummaryQuery.data?.renewal_required ? (
                <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-800">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                    <div>
                        <p className="font-medium">{subscriptionSummaryQuery.data.term_creation_message}</p>
                        <p className="mt-1">
                            Existing academic records remain available. A subscription period covering the
                            proposed term dates is required only when creating a new term.
                        </p>
                    </div>
                </div>
            ) : null}

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
                        <div className="theme-warning-surface flex items-center gap-2 rounded-lg px-3 py-2 text-xs whitespace-nowrap">
                            <History className="h-3.5 w-3.5 shrink-0 text-[color:var(--color-warning)]" />
                            Historical view
                        </div>
                    ) : null}
                </div>
            </Card>

            <Card>
                {loading ? (
                    <LoadingSpinner fullScreen={false} message="Loading terms..." />
                ) : visibleTerms.length === 0 ? (
                    <div className="py-12 text-center">
                        <Calendar className="mx-auto h-12 w-12 theme-subtle" />
                        <h3 className="mt-2 text-sm font-medium theme-text">No terms found</h3>
                        <p className="mt-1 text-sm theme-muted">
                            {isHistoricalView
                                ? 'No terms exist for this academic year.'
                                : 'Create a term to set up the school calendar for schemes of work.'}
                        </p>
                        {isAdminLike ? (
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
                            {visibleTerms.map((term) => {
                                const lifecycleBadge = getTermLifecycleBadge(term);
                                const setupBadge = getCalendarSetupBadge(term);
                                const selected = term.id === selectedTermId;
                                const canEditTerm = isAdminLike && termCanEdit(term);
                                const canDeleteTerm = isAdminLike && termCanDelete(term);
                                const actionLockedReason = termLockedReason(term);

                                return (
                                    <TableRow
                                        key={term.id}
                                        className={selected ? 'theme-info-surface-strong' : ''}
                                    >
                                        <TableCell>
                                            <button
                                                type="button"
                                                onClick={() => setSelectedTermId(term.id)}
                                                className="theme-focus-ring block w-full rounded-lg text-left"
                                            >
                                                <div className={selected ? 'border-l-4 border-[color:var(--color-primary)] pl-3' : ''}>
                                                    <div className="font-medium theme-text">{term.name}</div>
                                                    <div className={`text-xs ${selected ? 'theme-muted' : 'theme-subtle'}`}>
                                                        {term.academic_year_name}
                                                    </div>
                                                </div>
                                            </button>
                                        </TableCell>
                                        <TableCell className={selected ? 'theme-text' : 'theme-muted'}>
                                            {formatDate(term.start_date)} to {formatDate(term.end_date)}
                                        </TableCell>
                                        <TableCell>
                                            <Badge className={getThemeBadgeClass('info')}>{term.week_count}</Badge>
                                        </TableCell>
                                        <TableCell>
                                            <div className="space-y-1">
                                                <Badge className={getThemeBadgeClass(setupBadge.tone)}>{setupBadge.label}</Badge>
                                                <p className={`text-xs ${selected ? 'theme-muted' : 'theme-subtle'}`}>{setupBadge.helper}</p>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge className={getThemeBadgeClass(lifecycleBadge.tone)}>{lifecycleBadge.label}</Badge>
                                        </TableCell>
                                        <TableCell>
                                            {isAdminLike ? (
                                                <div className="flex justify-end gap-1">
                                                    {canEditTerm ? (
                                                        <Button size="sm" variant="ghost" onClick={() => openEdit(term)}>
                                                            <Edit className="h-4 w-4" />
                                                        </Button>
                                                    ) : null}
                                                    {canDeleteTerm ? (
                                                        <Button size="sm" variant="ghost" onClick={() => handleDelete(term)}>
                                                            <Trash2 className="h-4 w-4 text-[color:var(--color-danger)]" />
                                                        </Button>
                                                    ) : null}
                                                    {!canEditTerm && !canDeleteTerm ? (
                                                        <span
                                                            className="inline-flex min-h-9 min-w-9 items-center justify-center rounded-lg theme-subtle"
                                                            title={actionLockedReason ?? 'This term is managed by its lifecycle state.'}
                                                            aria-label={actionLockedReason ?? 'Term actions locked'}
                                                        >
                                                            <Lock className="h-4 w-4" />
                                                        </span>
                                                    ) : null}
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
                                    <Badge className={getThemeBadgeClass(selectedTermCalendarBadge.tone)}>
                                        {selectedTermCalendarBadge.label}
                                    </Badge>
                                ) : null}
                                <Badge className={getThemeBadgeClass(getTermLifecycleBadge(selectedTerm).tone)}>
                                    {getTermLifecycleBadge(selectedTerm).label}
                                </Badge>
                            </div>
                            <p className="text-sm theme-subtle">
                                {selectedTerm.academic_year_name} • {formatDate(selectedTerm.start_date)} to {formatDate(selectedTerm.end_date)}
                            </p>
                        </div>

                        <div className="flex flex-col gap-2 sm:flex-row">
                            {calendarCanAddEvent || calendarCanComplete ? (
                                <div className="flex flex-col gap-2 sm:flex-row">
                                    {calendarCanAddEvent ? (
                                        <Button variant="secondary" onClick={openCreateEvent}>
                                            <Plus className="h-4 w-4" />
                                            Add Calendar Event
                                        </Button>
                                    ) : null}
                                    {calendarCanComplete ? (
                                        <Button onClick={handleCompleteCalendarSetup}>
                                            <CheckCircle2 className="h-4 w-4" />
                                            Mark Setup Complete
                                        </Button>
                                    ) : null}
                                </div>
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
                        <div className={`rounded-xl px-4 py-4 text-sm ${
                            selectedTermCalendarBadge.tone === 'success'
                                ? 'theme-success-surface'
                                : selectedTermCalendarBadge.tone === 'warning'
                                    ? 'theme-warning-surface'
                                    : 'theme-border theme-surface-muted border'
                        }`}>
                            <div className="flex items-start gap-3">
                                {selectedTermCalendarBadge.tone === 'success' ? (
                                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[color:var(--color-success)]" />
                                ) : (
                                    <Info className="mt-0.5 h-4 w-4 shrink-0 text-[color:var(--color-warning)]" />
                                )}
                                <div>
                                    <p className="font-medium theme-text">{selectedTermCalendarBadge.label}</p>
                                    <p className="mt-1 theme-muted">{selectedTermCalendarBadge.helper}</p>
                                    {selectedTerm.configuration_state === 'SETUP_LOCKED' ? (
                                        <p className="mt-1 theme-muted">
                                            The term dates and calendar are being used by schemes of work.
                                            Reopen setup to make changes.
                                        </p>
                                    ) : null}
                                    {selectedTerm.configuration_state === 'SETUP_LOCKED' && selectedTerm.calendar_setup_completed_by_name ? (
                                        <p className="mt-2 text-xs theme-subtle">
                                            Completed by {selectedTerm.calendar_setup_completed_by_name}
                                            {selectedTerm.calendar_setup_completed_at
                                                ? ` on ${formatDate(selectedTerm.calendar_setup_completed_at)}`
                                                : ''}
                                        </p>
                                    ) : null}
                                    {selectedTerm.calendar_setup_reopened_by_name && selectedTerm.calendar_setup_reopened_at ? (
                                        <p className="mt-2 text-xs theme-subtle">
                                            Last reopened by {selectedTerm.calendar_setup_reopened_by_name}
                                            {' on '}
                                            {formatDate(selectedTerm.calendar_setup_reopened_at)}
                                        </p>
                                    ) : null}
                                </div>
                            </div>
                        </div>
                    ) : null}

                    <div className="grid gap-3 md:grid-cols-3">
                        <div className="rounded-lg border theme-border theme-surface-muted px-4 py-3">
                            <p className="text-xs font-medium uppercase tracking-wide theme-subtle">Start Date</p>
                            <p className="mt-1 text-base font-semibold theme-text">{formatDate(selectedTerm.start_date)}</p>
                        </div>
                        <div className="rounded-lg border theme-border theme-surface-muted px-4 py-3">
                            <p className="text-xs font-medium uppercase tracking-wide theme-subtle">End Date</p>
                            <p className="mt-1 text-base font-semibold theme-text">{formatDate(selectedTerm.end_date)}</p>
                        </div>
                        <div className="rounded-lg border theme-border theme-surface-muted px-4 py-3">
                            <p className="text-xs font-medium uppercase tracking-wide theme-subtle">Calculated Weeks</p>
                            <p className="mt-1 text-base font-semibold theme-text">{selectedTerm.week_count}</p>
                        </div>
                    </div>

                    {termDetailLocked ? (
                        <div className="flex items-start gap-3 rounded-xl border theme-border theme-surface-muted px-4 py-4 text-sm theme-text">
                            <Lock className="mt-0.5 h-4 w-4 shrink-0" />
                            <div>
                                <p className="font-medium">
                                    {selectedTerm.configuration_state === 'HISTORICAL_LOCKED'
                                        ? 'Historical term locked'
                                        : 'Term configuration locked'}
                                </p>
                                <p className="mt-1 theme-muted">
                                    {termLockedReason(selectedTerm) ?? 'The server has locked configuration changes for this term.'}
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
                            <Badge className={getThemeBadgeClass('info')}>{events.length}</Badge>
                        </div>

                        {eventsLoading ? (
                            <LoadingSpinner fullScreen={false} message="Loading term calendar..." />
                        ) : eventsError ? (
                            <div className="theme-danger-surface rounded-xl px-4 py-4 text-sm">
                                {eventsError}
                            </div>
                        ) : events.length === 0 ? (
                            <div className="rounded-xl border theme-border theme-surface-muted px-4 py-6 text-sm theme-muted">
                                No calendar events added yet.
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {events.map((event) => (
                                    <div
                                        key={event.id}
                                        className="rounded-xl border theme-border theme-surface-elevated px-4 py-4"
                                    >
                                        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                                            <div className="min-w-0 space-y-2">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <p className="text-sm font-semibold theme-text">{event.title}</p>
                                                    <Badge className={getThemeBadgeClass(getTermCalendarEventBadgeTone(event.event_type))}>
                                                        {getTermCalendarEventTypeLabel(event.event_type)}
                                                    </Badge>
                                                    <Badge className={getThemeBadgeClass(event.affects_learning ? 'warning' : 'default')}>
                                                        {event.affects_learning ? 'Affects learning' : 'Keeps learning active'}
                                                    </Badge>
                                                </div>
                                                <p className="text-sm theme-muted">
                                                    {formatDate(event.start_date)} to {formatDate(event.end_date)}
                                                    {' • '}
                                                    Week {event.start_week_number ?? '—'}
                                                    {event.end_week_number && event.end_week_number !== event.start_week_number
                                                        ? ` to Week ${event.end_week_number}`
                                                        : ''}
                                                </p>
                                                <p className={`text-sm ${event.notes ? 'theme-text' : 'theme-muted'}`}>
                                                    {event.notes || 'No notes added'}
                                                </p>
                                            </div>

                                            {calendarCanEditEvent || calendarCanDeleteEvent ? (
                                                <div className="flex gap-1">
                                                    {calendarCanEditEvent ? (
                                                        <Button size="sm" variant="ghost" onClick={() => openEditEvent(event)}>
                                                            <Edit className="h-4 w-4" />
                                                        </Button>
                                                    ) : null}
                                                    {calendarCanDeleteEvent ? (
                                                        <Button size="sm" variant="ghost" onClick={() => handleDeleteEvent(event)}>
                                                            <Trash2 className="h-4 w-4 text-[color:var(--color-danger)]" />
                                                        </Button>
                                                    ) : null}
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
