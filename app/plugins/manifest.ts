'use client';

import type { ActiveOrg, Role, WorkspaceCapabilities } from '@/app/core/types/auth';
import { isSelfManagedTeachingWorkspace } from '@/app/core/lib/workspaces';

export type PluginId = 'cbc' | 'cambridge' | 'announcements' | 'requests' | 'schemes';

export type PluginLoadContext = {
  activeOrg?: ActiveOrg | null;
  activeRole?: Role | null;
  isSuperadmin?: boolean;
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

function hasEnabledFeature(context: PluginLoadContext, feature: string): boolean {
  return context.enabledFeatures.some((enabled) => enabled === feature);
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
      'superadmin.primary.afterPluginRegistry',
      'admin.primary.afterAssessments',
      'instructor.primary.afterAssessments',
    ],
    shouldLoad: (context) => (
      routeMatches(context, pluginManifestById.cbc)
      || hasEnabledFeature(context, 'cbc')
      || hasCurriculumType(context, CBC_CURRICULUM_TYPES)
      || Boolean(context.isSuperadmin)
    ),
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
    shouldLoad: (context) => (
      routeMatches(context, pluginManifestById.cambridge)
      || hasEnabledFeature(context, 'cambridge')
      || hasCurriculumType(context, CAMBRIDGE_CURRICULUM_TYPES)
    ),
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
      'superadmin.primary.afterOrganizations',
      'admin.secondary.beforeSettings',
      'instructor.secondary.beforeSubmitRequest',
    ],
    shouldLoad: (context) => (
      routeMatches(context, pluginManifestById.announcements)
      || hasEnabledFeature(context, 'announcements')
      || Boolean(context.isSuperadmin)
      || (isWorkspaceRole(context) && !isPersonalOrFreelanceWorkspace(context))
    ),
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
    shouldLoad: (context) => (
      routeMatches(context, pluginManifestById.requests)
      || hasEnabledFeature(context, 'requests')
      || isWorkspaceRole(context)
    ),
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
    shouldLoad: (context) => (
      routeMatches(context, pluginManifestById.schemes)
      || hasEnabledFeature(context, 'schemes')
    ),
    load: async () => {
      const { registerSchemesPlugin } = await import('./schemes/register');
      await registerSchemesPlugin();
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
