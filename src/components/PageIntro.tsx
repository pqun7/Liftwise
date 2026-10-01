type PageIntroProps = Readonly<{
  titleId: string;
  eyebrow: string;
  title: string;
  description: string;
}>;

export function PageIntro({ titleId, eyebrow, title, description }: PageIntroProps) {
  return (
    <header className="page-intro">
      <p className="section-kicker">{eyebrow}</p>
      <h1 id={titleId}>{title}</h1>
      <p>{description}</p>
    </header>
  );
}
