import { Users, Landmark, Code, Check, ArrowRight, type LucideIcon } from 'lucide-react';
import Link from 'next/link';

interface AudienceCard {
  icon: LucideIcon;
  title: string;
  description: string;
  checklist: string[];
  cta: {
    label: string;
    href: string;
    className: string;
  };
}

const AUDIENCES: AudienceCard[] = [
  {
    icon: Users,
    title: 'For Citizens',
    description:
      'Report problems in your area, track their progress, and stay informed about what\u2019s being fixed in your community.',
    checklist: [
      'Quick and easy reporting',
      'Real-time progress updates',
      'Mobile-friendly interface',
      'Community discussion',
    ],
    cta: {
      label: 'Start Reporting',
      href: '/report',
      className: 'btn-primary w-full justify-between',
    },
  },
  {
    icon: Landmark,
    title: 'For Councils',
    description:
      'Streamline report management, engage with residents, and improve service delivery with tools built for your council.',
    checklist: ['Centralized dashboard', 'Priority management', 'Analytics and insights', 'Direct citizen engagement'],
    cta: {
      label: 'Learn More',
      href: '/demo',
      className: 'btn-secondary w-full justify-between',
    },
  },
  {
    icon: Code,
    title: 'For Developers',
    description: 'Build on our open-source platform. Access our API and contribute to making cities more responsive.',
    checklist: ['Open source codebase', 'RESTful API access', 'Active community', 'Extensive documentation'],
    cta: {
      label: 'View API Docs',
      href: '/docs',
      className: 'btn-secondary w-full justify-between',
    },
  },
];

export default function BuiltForEveryone() {
  return (
    <section aria-labelledby="built-for-everyone-title" className="bg-background py-14 sm:py-20">
      <div className="section-shell">
        {/* Heading */}
        <div className="max-w-2xl">
          <p className="eyebrow">One connected community</p>
          <h2
            id="built-for-everyone-title"
            className="mt-3 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl"
          >
            Built for Everyone
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
            Practical tools for residents, councils, and developers working towards better local places.
          </p>
        </div>

        {/* Cards */}
        <div className="mt-9 grid grid-cols-1 gap-5 md:grid-cols-3">
          {AUDIENCES.map(({ icon: Icon, ...audience }) => (
            <div key={audience.title} className="surface-card flex min-w-0 flex-col p-6 lg:p-7">
              {/* Icon & Title */}
              <div className="flex items-center gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-border bg-background text-accent">
                  <Icon className="size-5" strokeWidth={1.75} aria-hidden="true" />
                </div>
                <h3 className="text-lg font-semibold tracking-tight text-foreground">{audience.title}</h3>
              </div>
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{audience.description}</p>

              {/* Checklist */}
              <ul className="mt-5 flex flex-col gap-3">
                {audience.checklist.map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm leading-relaxed text-foreground">
                    <Check className="mt-0.5 size-4 shrink-0 text-accent" strokeWidth={1.75} aria-hidden="true" />
                    {item}
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <div className="mt-auto pt-7">
                <Link href={audience.cta.href} className={audience.cta.className}>
                  {audience.cta.label}
                  <ArrowRight className="size-4 shrink-0" strokeWidth={1.75} aria-hidden="true" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
