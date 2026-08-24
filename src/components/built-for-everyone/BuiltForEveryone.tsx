import {
  Users,
  Landmark,
  Code,
  Check,
} from "lucide-react";
import Link from "next/link";

interface AudienceCard {
  icon: React.ReactNode;
  iconBg: string;
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
    icon: <Users className="h-7 w-7" />,
    iconBg: "bg-amber-400",
    title: "For Citizens",
    description:
      "Report problems in your area, track their progress, and stay informed about what\u2019s being fixed in your community.",
    checklist: [
      "Quick and easy reporting",
      "Real-time progress updates",
      "Mobile-friendly interface",
      "Community discussion",
    ],
    cta: {
      label: "Start Reporting",
      href: "/report",
      className:
        "inline-block w-full rounded-lg bg-amber-400 px-5 py-2.5 text-center text-sm font-semibold text-black transition-opacity hover:opacity-90",
    },
  },
  {
    icon: <Landmark className="h-7 w-7" />,
    iconBg: "bg-orange-500",
    title: "For Councils",
    description:
      "Streamline report management, engage with residents, and improve service delivery with our powerful tools.",
    checklist: [
      "Centralized dashboard",
      "Priority management",
      "Analytics and insights",
      "Direct citizen engagement",
    ],
    cta: {
      label: "Learn More",
      href: "/demo",
      className:
        "inline-block w-full rounded-lg bg-orange-700 px-5 py-2.5 text-center text-sm font-semibold text-white transition-opacity hover:opacity-90",
    },
  },
  {
    icon: <Code className="h-7 w-7" />,
    iconBg: "bg-[#1E293B]",
    title: "For Developers",
    description:
      "Build on our open-source platform. Access our API and contribute to making cities more responsive.",
    checklist: [
      "Open source codebase",
      "RESTful API access",
      "Active community",
      "Extensive documentation",
    ],
    cta: {
      label: "View API Docs",
      href: "/docs",
      className:
        "inline-block w-full rounded-lg bg-[#1E293B] px-5 py-2.5 text-center text-sm font-semibold text-white transition-opacity hover:opacity-90",
    },
  },
];

export default function BuiltForEveryone() {
  return (
    <section className="bg-section-primary py-20 sm:py-28">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Heading */}
        <div className="text-center">
          <h2 className="text-2xl font-bold text-foreground sm:text-3xl">
            Built for Everyone
          </h2>
          <p className="mx-auto mt-3 mb-14 max-w-2xl text-sm text-muted-foreground sm:text-base">
            Whether you&apos;re a concerned citizen, local government, or
            developer, we have tools designed for you.
          </p>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {AUDIENCES.map((audience) => (
            <div
              key={audience.title}
              className="flex flex-col rounded-xl border border-border bg-white p-6 dark:bg-surface"
            >
              {/* Icon & Title */}
              <div className="flex items-center gap-4">
                <div
                  className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-xl ${audience.iconBg} ${audience.iconBg === "bg-[#1E293B]" ? "text-white" : "text-black"}`}
                >
                  {audience.icon}
                </div>
                <h3 className="text-xl font-bold text-foreground">
                  {audience.title}
                </h3>
              </div>
              <p className="mt-2 text-base leading-relaxed text-muted-foreground">
                {audience.description}
              </p>

              {/* Checklist */}
              <ul className="mt-5 flex flex-col gap-2.5">
                {audience.checklist.map((item) => (
                  <li
                    key={item}
                    className="flex items-center gap-2 text-base text-foreground"
                  >
                    <Check className="h-4 w-4 shrink-0 text-emerald-500" />
                    {item}
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <div className="mt-auto pt-6">
                <Link href={audience.cta.href} className={audience.cta.className}>
                  {audience.cta.label}
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
