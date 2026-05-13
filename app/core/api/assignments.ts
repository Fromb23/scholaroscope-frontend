import { apiClient } from '@/app/core/api/client';
import type {
    Assignment,
    AssignmentCreatePayload,
    AssignmentEvaluation,
    AssignmentEvaluationCreatePayload,
    AssignmentEvaluationFilters,
    AssignmentEvaluationListResponse,
    AssignmentEvaluationUpdatePayload,
    AssignmentFilters,
    AssignmentListResponse,
    AssignmentOutcome,
    AssignmentOutcomeCreatePayload,
    AssignmentRecipient,
    AssignmentRecipientCreatePayload,
    AssignmentRecipientListResponse,
    AssignmentRecipientSelectionPayload,
    AssignmentSubmission,
    AssignmentSubmissionCreatePayload,
    AssignmentSubmissionListResponse,
    AssignmentUpdatePayload,
} from '@/app/core/types/assignments';

const ASSIGNMENTS_BASE = '/assignments';
const ASSIGNMENT_OUTCOMES_BASE = '/assignment-outcomes';
const ASSIGNMENT_RECIPIENTS_BASE = '/assignment-recipients';
const ASSIGNMENT_SUBMISSIONS_BASE = '/assignment-submissions';
const ASSIGNMENT_EVALUATIONS_BASE = '/assignment-evaluations';

export const assignmentsAPI = {
    list: async (params?: AssignmentFilters): Promise<AssignmentListResponse> => {
        const response = await apiClient.get<AssignmentListResponse>(`${ASSIGNMENTS_BASE}/`, { params });
        return response.data;
    },

    getById: async (id: number): Promise<Assignment> => {
        const response = await apiClient.get<Assignment>(`${ASSIGNMENTS_BASE}/${id}/`);
        return response.data;
    },

    create: async (data: AssignmentCreatePayload): Promise<Assignment> => {
        const response = await apiClient.post<Assignment>(`${ASSIGNMENTS_BASE}/`, data);
        return response.data;
    },

    update: async (id: number, data: AssignmentUpdatePayload): Promise<Assignment> => {
        const response = await apiClient.patch<Assignment>(`${ASSIGNMENTS_BASE}/${id}/`, data);
        return response.data;
    },

    delete: async (id: number): Promise<void> => {
        await apiClient.delete(`${ASSIGNMENTS_BASE}/${id}/`);
    },

    publish: async (id: number): Promise<Assignment> => {
        const response = await apiClient.post<Assignment>(`${ASSIGNMENTS_BASE}/${id}/publish/`);
        return response.data;
    },

    close: async (id: number): Promise<Assignment> => {
        const response = await apiClient.post<Assignment>(`${ASSIGNMENTS_BASE}/${id}/close/`);
        return response.data;
    },

    archive: async (id: number): Promise<Assignment> => {
        const response = await apiClient.post<Assignment>(`${ASSIGNMENTS_BASE}/${id}/archive/`);
        return response.data;
    },

    reopen: async (id: number): Promise<Assignment> => {
        const response = await apiClient.post<Assignment>(`${ASSIGNMENTS_BASE}/${id}/reopen/`);
        return response.data;
    },

    listRecipients: async (id: number): Promise<AssignmentRecipientListResponse> => {
        const response = await apiClient.get<AssignmentRecipientListResponse>(
            `${ASSIGNMENTS_BASE}/${id}/recipients/`
        );
        return response.data;
    },

    createRecipients: async (
        id: number,
        data: AssignmentRecipientSelectionPayload
    ): Promise<AssignmentRecipient[] | Record<string, unknown>> => {
        const response = await apiClient.post<AssignmentRecipient[] | Record<string, unknown>>(
            `${ASSIGNMENTS_BASE}/${id}/recipients/`,
            data
        );
        return response.data;
    },

    listSubmissions: async (id: number): Promise<AssignmentSubmissionListResponse> => {
        const response = await apiClient.get<AssignmentSubmissionListResponse>(
            `${ASSIGNMENTS_BASE}/${id}/submissions/`
        );
        return response.data;
    },

    listEvaluations: async (id: number): Promise<AssignmentEvaluationListResponse> => {
        const response = await apiClient.get<AssignmentEvaluationListResponse>(
            `${ASSIGNMENTS_BASE}/${id}/evaluations/`
        );
        return response.data;
    },
};

export const assignmentOutcomeAPI = {
    list: async (params?: { assignment?: number }): Promise<AssignmentOutcome[]> => {
        const response = await apiClient.get<AssignmentOutcome[]>(`${ASSIGNMENT_OUTCOMES_BASE}/`, {
            params,
        });
        return response.data;
    },

    create: async (data: AssignmentOutcomeCreatePayload & { assignment: number }): Promise<AssignmentOutcome> => {
        const response = await apiClient.post<AssignmentOutcome>(`${ASSIGNMENT_OUTCOMES_BASE}/`, data);
        return response.data;
    },
};

export const assignmentRecipientAPI = {
    list: async (params?: { assignment?: number; student?: number }): Promise<AssignmentRecipientListResponse> => {
        const response = await apiClient.get<AssignmentRecipientListResponse>(
            `${ASSIGNMENT_RECIPIENTS_BASE}/`,
            { params }
        );
        return response.data;
    },

    create: async (data: AssignmentRecipientCreatePayload): Promise<AssignmentRecipient> => {
        const response = await apiClient.post<AssignmentRecipient>(`${ASSIGNMENT_RECIPIENTS_BASE}/`, data);
        return response.data;
    },
};

export const assignmentSubmissionAPI = {
    list: async (params?: {
        assignment?: number;
        student?: number;
    }): Promise<AssignmentSubmissionListResponse> => {
        const response = await apiClient.get<AssignmentSubmissionListResponse>(
            `${ASSIGNMENT_SUBMISSIONS_BASE}/`,
            { params }
        );
        return response.data;
    },

    create: async (data: AssignmentSubmissionCreatePayload): Promise<AssignmentSubmission> => {
        const response = await apiClient.post<AssignmentSubmission>(`${ASSIGNMENT_SUBMISSIONS_BASE}/`, data);
        return response.data;
    },
};

export const assignmentEvaluationAPI = {
    list: async (params?: AssignmentEvaluationFilters): Promise<AssignmentEvaluationListResponse> => {
        const response = await apiClient.get<AssignmentEvaluationListResponse>(
            `${ASSIGNMENT_EVALUATIONS_BASE}/`,
            { params }
        );
        return response.data;
    },

    getById: async (id: number): Promise<AssignmentEvaluation> => {
        const response = await apiClient.get<AssignmentEvaluation>(`${ASSIGNMENT_EVALUATIONS_BASE}/${id}/`);
        return response.data;
    },

    create: async (data: AssignmentEvaluationCreatePayload): Promise<AssignmentEvaluation> => {
        const response = await apiClient.post<AssignmentEvaluation>(`${ASSIGNMENT_EVALUATIONS_BASE}/`, data);
        return response.data;
    },

    update: async (id: number, data: AssignmentEvaluationUpdatePayload): Promise<AssignmentEvaluation> => {
        const response = await apiClient.patch<AssignmentEvaluation>(
            `${ASSIGNMENT_EVALUATIONS_BASE}/${id}/`,
            data
        );
        return response.data;
    },

    bridgeToEvidence: async (id: number): Promise<AssignmentEvaluation> => {
        const response = await apiClient.post<AssignmentEvaluation>(
            `${ASSIGNMENT_EVALUATIONS_BASE}/${id}/bridge-to-evidence/`
        );
        return response.data;
    },
};
