import { vi } from "vitest";
import type { Session } from "next-auth";

vi.mock("@auth", () => ({
  auth: vi.fn(),
}));

import { hasRole } from "@/lib/session";

const session = {
  expires: "2099-12-31T23:59:59.000Z",
  user: {
    name: "Jane Smith",
    email: "jane@example.com",
    image: null,
    userId: "user-1",
    role: "tenant_admin",
    tenantId: "tenant-1",
  },
} satisfies Session;

describe("hasRole", () => {
  it("returns true when the role matches", () => {
    expect(hasRole(session, ["tenant_admin"])).toBe(true);
  });

  it("returns false when the role does not match", () => {
    expect(hasRole(session, ["citizen"])).toBe(false);
  });

  it("returns true when multiple allowed roles include the current role", () => {
    expect(hasRole(session, ["citizen", "tenant_admin", "platform_admin"])).toBe(
      true
    );
  });
});
