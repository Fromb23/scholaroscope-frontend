'use client';

import type { ActiveOrg, Role, WorkspaceCapabilities } from '@/app/core/types/auth';
import { isSelfManagedTeachingWorkspace } from '@/app/core/lib/workspaces';
import { getProductCapability } from '@/app/core/lib/productCapabilities';

export type PluginId = 'cbc' | 'cambridge' | 'announcements' | 'requests' | 'schemes' | 'themes';

export type PluginLoadContext = {
  activeOrg?: ActiveOrg | null;
  activeRole?: Role | null;
  capabilities: WorkspaceCapabilities;
  curriculumTypes: string[];
  enabledFeatures: string[];
  pathname: string;
};

export type PluginManifestEntry = {
  id: PluginId;
  label: string;
  curriculumTypes?: string[];
  featureFlags?: string[];
  routePatterns: RegExp[];
  navigationSlots: string[];
  shouldLoad: (context: PluginLoadContext) => boolean;
  load: () => Promise<void>;
};

const CBC_CURRICULUM_TYPES = new Set(['CBC', 'CBE']);
const CAMBRIDGE_CURRICULUM_TYPES = new Set([
  'CAMBRIDGE',
  'CAM_PRIMARY',
  'CAM_LOWER_SEC',
  'CAM_UPPER_SEC',
  'CAM_ADVANCED',
]);

function normalize(value: string | null | undefined): string {
  return (value ?? '').trim().toUpperCase();
}

function hasCurriculumType(context: PluginLoadContext, types: Set<string>): boolean {
  return context.curriculumTypes.some((type) => types.has(normalize(type)));
}

function shouldLoadFromResolvedCapability(
  context: PluginLoadContext,
  pluginId: PluginId,
): boolean | null {
  const resolved = getProductCapability(context.capabilities, pluginId);
  if (resolved === null) {
    return null;
  }
  return resolved.enabled === true;
}

function hasLegacyInstalledFeature(context: PluginLoadContext, pluginId: PluginId): boolean {
  return context.enabledFeatures.some((feature) => feature === pluginId);
}

function routeMatches(context: PluginLoadContext, entry: Pick<PluginManifestEntry, 'routePatterns'>): boolean {
  return entry.routePatterns.some((pattern) => pattern.test(context.pathname));
}

function isPersonalOrFreelanceWorkspace(context: PluginLoadContext): boolean {
  return isSelfManagedTeachingWorkspace({
    orgType: context.activeOrg?.org_type,
    capabilities: context.capabilities,
  });
}

function isWorkspaceRole(context: PluginLoadContext): boolean {
  return new Set<Role>(['ADMIN', 'INSTRUCTOR']).has(context.activeRole as Role);
}

