// ============================================================================
// app/hooks/useProfile.ts
// Wraps the /api/users/profile/ and /api/requests/ endpoints
// for the profile page — follows the same pattern as useOrganizations.ts
// ============================================================================

import { useState, useEffect } from 'react';
import { apiClient } from '@/app/core/api/client';
import { requestsAPI } from '@/app/plugins/requests/api/requests';
import { Request, RequestType, RequestCreatePayload } from '@/app/plugins/requests/types/requests';

// The full profile shape returned by GET /api/users/profile/
export interface UserProfile {
    id: number;
    email: string;
    first_name: string;
    last_name: string;
    full_name: string;
    phone: string;
    role: 'SUPERADMIN' | 'ADMIN' | 'INSTRUCTOR';
    role_display: string;
    organization: number | null;
    organization_name: string | null;
    organization_code: string | null;
    is_active: boolean;
    date_joined: string;
    last_login: string | null;
}

export interface ProfileUpdatePayload {
    first_name?: string;
    last_name?: string;
    phone?: string;
}

export interface ChangePasswordPayload {
    old_password: string;
    new_password: string;
    new_password2: string;
}

// ---------------------------------------------------------------------------
// useProfile — load + update the current user's own profile
// ---------------------------------------------------------------------------
export const useProfile = () => {
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchProfile = async () => {
        try {
            setLoading(true);
            const response = await apiClient.get<UserProfile>('/users/profile/');
            setProfile(response.data);
            setError(null);
        } catch (err: any) {
            setError(err.message || 'Failed to load profile');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProfile();
    }, []);

    const updateProfile = async (data: ProfileUpdatePayload): Promise<void> => {
        try {
            const response = await apiClient.patch<UserProfile>('/users/profile/', data);
            setProfile(response.data);
        } catch (err: any) {
            const errorData = err.response?.data;
            let errorMessage = 'Failed to update profile';
            
            if (errorData?.detail) {
                errorMessage = errorData.detail;
            } else if (errorData?.message) {
                errorMessage = errorData.message;
            } else if (errorData && typeof errorData === 'object') {
                const firstValue = Object.values(errorData)[0];
                if (Array.isArray(firstValue) && firstValue.length > 0) {
                    errorMessage = firstValue[0] as string;
                }
            }
            
            throw new Error(errorMessage);
        }
    };

    const changePassword = async (data: ChangePasswordPayload): Promise<void> => {
        try {
            await apiClient.post('/users/change_password/', data);
        } catch (err: any) {
            throw new Error(
                err.response?.data?.detail ||
                err.response?.data?.old_password?.[0] ||
                err.response?.data?.new_password?.[0] ||
                'Failed to change password'
            );
        }
    };

    return {
        profile,
        loading,
        error,
        refetch: fetchProfile,
        updateProfile,
        changePassword,
    };
};

// ---------------------------------------------------------------------------
// useMyRequests — load the current user's own submitted requests
// Used on the profile page to show request history
// ---------------------------------------------------------------------------
export const useMyRequests = () => {
    const [requests, setRequests] = useState<Request[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchRequests = async () => {
        try {
            setLoading(true);
            // The backend already scopes to the current user for INSTRUCTOR role
            const data = await requestsAPI.getAll();
            setRequests(data);
            setError(null);
        } catch (err: any) {
            setError(err.message || 'Failed to load requests');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRequests();
    }, []);

    const submitDeletionRequest = async (
        type: Extract<RequestType, 'ACCOUNT_DELETION' | 'ORG_DELETION'>,
        reason: string
    ): Promise<Request> => {
        const titles: Record<string, string> = {
            ACCOUNT_DELETION: 'Account Deletion Request',
            ORG_DELETION: 'Organization Deletion Request',
        };
        try {
            const newRequest = await requestsAPI.create({
                title: titles[type],
                description: reason,
                request_type: type,
                priority: 'NORMAL' as const,
            });
            setRequests(prev => [newRequest, ...prev]);
            return newRequest;
        } catch (err: any) {
            throw new Error(
                err.response?.data?.request_type?.[0] ||
                err.response?.data?.non_field_errors?.[0] ||
                err.response?.data?.detail ||
                'Failed to submit deletion request'
            );
        }
    };

    // Check if there is already a pending deletion request of a given type
    const hasPendingDeletion = (
        type: Extract<RequestType, 'ACCOUNT_DELETION' | 'ORG_DELETION'>
    ): boolean =>
        Array.isArray(requests) &&
        requests.some(
            r =>
                r.request_type === type &&
                ['PENDING', 'IN_REVIEW'].includes(r.status)
        );

    return {
        requests,
        loading,
        error,
        refetch: fetchRequests,
        submitDeletionRequest,
        hasPendingDeletion,
    };
};