import type { CSSProperties } from 'react';
import {
  ArrowUpRight,
  CalendarDays,
  ChartNoAxesColumnIncreasing,
  Dumbbell,
  LockKeyhole,
  Share,
  SquarePlus,
  UserRound,
  Wifi,
  WifiOff,
} from 'lucide-react';
import './installation.css';

const githubUrl = 'https://github.com/pqun7/Liftwise';
const appUrl = '/?app=1';

/** Lossless viewports into the supplied reference: no recompression or invented UI. */
function ReferenceImage({
  crop,
  alt,
  eager = false,
  className = '',
}: {
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
        src="/installation/reference.png"
        alt={alt}
        width={850}
        height={1850}
        loading={eager ? 'eager' : 'lazy'}
        fetchPriority={eager ? 'high' : 'auto'}
        decoding="async"
        className="absolute max-w-none"
        style={{
          width: `${(850 / width) * 100}%`,
          left: `${(-x / width) * 100}%`,
          top: `${(-y / height) * 100}%`,
        }}
      />
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
          className="rounded-full border border-[#176454] px-2 py-0.5 text-[#44f1d2]"
        >
          {window.location.host}
        </a>{' '}
        on your iPhone.
      </>
    ),
    crop: [474, 878, 339, 131] as const,
    alt: 'Safari address bar showing the Liftwise website and the Share button.',
  },
  {
    title: 'Tap Share',
    icon: Share,
    description: (
      <>
        Tap the Share icon
        <br />
        in Safari.
      </>
    ),
    crop: [474, 1038, 339, 141] as const,
    alt: 'Safari menu with Share highlighted.',
  },
  {
    title: 'Add to Home Screen',
    icon: SquarePlus,
    description: <>Choose Add to Home Screen.</>,
    crop: [474, 1208, 339, 141] as const,
    alt: 'Safari menu with Add to Home Screen highlighted.',
  },
  {
    title: 'Tap Add & launch',
    icon: 'brand',
    description: (
      <>
        Keep Open as Web App
        <br />
        enabled, then tap Add.
      </>
    ),
    crop: [474, 1380, 339, 170] as const,
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
      <div className="mx-auto max-w-[850px]">
        <header className="flex items-center justify-between gap-4 px-6 py-7 sm:px-[42px]">
          <a href="/" aria-label="Liftwise home" className="flex items-center gap-4">
            <span className="flex size-12 items-center justify-center rounded-[19px] border border-[#195347] bg-[#001c16] text-[#62f5cb] sm:size-16">
              <BrandIcon className="size-full" />
            </span>
            <span className="text-[32px] font-extrabold tracking-[-1.5px] sm:text-[44px]">
              Liftwise
            </span>
          </a>
          <a
            href={githubUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex min-h-11 items-center gap-2 text-sm transition-colors hover:text-[#5ff5d0] sm:text-lg"
          >
            <GitHubIcon />
            <span className="hidden min-[400px]:inline">View on GitHub</span>
            <ArrowUpRight size={19} />
          </a>
        </header>

        <main id="installation-content">
          <section
            aria-labelledby="installation-title"
            className="installation-hero grid gap-7 overflow-hidden border-b border-[#113b32] px-6 pt-7 min-[800px]:grid-cols-[1.17fr_1fr] sm:gap-[18px] sm:pr-[22px] sm:pl-[42px] sm:pt-0"
          >
            <div className="relative z-10 pb-7 sm:pt-9">
              <p className="text-sm font-semibold tracking-[0.28em] text-[#37f4c6]">
                MADE FOR iPHONE
              </p>
              <h1
                id="installation-title"
                className="mt-5 text-[clamp(38px,7.3vw,62px)] leading-[1.09] font-extrabold tracking-[-0.045em]"
              >
                Your training.
                <br />
                <span className="whitespace-nowrap text-[#67f5ce]">One tap away.</span>
              </h1>
              <p className="mt-5 text-[21px] leading-[1.4] tracking-[-0.02em] text-[#b0c9c9] sm:text-[28px]">
                Install Liftwise on your Home Screen and train on your terms.
              </p>
              <ul className="mt-9 flex flex-col justify-between gap-3 min-[380px]:flex-row text-[14px] text-[#b0c9c9] sm:text-[15px]">
                {[
                  { Icon: Dumbbell, first: 'Plan', second: 'workouts' },
                  { Icon: ChartNoAxesColumnIncreasing, first: 'Track', second: 'progress' },
                  { Icon: CalendarDays, first: 'Build', second: 'consistency' },
                ].map(({ Icon, first, second }) => (
                  <li key={first} className="flex items-center gap-2 sm:gap-2.5">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-full border border-[#0a4437] bg-[#00281f] text-[#42f0c5] sm:size-12">
                      <Icon size={24} strokeWidth={2} />
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
                className="mt-10 flex min-h-[72px] items-center justify-center gap-2 rounded-[18px] border border-[#48ecc9] bg-gradient-to-br from-[#30e5b9] to-[#20d9b2] text-[28px] font-extrabold tracking-[-0.035em] text-[#00160f] shadow-[0_8px_32px_#0fe5af20] transition hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#71ffdd] sm:mt-12 sm:min-h-[79px] sm:text-[30px]"
              >
                Open Liftwise <ArrowUpRight size={31} />
              </a>
              <p className="mt-4 text-center text-lg text-[#b0c9c9]">No App Store needed.</p>
            </div>
            <ReferenceImage
              crop={[473, 106, 354, 600]}
              eager
              alt="Liftwise on an iPhone: weekly training calendar, recovery day, Plan Workout button, and bottom navigation."
              className="mx-auto w-full max-w-[354px] self-end"
            />
          </section>

          <section aria-labelledby="steps-title" className="px-[22px] pt-8 sm:pt-7">
            <h2
              id="steps-title"
              className="text-center text-[32px] leading-tight font-extrabold tracking-[-0.04em] sm:text-[50px]"
            >
              Ready in <span className="text-[#2cf1ce]">4 simple steps</span>
            </h2>
            <p className="mt-2 text-center text-lg leading-relaxed text-[#b0c9c9] sm:text-[23px]">
              Add Liftwise to your iPhone Home Screen in less than a minute.
            </p>
            <ol className="installation-steps relative mt-7 space-y-2">
              {steps.map((step, index) => (
                <li
                  key={step.title}
                  className="relative grid grid-cols-[46px_1fr] items-center gap-x-4 gap-y-5 rounded-[23px] border border-[#10483c] bg-gradient-to-br from-[#082b23b0] to-[#041e18b0] p-4 min-[800px]:grid-cols-[50px_78px_1fr_340px] sm:gap-x-4 sm:py-3 sm:pr-3 sm:pl-[18px]"
                >
                  <span className="relative z-10 flex size-[46px] self-start items-center justify-center rounded-full border border-[#24efd0] bg-[#003428] text-[21px] font-bold text-[#65f5d2] sm:mt-1">
                    0{index + 1}
                  </span>
                  <span className="hidden size-[73px] items-center justify-center overflow-hidden rounded-[21px] border border-[#42605c] bg-gradient-to-br from-[#304340] to-[#1b302c] text-[#c2effd] min-[800px]:flex">
                    {step.icon === 'safari' ? (
                      <SafariIcon />
                    ) : step.icon === 'brand' ? (
                      <BrandIcon className="size-[72px] text-[#64f3cb]" />
                    ) : typeof step.icon !== 'string' ? (
                      <step.icon size={46} strokeWidth={1.7} />
                    ) : null}
                  </span>
                  <div className="min-w-0">
                    <h3 className="text-[22px] leading-snug font-bold tracking-[-0.035em]">
                      {step.title}
                    </h3>
                    <p className="mt-2 text-[18px] leading-[1.45] text-[#a9c8c7]">
                      {step.description}
                    </p>
                  </div>
                  <ReferenceImage
                    crop={step.crop}
                    alt={step.alt}
                    className="col-span-2 ml-auto w-full max-w-[340px] rounded-[19px] border border-[#164f43] min-[800px]:col-span-1"
                  />
                </li>
              ))}
            </ol>
          </section>

          <aside className="mx-6 mt-4 flex items-center justify-center gap-4 rounded-full border border-[#185247] bg-[#00241b70] px-5 py-3 text-center text-sm text-[#b0c9c9] sm:mx-auto sm:max-w-[546px] sm:text-base">
            <Wifi className="shrink-0 text-[#54f1d0]" size={30} />
            <p>Stay online for the first launch to prepare offline access.</p>
          </aside>
          <section
            aria-label="Liftwise benefits"
            className="mx-[35px] mt-7 grid gap-6 min-[800px]:grid-cols-3 sm:gap-0"
          >
            {[
              { Icon: UserRound, title: 'No account', text: 'Start training instantly.' },
              {
                Icon: LockKeyhole,
                title: 'Private by design',
                text: 'Your data stays on your device.',
              },
              { Icon: WifiOff, title: 'Works offline', text: 'Install once, train anywhere.' },
            ].map(({ Icon, title, text }, index) => (
              <div
                key={title}
                className={`flex items-center gap-4 ${index ? 'min-[800px]:border-l min-[800px]:border-[#17483c] min-[800px]:pl-6' : ''}`}
              >
                <span className="flex size-[58px] shrink-0 items-center justify-center rounded-full border border-[#0b5342] bg-[#00251c] text-[#50f3c9]">
                  <Icon size={30} strokeWidth={1.8} />
                </span>
                <div>
                  <h3 className="text-[17px] font-bold">{title}</h3>
                  <p className="mt-1 text-xs text-[#a9c8c7]">{text}</p>
                </div>
              </div>
            ))}
          </section>
        </main>

        <footer className="mx-[22px] mt-7 border-t border-[#174237] pt-4 pb-7 text-center text-sm text-[#a9c8c7] sm:text-base">
          <p className="flex items-center justify-center gap-2">
            <BrandIcon className="size-8 text-[#50f3c9]" />
            <span className="font-bold text-white">Liftwise</span>
            <span className="mx-1">•</span>Built for iPhone
          </p>
          <p className="mt-3 flex flex-wrap items-center justify-center gap-x-3 gap-y-2">
            <a href={appUrl} className="hover:text-[#61f5d1]">
              {window.location.origin}
            </a>
            <span aria-hidden="true">•</span>
            <a
              href={githubUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[#61f5d1]"
            >
              github.com/pqun7/Liftwise
            </a>
          </p>
        </footer>
      </div>
    </div>
  );
}
