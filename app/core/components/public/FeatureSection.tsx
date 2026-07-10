import { BookOpen, ClipboardCheck, FileBarChart, PlugZap, ShieldCheck, Users } from 'lucide-react';

const features = [
  { title: 'Academic setup', body: 'Curricula, years, terms, subjects, cohorts, learners, and teaching assignments.', icon: BookOpen },
  { title: 'Teaching records', body: 'Sessions, attendance, lesson preparation, schemes, assignments, and classroom evidence.', icon: ClipboardCheck },
  { title: 'Assessment and reports', body: 'Policy-driven assessment workflows and report computation across workspace contexts.', icon: FileBarChart },
  { title: 'Workspace roles', body: 'Workspace-defined roles and permission composition remain under the workspace access model.', icon: ShieldCheck },
  { title: 'Member management', body: 'Invite, activate, restrict, restore, and remove workspace members without deleting history.', icon: Users },
  { title: 'Plugin catalogue', body: 'Standard and premium capabilities appear from the backend entitlement and subscription model.', icon: PlugZap },
];

export function FeatureSection() {
  return (
    <section id="features" className="bg-white py-20">
      <div className="mx-auto max-w-[1220px] px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold text-blue-700">Workspace capabilities</p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-950">Everything needed for repeat academic operations</h2>
        </div>
        <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <article key={feature.title} className="rounded-xl border border-slate-200 p-6">
                <Icon className="h-6 w-6 text-blue-700" />
                <h3 className="mt-5 text-lg font-bold text-slate-950">{feature.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{feature.body}</p>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
