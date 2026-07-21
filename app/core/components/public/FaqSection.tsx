const faqs = [
  {
    question: 'Can an individual teacher use Scholaroscope?',
    answer: 'Yes. An independent teacher can create a workspace for their own classes and keep lesson, attendance, learner work, assessment, and report evidence together.',
  },
  {
    question: 'What teaching records can I manage?',
    answer: 'You can manage lesson records, attendance, learner work, assignments, assessments, curriculum evidence, learner progress, and teacher reports.',
  },
  {
    question: 'Which curricula are currently supported?',
    answer: 'Current product areas include CBC/CBE and Cambridge teaching workflows. Other curricula should be treated as upcoming until they are explicitly available in the workspace.',
  },
  {
    question: 'Does Scholaroscope work for schools?',
    answer: 'Yes. Schools and learning centres can use scoped workspaces so teachers see their assigned teaching work while administrators manage the broader academic setup.',
  },
];

export function FaqSection() {
  return (
    <section id="faq" className="theme-surface-muted py-16 sm:py-20" aria-labelledby="faq-heading">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 id="faq-heading" className="text-3xl font-bold tracking-tight theme-text sm:text-4xl">
            Frequently asked questions
          </h2>
          <p className="mt-4 text-base leading-7 theme-muted">
            Practical answers about who Scholaroscope is for and what it supports today.
          </p>
        </div>

        <div className="mt-10 space-y-3">
          {faqs.map((faq) => (
            <details
              key={faq.question}
              className="group rounded-xl border p-4 shadow-sm theme-border theme-card"
            >
              <summary className="theme-focus-ring cursor-pointer list-none rounded-lg text-base font-semibold theme-text marker:hidden">
                <span className="flex items-center justify-between gap-4">
                  <span>{faq.question}</span>
                  <span className="text-xl leading-none theme-muted" aria-hidden="true">
                    <span className="group-open:hidden">+</span>
                    <span className="hidden group-open:inline">-</span>
                  </span>
                </span>
              </summary>
              <p className="mt-3 text-sm leading-6 theme-muted">{faq.answer}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
