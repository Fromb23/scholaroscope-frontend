// ============================================================================
// app/plugins/cambridge/api.ts
// ============================================================================

import { AxiosError } from 'axios';
import { apiClient } from '@/app/core/api/client';
import type {
  CambridgeAssignOfferingToCohortPayload,
  CambridgeCatalogueAssessmentComponent,
  CambridgeCatalogueAssessmentComponentCreatePayload,
  CambridgeCatalogueEntryOption,
  CambridgeCatalogueEntryOptionPayload,
  CambridgeCatalogueFramework,
  CambridgeCatalogueFrameworkCreatePayload,
  CambridgeCatalogueLearningObjective,
  CambridgeCatalogueLearningObjectiveCreatePayload,
  CambridgeCatalogueListFilter,
  CambridgeCatalogueProgramme,
  CambridgeCatalogueProgrammeCreatePayload,
  CambridgeCatalogueStrand,
  CambridgeCatalogueStrandCreatePayload,
  CambridgeCatalogueSubjectProfile,
  CambridgeCatalogueSubjectProfileCreatePayload,
  CambridgeCatalogueSubstrand,
  CambridgeCatalogueSubstrandCreatePayload,
  CambridgeCatalogueSyllabus,
  CambridgeCatalogueSyllabusCreatePayload,
  CambridgeCatalogueSyllabusContentArea,
  CambridgeCatalogueSyllabusContentAreaCreatePayload,
  CambridgeCohortSubject,
  CambridgeInstallation,
  CambridgeInstallationProgramme,
  CambridgeInstallationSubject,
  CambridgeInspectionFrameworkDetail,
  CambridgeInspectionSyllabusDetail,
  CambridgeMessageResponse,
  CambridgeNormalizedAssessmentUnit,
  CambridgeNormalizedLearningUnit,
  CambridgeNormalizedSubject,
  CambridgeProgrammeSubjectsResponse,
  CambridgeRenameSubjectPayload,
  CambridgeSubjectOffering,
  CambridgeSubjectOfferingCreatePayload,
  CambridgeSubjectOfferingUpdatePayload,
  CambridgeSubjectProgress,
  ListResponse,
} from './types';

function toArray<T>(data: ListResponse<T>): T[] {
  return Array.isArray(data) ? data : data.results;
}

function isNotFound(error: unknown): boolean {
  return error instanceof AxiosError && error.response?.status === 404;
}

export const installationAPI = {
  async getStatus(): Promise<CambridgeInstallation | null> {
    try {
      const response = await apiClient.get<CambridgeInstallation>('/cambridge/installation/status/');
      return response.data;
    } catch (error) {
      if (isNotFound(error)) {
        return null;
      }
      throw error;
    }
  },

  async install(): Promise<CambridgeInstallation> {
    const response = await apiClient.post<CambridgeInstallation>('/cambridge/installation/install/');
    return response.data;
  },

  async enable(): Promise<CambridgeInstallation> {
    const response = await apiClient.post<CambridgeInstallation>('/cambridge/installation/enable/');
    return response.data;
  },

  async disable(): Promise<CambridgeInstallation> {
    const response = await apiClient.post<CambridgeInstallation>('/cambridge/installation/disable/');
    return response.data;
  },
};

export const programmeAPI = {
  async list(): Promise<CambridgeInstallationProgramme[]> {
    const response = await apiClient.get<ListResponse<CambridgeInstallationProgramme>>('/cambridge/programmes/');
    return toArray(response.data);
  },

  async getSubjects(id: number): Promise<CambridgeProgrammeSubjectsResponse> {
    const response = await apiClient.get<CambridgeProgrammeSubjectsResponse>(`/cambridge/programmes/${id}/subjects/`);
    return response.data;
  },

  async offerSubject(id: number, payload: CambridgeSubjectOfferingCreatePayload): Promise<CambridgeSubjectOffering> {
    const response = await apiClient.post<CambridgeSubjectOffering>(`/cambridge/programmes/${id}/subjects/`, payload);
    return response.data;
  },

  async enable(id: number): Promise<CambridgeInstallationProgramme> {
    const response = await apiClient.post<CambridgeInstallationProgramme>(`/cambridge/programmes/${id}/enable/`);
    return response.data;
  },

  async disable(id: number): Promise<CambridgeInstallationProgramme> {
    const response = await apiClient.post<CambridgeInstallationProgramme>(`/cambridge/programmes/${id}/disable/`);
    return response.data;
  },
};

