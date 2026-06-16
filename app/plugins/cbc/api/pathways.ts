import { apiClient } from '@/app/core/api/client';
import { toArray } from '@/app/plugins/cbc/lib/apiHelpers';
import type {
  CbcCohortAllowedSubjects,
  CbcCohortProfileSummary,
  CbcPathway,
  CbcPathwayAllowedSubjectsCatalogue,
  CbcSchoolOfferedCombination,
  CbcStudentSubjectSwitchOptions,
  CbcSubjectCombination,
  CbcTrack,
} from '@/app/plugins/cbc/types/pathways';

const CBC_PATHWAY_CATALOGUE_ERROR =
  'Could not load CBC pathway catalogue. Check API routing for /api/cbc/pathways/.';

interface CatalogueRequestDiagnostic {
  endpoint: string;
  url: string;
  params?: Record<string, number | string | null | undefined>;
  statusCode?: number;
  responseData?: unknown;
}

interface CatalogueRequestError extends Error {
  response?: {
    status?: number;
    data?: unknown;
  };
  diagnostic?: CatalogueRequestDiagnostic;
}

function buildCatalogueRequestUrl(
  endpoint: string,
  params?: Record<string, number | string | null | undefined>
): string {
  const baseURL = apiClient.defaults.baseURL ?? '';
  const normalizedBaseURL = baseURL.endsWith('/') ? baseURL.slice(0, -1) : baseURL;
  const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = new URL(
    `${normalizedBaseURL}${normalizedEndpoint}`,
    typeof window !== 'undefined' ? window.location.origin : 'http://localhost'
  );

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        url.searchParams.set(key, String(value));
      }
    });
  }

  return url.toString();
}

function apiBaseUrlLooksMisconfigured(): boolean {
  const baseURL = apiClient.defaults.baseURL ?? '';

  if (!baseURL) {
    return true;
  }

  try {
    const parsed = new URL(
      baseURL,
      typeof window !== 'undefined' ? window.location.origin : 'http://localhost'
    );
    return !parsed.pathname.includes('/api');
  } catch {
    return !baseURL.includes('/api');
  }
}

function looksLikeHtmlResponse(data: unknown): boolean {
  if (typeof data !== 'string') {
    return false;
  }

  const trimmed = data.trim().toLowerCase();
  return (
    trimmed.startsWith('<!doctype html') ||
    trimmed.startsWith('<html') ||
    trimmed.includes('<body') ||
    trimmed.includes('<head')
  );
}

function resolveCatalogueErrorMessage(endpoint: string, error: unknown): string {
  const requestError = error as {
    response?: {
      data?: unknown;
      status?: number;
    };
    message?: string;
  };
  const responseData = requestError.response?.data;
  const statusCode = requestError.response?.status;

  if (apiBaseUrlLooksMisconfigured()) {
    return `${CBC_PATHWAY_CATALOGUE_ERROR} NEXT_PUBLIC_API_URL must point to the backend API and include /api.`;
  }

  if (looksLikeHtmlResponse(responseData) || (statusCode === 404 && endpoint.startsWith('/cbc/'))) {
    return CBC_PATHWAY_CATALOGUE_ERROR;
  }

  return requestError.message ?? 'Failed to load CBC pathway catalogue.';
}

function decorateCatalogueError(
  error: unknown,
  endpoint: string,
  params?: Record<string, number | string | null | undefined>
): CatalogueRequestError {
  const requestError = error as CatalogueRequestError;
  const responseData = requestError.response?.data;
  const decorated =
    error instanceof Error
      ? (error as CatalogueRequestError)
      : (new Error('CBC catalogue request failed') as CatalogueRequestError);

  decorated.message = resolveCatalogueErrorMessage(endpoint, error);
  decorated.response = requestError.response;
  decorated.diagnostic = {
    endpoint,
    url: buildCatalogueRequestUrl(endpoint, params),
    params,
    statusCode: requestError.response?.status,
    responseData,
  };

  return decorated;
}

