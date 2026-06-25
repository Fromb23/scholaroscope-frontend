'use client';

import {
    createContext,
    useContext,
    useMemo,
    useState,
    useEffect,
    useRef,
    useCallback,
    type ReactNode,
} from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext';
import { useCBCCurriculum } from '@/app/plugins/cbc/hooks/useCBCCurriculum';
import { isTeachingActorView } from '@/app/core/lib/workspaces';

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

function buildFilterState(
    selectedSubjectId: number | null,
    selectedCohortId: number | null
): PersistedFilterState {
    return { selectedSubjectId, selectedCohortId };
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
    isInstitutionAdminView: boolean;
    isTeachingActorView: boolean;
    allowedSubjectIds: number[] | null;  // null = admin sees all
    allowedCohortIds: number[] | null;   // null = admin sees all
    teachingLoading: boolean;
}

const CBCFilterContext = createContext<CBCFilterContextValue | null>(null);

export function CBCProvider({ children }: { children: ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();
    const searchParams = useSearchParams();
    const { user, activeRole, activeOrg, capabilities, loading: authLoading } = useAuth();
    const { cbcCurriculumId, loading: curriculumLoading, isInstalled } = useCBCCurriculum();
    const teachingActorView = isTeachingActorView({
        activeRole,
        activeOrg,
        capabilities,
        user,
    });
    const isInstitutionAdminView = Boolean(user?.is_superadmin) || (activeRole === 'ADMIN' && !teachingActorView);
    const isAdmin = isInstitutionAdminView;
    const teachingLoading = authLoading;

    const [filterState, setFilterState] = useState<PersistedFilterState>(() => buildFilterState(null, null));
    const [hydrated, setHydrated] = useState(false);
    const hasInitializedRef = useRef(false);
    const urlFilterState = useMemo(() => buildFilterState(
        parseParam(searchParams.get('subject')),
        parseParam(searchParams.get('cohort'))
    ), [searchParams]);
    const hasExplicitScopedContext = useMemo(
        () => ['subject', 'cohort', 'cohort_subject_id', 'instructor_id']
            .some((param) => searchParams.has(param)),
        [searchParams]
    );
    const isCBCRoute = pathname.startsWith('/cbc');
    const isCBCBrowserRoute = pathname.startsWith('/cbc/browser');
    const selectedSubjectId = filterState.selectedSubjectId;
    const selectedCohortId = filterState.selectedCohortId;

    useEffect(() => {
        if (hasInitializedRef.current) return;

        const saved = hasExplicitScopedContext
            ? buildFilterState(null, null)
            : loadFromStorage();
        setFilterState(buildFilterState(
            urlFilterState.selectedSubjectId ?? saved.selectedSubjectId,
            urlFilterState.selectedCohortId ?? saved.selectedCohortId
        ));
        hasInitializedRef.current = true;
        setHydrated(true);
    }, [hasExplicitScopedContext, urlFilterState]);

    useEffect(() => {
        if (!hydrated || !isCBCRoute) return;

        setFilterState((current) => {
            const next = buildFilterState(
                searchParams.has('subject')
                    ? (teachingLoading
                        ? (urlFilterState.selectedSubjectId ?? current.selectedSubjectId)
                        : urlFilterState.selectedSubjectId)
                    : current.selectedSubjectId,
                searchParams.has('cohort')
                    ? (teachingLoading
                        ? (urlFilterState.selectedCohortId ?? current.selectedCohortId)
                        : urlFilterState.selectedCohortId)
                    : current.selectedCohortId
            );

            if (
                next.selectedSubjectId === current.selectedSubjectId &&
                next.selectedCohortId === current.selectedCohortId
            ) {
                return current;
            }

            return next;
        });
    }, [
        hydrated,
        isCBCRoute,
        searchParams,
        teachingLoading,
        urlFilterState,
    ]);

    useEffect(() => {
        if (!hydrated || hasExplicitScopedContext) return;
        if (teachingLoading && (selectedSubjectId === null || selectedCohortId === null)) return;

        saveToStorage(filterState);
    }, [filterState, hasExplicitScopedContext, hydrated, selectedCohortId, selectedSubjectId, teachingLoading]);

    const syncUrl = useCallback((nextSubjectId: number | null, nextCohortId: number | null) => {
        if (!hydrated || !isCBCRoute) return;

        const next = new URLSearchParams(searchParams.toString());

        if (nextSubjectId === null) {
            if (!teachingLoading) {
                next.delete('subject');
            }
        } else {
            next.set('subject', String(nextSubjectId));
        }

        if (nextCohortId === null) {
            if (!teachingLoading) {
                next.delete('cohort');
            }
        } else {
            next.set('cohort', String(nextCohortId));
        }

        const nextQuery = next.toString();
        const currentQuery = searchParams.toString();
        if (nextQuery === currentQuery) return;
        router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, { scroll: false });
    }, [hydrated, isCBCRoute, pathname, router, searchParams, teachingLoading]);

    const setSelectedSubject = useCallback((id: number | null) => {
        setFilterState(current => buildFilterState(id, current.selectedCohortId));
        syncUrl(id, selectedCohortId);
    }, [selectedCohortId, syncUrl]);

    const setSelectedCohort = useCallback((id: number | null) => {
        setFilterState(current => buildFilterState(current.selectedSubjectId, id));
        syncUrl(selectedSubjectId, id);
    }, [selectedSubjectId, syncUrl]);

    useEffect(() => {
        if (!isCBCBrowserRoute || typeof window === 'undefined') return;

        console.debug('[CBCContext.browser]', {
            width: window.innerWidth,
            route: pathname,
            hydrated,
            curriculumLoading,
            teachingLoading,
            urlSubjectId: urlFilterState.selectedSubjectId,
            urlCohortId: urlFilterState.selectedCohortId,
            selectedSubjectId,
            selectedCohortId,
        });
    }, [
        curriculumLoading,
        hydrated,
        isCBCBrowserRoute,
        pathname,
        selectedCohortId,
        selectedSubjectId,
        teachingLoading,
        urlFilterState,
    ]);

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
            isInstitutionAdminView,
            isTeachingActorView: teachingActorView,
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
