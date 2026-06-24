'use client';

import { ReactNode, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext';
import { useInstructorCohortAccess, type InstructorCurriculumKey } from '@/app/core/hooks/useInstructorCohortAccess';
import { CurriculumLifecycleAccessState } from '@/app/core/components/curriculum/CurriculumLifecycleAccessState';
import { useCurriculumLifecycleGuard } from '@/app/core/hooks/useCurriculumLifecycleGuard';
import { roleHomeRoute } from '@/app/utils/routeAccess';
import { PermissionResolvingState } from '@/app/components/ui/loading';

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
    const pathname = usePathname();
    const { user, activeRole, loading } = useAuth();
    const access = useInstructorCohortAccess();

    const curriculumType = curriculum === 'CBC' ? 'CBE' : 'CAMBRIDGE';
    const pluginKey = curriculum === 'CBC' ? 'cbc' : 'cambridge';
    const isAuthoringRoute = pathname.startsWith('/cbc/authoring') || pathname.startsWith('/cambridge/authoring');
    const routeIntent = (() => {
        if (pathname.startsWith('/cbc/report-policies')) {
            return 'edit' as const;
        }

        if (
            pathname.startsWith('/cbc/teaching/sessions/')
            && (pathname.includes('/outcomes') || pathname.endsWith('/learners'))
        ) {
            return 'complete' as const;
        }

        if (pathname.startsWith('/cambridge/setup/') || pathname.startsWith('/cambridge/offerings/')) {
            return 'edit' as const;
        }

        return 'read' as const;
    })();

    const allowed = !user
        ? false
        : user.is_superadmin
            || activeRole === 'ADMIN'
            || (activeRole === 'INSTRUCTOR' && access.hasCurriculumAccess(curriculum));

    const lifecycle = useCurriculumLifecycleGuard({
        curriculumType,
        pluginKey,
        routeIntent,
        allowWhenPluginAvailableOnly: pathname === '/cambridge' || pathname === '/cambridge/setup',
    });

    useEffect(() => {
        if (loading || access.isLoading || allowed || !activeRole) return;
        router.replace(roleHomeRoute[activeRole]);
    }, [access.isLoading, activeRole, allowed, loading, router]);

    if (loading || access.isLoading) return <PermissionResolvingState message={`Checking ${curriculum} access...`} />;
    if (!allowed) return <>{fallback}</>;
    if (isAuthoringRoute && user?.is_superadmin) return <>{children}</>;
    if (lifecycle.loading) return <PermissionResolvingState message={`Checking ${curriculum} setup...`} />;
    if (!lifecycle.allowed) {
        return (
            <CurriculumLifecycleAccessState
                title={`${curriculum} route unavailable`}
                status={lifecycle.curriculum?.offering_status ?? null}
                message={lifecycle.message}
                backHref={activeRole ? roleHomeRoute[activeRole] : '/dashboard'}
                backLabel="Back"
                primaryHref={curriculum === 'CAMBRIDGE' ? '/cambridge/setup' : '/academic/curricula'}
                primaryLabel={curriculum === 'CAMBRIDGE' ? 'Open Cambridge Setup' : 'Open Curricula'}
            />
        );
    }
    return <>{children}</>;
}
