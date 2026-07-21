import Image from 'next/image';

const previews = [
  {
    src: '/marketing/screenshots/instructor-teaching-load.webp',
    alt: 'Scholaroscope teaching load page showing assigned classes and subjects.',
    title: 'Teaching load stays scoped to assigned classes and subjects.',
    body: 'Teachers can move from assignment scope to learners, sessions, assessments, and class work without needing administrative access.',
  },
  {
    src: '/marketing/screenshots/assessments-and-grading.webp',
    alt: 'Scholaroscope assessments and grading page showing assessment filters and aggregate status cards.',
    title: 'Assessment work is part of the teaching workflow.',
    body: 'Assessment setup, review, grading, and report evidence sit close to lesson and learner records.',
  },
];

export function ProductPreviewSection() {
  return (
    <section className="theme-surface-muted py-16 sm:py-20" aria-labelledby="product-proof-heading">
      <div className="mx-auto max-w-[1220px] px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl">
          <h2 id="product-proof-heading" className="text-3xl font-bold tracking-tight theme-text sm:text-4xl">
            Product proof, not vague promises
          </h2>
          <p className="mt-4 text-base leading-7 theme-muted">
            Scholaroscope keeps evidence close to the classroom workflow so reporting reflects the teaching record.
          </p>
        </div>
        <div className="mt-10 grid gap-6 lg:grid-cols-2">
          {previews.map((preview) => (
            <article key={preview.src} className="overflow-hidden rounded-2xl border shadow-sm theme-border theme-card">
              <div className="p-2">
                <Image
                  src={preview.src}
                  alt={preview.alt}
                  width={1199}
                  height={595}
                  sizes="(min-width: 1024px) 560px, 100vw"
                  className="h-auto w-full rounded-xl"
                />
              </div>
              <div className="border-t p-5 theme-border">
                <h3 className="text-lg font-semibold theme-text">{preview.title}</h3>
                <p className="mt-2 text-sm leading-6 theme-muted">{preview.body}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
