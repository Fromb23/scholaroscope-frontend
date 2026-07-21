import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight } from 'lucide-react';

export function HeroSection() {
  return (
    <section id="product" className="theme-surface pt-28">
      <div className="mx-auto grid max-w-[1220px] gap-10 px-4 pb-16 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:px-8 lg:pb-20">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[color:var(--color-primary)]">
            Teaching evidence and academic workflow
          </p>
          <h1 className="mt-4 max-w-4xl text-4xl font-bold tracking-tight theme-text sm:text-6xl">
            Stop reconstructing learner progress from memory.
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 theme-muted">
            Scholaroscope connects lesson records, attendance, assignments, assessments, and competency evidence in one teaching workflow - so progress reviews and reports are based on what actually happened in class.
          </p>
          <div className="mt-8 flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
            <Link
              href="/get-started"
              className="inline-flex min-h-12 items-center justify-center rounded-lg px-5 text-sm font-semibold theme-button-primary"
            >
              Create your workspace
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
            <a
              href="#how-it-works"
              className="inline-flex min-h-12 items-center justify-center rounded-lg px-5 text-sm font-semibold theme-button-secondary"
            >
              See how it works
            </a>
          </div>
        </div>
        <div className="rounded-2xl border p-2 shadow-xl theme-border theme-surface-elevated">
          <Image
            src="/marketing/screenshots/instructor-reports-overview.webp"
            alt="Scholaroscope instructor reports overview showing learner, subject, class subject, and teacher report options."
            width={1199}
            height={595}
            sizes="(min-width: 1024px) 560px, 100vw"
            priority
            className="h-auto w-full rounded-xl"
          />
        </div>
      </div>
    </section>
  );
}
