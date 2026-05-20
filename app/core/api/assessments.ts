import { apiClient } from './client';
import {
  Assessment,
  AssessmentDetail,
  AssessmentScore,
  RubricScale,
  RubricScaleDetail,
  RubricLevel,
  BulkScoreData,
  AssessmentStatistics,
  StudentScoresResponse
} from '../types/assessment';
import type { PaginatedResponse } from '@/app/core/types/api';
import type { ApiError } from '@/app/core/types/errors';

function getDownloadFileName(
  headerValue: string | undefined,
  fallback: string,
): string {
  if (!headerValue) {
    return fallback;
  }

  const utf8Match = headerValue.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match?.[1]) {
    return decodeURIComponent(utf8Match[1]).replace(/^"(.*)"$/, '$1');
  }

  const asciiMatch = headerValue.match(/filename="?([^";]+)"?/i);
  if (asciiMatch?.[1]) {
    return asciiMatch[1];
  }

  return fallback;
}

function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

async function normalizeBlobError(error: unknown): Promise<never> {
  const apiError = error as ApiError & {
    response?: {
      data?: Blob | string | Record<string, unknown>;
      status?: number;
    };
  };
  const data = apiError.response?.data;

  if (data instanceof Blob) {
    const rawText = await data.text();
    let parsedData: NonNullable<ApiError['response']>['data'] = rawText;

    try {
      parsedData = JSON.parse(rawText) as NonNullable<ApiError['response']>['data'];
    } catch {
      parsedData = rawText;
    }

    throw {
      ...apiError,
      response: {
        ...apiError.response,
        data: parsedData,
      },
    } satisfies ApiError;
  }

  throw error;
}

// Rubric Scale API
export const rubricScaleAPI = {
  getAll: async (params?: { curriculum?: number; is_active?: boolean }) => {
    const response = await apiClient.get<RubricScale[]>('/assessments/rubric-scales/', { params });
    return response.data;
  },

  getById: async (id: number) => {
    const response = await apiClient.get<RubricScaleDetail>(`/assessments/rubric-scales/${id}/`);
    return response.data;
  },

  getActive: async () => {
    const response = await apiClient.get<RubricScale[]>('/assessments/rubric-scales/active/');
    return response.data;
  },

  getByCurriculum: async (curriculumId: number) => {
    const response = await apiClient.get<RubricScaleDetail[]>('/assessments/rubric-scales/by_curriculum/', {
      params: { curriculum_id: curriculumId }
    });
    return response.data;
  },

  create: async (data: Partial<RubricScale>) => {
    const response = await apiClient.post<RubricScale>('/assessments/rubric-scales/', data);
    return response.data;
  },

  update: async (id: number, data: Partial<RubricScale>) => {
    const response = await apiClient.patch<RubricScale>(`/assessments/rubric-scales/${id}/`, data);
    return response.data;
  },

  delete: async (id: number) => {
    await apiClient.delete(`/assessments/rubric-scales/${id}/`);
  }
};

// Rubric Level API
export const rubricLevelAPI = {
  getAll: async (rubricScaleId?: number) => {
    const params = rubricScaleId ? { rubric_scale: rubricScaleId } : {};
    const response = await apiClient.get<RubricLevel[]>('/assessments/rubric-levels/', { params });
    return response.data;
  },

  create: async (data: Partial<RubricLevel>) => {
    const response = await apiClient.post<RubricLevel>('/assessments/rubric-levels/', data);
    return response.data;
  },

  update: async (id: number, data: Partial<RubricLevel>) => {
    const response = await apiClient.patch<RubricLevel>(`/assessments/rubric-levels/${id}/`, data);
    return response.data;
  },

  delete: async (id: number) => {
    await apiClient.delete(`/assessments/rubric-levels/${id}/`);
  }
};

