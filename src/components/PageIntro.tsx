type PageIntroProps = Readonly<{
  titleId: string;
  eyebrow: string;
  title: string;
  description: string;
}>;

export function PageIntro({ titleId, eyebrow, title, description }: PageIntroProps) {
  return (
    <header className="grid gap-2">
      <p className="text-xs font-bold uppercase tracking-widest text-mint">{eyebrow}</p>
      <h1 id={titleId} className="text-[28px] font-bold leading-tight tracking-tight">
        {title}
      </h1>
      <p className="text-sm text-secondary">{description}</p>
    </header>
  );
}
