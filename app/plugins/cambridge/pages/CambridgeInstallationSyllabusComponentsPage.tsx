'use client';

import { useParams } from 'next/navigation';
import { useState } from 'react';
import { PermissionGuard } from '@/app/core/guards/PermissionGuard';
import { TenantGuard } from '@/app/core/guards/TenantGuard';
import { Card } from '@/app/components/ui/Card';
import { ErrorBanner } from '@/app/components/ui/ErrorBanner';
import { LoadingSpinner } from '@/app/components/ui/LoadingSpinner';
import { useCambridgeInspectionSyllabus } from '../hooks';
import { CambridgeBreadcrumb, CambridgeWorkflowNav } from '../components/CambridgeNavigation';
import { toPositiveNumber } from './authoringUtils';

export default function CambridgeInstallationSyllabusComponentsPage() {
  const params = useParams<{ syllabusId: string }>();
  const syllabusId = toPositiveNumber(params.syllabusId);
  const [errorVisible, setErrorVisible] = useState(true);

  const { data: syllabus, isLoading, error } = useCambridgeInspectionSyllabus(syllabusId);

  return (
    <TenantGuard>
      <PermissionGuard allowedRoles={['ADMIN', 'INSTRUCTOR']}>
        <div className="space-y-6">
          <CambridgeWorkflowNav />
          <CambridgeBreadcrumb
            segments={[
              { label: 'Cambridge', href: '/cambridge' },
              { label: 'Setup', href: '/cambridge/setup' },
              { label: syllabus?.programme_code ?? 'Programme' },
              { label: syllabus?.subject_title ?? 'Subject' },
              { label: syllabus?.title ?? 'Syllabus' },
              { label: 'Components' },
            ]}
          />

          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Syllabus Components</h1>
            <p className="mt-1 text-sm text-gray-500">
              Installation-side read view of syllabus content areas, assessment components, and entry options.
            </p>
          </div>

          {isLoading ? <LoadingSpinner fullScreen={false} message="Loading syllabus components..." /> : null}
          {error && errorVisible ? (
            <ErrorBanner message="Failed to load syllabus detail." onDismiss={() => setErrorVisible(false)} />
          ) : null}

          {!isLoading && !syllabus ? (
            <Card>
              <h2 className="font-semibold text-gray-900">Syllabus not found</h2>
              <p className="mt-2 text-sm text-gray-600">
                Open a valid syllabus from the setup hierarchy to inspect its components.
              </p>
            </Card>
          ) : null}

          {!isLoading && syllabus ? (
            <>
              <Card>
                <h2 className="font-semibold text-gray-900">{syllabus.title}</h2>
                <p className="mt-1 text-sm text-gray-600">
                  {syllabus.version_label} · {syllabus.valid_from_year} - {syllabus.valid_to_year ?? 'Current'}
                </p>
                <p className="mt-1 text-sm text-gray-500">
                  {syllabus.grading_scheme_type || 'No grading scheme'} ·{' '}
                  {syllabus.has_core_extended ? 'Core + Extended' : 'Single track'}
                </p>
              </Card>

              <Card>
                <h2 className="font-semibold text-gray-900">Content Areas</h2>
                {syllabus.content_areas.length === 0 ? (
                  <p className="mt-3 text-sm text-gray-600">No content areas are available for this syllabus.</p>
                ) : (
                  <ul className="mt-4 space-y-3">
                    {syllabus.content_areas.map((area) => (
                      <li key={area.id} className="rounded-lg border border-gray-200 p-4">
                        <p className="font-medium text-gray-900">{area.title}</p>
                        <p className="text-sm text-gray-600">
                          {area.code} · {area.tier} · Sort {area.sort_order}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>

              <Card>
                <h2 className="font-semibold text-gray-900">Assessment Components</h2>
                {syllabus.components.length === 0 ? (
                  <p className="mt-3 text-sm text-gray-600">No assessment components are available for this syllabus.</p>
                ) : (
                  <ul className="mt-4 space-y-3">
                    {syllabus.components.map((component) => (
                      <li key={component.id} className="rounded-lg border border-gray-200 p-4">
                        <p className="font-medium text-gray-900">{component.name}</p>
                        <p className="text-sm text-gray-600">
                          {component.component_code} · {component.component_type}
                        </p>
                        <p className="mt-1 text-xs text-gray-500">
                          Weight {component.weight_percentage ?? '—'} · Max mark {component.max_mark ?? '—'} · Duration{' '}
                          {component.duration_minutes ?? '—'}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>

              <Card>
                <h2 className="font-semibold text-gray-900">Entry Options</h2>
                {syllabus.entry_options.length === 0 ? (
                  <p className="mt-3 text-sm text-gray-600">No entry options are available for this syllabus.</p>
                ) : (
                  <ul className="mt-4 space-y-3">
                    {syllabus.entry_options.map((option) => (
                      <li key={option.id} className="rounded-lg border border-gray-200 p-4">
                        <p className="font-medium text-gray-900">{option.title}</p>
                        <p className="text-sm text-gray-600">
                          {option.option_code} · {option.zone_code || 'No zone'}
                        </p>
                        {option.components.length > 0 ? (
                          <ul className="mt-2 space-y-2">
                            {option.components.map((component) => (
                              <li key={component.id} className="rounded-md bg-gray-50 p-3 text-sm text-gray-700">
                                {component.component_code} · {component.name}
                              </li>
                            ))}
                          </ul>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            </>
          ) : null}
        </div>
      </PermissionGuard>
    </TenantGuard>
  );
}
