'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Download,
  FileText,
  NotebookPen,
  Save,
} from 'lucide-react';
import Modal from '@/app/components/ui/Modal';
import { Badge } from '@/app/components/ui/Badge';
import { Button } from '@/app/components/ui/Button';
import { Card } from '@/app/components/ui/Card';
import { ErrorBanner } from '@/app/components/ui/ErrorBanner';
import { ErrorState } from '@/app/components/ui/ErrorState';
import { Input } from '@/app/components/ui/Input';
import { LoadingSpinner } from '@/app/components/ui/LoadingSpinner';
import { Select } from '@/app/components/ui/Select';
import { useAssistantPageContext } from '@/app/core/components/assistant/useAssistantPageContext';
import { useSchemeDetail } from '@/app/core/hooks/useSchemes';
import type {
  SchemeEntry,
  SchemeEntryUpdatePayload,
  SchemeWeek,
  SchemeWeekType,
} from '@/app/core/types/schemes';
import { useAuth } from '@/app/context/AuthContext';
import { formatTimestamp, getSchemeWeekTypeLabel } from '@/app/plugins/schemes/lib/workflow';
import { TextAreaField } from '@/app/plugins/schemes/components/TextAreaField';

const REFLECTION_NOTICE =
  'Reflections are auto-filled from lesson reflections recorded after taught outcomes or learner performance evidence. You can review them here.';
const EXPANDED_WEEK_STORAGE_PREFIX = 'scholaroscope.schemes.detail.expandedWeek.v1';

const WEEK_TYPE_OPTIONS: { value: SchemeWeekType; label: string }[] = [
  { value: 'TEACHING', label: 'Teaching' },
  { value: 'MIDTERM_BREAK', label: 'Midterm Break' },
  { value: 'MIDTERM_EXAM', label: 'Midterm Exams' },
  { value: 'ENTRY_EXAM', label: 'Entry Exams' },
  { value: 'EXIT_EXAM', label: 'End Term Exams' },
  { value: 'HOLIDAY', label: 'Holiday' },
  { value: 'OTHER', label: 'Other' },
];

interface EntryDraftState {
  learning_experiences: string;
  key_inquiry_questions: string;
  learning_resources: string;
  assessment_methods: string;
  reflection: string;
}

interface WeekDraftState {
  week_type: SchemeWeekType;
  label: string;
  notes: string;
  affects_learning: boolean;
}

function getSchemeId(rawId: string | string[] | undefined): number | null {
  const resolved = Array.isArray(rawId) ? rawId[0] : rawId;
  const numericId = Number(resolved);

  return Number.isFinite(numericId) ? numericId : null;
}

function buildEntryDraft(entry: SchemeEntry): EntryDraftState {
  return {
    learning_experiences: entry.learning_experiences,
    key_inquiry_questions: entry.key_inquiry_questions,
    learning_resources: entry.learning_resources,
    assessment_methods: entry.assessment_methods,
    reflection: entry.reflection,
  };
}

function buildWeekDraft(week: SchemeWeek): WeekDraftState {
  return {
    week_type: week.week_type,
    label: week.label,
    notes: week.notes,
    affects_learning: week.affects_learning,
  };
}

function getEntryPatch(entry: SchemeEntry, draft: EntryDraftState): SchemeEntryUpdatePayload {
  const payload: SchemeEntryUpdatePayload = {};

  if (entry.learning_experiences !== draft.learning_experiences) {
    payload.learning_experiences = draft.learning_experiences;
  }
  if (entry.key_inquiry_questions !== draft.key_inquiry_questions) {
    payload.key_inquiry_questions = draft.key_inquiry_questions;
  }
  if (entry.learning_resources !== draft.learning_resources) {
    payload.learning_resources = draft.learning_resources;
  }
  if (entry.assessment_methods !== draft.assessment_methods) {
    payload.assessment_methods = draft.assessment_methods;
  }
  if (entry.reflection !== draft.reflection) {
    payload.reflection = draft.reflection;
  }

  return payload;
}

function getExpandedWeekStorageKey(schemeId: number): string {
  return `${EXPANDED_WEEK_STORAGE_PREFIX}:${schemeId}`;
}

function normalizeText(value: string | null | undefined): string {
  return (value ?? '').trim();
}

function uniqueNonEmpty(values: string[]): string[] {
  const seen = new Set<string>();

  return values.filter((value) => {
    const normalized = normalizeText(value);
    if (!normalized || seen.has(normalized)) {
      return false;
    }
    seen.add(normalized);
    return true;
  });
}

