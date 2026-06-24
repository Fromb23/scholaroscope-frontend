'use client';

import Link from 'next/link';
import { useState } from 'react';
import { PermissionGuard } from '@/app/core/guards/PermissionGuard';
import { TenantGuard } from '@/app/core/guards/TenantGuard';
import { useAuth } from '@/app/context/AuthContext';
import { Button } from '@/app/components/ui/Button';
import { Card } from '@/app/components/ui/Card';
import { AppErrorBanner } from '@/app/components/ui/errors';
import { LoadingSpinner } from '@/app/components/ui/LoadingSpinner';
import { useCambridgeInstallationStatus, useCambridgeOfferings, useCambridgeProgrammes, useDisableCambridgeInstallation, useDisableCambridgeProgramme, useEnableCambridgeInstallation, useEnableCambridgeProgramme, useInstallCambridge } from '../hooks';
import { CambridgeBreadcrumb, CambridgeWorkflowNav } from '../components/CambridgeNavigation';
import { modeLabel, resolveCambridgeError } from './authoringUtils';

export default function CambridgeSetupPage() {
  const { user, activeRole } = useAuth();
  const isAdmin = user?.is_superadmin || activeRole === 'ADMIN';
  const [errorVisible, setErrorVisible] = useState(true);

  const { data: installation, isLoading: installationLoading, error: installationError } = useCambridgeInstallationStatus();
  const { data: installationProgrammes = [], isLoading: programmesLoading, error: programmesError } = useCambridgeProgrammes();
  const { data: offerings = [], isLoading: offeringsLoading } = useCambridgeOfferings({ active: true });

  const installMutation = useInstallCambridge();
  const enableInstallationMutation = useEnableCambridgeInstallation();
  const disableInstallationMutation = useDisableCambridgeInstallation();
  const enableProgrammeMutation = useEnableCambridgeProgramme();
  const disableProgrammeMutation = useDisableCambridgeProgramme();

  const loading = installationLoading || programmesLoading || offeringsLoading;
  const hasError = installationError || programmesError;

  return (
    <TenantGuard>
      <PermissionGuard allowedRoles={['ADMIN', 'INSTRUCTOR']}>
        <div className="space-y-6">
          <CambridgeWorkflowNav />
          <CambridgeBreadcrumb segments={[{ label: 'Cambridge', href: '/cambridge' }, { label: 'Setup' }]} />

          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Cambridge Setup</h1>
            <p className="mt-1 text-sm text-gray-500">
              Installation management for the active organization. Global catalogue authoring is under Authoring.
            </p>
          </div>

          {loading ? <LoadingSpinner fullScreen={false} message="Loading Cambridge setup..." /> : null}

          {hasError && errorVisible ? (
            <AppErrorBanner
              error={resolveCambridgeError(installationError ?? programmesError, { flow: 'setup', action: 'load' })}
              onDismiss={() => setErrorVisible(false)}
            />
          ) : null}

          {!isAdmin ? (
            <Card>
              <h2 className="font-semibold text-gray-900">Read-only access</h2>
              <p className="mt-2 text-sm text-gray-600">
                Enable/disable actions require admin or superadmin role.
              </p>
            </Card>
          ) : null}

          <Card>
            <h2 className="font-semibold text-gray-900">Installation Status</h2>
            {!installation ? (
              <div className="mt-3 space-y-3">
                <p className="text-sm text-gray-600">
                  Cambridge is not installed for this organization.
                </p>
                {isAdmin ? (
                  <Button onClick={() => installMutation.mutate()} disabled={installMutation.isPending}>
                    {installMutation.isPending ? 'Installing...' : 'Install Cambridge'}
                  </Button>
                ) : null}
              </div>
            ) : (
              <div className="mt-3 space-y-3">
                <p className="text-sm text-gray-600">
                  Provider: <span className="font-medium text-gray-900">{installation.provider_key}</span>
                </p>
                <p className="text-sm text-gray-600">
                  Status:{' '}
                  <span className={installation.enabled ? 'font-medium text-green-700' : 'font-medium text-gray-700'}>
                    {installation.enabled ? 'Enabled' : 'Disabled'}
                  </span>
                </p>
                <p className="text-sm text-gray-600">
                  Programmes: {installation.programme_count} · Enabled subjects: {installation.enabled_subject_count}
                </p>
                {isAdmin ? (
                  <div className="flex flex-wrap gap-2">
                    <Button
                      onClick={() => enableInstallationMutation.mutate()}
                      disabled={installation.enabled || enableInstallationMutation.isPending}
                    >
                      {enableInstallationMutation.isPending ? 'Enabling...' : 'Enable Installation'}
                    </Button>
                    <Button
                      variant="danger"
                      onClick={() => disableInstallationMutation.mutate()}
                      disabled={!installation.enabled || disableInstallationMutation.isPending}
                    >
                      {disableInstallationMutation.isPending ? 'Disabling...' : 'Disable Installation'}
                    </Button>
                  </div>
                ) : null}
              </div>
            )}
          </Card>

          <Card>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="font-semibold text-gray-900">Installed Programmes</h2>
                <p className="mt-1 text-sm text-gray-600">
                  Enable/disable installed programmes and move to the next hierarchy level.
                </p>
              </div>
              <Link href="/cambridge/authoring/programmes" className="text-sm text-blue-600 hover:text-blue-700">
                Open Global Authoring
              </Link>
            </div>

            {!installation ? (
              <p className="mt-4 text-sm text-gray-600">
                Install Cambridge first, then installation programmes will appear here.
              </p>
            ) : installationProgrammes.length === 0 ? (
              <p className="mt-4 text-sm text-gray-600">
                No installation-scoped programmes found for this organization.
              </p>
            ) : (
              <ul className="mt-4 space-y-3">
                {installationProgrammes.map((programme) => {
                  const subjectCount = offerings.filter(
                    (subject) => subject.installation_programme_id === programme.id
                  ).length;
                  const isToggleLoading =
                    enableProgrammeMutation.variables === programme.id ||
                    disableProgrammeMutation.variables === programme.id;

                  return (
                    <li key={programme.id} className="rounded-lg border border-gray-200 bg-white p-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="font-medium text-gray-900">{programme.title}</p>
                          <p className="text-sm text-gray-600">
                            {programme.code} · {modeLabel(programme.structure_mode)} · {programme.display_stage_range}
                          </p>
                          <p className="mt-1 text-xs text-gray-500">
                            {subjectCount} offered subjects
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                              programme.enabled
                                ? 'bg-green-100 text-green-700'
                                : 'bg-gray-100 text-gray-700'
                            }`}
                          >
                            {programme.enabled ? 'Enabled' : 'Disabled'}
                          </span>
                          {isAdmin ? (
                            <Button
                              size="sm"
                              variant={programme.enabled ? 'danger' : 'primary'}
                              disabled={isToggleLoading}
                              onClick={() => {
                                if (programme.enabled) {
                                  disableProgrammeMutation.mutate(programme.id);
                                } else {
                                  enableProgrammeMutation.mutate(programme.id);
                                }
                              }}
                            >
                              {isToggleLoading ? 'Saving...' : programme.enabled ? 'Disable' : 'Enable'}
                            </Button>
                          ) : null}
                          <Link
                            href={`/cambridge/setup/programmes/${programme.id}/subjects`}
                            className="inline-flex items-center rounded-lg border border-blue-200 px-3 py-2 text-sm text-blue-700 hover:bg-blue-50"
                          >
                            Manage Subjects
                          </Link>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        </div>
      </PermissionGuard>
    </TenantGuard>
  );
}
