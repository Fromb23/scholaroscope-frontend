import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

export function HeroSection() {
  return (
    <section className="theme-surface pt-28">
      <div className="mx-auto flex max-w-[980px] flex-col items-center px-4 pb-16 text-center sm:px-6 lg:px-8 lg:pb-20">
        <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl theme-info-surface text-xl font-bold text-[color:var(--color-primary)]">
          S
        </div>
        <h1 className="max-w-4xl text-4xl font-bold tracking-tight theme-text sm:text-6xl">
          Classroom records for teachers who need progress to stay organized.
        </h1>
        <p className="mt-5 max-w-2xl text-lg leading-8 theme-muted">
          Scholaroscope helps teachers and schools manage lessons, attendance, learner work, and progress records in one clear workspace.
        </p>
        <div className="mt-8 flex w-full flex-col justify-center gap-3 sm:w-auto sm:flex-row">
            <Link
              href="/get-started"
              className="inline-flex min-h-12 items-center justify-center rounded-lg px-5 text-sm font-semibold theme-button-primary"
            >
              Get started
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
            <Link
              href="/login"
              className="inline-flex min-h-12 items-center justify-center rounded-lg px-5 text-sm font-semibold theme-button-secondary"
            >
              Sign in
            </Link>
        </div>
      </div>
    </section>
  );
}
