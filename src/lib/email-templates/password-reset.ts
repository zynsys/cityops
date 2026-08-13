import { emailLayout, ctaButton } from "./layout";

interface PasswordResetEmailProps {
  resetUrl: string;
  displayName?: string;
}

export function passwordResetEmailHtml({
  resetUrl,
  displayName,
}: PasswordResetEmailProps): string {
  const greeting = displayName ? `Hi ${displayName},` : "Hi,";

  return emailLayout(`
    <p style="margin:0 0 16px;font-size:15px;color:#18181b;line-height:1.6;">
      ${greeting}
    </p>
    <p style="margin:0 0 16px;font-size:15px;color:#18181b;line-height:1.6;">
      We received a request to reset your CityOps password. Click the button below to choose a new password.
    </p>
    ${ctaButton(resetUrl, "Reset Password")}
    <p style="margin:0 0 8px;font-size:13px;color:#71717a;line-height:1.5;">
      This link expires in 1 hour. If you didn't request a password reset, you can safely ignore this email.
    </p>
  `);
}
