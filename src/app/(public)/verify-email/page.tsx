import { Metadata } from 'next';
import Link from 'next/link';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import ResendVerificationForm from '@/components/auth/ResendVerificationForm';
import AuthShell from '@/components/auth/AuthShell';

export const metadata: Metadata = {
  title: 'Verify Email — CityOps',
};

interface VerifyEmailPageProps {
  searchParams: Promise<{ token?: string }>;
}

type VerifyResult =
  | { state: 'absent' }
  | { state: 'invalid' }
  | { state: 'expired' }
  | { state: 'success'; email: string };

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
    return { state: 'invalid' };
  }

  // Token expired
  if (record.expiresAt < new Date()) {
    return { state: 'expired' };
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

  return { state: 'success', email: record.user.email };
}

export default async function VerifyEmailPage({ searchParams }: VerifyEmailPageProps) {
  const { token } = await searchParams;

  const result: VerifyResult = token ? await verifyToken(token) : { state: 'absent' };

  if (result.state === 'success') {
    return (
      <AuthShell>
        <div className="w-full">
          <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-success/10 text-success">
            <CheckCircle2 className="h-6 w-6" aria-hidden="true" />
          </div>
          <h1 className="page-title">Email Verified!</h1>
          <p className="page-description mb-8">
            Your email address has been verified. You can now sign in to your CityOps account.
          </p>
          <Link href="/sign-in" className="btn-primary w-full">
            Sign In
          </Link>
        </div>
      </AuthShell>
    );
  }

  // Error states — show a heading and inline resend form
  const heading = result.state === 'expired' ? 'Link Expired' : 'Invalid Link';

  const description =
    result.state === 'expired'
      ? 'This verification link has expired. Verification links are valid for 24 hours. Enter your email below to receive a new one.'
      : result.state === 'absent'
        ? 'No verification token was provided. If you registered recently, check your email for the verification link.'
        : 'This verification link is invalid or has already been used. If you registered recently, check your email for a valid link.';

  const showResend = result.state === 'expired' || result.state === 'invalid';

  return (
    <AuthShell>
      <div className="w-full">
        <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-danger/10 text-danger">
          <AlertCircle className="h-6 w-6" aria-hidden="true" />
        </div>
        <h1 className="page-title">{heading}</h1>
        <p className="page-description mb-8">{description}</p>

        {showResend && <ResendVerificationForm />}

        <p className="mt-8 border-t border-border pt-6 text-center text-sm leading-relaxed text-muted-foreground">
          Already verified?{' '}
          <Link href="/sign-in" className="rounded-sm font-semibold text-accent underline-offset-4 hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}
