import { emailLayout, ctaButton } from "./layout";

const STATUS_LABELS: Record<string, string> = {
  created: "Created",
  under_validation: "Under Validation",
  validated: "Validated",
  invalid: "Invalid",
  assigned: "Assigned",
  in_progress: "In Progress",
  resolved: "Resolved",
  closed: "Closed",
};

interface StatusChangeEmailProps {
  displayName: string;
  reportTitle: string;
  oldStatus: string;
  newStatus: string;
  tenantName: string;
  reportUrl: string;
}

export function statusChangeEmailHtml({
  displayName,
  reportTitle,
  oldStatus,
  newStatus,
  tenantName,
  reportUrl,
}: StatusChangeEmailProps): string {
  const oldLabel = STATUS_LABELS[oldStatus] ?? oldStatus;
  const newLabel = STATUS_LABELS[newStatus] ?? newStatus;

  return emailLayout(`
    <p style="margin:0 0 16px;font-size:15px;color:#18181b;line-height:1.6;">
      Hi ${displayName},
    </p>
    <p style="margin:0 0 16px;font-size:15px;color:#18181b;line-height:1.6;">
      The status of your report <strong>&ldquo;${reportTitle}&rdquo;</strong> has changed from
      <strong>${oldLabel}</strong> to <strong>${newLabel}</strong>.
    </p>
    <p style="margin:0 0 24px;font-size:15px;color:#18181b;line-height:1.6;">
      ${tenantName} is handling your report.
    </p>
    ${ctaButton(reportUrl, "View Report")}
    <p style="margin:0;font-size:13px;color:#71717a;line-height:1.5;">
      You are receiving this email because you submitted a report to ${tenantName} via CityOps.
    </p>
  `);
}
