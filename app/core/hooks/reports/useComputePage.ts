'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { reportsAPI } from '@/app/core/api/reporting';
import { useTerms } from '@/app/core/hooks/useAcademic';
import { resolveReportError } from '@/app/core/errors';
import type { FormFieldErrors } from '@/app/core/forms';
import type {
    ReportComputeReadiness,
    ReportComputeResult,
} from '@/app/core/types/reporting';

export interface ComputeOption {
    id: string;
    title: string;
    description: string;
}

export interface ComputeResult {
    success: boolean;
    title?: string;
    message: string;
    serverCode?: string;
}

export function useComputePage() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const pathname = usePathname();
    const initialTerm = Number(searchParams.get('term') ?? '');
    const [selectedTerm, setSelectedTerm] = useState<number | null>(
        Number.isFinite(initialTerm) && initialTerm > 0 ? initialTerm : null,
    );
    const [computing, setComputing] = useState(false);
    const [readiness, setReadiness] = useState<ReportComputeReadiness | null>(null);
    const [readinessLoading, setReadinessLoading] = useState(false);
    const [result, setResult] = useState<ReportComputeResult | null>(null);
    const [globalError, setGlobalError] = useState<string | null>(null);
    const [fieldErrors, setFieldErrors] = useState<FormFieldErrors<'term'>>({});

    const { terms, loading: termsLoading } = useTerms();
    const selectedTermRecord = terms.find((term) => term.id === selectedTerm) ?? null;
    const selectedTermClosed = Boolean(
        selectedTermRecord?.is_frozen || selectedTermRecord?.status === 'CLOSED_HISTORICAL',
    );

    const fetchReadiness = useCallback(async (termId: number) => {
        setReadinessLoading(true);
        try {
            setReadiness(await reportsAPI.getComputeReadiness(termId));
            setGlobalError(null);
        } catch (error) {
            const resolved = resolveReportError(error, {
                action: 'load',
                entityLabel: 'report compute readiness',
                role: 'ADMIN',
            });
            setReadiness(null);
            setGlobalError(resolved.message ?? 'Could not load report compute readiness.');
        } finally {
            setReadinessLoading(false);
        }
    }, []);

    useEffect(() => {
        if (!selectedTerm) {
            setReadiness(null);
            return;
        }
        void fetchReadiness(selectedTerm);
    }, [fetchReadiness, selectedTerm]);

    const requireSelectedTerm = () => {
        if (!selectedTerm) {
            setFieldErrors({ term: 'Select a term before computing.' });
            return false;
        }
        if (selectedTermClosed) {
            setGlobalError('This term is closed. Policies and reports are historical.');
            return false;
        }
        return true;
    };

    const handleTermChange = (value: string) => {
        const nextTerm = value ? Number(value) : null;
        setSelectedTerm(nextTerm);
        setFieldErrors({});
        setGlobalError(null);
        setResult(null);

        const params = new URLSearchParams(searchParams.toString());
        if (nextTerm) {
            params.set('term', String(nextTerm));
        } else {
            params.delete('term');
        }
        const query = params.toString();
        router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    };

    const handleComputeReports = async () => {
        if (!requireSelectedTerm()) return;
        const termId = selectedTerm;
        if (!termId) return;
        if (readiness?.blocked) {
            setGlobalError(readiness.message || 'Report computation is blocked until policies are ready.');
            return;
        }

        setComputing(true);
        setFieldErrors({});
        setGlobalError(null);
        try {
            const payload = await reportsAPI.computeReports(termId);
            setResult(payload);
            setReadiness(payload.readiness);
        } catch (error) {
            const resolved = resolveReportError(error, {
                action: 'compute',
                entityLabel: 'official reports',
                role: 'ADMIN',
            });
            setGlobalError(
                resolved.serverCode === 'report_compute_blocked'
                    ? 'Reports are blocked because one or more curricula are missing required report policies.'
                    : resolved.message ?? 'Report computation failed.',
            );
        } finally {
            setComputing(false);
        }
    };

    const termOptions = [
        { value: '', label: 'Select a term...' },
        ...terms.map((term) => ({
            value: String(term.id),
            label: `${term.academic_year_name} - ${term.name}`,
        })),
    ];

    const manageCbcPoliciesHref = useMemo(() => {
        const returnTo = selectedTerm
            ? `/reports/compute?term=${selectedTerm}`
            : '/reports/compute';
        return `/reports/policies/cbc?returnTo=${encodeURIComponent(returnTo)}`;
    }, [selectedTerm]);

    return {
        selectedTerm,
        selectedTermRecord,
        selectedTermClosed,
        computing,
        readiness,
        readinessLoading,
        result,
        fieldErrors,
        globalError,
        termsLoading,
        termOptions,
        manageCbcPoliciesHref,
        setGlobalError,
        handleTermChange,
        handleComputeReports,
        refetchReadiness: selectedTerm ? () => fetchReadiness(selectedTerm) : undefined,
    };
}
