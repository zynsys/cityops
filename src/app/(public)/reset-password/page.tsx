import { Metadata } from 'next';
import Link from 'next/link';
import { AlertCircle } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import ResetPasswordForm from '@/components/auth/ResetPasswordForm';
import AuthShell from '@/components/auth/AuthShell';

export const metadata: Metadata = {
  title: 'Reset Password — CityOps',
};

interface ResetPasswordPageProps {
  searchParams: Promise<{ token?: string }>;
}

type TokenState = 'absent' | 'invalid' | 'expired' | 'valid';

async function checkToken(token: string): Promise<TokenState> {
  const record = await prisma.passwordResetToken.findUnique({
    where: { token },
    select: { expiresAt: true, usedAt: true },
  });

  if (!record || record.usedAt !== null) return 'invalid';
  if (record.expiresAt < new Date()) return 'expired';
  return 'valid';
}

export default async function ResetPasswordPage({ searchParams }: ResetPasswordPageProps) {
  const { token } = await searchParams;

  const state: TokenState = token ? await checkToken(token) : 'absent';

  if (state === 'valid') {
    return (
      <AuthShell>
        <ResetPasswordForm token={token!} />
      </AuthShell>
    );
  }

  // Error states
  const heading = state === 'expired' ? 'Link Expired' : 'Invalid Link';

  const description =
    state === 'expired'
      ? 'Password reset links expire after 1 hour. Please request a new one.'
      : state === 'absent'
        ? 'No reset token was provided. Please use the link from your password reset email.'
        : 'This reset link is invalid or has already been used. Please request a new one.';

  return (
    <AuthShell>
      <div className="w-full">
        <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-danger/10 text-danger">
          <AlertCircle className="h-6 w-6" aria-hidden="true" />
        </div>
        <h1 className="page-title">{heading}</h1>
        <p className="page-description mb-8">{description}</p>
        <Link href="/forgot-password" className="btn-primary w-full">
          Request New Reset Link
        </Link>
        <p className="mt-8 border-t border-border pt-6 text-center text-sm leading-relaxed text-muted-foreground">
          Remember your password?{' '}
          <Link href="/sign-in" className="rounded-sm font-semibold text-accent underline-offset-4 hover:underline">
            Sign In
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}
