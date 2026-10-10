export function AppHeader({
  title,
  titleId,
  brandAsTitle = false,
}: {
  title?: string | undefined;
  titleId?: string | undefined;
  currentStreak?: number | undefined;
  action?: unknown;
  showStreak?: boolean;
  brandAsTitle?: boolean;
}) {
  return (
    <header className="app-header" aria-label="Liftwise application header">
      <div className="app-header-brand-row">
        {/* <span className="app-brand-mark" aria-hidden="true">
          <img src={brandIcon} alt="" width={192} height={192} />
        </span>
        <div className="app-brand-copy">
          {brandAsTitle ? (
            <h1 id={titleId}>Liftwise</h1>
          ) : (
            <span className="app-brand-name">Liftwise</span>
          )}
          <p>Your gym. Your plan. On your device.</p>
        </div> */}
        {/* {showStreak || action ? (
          <div className="app-header-actions">
            {showStreak ? <StreakBadge currentStreak={currentStreak} /> : null}
            {action}
          </div>
        ) : null} */}
      </div>
      {title && !brandAsTitle ? (
        <div className="app-header-title">
          <h1 id={titleId}>{title}</h1>
        </div>
      ) : null}
    </header>
  );
}
