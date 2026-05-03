import type { Subject, CohortSubject } from '@/app/core/types/academic';
import type {
    CBCCatalog,
    CBCTeachingAssignment,
    CBCVisibleProfile,
    Strand,
} from '@/app/plugins/cbc/types/cbc';

function normalizeSubjectName(value: string | null | undefined) {
    return (value ?? '')
        .replace(/\s+Grade\s+\d+/i, '')
        .replace(/\s+grade\d+/i, '')
        .replace(/\s+/g, ' ')
        .trim()
        .toLowerCase();
}

function normalizeLevel(value: string | null | undefined) {
    return (value ?? '')
        .replace(/[\s_-]+/g, '')
        .trim()
        .toLowerCase();
}

function normalizeSubjectCode(value: string | null | undefined) {
    return (value ?? '')
        .replace(/[\s_-]+/g, '')
        .trim()
        .toLowerCase();
}

function subjectKey(subjectName: string | null | undefined, level: string | null | undefined) {
    const normalizedName = normalizeSubjectName(subjectName);
    const normalizedLevel = normalizeLevel(level);

    if (!normalizedName || !normalizedLevel) return null;
    return `${normalizedName}::${normalizedLevel}`;
}

function subjectCodeKey(subjectCode: string | null | undefined, level: string | null | undefined) {
    const normalizedCode = normalizeSubjectCode(subjectCode);
    const normalizedLevel = normalizeLevel(level);

    if (!normalizedCode || !normalizedLevel) return null;
    return `${normalizedCode}::${normalizedLevel}`;
}

function sortVisibleProfiles(profiles: CBCVisibleProfile[]) {
    return [...profiles].sort((left, right) => (
        left.subject_name.localeCompare(right.subject_name) ||
        left.level.localeCompare(right.level)
    ));
}

function hashKey(value: string) {
    let hash = 0;

    for (let index = 0; index < value.length; index += 1) {
        hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
    }

    return hash || 1;
}

export interface CBCInstructorSubjectSelection {
    filter_id: number;
    subject: Subject;
    subject_ids: number[];
    subject_profile_ids?: number[];
    subject_name: string;
    level: string | null;
    cohort_id?: number | null;
    cohort_name?: string | null;
    academic_year?: string | null;
    subject_code?: string | null;
    cohort_subject_id?: number | null;
}

export function resolveCBCVisibleProfiles(
    catalog: CBCCatalog | null | undefined,
    cohortSubjects: Array<Pick<CohortSubject, 'subject_name' | 'subject_code' | 'cohort_level'>>
): CBCVisibleProfile[] {
    if (!catalog) return [];

    const byCode = new Map<string, CBCVisibleProfile>();
    const byName = new Map<string, CBCVisibleProfile>();

    catalog.subjects.forEach(subject => {
        subject.levels.forEach(level => {
            const profile: CBCVisibleProfile = {
                subject_profile_id: level.subject_profile_id,
                subject_id: level.subject_id,
                subject_name: subject.name,
                subject_code: subject.code,
                level: level.level,
            };

            const codeKey = subjectCodeKey(subject.code, level.level);
            const nameKey = subjectKey(subject.name, level.level);

            if (codeKey && !byCode.has(codeKey)) {
                byCode.set(codeKey, profile);
            }
            if (nameKey && !byName.has(nameKey)) {
                byName.set(nameKey, profile);
            }
        });
    });

    const deduped = new Map<number, CBCVisibleProfile>();

    cohortSubjects.forEach(subject => {
        const resolved = (
            byCode.get(subjectCodeKey(subject.subject_code, subject.cohort_level) ?? '') ??
            byName.get(subjectKey(subject.subject_name, subject.cohort_level) ?? '')
        );

        if (!resolved) return;
        deduped.set(resolved.subject_profile_id, resolved);
    });

    return sortVisibleProfiles(Array.from(deduped.values()));
}

export function resolveCBCVisibleProfilesFromAssignments(
  catalog: CBCCatalog | null | undefined,
  assignments: Array<
    Pick<
      CBCTeachingAssignment,
      | 'subject_profile_id'
      | 'subject_profile_name'
      | 'subject_profile_code'
      | 'subject_name'
      | 'subject_code'
      | 'level'
    >
  >,
): CBCVisibleProfile[] {
  const catalogProfiles = resolveCBCVisibleProfiles(
    catalog,
    assignments.map((assignment) => ({
      subject_name: assignment.subject_profile_name ?? assignment.subject_name,
      subject_code: assignment.subject_profile_code ?? assignment.subject_code,
      cohort_level: assignment.level,
    })),
  );

  const directProfiles = assignments
    .filter(
      (assignment): assignment is typeof assignment & { subject_profile_id: number } =>
        typeof assignment.subject_profile_id === 'number',
    )
    .map((assignment) => ({
      subject_profile_id: assignment.subject_profile_id,
      subject_id: null,
      subject_name: assignment.subject_profile_name ?? assignment.subject_name,
      subject_code: assignment.subject_profile_code ?? assignment.subject_code,
      level: assignment.level,
    }));

  const deduped = new Map<number, CBCVisibleProfile>();

  // Prefer catalogue/structured profiles first because strands live there.
  catalogProfiles.forEach((profile) => {
    deduped.set(profile.subject_profile_id, profile);
  });

  // Keep direct org-local profiles only as fallback/compatibility.
  directProfiles.forEach((profile) => {
    if (!deduped.has(profile.subject_profile_id)) {
      deduped.set(profile.subject_profile_id, profile);
    }
  });

  return sortVisibleProfiles(Array.from(deduped.values()));
}

