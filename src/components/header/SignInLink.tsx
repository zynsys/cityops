"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface SignInLinkProps {
  className?: string;
  onClick?: () => void;
  children?: React.ReactNode;
}

export function SignInLink({ className, onClick, children = "Sign In" }: SignInLinkProps) {
  const pathname = usePathname();
  const href =
    pathname && pathname !== "/sign-in"
      ? `/sign-in?callbackUrl=${encodeURIComponent(pathname)}`
      : "/sign-in";

  return (
    <Link href={href} className={className} onClick={onClick}>
      {children}
    </Link>
  );
}
