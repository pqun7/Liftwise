import type { CSSProperties } from 'react';
import {
  ArrowUpRight,
  CalendarDays,
  ChartNoAxesColumnIncreasing,
  Dumbbell,
  LockKeyhole,
  Lock,
  Share,
  SquarePlus,
  UserRound,
  Wifi,
  WifiOff,
} from 'lucide-react';
import './installation.css';

const githubUrl = 'https://github.com/pqun7/Liftwise';
const appUrl = '/?app=1';

/** Display original-resolution screenshots through a CSS viewport, without resampling. */
function ReferenceImage({
  src,
  sourceSize,
  crop,
  alt,
  eager = false,
  className = '',
}: {
  src: string;
  sourceSize: readonly [number, number];
  crop: readonly [number, number, number, number];
  alt: string;
  eager?: boolean;
  className?: string;
}) {
  const [x, y, width, height] = crop;
  const style: CSSProperties = {
    aspectRatio: `${width} / ${height}`,
  };
  return (
    <div className={`relative overflow-hidden ${className}`} style={style}>
      <img
        src={src}
        alt={alt}
        width={sourceSize[0]}
        height={sourceSize[1]}
        loading={eager ? 'eager' : 'lazy'}
        fetchPriority={eager ? 'high' : 'auto'}
        decoding="async"
        className="absolute max-w-none"
        style={{
          width: `${(sourceSize[0] / width) * 100}%`,
          left: `${(-x / width) * 100}%`,
          top: `${(-y / height) * 100}%`,
        }}
      />
    </div>
  );
}

function SafariAddressPreview() {
  return (
    <div
      role="img"
      aria-label="Illustration of the Safari address bar with the Liftwise URL and Share icon"
      className="col-span-3 mx-auto flex aspect-[339/131] w-full max-w-[339px] flex-col justify-center gap-3 self-end rounded-2xl border border-[#164f43] bg-[#061a16] px-3 py-4"
    >
      <p className="text-xs font-semibold text-[#a9c8c7]">Safari</p>
      <div className="flex min-h-12 items-center gap-2 rounded-xl border border-white/5 bg-[#263532] px-3 text-[13px] text-white">
        <Lock size={13} className="shrink-0" aria-hidden="true" />
        <span className="min-w-0 flex-1 break-all">{window.location.host}</span>
        <Share size={23} className="shrink-0 text-[#d1e6e2]" aria-hidden="true" />
      </div>
    </div>
  );
}

function BrandIcon({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" fill="none" aria-hidden="true" className={className}>
      <path
        d="M16 21v22M22 17v30M42 17v30M48 21v22M22 32h20"
        stroke="currentColor"
        strokeWidth="4.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function GitHubIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className="size-7">
      <path d="M12 .8a11.2 11.2 0 0 0-3.54 21.83c.56.1.77-.24.77-.54v-2.1c-3.12.68-3.78-1.32-3.78-1.32-.5-1.29-1.24-1.63-1.24-1.63-1.02-.7.08-.69.08-.69 1.12.08 1.72 1.15 1.72 1.15 1 1.72 2.63 1.22 3.27.93.1-.72.39-1.22.71-1.5-2.49-.28-5.1-1.24-5.1-5.54 0-1.23.44-2.23 1.15-3.02-.12-.28-.5-1.43.11-2.98 0 0 .94-.3 3.08 1.15a10.76 10.76 0 0 1 5.6 0c2.14-1.45 3.08-1.15 3.08-1.15.61 1.55.23 2.7.11 2.98.72.79 1.15 1.8 1.15 3.02 0 4.31-2.61 5.25-5.1 5.53.4.35.76 1.03.76 2.08v3.1c0 .3.2.65.77.54A11.2 11.2 0 0 0 12 .8Z" />
    </svg>
  );
}

