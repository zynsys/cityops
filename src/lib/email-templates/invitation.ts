function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function invitationEmailHtml({
  tenantName,
  invitationUrl,
}: {
  tenantName: string;
  invitationUrl: string;
}): string {
  return `
    <h1>You're invited to CityOps</h1>
    <p>${escapeHtml(tenantName)} invited you to join their CityOps team.</p>
    <p><a href="${escapeHtml(invitationUrl)}">Accept your invitation</a></p>
    <p>This invitation expires in 7 days and can only be used once.</p>
  `;
}