export const cbcPathwayAPI = {
  listPathways: async () => {
    try {
      const response = await apiClient.get<CbcPathway[] | { results?: CbcPathway[] }>('/cbc/pathways/');
      return toArray(response.data);
    } catch (error) {
      throw decorateCatalogueError(error, '/cbc/pathways/');
    }
  },

  listTracks: async (pathwayId: number) => {
    try {
      const response = await apiClient.get<CbcTrack[] | { results?: CbcTrack[] }>(
        `/cbc/pathways/${pathwayId}/tracks/`
      );
      return toArray(response.data);
    } catch (error) {
      throw decorateCatalogueError(error, `/cbc/pathways/${pathwayId}/tracks/`);
    }
  },

  listPathwayAllowedSubjects: async (pathwayId: number, level: string) => {
    const params = level ? { level } : undefined;

    try {
      const response = await apiClient.get<CbcPathwayAllowedSubjectsCatalogue>(
        `/cbc/pathways/${pathwayId}/allowed-subjects/`,
        { params }
      );
      return response.data;
    } catch (error) {
      throw decorateCatalogueError(error, `/cbc/pathways/${pathwayId}/allowed-subjects/`, params);
    }
  },

  listCombinations: async (trackId: number, level?: string) => {
    const params = level ? { level } : undefined;

    try {
      const response = await apiClient.get<
        CbcSubjectCombination[] | { results?: CbcSubjectCombination[] }
      >('/cbc/tracks/' + trackId + '/combinations/', { params });
      return toArray(response.data);
    } catch (error) {
      throw decorateCatalogueError(error, `/cbc/tracks/${trackId}/combinations/`, params);
    }
  },

  listCombinationSubjects: async (combinationId: number, level?: string) => {
    const params = level ? { level } : undefined;

    try {
      const response = await apiClient.get<CbcSubjectCombination>(
        `/cbc/combinations/${combinationId}/subjects/`,
        { params }
      );
      return Array.isArray(response.data.subjects) ? response.data.subjects : [];
    } catch (error) {
      throw decorateCatalogueError(error, `/cbc/combinations/${combinationId}/subjects/`, params);
    }
  },

  listSchoolOfferedCombinations: async () => {
    const response = await apiClient.get<CbcSchoolOfferedCombination[]>('/cbc/school-offered-combinations/');
    return response.data;
  },

  offerCombination: async (combinationId: number) => {
    const response = await apiClient.post<CbcSchoolOfferedCombination>(
      '/cbc/school-offered-combinations/',
      { combination_id: combinationId }
    );
    return response.data;
  },

  getCohortProfile: async (cohortId: number) => {
    const response = await apiClient.get<CbcCohortProfileSummary>(`/cbc/cohorts/${cohortId}/profile/`);
    return response.data;
  },

  configureCohortProfile: async (
    cohortId: number,
    payload: {
      pathwayId: number;
      trackId?: number | null;
      combinationId?: number | null;
      offeredCombinationId?: number | null;
    }
  ) => {
    const response = await apiClient.post<CbcCohortProfileSummary>(
      `/cbc/cohorts/${cohortId}/profile/`,
      {
        pathway_id: payload.pathwayId,
        track_id: payload.trackId ?? null,
        combination_id: payload.combinationId ?? null,
        offered_combination_id: payload.offeredCombinationId ?? null,
      }
    );
    return response.data;
  },

  getCohortAllowedSubjects: async (cohortId: number) => {
    const response = await apiClient.get<CbcCohortAllowedSubjects>(`/cbc/cohorts/${cohortId}/allowed_subjects/`);
    return response.data;
  },

  getStudentSubjectSwitchOptions: async (studentId: number) => {
    const response = await apiClient.get<CbcStudentSubjectSwitchOptions>(
      `/cbc/students/${studentId}/subject_switch_options/`
    );
    return response.data;
  },
};
