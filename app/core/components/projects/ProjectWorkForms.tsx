'use client';

import { useState, type FormEvent } from 'react';
import { Button } from '@/app/components/ui/Button';
import type { ProjectDeployment, ProjectTaskEvaluation } from '@/app/core/types/projects';

export function ProjectCriteriaForm({
  project,
  evaluation,
  pending,
  onCancel,
  onSubmit,
}: {
  project: ProjectDeployment;
  evaluation: ProjectTaskEvaluation;
  pending: boolean;
  onCancel: () => void;
  onSubmit: (
    scores: Array<{ criterion: number; awarded_marks: string; feedback?: string }>,
  ) => Promise<void>;
}) {
  const task = project.definition?.tasks.find((item) => item.id === evaluation.task);
  const [scores, setScores] = useState<Record<number, string>>(() =>
    Object.fromEntries(
      evaluation.criterion_scores.map((item) => [item.criterion, item.awarded_marks]),
    ),
  );
  const [feedback, setFeedback] = useState<Record<number, string>>(() =>
    Object.fromEntries(evaluation.criterion_scores.map((item) => [item.criterion, item.feedback])),
  );
  const criteria = task?.criteria ?? [];
  const submit = (event: FormEvent) => {
    event.preventDefault();
    return void onSubmit(
      criteria.map((criterion) => ({
        criterion: criterion.id,
        awarded_marks: scores[criterion.id] ?? '',
        feedback: feedback[criterion.id] ?? '',
      })),
    ).catch(() => undefined);
  };
  return (
    <form className="space-y-4" onSubmit={submit}>
      <p className="text-sm theme-muted">
        Each score is validated against the criterion maximum by the server.
      </p>
      {criteria.map((criterion) => (
        <div
          key={criterion.id}
          className="grid gap-3 rounded-lg border theme-border p-3 sm:grid-cols-[1fr_9rem]"
        >
          <div>
            <p className="font-medium theme-text">
              {criterion.code} · {criterion.description}
            </p>
            <p className="text-xs theme-subtle">Maximum {criterion.maximum_marks}</p>
            <label className="mt-2 block text-xs theme-muted">
              Criterion feedback for this learner
              <textarea
                className="theme-input mt-1 min-h-20 w-full rounded-lg px-3 py-2 text-sm"
                value={feedback[criterion.id] ?? ''}
                onChange={(event) =>
                  setFeedback((current) => ({ ...current, [criterion.id]: event.target.value }))
                }
              />
            </label>
          </div>
          <input
            className="theme-input rounded-lg px-3 py-2"
            type="number"
            min="0"
            max={criterion.maximum_marks}
            step="0.01"
            required
            value={scores[criterion.id] ?? ''}
            onChange={(event) =>
              setScores((current) => ({ ...current, [criterion.id]: event.target.value }))
            }
            aria-label={`Marks for ${criterion.code}`}
          />
        </div>
      ))}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={
            pending || !criteria.length || criteria.some((criterion) => !scores[criterion.id])
          }
        >
          {pending ? 'Saving…' : 'Save criterion scores'}
        </Button>
      </div>
    </form>
  );
}
