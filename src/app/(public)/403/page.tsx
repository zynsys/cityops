import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, ShieldAlert } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Access Denied — CityOps',
};

export default function ForbiddenPage() {
  return (
    <div className="page-shell flex flex-1 items-center justify-center py-16 sm:py-24">
      <div className="surface-card w-full max-w-xl px-6 py-10 text-center sm:px-10 sm:py-12">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-border bg-muted text-muted-foreground">
          <ShieldAlert className="h-8 w-8" aria-hidden="true" />
        </div>
        <p className="eyebrow">Error 403</p>
        <h1 className="page-title mt-3">Access Denied</h1>
        <p className="page-description mx-auto">You don&apos;t have permission to view this page.</p>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          You can return to the homepage to continue.
        </p>
        <Link href="/" className="btn-primary mt-8">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to Home
        </Link>
      </div>
    </div>
  );
}
