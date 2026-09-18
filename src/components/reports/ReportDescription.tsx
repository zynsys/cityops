interface ReportDescriptionProps {
  description: string;
}

export default function ReportDescription({ description }: ReportDescriptionProps) {
  return (
    <section>
      <h2 className="text-lg font-semibold tracking-tight text-foreground">Description</h2>
      <p className="mt-4 whitespace-pre-line break-words text-sm leading-7 text-muted-foreground sm:text-base">
        {description}
      </p>
    </section>
  );
}
