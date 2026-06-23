'use client';

import { LoadingSpinner } from '@/app/components/ui/LoadingSpinner';
import { useAuth } from '@/app/context/AuthContext';
import { AdminCohortsPageContent } from '@/app/core/components/academic/cohorts/AdminCohortsPageContent';
import { InstructorMyCohortsPageContent } from '@/app/core/components/academic/cohorts/InstructorMyCohortsPageContent';

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
