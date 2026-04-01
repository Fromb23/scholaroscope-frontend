// ============================================================================
// app/core/hooks/useSubmitHandler.ts
// ============================================================================

import { useState } from 'react';

interface UseSubmitHandlerReturn {
    submitting: boolean;
    actionError: string | null;
    actionSuccess: string | null;
    setActionError: (msg: string | null) => void;
    withSubmit: (fn: () => Promise<void>) => Promise<void>;
    showSuccess: (msg: string) => void;
}

export function useSubmitHandler(): UseSubmitHandlerReturn {
    const [submitting, setSubmitting] = useState(false);
    const [actionError, setActionError] = useState<string | null>(null);
    const [actionSuccess, setActionSuccess] = useState<string | null>(null);

    const withSubmit = async (fn: () => Promise<void>) => {
        setSubmitting(true);
        setActionError(null);
        try {
            await fn();
        } catch (err) {
            setActionError(err instanceof Error ? err.message : 'An error occurred');
        } finally {
            setSubmitting(false);
        }
    };

    const showSuccess = (msg: string) => {
        setActionSuccess(msg);
        setTimeout(() => setActionSuccess(null), 3000);
    };

    return { submitting, actionError, actionSuccess, setActionError, withSubmit, showSuccess };
}