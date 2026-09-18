'use client';

import { Check, MapPin, Tag, FileText, Camera, CheckCircle } from 'lucide-react';
import type { ReactNode } from 'react';

const STEPS = [
  { id: 1, label: 'Photos', icon: Camera },
  { id: 2, label: 'Location', icon: MapPin },
  { id: 3, label: 'Details', icon: FileText },
  { id: 4, label: 'Category', icon: Tag },
  { id: 5, label: 'Review', icon: CheckCircle },
];

interface WizardShellProps {
  currentStep: number;
  children: ReactNode;
}

export default function WizardShell({ currentStep, children }: WizardShellProps) {
  return (
    <div className="fixed inset-x-0 top-[65px] bottom-0 z-20 flex min-h-0 flex-col bg-background lg:p-5 xl:p-6">
      <div className="mx-auto flex min-h-0 w-full max-w-6xl flex-1 flex-col overflow-hidden lg:flex-row lg:rounded-2xl lg:border lg:border-border lg:bg-surface lg:shadow-soft">
        {/* Progress sidebar on desktop; compact stepper on mobile. */}
        <aside className="shrink-0 border-b border-border bg-surface lg:w-56 lg:overflow-y-auto lg:border-r lg:border-b-0 lg:bg-background/50 xl:w-60">
          <header className="px-4 pt-4 pb-2 sm:px-6 lg:py-6">
            <p className="eyebrow mb-2 hidden lg:block">Community reporting</p>
            <h1 className="text-lg font-semibold tracking-tight text-foreground sm:text-xl">Submit a report</h1>
            <p className="mt-2 hidden text-sm leading-relaxed text-muted-foreground lg:block">
              Share an issue with your local council.
            </p>
          </header>
          <nav aria-label="Report submission progress" className="px-3 pb-3 sm:px-5 lg:px-3 lg:pb-6">
            <ol className="grid grid-cols-5 gap-1 sm:gap-2 lg:flex lg:flex-col">
              {STEPS.map((step, idx) => {
                const isCompleted = currentStep > step.id;
                const isActive = currentStep === step.id;
                const Icon = step.icon;

                return (
                  <li
                    key={step.id}
                    className="relative flex min-w-0 flex-col items-center gap-1.5 px-1 py-2 lg:flex-row lg:gap-3 lg:rounded-xl lg:px-3 lg:py-3"
                  >
                    {/* Circle indicator */}
                    <span
                      className={[
                        'relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-xs font-semibold transition-colors lg:h-10 lg:w-10',
                        isCompleted
                          ? 'bg-success/10 text-success ring-1 ring-inset ring-success/20'
                          : isActive
                            ? 'bg-accent text-accent-foreground shadow-soft'
                            : 'bg-muted text-muted-foreground ring-1 ring-inset ring-border',
                      ].join(' ')}
                      aria-current={isActive ? 'step' : undefined}
                    >
                      {isCompleted ? (
                        <>
                          <Check size={16} aria-hidden="true" />
                          <span className="sr-only">Completed</span>
                        </>
                      ) : (
                        <Icon size={16} aria-hidden="true" />
                      )}
                    </span>

                    {/* Keep every step label visible, including on small screens. */}
                    <span
                      className={[
                        'min-w-0 text-center text-[11px] leading-snug font-medium transition-colors sm:text-xs lg:text-left lg:text-sm',
                        isActive ? 'text-foreground' : isCompleted ? 'text-success' : 'text-muted-foreground',
                      ].join(' ')}
                    >
                      <span className="sr-only lg:not-sr-only lg:mb-0.5 lg:block lg:text-[10px] lg:font-medium lg:tracking-wider lg:text-muted-foreground lg:uppercase">
                        Step {step.id}
                      </span>
                      {step.label}
                    </span>

                    {/* Connector line between steps */}
                    {idx < STEPS.length - 1 && (
                      <span
                        className="absolute top-6 right-[calc(-50%+1.25rem)] left-[calc(50%+1.25rem)] h-px bg-border lg:hidden"
                        aria-hidden="true"
                      />
                    )}
                  </li>
                );
              })}
            </ol>
          </nav>
        </aside>

        {/* Step content */}
        <div className="min-h-0 min-w-0 flex-1 overflow-hidden bg-background/40">{children}</div>
      </div>
    </div>
  );
}
