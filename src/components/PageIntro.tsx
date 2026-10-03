type PageIntroProps = Readonly<{
  titleId: string;
  eyebrow: string;
  title: string;
  description: string;
}>;

export function PageIntro({ titleId, eyebrow, title, description }: PageIntroProps) {
  return (
    <header className="grid gap-2">
      <p className="type-label uppercase tracking-wide text-mint">{eyebrow}</p>
      <h1 id={titleId} className="type-page-title">
        {title}
      </h1>
      <p className="type-body text-secondary">{description}</p>
    </header>
  );
}
