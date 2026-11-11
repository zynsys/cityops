import { randomBytes } from "node:crypto";

export const INVITATION_TOKEN_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000;

export interface InvitationToken {
  token: string;
  expiresAt: Date;
}

export function generateInvitationToken(now = new Date()): InvitationToken {
  return {
    token: randomBytes(32).toString("hex"),
    expiresAt: new Date(now.getTime() + INVITATION_TOKEN_EXPIRY_MS),
  };
}
