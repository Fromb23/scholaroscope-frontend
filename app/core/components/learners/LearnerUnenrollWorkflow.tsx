'use client';

import { useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/app/components/ui/Button';
import { Card } from '@/app/components/ui/Card';
import { ErrorBanner } from '@/app/components/ui/ErrorBanner';
import { LoadingSpinner } from '@/app/components/ui/LoadingSpinner';
import { learnersAPI } from '@/app/core/api/learners';
import { parseAppDestination } from '@/app/core/auth/navigation';
import { useStudent } from '@/app/core/hooks/useStudents';
import { isManagementStudentDetail } from '@/app/core/types/student';
import { useAuth } from '@/app/context/AuthContext';

export default function LearnerUnenrollWorkflow() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const learnerId = Number(params.id);
  const cohortId = Number(searchParams.get('fromCohort') ?? 0);
  const returnTo = parseAppDestination(searchParams.get('returnTo')) ?? `/learners/${learnerId}`;
  const { capabilities } = useAuth();
  const { student, loading } = useStudent(learnerId);
  const [effectiveTo, setEffectiveTo] = useState(new Date().toISOString().slice(0, 10));
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [idempotencyKey] = useState(() => crypto.randomUUID());
  const canManagePlacement = Boolean(capabilities.authorization?.permission_keys?.includes('learners.manage_placement') || capabilities.can_manage_learner_placement);
  const detail = isManagementStudentDetail(student) ? student : null;
  const enrollment = detail?.enrollments.find((row) => row.is_active && row.cohort === cohortId) ?? null;

  if (loading) return <LoadingSpinner />;
  if (!canManagePlacement) return <ErrorBanner message="Administrator configuration error: the placement-management permission is missing." onDismiss={() => undefined} />;
  if (!detail || !enrollment) return <ErrorBanner message="The selected active cohort placement was not found." onDismiss={() => undefined} />;

  const submit = async () => {
    if (!reason.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await learnersAPI.unenrollStudent(learnerId, cohortId, {
        end_reason: 'WITHDRAWN',
        effective_to: effectiveTo,
        reason: reason.trim(),
        notes: notes.trim(),
        idempotency_key: idempotencyKey,
      });
      router.replace(returnTo);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unenrolment failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div><p className="text-sm theme-muted">Learner placement</p><h1 className="text-2xl font-semibold">Unenrol from cohort</h1></div>
      {error ? <ErrorBanner message={error} onDismiss={() => setError(null)} /> : null}
      <Card>
        <div className="space-y-4">
          <p><strong>{detail.full_name}</strong> will be unenrolled from <strong>{enrollment.cohort_name}</strong>.</p>
          <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">The learner remains active in the organization and discoverable as awaiting placement. Subject intervals close, while historical attendance, scores, evidence, submissions, evaluations, reports, and projects remain unchanged.</p>
          <label className="block text-sm">Effective end date<input className="mt-1 block w-full rounded-lg border p-2" type="date" value={effectiveTo} onChange={(event) => setEffectiveTo(event.target.value)} /></label>
          <label className="block text-sm">Reason<textarea className="mt-1 block w-full rounded-lg border p-2" required value={reason} onChange={(event) => setReason(event.target.value)} /></label>
          <label className="block text-sm">Notes (optional)<textarea className="mt-1 block w-full rounded-lg border p-2" value={notes} onChange={(event) => setNotes(event.target.value)} /></label>
        </div>
      </Card>
      <div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => router.push(returnTo)}>Cancel</Button><Button disabled={busy || !reason.trim()} onClick={submit}>{busy ? 'Unenrolling...' : 'Confirm unenrolment'}</Button></div>
    </div>
  );
}
