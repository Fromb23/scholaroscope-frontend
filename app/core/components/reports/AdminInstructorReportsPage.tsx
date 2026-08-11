'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Briefcase, Search } from 'lucide-react';
import { Badge } from '@/app/components/ui/Badge';
import { Button } from '@/app/components/ui/Button';
import { Card } from '@/app/components/ui/Card';
import { Input } from '@/app/components/ui/Input';
import { LoadingSpinner } from '@/app/components/ui/LoadingSpinner';
import { ErrorBanner } from '@/app/components/ui/ErrorBanner';
import { Select } from '@/app/components/ui/Select';
import {
  buildReportReturnTo,
  parsePositiveReportParam,
  resolveReportBackHref,
} from '@/app/core/components/reports/reportNavigation';
import { AdminReportAccessGate } from '@/app/core/components/reports/AdminReportAccessGate';
import { useTerms } from '@/app/core/hooks/useAcademic';
import { useHistoricalReportParticipants } from '@/app/core/hooks/useReporting';
import {
  formatWorkTermOptionLabel,
  resolveExplicitWorkTermId,
  resolveWorkSelectedTermId,
} from '@/app/core/components/academic/terms/termSelection';

function buildHistoricalInstructorReportHref(
  participantId: string,
  options: { term: number | null; returnTo: string },
): string {
  const params = new URLSearchParams({ returnTo: options.returnTo });
  if (options.term) params.set('term', String(options.term));
  return `/reports/instructors/${participantId}?${params.toString()}`;
}

export function AdminInstructorReportsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const requestedTermId = parsePositiveReportParam(searchParams.get('term'));
  const searchQuery = (searchParams.get('q') ?? '').trim().toLowerCase();
  const backHref = resolveReportBackHref({
    returnTo: searchParams.get('returnTo'),
    fallbackHref: '/reports',
    fallbackState: { term: requestedTermId },
  });

  const { terms, loading: termsLoading } = useTerms();
  const selectedTermId = useMemo(() => resolveWorkSelectedTermId({
    requestedTermId,
    terms,
  }), [requestedTermId, terms]);
  const { participants, loading, error } = useHistoricalReportParticipants();

  const updateQuery = useCallback((updates: Record<string, string | number | null>) => {
    const nextParams = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === '') {
        nextParams.delete(key);
      } else {
        nextParams.set(key, String(value));
      }
    });

    const nextUrl = nextParams.toString() ? `${pathname}?${nextParams.toString()}` : pathname;
    router.replace(nextUrl, { scroll: false });
  }, [pathname, router, searchParams]);

  useEffect(() => {
    if (termsLoading || terms.length === 0) {
      return;
    }
    const rawQueryTerm = searchParams.get('term');
    if (!rawQueryTerm || resolveExplicitWorkTermId(requestedTermId, terms) !== null) {
      return;
    }
    updateQuery({ term: null });
  }, [requestedTermId, searchParams, terms, terms.length, termsLoading, updateQuery]);

  const visibleInstructors = useMemo(() => {
    if (!searchQuery) {
      return participants;
    }

    return participants.filter((instructor) => {
      const haystack = [
        instructor.display_name,
        instructor.status,
      ].join(' ').toLowerCase();
      return haystack.includes(searchQuery);
    });
  }, [participants, searchQuery]);

  const currentReturnTo = buildReportReturnTo(pathname, searchParams.toString());

  return (
    <AdminReportAccessGate>
      <div className="space-y-6 max-w-full">
        <div className="min-w-0">
          <Link href={backHref}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
          </Link>
          <div className="mt-3">
            <h1 className="text-2xl font-semibold text-gray-900">Instructor Reports</h1>
            <p className="mt-1 max-w-3xl text-sm text-gray-500">
              Open an instructor report from the same reporting term you are already working in.
            </p>
          </div>
        </div>

        <Card className="max-w-full">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
            <Input
              label="Find instructor"
              value={searchParams.get('q') ?? ''}
              onChange={(event) => updateQuery({ q: event.target.value || null })}
              placeholder="Search by instructor name or email"
            />
            <Select
              label="Term"
              value={selectedTermId ? String(selectedTermId) : ''}
              onChange={(event) => updateQuery({ term: event.target.value ? Number(event.target.value) : null })}
              disabled={termsLoading}
              options={[
                { value: '', label: selectedTermId ? 'Use active term' : 'No term selected' },
                ...terms.map((term) => ({
                  value: String(term.id),
                  label: formatWorkTermOptionLabel(term),
                })),
              ]}
            />
          </div>
        </Card>

        {error ? (
          <ErrorBanner
            message={error}
            onDismiss={() => undefined}
          />
        ) : null}

        {loading ? <LoadingSpinner message="Loading instructors..." /> : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {visibleInstructors.map((instructor) => (
              <Link
                key={instructor.participant_id}
                href={buildHistoricalInstructorReportHref(instructor.participant_id, {
                  term: selectedTermId,
                  returnTo: currentReturnTo,
                })}
                className="group block"
              >
                <Card className="h-full">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <div className="rounded-xl bg-indigo-50 p-3 text-indigo-600">
                          <Briefcase className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                          <h2 className="truncate text-base font-semibold text-gray-900">
                            {instructor.display_name}
                          </h2>
                          <p className="truncate text-sm text-gray-500">
                            {instructor.status === 'FORMER' ? 'Former instructor' : 'Active instructor'}
                          </p>
                        </div>
                      </div>
                    </div>
                    <Badge variant={instructor.status === 'FORMER' ? 'default' : 'blue'}>
                      {instructor.status === 'FORMER' ? 'Former' : 'Active'}
                    </Badge>
                  </div>
                </Card>
              </Link>
            ))}

            {visibleInstructors.length === 0 ? (
              <Card className="md:col-span-2 xl:col-span-3">
                <div className="py-12 text-center">
                  <Search className="mx-auto h-10 w-10 text-gray-300" />
                  <p className="mt-2 text-sm text-gray-500">No instructors matched this search.</p>
                </div>
              </Card>
            ) : null}
          </div>
        )}
      </div>
    </AdminReportAccessGate>
  );
}
