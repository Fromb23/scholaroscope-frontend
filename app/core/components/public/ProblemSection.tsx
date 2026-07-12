export function ProblemSection() {
  return (
    <section id="problem" className="theme-surface-muted py-20" aria-labelledby="problem-heading">
      <div className="mx-auto max-w-[1220px] px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold text-[color:var(--color-primary)]">The problem</p>
          <h2 id="problem-heading" className="mt-3 text-3xl font-bold tracking-tight theme-text sm:text-4xl">
            CBC was designed around continuous evidence. Schools were left with paper-heavy workflows.
          </h2>
        </div>
        <div className="mt-8 grid gap-5 text-base leading-7 theme-muted lg:grid-cols-2">
          <p>
            Continuous observation asks teachers to notice learning as it happens, not only at the end of a test. That evidence can be attendance, assignments, observations, projects, practicals, portfolio items, and teacher review notes.
          </p>
          <p>
            In large classes, paper records are easy to lose, delay, or reconstruct from memory. The gap between evidence and remembered marks becomes visible during report season, when schools need honest reports backed by classroom records.
          </p>
          <p>
            Scholaroscope gives schools and independent teachers classroom-level evidence infrastructure: capture records daily, keep them term-scoped, and make report readiness visible before the end of term.
          </p>
          <p>
            The goal is not to rename marks. The goal is to protect the evidence that explains how a learner is progressing and what support they need next.
          </p>
        </div>
      </div>
    </section>
  );
}
