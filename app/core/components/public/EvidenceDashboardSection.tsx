import { ClipboardCheck, FileCheck2, Layers3, ListChecks, Microscope, NotebookPen, UsersRound } from 'lucide-react';

const evidenceItems = [
  ['Attendance', 'Presence, absence, lateness, and participation reliability.', 'Recorded during sessions.', ClipboardCheck],
  ['Assessments', 'Formal assessment evidence and completion state.', 'Recorded when assessments are scored.', ListChecks],
  ['Assignments', 'Individual and submitted learner work.', 'Recorded as work is issued and reviewed.', FileCheck2],
  ['Observations', 'Teacher observations tied to learning outcomes.', 'Recorded in the classroom moment.', NotebookPen],
  ['Projects', 'Longer learner tasks and project evidence.', 'Recorded across project milestones.', Layers3],
  ['Practicals', 'Hands-on skill evidence and practical work.', 'Recorded during practical activity.', Microscope],
  ['Portfolio items', 'Traceable artifacts and supporting references.', 'Recorded when evidence is attached.', UsersRound],
] as const;

export function EvidenceDashboardSection() {
  return (
    <section id="features" className="theme-surface py-20" aria-labelledby="evidence-dashboard-heading">
      <div className="mx-auto max-w-[1220px] px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold text-[color:var(--color-primary)]">Evidence dashboard</p>
          <h2 id="evidence-dashboard-heading" className="mt-3 text-3xl font-bold tracking-tight theme-text sm:text-4xl">
            Every competency level is earned, not assigned
          </h2>
          <p className="mt-4 text-base leading-7 theme-muted">
            A competency level with no evidence behind it is just a grade with a new name.
          </p>
        </div>
        <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {evidenceItems.map(([title, body, timing, Icon]) => (
            <article key={title} className="rounded-lg border p-5 theme-card">
              <Icon className="h-6 w-6 text-[color:var(--color-primary)]" />
              <h3 className="mt-4 text-lg font-semibold theme-text">{title}</h3>
              <p className="mt-2 text-sm leading-6 theme-muted">{body}</p>
              <p className="mt-3 text-xs font-semibold uppercase tracking-wide theme-subtle">{timing}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