const steps = [
  {
    title: 'Open in Safari',
    icon: 'safari',
    description: (
      <>
        Visit{' '}
        <a
          href={appUrl}
          className="break-words rounded-lg border border-[#176454] px-1.5 py-0.5 text-[#44f1d2] [overflow-wrap:anywhere]"
        >
          {window.location.host}
        </a>{' '}
        on your iPhone.
      </>
    ),
    src: null,
    crop: [0, 0, 339, 131] as const,
    alt: 'Safari address bar showing the Liftwise website and the Share button.',
  },
  {
    title: 'Tap Share',
    icon: Share,
    description: <>Tap the Share icon in Safari.</>,
    src: '/installation/safari-share.webp',
    crop: [246, 900, 750, 490] as const,
    alt: 'Safari menu with Share highlighted.',
  },
  {
    title: 'Add to Home Screen',
    icon: SquarePlus,
    description: <>Choose Add to Home Screen.</>,
    src: '/installation/safari-home-screen.webp',
    crop: [48, 1700, 1083, 525] as const,
    alt: 'Safari menu with Add to Home Screen highlighted.',
  },
  {
    title: 'Tap Add & launch',
    icon: 'brand',
    description: <>Keep Open as Web App enabled, then tap Add.</>,
    src: '/installation/safari-confirm.webp',
    crop: [0, 180, 1179, 825] as const,
    alt: 'Add to Home Screen confirmation for Liftwise with Open as Web App enabled and the Add button.',
  },
];

function SafariIcon() {
  return (
    <svg viewBox="0 0 72 72" className="size-full" aria-hidden="true">
      <defs>
        <linearGradient id="safari-blue" x2="0" y2="1">
          <stop stopColor="#39d5ff" />
          <stop offset="1" stopColor="#0878eb" />
        </linearGradient>
      </defs>
      <rect x="1" y="1" width="70" height="70" rx="18" fill="#f4f5f6" />
      <circle cx="36" cy="36" r="29" fill="url(#safari-blue)" stroke="#b9dfff" />
      <circle
        cx="36"
        cy="36"
        r="25"
        fill="none"
        stroke="white"
        strokeWidth="2"
        strokeDasharray="1 3"
      />
      <path d="m18 54 12-24L54 18 42 42Z" fill="white" />
      <path d="m30 30 24-12-12 24Z" fill="#f6424d" />
    </svg>
  );
}

