import {
  MapPin,
  Bell,
  CircleCheckBig,
  Award,
  Gift,
} from "lucide-react";

interface Step {
  number: string;
  icon: React.ReactNode;
  title: string;
  description: string;
}

const STEPS: Step[] = [
  {
    number: "01",
    icon: <MapPin className="h-8 w-8" />,
    title: "Spot & Report",
    description:
      "See a problem in your neighborhood? Take a photo and submit a report with your location.",
  },
  {
    number: "02",
    icon: <Bell className="h-8 w-8" />,
    title: "Council Notified",
    description:
      "Your report is instantly sent to the local council. Track progress with real-time updates.",
  },
  {
    number: "03",
    icon: <CircleCheckBig className="h-8 w-8" />,
    title: "Report Verified & Fixed",
    description:
      "The council reviews and verifies your report, then works to resolve it. You receive updates throughout the process.",
  },
  {
    number: "04",
    icon: <Award className="h-8 w-8" />,
    title: "Earn Badges & Points",
    description:
      "Once verified as valid, you earn points and badges. Build your community reputation with every contribution!",
  },
  {
    number: "05",
    icon: <Gift className="h-8 w-8" />,
    title: "Redeem Rewards",
    description:
      "Exchange your points for vouchers from local businesses. Get rewarded for making a difference!",
  },
];

export default function HowItWorks() {
  return (
    <section className="bg-section-alt py-20 sm:py-28">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Heading */}
        <div className="text-center">
          <h2 className="text-2xl font-bold text-foreground sm:text-3xl">
            How It Works
          </h2>
          <p className="mx-auto mt-3 mb-14 max-w-2xl text-sm text-muted-foreground sm:text-base">
            Reporting local problems is quick and easy. Here&apos;s how you can
            make a difference in just 5 simple steps.
          </p>
        </div>

        {/* Steps — desktop */}
        <div className="mt-12 hidden gap-10 lg:grid lg:grid-cols-5">
          {STEPS.map((step) => (
            <div key={step.number} className="flex flex-col items-start text-left">
              <div className="flex items-center gap-3">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 text-black">
                  {step.icon}
                </div>
                <span className="text-5xl font-bold text-foreground">
                  {step.number}
                </span>
              </div>

              <h3 className="mt-4 text-base font-bold text-foreground">
                {step.title}
              </h3>

              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {step.description}
              </p>
            </div>
          ))}
        </div>

        {/* Mobile layout */}
        <div className="mt-12 grid grid-cols-1 gap-10 sm:grid-cols-2 md:grid-cols-3 lg:hidden">
          {STEPS.map((step) => (
            <div key={step.number} className="flex flex-col items-start text-left">
              <div className="flex items-center gap-3">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 text-black">
                  {step.icon}
                </div>
                <span className="text-5xl font-bold text-foreground">
                  {step.number}
                </span>
              </div>

              <h3 className="mt-4 text-base font-bold text-foreground">
                {step.title}
              </h3>

              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
