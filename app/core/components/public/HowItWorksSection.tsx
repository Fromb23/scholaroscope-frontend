const steps = [
  {
    title: 'Select the workspace model',
    body: 'Choose the institution, tuition, homeschool, learner, or personal teaching workspace that matches the operation.',
  },
  {
    title: 'Confirm your quote',
    body: 'Scholaroscope confirms the Standard foundation and any selected premium capabilities before you register.',
  },
  {
    title: 'Create the account or workspace',
    body: 'Use the quote token to continue into registration or authenticated additional-workspace creation.',
  },
  {
    title: 'Run academic operations',
    body: 'Workspace admins manage members, academic setup, teaching records, assessments, and reports.',
  },
];

export function HowItWorksSection() {
  return (
    <section id="how-it-works" className="theme-surface-muted py-20">
      <div className="mx-auto max-w-[1220px] px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold text-[color:var(--color-primary)]">How it works</p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight theme-text">A clean path from public quote to workspace operations</h2>
        </div>
        <div className="mt-10 grid gap-4 md:grid-cols-4">
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
