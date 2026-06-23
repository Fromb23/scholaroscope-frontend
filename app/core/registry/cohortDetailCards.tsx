import type { ComponentType } from 'react';

export interface CohortDetailCardContext {
    cohortId: number;
    curriculumType: string | null | undefined;
}

export interface CohortDetailCardExtension {
    key: string;
    priority?: number;
    supports: (context: CohortDetailCardContext) => boolean;
    Component: ComponentType<{ cohortId: number }>;
}

const _extensions: CohortDetailCardExtension[] = [];

export function registerCohortDetailCardExtension(extension: CohortDetailCardExtension): void {
    if (_extensions.some((entry) => entry.key === extension.key)) return;
    _extensions.push(extension);
    _extensions.sort((left, right) => (left.priority ?? 100) - (right.priority ?? 100));
}

export function getCohortDetailCardExtensions(context: CohortDetailCardContext): CohortDetailCardExtension[] {
    return _extensions.filter((extension) => extension.supports(context));
}
