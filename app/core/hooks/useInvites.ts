// ============================================================================
// app/core/hooks/useInvites.ts
//
// Invite management hook — create, list, revoke, validate invites.
// Used by: AdminSettingsPage (manage), RegisterPage (validate on open)
// ============================================================================

import { useState, useCallback } from 'react';
import { apiClient } from '@/app/core/api/client';
import { extractErrorMessage, type ApiError } from '@/app/core/types/errors';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://127.0.0.1:8000/api';

// ── Types ─────────────────────────────────────────────────────────────────────

export type InviteStatus = 'PENDING' | 'ACCEPTED' | 'REVOKED' | 'EXPIRED';

export interface Invite {
    token: string;
    email: string;
    role: 'ADMIN' | 'INSTRUCTOR';
    status: InviteStatus;
    is_valid: boolean;
    link: string;
    created_by: string | null;
    accepted_by: string | null;
    expires_at: string;
    created_at: string;
    used_at: string | null;
}

export interface CreateInvitePayload {
    email?: string;
    role: 'ADMIN' | 'INSTRUCTOR';
    expires_days?: number;
    frontend_url?: string;
}

export interface ValidatedInvite {
    organization: string;
    organization_id: number;
    role: 'ADMIN' | 'INSTRUCTOR';
    email: string;
    expires_at: string;
    user_exists: boolean;
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useInvites() {
    const [invites, setInvites] = useState<Invite[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchInvites = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await apiClient.get<Invite[]>(
                `/users/invites/?frontend_url=${encodeURIComponent(window.location.origin)}`
            );
            setInvites(response.data);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Failed to load invites');
        } finally {
            setLoading(false);
        }
    }, []);

    const createInvite = useCallback(async (payload: CreateInvitePayload): Promise<Invite> => {
        try {
            const response = await apiClient.post<Invite>('/users/create_invite/', {
                ...payload,
                frontend_url: payload.frontend_url ?? window.location.origin,
            });
            const invite = response.data;
            await fetchInvites();
            return invite;
        } catch (error) {
            const data = (error as { response?: { data?: object } }).response?.data ?? {};
            throw Object.assign(
                new Error(extractErrorMessage(error as ApiError, 'Failed to create invite')),
                { data },
            );
        }
    }, [fetchInvites]);

    const revokeInvite = useCallback(async (token: string): Promise<void> => {
        await apiClient.post('/users/revoke_invite/', { token });
        await fetchInvites();
    }, [fetchInvites]);

    return { invites, loading, error, fetchInvites, createInvite, revokeInvite };
}

// ── Standalone validate (no auth, used on register page) ─────────────────────

export async function validateInviteToken(token: string): Promise<ValidatedInvite> {
    const res = await fetch(
        `${API_URL}/users/validate_invite/?token=${encodeURIComponent(token)}`
    );
    if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw Object.assign(
            new Error(data.detail ?? 'Invalid invite'),
            { status: res.status, data }
        );
    }
    return res.json();
}
