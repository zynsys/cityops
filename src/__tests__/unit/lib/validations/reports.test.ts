import {
  createReportSchema,
  editReportSchema,
  step3Schema,
} from "@/lib/validations/reports";

const validCreateReportInput = {
  tenantId: "11111111-1111-4111-8111-111111111111",
  categoryId: "22222222-2222-4222-8222-222222222222",
  title: "Blocked drain on high street",
  description: "A large blocked drain is causing water to flood the pavement.",
  locationText: "Outside 10 High Street",
  lat: 51.501,
  lng: -0.141,
};

describe("createReportSchema", () => {
  it("accepts valid input", () => {
    expect(createReportSchema.safeParse(validCreateReportInput).success).toBe(true);
  });

  it("rejects a short title", () => {
    expect(
      createReportSchema.safeParse({
        ...validCreateReportInput,
        title: "Too short",
      }).success
    ).toBe(false);
  });

  it("rejects a short description", () => {
    expect(
      createReportSchema.safeParse({
        ...validCreateReportInput,
        description: "Too short",
      }).success
    ).toBe(false);
  });

  it("rejects an invalid tenant UUID", () => {
    expect(
      createReportSchema.safeParse({
        ...validCreateReportInput,
        tenantId: "not-a-uuid",
      }).success
    ).toBe(false);
  });

  it("rejects latitude outside the valid range", () => {
    expect(
      createReportSchema.safeParse({
        ...validCreateReportInput,
        lat: 91,
      }).success
    ).toBe(false);
  });

  it("rejects longitude outside the valid range", () => {
    expect(
      createReportSchema.safeParse({
        ...validCreateReportInput,
        lng: 181,
      }).success
    ).toBe(false);
  });
});

describe("step3Schema", () => {
  it("enforces the title minimum length", () => {
    expect(
      step3Schema.safeParse({
        title: "Too short",
        description: validCreateReportInput.description,
        locationText: validCreateReportInput.locationText,
      }).success
    ).toBe(false);
  });

  it("enforces the description minimum length", () => {
    expect(
      step3Schema.safeParse({
        title: validCreateReportInput.title,
        description: "Too short",
        locationText: validCreateReportInput.locationText,
      }).success
    ).toBe(false);
  });

  it("enforces the locationText maximum length", () => {
    expect(
      step3Schema.safeParse({
        title: validCreateReportInput.title,
        description: validCreateReportInput.description,
        locationText: "x".repeat(501),
      }).success
    ).toBe(false);
  });
});

describe("editReportSchema", () => {
  it("accepts valid input", () => {
    expect(
      editReportSchema.safeParse({
        categoryId: validCreateReportInput.categoryId,
        title: validCreateReportInput.title,
        description: validCreateReportInput.description,
        locationText: validCreateReportInput.locationText,
        lat: validCreateReportInput.lat,
        lng: validCreateReportInput.lng,
        removeAttachmentIds: ["33333333-3333-4333-8333-333333333333"],
      }).success
    ).toBe(true);
  });

  it("requires removeAttachmentIds to be UUIDs", () => {
    expect(
      editReportSchema.safeParse({
        categoryId: validCreateReportInput.categoryId,
        title: validCreateReportInput.title,
        description: validCreateReportInput.description,
        locationText: validCreateReportInput.locationText,
        lat: validCreateReportInput.lat,
        lng: validCreateReportInput.lng,
        removeAttachmentIds: ["not-a-uuid"],
      }).success
    ).toBe(false);
  });
});
