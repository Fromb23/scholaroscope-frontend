import { apiClient } from '@/app/core/api/client';
import { downloadBlob, getDownloadFileName, normalizeBlobError } from '@/app/core/api/downloads';
import type {
  GenerateSchemePayload,
  SchemeEntry,
  SchemeEntryUpdatePayload,
  SchemeExportResponse,
  SchemeListQueryParams,
  SchemeListResponse,
  SchemeOfWork,
  SchemeSubjectStrandOption,
  SchemeUpdatePayload,
  SchemeWeek,
  SchemeWeekUpdatePayload,
} from '@/app/core/types/schemes';

export const SCHEMES_BASE_PATH = '/schemes';

async function downloadSchemeFile(
  id: number,
  endpoint: string,
  fallbackFileName: string,
): Promise<SchemeExportResponse> {
  try {
    const response = await apiClient.get<Blob>(`${SCHEMES_BASE_PATH}/${id}/${endpoint}`, {
      responseType: 'blob',
    });
    const fileName = getDownloadFileName(response.headers['content-disposition'], fallbackFileName);

    return {
      blob: response.data,
      fileName,
    };
  } catch (error) {
    return await normalizeBlobError(error);
  }
}

export const schemesAPI = {
  listSchemes: async (params?: SchemeListQueryParams): Promise<SchemeListResponse> => {
    const response = await apiClient.get<SchemeListResponse>(`${SCHEMES_BASE_PATH}/`, {
      params,
    });
    return response.data;
  },

  generateScheme: async (payload: GenerateSchemePayload): Promise<SchemeOfWork> => {
    const response = await apiClient.post<SchemeOfWork>(`${SCHEMES_BASE_PATH}/generate/`, payload);
    return response.data;
  },

  getScheme: async (id: number): Promise<SchemeOfWork> => {
    const response = await apiClient.get<SchemeOfWork>(`${SCHEMES_BASE_PATH}/${id}/`);
    return response.data;
  },

  getSchemeWeeks: async (id: number): Promise<SchemeWeek[]> => {
    const response = await apiClient.get<SchemeWeek[]>(`${SCHEMES_BASE_PATH}/${id}/weeks/`);
    return response.data;
  },

  updateScheme: async (id: number, payload: SchemeUpdatePayload): Promise<SchemeOfWork> => {
    const response = await apiClient.patch<SchemeOfWork>(`${SCHEMES_BASE_PATH}/${id}/`, payload);
    return response.data;
  },

  updateWeek: async (id: number, payload: SchemeWeekUpdatePayload): Promise<SchemeWeek> => {
    const response = await apiClient.patch<SchemeWeek>(
      `${SCHEMES_BASE_PATH}/weeks/${id}/`,
      payload,
    );
    return response.data;
  },

  updateEntry: async (id: number, payload: SchemeEntryUpdatePayload): Promise<SchemeEntry> => {
    const response = await apiClient.patch<SchemeEntry>(
      `${SCHEMES_BASE_PATH}/entries/${id}/`,
      payload,
    );
    return response.data;
  },

  downloadSchemeDocx: async (id: number): Promise<SchemeExportResponse> => {
    return downloadSchemeFile(id, 'export-docx/', `scheme-of-work-${id}.docx`);
  },

  downloadSchemeCsv: async (id: number): Promise<SchemeExportResponse> => {
    return downloadSchemeFile(id, 'export/', `scheme-of-work-${id}.csv`);
  },

  downloadScheme: async (id: number): Promise<SchemeExportResponse> => {
    return schemesAPI.downloadSchemeDocx(id);
  },

  triggerSchemeDocxDownload: async (id: number): Promise<void> => {
    const file = await schemesAPI.downloadSchemeDocx(id);
    downloadBlob(file.blob, file.fileName);
  },

  triggerSchemeCsvDownload: async (id: number): Promise<void> => {
    const file = await schemesAPI.downloadSchemeCsv(id);
    downloadBlob(file.blob, file.fileName);
  },

  triggerSchemeDownload: async (id: number): Promise<void> => {
    await schemesAPI.triggerSchemeDocxDownload(id);
  },

  getSubjectStrands: async (cohortSubjectId: number): Promise<SchemeSubjectStrandOption[]> => {
    const response = await apiClient.get<SchemeSubjectStrandOption[]>(
      `${SCHEMES_BASE_PATH}/subject-strands/`,
      {
        params: { cohort_subject_id: cohortSubjectId },
      },
    );
    return response.data;
  },
};
