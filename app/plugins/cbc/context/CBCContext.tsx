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
import { useAuth } from '@/app/context/AuthContext';
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
    const { user, activeRole, loading: authLoading } = useAuth();
    const { cbcCurriculumId, loading: curriculumLoading, isInstalled } = useCBCCurriculum();
    const isAdmin = Boolean(user?.is_superadmin) || activeRole === 'ADMIN';
    const teachingLoading = authLoading;

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

    useEffect(() => {
        if (!hydrated || !isCBCRoute) return;

        if (searchParams.has('subject') && urlSubjectId !== selectedSubjectId) {
            setSelectedSubjectId(urlSubjectId);
        }
        if (searchParams.has('cohort') && urlCohortId !== selectedCohortId) {
            setSelectedCohortId(urlCohortId);
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

    const syncUrl = useCallback((nextSubjectId: number | null, nextCohortId: number | null) => {
        if (!hydrated || !isCBCRoute) return;

        const next = new URLSearchParams(searchParams.toString());

        if (nextSubjectId === null) {
            next.delete('subject');
        } else {
            next.set('subject', String(nextSubjectId));
        }

        if (nextCohortId === null) {
            next.delete('cohort');
        } else {
            next.set('cohort', String(nextCohortId));
        }

        const nextQuery = next.toString();
        router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, { scroll: false });
    }, [hydrated, isCBCRoute, pathname, router, searchParams]);

    const setSelectedSubject = useCallback((id: number | null) => {
        setSelectedSubjectId(id);
        syncUrl(id, selectedCohortId);
    }, [selectedCohortId, syncUrl]);

    const setSelectedCohort = useCallback((id: number | null) => {
        setSelectedCohortId(id);
        syncUrl(selectedSubjectId, id);
    }, [selectedSubjectId, syncUrl]);

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
            allowedSubjectIds: null,
            allowedCohortIds: null,
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
