import { emailLayout, ctaButton } from "./layout";

type StaffRole = "authority_user" | "tenant_admin";

interface StaffInvitationEmailProps {
  invitationUrl: string;
  tenantName: string;
  inviterName: string;
  role: StaffRole;
  displayName?: string;
}

const ROLE_LABELS: Record<StaffRole, string> = {
  authority_user: "Authority user",
  tenant_admin: "Tenant admin",
};

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function staffInvitationEmailHtml({
  invitationUrl,
  tenantName,
  inviterName,
  role,
  displayName,
}: StaffInvitationEmailProps): string {
  const greeting = displayName ? `Hi ${escapeHtml(displayName)},` : "Hello,";

  return emailLayout(`
    <p style="margin:0 0 16px;font-size:15px;color:#18181b;line-height:1.6;">
      ${greeting}
    </p>
    <p style="margin:0 0 16px;font-size:15px;color:#18181b;line-height:1.6;">
      <strong>${escapeHtml(inviterName)}</strong> has invited you to join <strong>${escapeHtml(tenantName)}</strong> on CityOps as a <strong>${ROLE_LABELS[role]}</strong>.
    </p>
    ${ctaButton(escapeHtml(invitationUrl), "Accept Invitation")}
    <p style="margin:0;font-size:13px;color:#71717a;line-height:1.5;">
      This invitation link is time-limited and is only for joining ${escapeHtml(tenantName)}. If you weren't expecting this invitation, you can safely ignore this email.
    </p>
  `);
}
