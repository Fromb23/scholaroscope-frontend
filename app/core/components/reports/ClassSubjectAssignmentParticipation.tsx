'use client';

import Link from 'next/link';
import { Badge } from '@/app/components/ui/Badge';
import { Button } from '@/app/components/ui/Button';
import { Card } from '@/app/components/ui/Card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/app/components/ui/Table';
import { buildAssignmentDetailHref } from '@/app/core/lib/operationalDetailNavigation';
import type { AssignmentParticipationSummary } from '@/app/core/types/reporting';

interface ClassSubjectAssignmentParticipationProps {
  participation: AssignmentParticipationSummary;
  cohortId: number;
  returnTo: string;
}

export function ClassSubjectAssignmentParticipation({
  participation,
  cohortId,
  returnTo,
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
          {participation.work_unit_summary.submitted}/{participation.work_unit_summary.total}{' '}
          submitted
        </Badge>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {[
          ['Learners in scope', participation.learner_participation_summary.learners_in_scope],
          ['Submitted any', participation.learner_participation_summary.learners_submitted_any],
          ['Fully complete', participation.learner_participation_summary.learners_fully_complete],
          ['Missing any', participation.learner_participation_summary.learners_missing_any],
          [
            'No submission',
            participation.learner_participation_summary.learners_with_no_submission,
          ],
        ].map(([label, value]) => (
          <div key={label} className="rounded-lg border theme-border bg-white/70 p-3">
            <p className="text-xs uppercase tracking-wide theme-subtle">{label}</p>
            <p className="mt-1 text-xl font-semibold theme-text">{value}</p>
          </div>
        ))}
      </div>

      {participation.assignment_rows.length > 0 ? (
        <div className="mt-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Assignment</TableHead>
                <TableHead>Mode</TableHead>
                <TableHead>Expected</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead>Reviewed</TableHead>
                <TableHead>Missing</TableHead>
                <TableHead>Excused</TableHead>
                <TableHead>Pending</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {participation.assignment_rows.map((row) => (
                <TableRow key={row.assignment_id}>
                  <TableCell>
                    <Link
                      className="font-medium theme-link hover:underline"
                      href={buildAssignmentDetailHref(cohortId, row.assignment_id, returnTo)}
                    >
                      {row.title}
                    </Link>
                    {row.due_at ? (
                      <p className="text-xs theme-subtle">
                        Due {new Date(row.due_at).toLocaleDateString()}
                      </p>
                    ) : null}
                  </TableCell>
                  <TableCell>{row.delivery_mode}</TableCell>
                  <TableCell>{row.expected_learners}</TableCell>
                  <TableCell>
                    {row.submitted_learners}/{row.expected_learners}
                  </TableCell>
                  <TableCell>
                    {row.reviewed_learners}/{row.expected_learners}
                  </TableCell>
                  <TableCell>
                    {row.missing_learners}/{row.expected_learners}
                  </TableCell>
                  <TableCell>
                    {row.excused_learners}/{row.expected_learners}
                  </TableCell>
                  <TableCell>
                    {row.pending_learners}/{row.expected_learners}
                  </TableCell>
                  <TableCell>
                    <Link href={buildAssignmentDetailHref(cohortId, row.assignment_id, returnTo)}>
                      <Button variant="ghost" size="sm">
                        Open
                      </Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <p className="mt-4 text-sm theme-muted">No assignments are recorded for this term.</p>
      )}
    </Card>
  );
}
