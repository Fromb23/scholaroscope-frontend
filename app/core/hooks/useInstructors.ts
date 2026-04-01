import { useState, useEffect, useCallback } from 'react';
import { instructorsAPI, InstructorProfile } from '@/app/core/api/instructors';
import { GlobalUser, UserCreatePayload, InstructorStats, UserUpdatePayload } from '@/app/core/types/globalUsers';
import { ApiError, extractErrorMessage } from '@/app/core/types/errors';

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
        } catch (err) {
            setError(extractErrorMessage(err as ApiError, 'Failed to fetch instructors'));
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
        } catch (err) {
            throw new Error(extractErrorMessage(err as ApiError, 'Failed to create instructor'));
        }
    };

    const updateInstructor = async (id: number, data: UserUpdatePayload) => {
        try {
            const updated = await instructorsAPI.update(id, data);
            setInstructors(prev => prev.map(i => i.id === id ? updated : i));
            return updated;
        } catch (err) {
            throw new Error(extractErrorMessage(err as ApiError, 'Failed to update instructor'));
        }
    };

    const deleteInstructor = async (id: number) => {
        try {
            await instructorsAPI.remove(id);
            setInstructors(prev => prev.filter(i => i.id !== id));
        } catch (err) {
            throw new Error(extractErrorMessage(err as ApiError, 'Failed to delete instructor'));
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
        } catch (err) {
            throw new Error(extractErrorMessage(err as ApiError, 'Failed to change status'));
        }
    };

    const resetPassword = async (id: number, new_password: string) => {
        try {
            await instructorsAPI.resetPassword(id, new_password);
        } catch (err) {
            throw new Error(extractErrorMessage(err as ApiError, 'Failed to reset password'));
        }
    };

    return {
        instructors, loading, error, refetch: fetchInstructors,
        createInstructor, updateInstructor, deleteInstructor,
        toggleActive, resetPassword,
    };
};

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
        } catch (err) {
            setError(extractErrorMessage(err as ApiError, 'Failed to load instructor'));
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => { fetchDetail(); }, [fetchDetail]);

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