export const subjectAPI = {
  async list(): Promise<CambridgeInstallationSubject[]> {
    const response = await apiClient.get<ListResponse<CambridgeInstallationSubject>>('/cambridge/subjects/');
    return toArray(response.data);
  },

  async getById(id: number): Promise<CambridgeInstallationSubject> {
    const response = await apiClient.get<CambridgeInstallationSubject>(`/cambridge/subjects/${id}/`);
    return response.data;
  },

  async enable(id: number): Promise<CambridgeInstallationSubject> {
    const response = await apiClient.post<CambridgeInstallationSubject>(`/cambridge/subjects/${id}/enable/`);
    return response.data;
  },

  async disable(id: number): Promise<CambridgeMessageResponse> {
    const response = await apiClient.post<CambridgeMessageResponse>(`/cambridge/subjects/${id}/disable/`);
    return response.data;
  },

  async rename(id: number, payload: CambridgeRenameSubjectPayload): Promise<CambridgeInstallationSubject> {
    const response = await apiClient.patch<CambridgeInstallationSubject>(`/cambridge/subjects/${id}/rename/`, payload);
    return response.data;
  },
};

export const offeringAPI = {
  async list(params?: {
    installation_programme?: number;
    subject_profile?: number;
    cohort?: number;
    active?: boolean;
  }): Promise<CambridgeSubjectOffering[]> {
    const response = await apiClient.get<ListResponse<CambridgeSubjectOffering>>('/cambridge/offerings/', {
      params,
    });
    return toArray(response.data);
  },

  async getById(id: number): Promise<CambridgeSubjectOffering> {
    const response = await apiClient.get<CambridgeSubjectOffering>(`/cambridge/offerings/${id}/`);
    return response.data;
  },

  async update(id: number, payload: CambridgeSubjectOfferingUpdatePayload): Promise<CambridgeSubjectOffering> {
    const response = await apiClient.patch<CambridgeSubjectOffering>(`/cambridge/offerings/${id}/`, payload);
    return response.data;
  },

  async assignCohort(id: number, payload: CambridgeAssignOfferingToCohortPayload): Promise<CambridgeCohortSubject> {
    const response = await apiClient.post<CambridgeCohortSubject>(`/cambridge/offerings/${id}/assign-cohort/`, payload);
    return response.data;
  },

  async listCohorts(id: number, params?: { active?: boolean }): Promise<CambridgeCohortSubject[]> {
    const response = await apiClient.get<ListResponse<CambridgeCohortSubject>>(`/cambridge/offerings/${id}/cohorts/`, {
      params,
    });
    return toArray(response.data);
  },
};

export const cohortSubjectAPI = {
  async list(params?: {
    cohort?: number;
    offering?: number;
    active?: boolean;
  }): Promise<CambridgeCohortSubject[]> {
    const response = await apiClient.get<ListResponse<CambridgeCohortSubject>>('/cambridge/cohort-subjects/', {
      params,
    });
    return toArray(response.data);
  },

  async deactivate(id: number): Promise<CambridgeCohortSubject> {
    const response = await apiClient.post<CambridgeCohortSubject>(`/cambridge/cohort-subjects/${id}/deactivate/`);
    return response.data;
  },
};

export const browserAPI = {
  async listSubjects(): Promise<CambridgeNormalizedSubject[]> {
    const response = await apiClient.get<ListResponse<CambridgeNormalizedSubject>>('/cambridge/browser/');
    return toArray(response.data);
  },
};

