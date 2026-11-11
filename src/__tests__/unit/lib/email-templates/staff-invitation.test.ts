import { describe, expect, it } from "vitest";
import { staffInvitationEmailHtml } from "@/lib/email-templates/staff-invitation";

describe("staffInvitationEmailHtml", () => {
  it("renders the invitee, tenant, inviter, role, and accept action", () => {
    const html = staffInvitationEmailHtml({
      displayName: "Alex",
      inviterName: "Sam",
      tenantName: "North Council",
      role: "authority_user",
      invitationUrl: "https://cityops.example/invitations/accept?token=abc",
    });

    expect(html).toContain("Hi Alex,");
    expect(html).toContain("<strong>Sam</strong> has invited you");
    expect(html).toContain("<strong>North Council</strong>");
    expect(html).toContain("<strong>Authority user</strong>");
    expect(html).toContain("Accept Invitation");
    expect(html).toContain("This invitation link is time-limited");
  });

  it("uses a generic greeting when no invitee name is provided", () => {
    const html = staffInvitationEmailHtml({
      inviterName: "Sam",
      tenantName: "North Council",
      role: "tenant_admin",
      invitationUrl: "https://cityops.example/invitations/accept",
    });

    expect(html).toContain("Hello,");
    expect(html).toContain("<strong>Tenant admin</strong>");
  });

  it("escapes dynamic text and the invitation URL", () => {
    const html = staffInvitationEmailHtml({
      displayName: '<Alex "A">',
      inviterName: "<Sam & Co>",
      tenantName: "Council's <North>",
      role: "authority_user",
      invitationUrl: 'https://cityops.example/accept?token="bad"&next=<script>',
    });

    expect(html).toContain("Hi &lt;Alex &quot;A&quot;&gt;,");
    expect(html).toContain("&lt;Sam &amp; Co&gt;");
    expect(html).toContain("Council&#39;s &lt;North&gt;");
    expect(html).toContain('href="https://cityops.example/accept?token=&quot;bad&quot;&amp;next=&lt;script&gt;"');
    expect(html).not.toContain("<script>");
  });
});
