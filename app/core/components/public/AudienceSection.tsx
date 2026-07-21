export function AudienceSection() {
  return (
    <section className="theme-surface py-16 sm:py-20">
      <div className="mx-auto grid max-w-[1100px] gap-6 px-4 sm:px-6 lg:grid-cols-2 lg:px-8">
        <article id="for-teachers" className="rounded-2xl border p-6 theme-border theme-card">
          <h2 className="text-2xl font-bold theme-text">For independent teachers</h2>
          <p className="mt-3 text-sm leading-6 theme-muted">
            Create a workspace for your own classes, keep teaching evidence organized, and prepare progress conversations from actual records.
          </p>
        </article>
        <article id="for-schools" className="rounded-2xl border p-6 theme-border theme-card">
          <h2 className="text-2xl font-bold theme-text">For schools and learning centres</h2>
          <p className="mt-3 text-sm leading-6 theme-muted">
            Give teachers a structured workflow for lessons, attendance, learner work, assessments, curriculum evidence, and reports while keeping responsibilities scoped.
          </p>
        </article>
      </div>
    </section>
  );
}
