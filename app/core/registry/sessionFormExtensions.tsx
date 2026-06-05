import type { ComponentType } from 'react';

import type { Curriculum, Term } from '@/app/core/types/academic';
import type { CohortSubjectOption, SessionFormData } from '@/app/core/types/session';

export interface SessionFormExtensionContext {
    formData: SessionFormData;
    selectedSubjectOption: CohortSubjectOption | null;
    selectedCurriculum: Curriculum | null;
    terms: Term[];
}

export interface SessionFormExtensionComponentProps extends SessionFormExtensionContext {
    errors: Record<string, string>;
    onChange: <Field extends keyof SessionFormData>(
        field: Field,
        value: SessionFormData[Field],
    ) => void;
}

export interface SessionFormExtension {
    key: string;
    priority?: number;
    supports: (context: SessionFormExtensionContext) => boolean;
    Component: ComponentType<SessionFormExtensionComponentProps>;
    validate?: (context: SessionFormExtensionContext) => Record<string, string>;
}

const _extensions: SessionFormExtension[] = [];

export function registerSessionFormExtension(extension: SessionFormExtension): void {
    if (_extensions.some((entry) => entry.key === extension.key)) {
        return;
    }

    _extensions.push(extension);
    _extensions.sort((left, right) => (left.priority ?? 100) - (right.priority ?? 100));
}

export function getSessionFormExtensions(
    context: SessionFormExtensionContext,
): SessionFormExtension[] {
    return _extensions.filter((extension) => extension.supports(context));
}
