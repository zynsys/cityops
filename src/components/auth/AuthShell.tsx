import type { ReactNode } from 'react';
import { ClipboardList, MapPin, Route } from 'lucide-react';

interface AuthShellProps {
  children: ReactNode;
}

export default function AuthShell({ children }: AuthShellProps) {
  return (
    <div className="page-shell flex flex-1 items-center justify-center py-10 sm:py-14">
      <div className="surface-card grid w-full max-w-lg overflow-hidden lg:max-w-5xl lg:grid-cols-[0.9fr_1.1fr]">
        <aside
          aria-label="About CityOps"
          className="hidden flex-col border-r border-border bg-section-alt p-10 lg:flex"
        >
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-surface text-accent">
              <MapPin className="h-5 w-5" aria-hidden="true" />
            </span>
            <span className="text-lg font-semibold tracking-tight text-foreground">CityOps</span>
          </div>

          <div className="my-auto py-12">
            <p className="eyebrow">Your place. Your voice.</p>
            <p className="mt-4 text-3xl font-semibold leading-tight tracking-tight text-foreground">
              Help shape the places you call home.
            </p>
            <p className="mt-5 text-sm leading-relaxed text-muted-foreground">
              Report local issues and follow their progress with CityOps.
            </p>
          </div>

          <div className="space-y-5 border-t border-border pt-6">
            <div className="flex gap-3">
              <ClipboardList className="mt-0.5 h-5 w-5 shrink-0 text-accent" aria-hidden="true" />
              <div>
                <p className="text-sm font-medium text-foreground">Report with clarity</p>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  Share the details that help your council understand an issue.
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <Route className="mt-0.5 h-5 w-5 shrink-0 text-accent" aria-hidden="true" />
              <div>
                <p className="text-sm font-medium text-foreground">Follow the progress</p>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  Keep track of your reports, all in one place.
                </p>
              </div>
            </div>
          </div>
        </aside>

        <div className="flex min-w-0 flex-col justify-center px-6 py-8 sm:px-10 sm:py-10 lg:p-12">
          <div className="mb-8 flex items-center gap-2.5 lg:hidden">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-muted text-accent">
              <MapPin className="h-5 w-5" aria-hidden="true" />
            </span>
            <span className="text-base font-semibold tracking-tight text-foreground">CityOps</span>
          </div>
          <div className="mx-auto w-full max-w-md">{children}</div>
        </div>
      </div>
    </div>
  );
}
