'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useMemo, useState } from 'react';
import { PermissionGuard } from '@/app/core/guards/PermissionGuard';
import { TenantGuard } from '@/app/core/guards/TenantGuard';
import { Card } from '@/app/components/ui/Card';
import { ErrorBanner } from '@/app/components/ui/ErrorBanner';
import { LoadingSpinner } from '@/app/components/ui/LoadingSpinner';
import {
  useCambridgeInspectionFrameworks,
  useCambridgeProgrammes,
  useCambridgeSubject,
} from '../hooks';
import { CambridgeBreadcrumb, CambridgeWorkflowNav } from '../components/CambridgeNavigation';
import { modeLabel, toPositiveNumber } from './authoringUtils';

export default function CambridgeInstallationSubjectFrameworksPage() {
  const params = useParams<{ id: string }>();
  const subjectId = toPositiveNumber(params.id);
  const [errorVisible, setErrorVisible] = useState(true);

  const { data: subject, isLoading: subjectLoading, error: subjectError } = useCambridgeSubject(subjectId);
  const { data: programmes = [] } = useCambridgeProgrammes();
  const {
    data: frameworks = [],
    isLoading: frameworksLoading,
    error: frameworksError,
  } = useCambridgeInspectionFrameworks();

  const programme = useMemo(
    () => programmes.find((item) => item.code === subject?.programme_code) ?? null,
    [programmes, subject]
  );

  const subjectFrameworks = useMemo(() => {
    if (!subject?.subject_code || !subject.programme_code) return [];
    return frameworks.filter(
      (framework) =>
        framework.subject_code === subject.subject_code && framework.programme_code === subject.programme_code
    );
  }, [frameworks, subject]);

  const loading = subjectLoading || frameworksLoading;
  const hasError = subjectError || frameworksError;

  return (
    <TenantGuard>
      <PermissionGuard allowedRoles={['ADMIN', 'INSTRUCTOR']}>
        <div className="space-y-6">
          <CambridgeWorkflowNav />
          <CambridgeBreadcrumb
            segments={[
              { label: 'Cambridge', href: '/cambridge' },
              { label: 'Setup', href: '/cambridge/setup' },
              programme?.id
                ? { label: programme.title, href: `/cambridge/setup/programmes/${programme.id}/subjects` }
                : { label: subject?.programme_code ?? 'Programme' },
              { label: subject?.display_name ?? 'Subject' },
              { label: 'Frameworks' },
            ]}
          />

          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">Subject Frameworks</h1>
              <p className="mt-1 text-sm text-gray-500">
                Installation-side framework inspection for the selected subject.
              </p>
            </div>
            {programme?.id ? (
              <Link
                href={`/cambridge/setup/programmes/${programme.id}/subjects`}
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                Back to Programme Subjects
              </Link>
            ) : null}
          </div>

          {loading ? <LoadingSpinner fullScreen={false} message="Loading subject frameworks..." /> : null}
          {hasError && errorVisible ? (
            <ErrorBanner message="Failed to load subject frameworks." onDismiss={() => setErrorVisible(false)} />
          ) : null}

          {!loading && !subject ? (
            <Card>
              <h2 className="font-semibold text-gray-900">Subject not found</h2>
              <p className="mt-2 text-sm text-gray-600">
                Return to the programme subject list and choose a valid subject.
              </p>
            </Card>
          ) : null}

          {!loading && subject && subject.structure_mode === 'QUALIFICATION' ? (
            <Card>
              <h2 className="font-semibold text-gray-900">Qualification-mode subject</h2>
              <p className="mt-2 text-sm text-gray-600">
                This subject uses a syllabus structure, not frameworks.
              </p>
              <Link
                href={`/cambridge/setup/subjects/${subject.id}/syllabuses`}
                className="mt-3 inline-flex items-center rounded-lg border border-blue-200 px-3 py-2 text-sm text-blue-700 hover:bg-blue-50"
              >
                Manage Syllabuses
              </Link>
            </Card>
          ) : null}

          {!loading && subject && subject.structure_mode !== 'QUALIFICATION' ? (
            <Card>
              <h2 className="font-semibold text-gray-900">{subject.display_name}</h2>
              <p className="mt-1 text-sm text-gray-600">
                {subject.subject_code ?? 'No code'} · {modeLabel(subject.structure_mode ?? 'FRAMEWORK')}
              </p>

              {subjectFrameworks.length === 0 ? (
                <div className="mt-4 rounded-lg border border-dashed border-gray-300 p-4">
                  <p className="text-sm text-gray-600">No current frameworks are visible for this subject.</p>
                  <p className="mt-1 text-sm text-gray-500">
                    The installation can only inspect frameworks already projected from the active Cambridge profile.
                  </p>
                </div>
              ) : (
                <ul className="mt-4 space-y-3">
                  {subjectFrameworks.map((framework) => (
                    <li key={framework.id} className="rounded-lg border border-gray-200 p-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="font-medium text-gray-900">{framework.version_label}</p>
                          <p className="text-sm text-gray-600">
                            {framework.effective_from} - {framework.effective_to ?? 'Current'}
                          </p>
                          <p className="mt-1 text-xs text-gray-500">
                            {framework.strands.length} strands · {framework.is_current ? 'Current' : 'Archived'}
                          </p>
                        </div>
                        <Link
                          href={`/cambridge/setup/frameworks/${framework.id}/strands`}
                          className="inline-flex items-center rounded-lg border border-blue-200 px-3 py-2 text-sm text-blue-700 hover:bg-blue-50"
                        >
                          Manage Strands
                        </Link>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          ) : null}
        </div>
      </PermissionGuard>
    </TenantGuard>
  );
}
