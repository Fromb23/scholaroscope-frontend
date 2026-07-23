'use client';

import { Badge } from '@/app/components/ui/Badge';
import { Card } from '@/app/components/ui/Card';
import type { AssignmentParticipationSummary } from '@/app/core/types/reporting';

interface ClassSubjectAssignmentParticipationProps {
  participation: AssignmentParticipationSummary;
}

export function ClassSubjectAssignmentParticipation({
  participation,
}: ClassSubjectAssignmentParticipationProps) {
  return (
    <Card className="border theme-border p-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold theme-text">Assignment Participation</h2>
          <p className="mt-1 text-sm theme-muted">
            Unique learner participation is shown separately from assignment work opportunities.
          </p>
        </div>
        <Badge variant="default">
          {participation.work_unit_summary.submitted}/{participation.work_unit_summary.total} submitted
        </Badge>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {[
          ['Learners in scope', participation.learner_participation_summary.learners_in_scope],
          ['Submitted any', participation.learner_participation_summary.learners_submitted_any],
          ['Fully complete', participation.learner_participation_summary.learners_fully_complete],
          ['Missing any', participation.learner_participation_summary.learners_missing_any],
          ['No submission', participation.learner_participation_summary.learners_with_no_submission],
        ].map(([label, value]) => (
          <div key={label} className="rounded-lg border theme-border bg-white/70 p-3">
            <p className="text-xs uppercase tracking-wide theme-subtle">{label}</p>
            <p className="mt-1 text-xl font-semibold theme-text">{value}</p>
          </div>
        ))}
      </div>

      {participation.assignment_rows.length > 0 ? (
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b theme-border text-left theme-subtle">
                <th className="px-3 py-2">Assignment</th>
                <th className="px-3 py-2">Mode</th>
                <th className="px-3 py-2 text-right">Expected</th>
                <th className="px-3 py-2 text-right">Submitted</th>
                <th className="px-3 py-2 text-right">Reviewed</th>
                <th className="px-3 py-2 text-right">Missing</th>
                <th className="px-3 py-2 text-right">Excused</th>
                <th className="px-3 py-2 text-right">Pending</th>
              </tr>
            </thead>
            <tbody>
              {participation.assignment_rows.map((row) => (
                <tr key={row.assignment_id} className="border-b theme-border last:border-0">
                  <td className="px-3 py-2">
                    <p className="font-medium theme-text">{row.title}</p>
                    {row.due_at ? (
                      <p className="text-xs theme-subtle">
                        Due {new Date(row.due_at).toLocaleDateString()}
                      </p>
                    ) : null}
                  </td>
                  <td className="px-3 py-2">{row.delivery_mode}</td>
                  <td className="px-3 py-2 text-right">{row.expected_learners}</td>
                  <td className="px-3 py-2 text-right">{row.submitted_learners}/{row.expected_learners}</td>
                  <td className="px-3 py-2 text-right">{row.reviewed_learners}/{row.expected_learners}</td>
                  <td className="px-3 py-2 text-right">{row.missing_learners}/{row.expected_learners}</td>
                  <td className="px-3 py-2 text-right">{row.excused_learners}/{row.expected_learners}</td>
                  <td className="px-3 py-2 text-right">{row.pending_learners}/{row.expected_learners}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="mt-4 text-sm theme-muted">No assignments are recorded for this term.</p>
      )}
    </Card>
  );
}
