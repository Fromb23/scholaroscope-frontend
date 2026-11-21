import { describe, expect, it } from 'vitest';
import type { CBCTeachingAssignment, CBCVisibleProfile } from '@/app/plugins/cbc/types/cbc';
import { buildCBCInstructorAssignmentSelections } from './visibility';

const profiles: CBCVisibleProfile[] = [
  {
    subject_profile_id: 101,
    subject_id: 11,
    subject_name: 'Computer Studies',
    subject_code: 'COMP',
    level: 'grade10',
  },
  {
    subject_profile_id: 202,
    subject_id: 22,
    subject_name: 'ICT',
    subject_code: 'ICT',
    level: 'grade10',
  },
];

function assignment(
  cohortSubjectId: number,
  cohortId: number,
  cohortName: string,
  profile: CBCVisibleProfile,
): CBCTeachingAssignment {
  return {
    cohort_subject_id: cohortSubjectId,
    cohort_id: cohortId,
    cohort_name: cohortName,
    subject_id: profile.subject_id ?? profile.subject_profile_id,
    topic_subject_id: profile.subject_id,
    subject_name: profile.subject_name,
    subject_code: profile.subject_code,
    subject_profile_id: profile.subject_profile_id,
    subject_profile_name: profile.subject_name,
    subject_profile_code: profile.subject_code,
    level: profile.level,
    academic_year: '2026',
    is_current_year: true,
  };
}

describe('CBC instructor profile grouping', () => {
  it('groups four streams of one profile into one subject with four exact assignments', () => {
    const assignments = ['Yellow', 'Purple', 'Blue', 'Green'].map((name, index) => (
      assignment(1000 + index, 10 + index, name, profiles[0])
    ));

    const selections = buildCBCInstructorAssignmentSelections(assignments, profiles, 7);

    expect(selections).toHaveLength(1);
    expect(selections[0].filter_id).toBe(101);
    expect(selections[0].cohort_names).toEqual(['Blue', 'Green', 'Purple', 'Yellow']);
    expect(selections[0].cohort_subject_ids).toEqual([1000, 1001, 1002, 1003]);
  });

  it('keeps Computer Studies and ICT separate in the same stream', () => {
    const selections = buildCBCInstructorAssignmentSelections([
      assignment(1001, 10, 'Yellow', profiles[0]),
      assignment(2001, 10, 'Yellow', profiles[1]),
    ], profiles, 7);

    expect(selections.map(selection => selection.filter_id)).toEqual([101, 202]);
    expect(selections.map(selection => selection.cohort_subject_ids)).toEqual([[1001], [2001]]);
  });

  it('exposes only the assigned stream for each selected profile', () => {
    const selections = buildCBCInstructorAssignmentSelections([
      assignment(1002, 12, 'Purple', profiles[0]),
      assignment(2001, 10, 'Yellow', profiles[1]),
    ], profiles, 7);

    expect(selections.find(selection => selection.filter_id === 101)?.cohort_ids).toEqual([12]);
    expect(selections.find(selection => selection.filter_id === 202)?.cohort_ids).toEqual([10]);
  });

  it('preserves profile identity while resolving each stream to its exact deep-link assignment', () => {
    const selections = buildCBCInstructorAssignmentSelections([
      assignment(1001, 10, 'Yellow', profiles[0]),
      assignment(1002, 12, 'Purple', profiles[0]),
    ], profiles, 7);
    const computerStudies = selections[0];

    expect(computerStudies.subject_profile_ids).toEqual([101]);
    expect(computerStudies.assignments?.find(item => item.cohort_id === 10)?.cohort_subject_id).toBe(1001);
    expect(computerStudies.assignments?.find(item => item.cohort_id === 12)?.cohort_subject_id).toBe(1002);
    expect(computerStudies.assignments?.find(item => item.cohort_subject_id === 9999)).toBeUndefined();
  });

  it('prefers the resolved catalogue profile when the local assignment profile has another id', () => {
    const localProfileAssignment = {
      ...assignment(1001, 10, 'Yellow', profiles[0]),
      subject_profile_id: 999,
    };

    const selections = buildCBCInstructorAssignmentSelections(
      [localProfileAssignment],
      profiles,
      7,
    );

    expect(selections[0].filter_id).toBe(101);
    expect(selections[0].subject_profile_ids).toEqual([101]);
  });
});
