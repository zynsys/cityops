import Link from "next/link";
import { ChevronRight, Home } from "lucide-react";

interface BreadcrumbsProps {
  reportTitle: string;
}

export default function Breadcrumbs({ reportTitle }: BreadcrumbsProps) {
  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm text-muted-foreground">
      <Link href="/" className="flex items-center gap-1 link-hover">
        <Home className="h-3.5 w-3.5" />
        <span>Home</span>
      </Link>
      <ChevronRight className="h-3.5 w-3.5" />
      <Link href="/map" className="link-hover">
        Map
      </Link>
      <ChevronRight className="h-3.5 w-3.5" />
      <span className="max-w-[200px] truncate text-foreground sm:max-w-[400px]">
        {reportTitle}
      </span>
    </nav>
  );
}
