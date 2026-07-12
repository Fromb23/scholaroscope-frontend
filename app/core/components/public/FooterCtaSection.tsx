import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

export function FooterCtaSection() {
  return (
    <section className="theme-surface-muted py-20" aria-labelledby="footer-cta-heading">
      <div className="mx-auto max-w-[1220px] px-4 text-center sm:px-6 lg:px-8">
        <h2 id="footer-cta-heading" className="mx-auto max-w-3xl text-3xl font-bold tracking-tight theme-text sm:text-4xl">
          Kenyan schools need a better way to protect classroom evidence.
        </h2>
        <p className="mx-auto mt-4 max-w-3xl text-base leading-7 theme-muted">
          The gap between curriculum policy and classroom reality is an evidence problem. Scholaroscope is building the evidence infrastructure.
        </p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Link
            href="/get-started"
            className="inline-flex min-h-12 items-center justify-center rounded-lg px-5 text-sm font-semibold theme-button-primary"
          >
            Create your workspace
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
