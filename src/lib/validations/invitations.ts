import { z } from "zod";

export const invitationRequestSchema = z.object({
  email: z.string().max(255).email(),
  role: z.enum(["authority_user", "tenant_admin"]),
});
export type InvitationRequestInput = z.infer<typeof invitationRequestSchema>;

export const acceptInvitationSchema = z.object({
  token: z.string().length(64).regex(/^[a-f0-9]{64}$/),
  displayName: z.string().trim().min(2).max(150),
  password: z
    .string()
    .min(8)
    .regex(/[A-Z]/)
    .regex(/[a-z]/)
    .regex(/[0-9]/),
});

export const acceptInvitationFormSchema = acceptInvitationSchema
  .omit({ token: true })
  .extend({ confirmPassword: z.string() })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

export type AcceptInvitationFormInput = z.infer<typeof acceptInvitationFormSchema>;
