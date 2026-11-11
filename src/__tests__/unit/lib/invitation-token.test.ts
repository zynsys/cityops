import {
  generateInvitationToken,
  INVITATION_TOKEN_EXPIRY_MS,
} from "@/lib/invitation-token";

describe("generateInvitationToken", () => {
  it("generates a cryptographically strong hex token with a seven-day expiry", () => {
    const now = new Date("2026-01-01T00:00:00.000Z");
    const result = generateInvitationToken(now);

    expect(result.token).toMatch(/^[a-f0-9]{64}$/);
    expect(result.expiresAt).toEqual(
      new Date(now.getTime() + INVITATION_TOKEN_EXPIRY_MS)
    );
    expect(result.expiresAt.getTime() - now.getTime()).toBe(
      7 * 24 * 60 * 60 * 1000
    );
  });

  it("generates a unique token for each invitation", () => {
    expect(generateInvitationToken().token).not.toBe(
      generateInvitationToken().token
    );
  });
});
