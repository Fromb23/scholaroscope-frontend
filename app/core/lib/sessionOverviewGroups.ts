import type { Session } from '@/app/core/types/session';

export interface SessionOverviewClassGroup {
  key: string;
  label: string;
  description: string;
  items: Session[];
}

export interface SessionOverviewInstructorGroup {
  key: string;
  label: string;
  description: string;
  itemCount: number;
  sections: SessionOverviewClassGroup[];
}

function normalizeSessionText(value: string | null | undefined): string {
  return (value ?? '').trim().toLowerCase();
}

export function getSessionCohortSubjectGroupKey(session: Session): string {
  if (
    session.subject_source === 'cambridge'
    && typeof session.cambridge_cohort_subject_id === 'number'
    && session.cambridge_cohort_subject_id > 0
  ) {
    return `cambridge:${session.cambridge_cohort_subject_id}`;
  }

  if (typeof session.cohort_subject === 'number' && session.cohort_subject > 0) {
    return `kernel:${session.cohort_subject}`;
  }

  if (
    session.subject_source === 'cambridge'
    && typeof session.session_subject_id === 'number'
    && session.session_subject_id > 0
  ) {
    return `cambridge:${session.session_subject_id}`;
  }

  if (typeof session.session_subject_id === 'number' && session.session_subject_id > 0) {
    return `kernel:${session.session_subject_id}`;
  }

  return `session:${session.id}`;
}

export function getSessionCohortSubjectGroupLabel(session: Session): string {
  const cohortParts = [session.cohort_name, session.cohort_level]
    .map((value) => value?.trim())
    .filter(Boolean);
  const cohortLabel = cohortParts.length > 0 ? cohortParts.join(' ') : 'Class not set';
  const subjectLabel = session.subject_name?.trim() || 'Subject not set';
  return `${cohortLabel} \u00b7 ${subjectLabel}`;
}

function defaultSortSessions(sessions: Session[]): Session[] {
  return [...sessions].sort((left, right) => (
    left.session_date.localeCompare(right.session_date)
    || (left.start_time ?? '').localeCompare(right.start_time ?? '')
    || left.id - right.id
  ));
}

function defaultInstructorLabel(session: Session): string {
  return session.created_by_name?.trim()
    || session.created_by_email?.trim()
    || session.created_by?.trim()
    || 'Unknown instructor';
}

export function buildSessionClassGroups(
  sessions: Session[],
  sortSessions: (sessions: Session[]) => Session[] = defaultSortSessions,
): SessionOverviewClassGroup[] {
  const groups = new Map<string, SessionOverviewClassGroup>();

  sessions.forEach((session) => {
    const key = getSessionCohortSubjectGroupKey(session);
    const label = getSessionCohortSubjectGroupLabel(session);

    if (!groups.has(key)) {
      groups.set(key, {
        key,
        label,
        description: 'Class-subject view starts from the cohort and subject responsibility.',
        items: [],
      });
    }

    groups.get(key)?.items.push(session);
  });

  return Array.from(groups.values())
    .map((group) => ({
      ...group,
      items: sortSessions(group.items),
    }))
    .sort((left, right) => left.label.localeCompare(right.label));
}

export function buildSessionInstructorGroups(
  sessions: Session[],
  sortSessions: (sessions: Session[]) => Session[] = defaultSortSessions,
  getInstructorLabel: (session: Session) => string = defaultInstructorLabel,
): SessionOverviewInstructorGroup[] {
  const groups = new Map<string, SessionOverviewInstructorGroup>();

  sessions.forEach((session) => {
    const instructorLabel = getInstructorLabel(session);
    const instructorKey = typeof session.created_by_id === 'number'
      ? `id:${session.created_by_id}`
      : `name:${normalizeSessionText(instructorLabel) || 'unknown'}`;
    const sectionKey = getSessionCohortSubjectGroupKey(session);
    const sectionLabel = getSessionCohortSubjectGroupLabel(session);

    if (!groups.has(instructorKey)) {
      groups.set(instructorKey, {
        key: instructorKey,
        label: instructorLabel,
        description: 'Instructor view starts from teacher workload.',
        itemCount: 0,
        sections: [],
      });
    }

    const group = groups.get(instructorKey);
    if (!group) {
      return;
    }

    group.itemCount += 1;

    const existingSection = group.sections.find((section) => section.key === sectionKey);
    if (existingSection) {
      existingSection.items.push(session);
      return;
    }

    group.sections.push({
      key: sectionKey,
      label: sectionLabel,
      description: 'Class-subject view starts from the cohort and subject responsibility.',
      items: [session],
    });
  });

  return Array.from(groups.values())
    .map((group) => ({
      ...group,
      sections: group.sections
        .map((section) => ({
          ...section,
          items: sortSessions(section.items),
        }))
        .sort((left, right) => left.label.localeCompare(right.label)),
    }))
    .sort((left, right) => left.label.localeCompare(right.label));
}

export function toggleExpandedSessionGroup(
  currentKey: string | null,
  selectedKey: string,
): string | null {
  return currentKey === selectedKey ? null : selectedKey;
}

export function pruneExpandedSessionGroup(
  currentKey: string | null,
  visibleGroupKeys: Iterable<string>,
): string | null {
  if (currentKey === null) {
    return null;
  }

  return new Set(visibleGroupKeys).has(currentKey) ? currentKey : null;
}
