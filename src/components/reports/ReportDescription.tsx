interface ReportDescriptionProps {
  description: string;
}

export default function ReportDescription({ description }: ReportDescriptionProps) {
  return (
    <section>
      <h2 className="text-lg font-semibold text-white">Description</h2>
      <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-gray-300">
        {description}
      </p>
    </section>
  );
}
