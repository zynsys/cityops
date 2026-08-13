import { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import ResetPasswordForm from "@/components/auth/ResetPasswordForm";

export const metadata: Metadata = {
  title: "Reset Password — CityOps",
};

interface ResetPasswordPageProps {
  searchParams: Promise<{ token?: string }>;
}

type TokenState = "absent" | "invalid" | "expired" | "valid";

async function checkToken(token: string): Promise<TokenState> {
  const record = await prisma.passwordResetToken.findUnique({
    where: { token },
    select: { expiresAt: true, usedAt: true },
  });

  if (!record || record.usedAt !== null) return "invalid";
  if (record.expiresAt < new Date()) return "expired";
  return "valid";
}

export default async function ResetPasswordPage({
  searchParams,
}: ResetPasswordPageProps) {
  const { token } = await searchParams;

  const state: TokenState = token ? await checkToken(token) : "absent";

  if (state === "valid") {
    return (
      <div className="flex flex-1 items-center justify-center px-4 py-16 sm:px-6 lg:px-8">
        <ResetPasswordForm token={token!} />
      </div>
    );
  }

  // Error states
  const heading =
    state === "expired" ? "Link Expired" : "Invalid Link";

  const description =
    state === "expired"
      ? "Password reset links expire after 1 hour. Please request a new one."
      : state === "absent"
        ? "No reset token was provided. Please use the link from your password reset email."
        : "This reset link is invalid or has already been used. Please request a new one.";

  return (
    <div className="flex flex-1 items-center justify-center px-4 py-16 sm:px-6 lg:px-8">
      <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-8 shadow-2xl">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
          <svg
            className="h-8 w-8 text-red-600 dark:text-red-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
            />
          </svg>
        </div>
        <h1 className="mb-2 text-2xl font-bold text-foreground">{heading}</h1>
        <p className="mb-6 text-sm text-muted-foreground">{description}</p>
        <Link
          href="/forgot-password"
          className="inline-flex w-full items-center justify-center rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-accent-foreground transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
        >
          Request New Reset Link
        </Link>
        <p className="mt-4 text-center text-sm text-muted-foreground">
          Remember your password?{" "}
          <Link href="/sign-in" className="text-accent hover:underline">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
}
