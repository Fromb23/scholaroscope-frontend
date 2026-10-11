'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, ArrowRight, CheckCircle2 } from 'lucide-react';
import { Button } from '@/app/components/ui/Button';
import { Card } from '@/app/components/ui/Card';
import { ErrorBanner } from '@/app/components/ui/ErrorBanner';
import { LoadingSpinner } from '@/app/components/ui/LoadingSpinner';
import { learnersAPI } from '@/app/core/api/learners';
import { parseAppDestination } from '@/app/core/auth/navigation';
import { useStudent } from '@/app/core/hooks/useStudents';
import type { EligibleTransferCohort, TransferPreview } from '@/app/core/types/student';
import { isManagementStudentDetail } from '@/app/core/types/student';
import { useAuth } from '@/app/context/AuthContext';

const STEPS = ['Current placement', 'Destination', 'Impact preview', 'Transfer details', 'Review and confirm'];

function message(error: unknown): string {
  if (error instanceof Error) return error.message;
  return 'The placement workflow could not be completed.';
}

export default function LearnerTransferWorkflow() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const learnerId = Number(params.id);
  const returnTo = parseAppDestination(searchParams.get('returnTo')) ?? `/learners/${learnerId}`;
  const fromCohort = Number(searchParams.get('fromCohort') ?? 0);
  const { capabilities } = useAuth();
  const { student, loading } = useStudent(learnerId);
  const [step, setStep] = useState(0);
  const [destinations, setDestinations] = useState<EligibleTransferCohort[]>([]);
  const [destinationId, setDestinationId] = useState<number | null>(null);
  const [preview, setPreview] = useState<TransferPreview | null>(null);
  const [selectedOptional, setSelectedOptional] = useState<number[]>([]);
  const [effectiveFrom, setEffectiveFrom] = useState(new Date().toISOString().slice(0, 10));
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [idempotencyKey] = useState(() => crypto.randomUUID());

  const canManagePlacement = Boolean(
    capabilities.authorization?.permission_keys?.includes('learners.manage_placement')
      || capabilities.can_manage_learner_placement,
  );
  const managementStudent = isManagementStudentDetail(student) ? student : null;
  const current = managementStudent?.enrollments.find((row) => (
    row.is_active && row.enrollment_type === 'PRIMARY' && (!fromCohort || row.cohort === fromCohort)
  )) ?? null;
  const destination = useMemo(
    () => destinations.find((row) => row.id === destinationId) ?? null,
    [destinationId, destinations],
  );

  useEffect(() => {
    if (!canManagePlacement) return;
    let active = true;
    setBusy(true);
    learnersAPI.getEligibleTransferCohorts(learnerId)
      .then((rows) => { if (active) setDestinations(rows); })
      .catch((cause) => { if (active) setError(message(cause)); })
      .finally(() => { if (active) setBusy(false); });
    return () => { active = false; };
  }, [canManagePlacement, learnerId]);

  const loadPreview = async (nextStep = 2) => {
    if (!destinationId) return;
    setBusy(true);
    setError(null);
    try {
      setPreview(await learnersAPI.previewTransfer(learnerId, destinationId, selectedOptional));
      setStep(nextStep);
    } catch (cause) {
      setError(message(cause));
    } finally {
      setBusy(false);
    }
  };

  const submit = async () => {
    if (!destinationId || !reason.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await learnersAPI.transferStudent(learnerId, {
        new_cohort: destinationId,
        effective_from: effectiveFrom,
        reason: reason.trim(),
        notes: notes.trim(),
        optional_subject_ids: selectedOptional,
        idempotency_key: idempotencyKey,
      });
      router.replace(returnTo);
    } catch (cause) {
      setError(message(cause));
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <LoadingSpinner />;
  if (!canManagePlacement) {
    return <ErrorBanner message="Administrator configuration error: the placement-management permission is missing." onDismiss={() => undefined} />;
  }
  if (!managementStudent || !current) {
    return <ErrorBanner message="This learner has no active primary placement to transfer." onDismiss={() => undefined} />;
  }

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm theme-muted">Learner placement</p>
          <h1 className="text-2xl font-semibold theme-text">Move to another cohort</h1>
        </div>
        <Button variant="secondary" onClick={() => router.push(returnTo)}>Cancel</Button>
      </div>
      <ol className="grid gap-2 sm:grid-cols-5">
        {STEPS.map((label, index) => (
          <li key={label} className={`rounded-lg border p-2 text-xs ${index === step ? 'border-blue-500 bg-blue-50 text-blue-800' : 'theme-border theme-muted'}`}>
            {index + 1}. {label}
          </li>
        ))}
      </ol>
      {error ? <ErrorBanner message={error} onDismiss={() => setError(null)} /> : null}

      <Card>
        {step === 0 ? (
          <div className="space-y-3">
            <h2 className="text-lg font-semibold">Current placement</h2>
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <div><dt className="theme-muted">Learner</dt><dd>{managementStudent.full_name} ({managementStudent.admission_number})</dd></div>
              <div><dt className="theme-muted">Cohort</dt><dd>{current.cohort_name}</dd></div>
              <div><dt className="theme-muted">Level / pathway / curriculum</dt><dd>{current.cohort_level} · {current.pathway || 'No pathway'} · {current.curriculum_name}</dd></div>
              <div><dt className="theme-muted">Academic year</dt><dd>{current.academic_year || 'Not available'}</dd></div>
              <div><dt className="theme-muted">Placement start</dt><dd>{current.effective_from ?? current.enrolled_date}</dd></div>
            </dl>
            <div><p className="text-sm theme-muted">Active subject participation</p><p className="text-sm">{managementStudent.current_subjects.map((row) => row.name).join(', ') || 'None'}</p></div>
          </div>
        ) : null}

        {step === 1 ? (
          <div className="space-y-3">
            <h2 className="text-lg font-semibold">Choose an eligible destination</h2>
            {destinations.length === 0 && !busy ? <p className="text-sm theme-muted">No eligible destinations are available in the active academic year.</p> : null}
            {destinations.map((row) => (
              <label key={row.id} className="flex cursor-pointer gap-3 rounded-lg border p-3 theme-border">
                <input type="radio" name="destination" checked={destinationId === row.id} onChange={() => { setDestinationId(row.id); setPreview(null); setSelectedOptional([]); }} />
                <span><strong>{row.name}</strong><span className="block text-sm theme-muted">{row.level} · {row.stream || 'No stream'} · {row.pathway || 'No pathway'} · {row.curriculum} · {row.academic_year} · Setup ready</span></span>
              </label>
            ))}
          </div>
        ) : null}

        {step === 2 && preview ? (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Impact preview</h2>
            <p className="text-sm">Close {preview.source_enrollment.cohort_name} and {preview.source_subjects_closing.length} active subject interval(s).</p>
            <div><p className="font-medium">Required subjects registered automatically</p><p className="text-sm theme-muted">{preview.required_subjects.map((row) => row.name).join(', ') || 'None'}</p></div>
            <div className="space-y-2"><p className="font-medium">Eligible optional subjects (explicit selection only)</p>{preview.optional_subjects.map((row) => (
              <label key={row.cohort_subject_id} className="flex gap-2 text-sm"><input type="checkbox" checked={selectedOptional.includes(row.cohort_subject_id)} onChange={(event) => setSelectedOptional((currentIds) => event.target.checked ? [...currentIds, row.cohort_subject_id] : currentIds.filter((id) => id !== row.cohort_subject_id))} />{row.name}</label>
            ))}</div>
            <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">{preview.impact_notice} Future empty attendance placeholders in the source may be removed; historical attendance and assessment evidence are unchanged.</p>
          </div>
        ) : null}

        {step === 3 ? (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Transfer details</h2>
            <label className="block text-sm">Effective date<input className="mt-1 block w-full rounded-lg border p-2" type="date" value={effectiveFrom} onChange={(event) => setEffectiveFrom(event.target.value)} required /></label>
            <label className="block text-sm">Reason<textarea className="mt-1 block w-full rounded-lg border p-2" value={reason} onChange={(event) => setReason(event.target.value)} required /></label>
            <label className="block text-sm">Notes (optional)<textarea className="mt-1 block w-full rounded-lg border p-2" value={notes} onChange={(event) => setNotes(event.target.value)} /></label>
          </div>
        ) : null}

        {step === 4 && destination && preview ? (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Review and confirm</h2>
            <p><strong>{managementStudent.full_name}</strong>: {current.cohort_name} <ArrowRight className="inline h-4 w-4" /> {destination.name}</p>
            <p className="text-sm">Effective {effectiveFrom}. Reason: {reason}</p>
            <p className="text-sm">Required subjects: {preview.required_subjects.map((row) => row.name).join(', ') || 'None'}</p>
            <p className="text-sm">Optional subjects confirmed: {preview.optional_subjects.filter((row) => selectedOptional.includes(row.cohort_subject_id)).map((row) => row.name).join(', ') || 'None'}</p>
            <p className="flex gap-2 rounded-lg bg-green-50 p-3 text-sm text-green-900"><CheckCircle2 className="h-4 w-4 shrink-0" /> Historical academic records remain in their original scopes.</p>
          </div>
        ) : null}
      </Card>

      <div className="flex justify-between">
        <Button variant="secondary" disabled={step === 0 || busy} onClick={() => setStep((value) => Math.max(0, value - 1))}><ArrowLeft className="h-4 w-4" />Back</Button>
        {step === 0 ? <Button onClick={() => setStep(1)}>Choose destination<ArrowRight className="h-4 w-4" /></Button> : null}
        {step === 1 ? <Button disabled={!destinationId || busy} onClick={() => void loadPreview()}>{busy ? 'Loading...' : 'Preview impact'}<ArrowRight className="h-4 w-4" /></Button> : null}
        {step === 2 ? <Button onClick={() => void loadPreview(3)}>Continue<ArrowRight className="h-4 w-4" /></Button> : null}
        {step === 3 ? <Button disabled={!effectiveFrom || !reason.trim()} onClick={() => setStep(4)}>Review<ArrowRight className="h-4 w-4" /></Button> : null}
        {step === 4 ? <Button disabled={busy} onClick={submit}>{busy ? 'Transferring...' : 'Confirm transfer'}</Button> : null}
      </div>
    </div>
  );
}
