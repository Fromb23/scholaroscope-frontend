// /sessions/[sessionId]/page.tsx
'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

export default function SessionPage() {
    const params = useParams();
    const router = useRouter();

    useEffect(() => {
        router.replace(`/cbc/teaching/sessions/${params.sessionId}/outcomes`);
    }, [params.sessionId, router]);

    return <div>Redirecting...</div>;
}