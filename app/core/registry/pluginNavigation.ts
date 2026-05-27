import type { LucideIcon } from 'lucide-react';
import type { Role } from '@/app/core/types/auth';
import type { Curriculum } from '@/app/core/types/academic';

export interface NavItem {
    name: string;
    href: string;
    icon: LucideIcon;
    badge?: number;
    children?: NavItem[];
}

export type PluginNavigationSlot =
    | 'superadmin.primary.afterOrganizations'
    | 'superadmin.primary.afterPluginRegistry'
    | 'admin.primary.afterDashboard'
    | 'admin.primary.afterAssessments'
    | 'admin.secondary.beforeSettings'
    | 'instructor.primary.afterDashboard'
    | 'instructor.primary.afterMySessions'
    | 'instructor.primary.afterAssessments'
    | 'instructor.secondary.beforeSubmitRequest';

export interface PluginNavigationContext {
    role: Role;
    hasPlugin: (pluginKey: string) => boolean;
    hasCurriculumType: (curriculumType: string) => boolean;
    badges: Record<string, number>;
    curricula: Curriculum[];
    hasAnyReportPolicySurface?: boolean;
    instructorAccess?: {
        hasCurriculumAccess: (curriculum: 'CBC' | 'CAMBRIDGE') => boolean;
    };
}

interface PluginNavigationEntry {
    key: string;
    slot: PluginNavigationSlot;
    priority?: number;
    resolve: (context: PluginNavigationContext) => NavItem | NavItem[] | null;
}

const _pluginNavigationEntries: PluginNavigationEntry[] = [];

export function registerPluginNavigationEntry(entry: PluginNavigationEntry): void {
    if (_pluginNavigationEntries.some((registered) => registered.key === entry.key)) return;
    _pluginNavigationEntries.push(entry);
    _pluginNavigationEntries.sort((left, right) => (left.priority ?? 100) - (right.priority ?? 100));
}

export function getPluginNavigationItems(
    slot: PluginNavigationSlot,
    context: PluginNavigationContext
): NavItem[] {
    return _pluginNavigationEntries
        .filter((entry) => entry.slot === slot)
        .flatMap((entry) => {
            const resolved = entry.resolve(context);
            if (!resolved) return [];
            return Array.isArray(resolved) ? resolved : [resolved];
        });
}
