const pains = [
  'Lessons happen in one place, attendance in another, and learner work somewhere else.',
  'Assessment marks explain results, but not always the teaching context behind them.',
  'Report time becomes a reconstruction exercise instead of a review of evidence.',
];

export function ProblemSection() {
  return (
    <section className="theme-surface-muted py-16 sm:py-20" aria-labelledby="teacher-pain-heading">
      <div className="mx-auto max-w-[1100px] px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl">
          <h2 id="teacher-pain-heading" className="text-3xl font-bold tracking-tight theme-text sm:text-4xl">
            The problem is not that teachers lack records. It is that the records are disconnected.
          </h2>
          <p className="mt-4 text-base leading-7 theme-muted">
            Scholaroscope is built around the daily evidence teachers already create: lessons, attendance, learner tasks, assessment decisions, curriculum links, and progress notes.
          </p>
        </div>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {pains.map((pain) => (
            <div key={pain} className="rounded-xl border p-5 theme-border theme-card">
              <p className="text-sm leading-6 theme-muted">{pain}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
