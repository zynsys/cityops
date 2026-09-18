'use client';

import { useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, ArrowLeft, ArrowRight } from 'lucide-react';
import { useReportSubmission } from './ReportSubmissionContext';
import { step3Schema, type Step3Input } from '@/lib/validations/reports';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="mt-2 flex items-start gap-2 text-sm text-danger" role="alert">
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      {message}
    </p>
  );
}

const inputClass = (hasError: boolean) =>
  `input-field ${hasError ? 'border-danger focus:border-danger focus:ring-danger/15' : 'border-border'}`;

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
  const color = current > dangerAt ? 'text-danger' : current > warnAt ? 'text-warning' : 'text-muted-foreground';
  return (
    <span id={id} aria-live="polite" aria-atomic="true" className={`text-xs tabular-nums ${color}`}>
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

export default function Step3Details({ onBack, onNext, onGoToStep }: Step3DetailsProps) {
  const { state, dispatch } = useReportSubmission();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isValid },
  } = useForm<Step3Input>({
    resolver: zodResolver(step3Schema),
    mode: 'onChange',
    defaultValues: {
      title: state.title,
      description: state.description,
      locationText: state.locationText,
    },
  });

  // react-hook-form's watch() cannot be memoized by React Compiler; that is
  // expected for this API, so silence the incompatible-library notice.
  /* eslint-disable react-hooks/incompatible-library */
  const titleValue = watch('title') ?? '';
  const descValue = watch('description') ?? '';
  const locValue = watch('locationText') ?? '';
  /* eslint-enable react-hooks/incompatible-library */

  // Auto-expand textarea
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const { ref: rhfRef, ...descReg } = register('description');

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 300)}px`;
  }, [descValue]);

  function onSubmit(data: Step3Input) {
    dispatch({
      type: 'SET_DETAILS',
      title: data.title,
      description: data.description,
      locationText: data.locationText ?? '',
    });
    onNext();
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Scrollable form area */}
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6 sm:py-7">
        <div className="surface-card mx-auto w-full max-w-2xl p-5 sm:p-6">
          <header className="mb-6">
            <p className="eyebrow mb-2">Step 3 · Details</p>
            <h2 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">Describe the problem</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              A clear title and description help council staff understand what needs attention.
            </p>
          </header>
          {/* Contextual summary chip */}
          <div className="mb-6 flex flex-wrap gap-2 text-xs">
            {state.tenantName && (
              <span className="flex w-full flex-wrap items-center gap-x-2 rounded-xl border border-border bg-background px-3 py-1 text-muted-foreground">
                Council: <span className="font-medium text-foreground">{state.tenantName}</span>
                <button
                  type="button"
                  onClick={() => onGoToStep(2)}
                  className="ml-auto inline-flex min-h-11 shrink-0 items-center rounded-lg px-2 font-medium text-accent underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                >
                  Change
                </button>
              </span>
            )}
          </div>

          <form id="step3-form" onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-6">
            {/* Title */}
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label htmlFor="title" className="field-label mb-0">
                  Title{' '}
                  <span className="text-danger" aria-hidden="true">
                    *
                  </span>
                </label>
                <CharCounter id="title-counter" current={titleValue.length} max={255} warnAt={200} dangerAt={240} />
              </div>
              <input
                id="title"
                type="text"
                placeholder="e.g. Large pothole on the corner of…"
                aria-required="true"
                aria-invalid={errors.title ? 'true' : 'false'}
                aria-describedby={errors.title ? 'title-error title-counter' : 'title-counter'}
                {...register('title')}
                className={inputClass(!!errors.title)}
              />
              <FieldError id="title-error" message={errors.title?.message} />
            </div>

            {/* Description */}
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label htmlFor="description" className="field-label mb-0">
                  Description{' '}
                  <span className="text-danger" aria-hidden="true">
                    *
                  </span>
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
                aria-required="true"
                aria-invalid={errors.description ? 'true' : 'false'}
                aria-describedby={errors.description ? 'description-error description-counter' : 'description-counter'}
                rows={4}
                style={{ maxHeight: '300px', resize: 'none', overflowY: 'auto' }}
                {...descReg}
                ref={(el) => {
                  rhfRef(el);
                  textareaRef.current = el;
                }}
                className={`${inputClass(!!errors.description)} leading-relaxed`}
              />
              <FieldError id="description-error" message={errors.description?.message} />
            </div>

            {/* Location label (optional) */}
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label htmlFor="locationText" className="field-label mb-0">
                  Location label <span className="text-xs font-normal text-muted-foreground">(optional)</span>
                </label>
                {locValue.length > 0 && (
                  <CharCounter id="location-counter" current={locValue.length} max={500} warnAt={400} dangerAt={480} />
                )}
              </div>
              <input
                id="locationText"
                type="text"
                placeholder="e.g. Outside the library on High Street"
                aria-invalid={errors.locationText ? 'true' : 'false'}
                aria-describedby={errors.locationText ? 'location-error' : undefined}
                {...register('locationText')}
                className={inputClass(!!errors.locationText)}
              />
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                Optional — helps staff find the exact spot.
              </p>
              <FieldError id="location-error" message={errors.locationText?.message} />
            </div>
          </form>
        </div>
      </div>

      {/* Bottom navigation */}
      <div className="flex shrink-0 items-center justify-between gap-3 border-t border-border bg-surface px-4 py-3 sm:px-6 sm:py-4">
        <button type="button" onClick={onBack} className="btn-secondary">
          <ArrowLeft size={16} aria-hidden="true" />
          Back
        </button>

        <button
          type="submit"
          form="step3-form"
          disabled={!isValid}
          aria-disabled={!isValid}
          className={[
            'btn-primary min-w-24 shrink-0',
            isValid ? 'bg-accent text-accent-foreground' : 'bg-muted text-muted-foreground shadow-none',
          ].join(' ')}
        >
          Next
          <ArrowRight size={16} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
