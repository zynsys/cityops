interface Step {
  number: string;
  title: string;
  description: string;
}

const STEPS: Step[] = [
  {
    number: '01',
    title: 'Spot & Report',
    description: 'See a problem nearby? Take a photo and submit a report with its location.',
  },
  {
    number: '02',
    title: 'Council Notified',
    description: 'Your report is sent to the local council. Follow its progress and receive updates.',
  },
  {
    number: '03',
    title: 'Report Verified & Fixed',
    description:
      'The council reviews and verifies your report, then works to resolve it. You receive updates throughout the process.',
  },
  {
    number: '04',
    title: 'Earn Badges & Points',
    description:
      'Once your report is verified as valid, earn points and badges for your contribution to the community.',
  },
  {
    number: '05',
    title: 'Redeem Rewards',
    description: 'Exchange your points for vouchers from local businesses. Get rewarded for making a difference.',
  },
];

export default function HowItWorks() {
  return (
    <section aria-labelledby="how-it-works-title" className="border-y border-border bg-section-alt py-14 sm:py-20">
      <div className="section-shell">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between md:gap-10">
          <div>
            <p className="eyebrow">From report to resolution</p>
            <h2
              id="how-it-works-title"
              className="mt-3 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl"
            >
              How It Works
            </h2>
          </div>
          <p className="max-w-lg text-sm leading-relaxed text-muted-foreground sm:text-base">
            Five straightforward steps to report a local issue, follow its progress, and make a difference in your
            community.
          </p>
        </div>

        <ol className="mt-10 grid gap-7 sm:grid-cols-2 lg:grid-cols-5 lg:gap-6">
          {STEPS.map((step) => (
            <li key={step.number} className="border-t border-border pt-5">
              <span className="text-sm font-semibold text-accent tabular-nums" aria-hidden="true">
                {step.number}
              </span>
              <h3 className="mt-3 text-base font-semibold text-foreground">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.description}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
