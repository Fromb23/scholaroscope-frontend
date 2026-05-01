// ============================================================================
// app/plugins/cambridge/queryKeys.ts
// ============================================================================

import type { CambridgeCatalogueListFilter } from './types';

export const queryKeys = {
  all: ['cambridge'] as const,

  installation: {
    all: ['cambridge', 'installation'] as const,
    status: ['cambridge', 'installation', 'status'] as const,
  },

  programmes: {
    all: ['cambridge', 'programmes'] as const,
    list: ['cambridge', 'programmes', 'list'] as const,
    detail: (id: number) => ['cambridge', 'programmes', 'detail', id] as const,
    subjects: (id: number) => ['cambridge', 'programmes', 'subjects', id] as const,
  },

  subjects: {
    all: ['cambridge', 'subjects'] as const,
    list: ['cambridge', 'subjects', 'list'] as const,
    detail: (id: number) => ['cambridge', 'subjects', 'detail', id] as const,
  },

  browser: {
    all: ['cambridge', 'browser'] as const,
    list: ['cambridge', 'browser', 'list'] as const,
  },

  units: {
    all: ['cambridge', 'units'] as const,
    list: (normalizedSubjectId: number) =>
      ['cambridge', 'units', 'list', { normalizedSubjectId }] as const,
  },

  assessment: {
    all: ['cambridge', 'assessment'] as const,
    list: (normalizedSubjectId: number) =>
      ['cambridge', 'assessment', 'list', { normalizedSubjectId }] as const,
  },

  inspection: {
    all: ['cambridge', 'inspection'] as const,
    frameworks: {
      all: ['cambridge', 'inspection', 'frameworks'] as const,
      list: ['cambridge', 'inspection', 'frameworks', 'list'] as const,
      detail: (id: number) => ['cambridge', 'inspection', 'frameworks', 'detail', id] as const,
    },
    syllabuses: {
      all: ['cambridge', 'inspection', 'syllabuses'] as const,
      list: ['cambridge', 'inspection', 'syllabuses', 'list'] as const,
      detail: (id: number) => ['cambridge', 'inspection', 'syllabuses', 'detail', id] as const,
    },
  },

  progress: {
    all: ['cambridge', 'progress'] as const,
    list: ['cambridge', 'progress', 'list'] as const,
    detail: (normalizedSubjectId: number) =>
      ['cambridge', 'progress', 'detail', { normalizedSubjectId }] as const,
  },

  offerings: {
    all: ['cambridge', 'offerings'] as const,
    list: (filter?: Record<string, unknown>) => ['cambridge', 'offerings', 'list', filter ?? {}] as const,
    detail: (id: number) => ['cambridge', 'offerings', 'detail', id] as const,
    cohorts: (id: number) => ['cambridge', 'offerings', 'cohorts', id] as const,
  },

  cohortSubjects: {
    all: ['cambridge', 'cohort-subjects'] as const,
    list: (filter?: Record<string, unknown>) => ['cambridge', 'cohort-subjects', 'list', filter ?? {}] as const,
    detail: (id: number) => ['cambridge', 'cohort-subjects', 'detail', id] as const,
  },

  catalogue: {
    all: ['cambridge', 'catalogue'] as const,
    programmes: {
      all: ['cambridge', 'catalogue', 'programmes'] as const,
      list: (filter?: CambridgeCatalogueListFilter) =>
        ['cambridge', 'catalogue', 'programmes', 'list', filter ?? {}] as const,
      detail: (id: number) => ['cambridge', 'catalogue', 'programmes', 'detail', id] as const,
    },
    subjectProfiles: {
      all: ['cambridge', 'catalogue', 'subject-profiles'] as const,
      list: (filter?: CambridgeCatalogueListFilter) =>
        ['cambridge', 'catalogue', 'subject-profiles', 'list', filter ?? {}] as const,
      detail: (id: number) => ['cambridge', 'catalogue', 'subject-profiles', 'detail', id] as const,
    },
    frameworks: {
      all: ['cambridge', 'catalogue', 'frameworks'] as const,
      list: (filter?: CambridgeCatalogueListFilter) =>
        ['cambridge', 'catalogue', 'frameworks', 'list', filter ?? {}] as const,
      detail: (id: number) => ['cambridge', 'catalogue', 'frameworks', 'detail', id] as const,
    },
    strands: {
      all: ['cambridge', 'catalogue', 'strands'] as const,
      list: (filter?: CambridgeCatalogueListFilter) =>
        ['cambridge', 'catalogue', 'strands', 'list', filter ?? {}] as const,
      detail: (id: number) => ['cambridge', 'catalogue', 'strands', 'detail', id] as const,
    },
    substrands: {
      all: ['cambridge', 'catalogue', 'substrands'] as const,
      list: (filter?: CambridgeCatalogueListFilter) =>
        ['cambridge', 'catalogue', 'substrands', 'list', filter ?? {}] as const,
      detail: (id: number) => ['cambridge', 'catalogue', 'substrands', 'detail', id] as const,
    },
    objectives: {
      all: ['cambridge', 'catalogue', 'objectives'] as const,
      list: (filter?: CambridgeCatalogueListFilter) =>
        ['cambridge', 'catalogue', 'objectives', 'list', filter ?? {}] as const,
      detail: (id: number) => ['cambridge', 'catalogue', 'objectives', 'detail', id] as const,
    },
    syllabuses: {
      all: ['cambridge', 'catalogue', 'syllabuses'] as const,
      list: (filter?: CambridgeCatalogueListFilter) =>
        ['cambridge', 'catalogue', 'syllabuses', 'list', filter ?? {}] as const,
      detail: (id: number) => ['cambridge', 'catalogue', 'syllabuses', 'detail', id] as const,
    },
    contentAreas: {
      all: ['cambridge', 'catalogue', 'content-areas'] as const,
      list: (filter?: CambridgeCatalogueListFilter) =>
        ['cambridge', 'catalogue', 'content-areas', 'list', filter ?? {}] as const,
      detail: (id: number) => ['cambridge', 'catalogue', 'content-areas', 'detail', id] as const,
    },
    assessmentComponents: {
      all: ['cambridge', 'catalogue', 'assessment-components'] as const,
      list: (filter?: CambridgeCatalogueListFilter) =>
        ['cambridge', 'catalogue', 'assessment-components', 'list', filter ?? {}] as const,
      detail: (id: number) => ['cambridge', 'catalogue', 'assessment-components', 'detail', id] as const,
    },
    entryOptions: {
      all: ['cambridge', 'catalogue', 'entry-options'] as const,
      list: (filter?: CambridgeCatalogueListFilter) =>
        ['cambridge', 'catalogue', 'entry-options', 'list', filter ?? {}] as const,
      detail: (id: number) => ['cambridge', 'catalogue', 'entry-options', 'detail', id] as const,
    },
  },
} as const;
