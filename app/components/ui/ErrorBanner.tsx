'use client';

// ============================================================================
// app/components/ui/ErrorBanner.tsx
//
// Inline dismissible error banner.
// Use for form-level or section-level errors (not full-page).
// For full-page errors use ErrorState instead.
// ============================================================================

import { AlertCircle, X } from 'lucide-react';

interface ErrorBannerProps {
    message: string;
    onDismiss: () => void;
}

export function ErrorBanner({ message, onDismiss }: ErrorBannerProps) {
    return (
        <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span className="flex-1 whitespace-pre-wrap">{message}</span>
            <button
                onClick={onDismiss}
                className="text-red-400 hover:text-red-600 shrink-0"
            >
                <X className="h-4 w-4" />
            </button>
        </div>
    );
}