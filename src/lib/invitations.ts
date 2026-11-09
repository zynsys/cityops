import "server-only";
import { createHash, randomBytes } from "node:crypto";

export const INVITATION_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000;

export function createInvitationToken() {
  const token = randomBytes(32).toString("hex");
  return {
    token,
    tokenHash: hashInvitationToken(token),
  };
}

export function hashInvitationToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
