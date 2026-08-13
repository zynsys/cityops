import HeroSection from "@/components/hero/HeroSection";
import RecentReports from "@/components/reports/RecentReports";
import HowItWorks from "@/components/how-it-works/HowItWorks";
import BuiltForEveryone from "@/components/built-for-everyone/BuiltForEveryone";

export const dynamic = "force-dynamic";

export default function Home() {
  return (
    <div className="flex-1">
      <HeroSection />
      <RecentReports />
      <HowItWorks />
      <BuiltForEveryone />
    </div>
  );
}
