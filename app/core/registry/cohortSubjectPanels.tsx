import type { ReactNode } from 'react';

export interface CohortSubjectPanelContext {
    cohortId: number;
    curriculumId: number;
    curriculumType: string;
    cohortLevel: string;
    isHistorical: boolean;
    onSubjectsChanged?: () => void | Promise<void>;
}

export type CohortSubjectPanelRenderer = (context: CohortSubjectPanelContext) => ReactNode;

interface CohortSubjectPanelExtension {
    key: string;
    priority?: number;
    supports: (context: CohortSubjectPanelContext) => boolean;
    render: CohortSubjectPanelRenderer;
}

const _cohortSubjectPanelExtensions: CohortSubjectPanelExtension[] = [];

export function registerCohortSubjectPanelExtension(extension: CohortSubjectPanelExtension): void {
    if (_cohortSubjectPanelExtensions.some((entry) => entry.key === extension.key)) return;
    _cohortSubjectPanelExtensions.push(extension);
    _cohortSubjectPanelExtensions.sort((left, right) => (left.priority ?? 100) - (right.priority ?? 100));
}

export function renderCohortSubjectPanelExtension(
    context: CohortSubjectPanelContext
): ReactNode | null {
    return _cohortSubjectPanelExtensions.find((extension) => extension.supports(context))?.render(context) ?? null;
}
