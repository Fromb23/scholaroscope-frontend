'use client';

import { useMemo } from 'react';
import { useCurricula } from '@/app/core/hooks/useAcademic';
import { usePlugins } from '@/app/core/hooks/usePlugins';
import {
  canUseCurriculumRoute,
  getCurriculumRouteAccessDecision,
  resolveCurriculumForType,
  type CurriculumLifecycleRole,
  type CurriculumRouteIntent,
} from '@/app/core/lib/curriculumLifecycle';
import type { Curriculum } from '@/app/core/types/academic';
import { useAuth } from '@/app/context/AuthContext';

interface UseCurriculumLifecycleGuardOptions {
  curriculumId?: number | null;
  curriculumType?: string | null;
  pluginKey?: string;
  routeIntent: CurriculumRouteIntent;
  allowWhenNoCurriculum?: boolean;
  allowWhenPluginAvailableOnly?: boolean;
}

interface CurriculumLifecycleGuardResult {
  loading: boolean;
  curriculum: Curriculum | null;
  pluginInstalled: boolean;
  pluginActive: boolean;
  hasReadableHistoricalState: boolean;
  allowed: boolean;
  readOnly: boolean;
  label: string;
  message: string;
  role: CurriculumLifecycleRole;
}

function resolveLifecycleRole(activeRole: ReturnType<typeof useAuth>['activeRole']): CurriculumLifecycleRole {
  if (activeRole === 'INSTRUCTOR') {
    return 'INSTRUCTOR';
  }

  return 'ADMIN';
}

export function useCurriculumLifecycleGuard(
  options: UseCurriculumLifecycleGuardOptions,
): CurriculumLifecycleGuardResult {
  const { curricula, loading: curriculaLoading } = useCurricula();
  const { plugins, loading: pluginsLoading } = usePlugins();
  const { activeRole } = useAuth();

  const role = resolveLifecycleRole(activeRole);

  const curriculum = useMemo(() => {
    if (typeof options.curriculumId === 'number' && options.curriculumId > 0) {
      return curricula.find((entry) => entry.id === options.curriculumId) ?? null;
    }

    return resolveCurriculumForType(curricula, options.curriculumType);
  }, [curricula, options.curriculumId, options.curriculumType]);

  const plugin = useMemo(
    () => options.pluginKey
      ? plugins.find((entry) => entry.key === options.pluginKey) ?? null
      : null,
    [options.pluginKey, plugins],
  );

  const pluginInstalled = Boolean(plugin);
  const pluginActive = Boolean(plugin && (plugin.state === 'active' || plugin.is_active));
  const hasReadableHistoricalState = Boolean(curriculum);

  const decision = curriculum
    ? getCurriculumRouteAccessDecision(curriculum, options.routeIntent, role)
    : null;

  const allowed = decision
    ? decision.allowed
    : (
      options.allowWhenNoCurriculum
        ? true
        : (options.allowWhenPluginAvailableOnly ? pluginActive : false)
    );

  const readOnly = curriculum ? !canUseCurriculumRoute(curriculum, 'create', role) : false;

  return {
    loading: curriculaLoading || pluginsLoading,
    curriculum,
    pluginInstalled,
    pluginActive,
    hasReadableHistoricalState,
    allowed,
    readOnly: decision?.readOnly ?? readOnly,
    label: decision?.label ?? (pluginActive ? 'Available' : 'Unavailable'),
    message: decision?.message
      ?? (
        pluginActive
          ? 'This route is not available for the selected curriculum.'
          : 'This Scholaroscope-powered curriculum is not available for your organization.'
      ),
    role,
  };
}
