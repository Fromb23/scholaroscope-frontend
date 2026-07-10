const steps = [
  {
    title: 'Select the workspace model',
    body: 'Choose the institution, tuition, homeschool, learner, or personal teaching workspace that matches the operation.',
  },
  {
    title: 'Confirm the backend quote',
    body: 'Scholaroscope prices the three-month Standard foundation and any selected premium capabilities on the server.',
  },
  {
    title: 'Create the account or workspace',
    body: 'Use the quote token to continue into registration or authenticated additional-workspace creation.',
  },
  {
    title: 'Run academic operations',
    body: 'Workspace admins manage roles, members, academic setup, plugins, teaching records, assessments, and reports.',
  },
];

export function HowItWorksSection() {
  return (
    <section id="how-it-works" className="bg-slate-50 py-20">
      <div className="mx-auto max-w-[1220px] px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold text-blue-700">How it works</p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-950">A clean path from public quote to workspace operations</h2>
        </div>
        <div className="mt-10 grid gap-4 md:grid-cols-4">
          {steps.map((step, index) => (
            <div key={step.title} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm font-bold text-blue-700">{String(index + 1).padStart(2, '0')}</p>
              <h3 className="mt-4 text-lg font-bold text-slate-950">{step.title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{step.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
