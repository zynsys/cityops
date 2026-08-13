"use client";

import { useRouter, usePathname } from "next/navigation";

interface RefreshLinkProps {
  href: string;
  className?: string;
  children: React.ReactNode;
}

/**
 * A nav link that forces a full page refresh when clicking a link to the
 * route you're already on. Needed for wizard pages (e.g. /reports/new)
 * where state lives in the page component and a same-URL click would
 * otherwise do nothing.
 */
export default function RefreshLink({ href, className, children }: RefreshLinkProps) {
  const router = useRouter();
  const pathname = usePathname();

  function handleClick(e: React.MouseEvent<HTMLAnchorElement>) {
    if (pathname === href) {
      e.preventDefault();
      router.push(href);
      router.refresh();
    }
  }

  return (
    <a href={href} className={className} onClick={handleClick}>
      {children}
    </a>
  );
}
