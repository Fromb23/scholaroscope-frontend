import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, CheckCircle2, ClipboardList, GraduationCap, ShieldCheck } from 'lucide-react';

export function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-white pt-28">
      <div className="mx-auto grid max-w-[1220px] gap-10 px-4 pb-16 sm:px-6 lg:grid-cols-[minmax(0,0.92fr)_minmax(380px,1fr)] lg:px-8 lg:pb-20">
        <div className="flex flex-col justify-center">
          <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">Academic operations platform</p>
          <h1 className="mt-4 max-w-3xl text-5xl font-bold tracking-tight text-slate-950 sm:text-6xl">
            Scholaroscope
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">
            Run teaching records, assessments, learner progress, reports, and workspace provisioning from one secure academic operations workspace.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/get-started"
              className="inline-flex min-h-12 items-center justify-center rounded-lg bg-blue-700 px-5 text-sm font-semibold text-white hover:bg-blue-800"
            >
              Get started
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
            <Link
              href="/login"
              className="inline-flex min-h-12 items-center justify-center rounded-lg border border-slate-300 px-5 text-sm font-semibold text-slate-800 hover:bg-slate-100"
            >
              Sign in
            </Link>
          </div>
          <div className="mt-8 grid gap-3 text-sm text-slate-600 sm:grid-cols-3">
            {['Backend-priced plans', 'Workspace roles', 'Plugin capabilities'].map((item) => (
              <p key={item} className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                {item}
              </p>
            ))}
          </div>
        </div>

        <div className="relative min-h-[430px]">
          <div className="absolute inset-x-0 top-6 mx-auto h-[380px] max-w-[520px] rounded-2xl border border-slate-200 bg-slate-950 p-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-3">
                <Image src="/icons/icon-192.png" alt="" width={34} height={34} className="rounded-lg" priority />
                <div>
                  <p className="text-sm font-semibold text-white">Scholaroscope workspace</p>
                  <p className="text-xs text-slate-400">Live academic control room</p>
                </div>
              </div>
              <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-200">
                Healthy
              </span>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              {[
                { label: 'Sessions', value: '24', icon: ClipboardList },
                { label: 'Learners', value: '318', icon: GraduationCap },
                { label: 'Roles', value: '12', icon: ShieldCheck },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.label} className="rounded-xl bg-white/10 p-4 text-white">
                    <Icon className="h-5 w-5 text-blue-200" />
                    <p className="mt-4 text-2xl font-bold">{item.value}</p>
                    <p className="text-xs text-slate-400">{item.label}</p>
                  </div>
                );
              })}
            </div>
            <div className="mt-5 rounded-xl bg-white p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold text-slate-950">Today&apos;s teaching flow</p>
                <p className="text-xs font-semibold text-blue-700">On track</p>
              </div>
              <div className="mt-4 space-y-3">
                {[
                  ['Lesson records synced', '100%'],
                  ['Assessments needing review', '8'],
                  ['Reports ready to compute', '3'],
                ].map(([label, value]) => (
                  <div key={label} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
                    <span className="text-sm text-slate-700">{label}</span>
                    <span className="text-sm font-bold text-slate-950">{value}</span>
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
