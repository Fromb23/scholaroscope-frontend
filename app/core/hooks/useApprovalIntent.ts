import { useCallback, useState } from 'react';
import {
    type ApprovalIntentInput,
    type ApprovalIntentSubmission,
    type ApprovalRequest,
    submitApprovalIntent,
} from '@/app/core/lib/approvalIntents';
import { type ApiError, resolveErrorMessage } from '@/app/core/types/errors';

export function useApprovalIntent() {
    const [intent, setIntent] = useState<ApprovalIntentInput | null>(null);
    const [submittedRequest, setSubmittedRequest] = useState<ApprovalRequest | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const openIntent = useCallback((nextIntent: ApprovalIntentInput) => {
        setIntent(nextIntent);
        setError(null);
    }, []);

    const closeIntent = useCallback(() => {
        if (submitting) return;
        setIntent(null);
        setError(null);
    }, [submitting]);

    const submitIntent = useCallback(async (submission: ApprovalIntentSubmission) => {
        if (!intent) return null;
        setSubmitting(true);
        setError(null);
        try {
            const request = await submitApprovalIntent(intent, submission);
            setSubmittedRequest(request);
            setIntent(null);
            return request;
        } catch (err) {
            const message = resolveErrorMessage(err as ApiError, 'Failed to submit request.');
            setError(message);
            throw new Error(message);
        } finally {
            setSubmitting(false);
        }
    }, [intent]);

    return {
        intent,
        isOpen: Boolean(intent),
        submitting,
        error,
        submittedRequest,
        setSubmittedRequest,
        openIntent,
        closeIntent,
        submitIntent,
    };
}
