import {
  MessageSquare,
  CheckCircle2,
  TrendingUp,
  Users,
  Goal,
  Trophy,
  Gift,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { getPlatformStats } from "@/db/queries/stats";
import FindReportsCard from "./FindReportsCard";
import QuickPhotoCard from "./QuickPhotoCard";

const FEATURE_PILLS = [
  { icon: Goal, label: "Submit reports in seconds", color: "text-rose-400" },
  { icon: Trophy, label: "Earn Points & Badges", color: "text-yellow-400" },
  { icon: Gift, label: "Redeem Local Vouchers", color: "text-red-400" },
  { icon: Sparkles, label: "Build Your Reputation", color: "text-amber-400" },
];

function formatStat(value: number): string {
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
  }
  return value.toLocaleString("en-GB");
}

export default async function HeroSection() {
  const stats = await getPlatformStats();

  const STATISTICS: { icon: LucideIcon; value: string; label: string }[] = [
    { icon: MessageSquare, value: formatStat(stats.reportsThisWeek), label: "Reports this week" },
    { icon: CheckCircle2, value: formatStat(stats.reportsFixed), label: "Reports fixed" },
    { icon: TrendingUp, value: formatStat(stats.updatesSent), label: "Updates sent" },
    { icon: Users, value: formatStat(stats.activeMembers), label: "Active members" },
  ];
  return (
    <section className="relative overflow-hidden bg-[#161F2F]">
      <div className="mx-auto max-w-6xl px-4 pt-16 pb-12 sm:px-6 lg:px-8">
        {/* Headline */}
        <div className="text-center">
          <h1 className="text-4xl font-bold leading-tight tracking-tight text-white sm:text-5xl sm:leading-tight lg:text-6xl lg:leading-tight">
            Make Your City
            <br />
            <span className="text-accent">Work Better</span>
          </h1>

          {/* Supporting copy */}
          <p className="mx-auto mt-5 max-w-2xl text-base text-gray-300 sm:text-lg">
            Spot a pothole? Broken street light? Graffiti? Report it in seconds,
            help your community, and{" "}
            <span className="font-semibold text-[#F0B100]">earn rewards</span> for
            making your city better.
          </p>
        </div>

        {/* Feature pills */}
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          {FEATURE_PILLS.map(({ icon: Icon, label, color }) => (
            <div
              key={label}
              className="flex items-center gap-2 rounded-full border border-gray-600 px-5 py-2.5 text-sm font-medium text-gray-200"
            >
              <Icon className={`h-5 w-5 ${color}`} />
              {label}
            </div>
          ))}
        </div>

        {/* Cards */}
        <div className="mx-auto mt-10 grid max-w-4xl gap-6 sm:grid-cols-2">
          {/* Find Reports Near You */}
          <FindReportsCard />

          {/* Quick Photo Report */}
          <QuickPhotoCard />
        </div>

        {/* Statistics */}
        <div className="mx-auto mt-10 grid max-w-4xl grid-cols-2 gap-4 sm:grid-cols-4">
          {STATISTICS.map(({ icon: Icon, value, label }) => (
            <div
              key={label}
              className="flex flex-col items-center rounded-xl border border-gray-700 bg-[#293342] px-4 py-5 text-center"
            >
              <Icon className="mb-2 h-6 w-6 text-[#F0B100]" />
              <span className="text-2xl font-bold text-white">{value}</span>
              <span className="mt-1 text-xs text-gray-400">{label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
