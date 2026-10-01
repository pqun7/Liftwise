type PlaceholderCardProps = Readonly<{
  title: string;
  body: string;
}>;

export function PlaceholderCard({ title, body }: PlaceholderCardProps) {
  return (
    <article className="placeholder-card">
      <span className="placeholder-mark" aria-hidden="true" />
      <div>
        <h2>{title}</h2>
        <p>{body}</p>
      </div>
    </article>
  );
}