export const unitAPI = {
  async list(normalizedSubjectId: number): Promise<CambridgeNormalizedLearningUnit[]> {
    const response = await apiClient.get<ListResponse<CambridgeNormalizedLearningUnit>>('/cambridge/units/', {
      params: { normalized_subject: normalizedSubjectId },
    });
    return toArray(response.data);
  },
};

export const assessmentAPI = {
  async list(normalizedSubjectId: number): Promise<CambridgeNormalizedAssessmentUnit[]> {
    const response = await apiClient.get<ListResponse<CambridgeNormalizedAssessmentUnit>>('/cambridge/assessment/', {
      params: { normalized_subject: normalizedSubjectId },
    });
    return toArray(response.data);
  },
};

export const inspectionFrameworkAPI = {
  async list(): Promise<CambridgeInspectionFrameworkDetail[]> {
    const response = await apiClient.get<ListResponse<CambridgeInspectionFrameworkDetail>>('/cambridge/frameworks/');
    return toArray(response.data);
  },

  async getById(id: number): Promise<CambridgeInspectionFrameworkDetail> {
    const response = await apiClient.get<CambridgeInspectionFrameworkDetail>(`/cambridge/frameworks/${id}/`);
    return response.data;
  },
};

export const inspectionSyllabusAPI = {
  async list(): Promise<CambridgeInspectionSyllabusDetail[]> {
    const response = await apiClient.get<ListResponse<CambridgeInspectionSyllabusDetail>>('/cambridge/syllabuses/');
    return toArray(response.data);
  },

  async getById(id: number): Promise<CambridgeInspectionSyllabusDetail> {
    const response = await apiClient.get<CambridgeInspectionSyllabusDetail>(`/cambridge/syllabuses/${id}/`);
    return response.data;
  },
};

export const progressAPI = {
  async list(): Promise<CambridgeSubjectProgress[]> {
    const response = await apiClient.get<CambridgeSubjectProgress[]>('/cambridge/progress/subject_progress/');
    return response.data;
  },

  async detail(normalizedSubjectId: number): Promise<CambridgeSubjectProgress> {
    const response = await apiClient.get<CambridgeSubjectProgress>(
      `/cambridge/progress/${normalizedSubjectId}/detail_progress/`
    );
    return response.data;
  },
};

function catalogueParams(filter?: CambridgeCatalogueListFilter): Record<string, string | number | boolean> | undefined {
  if (!filter) return undefined;
  const params: Record<string, string | number | boolean> = {};
  if (typeof filter.programme === 'number') params.programme = filter.programme;
  if (typeof filter.subject_profile === 'number') params.subject_profile = filter.subject_profile;
  if (typeof filter.framework === 'number') params.framework = filter.framework;
  if (typeof filter.strand === 'number') params.strand = filter.strand;
  if (typeof filter.substrand === 'number') params.substrand = filter.substrand;
  if (typeof filter.syllabus === 'number') params.syllabus = filter.syllabus;
  if (typeof filter.active === 'boolean') params.active = filter.active;
  return Object.keys(params).length > 0 ? params : undefined;
}

const catalogueBase = '/cambridge/admin/catalogue';

export const catalogueProgrammeAPI = {
  async list(filter?: CambridgeCatalogueListFilter): Promise<CambridgeCatalogueProgramme[]> {
    const response = await apiClient.get<ListResponse<CambridgeCatalogueProgramme>>(`${catalogueBase}/programmes/`, {
      params: catalogueParams(filter),
    });
    return toArray(response.data);
  },
  async getById(id: number): Promise<CambridgeCatalogueProgramme> {
    const response = await apiClient.get<CambridgeCatalogueProgramme>(`${catalogueBase}/programmes/${id}/`);
    return response.data;
  },
  async create(payload: CambridgeCatalogueProgrammeCreatePayload): Promise<CambridgeCatalogueProgramme> {
    const response = await apiClient.post<CambridgeCatalogueProgramme>(`${catalogueBase}/programmes/`, payload);
    return response.data;
  },
  async update(id: number, payload: Partial<Omit<CambridgeCatalogueProgramme, 'id'>>): Promise<CambridgeCatalogueProgramme> {
    const response = await apiClient.patch<CambridgeCatalogueProgramme>(`${catalogueBase}/programmes/${id}/`, payload);
    return response.data;
  },
  async remove(id: number): Promise<void> {
    await apiClient.delete(`${catalogueBase}/programmes/${id}/`);
  },
};

