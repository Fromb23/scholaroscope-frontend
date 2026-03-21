// ============================================================================
// app/hooks/useOrganizations.ts
// Mirrors the exact pattern of useAcademicYears / useCurricula hooks
// ============================================================================

import { useState, useEffect } from 'react';
import { organizationAPI } from '@/app/core/api/organizations';
import {
    Organization,
    OrganizationCreatePayload,
    OrganizationUpdatePayload,
    OrganizationStats,
    OrgUser,
} from '@/app/core/types/organization';

// ---------------------------------------------------------------------------
// useOrganizations — list, create, update, delete, toggle active
// ---------------------------------------------------------------------------
export const useOrganizations = () => {
    const [organizations, setOrganizations] = useState<Organization[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchOrganizations = async () => {
        try {
            setLoading(true);
            const data = await organizationAPI.getAll();
            const orgsArray = Array.isArray(data) ? data : (data as any).results ?? [];
            setOrganizations(orgsArray);
            setError(null);
        } catch (err: any) {
            setError(err.message || 'Failed to fetch organizations');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOrganizations();
    }, []);

    const createOrganization = async (data: OrganizationCreatePayload) => {
        try {
            const newOrg = await organizationAPI.create(data);
            setOrganizations(prev => [newOrg, ...prev]);
            return newOrg;
        } catch (err: any) {
            throw new Error(
                err.response?.data?.name?.[0] ||
                err.response?.data?.message ||
                'Failed to create organization'
            );
        }
    };

    const updateOrganization = async (id: number, data: OrganizationUpdatePayload) => {
        try {
            const updated = await organizationAPI.update(id, data);
            setOrganizations(prev => prev.map(o => (o.id === id ? updated : o)));
            return updated;
        } catch (err: any) {
            throw new Error(
                err.response?.data?.name?.[0] ||
                err.response?.data?.message ||
                'Failed to update organization'
            );
        }
    };

    const deleteOrganization = async (id: number) => {
        try {
            await organizationAPI.delete(id);
            setOrganizations(prev => prev.filter(o => o.id !== id));
        } catch (err: any) {
            throw new Error(
                err.response?.data?.message || 'Failed to delete organization'
            );
        }
    };

    const toggleOrganizationActive = async (id: number, is_active: boolean) => {
        try {
            const updated = await organizationAPI.toggleActive(id, is_active);
            setOrganizations(prev => prev.map(o => (o.id === id ? updated : o)));
            return updated;
        } catch (err: any) {
            throw new Error(
                err.response?.data?.message || 'Failed to update organization status'
            );
        }
    };

    return {
        organizations,
        loading,
        error,
        refetch: fetchOrganizations,
        createOrganization,
        updateOrganization,
        deleteOrganization,
        toggleOrganizationActive,
    };
};

// ---------------------------------------------------------------------------
// useOrganizationDetail — single org by id
// ---------------------------------------------------------------------------
export const useOrganizationDetail = (id: number | null) => {
    const [organization, setOrganization] = useState<Organization | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchOrganization = async () => {
        if (!id) {
            setLoading(false);
            return;
        }
        try {
            setLoading(true);
            const data = await organizationAPI.getById(id);
            setOrganization(data);
            setError(null);
        } catch (err: any) {
            setError(err.message || 'Failed to fetch organization');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOrganization();
    }, [id]);

    return { organization, loading, error, refetch: fetchOrganization, setOrganization };
};

// ---------------------------------------------------------------------------
// useOrganizationStats — stats for a single org
// ---------------------------------------------------------------------------
export const useOrganizationStats = (id: number | null) => {
    const [stats, setStats] = useState<OrganizationStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!id) {
            setLoading(false);
            return;
        }
        const fetch = async () => {
            try {
                setLoading(true);
                const data = await organizationAPI.getStatistics(id);
                setStats(data);
                setError(null);
            } catch (err: any) {
                setError(err.message || 'Failed to fetch statistics');
            } finally {
                setLoading(false);
            }
        };
        fetch();
    }, [id]);

    return { stats, loading, error };
};

// ---------------------------------------------------------------------------
// useOrganizationUsers — users list for a single org
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
            const usersArray = Array.isArray(data) ? data : (data as { results: OrgUser[] }).results ?? [];
            setUsers(usersArray);
            setError(null);
        } catch (err: unknown) {
            const e = err as { message?: string };
            setError(e.message || 'Failed to fetch users');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, [id]);

    return { users, loading, error, refetch: fetchUsers };
};