import { CalendarDays, FileText, Paperclip } from 'lucide-react';

import { Badge } from '@/app/components/ui/Badge';
import { Button } from '@/app/components/ui/Button';
import { Card } from '@/app/components/ui/Card';
import type { PortfolioEvidence } from '@/app/core/types/portfolio';

function formatDate(value: string | null): string {
  if (!value) return 'Date not recorded';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString();
}

function sourceLabel(value: string): string {
  return value.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
}

export function PortfolioEvidenceCard({
  evidence,
  selected,
  onOpen,
}: {
  evidence: PortfolioEvidence;
  selected: boolean;
  onOpen: (evidenceId: number) => void;
}) {
  const competency = evidence.competency_judgement;
  const area = evidence.learning_area;
  const outcome = evidence.learning_outcome;
  const hasArtifacts = evidence.artifacts.length > 0 || evidence.artifact_missing;

  return (
    <Card
      className={`space-y-3 border ${selected ? 'border-blue-500 ring-2 ring-blue-100' : 'theme-border'}`}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="info">{sourceLabel(evidence.source_type)}</Badge>
            {evidence.official_snapshot_references.length > 0 ? (
              <Badge variant="success">Official snapshot</Badge>
            ) : null}
            {competency ? (
              <Badge variant="default">
                {competency.level}{competency.label ? ` - ${competency.label}` : ''}
              </Badge>
            ) : null}
          </div>
          <h2 className="mt-2 text-base font-semibold theme-text">{evidence.title}</h2>
          <p className="mt-1 flex items-center gap-1 text-sm theme-muted">
            <CalendarDays className="h-4 w-4" />
            {formatDate(evidence.evidence_date)}
          </p>
        </div>
        <Button type="button" variant="secondary" size="sm" onClick={() => onOpen(evidence.evidence_record_id)}>
          <FileText className="h-4 w-4" />
          Details
        </Button>
      </div>

      <div className="space-y-1 text-sm">
        {area ? (
          <p className="theme-muted">
            Learning area: <span className="font-medium theme-text">{area.name}</span>
            {area.code ? <span className="theme-subtle"> ({area.code})</span> : null}
          </p>
        ) : null}
        {outcome ? (
          <p className="theme-muted">
            Outcome: <span className="font-medium theme-text">{outcome.code}</span>
            {outcome.description ? <span className="theme-subtle"> — {outcome.description}</span> : null}
          </p>
        ) : null}
        {evidence.teacher_feedback_summary ? (
          <p className="theme-muted">
            Feedback: <span className="theme-text">{evidence.teacher_feedback_summary}</span>
          </p>
        ) : null}
        {evidence.responsible_teacher?.name ? (
          <p className="theme-muted">
            Teacher: <span className="theme-text">{evidence.responsible_teacher.name}</span>
          </p>
        ) : null}
      </div>

      {hasArtifacts ? (
        <div className="flex items-center gap-2 text-sm theme-muted">
          <Paperclip className="h-4 w-4" />
          {evidence.artifact_missing ? 'Artifact reference recorded, but the file is unavailable.' : `${evidence.artifacts.length} artifact${evidence.artifacts.length === 1 ? '' : 's'}`}
        </div>
      ) : null}
    </Card>
  );
}
