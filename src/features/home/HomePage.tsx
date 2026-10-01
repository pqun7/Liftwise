import { PageIntro } from '../../components/PageIntro';
import { Link } from 'react-router-dom';

export function HomePage() {
  return (
    <section className="page-stack" aria-labelledby="home-title">
      <PageIntro
        titleId="home-title"
        eyebrow="Today"
        title="Welcome to Liftwise"
        description="A calm, private place for training. Everything will stay on this device and remain available offline."
      />
      <article className="hero-card">
        <div className="hero-card-copy">
          <p className="section-kicker">Foundation ready</p>
          <h2>Built for the gym floor</h2>
          <p>
            Browse hundreds of movements locally, then create your own when you need something
            personal.
          </p>
          <Link className="hero-link" to="/exercises">
            Browse exercise library →
          </Link>
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
