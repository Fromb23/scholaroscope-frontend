import { ShieldCheck } from 'lucide-react';

const integrityPoints = [
  'Scholaroscope does not manufacture competency levels.',
  'Insufficient evidence remains insufficient.',
  'Low attendance affects evidence reliability.',
  'Awaiting evidence is an honest result.',
  'Evidence integrity is a feature, not a failure.',
];

export function EvidenceIntegritySection() {
  return (
    <section id="integrity" className="theme-surface py-20" aria-labelledby="integrity-heading">
      <div className="mx-auto grid max-w-[1220px] gap-8 px-4 sm:px-6 lg:grid-cols-[0.85fr_1.15fr] lg:px-8">
        <div>
          <p className="text-sm font-semibold text-[color:var(--color-primary)]">Evidence integrity</p>
          <h2 id="integrity-heading" className="mt-3 text-3xl font-bold tracking-tight theme-text sm:text-4xl">
            If the evidence isn&apos;t real, the curriculum isn&apos;t real
          </h2>
          <p className="mt-4 text-base leading-7 theme-muted">
            Scholaroscope helps schools label evidence gaps clearly instead of hiding them behind converted marks or generic summaries.
          </p>
        </div>
        <div className="grid gap-3">
          {integrityPoints.map((point) => (
            <div key={point} className="flex items-start gap-3 rounded-lg border p-4 theme-card">
              <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[color:var(--color-success)]" />
              <p className="text-sm leading-6 theme-muted">{point}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
