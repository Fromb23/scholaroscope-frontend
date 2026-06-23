import type { ComponentType } from 'react';
import type { ProfileData } from '@/app/core/hooks/useProfile';

export interface ProfileExtensionContext {
    profile: ProfileData;
}

export interface ProfileExtension {
    key: string;
    priority?: number;
    supports: (context: ProfileExtensionContext) => boolean;
    Component: ComponentType<ProfileExtensionContext>;
}

const _extensions: ProfileExtension[] = [];

export function registerProfileExtension(extension: ProfileExtension): void {
    if (_extensions.some((entry) => entry.key === extension.key)) return;
    _extensions.push(extension);
    _extensions.sort((left, right) => (left.priority ?? 100) - (right.priority ?? 100));
}

export function getProfileExtensions(context: ProfileExtensionContext): ProfileExtension[] {
    return _extensions.filter((extension) => extension.supports(context));
}
