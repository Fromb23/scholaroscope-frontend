'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/app/components/ui/Button';
import { Input } from '@/app/components/ui/Input';
import { Select } from '@/app/components/ui/Select';
import { resolveAssignmentError } from '@/app/core/errors';
import { useSaveAssignmentGroupWorkReview } from '@/app/core/hooks/useAssignments';
import type { RubricLevel } from '@/app/core/types/assessment';
import type {
  Assignment,
  AssignmentEvidenceProjectionMode,
  AssignmentGroup,
  AssignmentGroupEvaluation,
  AssignmentGroupMemberParticipationStatus,
  AssignmentGroupMemberEvaluationOverridePayload,
  AssignmentGroupWorkReviewPayload,
} from '@/app/core/types/assignments';

interface Props {
  assignment: Assignment;
  group: AssignmentGroup;
  evaluation?: AssignmentGroupEvaluation | null;
  rubricLevels?: RubricLevel[];
  onSaved?: () => void | Promise<void>;
  onSaveAndNext?: () => void | Promise<void>;
  pending?: boolean;
  readOnly?: boolean;
}

type FieldName = 'numeric_score' | 'rubric_level' | 'competency_state' | 'narrative' | 'member_overrides';
type FieldErrors = Partial<Record<FieldName, string>>;

const participationOptions = [
  'PARTICIPATED', 'ABSENT', 'DID_NOT_PARTICIPATE', 'EXCUSED', 'LATE_ADDED',
].map((value) => ({ value, label: value.replaceAll('_', ' ').toLowerCase().replace(/^./, (c) => c.toUpperCase()) }));

