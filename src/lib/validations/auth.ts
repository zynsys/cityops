import { z } from "zod";

/**
 * Shared registration schema — used by both the RegisterForm (client)
 * and the registration API route (F-30, server).
 *
 * Only { displayName, email, password } is sent to the API.
 * The confirmPassword field is client-side only and is not part of this schema.
 */
export const registerSchema = z.object({
  displayName: z
    .string()
    .min(2, "Display name must be at least 2 characters.")
    .max(150, "Display name must be 150 characters or fewer."),
  email: z
    .string()
    .email("Please enter a valid email address."),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters.")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter.")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter.")
    .regex(/[0-9]/, "Password must contain at least one digit."),
});

export type RegisterInput = z.infer<typeof registerSchema>;

/**
 * Client-side extended schema that adds confirmPassword validation.
 * Never used on the server — only in the RegisterForm component.
 */
export const registerFormSchema = registerSchema
  .extend({
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

export type RegisterFormInput = z.infer<typeof registerFormSchema>;
