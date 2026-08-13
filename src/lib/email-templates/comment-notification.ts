import { emailLayout, ctaButton } from "./layout";

const COMMENT_TRUNCATE_LENGTH = 300;

interface CommentNotificationEmailProps {
  displayName: string;
  reportTitle: string;
  commenterName: string;
  commentBody: string;
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

function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + "...";
}

export function commentNotificationEmailHtml({
  displayName,
  reportTitle,
  commenterName,
  commentBody,
  tenantName,
  reportUrl,
}: CommentNotificationEmailProps): string {
  const safeComment = escapeHtml(truncate(commentBody, COMMENT_TRUNCATE_LENGTH));
  const safeCommenter = escapeHtml(commenterName);
  const safeTitle = escapeHtml(reportTitle);
  const safeTenant = escapeHtml(tenantName);
  const safeDisplayName = escapeHtml(displayName);

  return emailLayout(`
    <p style="margin:0 0 16px;font-size:15px;color:#18181b;line-height:1.6;">
      Hi ${safeDisplayName},
    </p>
    <p style="margin:0 0 16px;font-size:15px;color:#18181b;line-height:1.6;">
      <strong>${safeCommenter}</strong> commented on your report <strong>&ldquo;${safeTitle}&rdquo;</strong>:
    </p>
    <blockquote style="margin:0 0 24px;padding:12px 16px;border-left:4px solid #3B82F6;background-color:#f8fafc;border-radius:0 6px 6px 0;">
      <p style="margin:0;font-size:14px;color:#374151;line-height:1.6;white-space:pre-wrap;">${safeComment}</p>
    </blockquote>
    ${ctaButton(reportUrl, "View Report")}
    <p style="margin:0;font-size:13px;color:#71717a;line-height:1.5;">
      You are receiving this email because you submitted a report to ${safeTenant} via CityOps.
    </p>
  `);
}
