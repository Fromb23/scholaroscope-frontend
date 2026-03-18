'use client';

// ============================================================================
// app/components/ui/LoadingSpinner.tsx
//
// Full-screen centered loading spinner.
// Use for page-level loading states.
// ============================================================================

interface LoadingSpinnerProps {
    message?: string;
    fullScreen?: boolean;
}

export function LoadingSpinner({ message, fullScreen = true }: LoadingSpinnerProps) {
    return (
        <div className={`flex items-center justify-center ${fullScreen ? 'h-screen' : 'py-16'}`}>
            <div className="text-center">
                <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-600 border-t-transparent mx-auto" />
                {message && (
                    <p className="mt-4 text-sm text-gray-500">{message}</p>
                )}
            </div>
        </div>
    );
}