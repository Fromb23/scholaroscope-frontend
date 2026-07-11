import { BookOpen, ClipboardCheck, FileBarChart, PlugZap, ShieldCheck, Users } from 'lucide-react';

const features = [
  { title: 'Academic setup', body: 'Curricula, years, terms, subjects, cohorts, learners, and teaching assignments.', icon: BookOpen },
  { title: 'Teaching records', body: 'Sessions, attendance, lesson preparation, schemes, assignments, and classroom evidence.', icon: ClipboardCheck },
  { title: 'Assessment and reports', body: 'Policy-driven assessment workflows and report computation across workspace contexts.', icon: FileBarChart },
  { title: 'Workspace roles', body: 'Workspace-defined roles and permission composition remain under the workspace access model.', icon: ShieldCheck },
  { title: 'Member management', body: 'Invite, activate, restrict, restore, and remove workspace members without deleting history.', icon: Users },
  { title: 'Features and integrations', body: 'Standard and Premium capabilities follow the workspace plan and subscription policy.', icon: PlugZap },
];

export function FeatureSection() {
  return (
    <section id="features" className="theme-surface py-20">
      <div className="mx-auto max-w-[1220px] px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold text-[color:var(--color-primary)]">Workspace capabilities</p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight theme-text">Everything needed for repeat academic operations</h2>
        </div>
        <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <article key={feature.title} className="rounded-xl border p-6 theme-card">
                <Icon className="h-6 w-6 text-[color:var(--color-primary)]" />
                <h3 className="mt-5 text-lg font-bold theme-text">{feature.title}</h3>
                <p className="mt-2 text-sm leading-6 theme-muted">{feature.body}</p>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
