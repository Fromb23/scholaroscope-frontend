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
import { useMyCBCTeachingLoad } from '@/app/plugins/cbc/hooks/useCBCTeaching';

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
    } catch { }
}

// ─── Context ──────────────────────────────────────────────────────────────────

interface CBCFilterContextValue {
    // Auto-resolved curriculum
    selectedCurriculumId: number | null;
    curriculumLoading: boolean;
    isInstalled: boolean;
    // User selections — persisted
    selectedSubjectId: number | null;
    selectedCohortId: number | null;
    setSelectedSubject: (id: number | null) => void;
    setSelectedCohort: (id: number | null) => void;
    // Role-based access
    isAdmin: boolean;
    allowedSubjectIds: number[] | null;  // null = admin sees all
    allowedCohortIds: number[] | null;   // null = admin sees all
    teachingLoading: boolean;
}

const CBCFilterContext = createContext<CBCFilterContextValue | null>(null);

export function CBCProvider({ children }: { children: ReactNode }) {
    const { cbcCurriculumId, loading: curriculumLoading, isInstalled } = useCBCCurriculum();
    const {
        isAdmin,
        subjectIds,
        cohortIds,
        loading: teachingLoading,
    } = useMyCBCTeachingLoad();

    const [selectedSubjectId, setSelectedSubjectId] = useState<number | null>(null);
    const [selectedCohortId, setSelectedCohortId] = useState<number | null>(null);
    const [hydrated, setHydrated] = useState(false);

    // Hydrate from localStorage
    useEffect(() => {
        const saved = loadFromStorage();
        setSelectedSubjectId(saved.selectedSubjectId);
        setSelectedCohortId(saved.selectedCohortId);
        setHydrated(true);
    }, []);

    // Persist on change
    useEffect(() => {
        if (!hydrated) return;
        saveToStorage({ selectedSubjectId, selectedCohortId });
    }, [hydrated, selectedSubjectId, selectedCohortId]);

    // When instructor has no access to persisted subject — clear it
    useEffect(() => {
        if (!hydrated || teachingLoading) return;
        if (!isAdmin && selectedSubjectId !== null) {
            if (!subjectIds.includes(selectedSubjectId)) {
                setSelectedSubjectId(null);
            }
        }
        if (!isAdmin && selectedCohortId !== null) {
            if (!cohortIds.includes(selectedCohortId)) {
                setSelectedCohortId(null);
            }
        }
    }, [hydrated, teachingLoading, isAdmin, subjectIds, cohortIds]);

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
            isAdmin,
            allowedSubjectIds: isAdmin ? null : subjectIds,
            allowedCohortIds: isAdmin ? null : cohortIds,
            teachingLoading,
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