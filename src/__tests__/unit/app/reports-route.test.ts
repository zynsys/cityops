// @vitest-environment node
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  createReport: vi.fn(),
  uploadAttachment: vi.fn(),
  validateReportWithAI: vi.fn(),
  sendReportSubmissionEmail: vi.fn(),
  findUser: vi.fn(),
  findTenant: vi.fn(),
}));

vi.mock("@auth", () => ({ auth: mocks.auth }));
vi.mock("@/db/mutations/reports", () => ({ createReport: mocks.createReport }));
vi.mock("@/lib/storage", () => ({ uploadAttachment: mocks.uploadAttachment }));
vi.mock("@/lib/ai/validateReport", () => ({
  validateReportWithAI: mocks.validateReportWithAI,
}));
vi.mock("@/lib/email", () => ({
  sendReportSubmissionEmail: mocks.sendReportSubmissionEmail,
}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: mocks.findUser },
    tenant: { findUnique: mocks.findTenant },
  },
}));

import { POST } from "@/app/api/reports/route";

const validPayload = {
  tenantId: "11111111-1111-4111-8111-111111111111",
  categoryId: "22222222-2222-4222-8222-222222222222",
  title: "Blocked drain outside the station",
  description: "The drain outside the station is blocked and water is pooling badly.",
  lat: 53.48,
  lng: -2.242,
};

function buildRequest(files: File[]): NextRequest {
  const formData = new FormData();
  formData.set("data", JSON.stringify(validPayload));
  for (const file of files) {
    formData.append("attachments[]", file);
  }

  return new NextRequest("http://localhost:3000/api/reports", {
    method: "POST",
    body: formData,
  });
}

function photo(type = "image/jpeg", size = 1): File {
  return new File([new Uint8Array(size)], "photo.jpg", { type });
}

describe("POST /api/reports attachment validation", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.auth.mockResolvedValue({
      user: { userId: "user-1", role: "citizen", tenantId: validPayload.tenantId },
      expires: "2099-12-31T23:59:59.000Z",
    });
    mocks.createReport.mockResolvedValue({ id: 42, title: validPayload.title });
    mocks.uploadAttachment.mockResolvedValue(undefined);
    mocks.validateReportWithAI.mockResolvedValue(undefined);
    mocks.findUser.mockResolvedValue(null);
    mocks.findTenant.mockResolvedValue(null);
  });

  it.each([0, 5])("accepts %s attachments", async (count) => {
    const response = await POST(buildRequest(Array.from({ length: count }, () => photo())));

    expect(response.status).toBe(201);
    expect(mocks.createReport).toHaveBeenCalledOnce();
    expect(mocks.createReport.mock.calls[0][1]).toHaveLength(count);
    expect(mocks.uploadAttachment).toHaveBeenCalledTimes(count);
  });

  it.each(["image/jpeg", "image/png", "image/webp", "image/heic"])(
    "accepts %s attachments",
    async (type) => {
      const response = await POST(buildRequest([photo(type)]));

      expect(response.status).toBe(201);
      expect(mocks.uploadAttachment).toHaveBeenCalledOnce();
    }
  );

  it("accepts a file exactly at the 10 MiB limit", async () => {
    const response = await POST(buildRequest([photo("image/jpeg", 10 * 1024 * 1024)]));

    expect(response.status).toBe(201);
    expect(mocks.uploadAttachment).toHaveBeenCalledOnce();
  });

  it.each([
    {
      name: "more than five attachments",
      files: () => Array.from({ length: 6 }, () => photo()),
      message: "Maximum 5 attachments allowed.",
    },
    ...["image/gif", "application/pdf", "application/octet-stream"].map((type) => ({
      name: `unsupported MIME type "${type}"`,
      files: () => [photo(type)],
      message: `File type "${type}" is not allowed.`,
    })),
    {
      name: "a file one byte above the 10 MiB limit",
      files: () => [photo("image/jpeg", 10 * 1024 * 1024 + 1)],
      message: 'File "photo.jpg" exceeds the 10 MB size limit.',
    },
    {
      name: "an invalid file after a valid attachment",
      files: () => [photo(), photo("application/pdf")],
      message: 'File type "application/pdf" is not allowed.',
    },
  ])("rejects $name before any side effects", async ({ files, message }) => {
    const response = await POST(buildRequest(files()));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "validation_error",
      details: [message],
    });
    expect(mocks.createReport).not.toHaveBeenCalled();
    expect(mocks.uploadAttachment).not.toHaveBeenCalled();
    expect(mocks.validateReportWithAI).not.toHaveBeenCalled();
    expect(mocks.sendReportSubmissionEmail).not.toHaveBeenCalled();
    expect(mocks.findUser).not.toHaveBeenCalled();
    expect(mocks.findTenant).not.toHaveBeenCalled();
  });
});
