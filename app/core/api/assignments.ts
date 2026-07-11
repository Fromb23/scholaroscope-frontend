import { apiClient } from '@/app/core/api/client';
import { withClientMutationId } from '@/app/core/lib/clientMutationId';
import { withOperationalScope } from '@/app/core/lib/academicScope';
import type {
    Assignment,
    AssignmentCreatePayload,
    AssignmentAutoGenerateGroupsPayload,
    AssignmentAutoGenerateGroupsResponse,
    AssignmentEligibleLearnersParams,
    AssignmentEligibleLearnersResponse,
    AssignmentEvidenceBridgePayload,
    AssignmentEvidenceBridgeResponse,
    AssignmentEvaluation,
    AssignmentEvaluationCreatePayload,
    AssignmentEvaluationFilters,
    AssignmentEvaluationListResponse,
    AssignmentEvaluationUpdatePayload,
    AssignmentFilters,
    AssignmentListResponse,
    AssignmentOutcome,
    AssignmentOutcomeCreatePayload,
    AssignmentPublishPayload,
    AssignmentPublishResponse,
    AssignmentGroup,
    AssignmentGroupCopyFromPayload,
    AssignmentGroupCopyFromResponse,
    AssignmentGroupCreatePayload,
    AssignmentGroupCreateResponse,
    AssignmentGroupBulkMemberCreatePayload,
    AssignmentGroupBulkMemberCreateResponse,
    AssignmentGroupEvidenceBridgePayload,
    AssignmentGroupEvidenceBridgeResponse,
    AssignmentGroupEvaluation,
    AssignmentGroupEvaluationCreatePayload,
    AssignmentGroupEvaluationFilters,
    AssignmentGroupEvaluationListResponse,
    AssignmentGroupEvaluationUpdatePayload,
    AssignmentGroupListResponse,
    AssignmentGroupMember,
    AssignmentGroupReuseSourceListResponse,
    AssignmentGroupMemberCreatePayload,
    AssignmentGroupMemberMovePayload,
    AssignmentGroupMemberParticipationPayload,
    AssignmentGroupSubmission,
    AssignmentGroupSubmissionCreatePayload,
    AssignmentGroupSubmissionListResponse,
    AssignmentGroupUpdatePayload,
    AssignmentLifecycleState,
    AssignmentRecipient,
    AssignmentRecipientCreatePayload,
    AssignmentRecipientListResponse,
    AssignmentRecipientSelectionPayload,
    AssignmentSubmission,
    AssignmentSubmissionCreatePayload,
    AssignmentSubmissionListResponse,
    AssignmentTeachingTodayResponse,
    AssignmentUpdatePayload,
} from '@/app/core/types/assignments';
import type { AcademicPolicyBrief } from '@/app/core/types/policyGuidance';

const ASSIGNMENTS_BASE = '/assignments';
const ASSIGNMENT_OUTCOMES_BASE = '/assignment-outcomes';
const ASSIGNMENT_RECIPIENTS_BASE = '/assignment-recipients';
const ASSIGNMENT_SUBMISSIONS_BASE = '/assignment-submissions';
const ASSIGNMENT_EVALUATIONS_BASE = '/assignment-evaluations';
const ASSIGNMENT_GROUPS_BASE = '/assignment-groups';
const ASSIGNMENT_GROUP_EVALUATIONS_BASE = '/assignment-group-evaluations';

