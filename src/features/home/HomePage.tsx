import { PageIntro } from '../../components/PageIntro';

export function HomePage() {
  return (
    <section className="page-stack" aria-labelledby="home-title">
      <PageIntro
        eyebrow="Today"
        title="Welcome to Liftwise"
        description="A calm, private place for training. Everything will stay on this device and remain available offline."
      />
      <article className="hero-card">
        <div className="hero-card-copy">
          <p className="section-kicker">Foundation ready</p>
          <h2 id="home-title">Built for the gym floor</h2>
          <p>
            The app shell is installed. Planning, workout logging, and progress tools arrive in
            focused releases.
          </p>
        </div>
        <div className="weight-mark" aria-hidden="true">
          <span />
          <i />
          <span />
        </div>
      </article>
      <div className="privacy-note">
        <span aria-hidden="true">✓</span>
        <div>
          <strong>Private by design</strong>
          <p>No account, cloud, or connection required.</p>
        </div>
      </div>
    </section>
  );
}
