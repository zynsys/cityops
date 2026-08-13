import { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import ResendVerificationForm from "@/components/auth/ResendVerificationForm";

export const metadata: Metadata = {
  title: "Verify Email — CityOps",
};

interface VerifyEmailPageProps {
  searchParams: Promise<{ token?: string }>;
}

type VerifyResult =
  | { state: "absent" }
  | { state: "invalid" }
  | { state: "expired" }
  | { state: "success"; email: string };

async function verifyToken(token: string): Promise<VerifyResult> {
  const record = await prisma.emailVerificationToken.findUnique({
    where: { token },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          emailVerifiedAt: true,
          isActive: true,
          deletedAt: true,
        },
      },
    },
  });

  // Token not found or already used
  if (!record || record.usedAt !== null) {
    return { state: "invalid" };
  }

  // Token expired
  if (record.expiresAt < new Date()) {
    return { state: "expired" };
  }

  // Mark token as used and set emailVerifiedAt in a single transaction
  await prisma.$transaction([
    prisma.emailVerificationToken.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    }),
    prisma.user.update({
      where: { id: record.userId },
      data: { emailVerifiedAt: new Date() },
    }),
  ]);

  return { state: "success", email: record.user.email };
}

export default async function VerifyEmailPage({
  searchParams,
}: VerifyEmailPageProps) {
  const { token } = await searchParams;

  const result: VerifyResult = token
    ? await verifyToken(token)
    : { state: "absent" };

  if (result.state === "success") {
    return (
      <main className="flex min-h-[calc(100vh-8rem)] items-center justify-center px-4">
        <div className="w-full max-w-md rounded-xl border border-border bg-card p-8 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
            <svg
              className="h-8 w-8 text-green-600 dark:text-green-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h1 className="mb-2 text-2xl font-bold text-foreground">
            Email Verified!
          </h1>
          <p className="mb-6 text-muted-foreground">
            Your email address has been verified. You can now sign in to your
            CityOps account.
          </p>
          <Link
            href="/sign-in"
            className="inline-flex w-full items-center justify-center rounded-lg bg-primary px-6 py-3 font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Sign In
          </Link>
        </div>
      </main>
    );
  }

  // Error states — show a heading and inline resend form
  const heading =
    result.state === "expired" ? "Link Expired" : "Invalid Link";

  const description =
    result.state === "expired"
      ? "This verification link has expired. Verification links are valid for 24 hours. Enter your email below to receive a new one."
      : result.state === "absent"
        ? "No verification token was provided. If you registered recently, check your email for the verification link."
        : "This verification link is invalid or has already been used. If you registered recently, check your email for a valid link.";

  const showResend =
    result.state === "expired" || result.state === "invalid";

  return (
    <main className="flex min-h-[calc(100vh-8rem)] items-center justify-center px-4">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-8 shadow-sm">
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
        <p className="mb-6 text-muted-foreground">{description}</p>

        {showResend && <ResendVerificationForm />}

        <p className="mt-4 text-center text-sm text-muted-foreground">
          Already verified?{" "}
          <Link href="/sign-in" className="text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
