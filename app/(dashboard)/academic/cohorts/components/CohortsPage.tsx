'use client';

import { LoadingSpinner } from '@/app/components/ui/LoadingSpinner';
import { useAuth } from '@/app/context/AuthContext';
import { AdminCohortsPageContent } from '@/app/(dashboard)/academic/cohorts/components/AdminCohortsPageContent';
import { InstructorMyCohortsPageContent } from '@/app/(dashboard)/academic/cohorts/components/InstructorMyCohortsPageContent';

export function CohortsPage() {
    const { activeRole, loading: authLoading } = useAuth();

    if (authLoading) {
        return <LoadingSpinner fullScreen={false} />;
    }

    if (!activeRole) {
        return null;
    }

    return activeRole === 'INSTRUCTOR'
        ? <InstructorMyCohortsPageContent />
        : <AdminCohortsPageContent />;
}