export function matchesCBCVisibleProfile(
    cohortSubject: Pick<CohortSubject, 'subject_name' | 'subject_code' | 'cohort_level'>,
    profile: Pick<CBCVisibleProfile, 'subject_name' | 'subject_code' | 'level'>
) {
    const profileCodeKey = subjectCodeKey(profile.subject_code, profile.level);
    const subjectCodeMatch = subjectCodeKey(
        cohortSubject.subject_code,
        cohortSubject.cohort_level
    );

    if (profileCodeKey && subjectCodeMatch && profileCodeKey === subjectCodeMatch) {
        return true;
    }

    const profileNameKey = subjectKey(profile.subject_name, profile.level);
    const subjectNameMatch = subjectKey(
        cohortSubject.subject_name,
        cohortSubject.cohort_level
    );

    return Boolean(profileNameKey && subjectNameMatch && profileNameKey === subjectNameMatch);
}

export function matchesCBCSubjectIdentity(
    leftName: string | null | undefined,
    leftLevel: string | null | undefined,
    rightName: string | null | undefined,
    rightLevel: string | null | undefined
) {
    const leftKey = subjectKey(leftName, leftLevel);
    const rightKey = subjectKey(rightName, rightLevel);

    return Boolean(leftKey && rightKey && leftKey === rightKey);
}

export function matchesCBCStrandToCohortSubject(
    strand: Pick<Strand, 'subject' | 'subject_org_id' | 'subject_name' | 'subject_level'>,
    cohortSubject: Pick<CohortSubject, 'subject' | 'subject_name' | 'cohort_level'>
) {
    if (
        typeof cohortSubject.subject === 'number' &&
        (strand.subject === cohortSubject.subject || strand.subject_org_id === cohortSubject.subject)
    ) {
        return true;
    }

    return matchesCBCSubjectIdentity(
        strand.subject_name,
        strand.subject_level,
        cohortSubject.subject_name,
        cohortSubject.cohort_level
    );
}

export function isCBCStrandVisibleForAssignedCohortSubjects(
    strand: Pick<Strand, 'is_assigned' | 'subject' | 'subject_org_id' | 'subject_name' | 'subject_level'>,
    cohortSubjects: Array<Pick<CohortSubject, 'subject' | 'subject_name' | 'cohort_level'>>
) {
    if (strand.is_assigned) return true;

    return cohortSubjects.some(cohortSubject => matchesCBCStrandToCohortSubject(strand, cohortSubject));
}

export function buildCBCSubjectOptionsFromProfiles(
    profiles: CBCVisibleProfile[],
    curriculumId: number | null,
    curriculumName = 'CBC'
): Subject[] {
    return profiles.map(profile => ({
        id: profile.subject_profile_id,
        curriculum: curriculumId ?? 0,
        curriculum_name: curriculumName,
        curriculum_type: 'CBE',
        code: profile.subject_code,
        name: profile.subject_name,
        level: profile.level,
        description: '',
        created_at: '',
    }));
}

export function getCBCVisibleSubjectId(
    strand: Pick<Strand, 'subject_profile_id' | 'subject_org_id' | 'subject'>,
    isAdmin: boolean
) {
    return isAdmin ? strand.subject_org_id : (strand.subject_profile_id ?? strand.subject);
}

