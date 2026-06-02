'use client';

import { useState } from 'react';
import { CheckCircle2, MessageSquareText } from 'lucide-react';
import { Card } from '@/app/components/ui/Card';
import { Button } from '@/app/components/ui/Button';
import { sessionAPI } from '@/app/core/api/sessions';
import type {
  LessonReflectionSource,
  RecordLessonReflectionResponse,
} from '@/app/core/types/session';

interface Props {
  sessionId: number;
  source: LessonReflectionSource;
  evidenceSummary?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  title?: string;
  description?: string;
  onSaved?: (response: RecordLessonReflectionResponse) => void;
}

const SUGGESTED_PROMPTS = [
  'What went well in this lesson?',
  'What did learners struggle with?',
  'What should be revisited next lesson?',
];

export function LessonReflectionCard({
  sessionId,
  source,
  evidenceSummary,
  metadata,
  title = 'Lesson reflection',
  description = 'Capture a short teaching reflection for this lesson. It updates the linked lesson plan automatically.',
  onSaved,
}: Props) {
  const [reflection, setReflection] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const [lastSavedReflection, setLastSavedReflection] = useState<string | null>(null);

  const cleanedReflection = reflection.trim();
  const canSave =
    cleanedReflection.length > 0 &&
    !isSaving &&
    cleanedReflection !== lastSavedReflection;

  const extractErrorMessage = (saveError: unknown) => {
    if (
      typeof saveError === 'object' &&
      saveError !== null &&
      'response' in saveError &&
      typeof saveError.response === 'object' &&
      saveError.response !== null &&
      'data' in saveError.response &&
      typeof saveError.response.data === 'object' &&
      saveError.response.data !== null
    ) {
      const data = saveError.response.data as Record<string, unknown>;

      if (typeof data.detail === 'string') {
        return data.detail;
      }

      for (const value of Object.values(data)) {
        if (typeof value === 'string') {
          return value;
        }
        if (
          Array.isArray(value) &&
          value.length > 0 &&
          typeof value[0] === 'string'
        ) {
          return value[0];
        }
      }
    }

    return 'The lesson reflection could not be saved.';
  };

  const handleSave = async () => {
    if (!canSave) {
      return;
    }

    try {
      setIsSaving(true);
      setError(null);
      setSavedMessage(null);

      const response = await sessionAPI.recordReflection(sessionId, {
        reflection: cleanedReflection,
        source,
        evidence_summary: evidenceSummary,
        metadata,
      });

      setSavedMessage(response.detail);
      setLastSavedReflection(response.reflection);
      onSaved?.(response);
    } catch (saveError: unknown) {
      setError(extractErrorMessage(saveError));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card className="border-amber-500/20">
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-2.5">
            <MessageSquareText className="h-5 w-5 text-[color:var(--color-warning)]" />
          </div>
          <div className="min-w-0">
            <h3 className="text-lg font-semibold theme-text">{title}</h3>
            <p className="mt-1 text-sm theme-muted">{description}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {SUGGESTED_PROMPTS.map((prompt) => (
            <button
              key={prompt}
              type="button"
              onClick={() => setReflection((current) => (current ? `${current}\n${prompt} ` : `${prompt} `))}
              className="theme-focus-ring theme-surface-muted rounded-lg border border-amber-500/20 px-3 py-1.5 text-sm theme-text transition-colors hover:border-amber-500/40 hover:bg-amber-500/10"
            >
              {prompt}
            </button>
          ))}
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium theme-text">Reflection</label>
          <textarea
            value={reflection}
            onChange={(event) => setReflection(event.target.value)}
            rows={5}
            className="theme-focus-ring theme-input w-full resize-y rounded-lg px-3 py-2 text-sm"
            placeholder="Note what worked, what needs follow-up, and what to revisit."
          />
        </div>

        {error ? (
          <p className="theme-danger-surface rounded-lg px-3 py-2 text-sm">
            {error}
          </p>
        ) : null}

        {savedMessage ? (
          <div className="theme-success-surface flex items-center gap-2 rounded-lg px-3 py-2 text-sm">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-[color:var(--color-success)]" />
            <span>{savedMessage}</span>
          </div>
        ) : null}

        <div className="flex justify-end">
          <Button variant="primary" size="sm" onClick={handleSave} disabled={!canSave}>
            {isSaving ? 'Saving...' : 'Save reflection'}
          </Button>
        </div>
      </div>
    </Card>
  );
}
