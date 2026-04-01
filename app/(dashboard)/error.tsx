'use client';

import { useEffect } from 'react';

export default function DashboardError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error('[Dashboard Error]', error);
    }, [error]);

    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center px-4">
            <h2 className="text-xl font-semibold text-gray-800">Something went wrong</h2>
            <p className="text-sm text-gray-500 max-w-md">
                An unexpected error occurred. Your data is safe — try reloading this section.
            </p>
            <button
                onClick={reset}
                className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors"
            >
                Reload
            </button>
        </div>
    );
}