type LegalSection = { title: string; paragraphs: string[] };

export function LegalPage({ description, sections, title }: { description: string; sections: LegalSection[]; title: string }) {
  return (
    <article className="mx-auto max-w-4xl px-margin-mobile py-16 md:px-margin-desktop md:py-24">
      <header className="border-b border-outline-variant pb-8">
        <p className="text-label-sm font-semibold uppercase tracking-[0.2em] text-primary">Mizan Derneği</p>
        <h1 className="mt-3 text-headline-xl text-on-surface">{title}</h1>
        <p className="mt-4 text-body-md leading-7 text-on-surface-variant">{description}</p>
        <p className="mt-4 text-sm text-on-surface-variant">Son güncelleme: 21 Temmuz 2026</p>
      </header>
      <div className="mt-10 space-y-10">
        {sections.map((section) => (
          <section key={section.title}>
            <h2 className="text-xl font-bold text-on-surface">{section.title}</h2>
            <div className="mt-3 space-y-3 text-body-md leading-7 text-on-surface-variant">
              {section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
            </div>
          </section>
        ))}
      </div>
    </article>
  );
}
