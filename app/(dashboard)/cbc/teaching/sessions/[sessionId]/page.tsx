'use client';
// app/(dashboard)/cbc/teaching/sessions/[sessionId]/page.tsx
// Redirects immediately to outcomes tab — the workspace lives there.

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

export default function SessionPage() {
    const { sessionId } = useParams<{ sessionId: string }>();
    const router = useRouter();
    useEffect(() => {
        router.replace(`/cbc/teaching/sessions/${sessionId}/outcomes`);
    }, [sessionId, router]);
    return (
        <div className="py-20 text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full
        border-4 border-blue-600 border-t-transparent" />
        </div>
    );
}