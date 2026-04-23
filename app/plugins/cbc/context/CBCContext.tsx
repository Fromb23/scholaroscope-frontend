'use client';

import {
    createContext,
    useContext,
    useState,
    useEffect,
    useCallback,
    type ReactNode,
} from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
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

function parseParam(value: string | null): number | null {
    if (!value) return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
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
    const pathname = usePathname();
    const router = useRouter();
    const searchParams = useSearchParams();
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
    const urlSubjectId = parseParam(searchParams.get('subject'));
    const urlCohortId = parseParam(searchParams.get('cohort'));
    const isCBCRoute = pathname.startsWith('/cbc');

    // Hydrate from localStorage
    useEffect(() => {
        const saved = loadFromStorage();
        setSelectedSubjectId(urlSubjectId ?? saved.selectedSubjectId);
        setSelectedCohortId(urlCohortId ?? saved.selectedCohortId);
        setHydrated(true);
    }, [urlSubjectId, urlCohortId]);

    // URL navigation is a first-class coordination channel in this app.
    // When a CBC route carries subject/cohort intent, mirror it into shared state.
    useEffect(() => {
        if (!hydrated || !isCBCRoute) return;

        if (urlSubjectId !== null && urlSubjectId !== selectedSubjectId) {
            setSelectedSubjectId(urlSubjectId);
        }
        if (urlCohortId !== null && urlCohortId !== selectedCohortId) {
            setSelectedCohortId(urlCohortId);
        }
        if (searchParams.has('subject') && urlSubjectId === null && selectedSubjectId !== null) {
            setSelectedSubjectId(null);
        }
        if (searchParams.has('cohort') && urlCohortId === null && selectedCohortId !== null) {
            setSelectedCohortId(null);
        }
    }, [
        hydrated,
        isCBCRoute,
        searchParams,
        selectedSubjectId,
        selectedCohortId,
        urlSubjectId,
        urlCohortId,
    ]);

    // Persist on change
    useEffect(() => {
        if (!hydrated) return;
        saveToStorage({ selectedSubjectId, selectedCohortId });
    }, [hydrated, selectedSubjectId, selectedCohortId]);

    // Keep CBC route URLs aligned with the active filter state so navigation
    // and refreshes restore the same working context.
    useEffect(() => {
        if (!hydrated || !isCBCRoute) return;

        const next = new URLSearchParams(searchParams.toString());
        const currentSubject = parseParam(searchParams.get('subject'));
        const currentCohort = parseParam(searchParams.get('cohort'));

        if (selectedSubjectId === null) {
            next.delete('subject');
        } else {
            next.set('subject', String(selectedSubjectId));
        }

        if (selectedCohortId === null) {
            next.delete('cohort');
        } else {
            next.set('cohort', String(selectedCohortId));
        }

        if (currentSubject === selectedSubjectId && currentCohort === selectedCohortId) {
            return;
        }

        const nextQuery = next.toString();
        router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, { scroll: false });
    }, [
        hydrated,
        isCBCRoute,
        pathname,
        router,
        searchParams,
        selectedSubjectId,
        selectedCohortId,
    ]);

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
    }, [
        hydrated,
        teachingLoading,
        isAdmin,
        subjectIds,
        cohortIds,
        selectedSubjectId,
        selectedCohortId,
    ]);

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
