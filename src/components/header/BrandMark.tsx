import { Building2 } from 'lucide-react';

export function BrandMark() {
  return (
    <span
      className="inline-flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand text-brand-foreground"
      aria-hidden="true"
    >
      <Building2 className="size-5" strokeWidth={1.75} />
    </span>
  );
}
