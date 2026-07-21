const steps = [
  ['Plan and teach', 'Record lessons, class context, and teaching activity as work happens.'],
  ['Capture evidence', 'Connect attendance, assignments, assessments, and competency evidence to the learner record.'],
  ['Review progress', 'Use the connected record to prepare class, subject, learner, and teacher reports.'],
];

export function WorkflowSection() {
  return (
    <section id="how-it-works" className="theme-surface py-16 sm:py-20" aria-labelledby="workflow-heading">
      <div className="mx-auto max-w-[1100px] px-4 sm:px-6 lg:px-8">
        <h2 id="workflow-heading" className="text-3xl font-bold tracking-tight theme-text sm:text-4xl">
          How Scholaroscope works
        </h2>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {steps.map(([title, body], index) => (
            <div key={title} className="rounded-xl border p-5 theme-border theme-card">
              <div className="flex h-9 w-9 items-center justify-center rounded-full theme-info-surface text-sm font-bold text-[color:var(--color-primary)]">
                {index + 1}
              </div>
              <h3 className="mt-4 text-lg font-semibold theme-text">{title}</h3>
              <p className="mt-2 text-sm leading-6 theme-muted">{body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
