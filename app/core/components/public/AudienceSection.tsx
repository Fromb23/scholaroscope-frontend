import { Building2, GraduationCap, Home, UserRoundCheck } from 'lucide-react';

const audiences = [
  { title: 'Schools and institutions', body: 'Structured academic management for administrators, instructors, cohorts, and reports.', icon: Building2 },
  { title: 'Tuition centers', body: 'Tutor-led learning operations with learners, groups, sessions, and progress tracking.', icon: GraduationCap },
  { title: 'Homeschool workspaces', body: 'Guardian-led learning records, tutoring coordination, and learner academic history.', icon: Home },
  { title: 'Freelance teachers', body: 'A self-managed teaching workspace for learners, preparation, assessments, and reports.', icon: UserRoundCheck },
];

export function AudienceSection() {
  return (
    <section id="audiences" className="bg-slate-950 py-20 text-white">
      <div className="mx-auto max-w-[1220px] px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold text-blue-300">Built for different learning operations</p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight">One platform, distinct workspace behavior</h2>
        </div>
        <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {audiences.map((audience) => {
            const Icon = audience.icon;
            return (
              <article key={audience.title} className="rounded-xl border border-white/10 bg-white/5 p-6">
                <Icon className="h-6 w-6 text-blue-200" />
                <h3 className="mt-5 text-lg font-bold">{audience.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-300">{audience.body}</p>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
