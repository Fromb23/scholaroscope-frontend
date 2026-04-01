// ============================================================================
// app/hooks/useOrganizations.ts
// ============================================================================

import { useState, useEffect } from 'react';
import { organizationAPI } from '@/app/core/api/organizations';
import {
    Organization,
    OrganizationCreatePayload,
    OrganizationUpdatePayload,
    OrganizationStats,
    OrgUser,
    SuspensionReason,
} from '@/app/core/types/organization';
import { ApiError, extractErrorMessage } from '@/app/core/types/errors';

// ---------------------------------------------------------------------------
// useOrganizations
// ---------------------------------------------------------------------------
export const useOrganizations = () => {
    const [organizations, setOrganizations] = useState<Organization[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchOrganizations = async () => {
        try {
            setLoading(true);
            const data = await organizationAPI.getAll();
            setOrganizations(Array.isArray(data) ? data : (data as { results?: Organization[] }).results ?? []);
            setError(null);
        } catch (err) {
            setError(extractErrorMessage(err as ApiError, 'Failed to fetch organizations'));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchOrganizations(); }, []);

    const createOrganization = async (data: OrganizationCreatePayload) => {
        try {
            const newOrg = await organizationAPI.create(data);
            setOrganizations(prev => [newOrg, ...prev]);
            return newOrg;
        } catch (err) {
            throw new Error(extractErrorMessage(err as ApiError, 'Failed to create organization'));
        }
    };

    const updateOrganization = async (id: number, data: OrganizationUpdatePayload) => {
        try {
            const updated = await organizationAPI.update(id, data);
            setOrganizations(prev => prev.map(o => (o.id === id ? updated : o)));
            return updated;
        } catch (err) {
            throw new Error(extractErrorMessage(err as ApiError, 'Failed to update organization'));
        }
    };

    const deleteOrganization = async (id: number) => {
        try {
            await organizationAPI.delete(id);
            setOrganizations(prev => prev.filter(o => o.id !== id));
        } catch (err) {
            throw new Error(extractErrorMessage(err as ApiError, 'Failed to delete organization'));
        }
    };

    const suspendOrganization = async (id: number, reason: SuspensionReason) => {
        try {
            await organizationAPI.suspend(id, reason);
            setOrganizations(prev => prev.map(o =>
                o.id === id ? { ...o, status: 'SUSPENDED' as const, suspension_reason: reason } : o
            ));
        } catch (err) {
            throw new Error(extractErrorMessage(err as ApiError, 'Failed to suspend organization'));
        }
    };

    const unsuspendOrganization = async (id: number) => {
        try {
            await organizationAPI.unsuspend(id);
            setOrganizations(prev => prev.map(o =>
                o.id === id ? { ...o, status: 'ACTIVE' as const, suspension_reason: undefined } : o
            ));
        } catch (err) {
            throw new Error(extractErrorMessage(err as ApiError, 'Failed to unsuspend organization'));
        }
    };

    return {
        organizations, loading, error, refetch: fetchOrganizations,
        createOrganization, updateOrganization, deleteOrganization,
        suspendOrganization, unsuspendOrganization,
    };
};

// ---------------------------------------------------------------------------
// useOrganizationDetail
// ---------------------------------------------------------------------------
export const useOrganizationDetail = (id: number | null) => {
    const [organization, setOrganization] = useState<Organization | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchOrganization = async () => {
        if (!id) { setLoading(false); return; }
        try {
            setLoading(true);
            const data = await organizationAPI.getById(id);
            setOrganization(data);
            setError(null);
        } catch (err) {
            setError(extractErrorMessage(err as ApiError, 'Failed to fetch organization'));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchOrganization(); }, [id]);

    return { organization, loading, error, refetch: fetchOrganization, setOrganization };
};

// ---------------------------------------------------------------------------
// useOrganizationStats
// ---------------------------------------------------------------------------
export const useOrganizationStats = (id: number | null) => {
    const [stats, setStats] = useState<OrganizationStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!id) { setLoading(false); return; }
        const fetch = async () => {
            try {
                setLoading(true);
                const data = await organizationAPI.getStatistics(id);
                setStats(data);
                setError(null);
            } catch (err) {
                setError(extractErrorMessage(err as ApiError, 'Failed to fetch statistics'));
            } finally {
                setLoading(false);
            }
        };
        fetch();
    }, [id]);

    return { stats, loading, error };
};

// ---------------------------------------------------------------------------
// useOrganizationUsers
// ---------------------------------------------------------------------------
export const useOrganizationUsers = (id: number | null) => {
    const [users, setUsers] = useState<OrgUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchUsers = async () => {
        if (!id) { setLoading(false); return; }
        try {
            setLoading(true);
            const data = await organizationAPI.getUsers(id);
            setUsers(Array.isArray(data) ? data : (data as { results?: OrgUser[] }).results ?? []);
            setError(null);
        } catch (err) {
            setError(extractErrorMessage(err as ApiError, 'Failed to fetch users'));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchUsers(); }, [id]);

    return { users, loading, error, refetch: fetchUsers };
};