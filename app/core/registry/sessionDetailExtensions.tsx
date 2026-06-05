import type { ComponentType } from 'react';

import type {
    SessionClosureState,
    SessionDetail,
} from '@/app/core/types/session';

export interface SessionDetailExtensionContext {
    session: SessionDetail;
    closureState: SessionClosureState | null;
    isHistorical: boolean;
    isInProgress: boolean;
    isCompleted: boolean;
}

export interface SessionDetailExtensionComponentProps
    extends SessionDetailExtensionContext {
    onSessionDataChanged: () => Promise<void> | void;
}

export interface SessionDetailExtension {
    key: string;
    priority?: number;
    supports: (context: SessionDetailExtensionContext) => boolean;
    Component: ComponentType<SessionDetailExtensionComponentProps>;
}

const _extensions: SessionDetailExtension[] = [];

export function registerSessionDetailExtension(
    extension: SessionDetailExtension,
): void {
    if (_extensions.some((entry) => entry.key === extension.key)) {
        return;
    }

    _extensions.push(extension);
    _extensions.sort((left, right) => (left.priority ?? 100) - (right.priority ?? 100));
}

export function getSessionDetailExtensions(
    context: SessionDetailExtensionContext,
): SessionDetailExtension[] {
    return _extensions.filter((extension) => extension.supports(context));
}
