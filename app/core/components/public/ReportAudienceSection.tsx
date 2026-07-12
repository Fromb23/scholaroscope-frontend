import { ClipboardList, GraduationCap, School } from 'lucide-react';

const reports = [
  {
    title: 'Student Progress Report',
    audience: 'Parents and guardians',
    items: ['competency levels', 'attendance', 'evidence summary', 'teacher remarks', 'support needs', 'no CBC ranking'],
    icon: GraduationCap,
  },
  {
    title: 'Teacher Report',
    audience: 'Teachers and internal instructional leadership',
    items: ['teaching load', 'session coverage', 'assessment completion', 'evidence gaps', 'review readiness'],
    icon: ClipboardList,
  },
  {
    title: 'School Report',
    audience: 'Administration and education leadership',
    items: ['cohort competency distributions', 'attendance', 'intervention needs', 'evidence integrity', 'review/publication state'],
    icon: School,
  },
] as const;

export function ReportAudienceSection() {
  return (
    <section id="reports" className="theme-surface-muted py-20" aria-labelledby="report-audiences-heading">
      <div className="mx-auto max-w-[1220px] px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold text-[color:var(--color-primary)]">Reports</p>
          <h2 id="report-audiences-heading" className="mt-3 text-3xl font-bold tracking-tight theme-text sm:text-4xl">
            Reports that mean something to the person reading them
          </h2>
        </div>
        <div className="mt-10 grid gap-5 lg:grid-cols-3">
          {reports.map((report) => {
            const Icon = report.icon;
            return (
              <article key={report.title} className="rounded-lg border p-6 theme-card">
                <Icon className="h-6 w-6 text-[color:var(--color-primary)]" />
                <h3 className="mt-5 text-xl font-semibold theme-text">{report.title}</h3>
                <p className="mt-2 text-sm font-medium theme-muted">{report.audience}</p>
                <ul className="mt-5 space-y-2 text-sm theme-muted">
                  {report.items.map((item) => (
                    <li key={item} className="rounded-lg theme-surface-muted px-3 py-2">{item}</li>
                  ))}
                </ul>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
