// app/core/hooks/useBackNavigation.ts
import { useRouter, useSearchParams } from 'next/navigation';

export function useBackNavigation(fallback: string): () => void {
    const router = useRouter();
    const searchParams = useSearchParams();

    return () => {
        const back = searchParams.get('back');
        router.push(`${fallback}${back ? `?${back}` : ''}`);
    };
}