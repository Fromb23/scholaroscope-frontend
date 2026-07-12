import Link from 'next/link';
import { ArrowLeft, FileText } from 'lucide-react';

import { PublicHeader } from '@/app/core/components/public/PublicHeader';
import { PublicFooter } from '@/app/core/components/public/PublicFooter';

const sampleAreas = [
  {
    name: 'Mathematics',
    code: 'MATH',
    level: 'ME - Meeting Expectations',
    status: 'Final',
    evidence: '12 records',
    remark: 'Sample teacher remark: the learner explains number patterns clearly and should practise multi-step word problems.',
  },
  {
    name: 'Integrated Science',
    code: 'SCI',
    level: 'AE - Approaching Expectations',
    status: 'Provisional',
    evidence: '7 records',
    remark: 'Sample teacher remark: practical participation is improving; more observation evidence is needed before publication.',
  },
  {
    name: 'Creative Arts',
    code: 'ART',
    level: 'Awaiting Evidence',
    status: 'Awaiting Evidence',
    evidence: '0 records',
    remark: 'No teacher remark recorded.',
  },
];

export function SampleReportPage() {
  return (
    <div className="min-h-screen theme-app-bg theme-text">
      <PublicHeader />
      <main className="theme-surface pt-28">
        <section className="mx-auto max-w-[980px] px-4 pb-16 sm:px-6 lg:px-8" aria-labelledby="sample-report-heading">
          <Link
            href="/"
            className="inline-flex min-h-10 items-center rounded-lg px-4 text-sm font-semibold theme-button-secondary"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to home
          </Link>

          <div className="mt-8 rounded-lg border p-6 shadow-sm theme-card">
            <div className="flex flex-col gap-4 border-b pb-5 theme-border sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-[color:var(--color-primary)]">Public sample - fixture data</p>
                <h1 id="sample-report-heading" className="mt-2 text-3xl font-bold tracking-tight theme-text">
                  Student Progress Report
                </h1>
                <p className="mt-2 text-sm theme-muted">
                  This sample uses non-sensitive fixture data and does not call production learner APIs.
                </p>
              </div>
              <div className="theme-info-surface flex h-12 w-12 items-center justify-center rounded-lg text-[color:var(--color-primary)]">
                <FileText className="h-6 w-6" />
              </div>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {[
                ['Learner', 'Sample Learner'],
                ['Admission number', 'SAMPLE-001'],
                ['Cohort', 'Grade 7 Blue'],
                ['Term', 'Term 1, 2026'],
                ['Document state', 'Draft'],
                ['Attendance', '38 of 42 sessions attended'],
              ].map(([label, value]) => (
                <div key={label} className="rounded-lg border p-4 theme-border theme-surface-muted">
                  <p className="text-xs font-semibold uppercase tracking-wide theme-subtle">{label}</p>
                  <p className="mt-1 text-sm font-medium theme-text">{value}</p>
                </div>
              ))}
            </div>

            <div className="mt-8 overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs uppercase tracking-wide theme-border theme-subtle">
                    <th className="px-3 py-2">Learning area</th>
                    <th className="px-3 py-2">Result</th>
                    <th className="px-3 py-2">Evidence</th>
                    <th className="px-3 py-2">Teacher remark</th>
                  </tr>
                </thead>
                <tbody>
                  {sampleAreas.map((area) => (
                    <tr key={area.code} className="border-b theme-border">
                      <td className="px-3 py-3 align-top">
                        <p className="font-semibold theme-text">{area.name}</p>
                        <p className="text-xs theme-subtle">{area.code}</p>
                      </td>
                      <td className="px-3 py-3 align-top theme-muted">
                        {area.level}
                        <br />
                        <span className="theme-subtle">{area.status}</span>
                      </td>
                      <td className="px-3 py-3 align-top theme-muted">{area.evidence}</td>
                      <td className="px-3 py-3 align-top theme-muted">{area.remark}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}