export const catalogueSubjectProfileAPI = {
  async list(filter?: CambridgeCatalogueListFilter): Promise<CambridgeCatalogueSubjectProfile[]> {
    const response = await apiClient.get<ListResponse<CambridgeCatalogueSubjectProfile>>(`${catalogueBase}/subject-profiles/`, {
      params: catalogueParams(filter),
    });
    return toArray(response.data);
  },
  async getById(id: number): Promise<CambridgeCatalogueSubjectProfile> {
    const response = await apiClient.get<CambridgeCatalogueSubjectProfile>(`${catalogueBase}/subject-profiles/${id}/`);
    return response.data;
  },
  async create(payload: CambridgeCatalogueSubjectProfileCreatePayload): Promise<CambridgeCatalogueSubjectProfile> {
    const response = await apiClient.post<CambridgeCatalogueSubjectProfile>(`${catalogueBase}/subject-profiles/`, payload);
    return response.data;
  },
  async update(id: number, payload: Partial<Omit<CambridgeCatalogueSubjectProfile, 'id' | 'structure_mode'>>): Promise<CambridgeCatalogueSubjectProfile> {
    const response = await apiClient.patch<CambridgeCatalogueSubjectProfile>(`${catalogueBase}/subject-profiles/${id}/`, payload);
    return response.data;
  },
  async remove(id: number): Promise<void> {
    await apiClient.delete(`${catalogueBase}/subject-profiles/${id}/`);
  },
};

export const catalogueFrameworkAPI = {
  async list(filter?: CambridgeCatalogueListFilter): Promise<CambridgeCatalogueFramework[]> {
    const response = await apiClient.get<ListResponse<CambridgeCatalogueFramework>>(`${catalogueBase}/frameworks/`, {
      params: catalogueParams(filter),
    });
    return toArray(response.data);
  },
  async getById(id: number): Promise<CambridgeCatalogueFramework> {
    const response = await apiClient.get<CambridgeCatalogueFramework>(`${catalogueBase}/frameworks/${id}/`);
    return response.data;
  },
  async create(payload: CambridgeCatalogueFrameworkCreatePayload): Promise<CambridgeCatalogueFramework> {
    const response = await apiClient.post<CambridgeCatalogueFramework>(`${catalogueBase}/frameworks/`, payload);
    return response.data;
  },
  async update(id: number, payload: Partial<Omit<CambridgeCatalogueFramework, 'id' | 'is_current'>>): Promise<CambridgeCatalogueFramework> {
    const response = await apiClient.patch<CambridgeCatalogueFramework>(`${catalogueBase}/frameworks/${id}/`, payload);
    return response.data;
  },
  async remove(id: number): Promise<void> {
    await apiClient.delete(`${catalogueBase}/frameworks/${id}/`);
  },
};

export const catalogueStrandAPI = {
  async list(filter?: CambridgeCatalogueListFilter): Promise<CambridgeCatalogueStrand[]> {
    const response = await apiClient.get<ListResponse<CambridgeCatalogueStrand>>(`${catalogueBase}/strands/`, {
      params: catalogueParams(filter),
    });
    return toArray(response.data);
  },
  async getById(id: number): Promise<CambridgeCatalogueStrand> {
    const response = await apiClient.get<CambridgeCatalogueStrand>(`${catalogueBase}/strands/${id}/`);
    return response.data;
  },
  async create(payload: CambridgeCatalogueStrandCreatePayload): Promise<CambridgeCatalogueStrand> {
    const response = await apiClient.post<CambridgeCatalogueStrand>(`${catalogueBase}/strands/`, payload);
    return response.data;
  },
  async update(id: number, payload: Partial<Omit<CambridgeCatalogueStrand, 'id'>>): Promise<CambridgeCatalogueStrand> {
    const response = await apiClient.patch<CambridgeCatalogueStrand>(`${catalogueBase}/strands/${id}/`, payload);
    return response.data;
  },
  async remove(id: number): Promise<void> {
    await apiClient.delete(`${catalogueBase}/strands/${id}/`);
  },
};

