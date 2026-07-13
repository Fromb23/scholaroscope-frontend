'use client';

import { useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowRight } from 'lucide-react';
import { Badge } from '@/app/components/ui/Badge';
import { Card } from '@/app/components/ui/Card';
import { AppErrorBanner } from '@/app/components/ui/errors';
import { Input } from '@/app/components/ui/Input';
import { LoadingSpinner } from '@/app/components/ui/LoadingSpinner';
import { Select } from '@/app/components/ui/Select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/app/components/ui/Table';
import { resolvePluginError } from '@/app/core/errors';
import { useCohorts } from '@/app/core/hooks/useCohorts';
import { useSubjects, useTerms, useCurrentTerm } from '@/app/core/hooks/useAcademic';
import { useSchemeCompliance } from '@/app/core/hooks/useSchemes';
import type { SchemeComplianceQueryParams, SchemeComplianceRow } from '@/app/core/types/schemes';

const COMPLIANCE_OPTIONS = [
  { value: '', label: 'All compliance' },
  { value: 'COMPLETE', label: 'Complete' },
  { value: 'PARTIAL', label: 'Partial' },
  { value: 'MISSING', label: 'Missing' },
  { value: 'NEEDS_REVIEW', label: 'Needs Review' },
  { value: 'NOT_EXPECTED', label: 'Not expected' },
] as const;

function statusVariant(status: SchemeComplianceRow['status']) {
  if (status === 'COMPLETE') return 'success';
  if (status === 'NEEDS_REVIEW' || status === 'MISSING') return 'danger';
  if (status === 'PARTIAL') return 'warning';
  return 'default';
}

function joinNames(items: Array<{ name: string }>) {
  return items.map((item) => item.name).filter(Boolean).join(', ') || 'Not assigned';
}

function toNumber(value: string | null): number | undefined {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function SchemeComplianceOverview() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { terms } = useTerms();
  const { currentTerm } = useCurrentTerm();
  const { subjects } = useSubjects();
  const { cohorts } = useCohorts();
  const termId = searchParams.get('term_id') || (currentTerm?.id ? String(currentTerm.id) : '');
  const page = toNumber(searchParams.get('page')) ?? 1;

  useEffect(() => {
    if (searchParams.get('term_id') || !termId) return;
    const next = new URLSearchParams(searchParams.toString());
    next.set('term_id', termId);
    router.replace(`/schemes?${next.toString()}`, { scroll: false });
  }, [router, searchParams, termId]);

  const queryParams = useMemo<SchemeComplianceQueryParams | null>(() => {
    if (!termId) return null;
    return {
      term_id: termId,
      subject_id: searchParams.get('subject_id') || undefined,
      cohort_id: searchParams.get('cohort_id') || undefined,
      search: searchParams.get('search') || undefined,
      compliance: (searchParams.get('compliance') as SchemeComplianceQueryParams['compliance']) || '',
      page,
      page_size: 25,
    };
  }, [page, searchParams, termId]);
  const { data, loading, error } = useSchemeCompliance(queryParams);
  const resolvedError = error
    ? resolvePluginError(error, {
      action: 'load',
      entityLabel: 'scheme compliance',
    })
    : null;

  const updateParam = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    next.delete('page');
    router.replace(`/schemes?${next.toString()}`, { scroll: false });
  };
  const setCompliance = (value: string) => updateParam('compliance', value);
  const summary = data?.summary;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold theme-text">Schemes of Work</h1>
      </div>

      <Card>
        <div className="grid gap-3 p-4 md:grid-cols-5">
          <Input
            placeholder="Search teacher"
            value={searchParams.get('search') || ''}
            onChange={(event) => updateParam('search', event.target.value)}
          />
          <Select
            value={termId}
            onChange={(event) => updateParam('term_id', event.target.value)}
            options={[
              { value: '', label: 'Term' },
              ...terms.map((term) => ({ value: term.id, label: term.name })),
            ]}
          />
          <Select
            value={searchParams.get('subject_id') || ''}
            onChange={(event) => updateParam('subject_id', event.target.value)}
            options={[
              { value: '', label: 'Subject' },
              ...subjects.map((subject) => ({ value: subject.id, label: subject.name })),
            ]}
          />
          <Select
            value={searchParams.get('cohort_id') || ''}
            onChange={(event) => updateParam('cohort_id', event.target.value)}
            options={[
              { value: '', label: 'Cohort' },
              ...cohorts.map((cohort) => ({ value: cohort.id, label: cohort.name })),
            ]}
          />
          <Select
            value={searchParams.get('compliance') || ''}
            onChange={(event) => setCompliance(event.target.value)}
            options={COMPLIANCE_OPTIONS.map((option) => ({ value: option.value, label: option.label }))}
          />
        </div>
      </Card>

      {resolvedError ? <AppErrorBanner error={resolvedError} /> : null}

      <div className="grid gap-3 md:grid-cols-5">
        {[
          ['Total Teachers', summary?.total_instructors ?? 0, ''],
          ['Complete', summary?.complete ?? 0, 'COMPLETE'],
          ['Partial', summary?.partial ?? 0, 'PARTIAL'],
          ['Missing', summary?.missing ?? 0, 'MISSING'],
          ['Needs Review', summary?.needs_review ?? 0, 'NEEDS_REVIEW'],
        ].map(([label, value, filter]) => (
          <button
            key={label}
            type="button"
            onClick={() => setCompliance(String(filter))}
            className="rounded-lg border theme-border theme-surface p-4 text-left transition-colors hover:bg-gray-50"
          >
            <p className="text-xs font-medium uppercase text-gray-500">{label}</p>
            <p className="mt-2 text-2xl font-semibold theme-text">{value}</p>
          </button>
        ))}
      </div>

      <Card>
        {loading ? (
          <LoadingSpinner message="Loading scheme compliance..." />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Instructor</TableHead>
                <TableHead>Subjects / classes</TableHead>
                <TableHead>Expected</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead>Generated</TableHead>
                <TableHead>Missing</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(data?.results ?? []).map((row) => (
                <TableRow
                  key={row.instructor_id}
                  onClick={() => router.push(`/admin/instructors/${row.instructor_id}/progress#schemes`)}
                >
                  <TableCell>
                    <div>
                      <p className="font-medium">{row.instructor_name}</p>
                      <p className="text-xs text-gray-500">{row.instructor_email}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <p>{joinNames(row.subjects)}</p>
                      <p className="text-xs text-gray-500">{joinNames(row.cohorts)}</p>
                    </div>
                  </TableCell>
                  <TableCell>{row.expected}</TableCell>
                  <TableCell>{row.submitted}</TableCell>
                  <TableCell>{row.generated}</TableCell>
                  <TableCell>{row.missing}</TableCell>
                  <TableCell><Badge variant={statusVariant(row.status)}>{row.status_label}</Badge></TableCell>
                  <TableCell><ArrowRight className="h-4 w-4" /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
