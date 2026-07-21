import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

export function FinalCtaSection() {
  return (
    <section className="theme-surface py-16 sm:py-20" aria-labelledby="final-cta-heading">
      <div className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
        <h2 id="final-cta-heading" className="text-3xl font-bold tracking-tight theme-text sm:text-4xl">
          Build progress reviews from the teaching record.
        </h2>
        <p className="mt-4 text-base leading-7 theme-muted">
          Start with your workspace, then connect classes, lessons, attendance, learner work, assessments, and reports.
        </p>
        <div className="mt-8">
          <Link
            href="/get-started"
            className="inline-flex min-h-12 items-center justify-center rounded-lg px-5 text-sm font-semibold theme-button-primary"
          >
            Create workspace
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