export const catalogueSubstrandAPI = {
  async list(filter?: CambridgeCatalogueListFilter): Promise<CambridgeCatalogueSubstrand[]> {
    const response = await apiClient.get<ListResponse<CambridgeCatalogueSubstrand>>(`${catalogueBase}/substrands/`, {
      params: catalogueParams(filter),
    });
    return toArray(response.data);
  },
  async getById(id: number): Promise<CambridgeCatalogueSubstrand> {
    const response = await apiClient.get<CambridgeCatalogueSubstrand>(`${catalogueBase}/substrands/${id}/`);
    return response.data;
  },
  async create(strandId: number, payload: CambridgeCatalogueSubstrandCreatePayload): Promise<CambridgeCatalogueSubstrand> {
    const response = await apiClient.post<CambridgeCatalogueSubstrand>(
      `${catalogueBase}/strands/${strandId}/substrands/`,
      payload
    );
    return response.data;
  },
  async update(id: number, payload: Partial<Omit<CambridgeCatalogueSubstrand, 'id'>>): Promise<CambridgeCatalogueSubstrand> {
    const response = await apiClient.patch<CambridgeCatalogueSubstrand>(`${catalogueBase}/substrands/${id}/`, payload);
    return response.data;
  },
  async remove(id: number): Promise<void> {
    await apiClient.delete(`${catalogueBase}/substrands/${id}/`);
  },
};

export const catalogueObjectiveAPI = {
  async list(filter?: CambridgeCatalogueListFilter): Promise<CambridgeCatalogueLearningObjective[]> {
    const response = await apiClient.get<ListResponse<CambridgeCatalogueLearningObjective>>(`${catalogueBase}/objectives/`, {
      params: catalogueParams(filter),
    });
    return toArray(response.data);
  },
  async getById(id: number): Promise<CambridgeCatalogueLearningObjective> {
    const response = await apiClient.get<CambridgeCatalogueLearningObjective>(`${catalogueBase}/objectives/${id}/`);
    return response.data;
  },
  async create(
    substrandId: number,
    payload: CambridgeCatalogueLearningObjectiveCreatePayload
  ): Promise<CambridgeCatalogueLearningObjective> {
    const response = await apiClient.post<CambridgeCatalogueLearningObjective>(
      `${catalogueBase}/substrands/${substrandId}/objectives/`,
      payload
    );
    return response.data;
  },
  async update(id: number, payload: Partial<Omit<CambridgeCatalogueLearningObjective, 'id'>>): Promise<CambridgeCatalogueLearningObjective> {
    const response = await apiClient.patch<CambridgeCatalogueLearningObjective>(`${catalogueBase}/objectives/${id}/`, payload);
    return response.data;
  },
  async remove(id: number): Promise<void> {
    await apiClient.delete(`${catalogueBase}/objectives/${id}/`);
  },
};

export const catalogueSyllabusAPI = {
  async list(filter?: CambridgeCatalogueListFilter): Promise<CambridgeCatalogueSyllabus[]> {
    const response = await apiClient.get<ListResponse<CambridgeCatalogueSyllabus>>(`${catalogueBase}/syllabuses/`, {
      params: catalogueParams(filter),
    });
    return toArray(response.data);
  },
  async getById(id: number): Promise<CambridgeCatalogueSyllabus> {
    const response = await apiClient.get<CambridgeCatalogueSyllabus>(`${catalogueBase}/syllabuses/${id}/`);
    return response.data;
  },
  async create(payload: CambridgeCatalogueSyllabusCreatePayload): Promise<CambridgeCatalogueSyllabus> {
    const response = await apiClient.post<CambridgeCatalogueSyllabus>(`${catalogueBase}/syllabuses/`, payload);
    return response.data;
  },
  async update(id: number, payload: Partial<Omit<CambridgeCatalogueSyllabus, 'id' | 'is_current'>>): Promise<CambridgeCatalogueSyllabus> {
    const response = await apiClient.patch<CambridgeCatalogueSyllabus>(`${catalogueBase}/syllabuses/${id}/`, payload);
    return response.data;
  },
  async remove(id: number): Promise<void> {
    await apiClient.delete(`${catalogueBase}/syllabuses/${id}/`);
  },
};