function summarizeList(values: string[], limit = 2): string {
  const items = uniqueNonEmpty(values);
  if (items.length === 0) {
    return 'Not set yet';
  }

  if (items.length <= limit) {
    return items.join(' • ');
  }

  return `${items.slice(0, limit).join(' • ')} +${items.length - limit} more`;
}

function getWeekSummary(entries: SchemeEntry[], entryDrafts: Record<number, EntryDraftState>) {
  const reflections = entries.filter((entry) => {
    const reflection = entryDrafts[entry.id]?.reflection ?? entry.reflection;
    return normalizeText(reflection).length > 0;
  }).length;

  return {
    lessonCount: entries.length,
    strandSummary: summarizeList(entries.map((entry) => entry.strand)),
    subStrandSummary: summarizeList(entries.map((entry) => entry.sub_strand)),
    hasReflection: reflections > 0,
    reflectionCount: reflections,
  };
}

function getWeekStatusVariant(week: SchemeWeek): 'success' | 'warning' | 'default' {
  if (week.week_type === 'TEACHING') {
    return 'success';
  }

  if (week.affects_learning) {
    return 'warning';
  }

  return 'default';
}

function MetaItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-gray-50 px-3 py-3">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-1 text-sm theme-text">{value || 'Not set'}</p>
    </div>
  );
}

function ExpandableTextBlock({
  label,
  value,
  emptyValue = 'Not set yet',
}: {
  label: string;
  value: string;
  emptyValue?: string;
}) {
  const content = normalizeText(value);
  const [open, setOpen] = useState(false);
  const requiresModal = content.length > 220 || content.includes('\n');

  return (
    <>
      <div className="rounded-lg border theme-border bg-white px-3 py-3">
        <div className="flex items-start justify-between gap-3">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</p>
          {requiresModal ? (
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="text-xs font-medium text-[color:var(--color-primary)]"
            >
              View more
            </button>
          ) : null}
        </div>
        <div className="mt-2">
          {content ? (
            <p
              className={`whitespace-pre-wrap text-sm theme-text ${
                requiresModal ? 'max-h-24 overflow-hidden' : ''
              }`}
            >
              {content}
            </p>
          ) : (
            <p className="text-sm theme-subtle">{emptyValue}</p>
          )}
        </div>
      </div>

      <Modal isOpen={open} onClose={() => setOpen(false)} title={label} size="lg">
        <p className="whitespace-pre-wrap text-sm theme-text">{content || emptyValue}</p>
      </Modal>
    </>
  );
}

function EmptyLessonState({ week }: { week: SchemeWeek }) {
  const label = week.label || getSchemeWeekTypeLabel(week.week_type);

  return (
    <div className="rounded-xl border theme-border bg-gray-50 px-4 py-4">
      <p className="text-sm font-medium theme-text">{label}</p>
      <p className="mt-1 text-sm theme-subtle">
        This week does not have lesson rows. Keep the week details here for the school record.
      </p>
      {week.notes ? (
        <p className="mt-3 whitespace-pre-wrap text-sm theme-text">{week.notes}</p>
      ) : null}
    </div>
  );
}

