import wordmark from '../../../docs/image/app name.png';

/** The original artwork is bundled once and shared by app-level headers. */
export function AppWordmark() {
  return <img className="app-wordmark" src={wordmark} width={122} height={46} alt="Liftwise" />;
}
