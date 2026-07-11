import Link from 'next/link';

export function CommercialSection() {
  return (
    <section id="pricing" className="bg-slate-50 py-20" aria-labelledby="commercial-heading">
      <div className="mx-auto grid w-full max-w-[1220px] gap-8 px-4 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8">
        <div>
          <p className="text-sm font-semibold text-blue-700">Plans and pricing</p>
          <h2 id="commercial-heading" className="mt-3 text-3xl font-bold tracking-tight theme-text sm:text-4xl">
            Pick the workspace first, then compare plans
          </h2>
          <p className="theme-muted mt-4 text-base leading-7">
            Scholaroscope starts with a Standard workspace foundation. Premium adds the specialist capabilities you choose, then Scholaroscope confirms the final quote before registration.
          </p>
          <Link
            href="/get-started"
            className="mt-7 inline-flex min-h-11 items-center justify-center rounded-lg bg-blue-700 px-5 text-sm font-semibold text-white hover:bg-blue-800"
          >
            Get started
          </Link>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {[
            ['Choose workspace', 'Select the teaching setup that matches how your organization works.'],
            ['Compare plans', 'Review Standard and Premium side by side with current published prices.'],
            ['Add Premium', 'Select only the premium capabilities that matter to your workspace.'],
            ['Confirm quote', 'Continue with the quote Scholaroscope confirms for your selection.'],
          ].map(([title, body]) => (
            <article key={title} className="rounded-lg border bg-white p-5 shadow-sm theme-border">
              <h3 className="text-sm font-semibold theme-text">{title}</h3>
              <p className="theme-muted mt-2 text-sm leading-6">{body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
