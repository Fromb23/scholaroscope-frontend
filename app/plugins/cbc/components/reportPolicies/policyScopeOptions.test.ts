import { describe, expect, it } from 'vitest';

import {
  buildCbcCohortSubjectOptions,
  buildCbcSubjectProfileOptions,
} from './policyScopeOptions';
import type { CohortSubject } from '@/app/core/types/academic';
import type { CBCCatalog } from '@/app/plugins/cbc/types/cbc';

describe('CBC report policy scope options', () => {
  it('labels class subject options as class subjects', () => {
    const options = buildCbcCohortSubjectOptions([
      {
        id: 26,
        cohort: 9,
        cohort_id: 9,
        cohort_name: 'Grade 7',
        cohort_level: 'Grade 7',
        subject: 12,
        subject_id: 12,
        subject_name: 'Mathematics',
        subject_code: 'MATH',
        curriculum_name: 'CBC',
        curriculum_type: 'CBE',
        is_compulsory: true,
        cbc_cohort_subject_id: 41,
        subject_profile_id: 99,
      } satisfies CohortSubject,
    ]);

    expect(options[0].label).toBe('Class subject: Grade 7 · MATH · Mathematics');
  });

  it('labels catalog profiles as reference-only options', () => {
    const options = buildCbcSubjectProfileOptions({
      curriculum_id: 1,
      curriculum_name: 'CBC',
      subjects: [
        {
          code: 'MATH',
          name: 'Mathematics',
          levels: [
            {
              level: 'Grade 7',
              code: 'MATH-G7',
              subject_id: null,
              subject_profile_id: 99,
              registered: false,
              any_registered: false,
              all_registered: false,
              total_strands_count: 0,
              total_sub_strands_count: 0,
              registered_sub_strands_count: 0,
              content_status: 'CATALOGUE_ONLY',
              is_content_ready: false,
              registration_status: 'NOT_REGISTERED',
              strands: [],
            },
          ],
        },
      ],
    } satisfies CBCCatalog);

    expect(options[0].label).toBe('Catalog reference only: MATH · Mathematics · Grade 7');
  });
});
