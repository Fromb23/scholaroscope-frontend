'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { ErrorState } from '@/app/components/ui/ErrorState';
import { LoadingSpinner } from '@/app/components/ui/LoadingSpinner';
import { useAuth } from '@/app/context/AuthContext';

function parsePositiveInteger(value: string | null): number | null {
    if (!value) {
        return null;
    }

    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export default function SuperadminLearnerRedirectPage() {
    const params = useParams();
    const router = useRouter();
    const searchParams = useSearchParams();
    const { activeOrg, switchOrg } = useAuth();
    const [error, setError] = useState<string | null>(null);

    const studentId = useMemo(() => {
        const rawId = Array.isArray(params.id) ? params.id[0] : params.id;
        return parsePositiveInteger(rawId ?? null);
    }, [params.id]);
    const organizationId = useMemo(
        () => parsePositiveInteger(searchParams.get('organization')),
        [searchParams],
    );

    useEffect(() => {
        let cancelled = false;

        const redirect = async () => {
            if (!studentId) {
                setError('This learner link is invalid.');
                return;
            }

            if (!organizationId) {
                setError('This learner link is missing organization context.');
                return;
            }

            try {
                setError(null);
                if (activeOrg?.id !== organizationId) {
                    await switchOrg(organizationId);
                }

                if (!cancelled) {
                    router.replace(`/learners/${studentId}`);
                }
            } catch (err) {
                if (!cancelled) {
                    setError(err instanceof Error ? err.message : 'Failed to open learner.');
                }
            }
        };

        void redirect();

        return () => {
            cancelled = true;
        };
    }, [activeOrg?.id, organizationId, router, studentId, switchOrg]);

    if (error) {
        return (
            <ErrorState
                fullScreen={false}
                message={error}
            />
        );
    }

    return (
        <LoadingSpinner
            fullScreen={false}
            message="Opening learner..."
        />
    );
}
