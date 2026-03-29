// ============================================================================
// app/hooks/useInstructors.ts
// Mirrors exact pattern of useGlobalUsers / useOrganizations
// ============================================================================

import { useState, useEffect, useCallback } from 'react';
import { instructorsAPI, InstructorProfile } from '@/app/core/api/instructors';
import { GlobalUser, UserCreatePayload, InstructorStats, UserUpdatePayload } from '@/app/core/types/globalUsers';

// ── useInstructors: list + full CRUD + activate/deactivate + reset password ──

export const useInstructors = () => {
    const [instructors, setInstructors] = useState<GlobalUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchInstructors = async () => {
        try {
            setLoading(true);
            const data = await instructorsAPI.getAll();
            setInstructors(data);
            setError(null);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Failed to fetch instructors');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchInstructors(); }, []);

    const createInstructor = async (data: UserCreatePayload) => {
        try {
            const created = await instructorsAPI.create(data);
            setInstructors(prev => [created, ...prev]);
            return created;
        } catch (err: unknown) {
            interface APIErrorResponse {
                response?: {
                    data?: {
                        email?: string[];
                        password?: string[];
                        detail?: string;
                    };
                };
                message?: string;
            }
            const apiErr = err as APIErrorResponse;
            const message = err instanceof Error && 'response' in err
                ? apiErr.response?.data?.email?.[0] ||
                apiErr.response?.data?.password?.[0] ||
                apiErr.response?.data?.detail ||
                'Failed to create instructor'
                : err instanceof Error
                    ? err.message
                    : 'Failed to create instructor';
            throw new Error(message);
        }
    };

    const updateInstructor = async (id: number, data: UserUpdatePayload) => {
        try {
            const updated = await instructorsAPI.update(id, data);
            setInstructors(prev => prev.map(i => i.id === id ? updated : i));
            return updated;
        } catch (err: unknown) {
            interface APIErrorResponse {
                response?: {
                    data?: {
                        detail?: string;
                    };
                };
                message?: string;
            }
            const apiErr = err as APIErrorResponse;
            const message = err instanceof Error && 'response' in err
                ? apiErr.response?.data?.detail || 'Failed to update instructor'
                : err instanceof Error
                    ? err.message
                    : 'Failed to update instructor';
            throw new Error(message);
        }
    };

    const deleteInstructor = async (id: number) => {
        try {
            await instructorsAPI.remove(id);
            setInstructors(prev => prev.filter(i => i.id !== id));
        } catch (err: unknown) {
            interface APIErrorResponse {
                response?: {
                    data?: {
                        detail?: string;
                    };
                };
                message?: string;
            }
            const apiErr = err as APIErrorResponse;
            const message = err instanceof Error && 'response' in err
                ? apiErr.response?.data?.detail || 'Failed to delete instructor'
                : err instanceof Error
                    ? err.message
                    : 'Failed to delete instructor';
            throw new Error(message);
        }
    };

    const toggleActive = async (id: number, activate: boolean) => {
        try {
            const updated = activate
                ? await instructorsAPI.activate(id)
                : await instructorsAPI.deactivate(id);
            const resolved = (typeof updated === 'object' && updated !== null && 'user' in updated)
                ? {
                    ...(updated as { user: GlobalUser }).user,
                    is_active: (updated as { membership_status?: string }).membership_status === 'INACTIVE'
                        ? false
                        : (updated as { user: GlobalUser }).user.is_active,
                }
                : updated;
            setInstructors(prev => prev.map(i => i.id === id ? resolved : i));
            return resolved;
        } catch (err: unknown) {
            interface APIErrorResponse {
                response?: {
                    data?: {
                        detail?: string;
                    };
                };
                message?: string;
            }
            const apiErr = err as APIErrorResponse;
            const message = err instanceof Error && 'response' in err
                ? apiErr.response?.data?.detail || 'Failed to change status'
                : err instanceof Error
                    ? err.message
                    : 'Failed to change status';
            throw new Error(message);
        }
    };

    const resetPassword = async (id: number, new_password: string) => {
        try {
            await instructorsAPI.resetPassword(id, new_password);
        } catch (err: unknown) {
            interface APIErrorResponse {
                response?: {
                    data?: {
                        detail?: string;
                    };
                };
                message?: string;
            }
            const apiErr = err as APIErrorResponse;
            const message = err instanceof Error && 'response' in err
                ? apiErr.response?.data?.detail || 'Failed to reset password'
                : err instanceof Error
                    ? err.message
                    : 'Failed to reset password';
            throw new Error(message);
        }
    };

    return {
        instructors, loading, error,
        refetch: fetchInstructors,
        createInstructor, updateInstructor, deleteInstructor,
        toggleActive, resetPassword,
    };
};

// ── useInstructorDetail: single instructor with cohort assignments ────────────

export const useInstructorDetail = (id: number | null) => {
    const [instructor, setInstructor] = useState<InstructorProfile | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);



    const fetchDetail = useCallback(async () => {
        if (!id) return;
        try {
            setLoading(true);
            const data = await instructorsAPI.getById(id);
            setInstructor(data);
            setError(null);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Failed to load instructor');
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => { fetchDetail(); }, [id, fetchDetail]);

    const assignCohort = async (cohortId: number) => {
        if (!id) return;
        await instructorsAPI.assignToCohortSubject(id, cohortId);
        await fetchDetail();
    };

    const unassignCohort = async (cohortId: number) => {
        if (!id) return;
        await instructorsAPI.unassignFromCohortSubject(id, cohortId);
        await fetchDetail();
    };

    return { instructor, loading, error, refetch: fetchDetail, assignCohort, unassignCohort };
};

// ── useInstructorStats ────────────────────────────────────────────────────────

export const useInstructorStats = () => {
    const [stats, setStats] = useState<InstructorStats | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        instructorsAPI.getStats()
            .then(data => { setStats(data); setLoading(false); })
            .catch(() => setLoading(false));
    }, []);

    return { stats, loading };
};