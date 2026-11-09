import { NextRequest } from "next/server";
import { POST as createInvitation } from "@/app/api/staff/users/invitations/route";
import {
  GET as getInvitation,
  POST as acceptInvitation,
} from "@/app/api/auth/accept-invite/route";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  userFindFirst: vi.fn(),
  tenantFindUnique: vi.fn(),
  roleFindUnique: vi.fn(),
  invitationFindUnique: vi.fn(),
  invitationUpdateMany: vi.fn(),
  invitationCreate: vi.fn(),
  userCreate: vi.fn(),
  userRoleCreate: vi.fn(),
  transaction: vi.fn(),
  sendInvitationEmail: vi.fn(),
  bcryptHash: vi.fn(),
}));

vi.mock("@auth", () => ({ auth: mocks.auth }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findFirst: mocks.userFindFirst, create: mocks.userCreate },
    tenant: { findUnique: mocks.tenantFindUnique },
    role: { findUnique: mocks.roleFindUnique },
    invitation: {
      findUnique: mocks.invitationFindUnique,
      updateMany: mocks.invitationUpdateMany,
      create: mocks.invitationCreate,
    },
    userRole: { create: mocks.userRoleCreate },
    $transaction: mocks.transaction,
  },
}));
vi.mock("@/lib/email", () => ({
  sendInvitationEmail: mocks.sendInvitationEmail,
}));
vi.mock("bcryptjs", () => ({
  default: { hash: mocks.bcryptHash },
}));

const invitationRecord = {
  id: "invitation-1",
  tenantId: "tenant-1",
  invitedByUserId: "admin-1",
  email: "staff@example.com",
  roleId: "role-1",
  expiresAt: new Date(Date.now() + 60 * 60 * 1000),
  acceptedAt: null,
  revokedAt: null,
  tenant: { name: "Example Council" },
  role: { name: "authority_user" },
};
const validToken = "a".repeat(64);

function request(url: string, method: string, body?: unknown): NextRequest {
  return new NextRequest(
    new Request(url, {
      method,
      ...(body === undefined
        ? {}
        : {
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          }),
    })
  );
}

function configureTransaction() {
  mocks.transaction.mockImplementation(
    ((operation: (tx: never) => Promise<unknown>) =>
      operation({
        invitation: {
          updateMany: mocks.invitationUpdateMany,
          create: mocks.invitationCreate,
        },
        user: { create: mocks.userCreate },
        userRole: { create: mocks.userRoleCreate },
      } as never)) as never
  );
}

describe("POST /api/staff/users/invitations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("requires a tenant admin", async () => {
    mocks.auth.mockResolvedValue(null);

    const response = await createInvitation(
      request("http://localhost/api/staff/users/invitations", "POST", {
        email: "staff@example.com",
        role: "authority_user",
      })
    );

    expect(response.status).toBe(401);
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("rejects non-admin users", async () => {
    mocks.auth.mockResolvedValue({
      user: { userId: "staff-1", role: "authority_user", tenantId: "tenant-1" },
    });

    const response = await createInvitation(
      request("http://localhost/api/staff/users/invitations", "POST", {
        email: "staff@example.com",
        role: "authority_user",
      })
    );

    expect(response.status).toBe(403);
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("creates a tenant-scoped invitation with an email link", async () => {
    mocks.auth.mockResolvedValue({
      user: { userId: "admin-1", role: "tenant_admin", tenantId: "tenant-1" },
    });
    mocks.userFindFirst.mockResolvedValue(null);
    mocks.tenantFindUnique.mockResolvedValue({
      id: "tenant-1",
      name: "Example Council",
      deletedAt: null,
    });
    mocks.roleFindUnique.mockResolvedValue({ id: "role-1" });
    mocks.invitationUpdateMany.mockResolvedValue({ count: 0 });
    mocks.invitationCreate.mockResolvedValue({});
    mocks.sendInvitationEmail.mockResolvedValue(undefined);
    configureTransaction();

    const response = await createInvitation(
      request("http://localhost/api/staff/users/invitations", "POST", {
        email: " Staff@Example.com ",
        role: "authority_user",
        tenantId: "another-tenant",
      })
    );

    expect(response.status).toBe(201);
    expect(mocks.invitationCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          tenantId: "tenant-1",
          invitedByUserId: "admin-1",
          email: "staff@example.com",
          roleId: "role-1",
          tokenHash: expect.stringMatching(/^[a-f0-9]{64}$/),
        }),
      })
    );
    expect(mocks.sendInvitationEmail).toHaveBeenCalledWith(
      "staff@example.com",
      expect.any(String),
      "Example Council"
    );
  });
});