export function AssignmentGroupReviewForm({
  assignment, group, evaluation = null, rubricLevels = [], onSaved, onSaveAndNext,
  pending = false, readOnly = false,
}: Props) {
  const mutation = useSaveAssignmentGroupWorkReview();
  const [numericScore, setNumericScore] = useState('');
  const [rubricLevel, setRubricLevel] = useState('');
  const [competencyState, setCompetencyState] = useState('');
  const [narrative, setNarrative] = useState('');
  const [projectionMode, setProjectionMode] = useState<AssignmentEvidenceProjectionMode>('APPLY_TO_ALL_MEMBERS');
  const [participation, setParticipation] = useState<Record<number, AssignmentGroupMemberParticipationStatus>>({});
  const [overrides, setOverrides] = useState<Record<number, { enabled: boolean; value: string }>>({});
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const fieldRefs = useRef<Partial<Record<FieldName, HTMLElement | null>>>({});

  useEffect(() => {
    setNumericScore(evaluation?.numeric_score == null ? '' : String(evaluation.numeric_score));
    setRubricLevel(evaluation?.rubric_level == null ? '' : String(evaluation.rubric_level));
    setCompetencyState(evaluation?.competency_state ?? '');
    setNarrative(evaluation?.narrative ?? '');
    setProjectionMode(evaluation?.projection_mode ?? 'APPLY_TO_ALL_MEMBERS');
    setParticipation(Object.fromEntries((group.members ?? []).map((member) => [member.id, member.participation_status])));
    const existing = new Map((evaluation?.member_overrides ?? []).map((item) => [item.student, item]));
    setOverrides(Object.fromEntries((group.members ?? []).map((member) => {
      const item = existing.get(member.student);
      const value = assignment.evaluation_type === 'RUBRIC' ? item?.rubric_level : assignment.evaluation_type === 'NUMERIC' ? item?.numeric_score : assignment.evaluation_type === 'COMPETENCY' ? item?.competency_state : item?.narrative;
      return [member.id, { enabled: Boolean(item), value: value == null ? '' : String(value) }];
    })));
    setFieldErrors({});
    setActionMessage(null);
  }, [assignment.evaluation_type, evaluation, group]);

  const clearFieldError = (field: FieldName) => {
    setFieldErrors((current) => ({ ...current, [field]: undefined }));
    setActionMessage(null);
  };

  const focusFirstError = (errors: FieldErrors) => {
    const order: FieldName[] = ['rubric_level', 'numeric_score', 'competency_state', 'narrative', 'member_overrides'];
    const first = order.find((field) => errors[field]);
    if (!first) return;
    const element = fieldRefs.current[first];
    element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    element?.focus({ preventScroll: true });
  };

  const validate = (): FieldErrors => {
    if (assignment.evaluation_type === 'RUBRIC' && !rubricLevel) return { rubric_level: 'Select a rubric level.' };
    if (assignment.evaluation_type === 'NUMERIC' && !numericScore) return { numeric_score: 'Enter a numeric score.' };
    if (assignment.evaluation_type === 'COMPETENCY' && !competencyState) return { competency_state: 'Select a competency state.' };
    if (assignment.evaluation_type === 'DESCRIPTIVE' && !narrative.trim()) return { narrative: 'Enter narrative feedback.' };
    if (projectionMode === 'APPLY_WITH_OVERRIDES' && Object.values(overrides).some((item) => item.enabled && !item.value.trim())) return { member_overrides: 'Enter a value for each enabled member override.' };
    return {};
  };

  const overridePayloads = useMemo(() => (group.members ?? []).flatMap<AssignmentGroupMemberEvaluationOverridePayload>((member) => {
    const item = overrides[member.id];
    if (projectionMode !== 'APPLY_WITH_OVERRIDES' || !item?.enabled) return [];
    const value = item.value.trim();
    return [{ student_id: member.student, ...(assignment.evaluation_type === 'RUBRIC' ? { rubric_level: Number(value) } : assignment.evaluation_type === 'NUMERIC' ? { numeric_score: Number(value) } : assignment.evaluation_type === 'COMPETENCY' ? { competency_state: value } : { narrative: value }) }];
  }), [assignment.evaluation_type, group.members, overrides, projectionMode]);

  const payload = useMemo<Omit<AssignmentGroupWorkReviewPayload, 'action'>>(() => ({
    evaluation_type: assignment.evaluation_type,
    numeric_score: numericScore ? Number(numericScore) : null,
    rubric_level: rubricLevel ? Number(rubricLevel) : null,
    competency_state: competencyState || null,
    narrative: narrative.trim(),
    projection_mode: projectionMode,
    member_overrides: overridePayloads,
    participation: (group.members ?? []).map((member) => ({
      group_member: member.id,
      participation_status: participation[member.id] ?? member.participation_status,
      participation_note: member.participation_note ?? '',
    })),
  }), [assignment.evaluation_type, competencyState, group.members, narrative, numericScore, overridePayloads, participation, projectionMode, rubricLevel]);

  const save = async (action: 'SAVE_DRAFT' | 'COMPLETE', advance = false) => {
    setActionMessage(null);
    if (action === 'COMPLETE') {
      const errors = validate();
      if (Object.keys(errors).length) {
        setFieldErrors(errors);
        setActionMessage(`Review incomplete — ${Object.values(errors)[0]?.toLowerCase()}`);
        focusFirstError(errors);
        return;
      }
    }
    try {
      await mutation.mutateAsync({ groupId: group.id, data: { ...payload, action } });
      setFieldErrors({});
      setActionMessage(action === 'SAVE_DRAFT' ? 'Draft saved.' : 'Review completed.');
      await onSaved?.();
      if (advance) await onSaveAndNext?.();
    } catch (error) {
      const resolved = resolveAssignmentError(error, { action: 'review', entityLabel: 'group review', channel: 'inline' });
      const mapped = Object.fromEntries(
        Object.entries(resolved.fieldErrors ?? {})
          .filter(([field]) => ['rubric_level', 'numeric_score', 'competency_state', 'narrative', 'member_overrides'].includes(field))
          .map(([field, messages]) => [field, messages[0]])
      ) as FieldErrors;
      setFieldErrors(mapped);
      setActionMessage(Object.keys(mapped).length ? `Review incomplete — ${Object.values(mapped)[0]?.toLowerCase()}` : resolved.message);
      focusFirstError(mapped);
    }
  };

  const saving = pending || mutation.isPending;
  const common = { disabled: readOnly || saving };
  return (
    <section className="space-y-4 rounded-lg border theme-border p-4" aria-labelledby="group-review-heading">
      <h3 id="group-review-heading" tabIndex={-1} className="scroll-mt-28 text-base font-semibold theme-text">Review group work</h3>
      {assignment.evaluation_type === 'NUMERIC' ? (
        <Input ref={(node) => { fieldRefs.current.numeric_score = node; }} id="group-review-numeric-score" label="Numeric score" type="number" min="0" max={assignment.total_marks ?? undefined} value={numericScore} error={fieldErrors.numeric_score} onChange={(event) => { setNumericScore(event.target.value); clearFieldError('numeric_score'); }} {...common} />
      ) : null}
      {assignment.evaluation_type === 'RUBRIC' ? (
        <Select ref={(node) => { fieldRefs.current.rubric_level = node; }} id="group-review-rubric-level" label="Rubric level" value={rubricLevel} error={fieldErrors.rubric_level} options={[{ value: '', label: 'Select rubric level' }, ...rubricLevels.map((level) => ({ value: level.id, label: `${level.label} (${level.code})` }))]} onChange={(event) => { setRubricLevel(event.target.value); clearFieldError('rubric_level'); }} {...common} />
      ) : null}
      {assignment.evaluation_type === 'COMPETENCY' ? (
        <Select ref={(node) => { fieldRefs.current.competency_state = node; }} id="group-review-competency-state" label="Competency state" value={competencyState} error={fieldErrors.competency_state} options={[{ value: '', label: 'Select competency state' }, { value: 'EMERGING', label: 'Emerging' }, { value: 'MEETING', label: 'Meeting expectation' }, { value: 'EXCEEDING', label: 'Exceeding expectation' }, { value: 'NOT_EVIDENCED', label: 'Not evidenced' }]} onChange={(event) => { setCompetencyState(event.target.value); clearFieldError('competency_state'); }} {...common} />
      ) : null}
      <div>
        <label htmlFor="group-review-narrative" className="block text-sm font-medium theme-text">{assignment.evaluation_type === 'DESCRIPTIVE' ? 'Narrative feedback' : 'Review notes'}</label>
        <textarea ref={(node) => { fieldRefs.current.narrative = node; }} id="group-review-narrative" rows={4} value={narrative} aria-invalid={Boolean(fieldErrors.narrative)} aria-describedby={fieldErrors.narrative ? 'group-review-narrative-error' : undefined} className={`theme-focus-ring theme-input mt-1 w-full scroll-mt-28 rounded-lg px-4 py-3 ${fieldErrors.narrative ? 'theme-input-error' : ''}`} onChange={(event) => { setNarrative(event.target.value); clearFieldError('narrative'); }} {...common} />
        {fieldErrors.narrative ? <p id="group-review-narrative-error" className="mt-1 text-sm text-[color:var(--color-danger)]">{fieldErrors.narrative}</p> : null}
      </div>
      <Select label="Evidence projection" value={projectionMode} options={[{ value: 'APPLY_TO_ALL_MEMBERS', label: 'Apply to all participating members' }, { value: 'APPLY_WITH_OVERRIDES', label: 'Apply with individual overrides' }, { value: 'RECORD_ONLY', label: 'Record only' }]} onChange={(event) => setProjectionMode(event.target.value as AssignmentEvidenceProjectionMode)} {...common} />
      {projectionMode === 'APPLY_WITH_OVERRIDES' ? <div ref={(node) => { fieldRefs.current.member_overrides = node; }} tabIndex={-1} className="scroll-mt-28 space-y-3 rounded-lg border theme-border p-4" aria-invalid={Boolean(fieldErrors.member_overrides)} aria-describedby={fieldErrors.member_overrides ? 'member-overrides-error' : undefined}>
        <h4 className="text-sm font-medium theme-text">Individual member overrides</h4>
        {(group.members ?? []).map((member) => {
          const item = overrides[member.id] ?? { enabled: false, value: '' };
          return <div key={member.id} className="grid gap-2 sm:grid-cols-[1fr_14rem]">
            <label className="flex items-center gap-2 text-sm theme-text"><input type="checkbox" checked={item.enabled} disabled={readOnly || saving} onChange={(event) => setOverrides((current) => ({ ...current, [member.id]: { ...item, enabled: event.target.checked } }))} />{member.student_name}</label>
            {item.enabled ? assignment.evaluation_type === 'RUBRIC' ? <Select aria-label={`Rubric override for ${member.student_name}`} value={item.value} options={[{ value: '', label: 'Select level' }, ...rubricLevels.map((level) => ({ value: level.id, label: level.label }))]} onChange={(event) => { setOverrides((current) => ({ ...current, [member.id]: { enabled: true, value: event.target.value } })); clearFieldError('member_overrides'); }} {...common} /> : <Input aria-label={`Override for ${member.student_name}`} type={assignment.evaluation_type === 'NUMERIC' ? 'number' : 'text'} value={item.value} onChange={(event) => { setOverrides((current) => ({ ...current, [member.id]: { enabled: true, value: event.target.value } })); clearFieldError('member_overrides'); }} {...common} /> : null}
          </div>;
        })}
        {fieldErrors.member_overrides ? <p id="member-overrides-error" className="text-sm text-[color:var(--color-danger)]">{fieldErrors.member_overrides}</p> : null}
      </div> : null}
      <div className="space-y-3 rounded-lg border theme-border theme-surface-muted p-4">
        <h4 className="text-sm font-medium theme-text">Group members and participation</h4>
        {(group.members ?? []).map((member) => (
          <div key={member.id} className="grid gap-2 sm:grid-cols-[1fr_14rem] sm:items-center">
            <span className="text-sm theme-text">{member.student_name} <span className="theme-subtle">({member.admission_number})</span></span>
            <Select aria-label={`Participation for ${member.student_name}`} value={participation[member.id] ?? member.participation_status} options={participationOptions} onChange={(event) => setParticipation((current) => ({ ...current, [member.id]: event.target.value as AssignmentGroupMemberParticipationStatus }))} {...common} />
          </div>
        ))}
      </div>
      {actionMessage ? <p role="status" className={Object.keys(fieldErrors).length ? 'text-sm text-[color:var(--color-danger)]' : 'text-sm theme-muted'}>{actionMessage}</p> : null}
      {!readOnly ? <div className="flex flex-wrap justify-end gap-2">
        <Button type="button" variant="secondary" disabled={saving} onClick={() => void save('SAVE_DRAFT')}>Save draft</Button>
        <Button type="button" variant="secondary" disabled={saving} onClick={() => void save('COMPLETE')}>Complete review</Button>
        <Button type="button" disabled={saving} onClick={() => void save('COMPLETE', true)}>Complete review &amp; next</Button>
      </div> : null}
    </section>
  );
}
