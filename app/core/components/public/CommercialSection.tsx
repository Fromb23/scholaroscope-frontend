import Link from 'next/link';

import { CommercialRateCards } from '@/app/core/components/commercial/CommercialRateCards';

export function CommercialSection() {
  return (
    <section className="bg-slate-50" aria-labelledby="commercial-heading">
      <CommercialRateCards />
      <div className="mx-auto grid w-full max-w-[1220px] gap-8 px-4 pb-16 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8">
        <section className="rounded-xl border bg-white p-6 shadow-sm theme-border" aria-labelledby="activation-heading">
          <p className="text-sm font-semibold text-blue-700">How activation works</p>
          <h2 id="activation-heading" className="mt-2 text-2xl font-bold theme-text">
            Confirm the quote, then activate the workspace term
          </h2>
          <div className="mt-6 space-y-5">
            {[
              ['Choose', 'Pick the published workspace type and Standard or Standard + Premium.'],
              ['Confirm', 'Scholaroscope issues a server quote with the final three-month total.'],
              ['Create', 'Create the account or additional workspace using that quote token.'],
              ['Activate', 'Commercial activation starts the paid coverage period after manual payment handling.'],
            ].map(([label, copy], index) => (
              <div key={label} className="flex gap-4">
                <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">
                  {index + 1}
                </span>
                <div>
                  <p className="font-semibold theme-text">{label}</p>
                  <p className="theme-muted mt-1 text-sm leading-6">{copy}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-xl border bg-white p-6 shadow-sm theme-border" aria-labelledby="commercial-faq-heading">
          <p className="text-sm font-semibold text-blue-700">Questions before you start</p>
          <h2 id="commercial-faq-heading" className="mt-2 text-2xl font-bold theme-text">
            Clear terms for public plans
          </h2>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {[
              ['Is Premium a separate plan?', 'No. Premium means Standard plus the premium capabilities selected for that workspace.'],
              ['Can prices change after I load the page?', 'The page fetches the live catalogue. The final amount is the backend-confirmed quote.'],
              ['How long is a period?', 'Every displayed amount covers one three-calendar-month period.'],
              ['What if a workspace type is missing?', 'Only active public plans are shown. Unavailable workspace types are not replaced with a fallback price.'],
            ].map(([question, answer]) => (
              <article key={question} className="rounded-lg bg-slate-50 p-4">
                <h3 className="text-sm font-semibold theme-text">{question}</h3>
                <p className="theme-muted mt-2 text-sm leading-6">{answer}</p>
              </article>
            ))}
          </div>
        </section>
      </div>

      <section className="mx-auto w-full max-w-[1220px] px-4 pb-20 sm:px-6 lg:px-8">
        <div className="rounded-xl bg-slate-950 p-8 text-white sm:p-10">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold text-blue-200">Ready when your workspace is</p>
            <h2 className="mt-3 text-3xl font-bold">Start with the published Scholaroscope catalogue</h2>
            <p className="mt-4 text-sm leading-6 text-slate-200">
              Select a workspace, confirm the server quote, and continue into account creation with the commercial choice preserved.
            </p>
          </div>
          <Link
            href="#commercial-rate-card"
            className="mt-7 inline-flex min-h-11 items-center justify-center rounded-lg bg-white px-5 text-sm font-semibold text-slate-950 hover:bg-blue-50"
          >
            Choose a workspace
          </Link>
        </div>
      </section>
    </section>
  );
}
