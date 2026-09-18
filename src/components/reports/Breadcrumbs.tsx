import Link from "next/link";
import { ChevronRight, Home } from "lucide-react";

interface BreadcrumbsProps {
  reportTitle: string;
}

export default function Breadcrumbs({ reportTitle }: BreadcrumbsProps) {
  return (
    <nav aria-label="Breadcrumb" className="min-w-0 text-sm text-muted-foreground">
      <ol className="flex min-w-0 items-center gap-2">
        <li className="shrink-0">
          <Link href="/" className="link-hover flex min-h-11 items-center gap-1.5 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
            <Home className="h-4 w-4" aria-hidden="true" />
            <span>Home</span>
          </Link>
        </li>
        <li className="flex shrink-0 items-center gap-2">
          <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
          <Link href="/map" className="link-hover inline-flex min-h-11 items-center rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
            Map
          </Link>
        </li>
        <li className="flex min-w-0 items-center gap-2">
          <ChevronRight className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span aria-current="page" title={reportTitle} className="truncate font-medium text-foreground">
            {reportTitle}
          </span>
        </li>
      </ol>
    </nav>
  );
}
