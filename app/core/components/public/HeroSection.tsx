import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, CheckCircle2, ClipboardCheck, FileText, Layers3 } from 'lucide-react';

export function HeroSection() {
  return (
    <section className="relative overflow-hidden theme-surface pt-28">
      <div className="mx-auto grid max-w-[1220px] gap-10 px-4 pb-16 sm:px-6 lg:grid-cols-[minmax(0,0.92fr)_minmax(380px,1fr)] lg:px-8 lg:pb-20">
        <div className="flex flex-col justify-center">
          <p className="text-sm font-semibold uppercase tracking-wide text-[color:var(--color-primary)]">The missing infrastructure for CBC</p>
          <h1 className="mt-4 max-w-3xl text-4xl font-bold tracking-tight theme-text sm:text-6xl">
            CBC evidence doesn&apos;t wait. Scholaroscope captures it before it&apos;s lost.
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 theme-muted">
            Every observation, assessment, attendance record, project, and assignment - captured at the moment it happens in the classroom. Not reconstructed at the end of term. Not invented during report season. Real evidence, real competency levels, real reports.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/get-started"
              className="inline-flex min-h-12 items-center justify-center rounded-lg px-5 text-sm font-semibold theme-button-primary"
            >
              Get started
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
            <Link
              href="/sample-report"
              className="inline-flex min-h-12 items-center justify-center rounded-lg px-5 text-sm font-semibold theme-button-secondary"
            >
              See a sample report
            </Link>
          </div>
          <div className="mt-8 grid gap-3 text-sm theme-muted sm:grid-cols-2">
            {['Curriculum-aware', 'CBC evidence reporting', 'Works on modern devices', 'Built for schools and independent teachers'].map((item) => (
              <p key={item} className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-[color:var(--color-success)]" />
                {item}
              </p>
            ))}
          </div>
        </div>

        <div className="relative min-h-[430px]">
          <div className="absolute inset-x-0 top-6 mx-auto max-w-[520px] rounded-2xl border theme-border theme-card p-4 shadow-2xl">
            <div className="flex items-center justify-between border-b pb-3 theme-border">
              <div className="flex items-center gap-3">
                <Image src="/icons/icon-192.png" alt="Scholaroscope mark" width={34} height={34} className="rounded-lg" priority />
                <div>
                  <p className="text-sm font-semibold theme-text">Student Progress Report</p>
                  <p className="text-xs theme-muted">Draft - current evidence</p>
                </div>
              </div>
              <span className="theme-info-surface rounded-full px-3 py-1 text-xs font-semibold text-[color:var(--color-primary)]">
                Term scoped
              </span>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              {[
                { label: 'Attendance', value: '38/42', icon: ClipboardCheck },
                { label: 'Evidence', value: '64', icon: Layers3 },
                { label: 'Reviews', value: 'Ready', icon: FileText },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.label} className="rounded-lg border theme-border theme-surface-muted p-4">
                    <Icon className="h-5 w-5 text-[color:var(--color-primary)]" />
                    <p className="mt-4 text-2xl font-bold">{item.value}</p>
                    <p className="text-xs theme-muted">{item.label}</p>
                  </div>
                );
              })}
            </div>
            <div className="mt-5 rounded-lg border p-4 theme-border theme-surface">
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold theme-text">Evidence pipeline</p>
                <p className="text-xs font-semibold text-[color:var(--color-primary)]">Traceable</p>
              </div>
              <div className="mt-4 space-y-3">
                {[
                  ['Capture in class', 'Observation'],
                  ['Project evidence', 'Portfolio'],
                  ['Teacher review', 'Remark'],
                ].map(([label, value]) => (
                  <div key={label} className="flex items-center justify-between rounded-lg px-3 py-2 theme-surface-muted">
                    <span className="text-sm theme-muted">{label}</span>
                    <span className="text-sm font-bold theme-text">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