export function buildCBCInstructorSubjectSelections(
    cohortSubjects: Array<Pick<CohortSubject, 'subject' | 'subject_name' | 'subject_code' | 'cohort_level'>>,
    strands: Array<Pick<Strand, 'subject' | 'subject_org_id' | 'subject_name' | 'subject_level'>>,
    curriculumId: number | null,
    curriculumName = 'CBC'
): CBCInstructorSubjectSelection[] {
    const matchedSelections = new Map<string, CBCInstructorSubjectSelection>();

    cohortSubjects.forEach(cohortSubject => {
        if (!strands.some(strand => matchesCBCStrandToCohortSubject(strand, cohortSubject))) {
            return;
        }

        const key = `${cohortSubject.subject}::${normalizeLevel(cohortSubject.cohort_level)}::${normalizeSubjectName(cohortSubject.subject_name)}`;
        const filterId = hashKey(`cohort:${key}`);

        matchedSelections.set(key, {
            filter_id: filterId,
            subject: {
                id: filterId,
                curriculum: curriculumId ?? 0,
                curriculum_name: curriculumName,
                curriculum_type: 'CBE',
                code: cohortSubject.subject_code,
                name: cohortSubject.subject_name,
                level: cohortSubject.cohort_level,
                description: '',
                created_at: '',
            },
            subject_ids: [cohortSubject.subject],
            subject_name: cohortSubject.subject_name,
            level: cohortSubject.cohort_level,
        });
    });

    if (matchedSelections.size > 0) {
        return Array.from(matchedSelections.values()).sort((left, right) => (
            left.subject.name.localeCompare(right.subject.name) ||
            left.subject.level.localeCompare(right.subject.level)
        ));
    }

    const fallbackSelections = new Map<string, CBCInstructorSubjectSelection>();

    strands.forEach(strand => {
        if (!strand.subject_name) return;

        const subjectIds = [strand.subject_org_id, strand.subject]
            .filter((value): value is number => typeof value === 'number');
        const key = `${subjectIds.join(',')}::${normalizeLevel(strand.subject_level)}::${normalizeSubjectName(strand.subject_name)}`;
        const filterId = hashKey(`strand:${key}`);

        if (fallbackSelections.has(key)) return;

        fallbackSelections.set(key, {
            filter_id: filterId,
            subject: {
                id: filterId,
                curriculum: curriculumId ?? 0,
                curriculum_name: curriculumName,
                curriculum_type: 'CBE',
                code: '',
                name: strand.subject_name,
                level: strand.subject_level ?? '',
                description: '',
                created_at: '',
            },
            subject_ids: subjectIds,
            subject_name: strand.subject_name,
            level: strand.subject_level,
        });
    });

    return Array.from(fallbackSelections.values()).sort((left, right) => (
        left.subject.name.localeCompare(right.subject.name) ||
        left.subject.level.localeCompare(right.subject.level)
    ));
}

export function buildCBCInstructorAssignmentSelections(
    assignments: Array<Pick<
        CBCTeachingAssignment,
        'cohort_subject_id' | 'cohort_id' | 'cohort_name' | 'subject_id' |
        'subject_name' | 'subject_code' | 'subject_profile_id' | 'level' | 'academic_year'
    >>,
    visibleProfiles: CBCVisibleProfile[],
    curriculumId: number | null,
    curriculumName = 'CBC'
): CBCInstructorSubjectSelection[] {
    const deduped = new Map<number, CBCInstructorSubjectSelection>();

    assignments.forEach(assignment => {
        const filterId = hashKey(`assignment:${assignment.cohort_subject_id}`);
        const matchingProfiles = visibleProfiles.filter(profile => (
            (typeof assignment.subject_profile_id === 'number' &&
                assignment.subject_profile_id === profile.subject_profile_id) ||
            matchesCBCVisibleProfile({
                subject_name: assignment.subject_name,
                subject_code: assignment.subject_code,
                cohort_level: assignment.level,
            }, profile)
        ));
        const resolvedProfile = matchingProfiles[0] ?? null;

        deduped.set(assignment.cohort_subject_id, {
            filter_id: filterId,
            subject: {
                id: filterId,
                curriculum: curriculumId ?? 0,
                curriculum_name: curriculumName,
                curriculum_type: 'CBE',
                code: resolvedProfile?.subject_code ?? assignment.subject_code,
                name: resolvedProfile?.subject_name ?? assignment.subject_name,
                level: resolvedProfile?.level ?? assignment.level,
                description: '',
                created_at: '',
            },
            subject_ids: [assignment.subject_id],
            subject_profile_ids: matchingProfiles.map(profile => profile.subject_profile_id),
            subject_name: resolvedProfile?.subject_name ?? assignment.subject_name,
            level: resolvedProfile?.level ?? assignment.level,
            cohort_id: assignment.cohort_id,
            cohort_name: assignment.cohort_name,
            academic_year: assignment.academic_year,
            subject_code: resolvedProfile?.subject_code ?? assignment.subject_code,
            cohort_subject_id: assignment.cohort_subject_id,
        });
    });

    return Array.from(deduped.values()).sort((left, right) => (
        left.subject.name.localeCompare(right.subject.name) ||
        (left.cohort_name ?? '').localeCompare(right.cohort_name ?? '') ||
        (left.academic_year ?? '').localeCompare(right.academic_year ?? '') ||
        left.subject.level.localeCompare(right.subject.level)
    ));
}

export function matchesCBCStrandToSubjectSelection(
  strand: Pick<
    Strand,
    'subject' | 'subject_org_id' | 'subject_name' | 'subject_level' | 'subject_profile_id'
  >,
  selection: Pick<
    CBCInstructorSubjectSelection,
    'subject_ids' | 'subject_name' | 'level' | 'subject_profile_ids'
  >,
) {
  if (
    typeof strand.subject_profile_id === 'number' &&
    selection.subject_profile_ids?.includes(strand.subject_profile_id)
  ) {
    return true;
  }

  if (
    selection.subject_ids.some(
      (subjectId) => strand.subject === subjectId || strand.subject_org_id === subjectId,
    )
  ) {
    return true;
  }

  return matchesCBCSubjectIdentity(
    strand.subject_name,
    strand.subject_level,
    selection.subject_name,
    selection.level,
  );
}
