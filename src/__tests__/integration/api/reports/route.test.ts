import type { Session } from "next-auth";
import type { Mock } from "vitest";
import { NextRequest } from "next/server";
import { auth } from "@auth";
import { createReport } from "@/db/mutations/reports";
import { validateReportWithAI } from "@/lib/ai/validateReport";
import { GET, POST } from "@/app/api/reports/route";

vi.mock("@auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    tenant: { findUnique: vi.fn() },
  },
}));

vi.mock("@/db/mutations/reports", () => ({
  createReport: vi.fn(),
}));

vi.mock("@/lib/storage", () => ({
  uploadAttachment: vi.fn(),
}));

vi.mock("@/lib/ai/validateReport", () => ({
  validateReportWithAI: vi.fn(),
}));

vi.mock("@/lib/email", () => ({
  sendReportSubmissionEmail: vi.fn(),
}));

// auth() is overloaded (session getter + middleware wrapper); type the mock as the session getter.
const mockedAuth = auth as unknown as Mock<() => Promise<Session | null>>;

const validPayload = {
  tenantId: "11111111-1111-4111-8111-111111111111",
  categoryId: "22222222-2222-4222-8222-222222222222",
  title: "Blocked drain outside the station",
  description: "The drain outside the station is blocked and water is pooling badly.",
  locationText: "Outside Manchester Station",
  lat: 53.48,
  lng: -2.242,
};

function buildRequest(data?: string): NextRequest {
  const formData = new FormData();

  if (data !== undefined) {
    formData.set("data", data);
  }

  const request = new Request("http://localhost:3000/api/reports", {
    method: "POST",
    body: formData,
  });

  return new NextRequest(request);
}

describe("GET /api/reports", () => {
  it("returns 405", async () => {
    const response = GET();

    expect(response.status).toBe(405);
    await expect(response.json()).resolves.toEqual({
      error: "method_not_allowed",
    });
  });
});

describe("POST /api/reports", () => {
  beforeEach(() => {
    mockedAuth.mockReset();
    vi.mocked(createReport).mockReset();
    vi.mocked(validateReportWithAI).mockReset();
  });

  it("returns 401 when there is no session", async () => {
    mockedAuth.mockResolvedValue(null);

    const response = await POST(buildRequest(JSON.stringify(validPayload)));

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: "unauthenticated",
    });
  });

  it("returns 400 when the data field is missing", async () => {
    mockedAuth.mockResolvedValue({
      user: { userId: "user-1", role: "citizen", tenantId: "tenant-1" },
      expires: "2099-12-31T23:59:59.000Z",
    });

    const response = await POST(buildRequest());

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "missing_data_field",
    });
  });

  it("returns 400 when the data field contains invalid JSON", async () => {
    mockedAuth.mockResolvedValue({
      user: { userId: "user-1", role: "citizen", tenantId: "tenant-1" },
      expires: "2099-12-31T23:59:59.000Z",
    });

    const response = await POST(buildRequest("{invalid-json"));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "invalid_json",
    });
  });

  it("returns 400 with validation_error for invalid payloads", async () => {
    mockedAuth.mockResolvedValue({
      user: { userId: "user-1", role: "citizen", tenantId: "tenant-1" },
      expires: "2099-12-31T23:59:59.000Z",
    });

    const response = await POST(
      buildRequest(
        JSON.stringify({
          ...validPayload,
          title: "Too short",
        })
      )
    );

    expect(response.status).toBe(400);

    const body = (await response.json()) as {
      error: string;
      details?: Array<{ path?: string[] }>;
    };

    expect(body.error).toBe("validation_error");
    expect(body.details?.some((issue) => issue.path?.includes("title"))).toBe(true);
  });

  it("returns 201 for a valid authenticated submission", async () => {
    mockedAuth.mockResolvedValue({
      user: { userId: "user-1", role: "citizen", tenantId: "tenant-1" },
      expires: "2099-12-31T23:59:59.000Z",
    });
    vi.mocked(createReport).mockResolvedValue({
      id: 42,
      title: validPayload.title,
      status: "under_validation",
    });
    vi.mocked(validateReportWithAI).mockResolvedValue(undefined);

    const response = await POST(buildRequest(JSON.stringify(validPayload)));

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({
      success: true,
      report: {
        id: 42,
        title: validPayload.title,
        status: "under_validation",
      },
    });
    expect(createReport).toHaveBeenCalledWith(
      {
        ...validPayload,
        reporterUserId: "user-1",
      },
      []
    );
    expect(validateReportWithAI).toHaveBeenCalledWith(42);
  });
});
