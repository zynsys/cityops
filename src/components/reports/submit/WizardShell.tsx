"use client";

import { Check, MapPin, Tag, FileText, Camera, CheckCircle } from "lucide-react";
import type { ReactNode } from "react";

const STEPS = [
  { id: 1, label: "Photos", icon: Camera },
  { id: 2, label: "Location", icon: MapPin },
  { id: 3, label: "Details", icon: FileText },
  { id: 4, label: "Category", icon: Tag },
  { id: 5, label: "Review", icon: CheckCircle },
];

interface WizardShellProps {
  currentStep: number;
  children: ReactNode;
}

export default function WizardShell({ currentStep, children }: WizardShellProps) {
  return (
    <div className="fixed inset-x-0 top-[65px] bottom-0 flex flex-col bg-background z-20">
      {/* Step progress bar */}
      <div className="border-b border-border bg-surface px-4 py-3 shrink-0">
        <ol className="flex items-center justify-center gap-1 sm:gap-3">
          {STEPS.map((step, idx) => {
            const isCompleted = currentStep > step.id;
            const isActive = currentStep === step.id;
            const Icon = step.icon;

            return (
              <li key={step.id} className="flex items-center gap-1 sm:gap-2">
                {/* Circle indicator */}
                <span
                  className={[
                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-colors",
                    isCompleted
                      ? "bg-green-500 text-white"
                      : isActive
                        ? "bg-accent text-accent-foreground"
                        : "bg-muted text-muted-foreground",
                  ].join(" ")}
                  aria-current={isActive ? "step" : undefined}
                >
                  {isCompleted ? <Check size={14} /> : <Icon size={14} />}
                </span>

                {/* Label — visible on sm+ */}
                <span
                  className={[
                    "hidden sm:block text-xs font-medium transition-colors",
                    isActive
                      ? "text-foreground"
                      : isCompleted
                        ? "text-green-500"
                        : "text-muted-foreground",
                  ].join(" ")}
                >
                  {step.label}
                </span>

                {/* Connector line between steps */}
                {idx < STEPS.length - 1 && (
                  <span className="hidden sm:block w-6 lg:w-10 h-px bg-border mx-1" />
                )}
              </li>
            );
          })}
        </ol>
      </div>

      {/* Step content */}
      <div className="flex-1 overflow-hidden">{children}</div>
    </div>
  );
}
