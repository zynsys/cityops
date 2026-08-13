"use client";

import { useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, ArrowLeft, ArrowRight } from "lucide-react";
import { useReportSubmission } from "./ReportSubmissionContext";
import { step3Schema, type Step3Input } from "@/lib/validations/reports";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="mt-1.5 flex items-center gap-1 text-xs text-red-400">
      <AlertCircle className="h-3 w-3 shrink-0" />
      {message}
    </p>
  );
}

const inputClass = (hasError: boolean) =>
  `w-full rounded-lg border px-3 py-2.5 text-sm bg-background text-foreground placeholder:text-muted-foreground outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent/20 ${
    hasError ? "border-red-500" : "border-border"
  }`;

function CharCounter({
  id,
  current,
  max,
  warnAt,
  dangerAt,
}: {
  id: string;
  current: number;
  max: number;
  warnAt: number;
  dangerAt: number;
}) {
  const color =
    current > dangerAt
      ? "text-red-400"
      : current > warnAt
        ? "text-amber-400"
        : "text-muted-foreground";
  return (
    <span
      id={id}
      aria-live="polite"
      aria-atomic="true"
      className={`text-xs tabular-nums ${color}`}
    >
      {current} / {max}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface Step3DetailsProps {
  onBack: () => void;
  onNext: () => void;
  onGoToStep: (step: number) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function Step3Details({
  onBack,
  onNext,
  onGoToStep,
}: Step3DetailsProps) {
  const { state, dispatch } = useReportSubmission();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isValid },
  } = useForm<Step3Input>({
    resolver: zodResolver(step3Schema),
    mode: "onChange",
    defaultValues: {
      title: state.title,
      description: state.description,
      locationText: state.locationText,
    },
  });

  const titleValue = watch("title") ?? "";
  const descValue = watch("description") ?? "";
  const locValue = watch("locationText") ?? "";

  // Auto-expand textarea
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const { ref: rhfRef, ...descReg } = register("description");

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 300)}px`;
  }, [descValue]);

  function onSubmit(data: Step3Input) {
    dispatch({
      type: "SET_DETAILS",
      title: data.title,
      description: data.description,
      locationText: data.locationText ?? "",
    });
    onNext();
  }

  return (
    <div className="flex flex-col h-full">
      {/* Scrollable form area */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
      <div className="max-w-2xl mx-auto w-full">
        {/* Contextual summary chip */}
        <div className="mb-6 flex flex-wrap gap-2 text-xs">
          {state.tenantName && (
            <span className="flex items-center gap-1.5 rounded-full border border-border bg-muted px-3 py-1 text-muted-foreground">
              Council:{" "}
              <span className="font-medium text-foreground">
                {state.tenantName}
              </span>
              <button
                type="button"
                onClick={() => onGoToStep(2)}
                className="ml-1 text-accent underline hover:no-underline"
              >
                Change
              </button>
            </span>
          )}
        </div>

        <form
          id="step3-form"
          onSubmit={handleSubmit(onSubmit)}
          noValidate
          className="flex flex-col gap-5"
        >
          {/* Title */}
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label
                htmlFor="title"
                className="text-sm font-medium text-foreground"
              >
                Title <span className="text-red-400">*</span>
              </label>
              <CharCounter
                id="title-counter"
                current={titleValue.length}
                max={255}
                warnAt={200}
                dangerAt={240}
              />
            </div>
            <input
              id="title"
              type="text"
              placeholder="e.g. Large pothole on the corner of…"
              aria-invalid={errors.title ? "true" : "false"}
              aria-describedby={
                errors.title ? "title-error title-counter" : "title-counter"
              }
              {...register("title")}
              className={inputClass(!!errors.title)}
            />
            <FieldError id="title-error" message={errors.title?.message} />
          </div>

          {/* Description */}
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label
                htmlFor="description"
                className="text-sm font-medium text-foreground"
              >
                Description <span className="text-red-400">*</span>
              </label>
              <CharCounter
                id="description-counter"
                current={descValue.length}
                max={2000}
                warnAt={1800}
                dangerAt={1950}
              />
            </div>
            <textarea
              id="description"
              placeholder="Describe the problem in detail. Include anything that might help the council respond — how long it has been there, any safety concerns, etc."
              aria-invalid={errors.description ? "true" : "false"}
              aria-describedby={
                errors.description
                  ? "description-error description-counter"
                  : "description-counter"
              }
              rows={4}
              style={{ maxHeight: "300px", resize: "none", overflowY: "auto" }}
              {...descReg}
              ref={(el) => {
                rhfRef(el);
                textareaRef.current = el;
              }}
              className={`${inputClass(!!errors.description)} leading-relaxed`}
            />
            <FieldError
              id="description-error"
              message={errors.description?.message}
            />
          </div>

          {/* Location label (optional) */}
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label
                htmlFor="locationText"
                className="text-sm font-medium text-foreground"
              >
                Location label{" "}
                <span className="text-xs font-normal text-muted-foreground">
                  (optional)
                </span>
              </label>
              {locValue.length > 0 && (
                <CharCounter
                  id="location-counter"
                  current={locValue.length}
                  max={500}
                  warnAt={400}
                  dangerAt={480}
                />
              )}
            </div>
            <input
              id="locationText"
              type="text"
              placeholder="e.g. Outside the library on High Street"
              aria-invalid={errors.locationText ? "true" : "false"}
              aria-describedby={
                errors.locationText ? "location-error" : undefined
              }
              {...register("locationText")}
              className={inputClass(!!errors.locationText)}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Optional — helps staff find the exact spot.
            </p>
            <FieldError
              id="location-error"
              message={errors.locationText?.message}
            />
          </div>
        </form>
      </div>
      </div>

      {/* Bottom navigation */}
      <div className="shrink-0 border-t border-border bg-surface px-4 py-3 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold border border-border text-foreground hover:bg-muted transition-colors"
        >
          <ArrowLeft size={16} />
          Back
        </button>

        <button
          type="submit"
          form="step3-form"
          disabled={!isValid}
          aria-disabled={!isValid}
          className={[
            "flex items-center gap-2 rounded-lg px-5 py-2 text-sm font-semibold transition-colors shrink-0",
            isValid
              ? "bg-accent text-accent-foreground hover:opacity-90 cursor-pointer"
              : "bg-muted text-muted-foreground cursor-not-allowed opacity-50",
          ].join(" ")}
        >
          Next
          <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );
}
