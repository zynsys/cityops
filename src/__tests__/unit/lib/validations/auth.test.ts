import {
  registerFormSchema,
  registerSchema,
} from "@/lib/validations/auth";

const validRegisterInput = {
  displayName: "Jane Smith",
  email: "jane@example.com",
  password: "Password1",
};

describe("registerSchema", () => {
  it("accepts valid input", () => {
    expect(registerSchema.safeParse(validRegisterInput).success).toBe(true);
  });

  it("rejects a short display name", () => {
    expect(
      registerSchema.safeParse({
        ...validRegisterInput,
        displayName: "J",
      }).success
    ).toBe(false);
  });

  it("rejects an invalid email", () => {
    expect(
      registerSchema.safeParse({
        ...validRegisterInput,
        email: "invalid-email",
      }).success
    ).toBe(false);
  });

  it("rejects a password without an uppercase letter", () => {
    expect(
      registerSchema.safeParse({
        ...validRegisterInput,
        password: "password1",
      }).success
    ).toBe(false);
  });

  it("rejects a password without a digit", () => {
    expect(
      registerSchema.safeParse({
        ...validRegisterInput,
        password: "Password",
      }).success
    ).toBe(false);
  });

  it("rejects a short password", () => {
    expect(
      registerSchema.safeParse({
        ...validRegisterInput,
        password: "Pas1",
      }).success
    ).toBe(false);
  });
});

describe("registerFormSchema", () => {
  it("adds a confirmPassword validation error when passwords do not match", () => {
    const result = registerFormSchema.safeParse({
      ...validRegisterInput,
      confirmPassword: "Password2",
    });

    expect(result.success).toBe(false);

    if (!result.success) {
      expect(
        result.error.issues.some((issue) => issue.path.join(".") === "confirmPassword")
      ).toBe(true);
    }
  });
});
