import { emailLayout, ctaButton } from "./layout";

interface ReportSubmissionEmailProps {
  displayName: string;
  reportTitle: string;
  reportId: number;
  tenantName: string;
  reportUrl: string;
}

export function reportSubmissionEmailHtml({
  displayName,
  reportTitle,
  reportId,
  tenantName,
  reportUrl,
}: ReportSubmissionEmailProps): string {
  const reference = String(reportId).padStart(8, "0");

  return emailLayout(`
    <p style="margin:0 0 16px;font-size:15px;color:#18181b;line-height:1.6;">
      Hi ${displayName},
    </p>
    <p style="margin:0 0 16px;font-size:15px;color:#18181b;line-height:1.6;">
      Thank you for submitting your report. We've received it and it is now being reviewed by <strong>${tenantName}</strong>.
    </p>
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 24px;width:100%;border:1px solid #e4e4e7;border-radius:8px;overflow:hidden;">
      <tr>
        <td style="padding:16px;">
          <p style="margin:0 0 4px;font-size:12px;color:#71717a;text-transform:uppercase;letter-spacing:0.5px;">Report</p>
          <p style="margin:0 0 12px;font-size:15px;font-weight:600;color:#18181b;">${reportTitle}</p>
          <p style="margin:0;font-size:12px;color:#71717a;">Reference: <strong style="color:#18181b;">#${reference}</strong></p>
        </td>
      </tr>
    </table>
    ${ctaButton(reportUrl, "View Your Report")}
    <p style="margin:0;font-size:13px;color:#71717a;line-height:1.5;">
      We'll email you whenever the status of your report changes. You can also check progress any time using the link above.
    </p>
  `);
}
