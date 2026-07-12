const steps = [
  {
    title: 'Set up your workspace',
    body: 'Create the school, centre, homeschool, or teacher workspace and add the classes, learning areas, learners, and terms you teach.',
  },
  {
    title: 'Capture evidence daily',
    body: 'Record attendance, observations, assignments, projects, practicals, and assessment evidence while learning is happening.',
  },
  {
    title: 'Generate honest reports',
    body: 'Use server-built reports that distinguish draft progress, review readiness, and official published results.',
  },
];

export function HowItWorksSection() {
  return (
    <section id="how-it-works" className="theme-surface-muted py-20">
      <div className="mx-auto max-w-[1220px] px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold text-[color:var(--color-primary)]">How it works</p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight theme-text">From classroom evidence to report-ready records</h2>
        </div>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {steps.map((step, index) => (
            <div key={step.title} className="rounded-xl border p-5 shadow-sm theme-card">
              <p className="text-sm font-bold text-[color:var(--color-primary)]">{String(index + 1).padStart(2, '0')}</p>
              <h3 className="mt-4 text-lg font-bold theme-text">{step.title}</h3>
              <p className="mt-2 text-sm leading-6 theme-muted">{step.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
