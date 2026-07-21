import Link from 'next/link';

const faqs = [
  {
    question: 'What is Scholaroscope?',
    answer: 'Scholaroscope helps teachers and schools keep classroom records in one place so progress can be reviewed from actual teaching activity.',
  },
  {
    question: 'Who can use Scholaroscope?',
    answer: 'It is built for schools, learning centres, homeschool groups, and independent teachers who need a structured teaching workspace.',
  },
  {
    question: 'Can an independent teacher use it?',
    answer: 'Yes. Independent teachers can create a workspace for their own classes without needing a full school account.',
  },
  {
    question: 'What classroom records can be managed?',
    answer: 'Teachers can manage lesson records, attendance, learner work, observations, assessments, and supporting notes used for progress review.',
  },
  {
    question: 'Does Scholaroscope replace the teacher’s professional judgement?',
    answer: 'No. It supports the teacher’s judgement by keeping classroom records organized and available when progress is reviewed.',
  },
  {
    question: 'Which curricula are supported?',
    answer: 'Scholaroscope is designed for curriculum-aware classroom record keeping, including CBC and CBE teaching contexts.',
  },
  {
    question: 'How do I get started?',
    answer: 'Create a workspace, choose the setup that matches how you teach, and add your classes and learners.',
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
            A short guide to what Scholaroscope is for and how to begin.
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
                    <span className="hidden group-open:inline">−</span>
                  </span>
                </span>
              </summary>
              <p className="mt-3 text-sm leading-6 theme-muted">{faq.answer}</p>
            </details>
          ))}
        </div>

        <div className="mt-8 flex flex-col items-center justify-center gap-3 text-center sm:flex-row">
          <Link
            href="/get-started"
            className="inline-flex min-h-11 items-center justify-center rounded-lg px-5 text-sm font-semibold theme-button-primary"
          >
            Get started
          </Link>
          <Link
            href="/login"
            className="inline-flex min-h-11 items-center justify-center rounded-lg px-5 text-sm font-semibold theme-button-secondary"
          >
            Sign in
          </Link>
        </div>
      </div>
    </section>
  );
}
