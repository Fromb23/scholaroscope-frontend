'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import { PermissionGuard } from '@/app/core/guards/PermissionGuard';
import { TenantGuard } from '@/app/core/guards/TenantGuard';
import { Card } from '@/app/components/ui/Card';
import { ErrorBanner } from '@/app/components/ui/ErrorBanner';
import { LoadingSpinner } from '@/app/components/ui/LoadingSpinner';
import { useCambridgeInspectionFramework } from '../hooks';
import { CambridgeBreadcrumb, CambridgeWorkflowNav } from '../components/CambridgeNavigation';
import { toPositiveNumber } from './authoringUtils';

export default function CambridgeInstallationFrameworkStrandsPage() {
  const params = useParams<{ frameworkId: string }>();
  const frameworkId = toPositiveNumber(params.frameworkId);
  const [errorVisible, setErrorVisible] = useState(true);

  const { data: framework, isLoading, error } = useCambridgeInspectionFramework(frameworkId);

  return (
    <TenantGuard>
      <PermissionGuard allowedRoles={['ADMIN', 'INSTRUCTOR']}>
        <div className="space-y-6">
          <CambridgeWorkflowNav />
          <CambridgeBreadcrumb
            segments={[
              { label: 'Cambridge', href: '/cambridge' },
              { label: 'Setup', href: '/cambridge/setup' },
              { label: framework?.programme_code ?? 'Programme' },
              { label: framework?.subject_title ?? 'Subject' },
              { label: framework?.version_label ?? 'Framework' },
              { label: 'Strands' },
            ]}
          />

          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">Framework Strands</h1>
              <p className="mt-1 text-sm text-gray-500">
                Installation-side read view of the current framework tree.
              </p>
            </div>
            <Link href="/cambridge/setup" className="text-sm text-blue-600 hover:text-blue-700">
              Back to Setup
            </Link>
          </div>

          {isLoading ? <LoadingSpinner fullScreen={false} message="Loading framework strands..." /> : null}
          {error && errorVisible ? (
            <ErrorBanner message="Failed to load framework detail." onDismiss={() => setErrorVisible(false)} />
          ) : null}

          {!isLoading && !framework ? (
            <Card>
              <h2 className="font-semibold text-gray-900">Framework not found</h2>
              <p className="mt-2 text-sm text-gray-600">
                Open a valid framework from the setup hierarchy to inspect strands.
              </p>
            </Card>
          ) : null}

          {!isLoading && framework ? (
            <Card>
              <h2 className="font-semibold text-gray-900">{framework.subject_title}</h2>
              <p className="mt-1 text-sm text-gray-600">
                {framework.version_label} · {framework.effective_from} - {framework.effective_to ?? 'Current'}
              </p>

              {framework.strands.length === 0 ? (
                <div className="mt-4 rounded-lg border border-dashed border-gray-300 p-4">
                  <p className="text-sm text-gray-600">No strands were returned for this framework.</p>
                </div>
              ) : (
                <div className="mt-4 space-y-4">
                  {framework.strands.map((strand) => (
                    <div key={strand.id} className="rounded-lg border border-gray-200 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="font-medium text-gray-900">{strand.name}</p>
                          <p className="text-sm text-gray-600">
                            {strand.code} · Sort {strand.sort_order}
                          </p>
                        </div>
                        <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
                          {strand.substrands.length} substrands
                        </span>
                      </div>

                      {strand.objectives.length > 0 ? (
                        <div className="mt-4">
                          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                            Strand Objectives
                          </p>
                          <ul className="mt-2 space-y-2">
                            {strand.objectives.map((objective) => (
                              <li key={objective.id} className="rounded-md bg-gray-50 p-3">
                                <p className="text-sm font-medium text-gray-900">{objective.objective_code}</p>
                                <p className="mt-1 text-sm text-gray-600">{objective.statement}</p>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ) : null}

                      {strand.substrands.length > 0 ? (
                        <div className="mt-4 space-y-3">
                          {strand.substrands.map((substrand) => (
                            <div key={substrand.id} className="rounded-md border border-gray-100 bg-gray-50 p-3">
                              <p className="font-medium text-gray-900">{substrand.name}</p>
                              <p className="text-sm text-gray-600">
                                {substrand.code} · Sort {substrand.sort_order}
                              </p>
                              {substrand.objectives.length > 0 ? (
                                <ul className="mt-2 space-y-2">
                                  {substrand.objectives.map((objective) => (
                                    <li key={objective.id} className="rounded-md bg-white p-3">
                                      <p className="text-sm font-medium text-gray-900">{objective.objective_code}</p>
                                      <p className="mt-1 text-sm text-gray-600">{objective.statement}</p>
                                    </li>
                                  ))}
                                </ul>
                              ) : null}
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
            </Card>
          ) : null}
        </div>
      </PermissionGuard>
    </TenantGuard>
  );
}