export const assignmentsAPI = {
    list: async (params?: AssignmentFilters): Promise<AssignmentListResponse> => {
        const response = await apiClient.get<AssignmentListResponse>(
            `${ASSIGNMENTS_BASE}/`,
            { params: withOperationalScope(params) }
        );
        return response.data;
    },

    getById: async (id: number): Promise<Assignment> => {
        const response = await apiClient.get<Assignment>(`${ASSIGNMENTS_BASE}/${id}/`);
        return response.data;
    },

    getLifecycleState: async (id: number): Promise<AssignmentLifecycleState> => {
        const response = await apiClient.get<AssignmentLifecycleState>(
            `${ASSIGNMENTS_BASE}/${id}/lifecycle-state/`
        );
        return response.data;
    },

    getTeachingToday: async (): Promise<AssignmentTeachingTodayResponse> => {
        const response = await apiClient.get<AssignmentTeachingTodayResponse>(
            `${ASSIGNMENTS_BASE}/teaching-today/`
        );
        return response.data;
    },

    getPolicyGuidance: async (params: {
        term: number;
        cohort_subject: number;
        task_type?: string;
        report_counting?: boolean;
    }): Promise<AcademicPolicyBrief> => {
        const response = await apiClient.get<AcademicPolicyBrief>(`${ASSIGNMENTS_BASE}/policy-guidance/`, {
            params,
        });
        return response.data;
    },

    getEligibleLearners: async (
        id: number,
        params?: AssignmentEligibleLearnersParams
    ): Promise<AssignmentEligibleLearnersResponse> => {
        const response = await apiClient.get<AssignmentEligibleLearnersResponse>(
            `${ASSIGNMENTS_BASE}/${id}/eligible-learners/`,
            { params }
        );
        return response.data;
    },

    create: async (data: AssignmentCreatePayload): Promise<Assignment> => {
        const response = await apiClient.post<Assignment>(
            `${ASSIGNMENTS_BASE}/`,
            withClientMutationId(data, 'assignment-create')
        );
        return response.data;
    },

    update: async (id: number, data: AssignmentUpdatePayload): Promise<Assignment> => {
        const response = await apiClient.patch<Assignment>(`${ASSIGNMENTS_BASE}/${id}/`, data);
        return response.data;
    },

    delete: async (id: number): Promise<void> => {
        await apiClient.delete(`${ASSIGNMENTS_BASE}/${id}/`);
    },

    publish: async (id: number, data?: AssignmentPublishPayload): Promise<AssignmentPublishResponse> => {
        const response = await apiClient.post<AssignmentPublishResponse>(
            `${ASSIGNMENTS_BASE}/${id}/publish/`,
            withClientMutationId(data ?? {}, 'assignment-publish')
        );
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

    reopenLearnerWork: async (id: number): Promise<Assignment> => {
        const response = await apiClient.post<Assignment>(
            `${ASSIGNMENTS_BASE}/${id}/reopen-learner-work/`
        );
        return response.data;
    },

    restoreToReview: async (id: number): Promise<Assignment> => {
        const response = await apiClient.post<Assignment>(
            `${ASSIGNMENTS_BASE}/${id}/restore-to-review/`
        );
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

    listAssignmentGroups: async (assignmentId: number): Promise<AssignmentGroupListResponse> => {
        const response = await apiClient.get<AssignmentGroupListResponse>(
            `${ASSIGNMENTS_BASE}/${assignmentId}/groups/`
        );
        return response.data;
    },

    createAssignmentGroup: async (
        assignmentId: number,
        data: AssignmentGroupCreatePayload
    ): Promise<AssignmentGroupCreateResponse> => {
        const response = await apiClient.post<AssignmentGroupCreateResponse>(
            `${ASSIGNMENTS_BASE}/${assignmentId}/groups/`,
            data
        );
        return response.data;
    },

    autoGenerateGroups: async (
        assignmentId: number,
        data: AssignmentAutoGenerateGroupsPayload
    ): Promise<AssignmentAutoGenerateGroupsResponse> => {
        const response = await apiClient.post<AssignmentAutoGenerateGroupsResponse>(
            `${ASSIGNMENTS_BASE}/${assignmentId}/groups/auto-generate/`,
            data
        );
        return response.data;
    },

    listGroupReuseSources: async (assignmentId: number): Promise<AssignmentGroupReuseSourceListResponse> => {
        const response = await apiClient.get<AssignmentGroupReuseSourceListResponse>(
            `${ASSIGNMENTS_BASE}/${assignmentId}/groups/reuse-sources/`
        );
        return response.data;
    },

    copyGroupsFromSource: async (
        assignmentId: number,
        data: AssignmentGroupCopyFromPayload
    ): Promise<AssignmentGroupCopyFromResponse> => {
        const response = await apiClient.post<AssignmentGroupCopyFromResponse>(
            `${ASSIGNMENTS_BASE}/${assignmentId}/groups/copy-from/`,
            data
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
        const response = await apiClient.post<AssignmentSubmission>(
            `${ASSIGNMENT_SUBMISSIONS_BASE}/`,
            withClientMutationId(data, 'assignment-submission')
        );
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
        const response = await apiClient.post<AssignmentEvaluation>(
            `${ASSIGNMENT_EVALUATIONS_BASE}/`,
            withClientMutationId(data, 'assignment-evaluation')
        );
        return response.data;
    },

    update: async (id: number, data: AssignmentEvaluationUpdatePayload): Promise<AssignmentEvaluation> => {
        const response = await apiClient.patch<AssignmentEvaluation>(
            `${ASSIGNMENT_EVALUATIONS_BASE}/${id}/`,
            data
        );
        return response.data;
    },

    bridgeToEvidence: async (
        id: number,
        data?: AssignmentEvidenceBridgePayload
    ): Promise<AssignmentEvidenceBridgeResponse> => {
        const response = await apiClient.post<AssignmentEvidenceBridgeResponse>(
            `${ASSIGNMENT_EVALUATIONS_BASE}/${id}/bridge-to-evidence/`,
            withClientMutationId(data ?? {}, 'assignment-evidence')
        );
        return response.data;
    },
};

export const assignmentGroupAPI = {
    getById: async (id: number): Promise<AssignmentGroup> => {
        const response = await apiClient.get<AssignmentGroup>(`${ASSIGNMENT_GROUPS_BASE}/${id}/`);
        return response.data;
    },

    update: async (id: number, data: AssignmentGroupUpdatePayload): Promise<AssignmentGroup> => {
        const response = await apiClient.patch<AssignmentGroup>(`${ASSIGNMENT_GROUPS_BASE}/${id}/`, data);
        return response.data;
    },

    delete: async (id: number): Promise<void> => {
        await apiClient.delete(`${ASSIGNMENT_GROUPS_BASE}/${id}/`);
    },

    addMember: async (groupId: number, data: AssignmentGroupMemberCreatePayload): Promise<AssignmentGroup> => {
        const response = await apiClient.post<AssignmentGroup>(
            `${ASSIGNMENT_GROUPS_BASE}/${groupId}/members/`,
            data
        );
        return response.data;
    },

    bulkAddMembers: async (
        groupId: number,
        data: AssignmentGroupBulkMemberCreatePayload
    ): Promise<AssignmentGroupBulkMemberCreateResponse> => {
        const response = await apiClient.post<AssignmentGroupBulkMemberCreateResponse>(
            `${ASSIGNMENT_GROUPS_BASE}/${groupId}/members/bulk/`,
            data
        );
        return response.data;
    },

    removeMember: async (groupId: number, studentId: number): Promise<void> => {
        await apiClient.delete(`${ASSIGNMENT_GROUPS_BASE}/${groupId}/members/${studentId}/`);
    },

    updateMemberParticipation: async (
        groupId: number,
        memberId: number,
        data: AssignmentGroupMemberParticipationPayload
    ): Promise<AssignmentGroupMember> => {
        const response = await apiClient.patch<AssignmentGroupMember>(
            `${ASSIGNMENT_GROUPS_BASE}/${groupId}/members/${memberId}/participation/`,
            data
        );
        return response.data;
    },

    moveMember: async (
        groupId: number,
        memberId: number,
        data: AssignmentGroupMemberMovePayload
    ): Promise<AssignmentGroupMember> => {
        const response = await apiClient.post<AssignmentGroupMember>(
            `${ASSIGNMENT_GROUPS_BASE}/${groupId}/members/${memberId}/move/`,
            data
        );
        return response.data;
    },

    listSubmissions: async (groupId: number): Promise<AssignmentGroupSubmissionListResponse> => {
        const response = await apiClient.get<AssignmentGroupSubmissionListResponse>(
            `${ASSIGNMENT_GROUPS_BASE}/${groupId}/submissions/`
        );
        return response.data;
    },

    createSubmission: async (
        groupId: number,
        data: AssignmentGroupSubmissionCreatePayload
    ): Promise<AssignmentGroupSubmission> => {
        const response = await apiClient.post<AssignmentGroupSubmission>(
            `${ASSIGNMENT_GROUPS_BASE}/${groupId}/submissions/`,
            withClientMutationId(data, 'assignment-group-submission')
        );
        return response.data;
    },
};

export const assignmentGroupEvaluationAPI = {
    list: async (
        params?: AssignmentGroupEvaluationFilters
    ): Promise<AssignmentGroupEvaluationListResponse> => {
        const response = await apiClient.get<AssignmentGroupEvaluationListResponse>(
            `${ASSIGNMENT_GROUP_EVALUATIONS_BASE}/`,
            { params }
        );
        return response.data;
    },

    getById: async (id: number): Promise<AssignmentGroupEvaluation> => {
        const response = await apiClient.get<AssignmentGroupEvaluation>(
            `${ASSIGNMENT_GROUP_EVALUATIONS_BASE}/${id}/`
        );
        return response.data;
    },

    create: async (
        data: AssignmentGroupEvaluationCreatePayload
    ): Promise<AssignmentGroupEvaluation> => {
        const response = await apiClient.post<AssignmentGroupEvaluation>(
            `${ASSIGNMENT_GROUP_EVALUATIONS_BASE}/`,
            withClientMutationId(data, 'assignment-group-evaluation')
        );
        return response.data;
    },

    update: async (
        id: number,
        data: AssignmentGroupEvaluationUpdatePayload
    ): Promise<AssignmentGroupEvaluation> => {
        const response = await apiClient.patch<AssignmentGroupEvaluation>(
            `${ASSIGNMENT_GROUP_EVALUATIONS_BASE}/${id}/`,
            data
        );
        return response.data;
    },

    bridgeToEvidence: async (
        id: number,
        data?: AssignmentGroupEvidenceBridgePayload
    ): Promise<AssignmentGroupEvidenceBridgeResponse> => {
        const response = await apiClient.post<AssignmentGroupEvidenceBridgeResponse>(
            `${ASSIGNMENT_GROUP_EVALUATIONS_BASE}/${id}/bridge-to-evidence/`,
            withClientMutationId(data ?? {}, 'assignment-group-evidence')
        );
        return response.data;
    },
};
