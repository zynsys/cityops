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
    expect(createReportSchema.parse(validCreateReportInput)).toEqual(validCreateReportInput);
  });

  describe.each(["tenantId", "categoryId"] as const)("%s", (field) => {
    it.each([undefined, null, "", "not-a-uuid", 123])(
      "rejects invalid or missing ID %s",
      (value) => {
        const result = createReportSchema.safeParse({
          ...validCreateReportInput,
          [field]: value,
        });

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues).toEqual(
            expect.arrayContaining([expect.objectContaining({ path: [field] })])
          );
        }
      }
    );
  });

  describe.each([
    { field: "lat", min: -90, max: 90 },
    { field: "lng", min: -180, max: 180 },
  ] as const)("$field", ({ field, min, max }) => {
    it.each([min, 0, max])("accepts coordinate %s", (value) => {
      expect(
        createReportSchema.safeParse({
          ...validCreateReportInput,
          [field]: value,
        }).success
      ).toBe(true);
    });

    it.each([min - 0.001, max + 0.001, NaN, Infinity, -Infinity, undefined, null, "0"])(
      "rejects invalid or missing coordinate %s",
      (value) => {
        const result = createReportSchema.safeParse({
          ...validCreateReportInput,
          [field]: value,
        });

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues).toEqual(
            expect.arrayContaining([expect.objectContaining({ path: [field] })])
          );
        }
      }
    );
  });

  it("reports all missing required fields", () => {
    const result = createReportSchema.safeParse({});

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.map((issue) => issue.path)).toEqual([
        ["tenantId"],
        ["categoryId"],
        ["title"],
        ["description"],
        ["lat"],
        ["lng"],
      ]);
    }
  });
});

describe.each([
  { name: "step3Schema", schema: step3Schema },
  { name: "createReportSchema", schema: createReportSchema },
])("$name detail validation", ({ schema }) => {
  describe.each([
    {
      field: "title",
      min: 10,
      max: 255,
      minMessage: "Title must be at least 10 characters.",
      maxMessage: "Title must be 255 characters or fewer.",
    },
    {
      field: "description",
      min: 20,
      max: 2000,
      minMessage: "Description must be at least 20 characters.",
      maxMessage: "Description must be 2000 characters or fewer.",
    },
  ] as const)("$field", ({ field, min, max, minMessage, maxMessage }) => {
    it.each([min, max])("accepts exactly %s characters", (length) => {
      expect(
        schema.safeParse({
          ...validCreateReportInput,
          [field]: "x".repeat(length),
        }).success
      ).toBe(true);
    });

    it.each([
      { length: 0, message: minMessage },
      { length: min - 1, message: minMessage },
      { length: max + 1, message: maxMessage },
    ])("rejects $length characters with a field-specific error", ({ length, message }) => {
      const result = schema.safeParse({
        ...validCreateReportInput,
        [field]: "x".repeat(length),
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues).toEqual([
          expect.objectContaining({ path: [field], message }),
        ]);
      }
    });

    it.each([undefined, null, 123])("rejects missing or non-string value %s", (value) => {
      expect(
        schema.safeParse({
          ...validCreateReportInput,
          [field]: value,
        }).success
      ).toBe(false);
    });
  });

  it.each([undefined, "", "x".repeat(500)])("accepts optional locationText %#", (locationText) => {
    expect(
      schema.safeParse({
        ...validCreateReportInput,
        locationText,
      }).success
    ).toBe(true);
  });

  it("accepts an omitted locationText", () => {
    const { locationText, ...input } = validCreateReportInput;

    expect(locationText).toBeDefined();
    expect(schema.safeParse(input).success).toBe(true);
  });

  it("rejects locationText exceeding 500 characters with a field-specific error", () => {
    const result = schema.safeParse({
      ...validCreateReportInput,
      locationText: "x".repeat(501),
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues).toEqual([
        expect.objectContaining({
          path: ["locationText"],
          message: "Location label must be 500 characters or fewer.",
        }),
      ]);
    }
  });

  it.each([null, 123])("rejects non-string locationText %s", (locationText) => {
    expect(
      schema.safeParse({
        ...validCreateReportInput,
        locationText,
      }).success
    ).toBe(false);
  });

  it.each([undefined, null, [], "not an object"])("rejects a malformed payload %s", (input) => {
    expect(schema.safeParse(input).success).toBe(false);
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
