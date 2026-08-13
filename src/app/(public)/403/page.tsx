import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Access Denied — CityOps",
};

export default function ForbiddenPage() {
  return (
    <div className="flex flex-col items-center justify-center flex-1 px-4 py-24 text-center">
      <p className="text-6xl font-bold text-accent mb-4">403</p>
      <h1 className="text-2xl font-semibold text-foreground mb-2">Access Denied</h1>
      <p className="text-muted-foreground mb-8">
        You don&apos;t have permission to view this page.
      </p>
      <Link
        href="/"
        className="rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-white hover:opacity-90 transition-opacity"
      >
        Back to Home
      </Link>
    </div>
  );
}
