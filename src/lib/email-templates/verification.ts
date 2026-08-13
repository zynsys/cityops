import { emailLayout, ctaButton } from "./layout";

interface VerificationEmailProps {
  verificationUrl: string;
  displayName?: string;
}

export function verificationEmailHtml({
  verificationUrl,
  displayName,
}: VerificationEmailProps): string {
  const greeting = displayName ? `Hi ${displayName},` : "Hi,";

  return emailLayout(`
    <p style="margin:0 0 16px;font-size:15px;color:#18181b;line-height:1.6;">
      ${greeting}
    </p>
    <p style="margin:0 0 16px;font-size:15px;color:#18181b;line-height:1.6;">
      Thanks for signing up for CityOps. Please verify your email address by clicking the button below.
    </p>
    ${ctaButton(verificationUrl, "Verify Email")}
    <p style="margin:0 0 8px;font-size:13px;color:#71717a;line-height:1.5;">
      This link expires in 24 hours. If you didn't create an account, you can safely ignore this email.
    </p>
  `);
}
