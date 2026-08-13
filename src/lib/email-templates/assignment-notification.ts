import { emailLayout, ctaButton } from "./layout";

const PRIORITY_LABELS: Record<string, string> = {
  critical: "Critical",
  high: "High",
  medium: "Medium",
  low: "Low",
};

interface AssignmentNotificationEmailProps {
  displayName: string;
  reportTitle: string;
  priority: string | null;
  categoryName: string;
  locationText: string | null;
  reporterName: string;
  assignedByName: string;
  tenantName: string;
  reportUrl: string;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function assignmentNotificationEmailHtml({
  displayName,
  reportTitle,
  priority,
  categoryName,
  locationText,
  reporterName,
  assignedByName,
  tenantName,
  reportUrl,
}: AssignmentNotificationEmailProps): string {
  const priorityLabel = priority ? (PRIORITY_LABELS[priority] ?? priority) : "Not set";

  const locationRow = locationText
    ? `<tr>
        <td style="padding:6px 0;font-size:13px;color:#71717a;width:100px;">Location</td>
        <td style="padding:6px 0;font-size:13px;color:#18181b;">${escapeHtml(locationText)}</td>
      </tr>`
    : "";

  return emailLayout(`
    <p style="margin:0 0 16px;font-size:15px;color:#18181b;line-height:1.6;">
      Hi ${escapeHtml(displayName)},
    </p>
    <p style="margin:0 0 20px;font-size:15px;color:#18181b;line-height:1.6;">
      A report has been assigned to you by <strong>${escapeHtml(assignedByName)}</strong>.
    </p>

    <!-- Report summary card -->
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%"
      style="border:1px solid #e4e4e7;border-radius:8px;margin-bottom:24px;overflow:hidden;">
      <tr>
        <td style="background-color:#f8fafc;padding:16px;">
          <p style="margin:0 0 12px;font-size:15px;font-weight:600;color:#18181b;line-height:1.4;">
            &ldquo;${escapeHtml(reportTitle)}&rdquo;
          </p>
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
            <tr>
              <td style="padding:6px 0;font-size:13px;color:#71717a;width:100px;">Priority</td>
              <td style="padding:6px 0;font-size:13px;color:#18181b;">${escapeHtml(priorityLabel)}</td>
            </tr>
            <tr>
              <td style="padding:6px 0;font-size:13px;color:#71717a;">Category</td>
              <td style="padding:6px 0;font-size:13px;color:#18181b;">${escapeHtml(categoryName)}</td>
            </tr>
            ${locationRow}
            <tr>
              <td style="padding:6px 0;font-size:13px;color:#71717a;">Reporter</td>
              <td style="padding:6px 0;font-size:13px;color:#18181b;">${escapeHtml(reporterName)}</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    ${ctaButton(reportUrl, "View Report")}
    <p style="margin:0;font-size:13px;color:#71717a;line-height:1.5;">
      You are receiving this email because a report was assigned to you at ${escapeHtml(tenantName)} via CityOps.
    </p>
  `);
}
