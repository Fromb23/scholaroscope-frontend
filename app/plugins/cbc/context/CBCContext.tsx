'use client';

import {
    createContext,
    useContext,
    useState,
    useEffect,
    useCallback,
    type ReactNode,
} from 'react';
import { useCBCCurriculum } from '@/app/plugins/cbc/hooks/useCBCCurriculum';

// ─── Storage ──────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'cbc_filter_state';

interface PersistedFilterState {
    selectedSubjectId: number | null;
    selectedCohortId: number | null;
}

function loadFromStorage(): PersistedFilterState {
    if (typeof window === 'undefined') return { selectedSubjectId: null, selectedCohortId: null };
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return { selectedSubjectId: null, selectedCohortId: null };
        const parsed = JSON.parse(raw) as Partial<PersistedFilterState>;
        return {
            selectedSubjectId: parsed.selectedSubjectId ?? null,
            selectedCohortId: parsed.selectedCohortId ?? null,
        };
    } catch {
        return { selectedSubjectId: null, selectedCohortId: null };
    }
}

function saveToStorage(state: PersistedFilterState) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
        // quota exceeded or private browsing — fail silently
    }
}

// ─── Context ──────────────────────────────────────────────────────────────────

interface CBCFilterContextValue {
    // Auto-resolved — never null after loading
    selectedCurriculumId: number | null;
    curriculumLoading: boolean;
    isInstalled: boolean;
    // User selections — persisted
    selectedSubjectId: number | null;
    selectedCohortId: number | null;
    setSelectedSubject: (id: number | null) => void;
    setSelectedCohort: (id: number | null) => void;
}

const CBCFilterContext = createContext<CBCFilterContextValue | null>(null);

export function CBCProvider({ children }: { children: ReactNode }) {
    const { cbcCurriculumId, loading: curriculumLoading, isInstalled } = useCBCCurriculum();

    const [selectedSubjectId, setSelectedSubjectId] = useState<number | null>(null);
    const [selectedCohortId, setSelectedCohortId] = useState<number | null>(null);
    const [hydrated, setHydrated] = useState(false);

    // Hydrate subject + cohort from localStorage on mount
    useEffect(() => {
        const saved = loadFromStorage();
        setSelectedSubjectId(saved.selectedSubjectId);
        setSelectedCohortId(saved.selectedCohortId);
        setHydrated(true);
    }, []);

    // Persist subject + cohort whenever they change
    useEffect(() => {
        if (!hydrated) return;
        saveToStorage({ selectedSubjectId, selectedCohortId });
    }, [hydrated, selectedSubjectId, selectedCohortId]);

    const setSelectedSubject = useCallback((id: number | null) => {
        setSelectedSubjectId(id);
    }, []);

    const setSelectedCohort = useCallback((id: number | null) => {
        setSelectedCohortId(id);
    }, []);

    return (
        <CBCFilterContext.Provider value={{
            selectedCurriculumId: cbcCurriculumId,
            curriculumLoading,
            isInstalled,
            selectedSubjectId,
            selectedCohortId,
            setSelectedSubject,
            setSelectedCohort,
        }}>
            {children}
        </CBCFilterContext.Provider>
    );
}

export function useCBCContext() {
    const ctx = useContext(CBCFilterContext);
    if (!ctx) throw new Error('useCBCContext must be used inside CBCProvider');
    return ctx;
}