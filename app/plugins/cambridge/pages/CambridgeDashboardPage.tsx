// ============================================================================
// app/plugins/cambridge/pages/CambridgeDashboardPage.tsx
// ============================================================================

'use client';

import Link from 'next/link';
import { useState } from 'react';
import { PermissionGuard } from '@/app/core/guards/PermissionGuard';
import { TenantGuard } from '@/app/core/guards/TenantGuard';
import { Card } from '@/app/components/ui/Card';
import { LoadingSpinner } from '@/app/components/ui/LoadingSpinner';
import { ErrorBanner } from '@/app/components/ui/ErrorBanner';
import {
  useCambridgeCohortSubjects,
  useCambridgeInstallationStatus,
  useCambridgeOfferings,
  useCambridgeProgrammes,
} from '../hooks';

export default function CambridgeDashboardPage() {
  const {
    data: installation,
    isLoading: installationLoading,
    error: installationError,
  } = useCambridgeInstallationStatus();
  const { data: programmes = [], isLoading: programmesLoading } = useCambridgeProgrammes();
  const { data: offerings = [], isLoading: offeringsLoading } = useCambridgeOfferings({ active: true });
  const { data: cohortSubjects = [], isLoading: cohortSubjectsLoading } = useCambridgeCohortSubjects({ active: true });
  const [errorVisible, setErrorVisible] = useState(true);

  const enabledProgrammes = programmes.filter((programme) => programme.enabled).length;
  const enabledSubjects = offerings.length;
  const assignedCohortSubjects = cohortSubjects.length;
  const loading = installationLoading || programmesLoading || offeringsLoading || cohortSubjectsLoading;

  return (
    <TenantGuard>
      <PermissionGuard
        allowedRoles={['ADMIN', 'INSTRUCTOR']}
        fallback={<p className="text-sm text-gray-600">Cambridge dashboard is not available for this role.</p>}
      >
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Cambridge Dashboard</h1>
            <p className="text-sm text-gray-500 mt-1">
              Installation health, enabled catalogue coverage, and curriculum access links.
            </p>
          </div>

          {loading ? <LoadingSpinner fullScreen={false} message="Loading Cambridge dashboard..." /> : null}

          {installationError && errorVisible ? (
            <ErrorBanner
              message="Failed to load Cambridge installation data."
              onDismiss={() => setErrorVisible(false)}
            />
          ) : null}

          {!loading && !installation ? (
            <Card>
              <h2 className="font-semibold text-gray-900">Cambridge not installed</h2>
              <p className="text-sm text-gray-600 mt-2">
                This organization has no Cambridge installation yet.
              </p>
              <Link href="/cambridge/setup" className="text-blue-600 text-sm mt-3 inline-block">
                Open Setup
              </Link>
            </Card>
          ) : null}

          {!loading && installation && !installation.enabled ? (
            <Card>
              <h2 className="font-semibold text-gray-900">Cambridge installed but disabled</h2>
              <p className="text-sm text-gray-600 mt-2">
                Enable the installation in setup before instructors can use subject content.
              </p>
              <Link href="/cambridge/setup" className="text-blue-600 text-sm mt-3 inline-block">
                Manage Setup
              </Link>
            </Card>
          ) : null}

          {!loading && installation && installation.enabled ? (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Card>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Installation</p>
                  <p className="mt-1 text-xl font-semibold text-gray-900">Enabled</p>
                </Card>
                <Card>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Enabled Programmes</p>
                  <p className="mt-1 text-xl font-semibold text-gray-900">{enabledProgrammes}</p>
                </Card>
                <Card>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Offered Subjects</p>
                  <p className="mt-1 text-xl font-semibold text-gray-900">{enabledSubjects}</p>
                </Card>
                <Card>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Cohort Assignments</p>
                  <p className="mt-1 text-xl font-semibold text-gray-900">{assignedCohortSubjects}</p>
                </Card>
              </div>

              <Card>
                <h2 className="font-semibold text-gray-900">Quick links</h2>
                <div className="mt-3 flex flex-wrap gap-4 text-sm">
                  <Link href="/cambridge/authoring/programmes" className="text-blue-600">
                    Authoring
                  </Link>
                  <Link href="/cambridge/setup" className="text-blue-600">
                    Setup
                  </Link>
                  <Link href="/cambridge/subjects" className="text-blue-600">
                    Cohort subjects
                  </Link>
                  <Link href="/cambridge/progress" className="text-blue-600">
                    Browser & progress
                  </Link>
                </div>
              </Card>
            </>
          ) : null}
        </div>
      </PermissionGuard>
    </TenantGuard>
  );
}
