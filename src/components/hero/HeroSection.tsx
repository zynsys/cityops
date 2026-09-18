import { Check } from 'lucide-react';
import { getPlatformStats } from '@/db/queries/stats';
import FindReportsCard from './FindReportsCard';
import QuickPhotoCard from './QuickPhotoCard';

const FEATURES = [
  'Submit reports in seconds',
  'Earn points and badges',
  'Redeem local vouchers',
  'Build your reputation',
];

function formatStat(value: number): string {
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(1).replace(/\.0$/, '')}K`;
  }
  return value.toLocaleString('en-GB');
}

export default async function HeroSection() {
  const stats = await getPlatformStats();

  const STATISTICS = [
    { value: formatStat(stats.reportsThisWeek), label: 'Reports this week' },
    { value: formatStat(stats.reportsFixed), label: 'Reports fixed' },
    { value: formatStat(stats.updatesSent), label: 'Updates sent' },
    { value: formatStat(stats.activeMembers), label: 'Active members' },
  ];
  return (
    <section aria-labelledby="hero-title" className="hero-surface border-b border-border">
      <div className="section-shell py-12 sm:py-16">
        <div className="mx-auto max-w-3xl text-center">
          <p className="inline-flex items-center gap-2.5 rounded-full border border-hero-accent/15 bg-surface/65 px-4 py-2 text-xs font-semibold tracking-[0.12em] text-hero-accent uppercase">
            <span className="size-1.5 rounded-full bg-hero-accent" aria-hidden="true" />
            Better places, together
          </p>
          <h1
            id="hero-title"
            className="mt-6 text-4xl leading-[1.15] font-bold tracking-tight text-hero-foreground sm:text-6xl lg:text-7xl"
          >
            Make your city <span className="block text-hero-accent">work better.</span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-hero-muted sm:text-lg">
            Report potholes, broken street lights, or graffiti. Follow progress with your council and earn rewards for
            helping your community.
          </p>
        </div>

        <ul className="mx-auto mt-7 flex max-w-4xl flex-wrap justify-center gap-x-6 gap-y-3">
          {FEATURES.map((feature) => (
            <li
              key={feature}
              className="flex items-center gap-2 text-xs leading-relaxed text-hero-foreground sm:text-sm"
            >
              <Check className="size-4 shrink-0 text-hero-accent" strokeWidth={2} aria-hidden="true" />
              {feature}
            </li>
          ))}
        </ul>

        <div className="mx-auto mt-9 grid max-w-4xl gap-5 text-left md:grid-cols-2">
          <FindReportsCard />
          <QuickPhotoCard />
        </div>

        <dl
          aria-label="CityOps community activity"
          className="mx-auto mt-8 grid max-w-4xl grid-cols-2 gap-y-6 rounded-2xl border border-hero-accent/15 bg-surface/65 py-6 text-center sm:grid-cols-4"
        >
          {STATISTICS.map(({ value, label }) => (
            <div
              key={label}
              className="flex min-w-0 flex-col px-3 sm:border-l sm:border-hero-accent/15 sm:first:border-l-0"
            >
              <dt className="mt-1 text-xs leading-relaxed text-hero-muted sm:text-sm">{label}</dt>
              <dd className="order-first font-heading text-2xl font-semibold tracking-tight text-hero-accent tabular-nums sm:text-3xl">
                {value}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