describe("GET and POST /api/auth/accept-invite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns invitation details for a valid token", async () => {
    mocks.invitationFindUnique.mockResolvedValue(invitationRecord);

    const response = await getInvitation(
      request(`http://localhost/api/auth/accept-invite?token=${validToken}`, "GET")
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      email: "staff@example.com",
      tenantName: "Example Council",
      role: "authority_user",
    });
  });

  it("rejects an expired invitation", async () => {
    mocks.invitationFindUnique.mockResolvedValue({
      ...invitationRecord,
      expiresAt: new Date(Date.now() - 1),
    });

    const response = await getInvitation(
      request(`http://localhost/api/auth/accept-invite?token=${validToken}`, "GET")
    );

    expect(response.status).toBe(410);
    await expect(response.json()).resolves.toEqual({ error: "invitation_expired" });
  });

  it("rejects weak passwords before looking up an invitation", async () => {
    const response = await acceptInvitation(
      request("http://localhost/api/auth/accept-invite", "POST", {
        token: validToken,
        displayName: "New Staff",
        password: "weak",
      })
    );

    expect(response.status).toBe(400);
    expect(mocks.invitationFindUnique).not.toHaveBeenCalled();
  });

  it("creates the invited user and role atomically", async () => {
    mocks.invitationFindUnique.mockResolvedValue(invitationRecord);
    mocks.userFindFirst.mockResolvedValue(null);
    mocks.bcryptHash.mockResolvedValue("hashed-password");
    mocks.invitationUpdateMany.mockResolvedValue({ count: 1 });
    mocks.userCreate.mockResolvedValue({ id: "new-user-1" });
    mocks.userRoleCreate.mockResolvedValue({});
    configureTransaction();

    const response = await acceptInvitation(
      request("http://localhost/api/auth/accept-invite", "POST", {
        token: validToken,
        displayName: "New Staff",
        password: "Password1",
        role: "tenant_admin",
        tenantId: "another-tenant",
      })
    );

    expect(response.status).toBe(201);
    expect(mocks.invitationUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: "invitation-1",
          acceptedAt: null,
          revokedAt: null,
        }),
        data: expect.objectContaining({ acceptedAt: expect.any(Date) }),
      })
    );
    expect(mocks.userCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          tenantId: "tenant-1",
          email: "staff@example.com",
          invitedByUserId: "admin-1",
          emailVerifiedAt: expect.any(Date),
        }),
        select: { id: true },
      })
    );
    expect(mocks.userRoleCreate).toHaveBeenCalledWith({
      data: { tenantId: "tenant-1", userId: "new-user-1", roleId: "role-1" },
    });
  });

  it("rejects an already accepted invitation", async () => {
    mocks.invitationFindUnique.mockResolvedValue({
      ...invitationRecord,
      acceptedAt: new Date(),
    });

    const response = await acceptInvitation(
      request("http://localhost/api/auth/accept-invite", "POST", {
        token: validToken,
        displayName: "New Staff",
        password: "Password1",
      })
    );

    expect(response.status).toBe(410);
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("does not create an account when the invitation cannot be claimed", async () => {
    mocks.invitationFindUnique.mockResolvedValue(invitationRecord);
    mocks.userFindFirst.mockResolvedValue(null);
    mocks.bcryptHash.mockResolvedValue("hashed-password");
    mocks.invitationUpdateMany.mockResolvedValue({ count: 0 });
    configureTransaction();

    const response = await acceptInvitation(
      request("http://localhost/api/auth/accept-invite", "POST", {
        token: validToken,
        displayName: "New Staff",
        password: "Password1",
      })
    );

    expect(response.status).toBe(410);
    expect(mocks.userCreate).not.toHaveBeenCalled();
  });
});
