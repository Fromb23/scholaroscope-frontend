'use client';

import { ReactNode, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext';
import { useInstructorCohortAccess, type InstructorCurriculumKey } from '@/app/core/hooks/useInstructorCohortAccess';
import { roleHomeRoute } from '@/app/utils/routeAccess';

interface CurriculumAccessGuardProps {
    curriculum: InstructorCurriculumKey;
    children: ReactNode;
    fallback?: ReactNode;
}

export function CurriculumAccessGuard({
    curriculum,
    children,
    fallback = null,
}: CurriculumAccessGuardProps) {
    const router = useRouter();
    const { user, activeRole, loading } = useAuth();
    const access = useInstructorCohortAccess();

    const allowed = !user
        ? false
        : user.is_superadmin
            || activeRole === 'ADMIN'
            || (activeRole === 'INSTRUCTOR' && access.hasCurriculumAccess(curriculum));

    useEffect(() => {
        if (loading || access.isLoading || allowed || !activeRole) return;
        router.replace(roleHomeRoute[activeRole]);
    }, [access.isLoading, activeRole, allowed, loading, router]);

    if (loading || access.isLoading) return null;
    if (!allowed) return <>{fallback}</>;
    return <>{children}</>;
}