export function InstallationPage() {
  return (
    <div className="installation-page min-h-dvh text-[#f6f8f7]">
      <a href="#installation-content" className="installation-skip">
        Skip to installation guide
      </a>
      <div className="installation-container mx-auto w-full max-w-[1200px] px-5 min-[390px]:px-6 sm:px-8 lg:px-10">
        <header className="flex items-center justify-between gap-3 py-5 sm:py-7 lg:py-8">
          <a href="/" aria-label="Liftwise home" className="flex min-h-11 items-center gap-3">
            <span className="flex size-11 items-center justify-center rounded-[15px] border border-[#195347] bg-[#001c16] text-[#62f5cb] sm:size-14 sm:rounded-[18px]">
              <BrandIcon className="size-full" />
            </span>
            <span className="text-[28px] font-extrabold tracking-[-1.2px] sm:text-[36px]">
              Liftwise
            </span>
          </a>
          <a
            href={githubUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="View Liftwise on GitHub (opens in a new tab)"
            className="flex min-h-11 shrink-0 items-center gap-2 rounded-lg px-1 text-sm transition-colors hover:text-[#5ff5d0] sm:text-base"
          >
            <GitHubIcon />
            <span className="hidden min-[390px]:inline">
              GitHub<span className="hidden sm:inline"> repository</span>
            </span>
            <ArrowUpRight size={19} />
          </a>
        </header>

        <main id="installation-content">
          <section
            aria-labelledby="installation-title"
            className="installation-hero grid items-center gap-8 border-b border-[#113b32] pt-5 md:grid-cols-[minmax(0,1fr)_minmax(0,0.7fr)] md:gap-8 md:pt-7 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-16 lg:pt-6"
          >
            <div className="relative min-w-0 md:pb-10 lg:pb-14">
              <p className="text-xs font-semibold tracking-[0.24em] text-[#37f4c6] sm:text-sm">
                MADE FOR iPHONE
              </p>
              <h1
                id="installation-title"
                className="mt-4 text-[clamp(38px,10.2vw,54px)] leading-[1.08] font-extrabold tracking-[-0.045em] md:text-[clamp(42px,5.3vw,64px)] lg:mt-5 lg:text-[clamp(56px,5.4vw,72px)]"
              >
                Your training.
                <br />
                <span className="text-[#67f5ce]">One tap away.</span>
              </h1>
              <p className="mt-4 max-w-[30rem] text-[17px] leading-[1.6] tracking-[-0.015em] text-[#b0c9c9] sm:text-xl lg:mt-5 lg:text-[23px]">
                Install Liftwise on your Home Screen and train on your terms.
              </p>
              <ul
                aria-label="Training features"
                className="mt-6 grid max-w-[480px] grid-cols-3 gap-2 text-[12px] leading-relaxed text-[#b0c9c9] sm:gap-4 sm:text-sm lg:mt-8"
              >
                {[
                  { Icon: Dumbbell, first: 'Plan', second: 'workouts' },
                  { Icon: ChartNoAxesColumnIncreasing, first: 'Track', second: 'progress' },
                  { Icon: CalendarDays, first: 'Build', second: 'consistency' },
                ].map(({ Icon, first, second }) => (
                  <li
                    key={first}
                    className="flex min-w-0 flex-col items-center gap-2 text-center min-[390px]:flex-row min-[390px]:text-left md:flex-col md:items-start md:text-left lg:flex-row lg:items-center"
                  >
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-full border border-[#0a4437] bg-[#00281f] text-[#42f0c5] sm:size-11">
                      <Icon size={21} strokeWidth={2} aria-hidden="true" />
                    </span>
                    <span>
                      {first}
                      <br />
                      {second}
                    </span>
                  </li>
                ))}
              </ul>
              <a
                href={appUrl}
                className="mt-7 flex min-h-[58px] w-full max-w-[440px] items-center justify-center gap-2 rounded-2xl border border-[#48ecc9] bg-gradient-to-br from-[#30e5b9] to-[#20d9b2] px-5 text-[23px] font-extrabold tracking-[-0.035em] text-[#00160f] shadow-[0_8px_32px_#0fe5af20] transition hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#71ffdd] sm:min-h-16 sm:text-[26px] lg:mt-9"
              >
                Open Liftwise <ArrowUpRight size={27} aria-hidden="true" />
              </a>
              <p className="mt-3 max-w-[440px] text-center text-sm text-[#b0c9c9]">
                No App Store needed.
              </p>
              <p className="mt-5 hidden max-w-[440px] text-sm leading-relaxed text-[#a9c8c7] lg:block">
                On your computer? Open Liftwise in your browser, or follow the steps below to
                install it on your iPhone.
              </p>
            </div>
            <ReferenceImage
              src="/installation/recovery-dashboard.webp"
              sourceSize={[851, 1847]}
              crop={[0, 0, 851, 1847]}
              eager
              alt="Liftwise recovery dashboard: Recovery Day, Weekly Schedule, next workout, and bottom navigation."
              className="installation-phone mx-auto w-[min(78%,280px)] self-end md:w-full md:max-w-[354px]"
            />
          </section>

          <section aria-labelledby="steps-title" className="pt-9 sm:pt-12 lg:pt-16">
            <h2
              id="steps-title"
              className="text-center text-[clamp(28px,7.6vw,36px)] leading-[1.2] font-extrabold tracking-[-0.04em] sm:text-[42px] lg:text-[48px]"
            >
              Ready in <span className="text-[#2cf1ce]">4 simple steps</span>
            </h2>
            <p className="mx-auto mt-3 max-w-[640px] text-center text-[15px] leading-relaxed text-[#b0c9c9] sm:text-lg">
              Add Liftwise to your iPhone Home Screen in less than a minute.
            </p>
            <ol className="installation-steps mt-6 grid gap-4 md:grid-cols-2 md:gap-5 lg:mt-9 lg:gap-6">
              {steps.map((step, index) => (
                <li
                  key={step.title}
                  className="installation-step grid min-w-0 grid-cols-[36px_42px_minmax(0,1fr)] content-start items-center gap-x-3 gap-y-4 rounded-[22px] border border-[#10483c] bg-gradient-to-br from-[#082b23b0] to-[#041e18b0] p-4 sm:grid-cols-[40px_48px_minmax(0,1fr)] sm:p-5 lg:gap-x-4 lg:p-6"
                >
                  <span className="flex size-9 items-center justify-center rounded-full border border-[#24efd0] bg-[#003428] text-base font-bold text-[#65f5d2] sm:size-10 sm:text-lg">
                    0{index + 1}
                  </span>
                  <span className="flex size-[42px] items-center justify-center overflow-hidden rounded-xl border border-[#42605c] bg-gradient-to-br from-[#304340] to-[#1b302c] text-[#c2effd] sm:size-12">
                    {step.icon === 'safari' ? (
                      <SafariIcon />
                    ) : step.icon === 'brand' ? (
                      <BrandIcon className="size-full text-[#64f3cb]" />
                    ) : typeof step.icon !== 'string' ? (
                      <step.icon size={28} strokeWidth={1.7} aria-hidden="true" />
                    ) : null}
                  </span>
                  <h3 className="min-w-0 text-[18px] leading-snug font-bold tracking-[-0.025em] sm:text-xl lg:text-[22px]">
                    {step.title}
                  </h3>
                  <p className="col-span-3 min-h-[48px] text-[15px] leading-[1.6] text-[#a9c8c7] sm:text-base lg:min-h-[52px]">
                    {step.description}
                  </p>
                  {step.src ? (
                    <ReferenceImage
                      src={step.src}
                      sourceSize={[1179, 2556]}
                      crop={step.crop}
                      alt={step.alt}
                      className="col-span-3 mx-auto w-full max-w-[339px] self-end rounded-2xl border border-[#164f43]"
                    />
                  ) : (
                    <SafariAddressPreview />
                  )}
                </li>
              ))}
            </ol>
          </section>

          <aside className="mx-auto mt-5 flex max-w-[660px] items-center justify-center gap-3 rounded-2xl border border-[#185247] bg-[#00241b70] px-4 py-4 text-left text-[13px] leading-relaxed text-[#b0c9c9] sm:mt-7 sm:rounded-full sm:px-6 sm:text-sm">
            <Wifi className="shrink-0 text-[#54f1d0]" size={26} aria-hidden="true" />
            <p>Stay online for the first launch to prepare offline access.</p>
          </aside>
          <section
            aria-label="Liftwise benefits"
            className="mt-7 grid divide-y divide-[#17483c] rounded-[22px] border border-[#10483c] bg-[#03231a60] px-4 sm:mt-9 md:grid-cols-3 md:divide-x md:divide-y-0 md:px-0"
          >
            {[
              { Icon: UserRound, title: 'No account', text: 'Start training instantly.' },
              {
                Icon: LockKeyhole,
                title: 'Private by design',
                text: 'Your data stays on your device.',
              },
              { Icon: WifiOff, title: 'Works offline', text: 'Install once, train anywhere.' },
            ].map(({ Icon, title, text }) => (
              <div
                key={title}
                className="flex min-w-0 items-center gap-3 py-4 md:flex-col md:items-start md:px-5 md:py-6 lg:flex-row lg:items-center lg:gap-4"
              >
                <span className="flex size-11 shrink-0 items-center justify-center rounded-full border border-[#0b5342] bg-[#00251c] text-[#50f3c9] sm:size-12">
                  <Icon size={25} strokeWidth={1.8} aria-hidden="true" />
                </span>
                <div>
                  <h3 className="text-base font-bold">{title}</h3>
                  <p className="mt-1 text-[13px] leading-relaxed text-[#a9c8c7]">{text}</p>
                </div>
              </div>
            ))}
          </section>
        </main>

        <footer className="mt-8 border-t border-[#174237] pt-5 pb-6 text-center text-[13px] text-[#a9c8c7] sm:mt-12 sm:py-6 sm:text-sm lg:flex lg:items-center lg:justify-between lg:gap-6 lg:text-left">
          <p className="flex items-center justify-center gap-2">
            <BrandIcon className="size-8 text-[#50f3c9]" />
            <span className="font-bold text-white">Liftwise</span>
            <span className="mx-1">•</span>Built for iPhone
          </p>
          <p className="mt-2 flex min-w-0 flex-wrap items-center justify-center gap-x-3 lg:mt-0 lg:justify-end">
            <a href={appUrl} className="flex min-h-11 items-center break-all hover:text-[#61f5d1]">
              {window.location.origin}
            </a>
            <span aria-hidden="true">•</span>
            <a
              href={githubUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex min-h-11 items-center break-all hover:text-[#61f5d1]"
            >
              github.com/pqun7/Liftwise
            </a>
          </p>
        </footer>
      </div>
    </div>
  );
}