export const pluginManifest: PluginManifestEntry[] = [
  {
    id: 'cbc',
    label: 'CBC',
    curriculumTypes: ['CBC', 'CBE'],
    featureFlags: ['cbc'],
    routePatterns: [/^\/cbc(?:\/|$)/],
    navigationSlots: [
      'admin.primary.afterAssessments',
      'instructor.primary.afterAssessments',
    ],
    shouldLoad: (context) => {
      const resolved = shouldLoadFromResolvedCapability(context, 'cbc');
      if (resolved !== null) return resolved;
      return routeMatches(context, pluginManifestById.cbc)
        || hasLegacyInstalledFeature(context, 'cbc')
        || hasCurriculumType(context, CBC_CURRICULUM_TYPES);
    },
    load: async () => {
      const { registerCbcPlugin } = await import('./cbc/register');
      await registerCbcPlugin();
    },
  },
  {
    id: 'cambridge',
    label: 'Cambridge',
    curriculumTypes: [
      'CAMBRIDGE',
      'CAM_PRIMARY',
      'CAM_LOWER_SEC',
      'CAM_UPPER_SEC',
      'CAM_ADVANCED',
    ],
    featureFlags: ['cambridge'],
    routePatterns: [/^\/cambridge(?:\/|$)/],
    navigationSlots: [
      'admin.primary.afterAssessments',
      'instructor.primary.afterAssessments',
    ],
    shouldLoad: (context) => {
      const resolved = shouldLoadFromResolvedCapability(context, 'cambridge');
      if (resolved !== null) return resolved;
      return routeMatches(context, pluginManifestById.cambridge)
        || hasLegacyInstalledFeature(context, 'cambridge')
        || hasCurriculumType(context, CAMBRIDGE_CURRICULUM_TYPES);
    },
    load: async () => {
      const { registerCambridgePlugin } = await import('./cambridge/register');
      await registerCambridgePlugin();
    },
  },
  {
    id: 'announcements',
    label: 'Announcements',
    featureFlags: ['announcements'],
    routePatterns: [/^\/announcements(?:\/|$)/],
    navigationSlots: [
      'admin.secondary.beforeSettings',
      'instructor.secondary.beforeSubmitRequest',
    ],
    shouldLoad: (context) => {
      const resolved = shouldLoadFromResolvedCapability(context, 'announcements');
      if (resolved !== null) return resolved;
      return routeMatches(context, pluginManifestById.announcements)
        || hasLegacyInstalledFeature(context, 'announcements')
        || (isWorkspaceRole(context) && !isPersonalOrFreelanceWorkspace(context));
    },
    load: async () => {
      const { registerAnnouncementsPlugin } = await import('./announcements/register');
      await registerAnnouncementsPlugin();
    },
  },
  {
    id: 'requests',
    label: 'Requests',
    featureFlags: ['requests'],
    routePatterns: [/^\/requests(?:\/|$)/],
    navigationSlots: [
      'admin.primary.afterDashboard',
      'instructor.primary.afterMySessions',
    ],
    shouldLoad: (context) => {
      const resolved = shouldLoadFromResolvedCapability(context, 'requests');
      if (resolved !== null) return resolved;
      return routeMatches(context, pluginManifestById.requests)
        || hasLegacyInstalledFeature(context, 'requests')
        || isWorkspaceRole(context);
    },
    load: async () => {
      const { registerRequestsPlugin } = await import('./requests/register');
      await registerRequestsPlugin();
    },
  },
  {
    id: 'schemes',
    label: 'Schemes',
    featureFlags: ['schemes'],
    routePatterns: [/^\/schemes(?:\/|$)/],
    navigationSlots: [
      'admin.primary.afterDashboard',
      'instructor.primary.afterDashboard',
    ],
    shouldLoad: (context) => {
      const resolved = shouldLoadFromResolvedCapability(context, 'schemes');
      if (resolved !== null) return resolved;
      return routeMatches(context, pluginManifestById.schemes)
        || hasLegacyInstalledFeature(context, 'schemes');
    },
    load: async () => {
      const { registerSchemesPlugin } = await import('./schemes/register');
      await registerSchemesPlugin();
    },
  },
  {
    id: 'themes',
    label: 'Themes',
    featureFlags: ['themes'],
    routePatterns: [/^\/settings(?:\/|$)/],
    navigationSlots: [],
    shouldLoad: (context) => {
      const resolved = shouldLoadFromResolvedCapability(context, 'themes');
      if (resolved !== null) return resolved;
      return routeMatches(context, pluginManifestById.themes)
        || hasLegacyInstalledFeature(context, 'themes');
    },
    load: async () => {
      const { registerThemesPlugin } = await import('./themes/register');
      await registerThemesPlugin();
    },
  },
];

export const pluginManifestById = Object.fromEntries(
  pluginManifest.map((entry) => [entry.id, entry]),
) as Record<PluginId, PluginManifestEntry>;

export const pluginIds = pluginManifest.map((entry) => entry.id);

export function getRequiredPluginIdsForPath(pathname: string): PluginId[] {
  return pluginManifest
    .filter((entry) => entry.routePatterns.some((pattern) => pattern.test(pathname)))
    .map((entry) => entry.id);
}

export function selectPluginManifestEntries(
  context: PluginLoadContext,
  entries: PluginManifestEntry[] = pluginManifest,
): PluginManifestEntry[] {
  return entries.filter((entry) => entry.shouldLoad(context));
}
