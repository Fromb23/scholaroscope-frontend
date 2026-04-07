'use client';
// app/plugins/cbc/context/CBCContext.tsx
// Persists UI selection state across all CBC routes.
// Server state lives in React Query — this only holds filter/selection UI state.

import {
    createContext,
    useContext,
    useState,
    useCallback,
    type ReactNode,
} from 'react';

interface CBCUIState {
    // Authoring / Browser / Progress shared
    selectedCurriculumId: number | null;
    selectedSubjectId: number | null;

    // Browser: which sub-strands are expanded in strand detail
    expandedSubStrands: Set<number>;

    // Student progress: which strands are expanded
    expandedStrands: Set<string>;

    // Teaching: active session id (persists across tab navigation within session)
    activeSessionId: number | null;
}

interface CBCContextValue extends CBCUIState {
    setSelectedCurriculum: (id: number | null) => void;
    setSelectedSubject: (id: number | null) => void;
    toggleSubStrand: (id: number) => void;
    toggleStrand: (code: string) => void;
    setActiveSession: (id: number | null) => void;
    clearExpanded: () => void;
}

const CBCContext = createContext<CBCContextValue | null>(null);

export function CBCProvider({ children }: { children: ReactNode }) {
    const [selectedCurriculumId, setSelectedCurriculumId] = useState<number | null>(null);
    const [selectedSubjectId, setSelectedSubjectId] = useState<number | null>(null);
    const [expandedSubStrands, setExpandedSubStrands] = useState<Set<number>>(new Set());
    const [expandedStrands, setExpandedStrands] = useState<Set<string>>(new Set());
    const [activeSessionId, setActiveSessionId] = useState<number | null>(null);

    const setSelectedCurriculum = useCallback((id: number | null) => {
        setSelectedCurriculumId(id);
        setSelectedSubjectId(null);   // reset dependent filter
    }, []);

    const setSelectedSubject = useCallback((id: number | null) => {
        setSelectedSubjectId(id);
    }, []);

    const toggleSubStrand = useCallback((id: number) => {
        setExpandedSubStrands(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    }, []);

    const toggleStrand = useCallback((code: string) => {
        setExpandedStrands(prev => {
            const next = new Set(prev);
            next.has(code) ? next.delete(code) : next.add(code);
            return next;
        });
    }, []);

    const setActiveSession = useCallback((id: number | null) => {
        setActiveSessionId(id);
    }, []);

    const clearExpanded = useCallback(() => {
        setExpandedSubStrands(new Set());
        setExpandedStrands(new Set());
    }, []);

    return (
        <CBCContext.Provider value={{
            selectedCurriculumId,
            selectedSubjectId,
            expandedSubStrands,
            expandedStrands,
            activeSessionId,
            setSelectedCurriculum,
            setSelectedSubject,
            toggleSubStrand,
            toggleStrand,
            setActiveSession,
            clearExpanded,
        }}>
            {children}
        </CBCContext.Provider>
    );
}

export function useCBCContext() {
    const ctx = useContext(CBCContext);
    if (!ctx) throw new Error('useCBCContext must be used inside CBCProvider');
    return ctx;
}