export function SchemeDetailPage() {
  const params = useParams();
  const { activeOrg } = useAuth();
  const schemeId = getSchemeId(params.id);
  const {
    scheme,
    weeks,
    loading,
    error,
    refetch,
    updateScheme,
    updateWeek,
    updateEntry,
    downloadSchemeDocx,
    downloadSchemeCsv,
  } = useSchemeDetail(schemeId);

  const [titleDraft, setTitleDraft] = useState('');
  const [savingTitle, setSavingTitle] = useState(false);
  const [savingWeekId, setSavingWeekId] = useState<number | null>(null);
  const [savingEntryId, setSavingEntryId] = useState<number | null>(null);
  const [downloadingDocx, setDownloadingDocx] = useState(false);
  const [downloadingCsv, setDownloadingCsv] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [entryDrafts, setEntryDrafts] = useState<Record<number, EntryDraftState>>({});
  const [weekDrafts, setWeekDrafts] = useState<Record<number, WeekDraftState>>({});
  const [expandedWeekId, setExpandedWeekId] = useState<number | null>(null);
  const [editingWeekId, setEditingWeekId] = useState<number | null>(null);
  const [expandedTeacherFields, setExpandedTeacherFields] = useState<Record<number, boolean>>({});
  const [expandedReflections, setExpandedReflections] = useState<Record<number, boolean>>({});

  useEffect(() => {
    if (!scheme) {
      return;
    }
    setTitleDraft(scheme.title);
  }, [scheme]);

  useEffect(() => {
    if (!schemeId || weeks.length === 0) {
      return;
    }

    const storageKey = getExpandedWeekStorageKey(schemeId);
    const storedWeekId =
      typeof window === 'undefined'
        ? Number.NaN
        : Number(window.sessionStorage.getItem(storageKey) ?? '');

    setExpandedWeekId((current) => {
      if (current && weeks.some((week) => week.id === current)) {
        return current;
      }

      if (Number.isFinite(storedWeekId) && weeks.some((week) => week.id === storedWeekId)) {
        return storedWeekId;
      }

      return weeks[0].id;
    });
  }, [schemeId, weeks]);

  useEffect(() => {
    if (!schemeId || !expandedWeekId || typeof window === 'undefined') {
      return;
    }

    window.sessionStorage.setItem(getExpandedWeekStorageKey(schemeId), String(expandedWeekId));
  }, [expandedWeekId, schemeId]);

  useEffect(() => {
    document.documentElement.style.setProperty('--assistant-widget-offset', '6rem');

    return () => {
      document.documentElement.style.removeProperty('--assistant-widget-offset');
    };
  }, []);

  const entries = useMemo(() => scheme?.entries ?? [], [scheme?.entries]);
  const entriesByWeek = useMemo(() => {
    const map = new Map<number, SchemeEntry[]>();
    entries.forEach((entry) => {
      const list = map.get(entry.week) ?? [];
      list.push(entry);
      map.set(entry.week, list);
    });
    map.forEach((weekEntries, weekId) => {
      map.set(
        weekId,
        [...weekEntries].sort((left, right) => {
          if (left.lesson === right.lesson) {
            return left.id - right.id;
          }
          return left.lesson - right.lesson;
        }),
      );
    });
    return map;
  }, [entries]);

  const teachingWeeks = useMemo(
    () => weeks.filter((week) => week.week_type === 'TEACHING'),
    [weeks],
  );
  const exceptionalWeeks = useMemo(
    () => weeks.filter((week) => week.week_type !== 'TEACHING'),
    [weeks],
  );

  const readOnly = scheme?.is_historical ?? false;
  const isTitleDirty = Boolean(scheme && titleDraft.trim() !== scheme.title.trim());

  const openWeek = useCallback((weekId: number) => {
    setExpandedWeekId(weekId);
  }, []);

  const toggleWeek = useCallback((weekId: number) => {
    setExpandedWeekId((current) => (current === weekId ? null : weekId));
  }, []);

  const toggleTeacherFields = useCallback((entryId: number) => {
    setExpandedTeacherFields((current) => ({
      ...current,
      [entryId]: !current[entryId],
    }));
  }, []);

  const toggleReflection = useCallback((entryId: number) => {
    setExpandedReflections((current) => ({
      ...current,
      [entryId]: !current[entryId],
    }));
  }, []);

  const handleSaveTitle = async () => {
    if (!scheme || !isTitleDirty) {
      return;
    }

    try {
      setActionError(null);
      setSavingTitle(true);
      await updateScheme({ title: titleDraft.trim() });
      setActionSuccess('Scheme title saved.');
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not save the scheme title.');
    } finally {
      setSavingTitle(false);
    }
  };

  const handleSaveWeek = async (week: SchemeWeek) => {
    const draft = weekDrafts[week.id] ?? buildWeekDraft(week);
    const isDirty =
      week.week_type !== draft.week_type ||
      week.label !== draft.label ||
      week.notes !== draft.notes ||
      week.affects_learning !== draft.affects_learning;

    if (!isDirty) {
      return;
    }

    try {
      setActionError(null);
      setSavingWeekId(week.id);
      openWeek(week.id);
      await updateWeek(week.id, draft);
      setWeekDrafts((current) => {
        const next = { ...current };
        delete next[week.id];
        return next;
      });
      await refetch();
      setEditingWeekId(null);
      setActionSuccess(`Week ${week.week_number} saved.`);
    } catch (err) {
      openWeek(week.id);
      setEditingWeekId(week.id);
      setActionError(err instanceof Error ? err.message : 'Could not save the learning week.');
    } finally {
      setSavingWeekId(null);
    }
  };

  const handleSaveEntry = async (entry: SchemeEntry) => {
    const draft = entryDrafts[entry.id] ?? buildEntryDraft(entry);
    const payload = getEntryPatch(entry, draft);

    if (Object.keys(payload).length === 0) {
      return;
    }

    try {
      setActionError(null);
      setSavingEntryId(entry.id);
      openWeek(entry.week);
      await updateEntry(entry.id, payload);
      setEntryDrafts((current) => {
        const next = { ...current };
        delete next[entry.id];
        return next;
      });
      setActionSuccess(`Week ${entry.week_number} lesson ${entry.lesson} saved.`);
    } catch (err) {
      openWeek(entry.week);
      setExpandedTeacherFields((current) => ({ ...current, [entry.id]: true }));
      setExpandedReflections((current) => ({ ...current, [entry.id]: true }));
      setActionError(err instanceof Error ? err.message : 'Could not save the lesson draft.');
    } finally {
      setSavingEntryId(null);
    }
  };

  const handleDownloadDocx = useCallback(async () => {
    try {
      setActionError(null);
      setDownloadingDocx(true);
      await downloadSchemeDocx();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not download the Word document.');
    } finally {
      setDownloadingDocx(false);
    }
  }, [downloadSchemeDocx]);

  const handleDownloadCsv = useCallback(async () => {
    try {
      setActionError(null);
      setDownloadingCsv(true);
      await downloadSchemeCsv();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not download the CSV export.');
    } finally {
      setDownloadingCsv(false);
    }
  }, [downloadSchemeCsv]);

  const assistantContext = useMemo(
    () => ({
      pageKey: 'schemes.detail',
      pageTitle: scheme?.title ?? 'Scheme of Work',
      state: {
        is_loading: loading,
        assistant_default_mode: 'minimized',
        assistant_desktop_side: 'left',
        week_count: weeks.length,
        exceptional_week_count: exceptionalWeeks.length,
        is_historical: readOnly,
      },
      nextSafeAction: scheme
        ? {
            label: 'Download Word document',
            type: 'page_action' as const,
            target: 'download-scheme-docx',
            handler: () => {
              void handleDownloadDocx();
            },
          }
        : undefined,
      visibleActions: scheme
        ? [
            {
              label: 'Download Word document',
              type: 'page_action' as const,
              target: 'download-scheme-docx',
              handler: () => {
                void handleDownloadDocx();
              },
            },
          ]
        : [],
      workflowStep: 'review-scheme-weeks',
    }),
    [exceptionalWeeks.length, handleDownloadDocx, loading, readOnly, scheme, weeks.length],
  );

  useAssistantPageContext(assistantContext);

  if (!schemeId) {
    return <ErrorState message="This scheme of work could not be found." fullScreen={false} />;
  }

  if (loading) {
    return <LoadingSpinner message="Loading scheme of work..." fullScreen={false} />;
  }

  if (error || !scheme) {
    return (
      <ErrorState message={error ?? 'This scheme of work could not be found.'} fullScreen={false} />
    );
  }

  return (
    <div className="space-y-6 pb-24 lg:pb-12">
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/schemes">
          <Button type="button" variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4" />
            Back to Schemes
          </Button>
        </Link>
      </div>

      {actionError ? (
        <ErrorBanner
          title="Scheme update"
          message={actionError}
          onDismiss={() => setActionError(null)}
        />
      ) : null}

      {actionSuccess ? (
        <ErrorBanner
          title="Saved"
          message={actionSuccess}
          variant="success"
          autoDismissMs={3000}
          onDismiss={() => setActionSuccess(null)}
        />
      ) : null}

      <Card className="space-y-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold theme-text">{scheme.title}</h1>
              <Badge variant={scheme.is_historical ? 'warning' : 'success'}>
                {scheme.status_display}
              </Badge>
              {scheme.is_historical ? <Badge variant="warning">Historical record</Badge> : null}
            </div>
            <p className="text-sm theme-subtle">
              {scheme.subject_name} • {scheme.cohort_name || scheme.level_label} •{' '}
              {scheme.term_name}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Badge variant="blue">{scheme.entries_count} lesson drafts</Badge>
            <Badge variant="default">{scheme.active_learning_week_count} active weeks</Badge>
            <Badge variant="default">{scheme.lessons_per_week} lessons/week</Badge>
            <Badge variant="default">{scheme.lesson_duration_minutes} min lessons</Badge>
            {scheme.exceptional_week_count > 0 ? (
              <Badge variant="warning">{scheme.exceptional_week_count} exceptional weeks</Badge>
            ) : null}
            <Button
              type="button"
              variant="secondary"
              onClick={() => void handleDownloadCsv()}
              disabled={downloadingCsv}
            >
              <FileText className="h-4 w-4" />
              {downloadingCsv ? 'Downloading CSV...' : 'Download CSV'}
            </Button>
            <Button
              type="button"
              onClick={() => void handleDownloadDocx()}
              disabled={downloadingDocx}
            >
              <Download className="h-4 w-4" />
              {downloadingDocx ? 'Downloading...' : 'Download Word document'}
            </Button>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <MetaItem label="School / Organization" value={activeOrg?.name ?? 'Current workspace'} />
          <MetaItem label="Curriculum" value={scheme.curriculum_name} />
          <MetaItem label="Subject" value={scheme.subject_name} />
          <MetaItem label="Grade / Class" value={scheme.cohort_name || scheme.level_label} />
          <MetaItem label="Term" value={scheme.term_name} />
          <MetaItem label="Academic Year" value={scheme.academic_year_name} />
          <MetaItem label="Teacher" value={scheme.teacher_name} />
          <MetaItem
            label="Weekly teaching periods"
            value={`${scheme.lessons_per_week} lessons per week`}
          />
          <MetaItem
            label="Lesson duration"
            value={`${scheme.lesson_duration_minutes} minutes`}
          />
          <MetaItem
            label="Planned lesson rows"
            value={String(scheme.total_lesson_slots ?? scheme.entries_count)}
          />
          <MetaItem label="Last updated" value={formatTimestamp(scheme.updated_at)} />
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_auto]">
          <Input
            label="Scheme title"
            value={titleDraft}
            onChange={(event) => setTitleDraft(event.target.value)}
            disabled={readOnly}
          />
          <div className="flex items-end">
            <Button
              type="button"
              onClick={() => void handleSaveTitle()}
              disabled={!isTitleDirty || savingTitle || readOnly}
            >
              <Save className="h-4 w-4" />
              {savingTitle ? 'Saving...' : 'Save title'}
            </Button>
          </div>
        </div>

        {readOnly ? (
          <div className="rounded-xl border border-yellow-200 bg-yellow-50 px-4 py-4 text-sm text-yellow-900">
            {scheme.read_only_reason ||
              'This scheme is now a historical record for the completed term.'}
          </div>
        ) : null}

        <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-4 text-sm text-blue-900">
          {REFLECTION_NOTICE}
        </div>
      </Card>

      <Card className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold theme-text">Learning Weeks</h2>
            <p className="mt-1 text-sm theme-subtle">
              Open one week at a time to review lessons, edit teacher draft fields, or adjust week
              details.
            </p>
          </div>
          <Badge variant="success">{teachingWeeks.length} teaching weeks</Badge>
        </div>

        <div className="space-y-4">
          {teachingWeeks.map((week) => {
            const weekEntries = entriesByWeek.get(week.id) ?? [];
            const summary = getWeekSummary(weekEntries, entryDrafts);
            const expanded = expandedWeekId === week.id;
            const editing = editingWeekId === week.id;
            const draft = weekDrafts[week.id] ?? buildWeekDraft(week);
            const isWeekDirty =
              week.week_type !== draft.week_type ||
              week.label !== draft.label ||
              week.notes !== draft.notes ||
              week.affects_learning !== draft.affects_learning;

            return (
              <div key={week.id} className="overflow-hidden rounded-xl border theme-border">
                <div className="flex flex-col gap-4 px-4 py-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-base font-semibold theme-text">
                          Week {week.week_number}
                        </h3>
                        <Badge variant={getWeekStatusVariant(week)}>
                          {week.label || getSchemeWeekTypeLabel(week.week_type)}
                        </Badge>
                        {summary.hasReflection ? (
                          <Badge variant="green">{summary.reflectionCount} reflections</Badge>
                        ) : (
                          <Badge variant="default">No reflections yet</Badge>
                        )}
                      </div>
                      <div className="grid gap-2 text-sm theme-subtle sm:grid-cols-3">
                        <p>
                          {summary.lessonCount} lesson{summary.lessonCount === 1 ? '' : 's'}
                        </p>
                        <p>{summary.strandSummary}</p>
                        <p>{summary.subStrandSummary}</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          openWeek(week.id);
                          setEditingWeekId((current) => (current === week.id ? null : week.id));
                        }}
                      >
                        <NotebookPen className="h-4 w-4" />
                        Edit week
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => toggleWeek(week.id)}
                      >
                        {expanded ? (
                          <>
                            <ChevronUp className="h-4 w-4" />
                            Collapse
                          </>
                        ) : (
                          <>
                            <ChevronDown className="h-4 w-4" />
                            View lessons
                          </>
                        )}
                      </Button>
                    </div>
                  </div>

                  {expanded ? (
                    <div className="space-y-4 border-t theme-border pt-4">
                      {editing ? (
                        <div className="rounded-xl border theme-border bg-gray-50 px-4 py-4">
                          <div className="grid gap-4 xl:grid-cols-2">
                            <Select
                              label="Week type"
                              value={draft.week_type}
                              onChange={(event) =>
                                setWeekDrafts((current) => ({
                                  ...current,
                                  [week.id]: {
                                    ...draft,
                                    week_type: event.target.value as SchemeWeekType,
                                  },
                                }))
                              }
                              disabled={readOnly}
                              options={WEEK_TYPE_OPTIONS}
                            />
                            <Select
                              label="Affects learning"
                              value={String(draft.affects_learning)}
                              onChange={(event) =>
                                setWeekDrafts((current) => ({
                                  ...current,
                                  [week.id]: {
                                    ...draft,
                                    affects_learning: event.target.value === 'true',
                                  },
                                }))
                              }
                              disabled={readOnly}
                              options={[
                                { value: 'false', label: 'No, keep active learning' },
                                { value: 'true', label: 'Yes, reduce active learning' },
                              ]}
                            />
                          </div>

                          <div className="mt-4 grid gap-4">
                            <Input
                              label="Week label"
                              value={draft.label}
                              onChange={(event) =>
                                setWeekDrafts((current) => ({
                                  ...current,
                                  [week.id]: {
                                    ...draft,
                                    label: event.target.value,
                                  },
                                }))
                              }
                              disabled={readOnly}
                            />
                            <TextAreaField
                              label="Week notes"
                              value={draft.notes}
                              onChange={(event) =>
                                setWeekDrafts((current) => ({
                                  ...current,
                                  [week.id]: {
                                    ...draft,
                                    notes: event.target.value,
                                  },
                                }))
                              }
                              disabled={readOnly}
                              rows={3}
                            />
                          </div>

                          <div className="mt-4 flex flex-wrap justify-end gap-2">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => setEditingWeekId(null)}
                            >
                              Close
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              onClick={() => void handleSaveWeek(week)}
                              disabled={!isWeekDirty || savingWeekId === week.id || readOnly}
                            >
                              <Save className="h-4 w-4" />
                              {savingWeekId === week.id ? 'Saving...' : 'Save week'}
                            </Button>
                          </div>
                        </div>
                      ) : null}

                      {weekEntries.length === 0 ? (
                        <EmptyLessonState week={week} />
                      ) : (
                        <div className="space-y-4">
                          {weekEntries.map((entry) => {
                            const draftEntry = entryDrafts[entry.id] ?? buildEntryDraft(entry);
                            const isDirty =
                              Object.keys(getEntryPatch(entry, draftEntry)).length > 0;
                            const showTeacherFields = expandedTeacherFields[entry.id] ?? isDirty;
                            const showReflection = expandedReflections[entry.id] ?? false;

                            return (
                              <div
                                key={entry.id}
                                className="rounded-xl border theme-border bg-gray-50 px-4 py-4"
                              >
                                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                                  <div>
                                    <div className="flex flex-wrap items-center gap-2">
                                      <p className="text-sm font-semibold theme-text">
                                        Lesson {entry.lesson}
                                      </p>
                                      {isDirty ? (
                                        <Badge variant="warning">Unsaved changes</Badge>
                                      ) : (
                                        <Badge variant="success">Saved</Badge>
                                      )}
                                    </div>
                                    <p className="mt-1 text-sm theme-subtle">
                                      {entry.week_label || getSchemeWeekTypeLabel(entry.week_type)}
                                    </p>
                                  </div>

                                  <div className="flex flex-wrap gap-2">
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => toggleTeacherFields(entry.id)}
                                    >
                                      {showTeacherFields
                                        ? 'Hide draft fields'
                                        : 'Teacher draft fields'}
                                    </Button>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => toggleReflection(entry.id)}
                                    >
                                      {showReflection ? 'Hide reflection' : 'Reflection'}
                                    </Button>
                                    <Button
                                      type="button"
                                      size="sm"
                                      onClick={() => void handleSaveEntry(entry)}
                                      disabled={!isDirty || savingEntryId === entry.id || readOnly}
                                    >
                                      <Save className="h-4 w-4" />
                                      {savingEntryId === entry.id ? 'Saving...' : 'Save'}
                                    </Button>
                                  </div>
                                </div>

                                <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
                                  <div className="space-y-3">
                                    <ExpandableTextBlock label="Strand" value={entry.strand} />
                                    <ExpandableTextBlock
                                      label="Sub-strand"
                                      value={entry.sub_strand}
                                    />
                                    <ExpandableTextBlock
                                      label="Lesson Learning Outcomes"
                                      value={entry.lesson_learning_outcomes}
                                    />
                                  </div>

                                  <div className="space-y-3">
                                    {showTeacherFields ? (
                                      <div className="rounded-xl border theme-border bg-white px-4 py-4">
                                        <div className="mb-4 flex items-center justify-between gap-3">
                                          <div>
                                            <p className="text-sm font-semibold theme-text">
                                              Teacher draft fields
                                            </p>
                                            <p className="mt-1 text-xs theme-subtle">
                                              Reveal only the draft fields that the teacher needs to
                                              refine.
                                            </p>
                                          </div>
                                        </div>
                                        <div className="grid gap-4">
                                          <TextAreaField
                                            label="Learning Experiences"
                                            value={draftEntry.learning_experiences}
                                            onChange={(event) =>
                                              setEntryDrafts((current) => ({
                                                ...current,
                                                [entry.id]: {
                                                  ...draftEntry,
                                                  learning_experiences: event.target.value,
                                                },
                                              }))
                                            }
                                            disabled={readOnly}
                                          />
                                          <TextAreaField
                                            label="Key Inquiry Question(s)"
                                            value={draftEntry.key_inquiry_questions}
                                            onChange={(event) =>
                                              setEntryDrafts((current) => ({
                                                ...current,
                                                [entry.id]: {
                                                  ...draftEntry,
                                                  key_inquiry_questions: event.target.value,
                                                },
                                              }))
                                            }
                                            disabled={readOnly}
                                          />
                                          <TextAreaField
                                            label="Learning Resources"
                                            value={draftEntry.learning_resources}
                                            onChange={(event) =>
                                              setEntryDrafts((current) => ({
                                                ...current,
                                                [entry.id]: {
                                                  ...draftEntry,
                                                  learning_resources: event.target.value,
                                                },
                                              }))
                                            }
                                            disabled={readOnly}
                                          />
                                          <TextAreaField
                                            label="Assessment Methods"
                                            value={draftEntry.assessment_methods}
                                            onChange={(event) =>
                                              setEntryDrafts((current) => ({
                                                ...current,
                                                [entry.id]: {
                                                  ...draftEntry,
                                                  assessment_methods: event.target.value,
                                                },
                                              }))
                                            }
                                            disabled={readOnly}
                                          />
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="rounded-xl border theme-border bg-white px-4 py-4 text-sm theme-subtle">
                                        Open teacher draft fields to edit learning experiences,
                                        inquiry questions, resources, and assessment.
                                      </div>
                                    )}

                                    {showReflection ? (
                                      <div className="rounded-xl border theme-border bg-white px-4 py-4">
                                        <TextAreaField
                                          label="Reflection"
                                          helpText={REFLECTION_NOTICE}
                                          value={draftEntry.reflection}
                                          onChange={(event) =>
                                            setEntryDrafts((current) => ({
                                              ...current,
                                              [entry.id]: {
                                                ...draftEntry,
                                                reflection: event.target.value,
                                              },
                                            }))
                                          }
                                          disabled={readOnly}
                                        />
                                      </div>
                                    ) : (
                                      <div className="rounded-xl border theme-border bg-white px-4 py-4 text-sm theme-subtle">
                                        Reflection stays hidden until the teacher wants to review or
                                        edit it.
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <Card className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold theme-text">Exceptional Weeks</h2>
            <p className="mt-1 text-sm theme-subtle">
              Keep breaks, exams, holidays, and other non-standard weeks separate from the teaching
              flow.
            </p>
          </div>
          <Badge variant={exceptionalWeeks.length > 0 ? 'warning' : 'default'}>
            {exceptionalWeeks.length} exceptional weeks
          </Badge>
        </div>

        {exceptionalWeeks.length === 0 ? (
          <div className="rounded-xl border theme-border bg-gray-50 px-4 py-4 text-sm theme-subtle">
            No exceptional weeks are recorded in this scheme.
          </div>
        ) : (
          <div className="space-y-4">
            {exceptionalWeeks.map((week) => {
              const weekEntries = entriesByWeek.get(week.id) ?? [];
              const summary = getWeekSummary(weekEntries, entryDrafts);
              const expanded = expandedWeekId === week.id;
              const editing = editingWeekId === week.id;
              const draft = weekDrafts[week.id] ?? buildWeekDraft(week);
              const isWeekDirty =
                week.week_type !== draft.week_type ||
                week.label !== draft.label ||
                week.notes !== draft.notes ||
                week.affects_learning !== draft.affects_learning;

              return (
                <div key={week.id} className="overflow-hidden rounded-xl border theme-border">
                  <div className="flex flex-col gap-4 px-4 py-4">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div className="space-y-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-base font-semibold theme-text">
                            Week {week.week_number}
                          </h3>
                          <Badge variant={getWeekStatusVariant(week)}>
                            {week.label || getSchemeWeekTypeLabel(week.week_type)}
                          </Badge>
                          <Badge variant={week.affects_learning ? 'warning' : 'default'}>
                            {week.affects_learning ? 'Affects learning' : 'Context only'}
                          </Badge>
                        </div>
                        <div className="grid gap-2 text-sm theme-subtle sm:grid-cols-3">
                          <p>
                            {summary.lessonCount} lesson{summary.lessonCount === 1 ? '' : 's'}
                          </p>
                          <p>{summary.strandSummary}</p>
                          <p>
                            {summary.hasReflection ? 'Reflection present' : 'No reflections yet'}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            openWeek(week.id);
                            setEditingWeekId((current) => (current === week.id ? null : week.id));
                          }}
                        >
                          <NotebookPen className="h-4 w-4" />
                          Edit week
                        </Button>
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() => toggleWeek(week.id)}
                        >
                          {expanded ? (
                            <>
                              <ChevronUp className="h-4 w-4" />
                              Collapse
                            </>
                          ) : (
                            <>
                              <ChevronDown className="h-4 w-4" />
                              View week
                            </>
                          )}
                        </Button>
                      </div>
                    </div>

                    {expanded ? (
                      <div className="space-y-4 border-t theme-border pt-4">
                        {editing ? (
                          <div className="rounded-xl border theme-border bg-gray-50 px-4 py-4">
                            <div className="grid gap-4 xl:grid-cols-2">
                              <Select
                                label="Week type"
                                value={draft.week_type}
                                onChange={(event) =>
                                  setWeekDrafts((current) => ({
                                    ...current,
                                    [week.id]: {
                                      ...draft,
                                      week_type: event.target.value as SchemeWeekType,
                                    },
                                  }))
                                }
                                disabled={readOnly}
                                options={WEEK_TYPE_OPTIONS}
                              />
                              <Select
                                label="Affects learning"
                                value={String(draft.affects_learning)}
                                onChange={(event) =>
                                  setWeekDrafts((current) => ({
                                    ...current,
                                    [week.id]: {
                                      ...draft,
                                      affects_learning: event.target.value === 'true',
                                    },
                                  }))
                                }
                                disabled={readOnly}
                                options={[
                                  { value: 'false', label: 'No, keep active learning' },
                                  { value: 'true', label: 'Yes, reduce active learning' },
                                ]}
                              />
                            </div>

                            <div className="mt-4 grid gap-4">
                              <Input
                                label="Week label"
                                value={draft.label}
                                onChange={(event) =>
                                  setWeekDrafts((current) => ({
                                    ...current,
                                    [week.id]: {
                                      ...draft,
                                      label: event.target.value,
                                    },
                                  }))
                                }
                                disabled={readOnly}
                              />
                              <TextAreaField
                                label="Week notes"
                                value={draft.notes}
                                onChange={(event) =>
                                  setWeekDrafts((current) => ({
                                    ...current,
                                    [week.id]: {
                                      ...draft,
                                      notes: event.target.value,
                                    },
                                  }))
                                }
                                disabled={readOnly}
                                rows={3}
                              />
                            </div>

                            <div className="mt-4 flex flex-wrap justify-end gap-2">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => setEditingWeekId(null)}
                              >
                                Close
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                onClick={() => void handleSaveWeek(week)}
                                disabled={!isWeekDirty || savingWeekId === week.id || readOnly}
                              >
                                <Save className="h-4 w-4" />
                                {savingWeekId === week.id ? 'Saving...' : 'Save week'}
                              </Button>
                            </div>
                          </div>
                        ) : null}

                        {weekEntries.length === 0 ? (
                          <EmptyLessonState week={week} />
                        ) : (
                          <div className="space-y-4">
                            {weekEntries.map((entry) => (
                              <div
                                key={entry.id}
                                className="rounded-xl border theme-border bg-gray-50 px-4 py-4"
                              >
                                <div className="flex flex-wrap items-center justify-between gap-3">
                                  <div>
                                    <p className="text-sm font-semibold theme-text">
                                      Lesson {entry.lesson}
                                    </p>
                                    <p className="mt-1 text-sm theme-subtle">
                                      {entry.strand || 'No strand recorded yet'}
                                    </p>
                                  </div>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      openWeek(week.id);
                                      setExpandedTeacherFields((current) => ({
                                        ...current,
                                        [entry.id]: true,
                                      }));
                                    }}
                                  >
                                    Review lesson
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
