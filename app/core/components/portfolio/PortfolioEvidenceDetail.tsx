import Link from 'next/link';
import { ExternalLink, Paperclip, X } from 'lucide-react';

import { Badge } from '@/app/components/ui/Badge';
import { Button } from '@/app/components/ui/Button';
import { Card } from '@/app/components/ui/Card';
import { ErrorBanner } from '@/app/components/ui/ErrorBanner';
import { EntityLoadingState } from '@/app/components/ui/loading';
import type { PortfolioEvidence } from '@/app/core/types/portfolio';

function formatDate(value: string | null | undefined): string {
  if (!value) return 'Date not recorded';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString();
}

function sourceLabel(value: string | undefined): string {
  return String(value ?? 'Evidence')
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function renderRecord(value: Record<string, unknown> | null | undefined): string | null {
  if (!value || Object.keys(value).length === 0) return null;
  return JSON.stringify(value, null, 2);
}

export function PortfolioEvidenceDetail({
  evidence,
  loading,
  error,
  errorStatus,
  onClose,
}: {
  evidence: PortfolioEvidence | null;
  loading: boolean;
  error: string | null;
  errorStatus: number | null;
  onClose: () => void;
}) {
  if (loading) {
    return <EntityLoadingState entity="portfolio evidence" action="Loading" />;
  }

  if (error) {
    return (
      <ErrorBanner
        title={errorStatus === 403 ? 'No access to this evidence' : 'Evidence unavailable'}
        message={error}
        onDismiss={() => undefined}
      />
    );
  }

  if (!evidence) {
    return (
      <Card className="space-y-3">
        <p className="text-sm theme-muted">Select an evidence record to inspect its details.</p>
      </Card>
    );
  }

  const competency = evidence.competency_judgement;
  const learnerWork = typeof evidence.learner_work === 'string'
    ? evidence.learner_work
    : renderRecord(evidence.learner_work ?? null);
  const provenance = renderRecord(evidence.provenance ?? null);

  return (
    <Card className="space-y-5 md:sticky md:top-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="info">{sourceLabel(evidence.source_type)}</Badge>
            {evidence.official_snapshot_references.length > 0 ? (
              <Badge variant="success">Official reference</Badge>
            ) : null}
          </div>
          <h2 className="mt-2 text-xl font-semibold theme-text">{evidence.title}</h2>
          <p className="mt-1 text-sm theme-muted">{formatDate(evidence.evidence_date)}</p>
        </div>
        <Button type="button" variant="ghost" size="sm" onClick={onClose} aria-label="Close evidence detail">
          <X className="h-4 w-4" />
        </Button>
      </div>

      <section className="space-y-2">
        <h3 className="text-sm font-semibold theme-text">Learning context</h3>
        {evidence.learning_area ? (
          <p className="text-sm theme-muted">
            Learning area: <span className="theme-text">{evidence.learning_area.name}</span>
          </p>
        ) : null}
        {evidence.learning_outcome ? (
          <p className="text-sm theme-muted">
            Outcome: <span className="theme-text">{evidence.learning_outcome.code}</span>
            {evidence.learning_outcome.description ? ` — ${evidence.learning_outcome.description}` : ''}
          </p>
        ) : null}
        {evidence.responsible_teacher?.name ? (
          <p className="text-sm theme-muted">
            Responsible teacher: <span className="theme-text">{evidence.responsible_teacher.name}</span>
          </p>
        ) : null}
      </section>

      {competency ? (
        <section className="space-y-2">
          <h3 className="text-sm font-semibold theme-text">Competency judgement</h3>
          <p className="text-sm theme-text">
            {competency.level}{competency.label ? ` - ${competency.label}` : ''}
          </p>
        </section>
      ) : null}

      {evidence.teacher_feedback || evidence.teacher_feedback_summary ? (
        <section className="space-y-2">
          <h3 className="text-sm font-semibold theme-text">Teacher feedback</h3>
          <p className="whitespace-pre-wrap text-sm theme-text">
            {evidence.teacher_feedback ?? evidence.teacher_feedback_summary}
          </p>
        </section>
      ) : null}

      {learnerWork ? (
        <section className="space-y-2">
          <h3 className="text-sm font-semibold theme-text">Learner work</h3>
          <pre className="whitespace-pre-wrap rounded-lg border theme-border theme-surface-muted p-3 text-sm theme-text">
            {learnerWork}
          </pre>
        </section>
      ) : null}

      {evidence.learner_reflection ? (
        <section className="space-y-2">
          <h3 className="text-sm font-semibold theme-text">Learner reflection</h3>
          <p className="whitespace-pre-wrap text-sm theme-text">{evidence.learner_reflection}</p>
        </section>
      ) : null}

      <section className="space-y-2">
        <h3 className="text-sm font-semibold theme-text">Artifacts and attachments</h3>
        {evidence.artifact_missing ? (
          <p className="rounded-lg border theme-border theme-surface-muted p-3 text-sm theme-muted">
            An artifact was referenced for this evidence record, but it is missing or inaccessible.
          </p>
        ) : evidence.artifacts.length > 0 ? (
          <ul className="space-y-2">
            {evidence.artifacts.map((artifact, index) => {
              const href = artifact.download_url ?? artifact.preview_url ?? artifact.url ?? null;
              const label = artifact.name ?? artifact.filename ?? `Artifact ${index + 1}`;
              return (
                <li key={`${artifact.id ?? index}-${label}`} className="flex items-center gap-2 text-sm">
                  <Paperclip className="h-4 w-4 theme-muted" />
                  {href && artifact.accessible !== false ? (
                    <a className="text-blue-600 hover:underline" href={href} target="_blank" rel="noreferrer">
                      {label}
                    </a>
                  ) : (
                    <span className="theme-muted">{label} is not accessible.</span>
                  )}
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-sm theme-muted">No artifact is attached to this visible evidence record.</p>
        )}
      </section>

      {evidence.source_route?.href ? (
        <Link href={evidence.source_route.href}>
          <Button variant="secondary" size="sm">
            <ExternalLink className="h-4 w-4" />
            {evidence.source_route.label ?? 'Open source record'}
          </Button>
        </Link>
      ) : null}

      {evidence.official_snapshot_references.length > 0 ? (
        <section className="space-y-2">
          <h3 className="text-sm font-semibold theme-text">Official snapshot references</h3>
          <ul className="space-y-1 text-sm theme-muted">
            {evidence.official_snapshot_references.map((snapshot) => (
              <li key={snapshot.snapshot_id}>
                Snapshot #{snapshot.snapshot_id}
                {snapshot.term?.name ? ` · ${snapshot.term.name}` : ''}
                {snapshot.published_at ? ` · published ${formatDate(snapshot.published_at)}` : ''}
                {snapshot.is_current === false ? ' · superseded' : ''}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {provenance ? (
        <section className="space-y-2">
          <h3 className="text-sm font-semibold theme-text">Provenance</h3>
          <pre className="max-h-48 overflow-auto whitespace-pre-wrap rounded-lg border theme-border theme-surface-muted p-3 text-xs theme-muted">
            {provenance}
          </pre>
        </section>
      ) : null}
    </Card>
  );
}
