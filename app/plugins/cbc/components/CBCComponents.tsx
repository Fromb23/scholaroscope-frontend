'use client';
// app/plugins/cbc/components/CBCComponents.tsx

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import type { LucideIcon } from 'lucide-react';
import {
  AlertTriangle,
  ArrowLeftRight,
  BookOpen,
  Calendar,
  Check,
  ChevronDown,
  RefreshCw,
  Target,
  Users,
} from 'lucide-react';
import type { Subject } from '@/app/core/types/academic';
import type { MasteryLevel, MasteryDistribution } from '@/app/plugins/cbc/types/cbc';
import type { CBCInstructorSubjectSelection } from '@/app/plugins/cbc/lib/visibility';
import { Select } from '@/app/components/ui/Select';

// ============================================================================
// CBC Nav — single source, never duplicated across pages
// ============================================================================

const NAV_ITEMS = [
  { href: '/cbc/browser', label: 'Browse' },
  { href: '/cbc/progress', label: 'Learning Progress' },
  { href: '/cbc/assessment-results', label: 'Results' },
  { href: '/cbc/teaching', label: 'Teaching' },
] as const;

export function CBCNav() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeHref = NAV_ITEMS.find(({ href }) => pathname.startsWith(href))?.href ?? '';
  const contextualQuery = useMemo(() => {
    const next = new URLSearchParams();
    const subject = searchParams.get('subject');
    const cohort = searchParams.get('cohort');

    if (subject) next.set('subject', subject);
    if (cohort) next.set('cohort', cohort);

    return next.toString();
  }, [searchParams]);
  const withContext = useCallback(
    (href: string) => (contextualQuery ? `${href}?${contextualQuery}` : href),
    [contextualQuery],
  );

  return (
    <div className="space-y-3">
      <div className="md:hidden">
        <Select
          label="CBC Section"
          value={activeHref}
          onChange={(e) => {
            const nextHref = e.target.value;
            if (nextHref) router.push(withContext(nextHref));
          }}
          options={[
            { value: '', label: 'Choose section', disabled: true },
            ...NAV_ITEMS.map((item) => ({ value: item.href, label: item.label })),
          ]}
        />
      </div>

      <nav className="theme-card hidden gap-1.5 rounded-xl p-1.5 md:flex">
        {NAV_ITEMS.map(({ href, label }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={withContext(href)}
              className={`
                flex-1 text-center text-sm font-medium rounded-lg py-2.5 transition-colors
                ${
                  active
                    ? 'bg-blue-600 text-white shadow-sm font-semibold'
                    : 'theme-muted theme-hover-surface'
                }
              `}
              aria-current={active ? 'page' : undefined}
            >
              {label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

type TeachingSessionNavKey = 'sessions' | 'shared' | 'outcomes' | 'learners';

interface TeachingSessionNavItem {
  key: TeachingSessionNavKey;
  href: string;
  label: string;
  icon: LucideIcon;
}

const teachingSessionNavLinkClass = (active: boolean) => `
    inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors
    ${
      active
        ? 'border-blue-600 bg-blue-600 text-white shadow-sm'
        : 'theme-border theme-surface theme-text theme-hover-border-strong theme-hover-surface'
    }
`;

export function CBCTeachingSessionNav({
  sessionId,
  active,
  lessonHref,
}: {
  sessionId: number;
  active: TeachingSessionNavKey;
  lessonHref?: string;
}) {
  const items: TeachingSessionNavItem[] = [
    {
      key: 'sessions',
      href: '/cbc/teaching/sessions',
      label: 'My Lessons',
      icon: Calendar,
    },
    {
      key: 'shared',
      href: lessonHref ?? `/sessions/${sessionId}`,
      label: 'Lesson Details',
      icon: ArrowLeftRight,
    },
    {
      key: 'outcomes',
      href: `/cbc/teaching/sessions/${sessionId}/outcomes`,
      label: 'What Was Taught',
      icon: Target,
    },
    {
      key: 'learners',
      href: `/cbc/teaching/sessions/${sessionId}/learners`,
      label: 'Learners',
      icon: Users,
    },
  ];

  return (
    <div className="space-y-3">
      <div className="md:hidden grid grid-cols-2 gap-2">
        {items.map(({ key, href, label, icon: Icon }) => {
          const isActive = key === active;
          return (
            <Link
              key={href}
              href={href}
              className={teachingSessionNavLinkClass(isActive)}
              aria-current={isActive ? 'page' : undefined}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="truncate">{label}</span>
            </Link>
          );
        })}
      </div>

      <nav className="hidden md:flex flex-wrap gap-2">
        {items.map(({ key, href, label, icon: Icon }) => {
          const isActive = key === active;
          return (
            <Link
              key={href}
              href={href}
              className={teachingSessionNavLinkClass(isActive)}
              aria-current={isActive ? 'page' : undefined}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

// ============================================================================
// CBC Breadcrumb — renders from an array of segments
// ============================================================================

export interface BreadcrumbSegment {
  label: string;
  href?: string;
}

export function CBCBreadcrumb({ segments }: { segments: BreadcrumbSegment[] }) {
  return (
    <nav className="flex items-center flex-wrap gap-1.5 text-sm theme-muted">
      {segments.map((seg, i) => (
        <span key={i} className="flex items-center gap-1.5">
          {i > 0 && <span className="theme-subtle">→</span>}
          {seg.href ? (
            <Link href={seg.href} className="hover:text-blue-600 transition-colors">
              {seg.label}
            </Link>
          ) : (
            <span className="font-medium theme-text">{seg.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}

// ============================================================================
// Mastery — single source of truth for colours / labels
// ============================================================================

export const MASTERY_CONFIG: Record<
  MasteryLevel,
  { bg: string; text: string; border: string; segment: string; label: string }
> = {
  NOT_STARTED: {
    bg: 'bg-gray-100',
    text: 'text-gray-600',
    border: 'border-gray-300',
    segment: 'bg-gray-300',
    label: 'Not Started',
  },
  BELOW: {
    bg: 'bg-red-100',
    text: 'text-red-700',
    border: 'border-red-300',
    segment: 'bg-red-400',
    label: 'Below Expectation',
  },
  APPROACHING: {
    bg: 'bg-amber-100',
    text: 'text-amber-700',
    border: 'border-amber-300',
    segment: 'bg-amber-400',
    label: 'Approaching Expectation',
  },
  MEETING: {
    bg: 'bg-blue-100',
    text: 'text-blue-700',
    border: 'border-blue-300',
    segment: 'bg-blue-500',
    label: 'Meeting Expectation',
  },
  EXCEEDING: {
    bg: 'bg-emerald-100',
    text: 'text-emerald-700',
    border: 'border-emerald-300',
    segment: 'bg-emerald-500',
    label: 'Exceeding Expectation',
  },
};

const MASTERY_ORDER: MasteryLevel[] = [
  'NOT_STARTED',
  'BELOW',
  'APPROACHING',
  'MEETING',
  'EXCEEDING',
];

export function MasteryBadge({ level, size = 'md' }: { level: MasteryLevel; size?: 'sm' | 'md' }) {
  const { bg, text, border, label } = MASTERY_CONFIG[level];
  const pad = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm';
  return (
    <span
      className={`inline-flex items-center font-medium rounded-full border
        ${bg} ${text} ${border} ${pad}`}
    >
      {label}
    </span>
  );
}

export function MasteryDistributionLegend() {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1">
      {MASTERY_ORDER.map((level) => (
        <div key={level} className="flex items-center gap-1.5">
          <div className={`w-3 h-3 rounded-sm ${MASTERY_CONFIG[level].segment}`} />
          <span className="text-xs theme-muted">{MASTERY_CONFIG[level].label}</span>
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// ProgressBar
// ============================================================================

function barColor(pct: number) {
  if (pct >= 80) return 'bg-emerald-500';
  if (pct >= 60) return 'bg-blue-500';
  if (pct >= 40) return 'bg-amber-500';
  return 'bg-gray-400';
}

function labelColor(pct: number) {
  if (pct >= 80) return 'text-emerald-600';
  if (pct >= 60) return 'text-blue-600';
  if (pct >= 40) return 'text-amber-600';
  return 'theme-subtle';
}

export function ProgressBar({
  percentage,
  showLabel = false,
  height = 'default',
}: {
  percentage: number;
  showLabel?: boolean;
  height?: 'thin' | 'default';
}) {
  const h = height === 'thin' ? 'h-2' : 'h-3';
  const val = Math.min(100, Math.max(0, percentage));
  return (
    <div className="flex items-center gap-3">
      <div className={`theme-surface-muted flex-1 overflow-hidden rounded-full ${h}`}>
        <div
          className={`${h} rounded-full ${barColor(val)} transition-all duration-500`}
          style={{ width: `${val}%` }}
        />
      </div>
      {showLabel && (
        <span className={`text-sm font-semibold ${labelColor(val)} w-12 text-right shrink-0`}>
          {val}%
        </span>
      )}
    </div>
  );
}

// ============================================================================
// MasteryDistributionBar — segmented bar per mastery level
// ============================================================================

function MasteryDistributionBar({
  distribution,
  total,
}: {
  distribution: MasteryDistribution;
  total: number;
}) {
  if (total === 0) return <div className="theme-surface-muted h-3 w-full rounded-full" />;
  return (
    <div className="theme-surface-muted flex h-3 w-full overflow-hidden rounded-full">
      {MASTERY_ORDER.map((level) => {
        const count = distribution[level];
        const pct = (count / total) * 100;
        if (pct === 0) return null;
        return (
          <div
            key={level}
            className={`h-full ${MASTERY_CONFIG[level].segment} transition-all duration-500`}
            style={{ width: `${pct}%` }}
            title={`${MASTERY_CONFIG[level].label}: ${count}`}
          />
        );
      })}
    </div>
  );
}

// ============================================================================
// StrandProgressRow — used on student + cohort progress pages
// ============================================================================

export function StrandProgressRow({
  strandCode,
  strandName,
  totalOutcomes,
  completedOutcomes,
  percentage,
  masteryDistribution,
}: {
  strandCode: string;
  strandName: string;
  totalOutcomes: number;
  completedOutcomes: number;
  percentage: number;
  masteryDistribution?: MasteryDistribution;
}) {
  return (
    <div className="border-b py-4 last:border-0 last:pb-0 theme-border">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="shrink-0 text-xs font-mono font-semibold theme-subtle">
            {strandCode}
          </span>
          <span className="truncate font-medium theme-text">{strandName}</span>
        </div>
        <span className={`text-sm font-bold shrink-0 ml-4 ${labelColor(percentage)}`}>
          {percentage}%
        </span>
      </div>

      {masteryDistribution ? (
        <MasteryDistributionBar distribution={masteryDistribution} total={totalOutcomes} />
      ) : (
        <ProgressBar percentage={percentage} />
      )}

      <p className="mt-1.5 text-xs theme-muted">
        {completedOutcomes} of {totalOutcomes} outcome{totalOutcomes !== 1 ? 's' : ''}
      </p>
    </div>
  );
}

// ============================================================================
// CBCError — global error display for CBC pages
// Handles the standard server error shape: { detail, type, code, message }
// ============================================================================

interface ServerError {
  detail?: string;
  message?: string;
  error?: string;
  non_field_errors?: string[];
  type?: string;
}

interface CBCErrorDiagnostic {
  endpoint?: string;
  url?: string;
  params?: unknown;
  statusCode?: number;
  backendDetail?: string;
  backendMessage?: string;
  responseData?: unknown;
}

interface CBCErrorDebugContext {
  endpointUrl?: string | null;
  queryParams?: unknown;
  statusCode?: number | null;
  backendDetail?: string | null;
  backendMessage?: string | null;
  responseData?: unknown;
  selectedCurriculumId?: number | null;
  selectedSubjectId?: number | null;
  selectedCohortId?: number | null;
  allowedSubjectIds?: number[] | null;
  allowedCohortIds?: number[] | null;
  finalUseStrandsParams?: unknown;
}

function formatDiagnosticValue(value: unknown) {
  if (value === null || value === undefined) return 'null';
  if (typeof value === 'string') return value;

  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function flattenErrorMessages(value: unknown): string[] {
  if (typeof value === 'string') {
    return [value];
  }

  if (Array.isArray(value)) {
    return value.flatMap((item) => flattenErrorMessages(item));
  }

  if (!value || typeof value !== 'object') {
    return [];
  }

  return Object.values(value).flatMap((item) => flattenErrorMessages(item));
}

export function CBCError({
  error,
  onRetry,
  title = 'Something went wrong',
  debugContext,
}: {
  error: unknown;
  onRetry?: () => void;
  title?: string;
  debugContext?: CBCErrorDebugContext | null;
}) {
  const msg = extractErrorMessage(error);
  const diagnostic = extractCBCErrorDiagnostic(error);
  const resolvedDebugContext =
    debugContext ??
    (diagnostic
      ? {
          endpointUrl: diagnostic.url ?? diagnostic.endpoint ?? null,
          queryParams: diagnostic.params ?? null,
          statusCode: diagnostic.statusCode ?? null,
          backendDetail: diagnostic.backendDetail ?? null,
          backendMessage: diagnostic.backendMessage ?? null,
          responseData: diagnostic.responseData ?? null,
        }
      : null);
  const showDiagnostic = process.env.NODE_ENV === 'development' && resolvedDebugContext !== null;

  return (
    <div className="theme-danger-surface flex items-start gap-4 rounded-xl p-5">
      <div className="theme-surface-elevated rounded-lg border p-2 shrink-0 border-red-200">
        <AlertTriangle className="h-5 w-5 text-red-600" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold theme-text">{title}</p>
        <p className="mt-1 text-sm theme-muted">{msg}</p>
        {showDiagnostic && (
          <div className="theme-card-muted mt-3 space-y-2 rounded-lg p-3 text-xs text-red-900">
            <div>
              <p className="font-semibold">Request URL</p>
              <pre className="mt-1 whitespace-pre-wrap break-all font-mono">
                {formatDiagnosticValue(resolvedDebugContext.endpointUrl ?? 'Unknown')}
              </pre>
            </div>
            <div>
              <p className="font-semibold">Query Params</p>
              <pre className="mt-1 whitespace-pre-wrap break-all font-mono">
                {formatDiagnosticValue(resolvedDebugContext.queryParams ?? null)}
              </pre>
            </div>
            <div>
              <p className="font-semibold">Status Code</p>
              <pre className="mt-1 whitespace-pre-wrap break-all font-mono">
                {formatDiagnosticValue(resolvedDebugContext.statusCode ?? null)}
              </pre>
            </div>
            <div>
              <p className="font-semibold">Backend Detail / Message</p>
              <pre className="mt-1 whitespace-pre-wrap break-words font-mono">
                {formatDiagnosticValue({
                  detail: resolvedDebugContext.backendDetail ?? null,
                  message: resolvedDebugContext.backendMessage ?? null,
                })}
              </pre>
            </div>
            {'selectedCurriculumId' in resolvedDebugContext && (
              <div>
                <p className="font-semibold">CBC Browser Context</p>
                <pre className="mt-1 whitespace-pre-wrap break-all font-mono">
                  {formatDiagnosticValue({
                    selectedCurriculumId: resolvedDebugContext.selectedCurriculumId ?? null,
                    selectedSubjectId: resolvedDebugContext.selectedSubjectId ?? null,
                    selectedCohortId: resolvedDebugContext.selectedCohortId ?? null,
                    allowedSubjectIds: resolvedDebugContext.allowedSubjectIds ?? [],
                    allowedCohortIds: resolvedDebugContext.allowedCohortIds ?? [],
                    finalUseStrandsParams: resolvedDebugContext.finalUseStrandsParams ?? null,
                  })}
                </pre>
              </div>
            )}
            {resolvedDebugContext.responseData !== undefined && (
              <div>
                <p className="font-semibold">Backend Response</p>
                <pre className="mt-1 whitespace-pre-wrap break-all font-mono">
                  {formatDiagnosticValue(resolvedDebugContext.responseData)}
                </pre>
              </div>
            )}
          </div>
        )}
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="shrink-0 flex items-center gap-1.5 text-sm font-medium text-red-700
            hover:text-red-900 transition-colors"
        >
          <RefreshCw className="h-4 w-4" />
          Retry
        </button>
      )}
    </div>
  );
}

export function extractErrorMessage(error: unknown): string {
  if (!error) return 'An unknown error occurred';
  if (typeof error === 'string') return error;

  const e = error as {
    response?: { data?: ServerError | string };
    message?: string;
    diagnostic?: CBCErrorDiagnostic;
  };

  if (e.diagnostic?.backendDetail || e.diagnostic?.backendMessage) {
    return e.diagnostic.backendDetail ?? e.diagnostic.backendMessage ?? 'Server error';
  }

  if (e.response?.data) {
    const d = e.response.data;
    if (typeof d === 'string') return d;
    const structuredMessage = d.detail ?? d.message ?? d.error ?? d.non_field_errors ?? d;
    const flattenedMessages = flattenErrorMessages(structuredMessage);
    if (flattenedMessages.length > 0) {
      return flattenedMessages.join('\n');
    }
    return 'Server error';
  }
  return e.message ?? 'An unexpected error occurred';
}

function extractCBCErrorDiagnostic(error: unknown): CBCErrorDiagnostic | null {
  if (!error || typeof error !== 'object') return null;

  const diagnostic = (error as { diagnostic?: CBCErrorDiagnostic }).diagnostic;
  return diagnostic ?? null;
}

// ============================================================================
// CBCLoading — consistent spinner
// ============================================================================

export function CBCLoading({ message = 'Loading…' }: { message?: string }) {
  return (
    <div className="py-20 text-center">
      <div
        className="inline-block h-10 w-10 animate-spin rounded-full border-4
        border-blue-600 border-t-transparent mb-3"
      />
      <p className="text-sm theme-muted">{message}</p>
    </div>
  );
}

// ============================================================================
// CBCEmpty — consistent empty state
// ============================================================================

export function CBCEmpty({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="py-16 text-center">
      <div className="theme-surface-muted mb-4 inline-flex rounded-full p-4">
        <Icon className="h-12 w-12 theme-subtle" />
      </div>
      <h3 className="mb-1 text-lg font-semibold theme-text">{title}</h3>
      {description && <p className="mx-auto mb-4 max-w-sm text-sm theme-muted">{description}</p>}
      {action}
    </div>
  );
}

// ============================================================================
// SubjectGroupPicker — grouped subject selector (subject → grades)
// ============================================================================

export function SubjectGroupPicker({
  subjects,
  selectedSubjectId,
  onSelect,
  showAllOption = true,
  autoExpandSelected = false,
  mode = 'catalog',
  instructorSelections = [],
}: {
  subjects: Subject[];
  selectedSubjectId: number | null;
  onSelect: (id: number | null) => void;
  showAllOption?: boolean;
  autoExpandSelected?: boolean;
  mode?: 'catalog' | 'instructor';
  instructorSelections?: CBCInstructorSubjectSelection[];
}) {
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  const normalizedSubjects = useMemo(
    () =>
      subjects.map((subject) => {
        const rawName =
          typeof subject.name === 'string'
            ? subject.name
            : ((subject as Subject & { title?: string | null }).title ?? '');
        const name = rawName.trim() || 'Untitled Subject';
        const rawCode = typeof subject.code === 'string' ? subject.code : '';
        const levelSource = typeof subject.level === 'string' ? subject.level : '';
        const level = levelSource.trim();
        const groupKey =
          name
            .replace(/\s+Grade\s+\d+/i, '')
            .replace(/\s+grade\d+/i, '')
            .trim() || name;
        const levelLabel = level
          ? level.replace('grade', 'Grade ').replace(/(\d+)/, ' $1').replace(/\s+/, ' ').trim()
          : rawCode.trim() || 'Subject';

        return {
          ...subject,
          code: rawCode,
          name,
          level,
          groupKey,
          levelLabel,
        };
      }),
    [subjects],
  );

  const groups = useMemo(() => {
    const map: Record<string, typeof normalizedSubjects> = {};
    normalizedSubjects.forEach((s) => {
      const base = s.groupKey;
      if (!map[base]) map[base] = [];
      map[base].push(s);
    });
    return map;
  }, [normalizedSubjects]);

  useEffect(() => {
    if (!autoExpandSelected || selectedSubjectId === null) return;

    const selectedGroup = Object.entries(groups).find(([, groupSubjects]) =>
      groupSubjects.some((subject) => subject.id === selectedSubjectId),
    )?.[0];

    if (!selectedGroup) return;

    setExpandedGroups((prev) => {
      if (prev.has(selectedGroup)) return prev;
      const next = new Set(prev);
      next.add(selectedGroup);
      return next;
    });
  }, [autoExpandSelected, groups, selectedSubjectId]);

  const toggleGroup = (name: string) => {
    setExpandedGroups((prev) => {
      const n = new Set(prev);
      if (n.has(name)) {
        n.delete(name);
      } else {
        n.add(name);
      }
      return n;
    });
  };

  if (mode === 'instructor') {
    return (
      <div className="space-y-2">
        {instructorSelections.map((selection) => {
          const isSelected = selectedSubjectId === selection.filter_id;
          const subjectCode = (selection.subject_code ?? selection.subject.code ?? '').trim();
          const levelLabel = formatInstructorLevelLabel(selection.level);
          const cohortName = (selection.cohort_name ?? '').trim();
          const academicYear = (selection.academic_year ?? '').trim();

          let metaLabel = levelLabel || 'CBC Assignment';

          if (cohortName) {
            metaLabel = academicYear ? `${cohortName} ${academicYear}` : cohortName;
          } else if (selection.cohort_id) {
            metaLabel = levelLabel
              ? `${levelLabel} · Cohort ${selection.cohort_id}`
              : `Cohort ${selection.cohort_id}`;
          }

          if (subjectCode) {
            metaLabel = `${metaLabel} · ${subjectCode}`;
          }

          return (
            <button
              key={selection.cohort_subject_id ?? selection.filter_id}
              onClick={() => onSelect(selection.filter_id)}
              className={`w-full rounded-lg border px-3 py-3 text-left transition-colors ${
                isSelected
                  ? 'theme-info-surface-strong'
                  : 'theme-border theme-surface theme-hover-border-strong theme-hover-surface'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p
                    className={`text-sm font-semibold ${isSelected ? 'text-blue-700' : 'theme-text'}`}
                  >
                    {selection.subject.name}
                  </p>
                  <p className="mt-1 text-sm theme-muted">{metaLabel}</p>
                </div>
                {isSelected && (
                  <span className="mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-white shrink-0">
                    <Check className="h-3.5 w-3.5" />
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {showAllOption && (
        <button
          onClick={() => onSelect(null)}
          className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
            selectedSubjectId === null
              ? 'theme-info-surface theme-text font-medium'
              : 'theme-muted theme-hover-surface'
          }`}
        >
          All Subjects
        </button>
      )}
      {Object.entries(groups).map(([groupName, groupSubjects]) => {
        const expanded = expandedGroups.has(groupName);
        const hasSelected = groupSubjects.some((s) => s.id === selectedSubjectId);
        return (
          <div key={groupName}>
            <button
              onClick={() => toggleGroup(groupName)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${
                hasSelected ? 'theme-info-surface' : 'theme-hover-surface'
              }`}
            >
              <div className="flex items-center gap-2">
                <BookOpen className="h-4 w-4 theme-subtle shrink-0" />
                <span className={`font-medium ${hasSelected ? 'text-blue-700' : 'theme-text'}`}>
                  {groupName}
                </span>
                <span className="text-xs theme-subtle">
                  {groupSubjects.length} level{groupSubjects.length !== 1 ? 's' : ''}
                </span>
              </div>
              <ChevronDown
                className={`h-4 w-4 theme-subtle transition-transform ${expanded ? 'rotate-180' : ''}`}
              />
            </button>
            {expanded && (
              <div className="ml-4 mt-1 space-y-0.5">
                {groupSubjects.map((s) => {
                  return (
                    <button
                      key={s.id}
                      onClick={() => onSelect(s.id)}
                      className={`w-full text-left px-3 py-1.5 rounded-lg text-sm transition-colors ${
                        selectedSubjectId === s.id
                          ? 'theme-info-surface-strong theme-text font-medium'
                          : 'theme-muted theme-hover-surface'
                      }`}
                    >
                      {s.levelLabel}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function formatInstructorLevelLabel(level: string | null | undefined) {
  return (level ?? '')
    .replace('grade', 'Grade ')
    .replace(/(\d+)/, ' $1')
    .replace(/\s+/, ' ')
    .trim();
}

// ============================================================================
// SessionStatusBadge
// ============================================================================

const STATUS_STYLES = {
  SCHEDULED: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Scheduled' },
  IN_PROGRESS: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'In Progress' },
  COMPLETED: { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'Completed' },
  MISSED: { bg: 'bg-red-100', text: 'text-red-700', label: 'Missed' },
} as const;

export function SessionStatusBadge({ status }: { status: keyof typeof STATUS_STYLES }) {
  const { bg, text, label } = STATUS_STYLES[status] ?? STATUS_STYLES.SCHEDULED;
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full
      text-xs font-medium ${bg} ${text}`}
    >
      {label}
    </span>
  );
}
