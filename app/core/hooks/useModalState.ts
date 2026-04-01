// ============================================================================
// app/core/hooks/useModalState.ts
// ============================================================================

import { useState } from 'react';

interface UseModalStateReturn<T> {
    target: T | null;
    isOpen: boolean;
    open: (target: T) => void;
    close: () => void;
}

export function useModalState<T>(): UseModalStateReturn<T> {
    const [target, setTarget] = useState<T | null>(null);

    return {
        target,
        isOpen: target !== null,
        open: (t: T) => setTarget(t),
        close: () => setTarget(null),
    };
}

// For modals that open without a target (e.g. create modal)
interface UseFlagModalReturn {
    isOpen: boolean;
    open: () => void;
    close: () => void;
}

export function useFlagModal(): UseFlagModalReturn {
    const [isOpen, setIsOpen] = useState(false);
    return {
        isOpen,
        open: () => setIsOpen(true),
        close: () => setIsOpen(false),
    };
}