export const catalogueContentAreaAPI = {
  async list(filter?: CambridgeCatalogueListFilter): Promise<CambridgeCatalogueSyllabusContentArea[]> {
    const response = await apiClient.get<ListResponse<CambridgeCatalogueSyllabusContentArea>>(`${catalogueBase}/content-areas/`, {
      params: catalogueParams(filter),
    });
    return toArray(response.data);
  },
  async create(payload: CambridgeCatalogueSyllabusContentAreaCreatePayload): Promise<CambridgeCatalogueSyllabusContentArea> {
    const response = await apiClient.post<CambridgeCatalogueSyllabusContentArea>(`${catalogueBase}/content-areas/`, payload);
    return response.data;
  },
  async update(id: number, payload: Partial<Omit<CambridgeCatalogueSyllabusContentArea, 'id'>>): Promise<CambridgeCatalogueSyllabusContentArea> {
    const response = await apiClient.patch<CambridgeCatalogueSyllabusContentArea>(`${catalogueBase}/content-areas/${id}/`, payload);
    return response.data;
  },
  async remove(id: number): Promise<void> {
    await apiClient.delete(`${catalogueBase}/content-areas/${id}/`);
  },
};

export const catalogueAssessmentComponentAPI = {
  async list(filter?: CambridgeCatalogueListFilter): Promise<CambridgeCatalogueAssessmentComponent[]> {
    const response = await apiClient.get<ListResponse<CambridgeCatalogueAssessmentComponent>>(`${catalogueBase}/assessment-components/`, {
      params: catalogueParams(filter),
    });
    return toArray(response.data);
  },
  async create(payload: CambridgeCatalogueAssessmentComponentCreatePayload): Promise<CambridgeCatalogueAssessmentComponent> {
    const response = await apiClient.post<CambridgeCatalogueAssessmentComponent>(`${catalogueBase}/assessment-components/`, payload);
    return response.data;
  },
  async update(id: number, payload: Partial<Omit<CambridgeCatalogueAssessmentComponent, 'id'>>): Promise<CambridgeCatalogueAssessmentComponent> {
    const response = await apiClient.patch<CambridgeCatalogueAssessmentComponent>(`${catalogueBase}/assessment-components/${id}/`, payload);
    return response.data;
  },
  async remove(id: number): Promise<void> {
    await apiClient.delete(`${catalogueBase}/assessment-components/${id}/`);
  },
};

export const catalogueEntryOptionAPI = {
  async list(filter?: CambridgeCatalogueListFilter): Promise<CambridgeCatalogueEntryOption[]> {
    const response = await apiClient.get<ListResponse<CambridgeCatalogueEntryOption>>(`${catalogueBase}/entry-options/`, {
      params: catalogueParams(filter),
    });
    return toArray(response.data);
  },
  async create(payload: CambridgeCatalogueEntryOptionPayload): Promise<CambridgeCatalogueEntryOption> {
    const response = await apiClient.post<CambridgeCatalogueEntryOption>(`${catalogueBase}/entry-options/`, payload);
    return response.data;
  },
  async update(id: number, payload: Partial<CambridgeCatalogueEntryOptionPayload>): Promise<CambridgeCatalogueEntryOption> {
    const response = await apiClient.patch<CambridgeCatalogueEntryOption>(`${catalogueBase}/entry-options/${id}/`, payload);
    return response.data;
  },
  async remove(id: number): Promise<void> {
    await apiClient.delete(`${catalogueBase}/entry-options/${id}/`);
  },
};
