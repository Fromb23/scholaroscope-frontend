import { useState, useEffect, useCallback } from 'react';
import { instructorsAPI, InstructorProfile } from '@/app/core/api/instructors';
import {
    GlobalUser,
    GlobalUserActionResponse,
    UserCreatePayload,
    InstructorStats,
    UserUpdatePayload,
} from '@/app/core/types/globalUsers';
import { AppError, AppErrorException, resolveAppError } from '@/app/core/errors';

function resolveActionUser(
    response: GlobalUserActionResponse,
    fallback: GlobalUser | undefined,
): GlobalUser {
    if (response.user) {
        return response.user;
    }

    if (!fallback) {
        throw new Error(response.detail || response.message || 'Instructor state was not returned.');
    }

    return {
        ...fallback,
        membership_status: response.membership_status ?? fallback.membership_status ?? null,
    };
}

export const useInstructors = (options?: { enabled?: boolean }) => {
    const [instructors, setInstructors] = useState<GlobalUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<AppError | null>(null);
    const enabled = options?.enabled ?? true;

    const fetchInstructors = useCallback(async () => {
        if (!enabled) {
            setInstructors([]);
            setError(null);
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            const data = await instructorsAPI.getAll();
            setInstructors(data);
            setError(null);
        } catch (err) {
            setError(resolveAppError(err, { domain: 'instructors', action: 'load', entityLabel: 'instructor accounts', role: 'ADMIN' }));
        } finally {
            setLoading(false);
        }
    }, [enabled]);

    useEffect(() => {
        void fetchInstructors();
    }, [fetchInstructors]);

    const createInstructor = async (data: UserCreatePayload) => {
        try {
            const created = await instructorsAPI.create(data);
            setInstructors(prev => [created, ...prev]);
            return created;
        } catch (err) {
            throw new AppErrorException(resolveAppError(err, { domain: 'instructors', action: 'create', entityLabel: 'instructor account', role: 'ADMIN' }));
        }
    };

    const updateInstructor = async (id: number, data: UserUpdatePayload) => {
        try {
            const updated = await instructorsAPI.update(id, data);
            setInstructors(prev => prev.map(i => i.id === id ? updated : i));
            return updated;
        } catch (err) {
            throw new AppErrorException(resolveAppError(err, { domain: 'instructors', action: 'update', entityLabel: 'instructor account', role: 'ADMIN' }));
        }
    };

    const deleteInstructor = async (id: number) => {
        try {
            await instructorsAPI.removeFromOrganization(id);
            setInstructors(prev => prev.map((i) => (
                i.id === id
                    ? { ...i, membership_status: 'REVOKED' }
                    : i
            )));
        } catch (err) {
            throw new AppErrorException(resolveAppError(err, { domain: 'instructors', action: 'delete', entityLabel: 'instructor account', role: 'ADMIN' }));
        }
    };

    const toggleActive = async (id: number, activate: boolean) => {
        try {
            const updated = activate
                ? await instructorsAPI.activate(id)
                : await instructorsAPI.deactivate(id);
            const resolved = resolveActionUser(
                updated,
                instructors.find((instructor) => instructor.id === id),
            );
            setInstructors(prev => prev.map(i => i.id === id ? resolved : i));
            return resolved;
        } catch (err) {
            throw new AppErrorException(resolveAppError(err, { domain: 'instructors', action: 'update', entityLabel: 'instructor account status', role: 'ADMIN' }));
        }
    };

    const resetPassword = async (id: number, new_password: string) => {
        try {
            await instructorsAPI.resetPassword(id, new_password);
        } catch (err) {
            throw new AppErrorException(resolveAppError(err, { domain: 'instructors', action: 'update', entityLabel: 'instructor password', role: 'ADMIN' }));
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
    const [error, setError] = useState<AppError | null>(null);

    const fetchDetail = useCallback(async () => {
        if (!id) return;
        try {
            setLoading(true);
            const data = await instructorsAPI.getById(id);
            setInstructor(data);
            setError(null);
        } catch (err) {
            setError(resolveAppError(err, { domain: 'instructors', action: 'load', entityLabel: 'instructor account', role: 'ADMIN' }));
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => { fetchDetail(); }, [fetchDetail]);

    const assignCohort = async (cohortId: number) => {
        if (!id) return;
        await instructorsAPI.assignCohort(id, cohortId);
        await fetchDetail();
    };

    const unassignCohort = async (cohortId: number) => {
        if (!id) return;
        await instructorsAPI.unassignCohort(id, cohortId);
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