// Assessment API
export const assessmentAPI = {
  getAll: async (params?: {
    term?: number;
    cohort_subject?: number;
    assessment_type?: string;
    evaluation_type?: string;
    status?: string;
  }): Promise<Assessment[] | PaginatedResponse<Assessment>> => {
    const response = await apiClient.get<Assessment[] | PaginatedResponse<Assessment>>(
      '/assessments/',
      {
        params: {
          term: params?.term,
          cohort_subject: params?.cohort_subject,
          assessment_type: params?.assessment_type,
          evaluation_type: params?.evaluation_type,
          status: params?.status,
        },
      }
    );
    return response.data;
  },

  getById: async (id: number) => {
    const response = await apiClient.get<AssessmentDetail>(`/assessments/${id}/`);
    return response.data;
  },

  getByTerm: async (termId: number) => {
    const response = await apiClient.get<Assessment[]>('/assessments/by_term/', {
      params: { term_id: termId }
    });
    return response.data;
  },

  getBySubject: async (subjectId: number) => {
    const response = await apiClient.get<Assessment[]>('/assessments/by_subject/', {
      params: { subject_id: subjectId }
    });
    return response.data;
  },

  create: async (data: Partial<Assessment>): Promise<Assessment> => {
    const response = await apiClient.post<Assessment>('/assessments/', data);
    return response.data;
  },

  update: async (id: number, data: Partial<Assessment>) => {
    const response = await apiClient.patch<Assessment>(`/assessments/${id}/`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/assessments/${id}/`);
  },
  activate: async (id: number): Promise<Assessment> => {
    const response = await apiClient.post<Assessment>(`/assessments/${id}/activate/`);
    return response.data;
  },
  finalize: async (id: number): Promise<Assessment> => {
    const response = await apiClient.post<Assessment>(`/assessments/${id}/finalize/`);
    return response.data;
  },

  getLeaderboard: async (id: number, limit: number = 10) => {
    const response = await apiClient.get<AssessmentScore[]>(
      `/assessments/${id}/leaderboard/`,
      { params: { limit } }
    );
    return response.data;
  },

  getClassStatistics: async (id: number) => {
    const response = await apiClient.get<AssessmentStatistics>(
      `/assessments/${id}/class_statistics/`
    );
    return response.data;
  },

  exportPdf: async (id: number): Promise<void> => {
    try {
      const response = await apiClient.get<Blob>(
        `/assessments/${id}/export_pdf/`,
        {
          responseType: 'blob',
        }
      );
      const fileName = getDownloadFileName(
        response.headers['content-disposition'],
        `assessment-${id}.pdf`
      );
      downloadBlob(response.data, fileName);
    } catch (error) {
      await normalizeBlobError(error);
    }
  }
};

// Assessment Score API
export const assessmentScoreAPI = {
  getAll: async (params?: {
    assessment?: number;
    student?: number;
    assessment__term?: number;
    assessment__subject?: number;
    search?: string;
    page?: number;
    page_size?: number;
  }): Promise<AssessmentScore[] | PaginatedResponse<AssessmentScore>> => {
    const response = await apiClient.get<AssessmentScore[] | PaginatedResponse<AssessmentScore>>(
      '/scores/',
      {
        params: {
          assessment: params?.assessment,
          student: params?.student,
          search: params?.search,
          page: params?.page,
          page_size: params?.page_size,
          assessment__term: params?.assessment__term,
          assessment__subject: params?.assessment__subject,
        },
      }
    );
    return response.data;
  },

  getById: async (id: number) => {
    const response = await apiClient.get<AssessmentScore>(`/scores/${id}/`);
    return response.data;
  },

  create: async (data: {
    assessment: number;
    student: number;
    score?: number;
    rubric_level?: number;
    comments?: string;
    graded_by: string;
  }) => {
    const response = await apiClient.post<AssessmentScore>('/scores/', data);
    return response.data;
  },

  update: async (id: number, data: Partial<AssessmentScore>) => {
    const response = await apiClient.patch<AssessmentScore>(`/scores/${id}/`, data);
    return response.data;
  },

  delete: async (id: number) => {
    await apiClient.delete(`/scores/${id}/`);
  },

  bulkEntry: async (data: BulkScoreData) => {
    const response = await apiClient.post('/scores/bulk_entry/', data);
    return response.data;
  },

  getStudentScores: async (
    studentId: number,
    termId?: number,
    cohortId?: number
  ): Promise<StudentScoresResponse> => {
    const params: Record<string, number> = { student_id: studentId };
    if (termId) params.term_id = termId;
    if (cohortId) params.cohort_id = cohortId;
    const response = await apiClient.get<StudentScoresResponse>(
      '/scores/student_scores/', { params }
    );
    return response.data;
  },
};
